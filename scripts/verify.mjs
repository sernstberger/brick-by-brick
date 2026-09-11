// Reviewed local verification only; accepts no arbitrary command or config path.
import {readdir,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('..',import.meta.url));
const [kind,...args]=process.argv.slice(2);
if(!['unit','browser','build','live','all'].includes(kind))throw Error('Choose unit, browser, build, live, or all.');
if(args.length&&!(kind==='browser'&&args.length===2&&args[0]==='--grep'))throw Error('Only browser --grep PATTERN is supported.');
const env={...process.env};
for(const task of kind==='all'?['unit','build','browser','live']:[kind]){
 if(task==='live'){
  const localProject=JSON.parse(await readFile(new URL('../public/sets/pinball.json',import.meta.url),'utf8'));
  const response=await fetch('http://127.0.0.1:5174/sets/pinball.json');
  if(!response.ok||JSON.stringify(await response.json())!==JSON.stringify(localProject))throw Error('Port 5174 does not serve the current project.');
  console.log(`Port 5174 serves the current ${localProject.steps.length}-step project.`);
  continue;
 }
 const command=task==='unit'?['--test',...(await readdir(new URL('../tests/',import.meta.url))).filter(name=>name.endsWith('.test.js')).sort().map(name=>`tests/${name}`)]:
  task==='build'?['node_modules/vite/bin/vite.js','build']:['node_modules/@playwright/test/cli.js','test',...args];
 const result=spawnSync(process.execPath,command,{cwd,env,stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status??1);
}
