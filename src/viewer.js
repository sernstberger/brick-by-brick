import * as THREE from 'three';
import {AssemblyOrbitControls} from './assembly-orbit-controls.js';
import {LDrawLoader} from 'three/addons/loaders/LDrawLoader.js';
import {LDrawConditionalLineMaterial} from 'three/addons/materials/LDrawConditionalLineMaterial.js';
import {partsThrough} from './project.js';
import {assemblyPresentation} from './presentation.js';
import {motionProgress,stagedOffset,stagingEndpoints} from './motion.js';
import {createSticker} from './stickers.js';
export class AssemblyViewer {
 constructor(host){
  this.host=host;this.nodes=[];this.contextNodes=[];this.cache=new Map();this.stickerCache=new Map();this.serial=0;this.exploded=false;this.highlight=true;
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setClearColor(0xe9ece9,0);
  this.renderer.setSize(host.clientWidth,host.clientHeight);host.append(this.renderer.domElement);
  this.renderer.domElement.setAttribute('aria-label','Interactive 3D brick assembly. Drag to orbit, scroll to zoom.');
  this.scene=new THREE.Scene();this.scene.add(new THREE.HemisphereLight(0xffffff,0x707982,3));
  const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(-150,400,250);this.scene.add(key);
  const fill=new THREE.DirectionalLight(0xcddcff,1.5);fill.position.set(250,100,-200);this.scene.add(fill);
  this.camera=new THREE.OrthographicCamera(-280,280,220,-220,.1,5000);
  this.controls=new AssemblyOrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.minZoom=.1;this.controls.maxZoom=5;this.controls.addEventListener('start',()=>{this.cameraTransition=null;});
  this.root=new THREE.Group();this.root.rotation.x=Math.PI;this.scene.add(this.root);
  this.grid=new THREE.GridHelper(1200,60,0xc1c8c3,0xdce1dc);this.grid.position.y=-8.3;this.scene.add(this.grid);
  this.loader=new LDrawLoader();this.loader.setConditionalLineMaterial(LDrawConditionalLineMaterial);
  this.ready=this.loader.preloadMaterials('models/LDConfig.ldr');
  this.resetCamera();
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);
  this.renderer.setAnimationLoop(()=>{this.tick();this.controls.update();try{this.renderer.render(this.scene,this.camera);}catch(error){this.renderer.setAnimationLoop(null);console.error(error);}});
 }
 resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);const aspect=w/h;const halfHeight=240*Math.max(1,2.25/aspect);this.camera.left=-halfHeight*aspect;this.camera.right=halfHeight*aspect;this.camera.top=halfHeight;this.camera.bottom=-halfHeight;this.camera.updateProjectionMatrix();this.fitMotion();}
 cameraState(){return {position:this.camera.position.clone(),target:this.controls.target.clone(),up:this.camera.up.clone(),zoom:this.camera.zoom};}
 resetCamera(view='iso',{animate=this.nodes.length>0}={}){
  const from=this.cameraState();this.cameraTransition=null;
  this.controls.target.fromArray(this.defaultTarget??[0,4,-25]);this.camera.position.set(...(view==='top'?[0,650,-25]:view==='front'?[0,80,-650]:view==='underside'?[360,-300,-550]:[360,300,-550]));this.camera.up.set(0,view==='underside'?-1:1,0);if(view==='top')this.camera.up.set(0,0,1);
  if(view==='iso'&&this.defaultCamera){this.controls.target.fromArray(this.defaultCamera.target);this.camera.position.fromArray(this.defaultCamera.position);this.camera.up.fromArray(this.defaultCamera.up);}
  this.camera.zoom=this.defaultZoom??1.65;this.camera.lookAt(this.controls.target);this.camera.updateProjectionMatrix();this.controls.update();this.fitMotion();
  if(animate){const to=this.cameraState();this.camera.position.copy(from.position);this.controls.target.copy(from.target);this.camera.up.copy(from.up);this.camera.zoom=from.zoom;this.camera.updateProjectionMatrix();this.controls.update();this.cameraTransition={from,to,start:performance.now()};}
 }
 fitMotion(){
  if(!this.nodes.length)return;
  const points=[];this.root.updateMatrixWorld(true);
  for(const n of [...this.nodes,...this.contextNodes]){
   const saved={position:n.wrapper.position.clone(),scale:n.wrapper.scale.clone(),quaternion:n.wrapper.quaternion.clone()};
   n.wrapper.position.copy(n.position);n.wrapper.scale.setScalar(n.scale);n.wrapper.quaternion.copy(n.quaternion);n.wrapper.updateWorldMatrix(true,true);
   const box=new THREE.Box3().setFromObject(n.wrapper);
   const offsets=[[0,0,0]];
   if(n.isNew)for(const stage of stagingEndpoints(this.motion,n.p.id))offsets.push(stage,stage.map((v,i)=>v+(n.approach??n.p.approach??[0,-85,0])[i]));
   if(n.isMoving)offsets.push(n.p.previousPosition.map((v,i)=>v-n.p.position[i]));
   for(const offset of offsets){const delta=new THREE.Vector3(...offset).applyQuaternion(this.root.quaternion);for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).add(delta));}
   if(n.fold)for(const remaining of [0,.25,.5,.75,1]){
    n.wrapper.position.copy(n.position);n.wrapper.quaternion.copy(n.quaternion);this.applyFoldPose(n,remaining);n.wrapper.updateWorldMatrix(true,true);
    const swept=new THREE.Box3().setFromObject(n.wrapper);
    for(const offset of offsets){const delta=new THREE.Vector3(...offset).applyQuaternion(this.root.quaternion);for(const x of [swept.min.x,swept.max.x])for(const y of [swept.min.y,swept.max.y])for(const z of [swept.min.z,swept.max.z])points.push(new THREE.Vector3(x,y,z).add(delta));}
   }
   if(n.isMoving){
    for(const t of [0,.25,.5,.75,1]){
     this.applyMovingPose(n,t);n.wrapper.updateWorldMatrix(true,true);
     const swept=new THREE.Box3().setFromObject(n.wrapper);for(const x of [swept.min.x,swept.max.x])for(const y of [swept.min.y,swept.max.y])for(const z of [swept.min.z,swept.max.z])points.push(new THREE.Vector3(x,y,z));
    }
   }
   // Rotating rail mounts follow an arc; endpoints alone miss its swept bounds.
   const transition=n.transition;
   if(transition)for(const t of transition.mount?[0,.25,.5,.75,1]:[0]){
    if(transition.mount){
     const m=transition.mount,rotation=new THREE.Quaternion().slerpQuaternions(m.fromRotation,m.toRotation,t),scale=THREE.MathUtils.lerp(m.fromScale,n.scale,t);
     n.wrapper.position.copy(transition.localPosition).multiplyScalar(scale).applyQuaternion(rotation).add(new THREE.Vector3().lerpVectors(m.fromPosition,m.toPosition,t));
     n.wrapper.quaternion.copy(rotation).multiply(transition.localRotation);n.wrapper.scale.setScalar(scale);
    }else{n.wrapper.position.copy(transition.position);n.wrapper.quaternion.copy(transition.quaternion);n.wrapper.scale.copy(transition.scale);}
    n.wrapper.updateWorldMatrix(true,true);const swept=new THREE.Box3().setFromObject(n.wrapper);
    for(const x of [swept.min.x,swept.max.x])for(const y of [swept.min.y,swept.max.y])for(const z of [swept.min.z,swept.max.z])points.push(new THREE.Vector3(x,y,z));
   }
   n.wrapper.position.copy(saved.position);n.wrapper.scale.copy(saved.scale);n.wrapper.quaternion.copy(saved.quaternion);n.wrapper.updateWorldMatrix(true,true);
  }
  this.camera.updateMatrixWorld(true);
  const viewBox=new THREE.Box3().setFromPoints(points.map(p=>p.clone().applyMatrix4(this.camera.matrixWorldInverse)));
  const center=viewBox.getCenter(new THREE.Vector3());
  const shift=new THREE.Vector3(center.x,center.y,0).applyQuaternion(this.camera.quaternion);
  this.camera.position.add(shift);this.controls.target.add(shift);
  const size=viewBox.getSize(new THREE.Vector3());
  this.camera.zoom=Math.min(this.defaultZoom,(this.camera.right-this.camera.left)*.8/Math.max(size.x,1),(this.camera.top-this.camera.bottom)*.76/Math.max(size.y,1));
  this.camera.updateProjectionMatrix();this.controls.update();
 }
 async geometry(part,color){
  const key=part+':'+color;
  if(!this.cache.has(key))this.cache.set(key,(async()=>{
   await this.ready;
   const response=await fetch(`models/parts/${part}.mpd`);if(!response.ok)throw Error(`Missing geometry for ${part}. Run the part packing script.`);
   const packed=await response.text();
   const text=`0 FILE instance.ldr\n1 ${color} 0 0 0 1 0 0 0 1 0 0 0 1 ${part}\n${packed}`;
   const loader=new LDrawLoader();loader.setConditionalLineMaterial(LDrawConditionalLineMaterial);await loader.preloadMaterials('models/LDConfig.ldr');
   loader.setFileMap(Object.fromEntries([...packed.matchAll(/^0 FILE (.+)$/gm)].map(m=>[m[1],m[1]])));
   return new Promise((resolve,reject)=>loader.parse(text,group=>{let meshes=0;group.traverse(o=>{if(o.isMesh)meshes++;});if(!meshes)reject(Error('No geometry loaded for '+part));else resolve(group);},reject));
  })());
  return this.cache.get(key);
 }
 async show(project,index,{animate=true,pieceCount=Infinity}={}){
  const serial=++this.serial;const display=assemblyPresentation(project,index);
  const parts=[...partsThrough(project,index),...display.context];
  const activeCount=parts.length-display.context.length;
  const assembly=project.steps[index].assembly??'frame';
  const changed=this.assembly!==assembly;
  const cameraChanged=JSON.stringify(this.defaultCamera)!==JSON.stringify(project.steps[index].camera);
  this.defaultCamera=project.steps[index].camera;
  const [prototypes,stickers]=await Promise.all([
   Promise.all(parts.map(p=>this.geometry(p.part,p.color))),
   Promise.all(parts.map(p=>{
    if(!p.sticker)return null;
    const key=JSON.stringify(p.sticker);
    if(!this.stickerCache.has(key))this.stickerCache.set(key,createSticker(p.sticker));
    return this.stickerCache.get(key);
   })),
  ]);
  if(serial!==this.serial)return;
  const previous=new Map([...this.nodes,...this.contextNodes].map(n=>[n.p.id,{position:n.wrapper.position.clone(),scale:n.wrapper.scale.clone(),quaternion:n.wrapper.quaternion.clone()}]));
  const rigidMounts=new Map();
  if(changed&&animate)for(const instance of project.steps[index].instances??[]){
   const source=partsThrough(project,instance.throughStep,instance.assembly);
   const anchor=source.find(p=>previous.has(p.id));if(!anchor)continue;
   const prior=previous.get(anchor.id),matrix=r=>new THREE.Matrix4().set(r[0],r[1],r[2],0,r[3],r[4],r[5],0,r[6],r[7],r[8],0,0,0,0,1);
   const fromRotation=prior.quaternion.clone().multiply(new THREE.Quaternion().setFromRotationMatrix(matrix(anchor.rotation)).invert());
   const fromPosition=prior.position.clone().sub(new THREE.Vector3(...anchor.position).multiply(prior.scale).applyQuaternion(fromRotation));
   rigidMounts.set(instance.id,{source:new Map(source.map(p=>[p.id,p])),fromRotation,fromPosition,fromScale:prior.scale.x,
    toRotation:new THREE.Quaternion().setFromRotationMatrix(matrix(instance.rotation)),toPosition:new THREE.Vector3(...instance.position).add(new THREE.Vector3(...display.offset))});
  }
  if(changed){this.assembly=assembly;this.defaultZoom=display.zoom??project.assemblies?.[assembly]?.zoom??1.65;this.defaultTarget=display.target??project.assemblies?.[assembly]?.target??[0,4,-25];}
  this.disposeHighlights();this.root.clear();this.nodes=[];this.contextNodes=[];
  const transitionStart=performance.now();
  for(let i=0;i<parts.length;i++){
   const p=parts[i],wrapper=new THREE.Group(),object=prototypes[i].clone(true),r=p.rotation;
   if(stickers[i])object.add(stickers[i].clone());
   wrapper.applyMatrix4(new THREE.Matrix4().set(r[0],r[1],r[2],0,r[3],r[4],r[5],0,r[6],r[7],r[8],0,0,0,0,1));
   wrapper.add(object);wrapper.position.fromArray(p.position);this.root.add(wrapper);
   const context=i>=activeCount,isNew=!context&&p.step===index;
   const edges=[];
   if(isNew)object.traverse(child=>{
    if(child.isLineSegments&&!child.isConditionalLine){
     const old=child.material,clone=m=>{const copy=m.clone();copy.color.set(0xffc928);copy.depthTest=true;return copy;};
     child.material=Array.isArray(old)?old.map(clone):clone(old);child.renderOrder=5;edges.push({child,old});
    }
   });
   const direction=new THREE.Vector3(...(p.approach??[0,-85,0])).normalize().negate();
   const arrow=new THREE.ArrowHelper(direction,new THREE.Vector3(),35,0x36a966,9,4);arrow.visible=false;this.root.add(arrow);
   const position=new THREE.Vector3(...p.position);
   const scale=context?display.contextScale:1;
   position.multiplyScalar(scale).add(new THREE.Vector3(...(context?display.contextOffset:display.offset)));
   const prior=previous.get(p.id)??(p.assemblyInstance?previous.get(p.id.slice(p.assemblyInstance.length+1)):null);
   const node={p,wrapper,isNew,isMoving:!context&&p.updatedStep===index,edges,arrow,position,scale,quaternion:wrapper.quaternion.clone()};
   if(changed&&prior&&animate)node.transition={...prior,start:transitionStart};
   const mount=rigidMounts.get(p.assemblyInstance);
   if(mount){const source=mount.source.get(p.id.slice(p.assemblyInstance.length+1));node.transition={...node.transition,start:transitionStart,mount,localPosition:new THREE.Vector3(...source.position),localRotation:mount.toRotation.clone().invert().multiply(node.quaternion)};}
   (context?this.contextNodes:this.nodes).push(node);
  }
  // Keep the floor below the completed geometry, including underside additions.
  let floor=Infinity;
  for(const n of [...this.nodes,...this.contextNodes]){n.wrapper.position.copy(n.position);n.wrapper.scale.setScalar(n.scale);n.wrapper.updateWorldMatrix(true,true);floor=Math.min(floor,new THREE.Box3().setFromObject(n.wrapper).min.y);}
  if(Number.isFinite(floor))this.grid.position.y=floor-4;
  const units=new Map();
  for(const n of this.nodes){if(!n.isNew)continue;const key=n.p.assemblyInstance??n.p.id;if(!units.has(key))units.set(key,units.size);n.unit=units.get(key);}
  for(const n of this.nodes)if(n.isMoving){const key=n.p.updatedInstance?`move-instance:${n.p.updatedInstance}`:`move:${n.p.id}`;if(!units.has(key))units.set(key,units.size);n.unit=units.get(key);}
  const previousMotion=this.motion,currentStep=project.steps[index];
  this.motion=currentStep.motion??(currentStep.partUpdates?.length||currentStep.instanceUpdates?.length?{actions:[...currentStep.parts.map(p=>({type:'add',part:p.id,approach:p.approach})),...(currentStep.instances??[]).map(p=>({type:'add',instance:p.id,approach:p.approach})),...(currentStep.instanceUpdates??[]).map(p=>({type:'move',instance:p.id})),...(currentStep.partUpdates??[]).map(p=>({type:'move',part:p.id}))]}:undefined);
  if(this.motion)for(const n of this.nodes){
   if(!n.isNew&&!n.isMoving)continue;
   n.unit=this.motion.actions.findIndex(a=>a.type===(n.isMoving?'move':'add')&&(a.part===n.p.id||a.parts?.includes(n.p.id)||(a.instance&&a.instance===(n.isMoving?n.p.updatedInstance:n.p.assemblyInstance))));
   if(n.unit<0)throw Error(`Missing motion action for ${n.p.id}`);
   const action=this.motion.actions[n.unit];n.approach=action.approach;
   if(n.isMoving&&action.pivot)n.movePivot=new THREE.Vector3(...action.pivot).add(n.position).sub(new THREE.Vector3(...n.p.position));
   if(n.isNew){
    const folds=this.motion.actions.map((action,index)=>({action,index})).filter(({action})=>action.type==='rotate'&&action.parts?.includes(n.p.id));
    if(folds.length>1)throw Error(`Multiple same-step folds are not supported for ${n.p.id}`);
    if(folds.length){
     const {action,index}=folds[0],r=action.fromRotation;
     n.fold={index,pivot:new THREE.Vector3(...action.pivot).add(n.position).sub(new THREE.Vector3(...n.p.position)),rotation:new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().set(r[0],r[1],r[2],0,r[3],r[4],r[5],0,r[6],r[7],r[8],0,0,0,0,1))};
    }
   }
  }
  this.unitCount=this.motion?.actions.length??units.size;this.pieceCount=Math.min(pieceCount,this.unitCount);
  this.replay(animate);this.applyHighlight();
  if(changed||cameraChanged||this.motion||previousMotion)this.resetCamera(project.steps[index].cameraView??'iso',{animate:animate&&previous.size>0});
  else{
   // Plain additions can outgrow the previous step without changing its view.
   // Fit the new bounds while retaining the current orbit direction.
   const from=this.cameraState();this.cameraTransition=null;this.fitMotion();
   if(animate&&previous.size>0){
    const to=this.cameraState();this.camera.position.copy(from.position);this.controls.target.copy(from.target);this.camera.zoom=from.zoom;
    this.camera.updateProjectionMatrix();this.controls.update();this.cameraTransition={from,to,start:performance.now()};
   }
  }
 }
 disposeHighlights(){for(const n of [...this.nodes,...this.contextNodes]){for(const {child} of n.edges)for(const m of Array.isArray(child.material)?child.material:[child.material])m.dispose();n.arrow.dispose();}}
 applyHighlight(){for(const n of this.nodes)for(const {child,old}of n.edges){
  const materials=Array.isArray(child.material)?child.material:[child.material],originals=Array.isArray(old)?old:[old];
  materials.forEach((m,i)=>{m.color.copy(this.highlight?new THREE.Color(0xffc928):originals[i].color);m.depthTest=true;});
 }}
 applyMovingPose(n,remaining){
  const r=n.p.previousRotation;
  const before=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().set(r[0],r[1],r[2],0,r[3],r[4],r[5],0,r[6],r[7],r[8],0,0,0,0,1));
  n.wrapper.quaternion.copy(n.quaternion).slerp(before,remaining);
  if(n.movePivot){
   const delta=n.wrapper.quaternion.clone().multiply(n.quaternion.clone().invert());
   n.wrapper.position.copy(n.position).sub(n.movePivot).applyQuaternion(delta).add(n.movePivot);
  }else n.wrapper.position.copy(n.position).addScaledVector(new THREE.Vector3(...n.p.previousPosition).sub(new THREE.Vector3(...n.p.position)),remaining);
 }
 applyFoldPose(n,remaining){
  const delta=new THREE.Quaternion().slerp(n.fold.rotation,remaining);
  n.wrapper.position.sub(n.fold.pivot).applyQuaternion(delta).add(n.fold.pivot);n.wrapper.quaternion.premultiply(delta);
 }
 tick(){
  const now=performance.now();
  if(this.cameraTransition){const c=this.cameraTransition,t=Math.min(1,(now-c.start)/1400),ease=t*t*(3-2*t);this.camera.position.lerpVectors(c.from.position,c.to.position,ease);this.controls.target.lerpVectors(c.from.target,c.to.target,ease);this.camera.up.copy(c.from.up).applyQuaternion(new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(c.from.up,c.to.up),ease)).normalize();this.camera.zoom=THREE.MathUtils.lerp(c.from.zoom,c.to.zoom,ease);this.camera.updateProjectionMatrix();if(t===1)this.cameraTransition=null;}
  this.grid.visible=this.defaultCamera?.up[2]!==1&&this.camera.position.y>=this.controls.target.y;
  for(const n of [...this.nodes,...this.contextNodes]){
   const included=!n.isNew||n.unit<this.pieceCount;
   const started=!n.isNew||this.exploded||now>=n.start;
   n.wrapper.visible=included&&started;
   const t=Math.max(0,Math.min(1,(now-(n.start??0))/550));
   const displacement=n.isNew?(this.exploded?1:Math.pow(1-t,3)):0;
   const approach=n.approach??n.p.approach??[0,-85,0];
   n.wrapper.position.copy(n.position);n.wrapper.scale.setScalar(n.scale);n.wrapper.quaternion.copy(n.quaternion);
   if(n.fold){const remaining=this.pieceCount<=n.fold.index?1:1-motionProgress(this.moveStarts[n.fold.index],now);this.applyFoldPose(n,remaining);}
   n.wrapper.position.addScaledVector(new THREE.Vector3(...approach),displacement);
   if(n.isNew&&this.motion)n.wrapper.position.add(new THREE.Vector3(...stagedOffset(this.motion,n.p.id,this.pieceCount,this.moveStarts,now)));
   if(n.isMoving){
    const remaining=this.pieceCount<=n.unit?1:1-motionProgress(n.start,now);
    this.applyMovingPose(n,remaining);
   }
   if(n.transition){
    const c=n.transition,t=Math.min(1,(now-c.start)/1400),ease=t*t*(3-2*t);
    if(c.mount){
     const m=c.mount,rotation=new THREE.Quaternion().slerpQuaternions(m.fromRotation,m.toRotation,ease),scale=THREE.MathUtils.lerp(m.fromScale,n.scale,ease);
     n.wrapper.position.copy(c.localPosition).multiplyScalar(scale).applyQuaternion(rotation).add(new THREE.Vector3().lerpVectors(m.fromPosition,m.toPosition,ease));
     n.wrapper.quaternion.copy(rotation).multiply(c.localRotation);n.wrapper.scale.setScalar(scale);
    }else{n.wrapper.position.lerpVectors(c.position,n.position,ease);n.wrapper.scale.lerpVectors(c.scale,new THREE.Vector3(n.scale,n.scale,n.scale),ease);n.wrapper.quaternion.slerpQuaternions(c.quaternion,n.quaternion,ease);}
    if(t===1)n.transition=null;
   }

   n.arrow.visible=this.exploded&&n.isNew&&included;
   if(n.arrow.visible){n.arrow.setDirection(new THREE.Vector3(...approach).normalize().negate());n.arrow.position.copy(n.wrapper.position).add(new THREE.Vector3(...approach).normalize().multiplyScalar(48));}
  }
 }
 setPieceCount(count){
  const previous=this.pieceCount;this.pieceCount=Math.max(0,Math.min(count,this.unitCount));
  const now=performance.now();
  this.moveStarts=Array.from({length:this.unitCount},(_,unit)=>unit>=previous&&unit<this.pieceCount?now:now-550);
  for(const n of this.nodes)n.start=n.isNew||n.isMoving?this.moveStarts[n.unit]:now-550;
  this.tick();
 }
 setExploded(value){this.exploded=value;this.tick();}
 replay(animate=true){const now=performance.now();this.moveStarts=Array.from({length:this.unitCount},(_,unit)=>animate?now+unit*650:now-550);for(const n of this.nodes)n.start=n.isNew||n.isMoving?this.moveStarts[n.unit]:now-550;this.tick();}
 dispose(){this.serial++;this.renderer.setAnimationLoop(null);this.observer.disconnect();this.controls.dispose();this.disposeHighlights();this.renderer.dispose();}
}
