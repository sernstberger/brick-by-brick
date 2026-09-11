import * as THREE from 'three';

// Decal coordinates are local to the receiving LDraw part. Images and serial
// labels are viewer decoration; the LDraw exporter retains the physical part.
export async function createSticker(spec){
 if(!spec.kind||spec.kind==='serial')return serialSticker(spec);
 if(spec.kind!=='image')throw Error(`Unknown sticker kind: ${spec.kind}`);
 const texture=await new THREE.TextureLoader().loadAsync(spec.url);
 texture.colorSpace=THREE.SRGBColorSpace;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(spec.width,spec.height),new THREE.MeshBasicMaterial({map:texture,transparent:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
 mesh.position.fromArray(spec.position??[0,-0.05,0]);
 mesh.rotation.fromArray([...(spec.euler??[Math.PI/2,0,0]),'XYZ']);
 mesh.name=`Sticker ${spec.number??''}`.trim();
 return mesh;
}

// Serial-number label decal. The sticker moves with its tile.
export function serialSticker({prefix,text}){
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=128;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#181a20';ctx.fillRect(0,0,640,128);
 ctx.strokeStyle='#8a8b90';ctx.lineWidth=5;ctx.strokeRect(4,4,632,120);
 ctx.fillStyle='#e7e7e5';ctx.fillRect(158,16,463,96);
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 43px monospace';
 ctx.fillStyle='#8588a8';ctx.fillText(prefix,81,67);
 ctx.fillStyle='#181a20';ctx.fillText(text,390,67);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(76,16),new THREE.MeshBasicMaterial({map:texture,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
 mesh.rotation.x=Math.PI/2;mesh.position.y=-0.05;
 mesh.name='Sticker 13';
 return mesh;
}
