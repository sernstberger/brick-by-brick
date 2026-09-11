import test from 'node:test';
import assert from 'node:assert/strict';
import {IDENTITY,partsThrough,toLDraw,validateProject} from '../src/project.js';
const axle={id:'axle',part:'32062.dat',color:4,position:[30,0,0],rotation:IDENTITY};
const project={version:1,name:'Snapshot test',steps:[
 {page:1,title:'Partial axle',assembly:'fork',parts:[axle]},
 {page:2,title:'Snapshot mount',assembly:'frame',parts:[],instances:[{id:'fork-before',assembly:'fork',throughStep:0,position:[100,0,0],rotation:IDENTITY}]},
 {page:3,title:'Push axle',assembly:'fork',parts:[],partUpdates:[{id:'axle',position:[0,0,0]}]},
 {page:4,title:'Final mount',assembly:'frame',parts:[],instances:[{id:'fork-after',assembly:'fork',throughStep:2,position:[200,0,0],rotation:IDENTITY}]},
]};
test('updates preserve earlier part and instance snapshots without duplicate parts',()=>{
 validateProject(project);
 assert.deepEqual(partsThrough(project,0)[0].position,[30,0,0]);
 assert.deepEqual(partsThrough(project,2)[0].position,[0,0,0]);
 assert.equal(partsThrough(project,2).length,1);
 assert.deepEqual(partsThrough(project,3).map(p=>p.position),[[130,0,0],[200,0,0]]);
 assert.deepEqual(axle.position,[30,0,0]);
 assert.deepEqual(partsThrough(project,2)[0].previousPosition,[30,0,0]);
});
test('MPD instance files honor throughStep even after the source axle moves',()=>{
 const text=toLDraw(project);
 const sections=Object.fromEntries(text.split('0 FILE ').slice(1).map(s=>{const i=s.indexOf('\n');return [s.slice(0,i),s.slice(i+1)];}));
 assert.match(sections['assembly-0-through-1.ldr'],/1 4 30 0 0 .*32062.dat/);
 assert.match(sections['assembly-0.ldr'],/1 4 0 0 0 .*32062.dat/);
 assert.match(sections['assembly-1.ldr'],/100 0 0 .*assembly-0-through-1.ldr/);
 assert.match(sections['assembly-1.ldr'],/200 0 0 .*assembly-0.ldr/);
 assert.equal(sections['assembly-0.ldr'].split('\n').filter(l=>l.startsWith('1 ')).length,1);
});
test('unknown, malformed, and same-step pose updates are rejected',()=>{
 for(const update of [{id:'missing',position:[0,0,0]},{id:'axle',position:[NaN,0,0]},{id:'axle',position:[0,0,0],rotation:Array(9).fill(0)}]){
  const p=structuredClone(project);p.steps[2].partUpdates=[update];assert.throws(()=>validateProject(p));
 }
 const p=structuredClone(project);p.steps[0].partUpdates=[{id:'axle',position:[0,0,0]}];assert.throws(()=>validateProject(p));
});
