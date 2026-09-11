import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {packGeometry} from '../scripts/lib/pack-geometry.mjs';
const project=part=>({steps:[{parts:[{part}]}]});
test('shared packer retains licenses and recursively normalizes LDraw dependencies',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'brick-pack-')),root=path.join(dir,'ldraw'),output=path.join(dir,'packed');
 try{
  await mkdir(path.join(root,'parts/s'),{recursive:true});await mkdir(path.join(root,'p'),{recursive:true});
  await writeFile(path.join(root,'parts/base.dat'),'0 !LICENSE CC BY 4.0\n1 16 0 0 0 1 0 0 0 1 0 0 0 1 S\\Child.DAT\n');
  await writeFile(path.join(root,'parts/s/child.dat'),'0 !LICENSE CC BY 4.0\n1 16 0 0 0 1 0 0 0 1 0 0 0 1 stud.dat\n');
  await writeFile(path.join(root,'p/stud.dat'),'0 !LICENSE CC BY 4.0\n');
  assert.deepEqual(await packGeometry(project('base.dat'),{root,output}),[{name:'base.dat',files:3}]);
  const text=await readFile(path.join(output,'base.dat.mpd'),'utf8');assert.match(text,/0 FILE s\/child.dat/);assert.equal(text.match(/!LICENSE/g).length,3);
  await writeFile(path.join(output,'custom.dat.mpd'),'authored compressed geometry');
  await packGeometry(project('custom.dat'),{root,output,overwrite:true});assert.equal(await readFile(path.join(output,'custom.dat.mpd'),'utf8'),'authored compressed geometry');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('packer rejects unsafe references and missing dependency trees',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'brick-pack-'));
 try{await assert.rejects(packGeometry(project('../unsafe.dat'),{root:dir,output:dir}),/Unsafe/);await assert.rejects(packGeometry(project('missing.dat'),{root:dir,output:dir}),/Missing LDraw/);}finally{await rm(dir,{recursive:true,force:true});}
});
