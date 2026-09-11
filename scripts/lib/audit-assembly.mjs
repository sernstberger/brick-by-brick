// Shared, local-only rendering checks for independently authored assembly branches.
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';
import {validateProject} from '../../src/project.js';

export {packMissingGeometry} from './pack-geometry.mjs';

export async function openAudit(project,{viewport={width:1450,height:950},step=1}={}){
 validateProject(project);
 const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
 const browser=await chromium.launch({executablePath,...(process.platform==='darwin'?{args:['--enable-gpu','--use-angle=metal']}:{})});
 const page=await browser.newPage({viewport}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 // Parallel source edits must not trigger HMR reloads midway through an audit.
 await page.routeWebSocket('**',()=>{});
 await page.route('**/sets/pinball.json',route=>route.fulfill({json:project}));
 try{
  await page.goto(`http://127.0.0.1:5174/?step=${step}`);
  await page.waitForFunction(()=>window.__assembly);await page.locator('#loading').waitFor({state:'hidden'});
 }catch(error){await browser.close();throw error;}
 return {browser,page,errors,async close(){await browser.close();if(errors.length)throw Error(errors.join('\n'));}};
}

export async function captureSettled(page,index,{file,step=index+1,zoom=4,focus}={}){
 const report=await page.evaluate(async({index,step,zoom,focus})=>{
  const {viewer:v,project}=window.__assembly;
  await window.__assembly.select(index);v.replay(false);
  for(const node of [...v.nodes,...v.contextNodes])delete node.transition;
  const {partsThrough}=await import('/src/project.js');
  const parts=partsThrough(project,index).map(p=>p.sticker?{...p,sticker:{...p.sticker,fromStep:1}}:p),source=project.steps[index];
  // Static inspection deliberately removes parked context and all motion clocks.
  await v.show({steps:[{title:'Settled audit',page:source.page,assembly:'audit',parts}],assemblies:{audit:{zoom}}},0,{animate:false});
  v.cameraTransition=null;
  if(source.camera){v.controls.target.fromArray(source.camera.target);v.camera.position.fromArray(source.camera.position);v.camera.up.fromArray(source.camera.up);}
  v.highlight=false;v.applyHighlight();v.defaultZoom=zoom;v.camera.zoom=zoom;v.controls.update();v.fitMotion();v.tick();v.grid.visible=false;
  if(focus){v.controls.target.fromArray(focus.target);v.camera.position.fromArray(focus.position);v.camera.up.fromArray(focus.up??[0,1,0]);v.controls.maxZoom=Math.max(v.controls.maxZoom,focus.zoom);v.camera.zoom=focus.zoom;v.camera.updateProjectionMatrix();v.controls.update();}
  v.renderer.render(v.scene,v.camera);v.renderer.getContext().finish();
  const empty=v.nodes.filter(n=>{let count=0;n.wrapper.traverse(o=>{if(o.isMesh)count+=o.geometry.attributes.position.count;});return !count;}).map(n=>n.p.id);
  if(empty.length)throw Error(`Missing rendered geometry: ${empty.join(', ')}`);
  return {step,count:v.nodes.length,empty:empty.length};
 },{index,step,zoom,focus});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 if(file){await mkdir(path.dirname(file),{recursive:true});await page.locator('#viewer').screenshot({path:file});}
 return report;
}
