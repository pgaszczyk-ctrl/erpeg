import {project,hash,inside} from './core.mjs';
import {extractGround} from './ground-geometry.mjs';
import {createModule} from './public/building-geometry.mjs';
export const CITY_CONFIG={address:'Guliwera 2, Lublin',center:[22.4873796,51.2389732],radiusRealM:3000,realPerGameM:15,cellGameM:5,cellRealM:75,blockCells:5,speedKmh:20,referenceRealM:150000,targetSeconds:1800};
const K=p=>p.join(','),parse=k=>k.split(',').map(Number),macro=p=>p.map(v=>Math.floor(v/5)),center=p=>p.map(v=>v*5+2),rank={motorway:5,trunk:5,primary:5,secondary:4,tertiary:3,unclassified:2,residential:1,living_street:1};
const rnd=s=>parseInt(hash(s),16)/4294967296;
export function simplifyCity(world){
 const c=CITY_CONFIG,origin=project(c.center,{realToGame:1}),sourceScale=world.config.realToGame,local=p=>p.map((v,i)=>(v/sourceScale-origin[i])/75),radius=40;
 const active=(x,y)=>Math.hypot(x+.5,y+.5)<=radius;
 const within=p=>Math.hypot(...p)<=radius+7;
 const boxes=new Map();
 for(let x=-8;x<8;x++)for(let y=-8;y<8;y++){if(!Array.from({length:25},(_,i)=>[x*5+i%5,y*5+Math.floor(i/5)]).some(([a,b])=>active(a,b)))continue;boxes.set(K([x,y]),{id:K([x,y]),xy:[x,y],sourceBuildings:[],roadEdges:[],modules:[]});}
 let sourceBuildings=0;
 for(const b of world.buildings){const p=local(b.pos);if(Math.hypot(...p)>radius)continue;const block=boxes.get(K(macro(p)));if(block){block.sourceBuildings.push({id:b.id,pos:p,kind:b.tags?.building});sourceBuildings++;}}
 const evidence=new Map();let sourceRoads=0,excludedRoads=0;
 for(const r of world.roads){const priority=rank[r.tags.highway];if(!priority||r.tags.bridge==='yes'||r.tags.tunnel==='yes'||Number(r.tags.layer||0)!==0){excludedRoads++;continue;}const pts=r.points.map(local);if(!pts.some(within)){excludedRoads++;continue;}if(priority===1&&!r.tags.name){excludedRoads++;continue;}sourceRoads++;
  for(let i=1;i<pts.length;i++){
   if(!within(pts[i])&&!within(pts[i-1]))continue;
   // DDA on the planning grid, using a single staircase at exact diagonal corners.
   const a=pts[i-1],b=pts[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*3));let prev=macro(a);
   for(let j=1;j<=n;j++){const m=macro(a.map((v,k)=>v+(b[k]-v)*j/n));if(K(prev)===K(m))continue;const path=[prev];if(prev[0]!==m[0]&&prev[1]!==m[1])path.push([m[0],prev[1]]);path.push(m);
    for(let q=1;q<path.length;q++){const aa=K(path[q-1]),bb=K(path[q]);if(!boxes.has(aa)||!boxes.has(bb))continue;const key=[aa,bb].sort().join('|');let e=evidence.get(key);if(!e){e={id:key,a:aa,b:bb,priority,sources:[],names:[]};evidence.set(key,e);}e.priority=Math.max(e.priority,priority);if(!e.sources.includes(r.id))e.sources.push(r.id);if(r.tags.name&&!e.names.includes(r.tags.name))e.names.push(r.tags.name);}
    prev=m;
   }
  }
 }
 const parent=new Map([...boxes.keys()].map(k=>[k,k]));function root(k){while(parent.get(k)!==k){parent.set(k,parent.get(parent.get(k)));k=parent.get(k);}return k;}function union(a,b){a=root(a);b=root(b);if(a===b)return false;parent.set(a,b);return true;}
 const ordered=[...evidence.values()].sort((a,b)=>b.priority-a.priority||b.sources.length-a.sources.length||a.id.localeCompare(b.id)),edges=[];
 // Retain regional backbones, then a sparse local forest. Do not recreate every residential street.
 for(const e of ordered.filter(e=>e.priority>=3)){edges.push(e);union(e.a,e.b);}
 for(const e of ordered.filter(e=>e.priority<3)){const a=boxes.get(e.a),b=boxes.get(e.b);if(!a.sourceBuildings.length&&!b.sourceBuildings.length)continue;if(union(e.a,e.b))edges.push(e);}
 const roads=new Map();
 for(const e of edges){const a=center(parse(e.a)),b=center(parse(e.b)),lanes=e.priority>=3?2:1,horizontal=a[0]!==b[0],major=horizontal?0:1;for(let i=Math.min(a[major],b[major]);i<=Math.max(a[major],b[major]);i++)for(let n=0;n<lanes;n++){const p=horizontal?[i,a[1]+n]:[a[0]+n,i];if(!active(...p))continue;const key=K(p);let cell=roads.get(key);if(!cell){cell={xy:p,lanes,edges:[]};roads.set(key,cell);}cell.lanes=Math.max(cell.lanes,lanes);cell.edges.push(e.id);}boxes.get(e.a).roadEdges.push(e.id);boxes.get(e.b).roadEdges.push(e.id);}
 const transform=x=>typeof x[0]==='number'?local(x):x.map(transform);
 const terrain=world.terrain.map(t=>({...t,geometry:{type:t.geometry.type,coordinates:transform(t.geometry.coordinates)}}));
 const ground=extractGround(terrain,[-40,-40,40,40]);
 const buckets=new Map();for(const s of ground){for(let x=Math.max(-40,Math.floor(s.bounds[0]));x<Math.min(40,Math.ceil(s.bounds[2]));x++)for(let y=Math.max(-40,Math.floor(s.bounds[1]));y<Math.min(40,Math.ceil(s.bounds[3]));y++){const k=K([x,y]);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(s);}}
 const tiles=[],tileMap=new Map();
 for(let x=-40;x<40;x++)for(let y=-40;y<40;y++){if(!active(x,y))continue;const votes=new Map();for(const dx of [.2,.5,.8])for(const dy of [.2,.5,.8]){let kind='open';for(const s of buckets.get(K([x,y]))||[])if(inside([x+dx,y+dy],s.rings))kind=s.kind;votes.set(kind,(votes.get(kind)||0)+1);}const land=[...votes].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0][0],tile={xy:[x,y],land,road:roads.has(K([x,y])),lanes:roads.get(K([x,y]))?.lanes||0};tiles.push(tile);tileMap.set(K([x,y]),tile);}
 // Shared anchors and local rerouting keep ponds intact while both neighbors use the same entrance.
 const anchors=new Map();const valid=(p,width)=>Array.from({length:width*width},(_,i)=>tileMap.get(K([p[0]+i%width,p[1]+Math.floor(i/width)]))).every(t=>t&&t.land!=='water');
 for(const block of boxes.values()){const origin=center(block.xy),options=[];for(let dx=-4;dx<=4;dx++)for(let dy=-4;dy<=4;dy++){const p=[origin[0]+dx,origin[1]+dy];if(valid(p,2))options.push(p);}options.sort((a,b)=>Math.hypot(a[0]-origin[0],a[1]-origin[1])-Math.hypot(b[0]-origin[0],b[1]-origin[1])||K(a).localeCompare(K(b)));if(options[0])anchors.set(block.id,options[0]);}
 function routeRoad(a,b,width){const queue=[{p:a,g:0,f:0}],cost=new Map([[K(a),0]]),previous=new Map([[K(a),null]]);let found=false;for(let limit=0;queue.length&&limit<12000;limit++){queue.sort((a,b)=>a.f-b.f||a.g-b.g);const at=queue.shift();if(at.g!==cost.get(K(at.p)))continue;if(K(at.p)===K(b)){found=true;break;}for(const d of [[1,0],[0,1],[-1,0],[0,-1]]){const n=at.p.map((v,i)=>v+d[i]);if(!valid(n,width))continue;const g=at.g+1;if(g>=(cost.get(K(n))??Infinity))continue;cost.set(K(n),g);previous.set(K(n),K(at.p));queue.push({p:n,g,f:g+Math.abs(n[0]-b[0])+Math.abs(n[1]-b[1])});}}if(!found)return null;let at=K(b);const path=[];while(at){path.push(parse(at));at=previous.get(at);}return path.reverse();}
 roads.clear();for(const e of edges){const a=anchors.get(e.a),b=anchors.get(e.b),lanes=e.priority>=3?2:1;e.path=a&&b?routeRoad(a,b,lanes):null;if(!e.path)continue;for(const p of e.path)for(let x=0;x<lanes;x++)for(let y=0;y<lanes;y++){const xy=[p[0]+x,p[1]+y],key=K(xy);let tile=roads.get(key);if(!tile){tile={xy,lanes,edges:[]};roads.set(key,tile);}tile.lanes=Math.max(tile.lanes,lanes);tile.edges.push(e.id);}}
 for(const tile of tiles){const r=roads.get(K(tile.xy));tile.road=!!r;tile.lanes=r?.lanes||0;}
 const occupied=new Set(),modules=[],template={id:'pilot-2x2',mask:['##','##'],height:3};let omittedGroups=0;
 const candidates=[];
 for(const b of boxes.values()){
  const count=b.sourceBuildings.length;if(!count)continue;const target=Math.min(3,Math.max(1,Math.ceil(count/25)));
  const pos=center(b.xy),style=(Math.floor(b.xy[0]/3)+Math.floor(b.xy[1]/3))%2===0?'elven':'steam';
  // May straddle a planning boundary: the reservation is global, never clipped to a block.
  for(let x=b.xy[0]*5-1;x<=b.xy[0]*5+4;x++)for(let y=b.xy[1]*5-1;y<=b.xy[1]*5+4;y++){
   const cells=[[x,y],[x+1,y],[x,y+1],[x+1,y+1]],t=cells.map(p=>tileMap.get(K(p)));if(t.some(v=>!v||v.road||!['open','paved'].includes(v.land)))continue;
   let roadDistance=Infinity;for(const r of roads.values())roadDistance=Math.min(roadDistance,Math.hypot(x+1-r.xy[0]-.5,y+1-r.xy[1]-.5));if(roadDistance>5)continue;
   const sourceDistance=Math.min(...b.sourceBuildings.map(s=>Math.hypot(s.pos[0]-x-1,s.pos[1]-y-1)));
   candidates.push({block:b,origin:[x,y],cells,style,target,score:roadDistance*.8+sourceDistance*.4+rnd(K([x,y]))*.8});
  }
 }
 candidates.sort((a,b)=>a.score-b.score||a.block.id.localeCompare(b.block.id)||K(a.origin).localeCompare(K(b.origin)));
 const placed=new Map();
 for(const q of candidates){if((placed.get(q.block.id)||0)>=q.target||q.cells.some(p=>occupied.has(K(p))))continue;const id='city:'+K(q.origin),apartment=q.block.sourceBuildings.filter(s=>s.kind==='apartments').length>q.block.sourceBuildings.length/3||rnd(id)>.55,kind=apartment?'apartment':'house-large';
 const m=createModule(template,q.origin,{id,kind:apartment?'blok mieszkalny':'dom',style:q.style,sourceIds:q.block.sourceBuildings.map(s=>s.id)});m.assetId=kind+'-'+q.style;m.planningBlock=q.block.id;m.height=apartment?4:3.3;modules.push(m);q.block.modules.push(id);placed.set(q.block.id,(placed.get(q.block.id)||0)+1);q.cells.forEach(p=>occupied.add(K(p)));}
 for(const b of boxes.values())if(b.sourceBuildings.length&&!b.modules.length)omittedGroups++;
 const green=tiles.filter(t=>!t.road&&!occupied.has(K(t.xy))&&!['water','paved'].includes(t.land)).length;
 const report={sourceBuildings,sourceRoads,excludedRoads,candidateConnections:evidence.size,selectedConnections:edges.filter(e=>e.path).length,unroutableConnections:edges.filter(e=>!e.path).length,planningBlocks:boxes.size,modules:modules.length,omittedGroups,tiles:tiles.length,roadTiles:roads.size,roadPct:Math.round(roads.size/tiles.length*1000)/10,greenPct:Math.round(green/tiles.length*1000)/10,gameDiameterM:400,diameterSeconds:72,referenceGameM:10000,referenceSeconds:1800};
 return {version:'simplified-city-5x5-v1',config:c,origin,box:[-40,-40,40,40],radiusCells:40,tiles,blocks:[...boxes.values()].map(({sourceBuildings,...b})=>({...b,sourceCount:sourceBuildings.length})),edges,modules,report,provenance:{source:world.provenance,sourceCenter:world.config.center,centerSource:'Exact addr:street=Guliwera, addr:housenumber=2 point in repository OSM snapshot',method:'One graph edge per pair of 375m planning blocks; main backbone plus local forest. Terrain majority of nine samples per 75m tile. Up to three representative 2x2 models per built planning block.',limits:['Four supplied detached models only; no invented shared-wall joints','Roads and buildings are symbolic, not exact original positions','Unknown terrain is illustrative game greenery, not confirmed OSM park','No Lublin–Warsaw route generated; travel time is a distance/speed calibration','3km radius uses projected ground distance; boundary represented by grid cells']}};
}
