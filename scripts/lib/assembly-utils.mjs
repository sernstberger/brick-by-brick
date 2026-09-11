import {IDENTITY,transformPosition,multiplyRotation} from '../../src/project.js';

export function createPartFactory({start=0,prefix='p',approach=[0,-85,0]}={}){
 let next=start;
 return (file,color,position,elementId,rotation=IDENTITY,insertion=approach)=>({
  id:`${prefix}${++next}`,part:file.endsWith('.dat')?file:`${file}.dat`,
  color,position,rotation,elementId,status:'inferred',approach:insertion,
 });
}

export function insetMotion(parts,source,stagingOffset=[0,-100,70]){
 return {source,stagingOffset,actions:[
  ...parts.map(p=>({type:'add',part:p.id,approach:p.approach})),
  {type:'place',parts:parts.map(p=>p.id)},
 ]};
}

export function transformPart(part,position,rotation){
 return {...part,position:transformPosition(position,rotation,part.position),
  rotation:multiplyRotation(rotation,part.rotation),
  ...(part.approach?{approach:transformPosition([0,0,0],rotation,part.approach)}:{}),
 };
}

export {transformPosition,multiplyRotation};
