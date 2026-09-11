import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stagedOffset} from '../src/motion.js';
const p=JSON.parse(readFileSync(new URL('../public/sets/pinball.json',import.meta.url)));
test('step 14 follows inset order and threads parts along the axle axis',()=>{
 const step=p.steps[13],motion=step.motion;
 const actions=motion.actions.filter(a=>a.type==='add');
 const ordered=actions.map(a=>step.parts.find(p=>p.id===a.part));
 assert.deepEqual(ordered.map(p=>p.part),['73230.dat','3705.dat','45590.dat','45590.dat','32062.dat','73230.dat','24866.dat','24866.dat']);
 assert.equal(ordered[0].position[0],-40);
 assert.deepEqual(ordered.slice(2,4).map(p=>p.position[0]),[-20,0]);
 for(const i of [1,2,3,4,5])assert.deepEqual(actions[i].approach,[110,0,0]);
 // Both axles slide in X, keeping Y/Z aligned with their respective holes.
 assert.deepEqual(ordered[1].position.slice(1),[-46,20]);
 assert.deepEqual(ordered[4].position.slice(1),[-46,40]);
 assert.deepEqual(motion.actions.at(-1).parts.sort(),step.parts.map(p=>p.id).sort());
});
test('inset parts remain clear of the base, then seat together as a rigid unit',()=>{
 for(const step of [p.steps[13],p.steps[14]]){
  const motion=step.motion,last=motion.actions.length-1,starts=motion.actions.map((_,i)=>i*650);
  for(const part of step.parts)assert.deepEqual(stagedOffset(motion,part.id,last,starts,10000),[0,-110,0]);
  for(const elapsed of [0,100,275,550]){
   const offsets=step.parts.map(part=>stagedOffset(motion,part.id,last+1,starts,starts[last]+elapsed));
   for(const offset of offsets)assert.deepEqual(offset,offsets[0]);
   if(elapsed===550)assert.ok(offsets[0].every(v=>v===0));
  }
 }
 assert.deepEqual(p.steps[14].motion.actions[2].approach,[0,65,0],'door-rail plate enters the bracket from underneath');
});
