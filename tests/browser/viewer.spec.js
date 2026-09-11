import {test,expect} from '@playwright/test';

// Parallel geometry packing must not reload a browser verification mid-step.
test.beforeEach(async({page})=>{await page.routeWebSocket('**',()=>{});});
import {readFile} from 'node:fs/promises';
const currentProject=JSON.parse(await readFile(new URL('../../public/sets/pinball.json',import.meta.url),'utf8'));

test('all four assemblies load and controls work',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#loading')).toBeHidden({timeout:30000});
 await expect(page.locator('#piece-count')).toHaveText('2 pieces assembled');
 await expect(page.locator('#steps [data-step]')).toHaveCount(currentProject.steps.length);
 for(const count of [6,7,11]){await page.locator('#next').click();await expect(page.locator('#loading')).toBeHidden();await expect(page.locator('#piece-count')).toHaveText(`${count} pieces assembled`);}
 await page.waitForTimeout(1100);await page.screenshot({path:'test-results/page-10-step-4.png',fullPage:true});
 await page.locator('#explode').check();await page.waitForTimeout(100);await page.locator('#top').click();await page.screenshot({path:'test-results/page-10-top.png',fullPage:true});
 await page.locator('#replay').click();await expect(page.locator('#explode')).not.toBeChecked();
 await page.locator('#previous').click();await expect(page.locator('#piece-count')).toHaveText('7 pieces assembled');
 const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadPromise;expect(download.suggestedFilename()).toBe(`pinball-steps-1-${currentProject.steps.length}.mpd`);
 const exported=await readFile(await download.path(),'utf8');
 expect(exported).toContain('0 FILE 89953-bag5-compressed.dat');
 const piston=exported.match(/^1 16 0 ([\d.]+) 0 1 0 0 0 1 0 0 0 1 4254\.dat$/m);
 expect(piston).not.toBeNull();expect(Number(piston[1])).toBeCloseTo(104.995238,6);
 expect(errors).toEqual([]);
});
test('mobile controls fit the viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('#loading')).toBeHidden({timeout:30000});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
 await page.locator('#next').click();await expect(page.locator('#piece-count')).toHaveText('6 pieces assembled');
});

test('page 11 continues the assembly',async({page})=>{
 await page.goto('/');await expect(page.locator('#loading')).toBeHidden();
 await page.locator('#page-select').selectOption('11');await expect(page.locator('#loading')).toBeHidden();
 await expect(page.locator('#piece-count')).toHaveText('14 pieces assembled');
 for(const count of [16,17,19]){await page.locator('#next').click();await expect(page.locator('#loading')).toBeHidden();await expect(page.locator('#piece-count')).toHaveText(`${count} pieces assembled`);}
 await page.waitForTimeout(1100);await page.screenshot({path:'test-results/page-11-step-8.png',fullPage:true});
 await page.locator('#steps [data-step="5"]').click();await expect(page.locator('#loading')).toBeHidden();await page.locator('#explode').check();
 const directions=await page.evaluate(()=>window.__assembly.viewer.nodes.filter(n=>n.isNew).map(n=>n.p.approach));expect(directions).toEqual([[0,0,85],[0,0,85]]);
 await page.locator('#page-select').selectOption('10');await expect(page.locator('#piece-count')).toHaveText('2 pieces assembled');
});

test('new subassembly starts independently and preserves the main frame',async({page})=>{
 await page.goto('/');await expect(page.locator('#loading')).toBeHidden();
 await page.locator('#steps [data-step="8"]').click();await expect(page.locator('#loading')).toBeHidden();
 await expect(page.locator('#piece-count')).toHaveText('2 pieces assembled');
 await expect(page.locator('.live-label')).toHaveText('Separate mechanism');
 await page.waitForTimeout(1000);await page.screenshot({path:'test-results/page-12-step-9.png',fullPage:true});
 for(const count of [3,6,8,11]){await page.locator('#next').click();await expect(page.locator('#loading')).toBeHidden();await expect(page.locator('#piece-count')).toHaveText(`${count} pieces assembled`);}
 await page.waitForTimeout(1000);await page.screenshot({path:'test-results/page-12-step-13.png',fullPage:true});
 await page.locator('#steps [data-step="7"]').click();await expect(page.locator('#loading')).toBeHidden();await expect(page.locator('#piece-count')).toHaveText('19 pieces assembled');
});
test('step URLs survive refresh and browser history',async({page})=>{
 await page.goto('/?step=12&source=bookmark');await expect(page.locator('#loading')).toBeHidden();await expect(page.locator('#large-number')).toHaveText('12');
 await page.locator('#next').click();await expect(page).toHaveURL(/step=13&source=bookmark/);await expect(page.locator('#loading')).toBeHidden();
 await page.reload();await expect(page.locator('#loading')).toBeHidden();await expect(page.locator('#large-number')).toHaveText('13');
 await page.goBack();await expect(page.locator('#large-number')).toHaveText('12');
 await page.goForward();await expect(page.locator('#large-number')).toHaveText('13');
 await page.goto('/?step=invalid');await expect(page.locator('#loading')).toBeHidden();await expect(page.locator('#large-number')).toHaveText('01');
});
test('sidebar scroll does not move the main workspace',async({page})=>{
 await page.setViewportSize({width:1440,height:800});await page.goto('/?step=1');await expect(page.locator('#loading')).toBeHidden();
 await page.evaluate(()=>document.fonts.ready);
 const before=await page.locator('.stage').boundingBox();
 await page.locator('.sidebar').hover();await page.mouse.wheel(0,650);
 await expect.poll(()=>page.locator('.sidebar').evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
 const after=await page.locator('.stage').boundingBox();expect(after.y).toBe(before.y);expect(await page.evaluate(()=>window.scrollY)).toBe(0);
});
test('step 16 joins both assemblies and can be bookmarked',async({page})=>{
 await page.goto('/?step=16');await expect(page.locator('#loading')).toBeHidden();await expect(page.locator('#piece-count')).toHaveText('41 pieces assembled');
 await expect(page.locator('#steps [data-step]')).toHaveCount(currentProject.steps.length);
 await page.waitForTimeout(1000);await page.screenshot({path:'test-results/page-13-step-16.png',fullPage:true});
 const counts=await page.evaluate(()=>{const nodes=window.__assembly.viewer.nodes;return {total:nodes.length,new:nodes.filter(n=>n.isNew).length,empty:nodes.filter(n=>{let meshes=0;n.wrapper.traverse(o=>{if(o.isMesh)meshes++;});return !meshes;}).length};});
 expect(counts).toEqual({total:41,new:22,empty:0});
 await page.locator('#previous').click();await expect(page.locator('#loading')).toBeHidden();await expect(page.locator('#piece-count')).toHaveText('22 pieces assembled');
 await page.waitForTimeout(1000);await page.screenshot({path:'test-results/page-13-step-15.png',fullPage:true});
 await page.locator('#next').click();await expect(page.locator('#piece-count')).toHaveText('41 pieces assembled');
});
test('expanded canvas keeps navigation visible and supports arrow keys after clicks',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/?step=8');await expect(page.locator('#loading')).toBeHidden();
 await expect(page.locator('.reference-panel')).toHaveCount(0);
 const header=await page.locator('header').boundingBox(),stage=await page.locator('.stage').boundingBox();
 expect(header.height).toBeLessThanOrEqual(52);expect(stage.width).toBeGreaterThan(1100);expect(stage.height).toBeGreaterThan(600);
 const footer=await page.locator('.navigation').boundingBox();expect(footer.y+footer.height).toBe(900);
 await page.locator('.workspace-content').evaluate(e=>e.scrollTop=e.scrollHeight);
 expect((await page.locator('.navigation').boundingBox()).y).toBe(footer.y);
 await page.locator('#next').click();await expect(page.locator('#loading')).toBeHidden();
 await page.keyboard.press('Shift+ArrowRight');await expect(page).toHaveURL(/step=10/);await expect(page.locator('#loading')).toBeHidden();
 await page.keyboard.press('Shift+ArrowLeft');await expect(page).toHaveURL(/step=9/);await expect(page.locator('#loading')).toBeHidden();
 await page.locator('#page-select').focus();await page.keyboard.press('ArrowLeft');await expect(page).toHaveURL(/step=9/);
 await page.goto('/?step=16');await expect(page.locator('#loading')).toBeHidden();await page.waitForTimeout(1100);
 await page.screenshot({path:'test-results/expanded-canvas.png',fullPage:true});
});

test('piece arrows reveal individually, shift skips steps, and replay staggers arrivals',async({page})=>{
 await page.goto('/?step=1');await expect(page.locator('#loading')).toBeHidden();
 const sequence=await page.evaluate(()=>{
  const v=window.__assembly.viewer;v.replay();
  return v.nodes.map(n=>({visible:n.wrapper.visible,start:n.start}));
 });
 expect(sequence.map(n=>n.visible)).toEqual([true,false]);expect(sequence[1].start-sequence[0].start).toBe(650);
 await page.keyboard.press('ArrowLeft');await expect(page.locator('#piece-count')).toHaveText('1 pieces assembled');
 await page.keyboard.press('ArrowLeft');await expect(page.locator('#piece-count')).toHaveText('0 pieces assembled');
 await page.keyboard.press('ArrowRight');await expect(page.locator('#piece-count')).toHaveText('1 pieces assembled');
 expect(await page.evaluate(()=>window.__assembly.viewer.nodes.filter(n=>n.wrapper.visible).length)).toBe(1);
 await page.keyboard.press('ArrowRight');await expect(page.locator('#piece-count')).toHaveText('2 pieces assembled');
 await page.keyboard.press('ArrowRight');await expect(page).toHaveURL(/step=2/);await expect(page.locator('#loading')).toBeHidden();
 await expect(page.locator('#piece-count')).toHaveText('3 pieces assembled');
 await page.keyboard.press('ArrowRight');await expect(page.locator('#piece-count')).toHaveText('4 pieces assembled');
 await page.keyboard.press('ArrowLeft');await expect(page.locator('#piece-count')).toHaveText('3 pieces assembled');
 await page.keyboard.press('Shift+ArrowRight');await expect(page).toHaveURL(/step=3/);await expect(page.locator('#loading')).toBeHidden();
 await expect(page.locator('#piece-count')).toHaveText('7 pieces assembled');
 await page.goto('/?step=16');await expect(page.locator('#loading')).toBeHidden();
 await page.keyboard.press('ArrowLeft');await expect(page.locator('#piece-count')).toHaveText('19 pieces assembled');
 await page.keyboard.press('ArrowRight');await expect(page.locator('#piece-count')).toHaveText('41 pieces assembled');
 expect(await page.evaluate(()=>new Set(window.__assembly.viewer.nodes.filter(n=>n.isNew).map(n=>n.start)).size)).toBe(1);
});
test('frame parks beside the mechanism and both animate into the joined build',async({page})=>{
 await page.goto('/?step=8');await expect(page.locator('#loading')).toBeHidden();await page.waitForTimeout(1300);
 await page.keyboard.press('Shift+ArrowRight');await expect(page.locator('#loading')).toBeHidden();
 const moving=await page.evaluate(()=>{const v=window.__assembly.viewer;return {active:v.nodes.length,parked:v.contextNodes.length,moving:v.contextNodes.filter(n=>n.transition).length};});
 expect(moving).toEqual({active:2,parked:19,moving:19});
 await page.waitForTimeout(1500);
 const parked=await page.evaluate(()=>window.__assembly.viewer.contextNodes.map(n=>({visible:n.wrapper.visible,scale:n.wrapper.scale.x})));
 expect(parked.every(n=>n.visible&&n.scale===.42)).toBe(true);
 await page.screenshot({path:'test-results/parked-frame-step-9.png',fullPage:true});
 await page.evaluate(()=>window.__assembly.select(14));await expect(page.locator('#loading')).toBeHidden();await page.waitForTimeout(2000);
 await page.keyboard.press('Shift+ArrowRight');await expect(page.locator('#loading')).toBeHidden();
 const joined=await page.evaluate(()=>{const v=window.__assembly.viewer;return {active:v.nodes.length,parked:v.contextNodes.length,moving:v.nodes.filter(n=>n.transition).length};});
 expect(joined).toEqual({active:41,parked:0,moving:41});
 await page.waitForTimeout(1500);
 expect(await page.evaluate(()=>window.__assembly.viewer.nodes.every(n=>n.wrapper.position.distanceTo({x:n.p.position[0],y:n.p.position[1],z:n.p.position[2]})<.001&&n.wrapper.scale.x===1))).toBe(true);
 await page.screenshot({path:'test-results/assemblies-rejoined.png',fullPage:true});
});
test('step 14 threads the axle in clear space before mounting the completed unit',async({page})=>{
 await page.goto('/?step=14');await expect(page.locator('#loading')).toBeHidden();
 const threaded=await page.evaluate(()=>{
  const v=window.__assembly.viewer;v.setPieceCount(1);v.setPieceCount(2);
  const axle=v.nodes.find(n=>n.p.part==='3705.dat');
  axle.start=performance.now()-275;v.tick();
  return {count:v.unitCount,offset:axle.wrapper.position.clone().sub(axle.position).toArray(),visible:v.nodes.filter(n=>n.isNew&&n.wrapper.visible).map(n=>n.p.part)};
 });
 expect(threaded.count).toBe(9);expect(threaded.offset[0]).toBeGreaterThan(0);expect(threaded.offset[1]).toBe(-110);expect(threaded.offset[2]).toBe(0);
 expect(threaded.visible).toEqual(expect.arrayContaining(['73230.dat','3705.dat']));expect(threaded.visible).toHaveLength(2);
 await page.evaluate(()=>{const v=window.__assembly.viewer;v.setPieceCount(8);v.replay(false);});
 await page.screenshot({path:'test-results/step-14-inset-built.png',fullPage:true});
 expect(await page.evaluate(()=>window.__assembly.viewer.nodes.filter(n=>n.isNew).every(n=>Math.abs(n.wrapper.position.y-n.position.y+110)<.001))).toBe(true);
 await page.keyboard.press('ArrowRight');await page.waitForTimeout(600);
 expect(await page.evaluate(()=>window.__assembly.viewer.nodes.filter(n=>n.isNew).every(n=>n.wrapper.position.distanceTo(n.position)<.001))).toBe(true);
 await page.screenshot({path:'test-results/step-14-inset-mounted.png',fullPage:true});
});
test('side-build motion stays inside the canvas across window sizes',async({page})=>{
 test.setTimeout(120000);
 for(const viewport of [{width:1440,height:900},{width:1280,height:720},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  for(const step of [14,15,19,21,22,23,24,25,26,27]){
   await page.goto('/?step='+step);await expect(page.locator('#loading')).toBeHidden();
   const clipped=await page.evaluate(async()=>{
    const {Box3,Vector3}=await import('/node_modules/three/build/three.module.js');
    const v=window.__assembly.viewer,clipped=[];
    for(let action=0;action<v.unitCount;action++)for(const progress of [0,275,550]){
     v.setPieceCount(action+1);const now=performance.now();v.moveStarts.fill(now-10000);v.moveStarts[action]=now-progress;
     for(const n of v.nodes)n.start=n.isNew?v.moveStarts[n.unit]:now-10000;
     v.tick();v.root.updateMatrixWorld(true);v.camera.updateMatrixWorld(true);
     for(const n of [...v.nodes,...v.contextNodes])if(n.wrapper.visible){
      const b=new Box3().setFromObject(n.wrapper);
      for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){
       const p=new Vector3(x,y,z).project(v.camera);if(Math.abs(p.x)>.94||Math.abs(p.y)>.94)clipped.push({action,part:n.p.id,x:p.x,y:p.y});
      }
     }
    }
    return clipped;
   });
   expect(clipped).toEqual([]);
   if(viewport.width===1280&&step===14){await page.locator('#replay').click();await page.waitForTimeout(150);await page.screenshot({path:'test-results/side-build-framing.png',fullPage:true});}
  }
 }
});
test('camera eases from step 15 into 16 without a reset jump',async({page})=>{
 await page.goto('/?step=15');await expect(page.locator('#loading')).toBeHidden();
 const result=await page.evaluate(async()=>{
  const {viewer:v,select}=window.__assembly;const before=v.cameraState();await select(15);
  const transition=v.cameraTransition;
  const start=v.cameraState();
  transition.start=performance.now()-700;v.tick();const middle=v.cameraState();
  transition.start=performance.now()-1400;v.tick();const end=v.cameraState();
  return {startDistance:start.position.distanceTo(before.position),startZoom:start.zoom-before.zoom,
   middleDistance:middle.position.distanceTo(before.position),totalDistance:end.position.distanceTo(before.position),
   endError:end.position.distanceTo(transition.to.position),zoomError:end.zoom-transition.to.zoom,finished:!v.cameraTransition};
 });
 expect(result.startDistance).toBeLessThan(.001);expect(Math.abs(result.startZoom)).toBeLessThan(.001);
 expect(result.middleDistance).toBeGreaterThan(0);expect(result.middleDistance).toBeLessThan(result.totalDistance);
 expect(result.endError).toBeLessThan(.001);expect(Math.abs(result.zoomError)).toBeLessThan(.001);expect(result.finished).toBe(true);
 await page.keyboard.press('Shift+ArrowLeft');await expect(page.locator('#loading')).toBeHidden();
 expect(await page.evaluate(()=>!!window.__assembly.viewer.cameraTransition)).toBe(true);
 const canvas=await page.locator('#viewer canvas').boundingBox();await page.mouse.move(canvas.x+canvas.width/2,canvas.y+canvas.height/2);await page.mouse.down();await page.mouse.up();
 expect(await page.evaluate(()=>window.__assembly.viewer.cameraTransition===null)).toBe(true);
});

test('page 14 builds the opposite mechanism with the completed frame parked',async({page})=>{
 await page.goto('/?step=16');await expect(page.locator('#loading')).toBeHidden();
 await page.locator('#next').click();await expect(page).toHaveURL(/step=17/);
 await expect(page.locator('#loading')).toBeHidden();
 await expect(page.locator('#page-select')).toHaveValue('14');
 await expect(page.locator('#piece-count')).toHaveText('2 pieces assembled');
 for(const count of [3,6,8,11]){
  await page.locator('#next').click();await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('#piece-count')).toHaveText(`${count} pieces assembled`);
 }
 await page.waitForTimeout(3000);
 expect(await page.evaluate(()=>{
  const v=window.__assembly.viewer;
  return {active:v.nodes.length,parked:v.contextNodes.length,empty:[...v.nodes,...v.contextNodes].filter(n=>{let triangles=0;n.wrapper.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});return triangles===0;}).length};
 })).toEqual({active:11,parked:41,empty:0});
 await page.screenshot({path:'test-results/page-14-step-21.png',fullPage:true});
 await page.reload();await expect(page.locator('#loading')).toBeHidden();await expect(page.locator('#large-number')).toHaveText('21');
 await expect(page.locator('#next')).toHaveText('Next page →');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1500);
 await page.screenshot({path:'test-results/page-14-mobile.png',fullPage:true});
});

test('pages 15–17 finish both mechanisms and expose underside construction',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?step=22');await expect(page.locator('#loading')).toBeHidden();
 for(const [step,count,pdf] of [[22,19,15],[23,22,15],[24,63,15],[25,69,16],[26,77,16],[27,81,17]]){
  await expect(page.locator('#large-number')).toHaveText(String(step));
  await expect(page.locator('#piece-count')).toHaveText(`${count} pieces assembled`);
  const geometry=await page.evaluate(()=>window.__assembly.viewer.nodes.map(n=>{let triangles=0;n.wrapper.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});return triangles;}));
  expect(geometry).toHaveLength(count);expect(geometry.every(n=>n>0)).toBe(true);
  if(step===24)await expect(page.locator('#parts')).toContainText('22 pieces from steps 17–23');
  if(step>=24){
   await page.waitForFunction(()=>{const v=window.__assembly.viewer;return !v.cameraTransition&&v.moveStarts.every(t=>performance.now()-t>600);});
   await page.screenshot({path:`test-results/page-${pdf}-step-${step}.png`,fullPage:true});
   if(step===25){
    const tops=await page.evaluate(async()=>{
     const {Box3}=await import('/node_modules/three/build/three.module.js');
     const v=window.__assembly.viewer;v.root.updateMatrixWorld(true);
     return v.nodes.filter(n=>n.p.step===24||(n.p.part==='73562.dat'&&n.p.position[1]===-40)).map(n=>new Box3().setFromObject(n.wrapper).max.y);
    });
    expect(tops).toHaveLength(8);for(const top of tops)expect(top).toBeCloseTo(44);
   }
  }
  if(step===26){expect(await page.evaluate(()=>window.__assembly.viewer.camera.position.y)).toBeLessThan(0);expect(await page.evaluate(()=>window.__assembly.viewer.grid.visible)).toBe(false);}
  if(step<27){await page.locator('#next').click();await expect(page.locator('#loading')).toBeHidden();}
 }
 await expect(page.locator('#next')).toBeEnabled();
 await expect(page.locator('#coverage-count')).toHaveText(new RegExp(`^Steps 1–${currentProject.steps.length} · \\d+ pieces$`));
 await expect(page.locator('#parts')).toContainText('Curved slope 2 × 1');
 const slopes=await page.evaluate(async()=>{
  const {Box3,Vector3}=await import('/node_modules/three/build/three.module.js');
  const v=window.__assembly.viewer;v.root.updateMatrixWorld(true);
  return v.nodes.filter(n=>n.p.part==='11477.dat').map(n=>{
   const box=new Box3().setFromObject(n.wrapper),size=box.getSize(new Vector3());
   return {color:n.p.color,width:size.z,top:box.max.y};
  });
 });
 expect(slopes).toHaveLength(2);
 for(const slope of slopes){expect(slope.color).toBe(72);expect(slope.width).toBeCloseTo(20);expect(slope.top).toBeCloseTo(48);}

 await page.reload();await expect(page.locator('#loading')).toBeHidden();await expect(page.locator('#large-number')).toHaveText('27');
 expect(errors).toEqual([]);
});


test('turn-over camera keeps a valid up vector in both directions',async({page})=>{
 await page.goto('/?step=25');await expect(page.locator('#loading')).toBeHidden();
 for(const index of [25,26]){
  const samples=await page.evaluate(async index=>{
   const {viewer:v,select}=window.__assembly;await select(index);
   const transition=v.cameraTransition,result=[];
   for(const elapsed of [0,350,700,1050,1400]){
    transition.start=performance.now()-elapsed;v.cameraTransition=transition;v.tick();v.controls.update();
    result.push({length:v.camera.up.length(),finite:v.camera.matrixWorld.elements.every(Number.isFinite)});
   }
   return result;
  },index);
  for(const s of samples){expect(s.length).toBeCloseTo(1);expect(s.finite).toBe(true);}
 }
});
