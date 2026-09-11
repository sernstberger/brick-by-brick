import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProject,partsThrough,toLDraw} from '../src/project.js';
const p=JSON.parse(readFileSync(new URL('./fixtures/first-page.json',import.meta.url)));
test('first page quantities and colors match the fixture',()=>{
 validateProject(p);
 assert.deepEqual(p.steps.map(s=>s.parts.length),[2,4,1,4]);
 assert.equal(partsThrough(p,3).length,11);
 assert.deepEqual(p.steps[0].parts.map(p=>[p.part,p.color]),[['2445.dat',4],['3003.dat',71]]);
 assert.equal(toLDraw(p).split('\n').filter(s=>s==='0 STEP').length,4);
});
const transform=(p,[x,y,z])=>p.position.map((t,i)=>t+p.rotation[i*3]*x+p.rotation[i*3+1]*y+p.rotation[i*3+2]*z);
test('both Technic corners meet end studs and extend outward symmetrically',()=>{
 const corners=p.steps[1].parts.filter(p=>p.part==='32555.dat');
 // Physical stud centers read from the LDraw corner's two four-stud runs.
 const local=[[-40,0,-40],[-40,0,-20],[-40,0,0],[-40,0,20],[-20,0,40],[0,0,40],[20,0,40],[40,0,40]];
 const expected=[[-110,-24,-10],[-110,-24,10],[-110,-24,30],[-110,-24,50],[-130,-24,70],[-150,-24,70],[-170,-24,70],[-190,-24,70]];
 assert.deepEqual(corners[0]&&local.map(v=>transform(corners[0],v)).sort(),expected.sort());
 assert.deepEqual(local.map(v=>transform(corners[1],v)).sort(),expected.map(([x,y,z])=>[-x,y,z]).sort());
});
test('curved plate studs align with the corner studs above and below',()=>{
 const plates=p.steps[3].parts;
 const studs=[[0,0,40],[20,0,40],[40,0,0],[40,0,20]];
 for(const plate of plates){const mapped=studs.map(v=>transform(plate,v));
 const side=plate.position[0]<0?-1:1;
 assert.deepEqual(mapped.map(([x,,z])=>[x,z]).sort(),[[side*110,30],[side*110,50],[side*130,70],[side*150,70]].sort());
 assert.ok(plate.position[1]===-32||plate.position[1]===0);
 }
});
test('reject malformed imported transformations and duplicate instances',()=>{
 const bad=structuredClone(p);bad.steps[0].parts[0].rotation[0]=2;assert.throws(()=>validateProject(bad),/orthonormal/);
 const duplicate=structuredClone(p);duplicate.steps[0].parts.push(duplicate.steps[0].parts[0]);assert.throws(()=>validateProject(duplicate),/unique/);
});
const current=JSON.parse(readFileSync(new URL('../public/sets/pinball.json',import.meta.url)));
const full={...current,steps:current.steps.slice(0,177)};
test('page 11 preserves page 10 and adds the expected parts',()=>{
 validateProject(full);assert.deepEqual(full.steps.slice(0,4).map(({assembly,...s})=>s),p.steps);
 assert.deepEqual(full.steps.slice(4,8).map(s=>s.parts.length),[3,2,1,2]);
 assert.equal(partsThrough(full,7).length,19);
});
test('crossbeam end holes align with both pin axes',()=>{
 const beam=full.steps[6].parts[0],pins=full.steps[5].parts;
 assert.deepEqual([-140,140].map(z=>transform(beam,[0,0,z])),pins.map(p=>[p.position[0],p.position[1],90]));
 for(const pin of pins){assert.deepEqual(transform(pin,[10,0,0]),[pin.position[0],-14,90]);assert.deepEqual(transform(pin,[-10,0,0]),[pin.position[0],-14,70]);}
});
test('step 8 plates use the exposed outer studs with two studs overhanging',()=>{
 for(const plate of full.steps[7].parts){
  const side=Math.sign(plate.position[0]);
  const studs=[-30,-10,10,30].map(x=>transform(plate,[x,0,0]));
  assert.deepEqual(studs.map(([x])=>Math.abs(x)).sort((a,b)=>a-b),[170,190,210,230]);
  assert.ok(studs.every(([x,y,z])=>Math.sign(x)===side&&y===-32&&z===70));
  // Black arm ends at x=±200; only centers 170 and 190 are supported.
  assert.equal(studs.filter(([x])=>Math.abs(x)<200).length,2);
  assert.equal(plate.position[1]+8,-24,'bottom mates with the black arm top');
 }
});
test('step 9 starts an independent assembly, without losing the frame',()=>{
 assert.equal(partsThrough(full,8).length,2);assert.equal(partsThrough(full,12).length,11);assert.equal(partsThrough(full,7).length,19);
 assert.deepEqual(full.steps.slice(8,13).map(s=>s.parts.length),[2,1,3,2,3]);
 const exportText=toLDraw(full);assert.match(exportText,/0 FILE assembly-0.ldr/);assert.match(exportText,/0 FILE assembly-1.ldr/);
 assert.equal(exportText.split('\n').filter(l=>l.startsWith('1 ')&&l.endsWith('.dat')).length,505);
});
test('white plates overlap on one stud column; wedge stays outside the upper plate',()=>{
 const [lower,upper]=full.steps[8].parts;
 const local=[[-20,0,-10],[0,0,-10],[20,0,-10],[-20,0,10],[0,0,10],[20,0,10]];
 const lowerStuds=local.map(v=>transform(lower,v));const upperStuds=local.map(v=>transform(upper,v));
 assert.equal(lowerStuds.filter(([x,,z])=>upperStuds.some(([a,,b])=>a===x&&b===z)).length,3);
 const wedge=full.steps[9].parts[0];assert.deepEqual([-20,0,20].map(z=>transform(wedge,[10,0,z])).sort(),[[20,-8,-20],[20,-8,0],[20,-8,20]].sort());
});
test('both mechanism mounts mate with the cap and black arm simultaneously',()=>{
 for(const [index,side,railStep,coverStep] of [[15,-1,10,14],[23,1,18,22]]){
  const instance=full.steps[index].instances[0];
  const rail=full.steps[railStep].parts[2],rounded=full.steps[coverStep].parts[1];
  const cap=full.steps[7].parts.find(p=>Math.sign(p.position[0])===side);
  const map=(part,point)=>transform(instance,transform(part,point));
  assert.deepEqual([-10,10].map(x=>map(rounded,[x,0,0])).sort(),[side*10,side*30].map(x=>transform(cap,[x,8,0])).sort());
  assert.deepEqual([-side*10,-side*30].map(x=>map(rail,[x,0,0])).sort(),[[side*170,0,70],[side*190,0,70]].sort(),'red rail meets the underside of the black arm');
  assert.deepEqual(instance.position,[side*210,32,90]);
  assert.ok(instance.approach[1]>0);
  const joined=partsThrough(full,index),loose=partsThrough(full,instance.throughStep,instance.assembly);
  assert.equal(loose.length,22);assert.equal(joined.length,index===15?41:63);
  for(const member of joined.filter(p=>p.assemblyInstance===instance.id)){
   const original=loose.find(p=>member.id.endsWith('/'+p.id));assert.deepEqual(member.position,transform(instance,original.position));
  }
 }
});
test('reject subassembly references into the future',()=>{
 const bad=structuredClone(full);bad.steps[15].instances[0].throughStep=15;
 assert.throws(()=>partsThrough(bad,15),/earlier completed step/);
});
test('page 14 uses the opposite wedge and keeps both earlier builds intact',()=>{
 assert.deepEqual(full.steps.slice(16,21).map(s=>s.parts.length),[2,1,3,2,3]);
 assert.equal(partsThrough(full,20).length,11);
 assert.equal(partsThrough(full,20,'frame').length,41);
 const wedge=full.steps[17].parts[0];
 assert.equal(wedge.part,'43723.dat');
 assert.deepEqual([-20,0,20].map(z=>transform(wedge,[-10,0,z])).sort(),[[-20,-8,-20],[-20,-8,0],[-20,-8,20]].sort());
 // Mirrored tall brick points its side studs away from the hinge rail.
 const brick=full.steps[20].parts[2];
 assert.ok(transform(brick,[0,0,-10])[0]>brick.position[0]);
 for(const i of [18,20]){
  const s=full.steps[i];assert.deepEqual(s.motion.actions.map(a=>a.type),['add','add','add','place']);
  assert.deepEqual(s.motion.actions.at(-1).parts,s.parts.map(p=>p.id));
 }
 assert.equal(toLDraw(full).split('\n').filter(l=>l==='0 STEP').length,177);
});
test('page 15 mirrors the axle path and mounts a second completed snapshot',()=>{
 assert.deepEqual(full.steps.slice(21,24).map(s=>s.parts.length),[8,3,0]);
 const axle=full.steps[21],actions=axle.motion.actions;
 const ordered=actions.filter(a=>a.type==='add').map(a=>axle.parts.find(p=>p.id===a.part));
 assert.deepEqual(ordered.slice(0,4).map(p=>p.position[0]),[40,10,20,0]);
 for(const action of actions.slice(1,6))assert.deepEqual(action.approach,[-110,0,0]);
 for(const joiner of axle.parts.filter(p=>p.part==='45590.dat')){
  assert.equal(transform(joiner,[0,0,0])[2],20);
  assert.equal(transform(joiner,[20,0,0])[2],40,'second joiner hole stays on the forward red axle');
 }

 assert.equal(partsThrough(full,22).length,22);assert.equal(partsThrough(full,23).length,63);
 assert.equal(partsThrough(full,15).length,41,'earlier joined frame remains unchanged');
 for(const i of [14,22])assert.equal(full.steps[i].parts[2].part,'32028.dat');
});
test('underside supports meet both heights of the stepped white bases',()=>{
 const s=full.steps[25];assert.deepEqual(full.steps.slice(24,27).map(s=>s.parts.length),[6,8,4]);
 for(let i=0;i<6;i+=3){const [bottom,brick,top]=s.parts.slice(i,i+3);
  assert.equal(bottom.position[1],brick.position[1]+24);
  assert.equal(brick.position[1],top.position[1]+8);
  assert.equal(top.position[1],8,'top studs meet lower red plate sockets');
 }
 for(const plate of s.parts.slice(6)){
  const side=Math.sign(plate.position[0]);
  assert.deepEqual([-10,10].map(x=>transform(plate,[x,0,0])).sort(),[[side*230,32,70],[side*230,32,90]].sort());
  assert.deepEqual([-10,10].map(x=>transform(plate,[x,8,20])).sort(),[[side*210,40,70],[side*210,40,90]].sort());
  assert.equal(plate.position[1]+16,48,'stepped plates and tan feet share the same bottom plane');
  assert.ok(Math.abs(transform(plate,[0,6,-10])[0])>Math.abs(plate.position[0]),'side studs face outward');
 }
 assert.equal(partsThrough(full,26).length,81);
 assert.equal(new Set(partsThrough(full,26).map(p=>p.id)).size,81);
});
test('step 25 blue plates sit on the red caps and align with the whole upper surface',()=>{
 const frame=partsThrough(full,23);
 for(const side of [-1,1]){
  const added=full.steps[24].parts.filter(p=>Math.sign(p.position[0])===side);
  const round=added.find(p=>p.color===72),blue=added.find(p=>p.color===1);
  const sockets=[-10,10].map(x=>transform(round,[x,8,0]));
  for(const socket of sockets)assert.ok(frame.some(p=>p.position.every((v,i)=>v===socket[i])));
  const cap=full.steps[7].parts.find(p=>Math.sign(p.position[0])===side);
  assert.deepEqual([-10,10].map(x=>transform(blue,[x,8,0])).sort(),[side*10,side*30].map(x=>transform(cap,[x,0,0])).sort());
  const cover=frame.find(p=>p.part==='73562.dat'&&p.position[1]===-40&&Math.sign(p.position[0])===side);
  for(const part of added)assert.equal(part.position[1],cover.position[1]);
 }
});
test('step 27 preserves the three exposed triangle studs',()=>{
 for(const side of [-1,1]){
  const tile=full.steps[26].parts.find(p=>p.part==='99563.dat'&&Math.sign(p.position[0])===side);
  const slope=full.steps[26].parts.find(p=>p.part==='11477.dat'&&Math.sign(p.position[0])===side);
  // The tile takes the two middle-column studs. The complete outer column
  // (|X|=190, Z=70/90/110) stays uncovered, matching the enlarged step 27 panel.
  assert.deepEqual([-10,10].map(x=>transform(tile,[x,8,0])).sort(),[[side*170,-40,70],[side*170,-40,90]].sort());
  assert.deepEqual([slope.part,slope.color],['11477.dat',72]);
  assert.deepEqual(slope.position,[side*140,-32,70]);
  assert.deepEqual(transform(slope,[0,-8,10]),[side*150,-40,70],'raised underside socket seats on the triangle’s innermost stud');
  assert.equal(tile.part,'99563.dat');assert.equal(tile.color,0);
  assert.ok(Math.abs(transform(slope,[0,0,20])[0])>Math.abs(transform(slope,[0,0,-20])[0]),'high edge faces outward and the curved nose points inward');
 }
});
