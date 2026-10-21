import { buildRoadSurface } from './public/road-surface.mjs';
import { supercover, hash, inside } from './core.mjs';

export const CELL = 1; // game metre = 10 real metres
export const BLOCK = 3;
export const cellKey = p => p.join(',');
export const blockKey = p => p.map(v => Math.floor(v / BLOCK)).join(',');
export const neighbors = ([x,y]) => [[x+1,y],[x,y+1],[x-1,y],[x,y-1]];
const compare = (a,b) => a.localeCompare(b, 'en');

// Liang–Barsky clipping keeps the context small. All block/grid origins stay global.
function clip(a,b,box) {
  let lo=0, hi=1;
  const dx=b[0]-a[0],dy=b[1]-a[1];
  const ps=[-dx,dx,-dy,dy],qs=[a[0]-box[0],box[2]-a[0],a[1]-box[1],box[3]-a[1]];
  for(let i=0;i<4;i++) {
    if(ps[i]===0) { if(qs[i]<0)return null; continue; }
    const r=qs[i]/ps[i];
    if(ps[i]<0)lo=Math.max(lo,r);else hi=Math.min(hi,r);
    if(lo>hi)return null;
  }
  return [[a[0]+lo*dx,a[1]+lo*dy],[a[0]+hi*dx,a[1]+hi*dy]];
}

export function generateBlocks(world, options={}) {
  const side=options.sideBlocks || 40;
  const focus=options.center || world.center;
  const origin=focus.map(v=>Math.floor(v/BLOCK)-Math.floor(side/2));
  const box=[origin[0]*BLOCK,origin[1]*BLOCK,(origin[0]+side)*BLOCK,(origin[1]+side)*BLOCK];
  const halo=box.map((v,i)=>v+(i<2?-BLOCK:BLOCK));
  const isIn=(p,b=box)=>p[0]>=b[0]&&p[1]>=b[1]&&p[0]<b[2]&&p[1]<b[3];
  const context=new Map(),sourceRoads=[],excluded=[];
  for(const road of [...world.roads].sort((a,b)=>compare(a.id,b.id))) {
    const segments=[];
    for(let i=1;i<road.points.length;i++) {
      const seg=clip(road.points[i-1],road.points[i],halo);
      if(seg)segments.push(seg);
    }
    if(!segments.length)continue;
    if(road.tags.bridge==='yes'||road.tags.tunnel==='yes'||Number(road.tags.layer||0)!==0) {
      excluded.push({id:road.id,reason:'Poziom inny niż grunt — nie łączymy w tej próbce'});continue;
    }
    sourceRoads.push({...road,points:undefined,segments});
    for(const seg of segments)for(const p of supercover(...seg,CELL)) {
      if(!isIn(p,halo))continue;
      const k=cellKey(p);
      if(!context.has(k))context.set(k,new Set());
      context.get(k).add(road.id);
    }
  }
  const blocks=new Map();
  for(let y=origin[1];y<origin[1]+side;y++)for(let x=origin[0];x<origin[0]+side;x++) {
    const k=cellKey([x,y]);blocks.set(k,{id:k,xy:[x,y],roadCells:[],ports:[],sourceIds:[],neighbors:[],modules:[],roadMask:0});
  }
  const roadCells=[];
  for(const [k,ids] of [...context].sort(([a],[b])=>compare(a,b))) {
    const p=k.split(',').map(Number);if(!isIn(p))continue;
    const b=blocks.get(blockKey(p));
    const local=[p[0]-b.xy[0]*BLOCK,p[1]-b.xy[1]*BLOCK];
    b.roadMask |= 1<<(local[1]*BLOCK+local[0]);b.roadCells.push(p);
    roadCells.push({xy:p,sourceIds:[...ids].sort(compare)});
  }
  // A port is owned by the shared cell edge, not by either block. Both sides
  // reference this exact record. Shared source IDs prevent joining nearby roads.
  const ports=new Map();
  for(const roadCell of roadCells) {
    const p=roadCell.xy,k=cellKey(p),owner=blockKey(p);
    for(const q of neighbors(p)) {
      const nk=cellKey(q),other=blockKey(q),ids=context.get(nk);
      if(owner===other||!ids)continue;
      const shared=roadCell.sourceIds.filter(id=>ids.has(id));
      if(!shared.length)continue;
      const pair=[k,nk].sort(compare),id=`edge:${pair.join('|')}`;
      if(!ports.has(id))ports.set(id,{id,cells:pair.map(v=>v.split(',').map(Number)),blocks:[owner,other].sort(compare),sourceIds:shared.sort(compare),boundary:!blocks.has(other)});
    }
  }
  for(const port of ports.values())for(const k of port.blocks)if(blocks.has(k))blocks.get(k).ports.push(port.id);
  const contextMasks=new Map();
  for(const k of context.keys()){const p=k.split(',').map(Number),bk=blockKey(p),xy=bk.split(',').map(Number);const bit=(p[1]-xy[1]*3)*3+p[0]-xy[0]*3;contextMasks.set(bk,(contextMasks.get(bk)||0)|(1<<bit));}
  for(const b of blocks.values())b.neighbors=neighbors(b.xy).map(cellKey).map(k=>({id:k,roadMask:contextMasks.get(k)||0,outside:!blocks.has(k)}));
  const buildings=world.buildings.filter(b=>isIn(b.pos)).sort((a,b)=>compare(a.id,b.id));
  const sourceBuildings=[];
  for(const b of buildings) {
    const block=blocks.get(blockKey(b.pos));
    block.sourceIds.push(...b.sourceIds);sourceBuildings.push({id:b.id,rings:b.rings,pos:b.pos,block:block.id});
  }
  const water=[];
  for(const t of world.terrain||[])if(t.tags.natural==='water'||t.tags.landuse==='reservoir') {
    for(const rings of t.geometry.type==='Polygon'?[t.geometry.coordinates]:t.geometry.coordinates)water.push(rings);
  }
  const modules=[],omitted=[],occupied=new Set();
  for(const b of blocks.values()) {
    if(!b.sourceIds.length)continue;
    b.sourceIds=[...new Set(b.sourceIds)].sort(compare);
    const sources=buildings.filter(s=>blockKey(s.pos)===b.id);
    const target=[0,1].map(i=>sources.reduce((sum,s)=>sum+s.pos[i],0)/sources.length);
    const choices=[];
    // Every module is contained in its own 3×3 block, including a visible gap.
    // No dependency on the order in which neighboring blocks are generated.
    for(const [width,depth] of [[2,2],[2,1],[1,2],[1,1]]) {
      for(let y=0;y<=BLOCK-depth;y++)for(let x=0;x<=BLOCK-width;x++) {
        const cells=[];let free=true;
        for(let dy=0;dy<depth;dy++)for(let dx=0;dx<width;dx++) {
          const p=[b.xy[0]*BLOCK+x+dx,b.xy[1]*BLOCK+y+dy];
          if(context.has(cellKey(p))||water.some(r=>inside(p.map(v=>v+.5),r)))free=false;
          cells.push(p);
        }
        if(!free)continue;
        const pos=[b.xy[0]*BLOCK+x+width/2,b.xy[1]*BLOCK+y+depth/2];
        choices.push({cells,pos,w:width-.3,d:depth-.3,score:width*depth*100-Math.hypot(pos[0]-target[0],pos[1]-target[1])});
      }
    }
    choices.sort((a,b)=>b.score-a.score);
    if(!choices.length){omitted.push({block:b.id,sourceIds:b.sourceIds,reason:'Brak wolnej komórki po rezerwacji dróg/wody'});continue;}
    const chosen=choices[0],important=sources.some(s=>s.tags.amenity||s.tags.shop);
    const kind=important?'usługi':sources.some(s=>s.tags.building==='apartments')?'blok mieszkalny':'dom';
    const id=`module:${b.id}`;
    const m={...chosen,id,block:b.id,sourceIds:b.sourceIds,kind,palette:parseInt(hash(b.id),16)%10,height:kind==='blok mieszkalny'?1.5:1,reason:`${sources.length} obrysów w tym samym bloczku; moduł zmniejszony do wolnych komórek`};
    delete m.score;
    for(const p of m.cells){const k=cellKey(p);if(occupied.has(k))throw Error('Module overlap');occupied.add(k);}
    b.modules.push(id);modules.push(m);
  }
  const roadSurface=buildRoadSurface(roadCells,modules,box,poly=>water.some(r=>poly.some(p=>inside(p,r))||inside(poly.reduce((a,p)=>a.map((v,i)=>v+p[i]/poly.length),[0,0]),r)));
  const portalList=[...ports.values()].sort((a,b)=>compare(a.id,b.id));
  const blockList=[...blocks.values()].map(b=>({...b,ports:b.ports.sort(compare)}));
  return {version:'blocks-3x3-diagonal-v2',roadSurface,cellGameM:CELL,blockCells:BLOCK,box,center:box.slice(0,2).map((v,i)=>(v+box[i+2])/2),addressCenter:world.center,blocks:blockList,roadCells,ports:portalList,modules,sourceRoads,sourceBuildings,omitted,excluded,
    report:{diagonalConnectors:roadSurface.connectors.length,diagonalLinks:roadSurface.diagonalLinks.length,blocks:blockList.length,roadCells:roadCells.length,internalPorts:portalList.filter(p=>!p.boundary).length,boundaryPorts:portalList.filter(p=>p.boundary).length,sourceBuildings:sourceBuildings.length,modules:modules.length,omittedBlocks:omitted.length,excludedElevatedRoads:excluded.length,realSideM:side*BLOCK*10,cellRealM:10,blockRealM:30,buildingRoadCollisions:0,buildingBuildingCollisions:0},
    limitations:['Siatka 10 m terenu na komórkę upraszcza zakręty i może scalać bliskie drogi','To próbka; sąsiedztwo nie zastępuje utraconych w źródle ID węzłów OSM','Drogi na mostach, w tunelach i na innych poziomach są jawnie pominięte','Łączenie zabudowy jest na razie według wspólnego bloczka; bez rozpoznawania pierzei i wejść POI']};
}

export function auditBlocks(sample) {
  const roads=new Set(sample.roadCells.map(c=>cellKey(c.xy))),occupied=new Map();
  const roadCollisions=[],moduleCollisions=[],invalidPorts=[],outsideBlocks=[];
  const byBlock=new Map(sample.blocks.map(b=>[b.id,b]));
  for(const m of sample.modules)for(const p of m.cells) {
    const k=cellKey(p);
    if(roads.has(k))roadCollisions.push({module:m.id,cell:k});
    if(occupied.has(k))moduleCollisions.push({modules:[occupied.get(k),m.id],cell:k});
    occupied.set(k,m.id);
    if(blockKey(p)!==m.block)outsideBlocks.push({module:m.id,cell:k});
  }
  for(const p of sample.ports) {
    const [a,b]=p.cells;
    if(Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])!==1)invalidPorts.push(p.id);
    for(const k of p.blocks)if(byBlock.has(k)&&!byBlock.get(k).ports.includes(p.id))invalidPorts.push(p.id);
  }
  return {roadCollisions,moduleCollisions,invalidPorts,outsideBlocks};
}
