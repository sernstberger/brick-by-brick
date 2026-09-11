import {readdir,readFile,writeFile} from 'node:fs/promises';
const root=new URL('../public/ldraw/',import.meta.url);
const entries=[];
for (const filename of await readdir(new URL('parts/',root))) {
  if(!filename.endsWith('.dat')) continue;
  const text=await readFile(new URL('parts/'+filename,root),'utf8');
  const name=text.split(/\r?\n/)[0].replace(/^0\s+/,'').trim();
  if(name.startsWith('~')||name.startsWith('=')) continue;
  entries.push({id:filename,name});
}
entries.sort((a,b)=>a.name.localeCompare(b.name));
await writeFile(new URL('catalog.json',root),JSON.stringify(entries));
console.log(`Indexed ${entries.length} LDraw parts.`);
