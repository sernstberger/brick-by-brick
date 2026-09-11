import test from 'node:test';
import assert from 'node:assert/strict';
import {IDENTITY,partsThrough,toLDraw} from '../src/project.js';
const sticker={kind:'image',number:9,url:'/stickers/score-9.png',width:64,height:36,fromStep:3};
const project={version:1,name:'Decal timing',steps:[
 {page:1,title:'Tile',assembly:'sign',parts:[{id:'tile',part:'6179.dat',color:0,position:[0,0,0],rotation:IDENTITY,sticker}]},
 {page:2,title:'Early snapshot',parts:[],instances:[{id:'early',assembly:'sign',throughStep:0,position:[0,0,0],rotation:IDENTITY}]},
 {page:3,title:'Apply sticker',assembly:'sign',parts:[]},
 {page:4,title:'Finished snapshot',parts:[],instances:[{id:'late',assembly:'sign',throughStep:2,position:[100,0,0],rotation:IDENTITY}]},
]};
test('a sticker-only step changes decoration without adding another physical tile',()=>{
 assert.equal(partsThrough(project,0).length,1);
 assert.equal(partsThrough(project,0)[0].sticker,undefined);
 assert.equal(partsThrough(project,2).length,1);
 assert.deepEqual(partsThrough(project,2)[0].sticker,sticker);
 assert.equal(project.steps[0].parts[0].sticker,sticker);
});
test('rigid instances retain sticker state from their source snapshot',()=>{
 const mounted=partsThrough(project,3);
 assert.equal(mounted.length,2);
 assert.equal(mounted[0].sticker,undefined);
 assert.deepEqual(mounted[1].sticker,sticker);
});
test('legacy serial stickers remain visible immediately and decals add no LDraw geometry',()=>{
 const serial=structuredClone(project);serial.steps[0].parts[0].sticker={number:13,prefix:'S/N',text:'0000 0001'};
 assert.equal(partsThrough(serial,0)[0].sticker.number,13);
 const text=toLDraw(project);
 assert.doesNotMatch(text,/score-9|\.png/);
 assert.equal(text.split('\n').filter(l=>l.startsWith('1 ')&&l.endsWith('6179.dat')).length,2); // current source plus early snapshot
});
