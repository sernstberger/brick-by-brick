import {toLDraw} from './project.js';

// Nonstandard part shapes travel with the MPD instead of depending on a local library.
export async function exportLDraw(project){
 const referenced=new Set(project.steps.flatMap(step=>step.parts.map(part=>part.part)));
 const bundles=await Promise.all([...new Set(project.customParts??[])].filter(name=>referenced.has(name)).map(async name=>{
  if(!/^[-a-z0-9_]+\.dat$/i.test(name))throw Error('Invalid custom export part.');
  const response=await fetch(`models/parts/${name}.mpd`);
  if(!response.ok)throw Error(`Could not export geometry for ${name}.`);
  return response.text();
 }));
 const seen=new Set(),sections=[];
 for(const bundle of bundles)for(const section of bundle.split(/^0 FILE /m).slice(1)){
  const name=section.slice(0,section.indexOf('\n')).trim().toLowerCase();
  if(!seen.has(name)){seen.add(name);sections.push(`0 FILE ${section}`);}
 }
 return [toLDraw(project),...sections].join('\n');
}
