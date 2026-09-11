import {exportLDraw} from './export.js';
import './style.css';
import {stepIndexFromSearch} from './navigation.js';
import {AssemblyViewer} from './viewer.js';
import {COLORS,validateProject,partsThrough,instancesThrough} from './project.js';
const app=document.querySelector('#app');
app.innerHTML=`
<header><a class="brand" href="./" aria-label="Brick by brick home"><span class="brand-icon">▦</span>brick<span class="brand-light">by</span>brick<span class="brand-dot">.</span></a><span class="header-label">THE ASSEMBLY STUDIO</span><button id="export" class="quiet">↓ Export model</button></header>
<main><aside class="sidebar"><div class="bag-indicator" role="status" hidden><strong id="bag-label"></strong><span id="bag-status"></span></div><div class="eyebrow">YOUR BUILD</div><h1 id="project-name"></h1><div class="set-meta" id="project-meta"></div><div class="section-label">PAGE <select id="page-select" aria-label="Instruction page"></select></div><nav id="steps" aria-label="Steps on page 10"></nav><div class="sidebar-note"><span class="dot"></span><div><span id="coverage-label"></span><p><span id="coverage-count"></span><br>Authored step by step.</p></div></div><a class="credit" href="https://library.ldraw.org/" target="_blank" rel="noreferrer">Part geometry by LDraw ↗</a></aside>
<section class="workspace"><div class="workspace-content"><div class="view-tabs"><button class="selected" id="three-tab">◈ 3D assembly</button><span id="piece-count"></span></div><div class="stage"><div id="viewer"></div><div class="stage-top"><span id="step-badge"></span><span class="live-label"><i></i> ROTATABLE 3D</span></div><div id="loading" role="status">Loading brick geometry…</div><div class="camera-controls"><button id="iso" title="Reset camera">↺ <span>Reset view</span></button><button id="top" title="View from above">⊤ <span>Top</span></button><button id="front" title="View from front">⊞ <span>Front</span></button></div><div class="stage-help">← → Pieces <span>·</span> Shift + ← → Steps <span>·</span> Drag to rotate <span>·</span> Scroll to zoom <span>·</span> Right-drag to pan</div></div><div class="options"><label><input id="highlight" type="checkbox" checked> Highlight new pieces <i class="yellow"></i></label><label><input id="explode" type="checkbox"> Separate new pieces</label><button id="replay" class="quiet">↻ Replay placement</button></div><div class="instruction"><span id="large-number"></span><div><h3 id="instruction-title"></h3><p id="description"></p></div></div><div class="parts-heading">PIECES FOR THIS STEP <span id="new-count"></span></div><div id="parts"></div></div><footer class="navigation"><button id="previous">← Previous step</button><div id="progress" aria-label="Page progress"></div><button id="next" class="primary">Next step →</button></footer></section>
</main><div id="toast" role="status"></div>`;
const $=s=>document.querySelector(s);
const names={'64799.dat':'Open-center plate 4 × 4','2456.dat':'Brick 2 × 6','69729.dat':'Tile 2 × 6','20482.dat':'Round tile 1 × 1 · pin','32064a.dat':'Technic brick 1 × 2 · axle hole','43093.dat':'Technic axle pin · friction','30363.dat':'Slope 18° · 4 × 2','3700.dat':'Technic brick 1 × 2 · pin hole','3009.dat':'Brick 1 × 6','3666.dat':'Plate 1 × 6','3062b.dat':'Round brick 1 × 1','77844.dat':'Corner plate 3 × 3','73109.dat':'Technic brick 1 × 2 · side plate','4569.dat':'Slope 10° · 6 × 1','32803.dat':'Curved inverted slope 2 × 2','3795.dat':'Plate 2 × 6','78443.dat':'Left wing plate 2 × 6','78444.dat':'Right wing plate 2 × 6','2445.dat':'Plate 2 × 12','3003.dat':'Brick 2 × 2','3001.dat':'Brick 2 × 4','32555.dat':'Technic corner 5 × 5','68568.dat':'Curved plate 3 × 3','2431.dat':'Tile 1 × 4','33909.dat':'Plate 2 × 2 · 2 studs','2780.dat':'Technic friction pin','32278.dat':'Technic beam · 15 holes','3710.dat':'Plate 1 × 4','3021.dat':'Plate 2 × 3','43723.dat':'Left wedge plate 2 × 3','43722.dat':'Right wedge plate 2 × 3','73562.dat':'Stepped bracket 3 × 2','24866.dat':'Flower plate 1 × 1','78329.dat':'Plate 1 × 5','44568.dat':'Hinge plate 1 × 4','32952.dat':'Tall brick · side studs','73230.dat':'Brick 1 × 1 · axle hole','3705.dat':'Technic axle 4L','45590.dat':'Flexible double joiner','32062.dat':'Technic axle 2L','35480.dat':'Rounded plate 1 × 2','32028.dat':'Plate 1 × 2 · door rail','2450.dat':'Triangular plate 3 × 3','3623.dat':'Plate 1 × 3','3622.dat':'Brick 1 × 3','4304.dat':'Stepped plate · side studs','11477.dat':'Curved slope 2 × 1','99563.dat':'Chamfered tile 1 × 2'};
Object.assign(names,{'3832.dat':'Plate 2 × 10','3020.dat':'Plate 2 × 4','4585.dat':'Centered end bracket','3022.dat':'Plate 2 × 2','48336.dat':'Plate 1 × 2 · handle','3008.dat':'Brick 1 × 8','77845.dat':'Rounded plate 1 × 4','3460.dat':'Plate 1 × 8','3068b.dat':'Tile 2 × 2','2420.dat':'Corner plate 2 × 2','30136.dat':'Log brick 1 × 2','2540.dat':'Plate 1 × 2 · handle','3002.dat':'Brick 2 × 3','3941.dat':'Round brick 2 × 2','11211.dat':'Brick 1 × 2 · side studs','3032.dat':'Plate 4 × 6','3034.dat':'Plate 2 × 8','6636.dat':'Tile 1 × 6','87079.dat':'Tile 2 × 4'});
Object.assign(names,{"2310.dat": "Cutout inverted slope 2 × 1", "2357.dat": "Corner brick 2 × 2", "2752.dat": "Hollow inverted slope 3 × 2", "3004.dat": "Brick 1 × 2", "3005.dat": "Brick 1 × 1", "3010.dat": "Brick 1 × 4", "3023.dat": "Plate 1 × 2", "3024.dat": "Plate 1 × 1", "3070b.dat": "Tile 1 × 1", "11476.dat": "Plate 1 × 2 · clip", "14718.dat": "Panel 1 × 4 × 2", "18654.dat": "Technic collar 1L", "22885.dat": "Tall brick 1 × 2 · side studs", "32000.dat": "Technic brick 1 × 2 · 2 holes", "32316.dat": "Technic beam · 5 holes", "32526.dat": "Technic bent beam · 3 × 5", "42924.dat": "Technic friction pin 3L", "44728.dat": "Bracket 1 × 2 · 2 × 2 down", "53540.dat": "Brick 1 × 2 · 2 pins", "60479.dat": "Plate 1 × 12", "60593.dat": "Window frame 1 × 2 × 3", "60594.dat": "Window frame 1 × 4 × 3", "60897.dat": "Plate 1 × 1 · clip", "6541.dat": "Technic brick 1 × 1 · pin hole", "73825.dat": "Bracket 1 × 1 · 1 × 2 up", "77808.dat": "Brick 1 × 2 · rounded ends", "79389.dat": "Bracket 1 × 1 · 2 × 1 down", "85984.dat": "Slope 30° · 1 × 2 × ⅔", "87620.dat": "Faceted brick 2 × 2"});
let project,index=0,viewer,busy=false;
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
Object.assign(names,{'13731.dat':'Curved slope 1 × 8 · plate extension','4477.dat':'Plate 1 × 10','5404.dat':'Shallow slope 1 × 2','40490.dat':'Technic beam · 9 holes','65304.dat':'Technic pin · stop bush','32063.dat':'Thin Technic beam · 6 holes','2465.dat':'Brick 1 × 16','3031.dat':'Plate 4 × 4','3040b.dat':'Slope 45° · 1 × 2','3044c.dat':'Double slope 2 × 1','65249.dat':'Long axle pin','87087.dat':'Brick 1 × 1 · side stud','80286.dat':'Flipper beam','89678.dat':'Technic half pin','58176.dat':'Round cylinder 2 × 2','55013.dat':'Axle 8L · stop','32123b.dat':'Half bush','77850.dat':'Rounded plate 1 × 3','24246.dat':'Rounded tile 1 × 1','69819.dat':'Technic fork','66906.dat':'Towball pin','6536.dat':'Perpendicular axle and pin connector','80477.dat':'Long towball pin','42135.dat':'Perpendicular axle connector','87761.dat':'Technic gear rack','24375.dat':'Rubber pin','89953.dat':'Shock absorber','89953-bag5-compressed.dat':'Shock absorber','77765.dat':'Technic double pin','32270.dat':'Bevel gear · 12 teeth','44294.dat':'Axle 7L','clutch-placeholder.dat':'One-way clutch gear (placeholder)'});
async function select(next,{historyMode='push',pieceCount=Infinity}={}){
 index=Math.max(0,Math.min(project.steps.length-1,next));const s=project.steps[index];busy=true;
 const url=new URL(location.href);url.searchParams.set('step',String(index+1));
 if(historyMode==='replace')history.replaceState(null,'',url);
 else if(historyMode==='push'&&url.href!==location.href)history.pushState(null,'',url);
 const pageSteps=project.steps.map((step,i)=>({...step,index:i})).filter(step=>step.page===s.page);
 $('#page-select').value=String(s.page);$('#steps').setAttribute('aria-label','All building steps');
 $('#instruction-title').textContent=s.title;$('#description').textContent=s.description;$('#large-number').textContent=String(index+1).padStart(2,'0');$('#step-badge').textContent=`STEP ${index+1} / ${project.steps.length}`;
 $('#piece-count').textContent=`${partsThrough(project,index).length} pieces assembled`;
 $('.live-label').textContent=project.assemblies?.[s.assembly]?.name??'ROTATABLE 3D';
 const moving=s.motion?.actions.filter(a=>a.type==='move').length??((s.instanceUpdates?.length??0)+(s.partUpdates?.length??0));
 const mixed=moving&&(s.instances?.length||s.parts.length);
 $('#new-count').textContent=mixed?`${s.motion?.actions.length??moving+(s.instances?.length??0)+s.parts.length} actions`:moving?`${moving} move${moving===1?'':'s'}`:s.instances?.length?'1 completed subassembly':`${s.parts.length} pieces`;
 $('#steps').innerHTML=project.steps.map((step,i)=>{return `<button data-step="${i}" class="step ${i===index?'active':''}"><span>${i<index?'✓':String(i+1).padStart(2,'0')}</span><div>${step.title}<small>Page ${step.page} · ${step.instanceUpdates?.length||step.partUpdates?.length?'Move existing pieces':step.instances?.length?"Join subassembly":step.parts.length+" new pieces"}</small></div>${i===index?'<b>→</b>':''}</button>`;}).join('');
 $('#progress').innerHTML=pageSteps.map(({index:i})=>`<button data-step="${i}" aria-label="Go to step ${i+1}" class="${i<=index?'done':''}"></button>`).join('');
 const active=$('#steps .active'),sidebar=$('.sidebar');
 if(active){const a=active.getBoundingClientRect(),b=sidebar.getBoundingClientRect();if(a.bottom>b.bottom)sidebar.scrollTop+=a.bottom-b.bottom+12;else if(a.top<b.top)sidebar.scrollTop-=b.top-a.top+12;}
 document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>select(Number(b.dataset.step)));
 const grouped=new Map();for(const p of s.parts){const key=p.part+':'+p.color;if(!grouped.has(key))grouped.set(key,{...p,count:0});grouped.get(key).count++;}
 $('#parts').innerHTML=[...grouped.values()].map(p=>{const c=COLORS.find(c=>c.id===p.color);return `<div class="part-card"><div class="brick-symbol" style="--brick:${c?.hex??'#999'}">▦</div><div><strong>${names[p.part]??p.part}</strong><small>${c?.name??p.color} · ${p.part.replace('.dat','')}</small></div><span>×${p.count}</span></div>`;}).join('');
 if(s.instances?.length)$('#parts').innerHTML=s.instances.map(instance=>{
  const first=project.steps.findIndex(step=>step.assembly===instance.assembly)+1;
  const count=partsThrough(project,instance.throughStep,instance.assembly).length;
  return `<div class="part-card"><div><strong>${project.assemblies?.[instance.assembly]?.name??'Completed assembly'}</strong><small>${count} pieces from steps ${first}–${instance.throughStep+1} · moves as one assembly</small></div><span>×1</span></div>`;
 }).join('');
 if(s.instanceUpdates?.length){
  const installed=instancesThrough(project,index,s.assembly??'frame');
  $('#parts').innerHTML+=s.instanceUpdates.map(update=>{const instance=installed.find(v=>v.id===update.id);return `<div class="part-card"><div><strong>${project.assemblies?.[instance.assembly]?.name??'Installed assembly'}</strong><small>Slide the completed build into position</small></div></div>`;}).join('');
 }
 $('#previous').disabled=index===0;$('#next').disabled=index===project.steps.length-1;
 $('#next').textContent=index===project.steps.length-1?(project.complete?'Build complete ✓':'Pages complete ✓'):project.steps[index+1].page!==s.page?'Next page →':'Next step →';
 $('#loading').hidden=false;
 try{await viewer.show(project,index,{pieceCount});updatePieceProgress();$('#loading').hidden=true;}catch(e){$('#loading').textContent=e.message;console.error(e);}finally{busy=false;}
}
function updatePieceProgress(){
 const bag=project.bags?.find(b=>index+1>=b.firstStep&&(b.lastStep==null||index+1<=b.lastStep));
 $('.bag-indicator').hidden=!bag;
 if(bag){
  $('#bag-label').textContent=`Bag ${bag.number}`;
  const complete=index+1===bag.lastStep&&viewer.pieceCount===viewer.unitCount;
  $('#bag-status').textContent=complete?'Complete ✓':bag.lastStep?`Step ${index+2-bag.firstStep} of ${bag.lastStep-bag.firstStep+1}`:`Step ${index+2-bag.firstStep}`;
 }
 const visible=viewer.nodes.filter(n=>!n.isNew||n.unit<viewer.pieceCount).length;
 $('#piece-count').textContent=`${visible} pieces assembled`;
 $('#step-badge').textContent=`STEP ${index+1} / ${project.steps.length} · ${viewer.pieceCount} / ${viewer.unitCount} ${viewer.motion?'MOVES':project.steps[index].instances?.length?'ASSEMBLIES':'PIECES'}`;
}
function movePiece(direction){
 if(direction>0&&viewer.pieceCount===viewer.unitCount){if(index<project.steps.length-1)select(index+1,{pieceCount:1});}
 else if(direction<0&&viewer.pieceCount===0){if(index>0)select(index-1);}
 else{viewer.setPieceCount(viewer.pieceCount+direction);updatePieceProgress();}
}
try{
 const response=await fetch('sets/pinball.json',{cache:'no-store'});if(!response.ok)throw Error('Could not load assembly data.');project=validateProject(await response.json());
 const pages=[...new Set(project.steps.map(s=>s.page))];
 $('#page-select').innerHTML=pages.map(page=>`<option value="${page}">${page}</option>`).join('');
 $('#coverage-label').textContent=`${pages.length} pages`;$('#coverage-count').textContent=`Steps 1–${project.steps.length} · ${project.steps.reduce((n,s)=>n+s.parts.length,0)} pieces`;
 $('#project-name').textContent=project.name;$('#project-name').insertAdjacentHTML('beforeend','<span>.</span>');
 $('#project-meta').innerHTML=`${project.steps.length} STEPS${project.bags?.length?` <span> / </span> ${project.bags.length} BAGS`:''}`;
 viewer=new AssemblyViewer($('#viewer'));await select(stepIndexFromSearch(location.search,project.steps.length),{historyMode:'replace'});
 addEventListener('popstate',()=>select(stepIndexFromSearch(location.search,project.steps.length),{historyMode:'none'}));
 $('#page-select').onchange=e=>select(project.steps.findIndex(s=>s.page===Number(e.target.value)));
 $('#previous').onclick=()=>select(index-1);$('#next').onclick=()=>select(index+1);
 $('#highlight').onchange=e=>{viewer.highlight=e.target.checked;viewer.applyHighlight();};$('#explode').onchange=e=>viewer.setExploded(e.target.checked);
 $('#replay').onclick=()=>{$('#explode').checked=false;viewer.setExploded(false);viewer.replay();};
 for(const type of ['iso','top','front'])$('#'+type).onclick=()=>viewer.resetCamera(type);
 $('#export').onclick=async()=>{try{const url=URL.createObjectURL(new Blob([await exportLDraw(project)],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download=`${project.id}-steps-1-${project.steps.length}.mpd`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Exported the joined model with reusable LDraw subassemblies.');}catch(error){toast(error.message);}};
 addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,select,textarea,[contenteditable]:not([contenteditable="false"])')||busy)return;
  if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;
  e.preventDefault();const direction=e.key==='ArrowRight'?1:-1;
  if(e.shiftKey)select(index+direction);else movePiece(direction);
 });
 window.__assembly={viewer,project,select};
}catch(e){$('#loading').textContent=e.message;console.error(e);}
if(import.meta.hot)import.meta.hot.dispose(()=>viewer?.dispose());
