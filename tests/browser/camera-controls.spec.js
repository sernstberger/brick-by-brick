import {test,expect} from '@playwright/test';

// Parallel geometry packing must not reload a browser verification mid-step.
test.beforeEach(async({page})=>{await page.routeWebSocket('**',()=>{});});

test('drag rotation follows the displayed up axis after assembly turns and view changes',async({page})=>{
 test.setTimeout(120000);
 await page.goto('/?step=269');await expect(page.locator('#loading')).toBeHidden({timeout:60000});
 const canvas=page.locator('#viewer canvas');
 for(const view of ['iso','top','front','underside','iso']){
  await page.evaluate(view=>{const v=window.__assembly.viewer;v.resetCamera(view,{animate:false});v.controls.enableDamping=false;},view);
  const before=await page.evaluate(()=>{const v=window.__assembly.viewer,d=v.camera.position.clone().sub(v.controls.target);return {position:v.camera.position.toArray(),target:v.controls.target.toArray(),radius:d.length(),altitude:d.normalize().dot(v.camera.up)};});
  const box=await canvas.boundingBox(),x=box.x+box.width*.5,y=box.y+box.height*.5;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+90,y,{steps:8});await page.mouse.up();
  const after=await page.evaluate(()=>{const v=window.__assembly.viewer,d=v.camera.position.clone().sub(v.controls.target);return {position:v.camera.position.toArray(),target:v.controls.target.toArray(),radius:d.length(),altitude:d.normalize().dot(v.camera.up)};});
  expect(after.target).toEqual(before.target);
  expect(after.radius).toBeCloseTo(before.radius,4);
  expect(after.altitude,`${view}: horizontal dragging must retain elevation relative to the displayed up axis`).toBeCloseTo(before.altitude,5);
  expect(Math.hypot(...after.position.map((n,i)=>n-before.position[i]))).toBeGreaterThan(10);
 }
});

test('dragging interrupts an automatic turn and keeps the user camera after release',async({page})=>{
 await page.goto('/?step=25');await expect(page.locator('#loading')).toBeHidden();
 await page.evaluate(()=>{const v=window.__assembly.viewer;v.resetCamera('underside');v.cameraTransition.start=performance.now()-500;v.tick();v.controls.update();});
 const box=await page.locator('#viewer canvas').boundingBox(),x=box.x+box.width*.5,y=box.y+box.height*.5;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+70,y+45,{steps:10});await page.mouse.up();
 const result=await page.evaluate(()=>{
  const v=window.__assembly.viewer;for(let i=0;i<240;i++)v.controls.update();
  const settled=v.camera.position.clone(),target=v.controls.target.clone();
  for(let i=0;i<60;i++){v.tick();v.controls.update();}
  return {transition:v.cameraTransition,movement:v.camera.position.distanceTo(settled),pan:v.controls.target.distanceTo(target),finite:v.camera.matrixWorld.elements.every(Number.isFinite)};
 });
 expect(result.transition).toBeNull();expect(result.movement).toBeLessThan(.01);expect(result.pan).toBeLessThan(.001);expect(result.finite).toBe(true);
});
