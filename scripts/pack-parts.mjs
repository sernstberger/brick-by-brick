// Bundle referenced geometry and keep the renderer's material/license assets current.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {packGeometry} from './lib/pack-geometry.mjs';
const root=path.resolve('public/ldraw');
const project=JSON.parse(await readFile(process.argv[2]??'public/sets/pinball.json','utf8'));
await mkdir('public/models/parts',{recursive:true});
await packGeometry(project,{root,overwrite:true,onPacked:({name,files})=>console.log(`${name}: ${files} files packed`)});
await writeFile('public/models/LDConfig.ldr',await readFile(path.join(root,'LDConfig.ldr')));
for(const file of ['CAreadme.txt','CAlicense4.txt','CAlicense.txt'])await writeFile('public/models/'+file,await readFile(path.join(root,file)));
