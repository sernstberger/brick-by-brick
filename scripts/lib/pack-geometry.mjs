// Pack a part's complete local LDraw dependency tree; source license headers stay intact.
import {access,mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

export async function packGeometry(project,{root='public/ldraw',output='public/models/parts',overwrite=false,onPacked}={}){
 const normalize=name=>{
  const normalized=name.replaceAll('\\','/').toLowerCase();
  if(normalized.includes('..')||normalized.startsWith('/')||normalized.includes(':'))throw Error('Unsafe geometry dependency');
  return normalized;
 };
 async function readPart(name){
  for(const folder of ['parts','p',''])try{return await readFile(path.join(root,folder,name),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
  return null;
 }
 const reports=[];
 for(const sourceName of new Set(project.steps.flatMap(s=>s.parts.map(p=>p.part)))){
  const name=normalize(sourceName),file=path.join(output,`${name}.mpd`);
  const exists=await access(file).then(()=>true,()=>false);
  if(exists&&!overwrite)continue;
  const source=await readPart(name);
  // Authored variants (for example the compressed shock) already have an MPD,
  // but intentionally do not replace a source part in the local LDraw library.
  if(source===null){if(exists)continue;throw Error(`Missing LDraw dependency: ${name}`);}
  const files=new Map();
  async function visit(input,provided){
   const n=normalize(input);if(files.has(n))return;
   const text=provided??await readPart(n);if(text===null)throw Error(`Missing LDraw dependency: ${n}`);
   const normalized=text.split(/\r?\n/).map(line=>{
    if(!/^1\s/.test(line))return line;
    const tokens=line.trim().split(/\s+/);return tokens.slice(0,14).join(' ')+' '+normalize(tokens.slice(14).join(' '));
   }).join('\n');
   files.set(n,normalized);
   for(const line of normalized.split('\n'))if(/^1\s/.test(line))await visit(line.trim().split(/\s+/).slice(14).join(' '));
  }
  await visit(name,source);await mkdir(path.dirname(file),{recursive:true});
  await writeFile(file,[...files].map(([n,text])=>`0 FILE ${n}\n${text}`).join('\n'));
  const report={name,files:files.size};reports.push(report);onPacked?.(report);
 }
 return reports;
}
export function packMissingGeometry(project,options={}){return packGeometry(project,{...options,overwrite:false});}
