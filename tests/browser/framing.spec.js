import {test,expect} from '@playwright/test';

test('mid-build loose builds, joins, slide and pin stay framed on desktop and phone',async({page})=>{
 test.setTimeout(360000);await page.routeWebSocket('**',()=>{});
 await page.goto('/?step=314');await expect(page.locator('#loading')).toBeHidden();
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  for(const step of [314,361,362,364,380,381,388]){
   const max=await page.evaluate(async step=>{
    await window.__assembly.select(step-1);const v=window.__assembly.viewer;v.replay(false);
    for(const n of [...v.nodes,...v.contextNodes])delete n.transition;
    if(v.cameraTransition)v.cameraTransition.start=performance.now()-1500;
    v.tick();v.controls.update();
    const {Box3,Vector3}=await import('/node_modules/three/build/three.module.js');let max=0,worst=null;
    for(let count=1;count<=v.unitCount;count++)for(const elapsed of [0,275,550]){
     const now=performance.now();v.pieceCount=count;
     v.moveStarts=Array.from({length:v.unitCount},(_,i)=>now-(i===count-1?elapsed:550));
     for(const n of v.nodes)if(n.isNew||n.isMoving)n.start=v.moveStarts[n.unit];
     v.tick();v.root.updateMatrixWorld(true);v.camera.updateMatrixWorld(true);
     for(const n of [...v.nodes,...v.contextNodes])if(n.wrapper.visible){
      const box=new Box3().setFromObject(n.wrapper);
      for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
       const p=new Vector3(x,y,z).project(v.camera);const extent=Math.max(Math.abs(p.x),Math.abs(p.y));if(extent>max){max=extent;worst={id:n.p.id,count,elapsed,point:[p.x,p.y]};}
      }
     }
    }
    return {max,worst};
   },step);
   expect.soft(max.max,`step ${step}, ${viewport.width}px: ${JSON.stringify(max.worst)}`).toBeLessThan(.98);
   await expect(page.locator('footer.navigation')).toBeInViewport();
  }
 }
});
