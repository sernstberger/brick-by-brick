import {test,expect} from '@playwright/test';

const rotation=[1,0,0,0,1,0,0,0,1];
const part=(id,position)=>({id,part:'3023.dat',color:4,position,rotation});
const project={version:1,name:'Installed slide',assemblies:{mechanism:{name:'Sliding mechanism'},frame:{name:'Frame'}},steps:[
 {page:10,title:'Build mechanism',assembly:'mechanism',parts:[part('pin',[30,0,0]),part('body',[0,40,0])]},
 {page:10,title:'Install mechanism',assembly:'frame',parts:[part('base',[-50,0,0])],instances:[{id:'installed',assembly:'mechanism',throughStep:0,position:[100,0,0],rotation}]},
 {page:10,title:'Slide installed mechanism',assembly:'frame',parts:[],instanceUpdates:[{id:'installed',position:[108,0,0]}]},
 {page:10,title:'Push its pin',assembly:'frame',parts:[],partUpdates:[{id:'installed/pin',position:[118,0,0]}]},
]};

test('installed group slide uses one rigid action and a later pin moves independently',async({page})=>{
 await page.routeWebSocket('**',()=>{});
 await page.route('**/sets/pinball.json',r=>r.fulfill({json:project}));
 await page.goto('/?step=3');await expect(page.locator('#loading')).toBeHidden();
 await expect(page.locator('#new-count')).toHaveText('1 move');
 await expect(page.locator('#parts')).toContainText('Sliding mechanism');
 const sample=()=>page.evaluate(()=>{const v=window.__assembly.viewer;v.tick();return {units:v.unitCount,count:v.nodes.length,moving:v.nodes.filter(n=>n.isMoving).map(n=>n.p.id),positions:Object.fromEntries(v.nodes.map(n=>[n.p.id,n.wrapper.position.toArray()]))};});
 await page.evaluate(()=>window.__assembly.viewer.replay(false));
 const final=await sample();expect(final.units).toBe(1);expect(final.count).toBe(3);expect(final.moving).toHaveLength(2);
 await page.keyboard.press('ArrowLeft');const before=await sample();
 for(const id of final.moving){expect(final.positions[id][0]-before.positions[id][0]).toBeCloseTo(8);expect(final.positions[id].slice(1)).toEqual(before.positions[id].slice(1));}
 await page.evaluate(()=>{const v=window.__assembly.viewer,now=performance.now();v.pieceCount=1;v.moveStarts=[now-275];for(const n of v.nodes)if(n.isMoving)n.start=now-275;v.tick();});
 const middle=await sample();
 const distances=final.moving.map(id=>final.positions[id][0]-middle.positions[id][0]);
 expect(distances[0]).toBeGreaterThan(0);expect(distances[0]).toBeLessThan(8);expect(distances[1]).toBeCloseTo(distances[0]);
 expect(middle.positions.base).toEqual(final.positions.base);
 await page.keyboard.press('Shift+ArrowRight');await expect(page.locator('#loading')).toBeHidden();
 await page.evaluate(()=>window.__assembly.viewer.replay(false));const pinFinal=await sample();
 expect(pinFinal.units).toBe(1);expect(pinFinal.moving).toEqual(['installed/pin']);
 await page.keyboard.press('ArrowLeft');const pinBefore=await sample();
 expect(pinBefore.positions['installed/pin'][0]-pinFinal.positions['installed/pin'][0]).toBeCloseTo(20);
 expect(pinBefore.positions['installed/body']).toEqual(pinFinal.positions['installed/body']);
 await page.keyboard.press('Shift+ArrowLeft');await expect(page).toHaveURL(/step=3$/);await expect(page.locator('#loading')).toBeHidden();
 expect((await sample()).count).toBe(3);
});

test('new clip pieces assemble unfolded, seat together, then rotate around their pin',async({page})=>{
 const fixture={version:1,name:'Folding clip',steps:[
  {page:10,title:'Receiver',parts:[part('receiver',[0,0,0])]},
  {page:10,title:'Build and fold',parts:[part('clip',[40,0,0]),part('tile',[60,0,0])],motion:{stagingOffset:[100,0,0],actions:[
   {type:'add',part:'clip'},{type:'add',part:'tile'},
   {type:'place',parts:['clip','tile']},
   {type:'rotate',parts:['clip','tile'],pivot:[0,0,0],fromRotation:[0,0,1,0,1,0,-1,0,0]},
  ]}},
 ]};
 await page.routeWebSocket('**',()=>{});await page.route('**/sets/pinball.json',r=>r.fulfill({json:fixture}));
 await page.goto('/?step=2');await expect(page.locator('#loading')).toBeHidden();
 const sample=(count,elapsed=550)=>page.evaluate(({count,elapsed})=>{
  const v=window.__assembly.viewer,now=performance.now();v.pieceCount=count;v.moveStarts=Array.from({length:v.unitCount},(_,i)=>now-(i===3?elapsed:550));
  for(const n of v.nodes)n.start=v.moveStarts[n.unit];v.tick();return Object.fromEntries(v.nodes.map(n=>[n.p.id,n.wrapper.position.toArray()]));
 },{count,elapsed});
 const loose=await sample(2),seated=await sample(3);
 expect(loose.clip[0]).toBeCloseTo(100);expect(loose.clip[2]).toBeCloseTo(-40);
 expect(seated.clip[0]).toBeCloseTo(0);expect(seated.clip[2]).toBeCloseTo(-40);
 for(const elapsed of [0,110,275,550]){
  const p=await sample(4,elapsed);
  expect(Math.hypot(...p.clip)).toBeCloseTo(40);expect(Math.hypot(...p.tile)).toBeCloseTo(60);
  expect(Math.hypot(...p.clip.map((v,i)=>v-p.tile[i]))).toBeCloseTo(20);expect(p.receiver).toEqual([0,0,0]);
 }
 expect((await sample(4)).clip).toEqual([40,0,0]);
 await page.keyboard.press('ArrowLeft');const back=await page.evaluate(()=>{const v=window.__assembly.viewer;v.tick();return v.nodes.find(n=>n.p.id==='clip').wrapper.position.toArray();});
 expect(back[0]).toBeCloseTo(0);expect(back[2]).toBeCloseTo(-40);
});

test('a rigid crank pivots before a new assembly seats and its retaining pin moves',async({page})=>{
 const quarter=[0,-1,0,1,0,0,0,0,1];
 const fixture={version:1,name:'Crank and retaining pin',assemblies:{loose:{name:'Loose pair'},frame:{name:'Frame'}},steps:[
  {page:10,title:'Build pair',assembly:'loose',parts:[part('one',[0,0,0]),part('two',[0,20,0])]},
  {page:10,title:'Crank',assembly:'frame',parts:[part('near',[40,0,0]),part('far',[80,0,0]),part('pin',[0,0,60])]},
  {page:10,title:'Rotate and install',assembly:'frame',parts:[],partUpdates:[{id:'near',position:[0,40,0],rotation:quarter},{id:'far',position:[0,80,0],rotation:quarter}],instances:[{id:'pair',assembly:'loose',throughStep:0,position:[100,0,0],rotation}],motion:{actions:[{type:'move',parts:['near','far'],pivot:[0,0,0]},{type:'add',instance:'pair',approach:[0,0,100]}]}},
  {page:10,title:'Install another pair and push pin',assembly:'frame',parts:[],instances:[{id:'second',assembly:'loose',throughStep:0,position:[100,60,0],rotation}],partUpdates:[{id:'pin',position:[0,0,40]}]},
 ]};
 await page.routeWebSocket('**',()=>{});await page.route('**/sets/pinball.json',r=>r.fulfill({json:fixture}));
 await page.goto('/?step=3');await expect(page.locator('#loading')).toBeHidden();await expect(page.locator('#new-count')).toHaveText('2 actions');
 for(const elapsed of [0,110,275,550]){
  const state=await page.evaluate(elapsed=>{
   const v=window.__assembly.viewer,now=performance.now();v.pieceCount=1;v.moveStarts=[now-elapsed,now+10000];
   for(const n of v.nodes)n.start=v.moveStarts[n.unit];v.tick();
   return {units:v.unitCount,positions:Object.fromEntries(v.nodes.map(n=>[n.p.id,n.wrapper.position.toArray()])),visible:v.nodes.filter(n=>n.wrapper.visible).map(n=>n.p.id)};
  },elapsed);
  expect(state.units).toBe(2);expect(state.visible).not.toContain('pair/one');
  const a=state.positions.near,b=state.positions.far;
  expect(Math.hypot(...a)).toBeCloseTo(40);expect(Math.hypot(...b)).toBeCloseTo(80);
  expect(Math.hypot(...a.map((v,i)=>v-b[i]))).toBeCloseTo(40);
 }
 await page.evaluate(()=>window.__assembly.viewer.replay(false));
 await page.keyboard.press('Shift+ArrowRight');await expect(page.locator('#loading')).toBeHidden();
 const mounted=await page.evaluate(()=>{
  const v=window.__assembly.viewer;v.setPieceCount(1);v.replay(false);
  return {units:v.unitCount,newUnits:v.nodes.filter(n=>n.isNew).map(n=>n.unit),pin:v.nodes.find(n=>n.p.id==='pin').wrapper.position.toArray()};
 });
 expect(mounted.units).toBe(2);expect(mounted.newUnits).toEqual([0,0]);expect(mounted.pin).toEqual([0,0,60]);
 await page.keyboard.press('ArrowRight');await page.evaluate(()=>window.__assembly.viewer.replay(false));
 expect(await page.evaluate(()=>window.__assembly.viewer.nodes.find(n=>n.p.id==='pin').wrapper.position.toArray())).toEqual([0,0,40]);
});
