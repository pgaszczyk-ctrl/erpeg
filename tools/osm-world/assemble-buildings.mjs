import {createModule,createRow,maskCells,cellId} from './public/building-geometry.mjs';
import {hash,inside} from './core.mjs';
const MACRO=9;
const macro=p=>p.map(v=>Math.floor(v/MACRO)).join(',');
const block=p=>p.map(v=>Math.floor(v/3)).join(',');
function rowEvidence(buildings){
 const result=new Set(buildings.filter(b=>b.tags.building==='terrace').map(b=>b.id)),edges=new Map();
 for(const b of buildings)for(const ring of b.rings||[])for(let i=1;i<ring.length;i++){const k=[ring[i-1],ring[i]].map(p=>p.map(v=>v.toFixed(6)).join(',')).sort().join('|');if(!edges.has(k))edges.set(k,[]);edges.get(k).push(b);}
 for(const entries of edges.values())if(new Set(entries.flatMap(b=>b.sourceIds)).size>=2)for(const b of entries)result.add(b.id);return result;
}
export function assembleBuildings(buildings,roads,box,water,kit){
 const macros=new Map(),occupied=new Set(),modules=[],joins=[],omitted=[],assigned=new Set();
 for(const b of buildings){const k=macro(b.pos);if(!macros.has(k))macros.set(k,[]);macros.get(k).push(b);}
 const templates=new Map(kit.templates.map(t=>[t.id,t]));
 const collides=cells=>cells.some(p=>occupied.has(cellId(p))||roads.has(cellId(p))||water.some(r=>inside(p.map(v=>v+.5),r)));
 for(const [mk,all] of [...macros].sort(([a],[b])=>a.localeCompare(b))){
  const rowIds=rowEvidence(all);
  const [mx,my]=mk.split(',').map(Number).map(v=>v*MACRO),groups=new Map();
  for(const b of all){const k=block(b.pos);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(b);}
  const sorted=[...groups].sort(([ka,a],[kb,b])=>Number(b.some(s=>rowIds.has(s.id)))-Number(a.some(s=>rowIds.has(s.id)))||ka.localeCompare(kb));
  for(const [bk,input] of sorted){const sources=input.filter(s=>!assigned.has(s.id));if(!sources.length)continue;
   const target=[0,1].map(i=>sources.reduce((sum,b)=>sum+b.pos[i],0)/sources.length),row=sources.some(s=>rowIds.has(s.id));
   const important=sources.some(s=>s.tags.amenity||s.tags.shop),kind=sources.some(s=>s.tags.building==='apartments')?'blok mieszkalny':important?'usługi':'dom';
   let ids=['house-2x2','narrow-2x1','narrow-1x2','small-1x1'];
   if(sources.length>=3||sources.some(s=>s.area>=4))ids=['hall-4x2','hall-2x4','house-3x3','wing-L','court-U',...ids];
   if(row)ids=['row-3x2','row-2x3','row-3x1','row-1x3','row-2x1','row-1x2',...ids];
   const choices=[];
   for(const tid of ids){const t=templates.get(tid);if(!t)continue;const isRow=t.family==='terrace',count=isRow?2:1,horizontal=isRow&&t.sockets.some(s=>s.side==='east');
    const width=t.mask[0].length+(horizontal?t.mask[0].length:0),depth=t.mask.length+(isRow&&!horizontal?t.mask.length:0);
    for(let y=my;y<=my+MACRO-depth;y++)for(let x=mx;x<=mx+MACRO-width;x++){
     if(Math.hypot(x+width/2-target[0],y+depth/2-target[1])>4.5)continue;
     const cells=maskCells(t,[x,y]);if(isRow)cells.push(...maskCells(t,[x+(horizontal?t.mask[0].length:0),y+(!horizontal?t.mask.length:0)]));
     if(cells.some(p=>p[0]<box[0]||p[1]<box[1]||p[0]>=box[2]||p[1]>=box[3])||collides(cells))continue;
     const reward=isRow?30:Math.min(cells.length,sources.length>=3?9:4);
     choices.push({t,origin:[x,y],cells,count,score:reward*10-Math.hypot(x+width/2-target[0],y+depth/2-target[1])*2-(t.id==='court-U'?1:0)});
    }
   }
   choices.sort((a,b)=>b.score-a.score||a.t.id.localeCompare(b.t.id)||a.origin[1]-b.origin[1]||a.origin[0]-b.origin[0]);
   if(!choices.length){omitted.push({block:bk,sourceIds:sources.flatMap(s=>s.sourceIds),reason:'Brak zgodnego miejsca w lokalnym obszarze rezerwacji'});continue;}
   const c=choices[0],set=new Set(c.cells.map(cellId));
   const merged=all.filter(b=>!assigned.has(b.id)&&(sources.includes(b)||set.has(cellId(b.pos.map(Math.floor)))));
   const sourceIds=[...new Set(merged.flatMap(s=>s.sourceIds))].sort(),id=`assembly:${mk}:${bk}`,style=kit.styles[parseInt(hash(mk),16)%kit.styles.length],palette=parseInt(hash(id),16)%10;
   const created=c.t.family==='terrace'?createRow(c.t,c.origin,c.count,{id,sourceIds,palette,style}):{modules:[createModule(c.t,c.origin,{id,sourceIds,palette,kind,style})],joins:[]};
   for(const m of created.modules){m.ownerRegion=mk;m.sourceBuildingIds=merged.map(s=>s.id);m.sourceIdentities=merged.filter(s=>s.tags.amenity||s.tags.shop||s.tags.name).map(s=>({id:s.id,tags:s.tags}));modules.push(m);for(const p of m.cells)occupied.add(cellId(p));}
   joins.push(...created.joins);for(const b of merged)assigned.add(b.id);
  }
 }
 return {modules,joins,omitted,ownershipCells:MACRO};
}
