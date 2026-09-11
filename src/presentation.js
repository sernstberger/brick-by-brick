import {partsThrough} from './project.js';

// Display transforms never change the instruction's physical attachment coordinates.
export function assemblyPresentation(project,index){
 const assembly=project.steps[index].assembly??'frame';
 const parentStep=project.steps.findIndex((s,i)=>i>index&&(s.instances??[]).some(instance=>instance.assembly===assembly));
 const parent=parentStep>=0?(project.steps[parentStep].assembly??'frame'):project.assemblies?.[assembly]?.contextAssembly;
 if(!parent)return {offset:[0,0,0],context:[]};
 if(assembly==='leftRail'||assembly==='rightRail'){
  const side=assembly==='leftRail'?-1:1;
  return {offset:[side*70,0,0],zoom:2.6,target:[0,10,0],context:partsThrough(project,index,parent),contextOffset:[-side*180,0,-140],contextScale:.25};
 }
 return {offset:[-70,0,30],zoom:2.6,target:[0,30,0],context:partsThrough(project,index,parent),contextOffset:[90,0,-100],contextScale:.42};
}
