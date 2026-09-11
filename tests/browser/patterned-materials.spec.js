import {test,expect} from '@playwright/test';

test('patterned minifigure edge arrays highlight, restore colors and dispose only cloned materials',async({page})=>{
 const rotation=[1,0,0,0,1,0,0,0,1];
 const fixture={version:1,name:'Patterned edges',steps:[
  {page:375,title:'Patterned baby astronaut',parts:[{id:'baby',part:'25128p05.dat',color:212,position:[0,0,0],rotation},{id:'head',part:'100662p01.dat',color:212,position:[0,-24,0],rotation}]},
  {page:375,title:'Next step',parts:[]},
 ]};
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.routeWebSocket('**',()=>{});await page.route('**/sets/pinball.json',r=>r.fulfill({json:fixture}));
 await page.goto('/?step=1');await expect(page.locator('#loading')).toBeHidden();
 const result=await page.evaluate(async()=>{
  const v=window.__assembly.viewer,edges=v.nodes.flatMap(n=>n.edges).filter(e=>Array.isArray(e.old));
  let disposed=0,originalDisposed=0;
  const clones=edges.flatMap(e=>e.child.material);
  clones.forEach(m=>m.addEventListener('dispose',()=>disposed++));
  edges.flatMap(e=>e.old).forEach(m=>m.addEventListener('dispose',()=>originalDisposed++));
  const highlighted=clones.every(m=>m.color.getHex()===0xffc928);
  v.highlight=false;v.applyHighlight();
  const restored=edges.every(e=>e.child.material.every((m,i)=>m!==e.old[i]&&m.color.equals(e.old[i].color)));
  await window.__assembly.select(1);
  return {arrays:edges.length,clones:clones.length,highlighted,restored,disposed,originalDisposed};
 });
 expect(result.arrays).toBeGreaterThan(0);expect(result.highlighted).toBe(true);expect(result.restored).toBe(true);
 expect(result.disposed).toBe(result.clones);expect(result.originalDisposed).toBe(0);expect(errors).toEqual([]);
 await page.locator('#previous').click();await expect(page.locator('#loading')).toBeHidden();
});
