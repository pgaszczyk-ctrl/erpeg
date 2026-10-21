import { astar } from './core.mjs';
const $=id=>document.getElementById(id),canvas=$('map'),ctx=canvas.getContext('2d');
let data;
try {const r=await fetch('blocks.json');if(!r.ok)throw Error(r.status);data=await r.json();}
catch(e){$('progress').textContent='Nie udało się wczytać próbki. Odśwież stronę.';throw e;}
const blockMap=new Map(data.blocks.map(b=>[b.id,b])),ports=new Map(data.ports.map(p=>[p.id,p]));
const roads=new Set(data.roadCells.map(c=>c.xy.join(','))),palette=['#bb7856','#78949b','#9a8058','#b58d7f','#7b8d69','#a29a76','#8d7790','#ad9267','#66908d','#8f6756'];
const blockSize=data.blockCells;
let camera=[...data.addressCenter],zoom=22,view='iso',selected=null,pointer=null,width=0,height=0,path=[],actor=null,last=performance.now(),visibleCount=data.blocks.length,building=false,buildClock=0,selectedIndex=-1;
const ordered=[...data.blocks].sort((a,b)=>(a.xy[0]+a.xy[1])-(b.xy[0]+b.xy[1])||a.xy[0]-b.xy[0]);
function screen([x,y],z=0){x-=camera[0];y-=camera[1];return view==='source'?[width/2+x*zoom,height/2-y*zoom]:[width/2+(x-y)*zoom,height/2+(x+y)*zoom*.5-z*zoom];}
function inverse([x,y]){x=(x-width/2)/zoom;y=(y-height/2)/zoom;return view==='source'?[camera[0]+x,camera[1]-y]:[camera[0]+x/2+y,camera[1]-x/2+y];}
function polygon(points,color,stroke=null,z=0){ctx.beginPath();points.forEach((p,i)=>{const s=screen(p,z);i?ctx.lineTo(...s):ctx.moveTo(...s)});ctx.closePath();if(color){ctx.fillStyle=color;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}}
function line(points,color,lineWidth=1){ctx.beginPath();points.forEach((p,i)=>{const s=screen(p);i?ctx.lineTo(...s):ctx.moveTo(...s)});ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.stroke();}
function square([x,y],size=1){return [[x,y],[x+size,y],[x+size,y+size],[x,y+size]];}
function inView(pos,margin=100){const p=screen(pos);return p[0]>-margin&&p[1]>-margin&&p[0]<width+margin&&p[1]<height+margin;}
function moduleDraw(m){const [x,y]=m.pos,w=m.w/2,d=m.d/2,h=m.height,base=[[x-w,y-d],[x+w,y-d],[x+w,y+d],[x-w,y+d]],color=palette[m.palette];
 polygon(base.map(p=>[p[0]+.3,p[1]+.3]),'#46654b');
 const face=(corners,fill)=>{ctx.beginPath();corners.forEach(([i,z],j)=>{const p=screen(base[i],z);j?ctx.lineTo(...p):ctx.moveTo(...p)});ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle='#4b4c36';ctx.lineWidth=.7;ctx.stroke()};
 face([[1,0],[2,0],[2,h],[1,h]],'#a79370');face([[2,0],[3,0],[3,h],[2,h]],'#d2bc8f');
 const ridge=[[x-w,y],[x+w,y]],roof=(points,fill)=>{ctx.beginPath();points.forEach(([p,z],i)=>{const q=screen(p,z);i?ctx.lineTo(...q):ctx.moveTo(...q)});ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle='#55513a';ctx.lineWidth=.8;ctx.stroke()};
 roof([[base[0],h],[base[1],h],[ridge[1],h+.4],[ridge[0],h+.4]],color);
 roof([[ridge[0],h+.4],[ridge[1],h+.4],[base[2],h],[base[3],h]],color);ctx.fillStyle='#354f4e';
 for(const p of [[x,y+d],[x+w,y]]){const q=screen(p,h*.5);ctx.fillRect(q[0]-2,q[1]-3,4,5)}
}
function blockAt(p){return blockMap.get(p.map(v=>Math.floor(v/blockSize)).join(','));}
function select(b){if(!b)return;selected=b;const mask=Array.from({length:3},(_,y)=>Array.from({length:3},(_,x)=>(b.roadMask&(1<<(y*3+x)))?'■':'·').join(' ')).join('\n');
 const info=b.ports.map(id=>ports.get(id));$('inspector').textContent=`Bloczek ${b.id}\n\nDroga w komórkach:\n${mask}\n\nWejścia do sąsiadów: ${info.length}\n${info.map(p=>p.blocks.filter(k=>k!==b.id).join('')+(p.boundary?' (brzeg próbki)':' ✓ wspólne')).join('\n')}\n\nObrysy źródłowe: ${b.sourceIds.length}\nModuły: ${b.modules.length}\n\nSąsiedzi:\n${b.neighbors.map(n=>`${n.id}: ${(n.roadMask?'droga':'bez drogi')+(n.outside?' (kontekst poza próbką)':'')}`).join('\n')}`;
}
function nearest(p){let best=Infinity,out=null;for(const c of data.roadCells){const d=Math.hypot(p[0]-c.xy[0]-.5,p[1]-c.xy[1]-.5);if(d<best){best=d;out=c.xy}}return out;}
const start=nearest(data.addressCenter);actor=start.map(v=>v+.5);
function route(p){const cell=p.map(Math.floor);if(!roads.has(cell.join(','))){$('error').textContent='Wybierz komórkę drogi. Budynki i trawniki nie są przechodnie w tej próbce.';return false;}
 const result=astar(nearest(actor),cell,roads);path=result?result.map(p=>p.map(v=>v+.5)):[];$('error').textContent=result?'':'Brak połączenia w źródłowym wycinku.';return !!result;}
function fit(){camera=[...data.center];zoom=Math.min(width/(data.box[2]-data.box[0])/2.1,height/(data.box[3]-data.box[1])/1.2);}
function portDraw(p){const [a,b]=p.cells,x=Math.max(a[0],b[0]),y=Math.max(a[1],b[1]);const edge=a[0]!==b[0]?[[x,y],[x,y+1]]:[[x,y],[x+1,y]];line(edge,p.boundary?'#e8ae65':'#8ff8de',3);}
function draw(now){const dt=Math.min(.05,(now-last)/1000);last=now;
 if(building){buildClock+=dt;if(buildClock>.035){visibleCount=Math.min(data.blocks.length,visibleCount+8);buildClock=0;if(visibleCount===data.blocks.length){building=false;$('build').textContent='Buduj krokami'}}}
 if(path.length){const q=path[0],d=Math.hypot(q[0]-actor[0],q[1]-actor[1]),step=dt*3;if(d<step){actor=q;path.shift()}else actor=actor.map((v,i)=>v+(q[i]-v)/d*step)}
 const r=canvas.getBoundingClientRect();if(width!==r.width||height!==r.height){width=r.width;height=r.height;canvas.width=width;canvas.height=height;}
 ctx.fillStyle='#16291f';ctx.fillRect(0,0,width,height);
 polygon([[data.box[0],data.box[1]],[data.box[2],data.box[1]],[data.box[2],data.box[3]],[data.box[0],data.box[3]]],'#849a6b','#c3ca9b');
 const shown=new Set(ordered.slice(0,visibleCount).map(b=>b.id));
 if(view==='source'){
  for(const s of data.sourceBuildings)if(inView(s.pos))for(const ring of s.rings)polygon(ring,'#b5ab90','#767c68');
  for(const road of data.sourceRoads)for(const seg of road.segments)line(seg,'#d9c69c',3);
 }else{
  // Road surface is ground geometry, transformed by the same isometric mapping
  // as plots and buildings. No constant-width screen-space road strokes.
  for(const c of data.roadCells){if(!shown.has(blockAt(c.xy)?.id)||!inView(c.xy))continue;polygon(square(c.xy),'#d0bd8b');
   if(view==='grid'||view==='ports')polygon(square(c.xy),null,'#a29169');
  }
  if(view==='grid'||view==='ports')for(const b of data.blocks){const pos=b.xy.map(v=>v*3);if(!inView(pos,180))continue;polygon(square(pos,3),null,'#647a58');
   if(view==='grid')for(let i=1;i<3;i++){line([[pos[0]+i,pos[1]],[pos[0]+i,pos[1]+3]],'#758965',.5);line([[pos[0],pos[1]+i],[pos[0]+3,pos[1]+i]],'#758965',.5)}
  }
  if(selected){if($('neighbors').checked)for(const n of selected.neighbors){const b=blockMap.get(n.id);if(b)polygon(square(b.xy.map(v=>v*3),3),'#8ae5cf22','#88c9b0');}polygon(square(selected.xy.map(v=>v*3),3),'#f5db7644','#ffe7a0');}
  const entities=data.modules.filter(m=>shown.has(m.block)&&inView(m.pos)).map(m=>({depth:m.pos[0]+m.pos[1]+(m.w+m.d)/2,kind:'building',m}));
  entities.push({depth:actor[0]+actor[1],kind:'actor'});entities.sort((a,b)=>a.depth-b.depth);
  for(const e of entities)if(e.kind==='building')moduleDraw(e.m);else{const p=screen(actor);ctx.fillStyle='#263f5b';ctx.fillRect(p[0]-3,p[1]-10,6,10);ctx.fillStyle='#ffe6af';ctx.fillRect(p[0]-3,p[1]-15,6,5);ctx.strokeStyle='#fff';ctx.strokeRect(p[0]-4,p[1]-16,8,17)}
  if(view==='ports')for(const p of data.ports)if(p.cells.some(q=>inView(q)))portDraw(p);
  if(selected)for(const id of selected.ports)portDraw(ports.get(id));
 }
 if(path.length)line([actor,...path],'#effeae',2);
 const address=screen(data.addressCenter);ctx.fillStyle='#fff6bd';ctx.fillRect(address[0]-5,address[1]-1,10,2);ctx.fillRect(address[0]-1,address[1]-5,2,10);
 $('progress').textContent=`Bloczki ${visibleCount}/${data.blocks.length} · ${view==='source'?'źródłowe OSM':'wspólna izometria dróg i budynków'} · ${zoom.toFixed(1)} px/m gry`;
 requestAnimationFrame(draw);
}
$('view').onchange=e=>{view=e.target.value};$('home').onclick=()=>{camera=[...data.addressCenter];zoom=22};$('overview').onclick=fit;
$('plus').onclick=()=>zoom=Math.min(55,zoom*1.3);$('minus').onclick=()=>zoom=Math.max(2,zoom/1.3);
$('next').onclick=()=>{const candidates=ordered.filter(b=>b.roadMask&&b.sourceIds.length).sort((a,b)=>Math.hypot(a.xy[0]*3+1.5-data.addressCenter[0],a.xy[1]*3+1.5-data.addressCenter[1])-Math.hypot(b.xy[0]*3+1.5-data.addressCenter[0],b.xy[1]*3+1.5-data.addressCenter[1]));selectedIndex=(selectedIndex+1)%candidates.length;select(candidates[selectedIndex]);camera=selected.xy.map(v=>v*3+1.5);view='grid';$('view').value=view;zoom=32;};
$('build').onclick=()=>{if(building){building=false;$('build').textContent='Wznów budowę';}else{if(visibleCount===data.blocks.length)visibleCount=0;building=true;$('build').textContent='Zatrzymaj budowę';}};
canvas.onpointerdown=e=>{pointer={start:[e.clientX,e.clientY],camera:[...camera],moved:false};canvas.setPointerCapture(e.pointerId)};
canvas.onpointermove=e=>{if(!pointer)return;const dx=(e.clientX-pointer.start[0])/zoom,dy=(e.clientY-pointer.start[1])/zoom;if(Math.hypot(dx,dy)*zoom>5)pointer.moved=true;camera=view==='source'?[pointer.camera[0]-dx,pointer.camera[1]+dy]:[pointer.camera[0]-dx/2-dy,pointer.camera[1]+dx/2-dy]};
canvas.onpointerup=e=>{if(pointer&&!pointer.moved){const r=canvas.getBoundingClientRect(),p=inverse([e.clientX-r.left,e.clientY-r.top]);if($('walking').checked)route(p);else select(blockAt(p))}pointer=null};canvas.onpointercancel=()=>pointer=null;
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(2,Math.min(55,zoom*(e.deltaY<0?1.15:.87)))},{passive:false});
$('metrics').innerHTML=[['Moduły budynków',data.report.modules],['Wspólne wejścia dróg',data.report.internalPorts],['Kolizje budynków',data.report.buildingBuildingCollisions],['Kolizje z drogą',data.report.buildingRoadCollisions]].map(([k,v])=>`<div class="stat"><span>${k}</span><strong>${v}</strong></div>`).join('');
window.__blocksTest={data,route,select,get actor(){return actor},get path(){return path},get visibleCount(){return visibleCount},get selected(){return selected}};
requestAnimationFrame(draw);
