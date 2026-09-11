// All stored transforms use LDraw coordinates: X right, Y down, Z toward you.
// One stud = 20 LDU; one plate = 8 LDU; one brick = 24 LDU.
export const IDENTITY = [1,0,0,0,1,0,0,0,1];
export const COLORS = [{id:226,name:'Bright light yellow',hex:'#ffec6c'},{id:43,name:'Transparent light blue',hex:'#aee9ef'},{id:70,name:'Reddish brown',hex:'#5f3109'},{id:84,name:'Medium nougat',hex:'#aa7d55'},{id:27,name:'Lime',hex:'#bbd530'},{id:4,name:'Red',hex:'#c91a09'},{id:0,name:'Black',hex:'#252525'},{id:71,name:'Light bluish gray',hex:'#a0a5a9'},{id:72,name:'Dark bluish gray',hex:'#6c6e68'},{id:15,name:'White',hex:'#ffffff'},{id:14,name:'Yellow',hex:'#f2cd37'},{id:1,name:'Blue',hex:'#0055bf'},{id:2,name:'Green',hex:'#237841'},{id:19,name:'Tan',hex:'#e4cd9e'},{id:25,name:'Orange',hex:'#fe8a18'},{id:10,name:'Bright green',hex:'#4b9f4a'},{id:22,name:'Purple',hex:'#81007b'}];
export function validateProject(p) {
  if (!p || p.version !== 1 || typeof p.name !== 'string' || !p.name.trim() || !Array.isArray(p.steps) || p.steps.length > 10000) throw Error('Expected a version 1 project with a name and steps.');
  const ids = new Set();
  for (const [i,s] of p.steps.entries()) {
    if (!s || typeof s.title !== 'string' || !Number.isInteger(s.page) || s.page < 1 || !Array.isArray(s.parts)) throw Error(`Step ${i+1}: title, page, and parts are required.`);
    for (const part of s.parts) {
      if (!part || typeof part.id !== 'string' || !part.id || ids.has(part.id)) throw Error(`Step ${i+1}: every part needs a unique instance ID.`);
      ids.add(part.id);
      if (!/^[a-z0-9_-]+\.dat$/i.test(part.part)) throw Error(`Step ${i+1}: invalid LDraw part filename.`);
      if (!Number.isInteger(part.color) || part.color < 0) throw Error('Invalid LDraw color.');
      for (const [key,n] of [['position',3],['rotation',9]]) if (!Array.isArray(part[key]) || part[key].length !== n || !part[key].every(x => Number.isFinite(x) && Math.abs(x) <= 1e6)) throw Error(`Part ${part.id}: invalid ${key}.`);
      const r=part.rotation;
      for(let a=0;a<3;a++) for(let b=0;b<3;b++) { let dot=0; for(let j=0;j<3;j++) dot+=r[a*3+j]*r[b*3+j]; if(Math.abs(dot-(a===b?1:0))>.001) throw Error(`Part ${part.id}: rotation must be orthonormal.`); }
      if (part.status && !['inferred','reviewed'].includes(part.status)) throw Error('Invalid review status.');
    }
    for(const update of s.partUpdates??[]){
      if(!update||typeof update.id!=='string')throw Error(`Step ${i+1}: pose update needs an existing part ID.`);
      if(!Array.isArray(update.position)||update.position.length!==3||!update.position.every(v=>Number.isFinite(v)&&Math.abs(v)<=1e6))throw Error('Invalid updated position.');
      if(update.rotation){
        const r=update.rotation;if(!Array.isArray(r)||r.length!==9||!r.every(Number.isFinite))throw Error('Invalid updated rotation.');
        for(let a=0;a<3;a++)for(let b=0;b<3;b++){let dot=0;for(let j=0;j<3;j++)dot+=r[a*3+j]*r[b*3+j];if(Math.abs(dot-(a===b?1:0))>.001)throw Error('Updated rotation must be orthonormal.');}
      }
    }
    for(const update of s.instanceUpdates??[]){
      if(!update||typeof update.id!=='string'||!update.id)throw Error(`Step ${i+1}: assembly move needs an existing instance ID.`);
      if(!Array.isArray(update.position)||update.position.length!==3||!update.position.every(v=>Number.isFinite(v)&&Math.abs(v)<=1e6))throw Error('Invalid assembly move position.');
      if(update.rotation!==undefined)throw Error('Assembly moves translate the existing rotation.');
    }
    if(s.partUpdates?.length||s.instanceUpdates?.length||s.instances?.length)partsThrough(p,i);
  }
  return p;
}
export function transformPosition(position, rotation, point){return position.map((v,i)=>v+rotation[i*3]*point[0]+rotation[i*3+1]*point[1]+rotation[i*3+2]*point[2]);}
export function multiplyRotation(a,b){return a.map((_,i)=>[0,1,2].reduce((v,k)=>v+a[Math.floor(i/3)*3+k]*b[k*3+i%3],0));}
export function partsThrough(p,index,assembly=p.steps[index]?.assembly??'frame') {
 const result=[],instances=new Map();
 for(let step=0;step<=index;step++){
  const s=p.steps[step];if(!s||(s.assembly??'frame')!==assembly)continue;
  result.push(...s.parts.map(part=>{
   const visible={...part,step};
   if(part.sticker?.fromStep>index+1)delete visible.sticker;
   return visible;
  }));
  for(const instance of s.instances??[]){
   if(!Number.isInteger(instance.throughStep)||instance.throughStep<0||instance.throughStep>=step)throw Error('Subassembly must reference an earlier completed step.');
   if(instances.has(instance.id))throw Error('Subassembly instance IDs must be unique within their receiving assembly.');
   instances.set(instance.id,{position:instance.position,step});
   for(const part of partsThrough(p,instance.throughStep,instance.assembly))result.push({...part,id:instance.id+'/'+part.id,sourceStep:part.step,step,assemblyInstance:instance.id,position:transformPosition(instance.position,instance.rotation,part.position),rotation:multiplyRotation(instance.rotation,part.rotation),approach:instance.approach??[0,-100,0]});
  }
  for(const update of s.instanceUpdates??[]){
   const previous=instances.get(update.id);
   if(!previous||previous.step===step)throw Error('Assembly moves must target an earlier instance in the same assembly.');
   const delta=update.position.map((v,i)=>v-previous.position[i]);
   for(const part of result.filter(p=>p.assemblyInstance===update.id)){
    Object.assign(part,{previousPosition:part.position,previousRotation:part.rotation,position:part.position.map((v,i)=>v+delta[i]),updatedStep:step,updatedInstance:update.id});
   }
   previous.position=update.position;
  }
  for(const update of s.partUpdates??[]){
   const part=result.find(p=>p.id===update.id);
   if(!part||part.step===step)throw Error('Pose updates must target an earlier part in the same assembly.');
   const previousPosition=part.position,previousRotation=part.rotation;
   Object.assign(part,{position:update.position,rotation:update.rotation??part.rotation,previousPosition,previousRotation,updatedStep:step});
   delete part.updatedInstance;
  }
 }
 return result;
}
export function instancesThrough(p,index,assembly=p.steps[index]?.assembly??'frame'){
 const instances=new Map();
 for(let i=0;i<=index;i++){
  const step=p.steps[i];if(!step||(step.assembly??'frame')!==assembly)continue;
  for(const instance of step.instances??[])instances.set(instance.id,{...instance});
  for(const update of step.instanceUpdates??[]){const instance=instances.get(update.id);if(!instance)throw Error('Unknown assembly move target.');instance.position=update.position;}
 }
 return [...instances.values()];
}
export function toLDraw(p) {
 validateProject(p);
 const assemblies=[...new Set(p.steps.map(s=>s.assembly??'frame'))];
 const consumed=new Set(p.steps.flatMap(s=>(s.instances??[]).map(i=>i.assembly)));
 const fileName=name=>`assembly-${assemblies.indexOf(name)}.ldr`;
 const reference=(v,file)=>`1 ${v.color??16} ${v.position.join(' ')} ${v.rotation.join(' ')} ${file}`;
 const latest=name=>p.steps.findLastIndex(s=>(s.assembly??'frame')===name);
 const snapshots=new Map();
 const snapshotName=(name,index)=>{
  if(index>=latest(name))return fileName(name);
  const key=`${name}:${index}`;
  if(!snapshots.has(key))snapshots.set(key,{name,index,file:`assembly-${assemblies.indexOf(name)}-through-${index+1}.ldr`});
  return snapshots.get(key).file;
 };
 // A model file contains each physical part once at this snapshot's latest pose.
 // Earlier build-step records remain in the MPD, while rigid references point to
 // their exact completed-step snapshot rather than future edits to that assembly.
 const section=(name,index=p.steps.length-1)=>{
  const finalParts=new Map(partsThrough(p,index,name).map(v=>[v.id,v]));
  const finalInstances=new Map(instancesThrough(p,index,name).map(v=>[v.id,v]));
  const overridden=new Set(p.steps.slice(0,index+1).filter(s=>(s.assembly??'frame')===name).flatMap(s=>(s.partUpdates??[]).map(v=>v.id)));
  const instanceLines=instance=>{
   const prefix=instance.id+'/';
   // A moved pin belongs only to this receiving snapshot. Inline that instance
   // at its resolved poses rather than modifying the reusable source model.
   if([...overridden].some(id=>id.startsWith(prefix)))return [...finalParts.values()].filter(v=>v.id.startsWith(prefix)).map(v=>reference(v,v.part));
   return [reference(finalInstances.get(instance.id),snapshotName(instance.assembly,instance.throughStep))];
  };
  return ['0 '+p.name.replace(/[\r\n]/g,' '),...p.steps.flatMap((s,i)=>i>index||(s.assembly??'frame')!==name?[]:[`0 Step ${i+1}: ${s.title.replace(/[\r\n]/g,' ')} (page ${s.page})`,...s.parts.map(v=>reference(finalParts.get(v.id),v.part)),...(s.instances??[]).flatMap(instanceLines),'0 STEP'])].join('\n')+'\n';
 };
 if(assemblies.length===1)return section(assemblies[0]);
 const sections=assemblies.map(name=>`0 FILE ${fileName(name)}\n${section(name)}`);
 for(const snapshot of snapshots.values())sections.push(`0 FILE ${snapshot.file}\n${section(snapshot.name,snapshot.index)}`);
 return ['0 FILE workspace.ldr','0 Unattached assemblies are displayed apart; offsets are presentation only.',...assemblies.filter(name=>!consumed.has(name)).map((name,i)=>reference({position:[i*500,0,0],rotation:IDENTITY},fileName(name))),...sections].join('\n');
}
export function makeProject(name) { return {version:1,id:crypto.randomUUID(),name,steps:[{title:'First assembly',page:1,parts:[]}]}; }
export function rotateY(rotation, degrees=90) {
  const a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a),m=[c,0,s,0,1,0,-s,0,c];
  return m.map((_,i)=>{const row=Math.floor(i/3),col=i%3;return [0,1,2].reduce((v,k)=>v+m[row*3+k]*rotation[k*3+col],0);}).map(x=>Math.abs(x)<1e-10?0:x);
}
