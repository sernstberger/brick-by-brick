import test from 'node:test';
import assert from 'node:assert/strict';
import {IDENTITY,partsThrough,instancesThrough,toLDraw,validateProject} from '../src/project.js';

const part=(id,position)=>({id,part:'3023.dat',color:4,position,rotation:IDENTITY});
const project={version:1,name:'Slide and pin',steps:[
 {page:1,title:'Loose mechanism',assembly:'mechanism',parts:[part('pin',[30,0,0]),part('body',[0,40,0])]},
 {page:2,title:'Mount',assembly:'frame',parts:[part('base',[-50,0,0])],instances:[{id:'installed',assembly:'mechanism',throughStep:0,position:[100,0,0],rotation:IDENTITY}]},
 {page:3,title:'Slide',assembly:'frame',parts:[],instanceUpdates:[{id:'installed',position:[108,0,0]}]},
 {page:4,title:'Push pin',assembly:'frame',parts:[],partUpdates:[{id:'installed/pin',position:[118,0,0]}]},
]};

test('installed assemblies slide as one group without changing earlier or source snapshots',()=>{
 validateProject(project);
 const before=partsThrough(project,1),after=partsThrough(project,2);
 assert.equal(after.length,3);assert.deepEqual(after[0].position,before[0].position);
 for(let i=1;i<3;i++){
  assert.deepEqual(after[i].position.map((v,j)=>v-before[i].position[j]),[8,0,0]);
  assert.equal(after[i].updatedInstance,'installed');assert.equal(after[i].updatedStep,2);
  assert.deepEqual(after[i].previousPosition,before[i].position);
 }
 assert.deepEqual(partsThrough(project,1).map(p=>p.position),[[-50,0,0],[130,0,0],[100,40,0]]);
 assert.deepEqual(partsThrough(project,3,'mechanism').map(p=>p.position),[[30,0,0],[0,40,0]]);
 assert.deepEqual(instancesThrough(project,2)[0].position,[108,0,0]);
});

test('a qualified pin update changes only that installed child',()=>{
 const final=partsThrough(project,3);
 assert.deepEqual(final.map(p=>p.position),[[-50,0,0],[118,0,0],[108,40,0]]);
 assert.deepEqual(final[1].previousPosition,[138,0,0]);
 assert.equal(final[1].updatedInstance,undefined);
 assert.deepEqual(partsThrough(project,2)[1].position,[138,0,0]);
 assert.deepEqual(project.steps[0].parts[0].position,[30,0,0]);
});

test('export preserves moved group references and isolates child overrides from the source',()=>{
 const sections=p=>Object.fromEntries(toLDraw(p).split('0 FILE ').slice(1).map(s=>{const i=s.indexOf('\n');return [s.slice(0,i),s.slice(i+1)];}));
 const slid=sections({...project,steps:project.steps.slice(0,3)});
 assert.match(slid['assembly-1.ldr'],/1 16 108 0 0 .*assembly-0.ldr/);
 assert.equal(slid['assembly-1.ldr'].split('\n').filter(l=>l.startsWith('1 ')).length,2);
 const final=sections(project);
 assert.match(final['assembly-0.ldr'],/1 4 30 0 0 .*3023.dat/);
 assert.match(final['assembly-1.ldr'],/1 4 118 0 0 .*3023.dat/);
 assert.match(final['assembly-1.ldr'],/1 4 108 40 0 .*3023.dat/);
 assert.equal(final['assembly-1.ldr'].split('\n').filter(l=>l.startsWith('1 ')).length,3);
 assert.doesNotMatch(final['assembly-1.ldr'],/assembly-0.ldr/);
});

test('unknown, same-step, malformed and rotational group updates are rejected',()=>{
 for(const update of [{id:'missing',position:[0,0,0]},{id:'installed',position:[NaN,0,0]},{id:'installed',position:[0,0,0],rotation:IDENTITY}]){
  const p=structuredClone(project);p.steps[2].instanceUpdates=[update];assert.throws(()=>validateProject(p));
 }
 const p=structuredClone(project);p.steps[1].instanceUpdates=p.steps[2].instanceUpdates;assert.throws(()=>validateProject(p));
 const wrong=structuredClone(project);wrong.steps[3].partUpdates[0].id='mechanism/pin';assert.throws(()=>validateProject(wrong));
});
