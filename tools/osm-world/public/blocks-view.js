import {hash} from './core.mjs';
import { moduleBoxes } from './building-geometry.mjs';
import { FreeWalk } from './free-walk.mjs?v=4';
const $=id=>document.getElementById(id),canvas=$('map');let ctx=canvas.getContext('2d');
const artPreview=new URLSearchParams(location.search).has('grafika');
let data;
try {const r=await fetch(artPreview?'art-world.json':'blocks.json',{cache:'no-store'});if(!r.ok)throw Error(r.status);data=await r.json();}
catch(e){$('progress').textContent='Nie udało się wczytać próbki. Odśwież stronę.';throw e;}
let nav=new FreeWalk(data.box,data.modules,{water:data.water||[]});
const manifest=await fetch('assets/building-pilot-v1/manifest.json').then(r=>r.json());
const kit=await fetch('building-kit.json',{cache:'no-store'}).then(r=>r.json());
const artwork=new Map();
await Promise.all([...manifest.assets.map(a=>({...a,asset_file:'assets/building-pilot-v1/'+a.file})),...(kit.assets||[])].map(async asset=>{
 const image=new Image();image.src=asset.asset_file;
 try{await image.decode();artwork.set(asset.id,{asset,image});}catch{$('error').textContent='Część grafik nie wczytała się — używam brył zastępczych.';}
}));
const keys=new Set();let stick=[0,0];
function artFor(m){
 if($('art').value==='simple')return null;
 const pool=[...artwork.values()].filter(item=>{const a=item.asset;return a.shape_id===m.shapeId&&a.style===$('art').value&&(!m.rowId||a.party_wall_profile==='flat-parapet-v1'&&a.eaves_game_m===m.height&&JSON.stringify([...(a.joined_sides||[])].sort())===JSON.stringify([...m.joinedSides].sort()));}).sort((a,b)=>a.asset.id.localeCompare(b.asset.id));
 if(pool.length)return pool[parseInt(hash(m.id),16)%pool.length];
 if(m.rowId||m.cells.length!==4||Math.abs(m.w-1.7)>.001||Math.abs(m.d-1.7)>.001)return null;
 const kind=m.kind==='dom'?'house-large':m.kind==='blok mieszkalny'||data.artPreview?'apartment':null;return kind?artwork.get(kind+'-'+$('art').value):null;
}

let blockMap=new Map(data.blocks.map(b=>[b.id,b])),ports=new Map(data.ports.map(p=>[p.id,p]));
let roads=new Set(data.roadCells.map(c=>c.xy.join(','))),palette=['#bb7856','#78949b','#9a8058','#b58d7f','#7b8d69','#a29a76','#8d7790','#ad9267','#66908d','#8f6756'];
const blockSize=data.blockCells;
let camera=[...data.addressCenter],zoom=artPreview?64:22,view='iso',selected=null,pointer=null,width=0,height=0,path=[],actor=null,last=performance.now(),visibleCount=data.blocks.length,building=false,buildClock=0,selectedIndex=-1;
let ordered=[...data.blocks].sort((a,b)=>(a.xy[0]+a.xy[1])-(b.xy[0]+b.xy[1])||a.xy[0]-b.xy[0]);
if(artPreview){const focus=[...data.modules].sort((a,b)=>Math.hypot(a.pos[0]-data.addressCenter[0],a.pos[1]-data.addressCenter[1])-Math.hypot(b.pos[0]-data.addressCenter[0],b.pos[1]-data.addressCenter[1]))[0];if(focus)camera=focus.pos.map(v=>v-1.5);}
function screen([x,y],z=0){x-=camera[0];y-=camera[1];return view==='source'?[width/2+x*zoom,height/2-y*zoom]:[width/2+(x-y)*zoom,height/2+(x+y)*zoom*.5-z*zoom];}
function inverse([x,y]){x=(x-width/2)/zoom;y=(y-height/2)/zoom;return view==='source'?[camera[0]+x,camera[1]-y]:[camera[0]+x/2+y,camera[1]-x/2+y];}
function polygon(points,color,stroke=null,z=0){ctx.beginPath();points.forEach((p,i)=>{const s=screen(p,z);i?ctx.lineTo(...s):ctx.moveTo(...s)});ctx.closePath();if(color){ctx.fillStyle=color;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}}
function line(points,color,lineWidth=1){ctx.beginPath();points.forEach((p,i)=>{const s=screen(p);i?ctx.lineTo(...s):ctx.moveTo(...s)});ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.stroke();}
function square([x,y],size=1){return [[x,y],[x+size,y],[x+size,y+size],[x,y+size]];}
function inView(pos,margin=100){const p=screen(pos);return p[0]>-margin&&p[1]>-margin&&p[0]<width+margin&&p[1]<height+margin;}
function moduleDraw(m){
 const art=artFor(m);if(art){const {asset,image}=art,anchor=screen([Math.max(...m.cells.map(p=>p[0]))+1,Math.max(...m.cells.map(p=>p[1]))+1]),factor=zoom/64,x=anchor[0]-asset.anchor_px[0]*factor,y=anchor[1]-asset.anchor_px[1]*factor;const p=screen(actor),[bx,by,bw,bh]=asset.opaque_bbox_px||[0,0,...asset.canvas_px];const covers=actor[0]+actor[1]<m.pos[0]+m.pos[1]+2&&p[0]>=x+bx*factor&&p[0]<=x+(bx+bw)*factor&&p[1]>=y+by*factor&&p[1]-15<=y+(by+bh)*factor;ctx.globalAlpha=covers?.35:1;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(image,x,y,asset.canvas_px[0]*factor,asset.canvas_px[1]*factor);ctx.globalAlpha=1;return;}
 if(m.parts){
  const color=palette[m.palette],h=m.height;
  for(const part of [...m.parts].sort((a,b)=>(a.cell[0]+a.cell[1])-(b.cell[0]+b.cell[1]))){
   const [x0,y0,x1,y1]=part.box,roof=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
   const wall=(a,b,fill)=>{const p=[screen(a),screen(b),screen(b,h),screen(a,h)];ctx.beginPath();p.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();ctx.fillStyle=fill;ctx.fill();};
   if(part.walls.east)wall([x1,y0],[x1,y1],m.rowId?'#a79577':'#a79370');
   if(part.walls.south)wall([x1,y1],[x0,y1],m.rowId?'#cfb493':'#d2bc8f');
   polygon(roof,color,null,h);
   for(const [side,p] of [['east',[x1,(y0+y1)/2]],['south',[(x0+x1)/2,y1]]])if(part.walls[side]){const at=screen(p,h*.5);ctx.fillStyle='#344f55';const windows=m.rowId?1+(m.variant||0):1;for(let n=0;n<windows;n++)ctx.fillRect(at[0]-windows*3+n*6,at[1]-2,3,5);}
  }
  return;
 }

}
function blockAt(p){return blockMap.get(p.map(v=>Math.floor(v/blockSize)).join(','));}
function select(b){if(!b)return;selected=b;const mask=Array.from({length:3},(_,y)=>Array.from({length:3},(_,x)=>(b.roadMask&(1<<(y*3+x)))?'■':'·').join(' ')).join('\n');
 const info=b.ports.map(id=>ports.get(id));const selectedModules=data.modules.filter(m=>b.modules.includes(m.id));$('inspector').textContent=`Bloczek ${b.id}\n\nDroga w komórkach:\n${mask}\n\nWejścia do sąsiadów: ${info.length}\n${info.map(p=>p.blocks.filter(k=>k!==b.id).join('')+(p.boundary?' (brzeg próbki)':' ✓ wspólne')).join('\n')}\n\nObrysy źródłowe: ${b.sourceIds.length}\nModuły: ${b.modules.length}\n${selectedModules.map(m=>m.shapeId+' · '+(m.blocks||[m.block]).length+' bloczków · '+m.joinIds.length+' złączy').join('\n')}\n\nSąsiedzi:\n${b.neighbors.map(n=>`${n.id}: ${(n.roadMask?'droga':'bez drogi')+(n.outside?' (kontekst poza próbką)':'')}`).join('\n')}`;
}
function nearest(p){let best=Infinity,out=null;for(const c of data.roadCells){const d=Math.hypot(p[0]-c.xy[0]-.5,p[1]-c.xy[1]-.5);if(d<best){best=d;out=c.xy}}return out;}
function spawn(){
 const candidates=data.corridors?data.corridors.surfaces.map(s=>s.polygon.reduce((a,p)=>[a[0]+p[0]/s.polygon.length,a[1]+p[1]/s.polygon.length],[0,0])):data.roadCells.map(c=>c.xy.map(v=>v+.5));
 return candidates.sort((a,b)=>Math.hypot(a[0]-data.addressCenter[0],a[1]-data.addressCenter[1])-Math.hypot(b[0]-data.addressCenter[0],b[1]-data.addressCenter[1])).find(p=>nav.free(p))||data.center;
}
actor=spawn();
function route(p){
 if(!nav.free(p)){$('error').textContent='Ten punkt zajmuje budynek, woda albo granica próbki. Wybierz wolne miejsce.';return false;}
 const result=nav.route(actor,p);path=result?result.slice(1):[];$('error').textContent=result?'':'Nie znalazłem bezpiecznego dojścia do tego punktu.';return !!result;
}
function inputVector(){const right=(keys.has('arrowright')||keys.has('d')?1:0)-(keys.has('arrowleft')||keys.has('a')?1:0)+stick[0],down=(keys.has('arrowdown')||keys.has('s')?1:0)-(keys.has('arrowup')||keys.has('w')?1:0)+stick[1];const world=view==='source'?[right,-down]:[right/2+down,-right/2+down];const length=Math.hypot(...world);return length?world.map(v=>v/length*Math.min(1,Math.hypot(right,down))):[0,0];}

function fit(){camera=[...data.center];zoom=Math.min(width/(data.box[2]-data.box[0])/2.1,height/(data.box[3]-data.box[1])/1.2);}
function portDraw(p){const [a,b]=p.cells,x=Math.max(a[0],b[0]),y=Math.max(a[1],b[1]);const edge=a[0]!==b[0]?[[x,y],[x,y+1]]:[[x,y],[x+1,y]];line(edge,p.boundary?'#e8ae65':'#8ff8de',3);}
let groundCache=null,groundKey="";
function draw(now){const dt=Math.min(.05,(now-last)/1000);last=now;
 if(building){buildClock+=dt;if(buildClock>.035){visibleCount=Math.min(data.blocks.length,visibleCount+8);buildClock=0;if(visibleCount===data.blocks.length){building=false;$('build').textContent='Buduj krokami'}}}
 const input=$('walking').checked?inputVector():[0,0];
 if(input.some(v=>v)){path=[];actor=nav.move(actor,input.map(v=>v*dt*(data.scale?.walkSpeedGameMps||3)));if(!inView(actor, -60))camera=[...actor];}
 else if(path.length){const q=path[0],d=Math.hypot(q[0]-actor[0],q[1]-actor[1]),step=dt*(data.scale?.walkSpeedGameMps||3);const next=d<step?q:actor.map((v,i)=>v+(q[i]-v)/d*step);if(nav.clear(actor,next)){actor=next;if(d<=step)path.shift();}else{path=[];$('error').textContent='Przejście zablokowane.';}}

 const r=canvas.getBoundingClientRect();if(width!==r.width||height!==r.height){width=r.width;height=r.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
 ctx.fillStyle='#16291f';ctx.fillRect(0,0,width,height);
 polygon([[data.box[0],data.box[1]],[data.box[2],data.box[1]],[data.box[2],data.box[3]],[data.box[0],data.box[3]]],data.artPreview?'#91aa76':data.corridors?'#a5a382':'#849a6b','#c3ca9b');
 ctx.save();ctx.beginPath();[[data.box[0],data.box[1]],[data.box[2],data.box[1]],[data.box[2],data.box[3]],[data.box[0],data.box[3]]].forEach((p,i)=>i?ctx.lineTo(...screen(p)):ctx.moveTo(...screen(p)));ctx.closePath();ctx.clip();
 const shown=new Set(ordered.slice(0,visibleCount).map(b=>b.id));
 if(data.corridors){
  const cacheKey=JSON.stringify([data.version,camera,zoom,view,width,height,visibleCount]);
  if(cacheKey!==groundKey){
   groundKey=cacheKey;groundCache=document.createElement('canvas');groundCache.width=width;groundCache.height=height;const mainContext=ctx;ctx=groundCache.getContext('2d');
  for(const region of data.ground){ctx.beginPath();for(const ring of region.rings){ring.forEach((p,i)=>i?ctx.lineTo(...screen(p)):ctx.moveTo(...screen(p)));ctx.closePath();}ctx.fillStyle=region.color;ctx.fill('evenodd');}
  for(const surface of data.corridors.surfaces)if(shown.has(blockAt(surface.polygon[0])?.id))polygon(surface.polygon,surface.color,data.corridors.gridStepGameM?'#aa946766':null);
  if(data.corridors.gridStepGameM){const step=data.corridors.gridStepGameM;for(let x=data.box[0];x<data.box[2];x+=step)line([[x,data.box[1]],[x,data.box[3]]],'#31492d22',.5);for(let y=data.box[1];y<data.box[3];y+=step)line([[data.box[0],y],[data.box[2],y]],'#31492d22',.5);}
   ctx=mainContext;
  }
  ctx.drawImage(groundCache,0,0);
 }

 if(view==='source'){
  for(const s of data.sourceBuildings)if(inView(s.pos))for(const ring of s.rings)polygon(ring,'#b5ab90','#767c68');
  for(const road of data.sourceRoads)for(const seg of road.segments)line(seg,'#d9c69c',3);
 }else{
  // Road surface is ground geometry, transformed by the same isometric mapping
  // as plots and buildings. No constant-width screen-space road strokes.
  if(data.corridors){/* Physical roads were drawn independently of coarse cells above. */}
  else if(view==='iso'){
   for(const tile of data.roadSurface.tiles)if(shown.has(blockAt(tile.xy)?.id)&&inView(tile.xy))polygon(tile.polygon,'#d0bd8b');
   for(const p of data.terrainCleanup.paving)if(shown.has(blockAt(p)?.id)&&inView(p))polygon(square(p),'#d0bd8b');
   for(const c of data.roadSurface.connectors)if(c.cells.every(p=>shown.has(blockAt(p)?.id))&&inView(c.xy))polygon(c.polygon,'#d0bd8b');
  }else for(const c of data.roadCells){if(!shown.has(blockAt(c.xy)?.id)||!inView(c.xy))continue;polygon(square(c.xy),'#d0bd8b','#a29169');}
  if(view==='grid'||view==='ports')for(const b of data.blocks){const pos=b.xy.map(v=>v*3);if(!inView(pos,180))continue;polygon(square(pos,3),null,'#647a58');
   if(view==='grid')for(let i=1;i<3;i++){line([[pos[0]+i,pos[1]],[pos[0]+i,pos[1]+3]],'#758965',.5);line([[pos[0],pos[1]+i],[pos[0]+3,pos[1]+i]],'#758965',.5)}
  }
  if(selected){if($('neighbors').checked)for(const n of selected.neighbors){const b=blockMap.get(n.id);if(b)polygon(square(b.xy.map(v=>v*3),3),'#8ae5cf22','#88c9b0');}polygon(square(selected.xy.map(v=>v*3),3),'#f5db7644','#ffe7a0');}
  const entities=data.modules.filter(m=>(m.blocks||[m.block]).some(k=>shown.has(k))&&inView(m.pos,180)).map(m=>({depth:m.pos[0]+m.pos[1]+(m.w+m.d)/2,kind:'building',m}));
  entities.push({depth:actor[0]+actor[1],kind:'actor'});entities.sort((a,b)=>a.depth-b.depth);
  for(const e of entities)if(e.kind==='building')moduleDraw(e.m);else{const p=screen(actor);ctx.fillStyle='#263f5b';ctx.fillRect(p[0]-3,p[1]-10,6,10);ctx.fillStyle='#ffe6af';ctx.fillRect(p[0]-3,p[1]-15,6,5);ctx.strokeStyle='#fff';ctx.strokeRect(p[0]-4,p[1]-16,8,17)}
  if(view==='ports')for(const p of data.ports)if(p.cells.some(q=>inView(q)))portDraw(p);
  if(selected)for(const id of selected.ports)portDraw(ports.get(id));
 }
 if(path.length)line([actor,...path],'#effeae',2);
 const marker=screen(actor);ctx.strokeStyle='#fff3a5';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(marker[0],marker[1]-2,5,3,0,0,Math.PI*2);ctx.stroke();
 const address=screen(data.addressCenter);ctx.fillStyle='#fff6bd';ctx.fillRect(address[0]-5,address[1]-1,10,2);ctx.fillRect(address[0]-1,address[1]-5,2,10);
 ctx.restore();
 $('progress').textContent=`Bloczki ${visibleCount}/${data.blocks.length} · ${view==='source'?'źródłowe OSM':'wspólna izometria dróg i budynków'} · ${zoom.toFixed(1)} px/m gry`;
 requestAnimationFrame(draw);
}
$('view').onchange=e=>{view=e.target.value};$('home').onclick=()=>{camera=[...data.addressCenter];zoom=artPreview?64:22};$('overview').onclick=fit;
$('plus').onclick=()=>zoom=Math.min(96,zoom*1.3);$('minus').onclick=()=>zoom=Math.max(2,zoom/1.3);
$('next').onclick=()=>{const candidates=ordered.filter(b=>b.roadMask&&b.sourceIds.length).sort((a,b)=>Math.hypot(a.xy[0]*3+1.5-data.addressCenter[0],a.xy[1]*3+1.5-data.addressCenter[1])-Math.hypot(b.xy[0]*3+1.5-data.addressCenter[0],b.xy[1]*3+1.5-data.addressCenter[1]));selectedIndex=(selectedIndex+1)%candidates.length;select(candidates[selectedIndex]);camera=selected.xy.map(v=>v*3+1.5);view='grid';$('view').value=view;zoom=32;};
$('build').onclick=()=>{if(building){building=false;$('build').textContent='Wznów budowę';}else{if(visibleCount===data.blocks.length)visibleCount=0;building=true;$('build').textContent='Zatrzymaj budowę';}};
canvas.onpointerdown=e=>{pointer={start:[e.clientX,e.clientY],camera:[...camera],moved:false};canvas.setPointerCapture(e.pointerId)};
canvas.onpointermove=e=>{if(!pointer)return;const dx=(e.clientX-pointer.start[0])/zoom,dy=(e.clientY-pointer.start[1])/zoom;if(Math.hypot(dx,dy)*zoom>5)pointer.moved=true;camera=view==='source'?[pointer.camera[0]-dx,pointer.camera[1]+dy]:[pointer.camera[0]-dx/2-dy,pointer.camera[1]+dx/2-dy]};
canvas.onpointerup=e=>{if(pointer&&!pointer.moved){const r=canvas.getBoundingClientRect(),p=inverse([e.clientX-r.left,e.clientY-r.top]);if($('walking').checked)route(p);else select(blockAt(p))}pointer=null};canvas.onpointercancel=()=>pointer=null;
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(2,Math.min(96,zoom*(e.deltaY<0?1.15:.87)))},{passive:false});
function refreshInfo(){
 $('next').disabled=!!data.synthetic;$('home').textContent=data.synthetic?'Środek galerii':'Guliwera 4';
 $('scene-name').textContent=data.artPreview?'Guliwera 4 · grafiki 2×2 na rzeczywistej siatce OSM':data.synthetic?'Próbka SYNTETYCZNA — kształty i złącza':'Guliwera 4 · rzeczywisty OSM · '+(data.comparisonRole==='before'?'PRZED zmianą':'PO zmianie');
 $('scale-info').textContent=data.artPreview?'Drogi na siatce: ścieżka 1 pas, ulica 2 pasy. Pole 0,25 m gry; skrzyżowania szersze. Zieleń tła poglądowa. '+data.previewNote+' Grafiki 512×512 px, romb 128×64 px przy zbliżeniu 64 px/m.':data.synthetic?'Galeria techniczna: L, U, 4×2, 3×3 i trzy różne segmenty szeregu. Nie przedstawia rzeczywistego miejsca.':`Skala 1:${data.scale.denominator.toFixed(2)}. Komórka = ${data.report.cellRealM.toFixed(1)} m terenu; bloczek = ${data.report.blockRealM.toFixed(1)} m. Spacer ${data.scale.walkSpeedGameMps} m gry/s. Model Lublin–Warszawa: ${data.scale.referenceDistanceRealM/1000} km → ${data.scale.referenceGameM/1000} km gry → 30 min bez zatrzymań. Pełna trasa nie została jeszcze wygenerowana ani przechodzona.`;
 $('metrics').innerHTML=[...(data.coverageComparison? [['Drogi — udział terenu', (data.comparisonRole==='before'?data.coverageComparison.beforeRoadPct:data.coverageComparison.afterRoadPct)+'%'],['Zieleń OSM bez zabudowy i dróg',(data.comparisonRole==='before'?data.coverageComparison.beforeUncoveredSourceGreenPct:data.coverageComparison.afterUncoveredSourceGreenPct)+'%']]:[]),['Moduły budynków',data.report.modules],['Budynki na wielu bloczkach',data.report.multiBlockModules],['Wspólne ściany',data.report.buildingJoins],['Kolizje budynków',data.report.buildingBuildingCollisions],['Kolizje z drogą',data.report.buildingRoadCollisions]].map(([k,v])=>`<div class="stat"><span>${k}</span><strong>${v}</strong></div>`).join('');
}
refreshInfo();if(artPreview){$('compare-ground').hidden=true;$('art').value='elven';$('home').textContent='Guliwera · detal 1:1';}
const liveData=data;
function activateScene(next){
 data=next;
 nav=new FreeWalk(data.box,data.modules,{water:data.water||[]});
 blockMap=new Map(data.blocks.map(b=>[b.id,b]));ports=new Map(data.ports.map(p=>[p.id,p]));roads=new Set(data.roadCells.map(c=>c.xy.join(',')));
 ordered=[...data.blocks].sort((a,b)=>(a.xy[0]+a.xy[1])-(b.xy[0]+b.xy[1]));
 actor=spawn();selected=null;path=[];camera=[...data.center];visibleCount=data.blocks.length;building=false;selectedIndex=-1;
 $('kit-demo').textContent=data.synthetic?'Wróć do mapy':'Kształty i szereg';view='iso';$('view').value=view;$('inspector').textContent='Wybierz bloczek, aby obejrzeć maskę i złącza.';refreshInfo();fit();$('compare-ground').textContent=data.comparisonRole==='before'?'Pokaż po zmianie':'Porównaj: przed zmianą';
}
$('kit-demo').onclick=async()=>activateScene(data.synthetic?liveData:await fetch('kit-demo.json',{cache:'no-store'}).then(r=>r.json()));
let beforeData;
$('compare-ground').onclick=async()=>{beforeData ||= await fetch('blocks-before.json',{cache:'no-store'}).then(r=>r.json());activateScene(data.comparisonRole==='before'?liveData:beforeData);};

window.__blocksTest={get data(){return data},route,select,get nav(){return nav},manifest,artwork,artFor,get actor(){return actor},get path(){return path},get visibleCount(){return visibleCount},get selected(){return selected}};
requestAnimationFrame(draw);

window.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea')&&e.target.type!=='checkbox')return;const key=e.key.toLowerCase();if(['w','a','s','d','arrowleft','arrowright','arrowup','arrowdown'].includes(key)){e.preventDefault();keys.add(key);}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();stick=[0,0];});
const pad=$('pad'),knob=$('knob');let padActive=false;
function updateStick(e){const r=pad.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/35,y=(e.clientY-r.top-r.height/2)/35,l=Math.max(1,Math.hypot(x,y));stick=[x/l,y/l];knob.style.transform=`translate(${stick[0]*25}px,${stick[1]*25}px)`;}
pad.onpointerdown=e=>{e.preventDefault();e.stopPropagation();padActive=true;pad.setPointerCapture(e.pointerId);updateStick(e);};pad.onpointermove=e=>{if(padActive)updateStick(e);};pad.onpointerup=pad.onpointercancel=()=>{padActive=false;stick=[0,0];knob.style.transform='';};
for(const [button,kind] of [['pilot-house','dom'],['pilot-apartment','blok mieszkalny']])$(button).onclick=async()=>{let m=data.modules.filter(m=>m.kind===kind&&m.cells.length===4).sort((a,b)=>Math.hypot(a.pos[0]-data.addressCenter[0],a.pos[1]-data.addressCenter[1])-Math.hypot(b.pos[0]-data.addressCenter[0],b.pos[1]-data.addressCenter[1]))[0];if(!m&&!data.synthetic){await $('kit-demo').onclick();m=data.modules.find(m=>m.kind===kind&&m.cells.length===4);$('error').textContent='Przykład grafiki pokazany w oznaczonej galerii syntetycznej.';}if(m){camera=[...m.pos];zoom=32;select(blockAt(m.pos));view='iso';$('view').value=view;}};
