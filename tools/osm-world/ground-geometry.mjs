import {inside} from './core.mjs';
import {polygonIntersectsBox} from './public/road-surface.mjs';
export const bounds=poly=>{const x=poly.map(p=>p[0]),y=poly.map(p=>p[1]);return [Math.min(...x),Math.min(...y),Math.max(...x),Math.max(...y)];};
export const intersects=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
export class SurfaceIndex {
 constructor(surfaces,convex=false){this.surfaces=surfaces;this.convex=convex;this.buckets=new Map();for(const s of surfaces){s.bounds??=bounds(s.polygon||s.rings[0]);const b=s.bounds;for(let x=Math.floor(b[0]/2);x<=Math.floor(b[2]/2);x++)for(let y=Math.floor(b[1]/2);y<=Math.floor(b[3]/2);y++){const k=`${x},${y}`;if(!this.buckets.has(k))this.buckets.set(k,[]);this.buckets.get(k).push(s);}}}
 query(box){const set=new Set();for(let x=Math.floor(box[0]/2);x<=Math.floor(box[2]/2);x++)for(let y=Math.floor(box[1]/2);y<=Math.floor(box[3]/2);y++)for(const s of this.buckets.get(`${x},${y}`)||[])if(intersects(s.bounds,box))set.add(s);return [...set];}
 hits(box){return this.query(box).some(s=>this.convex?polygonIntersectsBox(s.polygon,box):ringsIntersectBox(s.rings,box));}
}
function ringsIntersectBox(rings,box){
 const corners=[[box[0],box[1]],[box[2],box[1]],[box[2],box[3]],[box[0],box[3]]];if(corners.some(p=>inside(p,rings)))return true;
 if(rings[0].some(p=>p[0]>box[0]&&p[0]<box[2]&&p[1]>box[1]&&p[1]<box[3]))return true;
 for(const ring of rings)for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i];let lo=0,hi=1;for(let axis=0;axis<2;axis++){const d=b[axis]-a[axis];if(Math.abs(d)<1e-12){if(a[axis]<=box[axis]||a[axis]>=box[axis+2]){lo=2;break;}}else{let x=(box[axis]-a[axis])/d,y=(box[axis+2]-a[axis])/d;if(x>y)[x,y]=[y,x];lo=Math.max(lo,x);hi=Math.min(hi,y);}}if(lo<hi-1e-8)return true;}
 return false;
}
function landKind(p){
 if(p.natural==='water'||p.landuse==='reservoir')return ['water','#679ba4',5,true];
 if(p.amenity==='parking'||['asphalt','concrete','paving_stones'].includes(p.surface)&&p.leisure==='pitch')return ['paved','#b0ad9b',3,false];
 if(p.landuse==='forest'||p.natural==='wood')return ['forest','#506f48',2,true];
 if(['farmland','orchard','vineyard'].includes(p.landuse))return ['field','#a8a66b',2,true];
 if(['park','garden','playground'].includes(p.leisure))return ['park','#6e965e',4,true];
 if(['grass','meadow','allotments','recreation_ground','village_green','cemetery'].includes(p.landuse)||['grassland','scrub','wetland'].includes(p.natural)||p.leisure==='pitch')return ['grass','#829f65',1,true];
 return null;
}

function clipRing(ring,box){let out=ring.slice(0,ring.length>1&&ring[0][0]===ring.at(-1)[0]&&ring[0][1]===ring.at(-1)[1]?-1:undefined);for(const [axis,value,sign] of [[0,box[0],1],[0,box[2],-1],[1,box[1],1],[1,box[3],-1]]){const input=out;out=[];if(!input.length)break;for(let i=0;i<input.length;i++){const a=input[(i+input.length-1)%input.length],b=input[i],ina=(a[axis]-value)*sign>=0,inb=(b[axis]-value)*sign>=0;if(ina!==inb){const t=(value-a[axis])/(b[axis]-a[axis]);out.push(a.map((v,j)=>v+(b[j]-v)*t));}if(inb)out.push(b);}}if(out.length<3)return null;out.push(out[0]);return out;}

export function extractGround(terrain,box){const surfaces=[];for(const t of terrain){const kind=landKind(t.tags);if(!kind)continue;for(const rings of t.geometry.type==='Polygon'?[t.geometry.coordinates]:t.geometry.coordinates){const b=bounds(rings[0]);if(!intersects(b,box))continue;const outer=clipRing(rings[0],box);if(!outer)continue;const clipped=[outer,...rings.slice(1).map(r=>clipRing(r,box)).filter(Boolean)];surfaces.push({id:t.id,kind:kind[0],color:kind[1],priority:kind[2],protected:kind[3],green:!['water','paved'].includes(kind[0]),rings:clipped,bounds:bounds(outer)});}}
 return surfaces.sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id));}
export function roadWidth(tags,scale){
 const type=tags.highway||'path',foot=['footway','path','cycleway','steps','pedestrian','track'].includes(type);
 const fallback={motorway:12,trunk:12,primary:10,secondary:8,tertiary:7,residential:6,living_street:5,service:4,unclassified:5,pedestrian:3,footway:2,path:1.8,cycleway:2.5,steps:2,track:3}[type]||4;
 const explicit=Number.parseFloat(tags.width),real=Number.isFinite(explicit)&&explicit>0?Math.min(explicit,24):fallback;
 return {realM:real,gameM:Math.max(foot?.085:.14,real*scale),kind:foot?'path':'street',source:Number.isFinite(explicit)&&explicit>0?'OSM width':'class default + readable minimum'};
}
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
function distance(p,a,b){const d=[b[0]-a[0],b[1]-a[1]],l=dot(d,d),t=l?Math.max(0,Math.min(1,dot([p[0]-a[0],p[1]-a[1]],d)/l)):0;return Math.hypot(p[0]-a[0]-d[0]*t,p[1]-a[1]-d[1]*t);}
export function makeCorridors(roads,scale){
 const streets=[],surfaces=[],aliases=[],profiles=[];
 for(const r of roads){const w=roadWidth(r.tags,scale);if(w.kind==='street')for(const segment of r.segments)streets.push({id:r.id,segment,width:w.gameM});}
 // A small spatial hash avoids comparing each sidewalk to the entire town.
 const bins=new Map();for(const s of streets){const b=bounds(s.segment);for(let x=Math.floor((b[0]-.4)/2);x<=Math.floor((b[2]+.4)/2);x++)for(let y=Math.floor((b[1]-.4)/2);y<=Math.floor((b[3]+.4)/2);y++){const k=`${x},${y}`;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(s);}}
 const caps=new Set();let ordinal=0;
 for(const r of roads){const w=roadWidth(r.tags,scale);profiles.push({id:r.id,...w,highway:r.tags.highway});for(const segment of r.segments){const [a,b]=segment,d=[b[0]-a[0],b[1]-a[1]],length=Math.hypot(...d);if(length<1e-8)continue;
  const nearby=w.kind==='path'&&(r.tags.footway==='sidewalk'||r.tags.footway==='crossing'||r.tags.highway==='cycleway'||r.tags.highway==='footway');
  const mid=a.map((v,i)=>(v+b[i])/2),candidates=bins.get(`${Math.floor(mid[0]/2)},${Math.floor(mid[1]/2)}`)||[];
  const merged=nearby?candidates.find(s=>{const e=[s.segment[1][0]-s.segment[0][0],s.segment[1][1]-s.segment[0][1]],parallel=Math.abs(dot(d,e)/length/Math.hypot(...e));return parallel>.94&&[a,mid,b].every(p=>distance(p,...s.segment)<=s.width/2+w.gameM/2+.06);}):null;
  if(merged){aliases.push({sourceId:r.id,streetId:merged.id,segment,reason:'parallel sidewalk within street corridor; source retained'});continue;}
  const radius=w.gameM/2,n=[-d[1]/length*radius,d[0]/length*radius],color=w.kind==='path'?'#bbaa83':'#c8b58b';
  const common={sourceId:r.id,kind:w.kind,color,widthGameM:w.gameM,widthRealM:w.realM};
  surfaces.push({...common,id:`ribbon:${r.id}:${ordinal++}`,polygon:[[a[0]+n[0],a[1]+n[1]],[b[0]+n[0],b[1]+n[1]],[b[0]-n[0],b[1]-n[1]],[a[0]-n[0],a[1]-n[1]]]});
  for(const p of segment){const k=`${r.id}:${p.map(v=>v.toFixed(8))}:${radius}`;if(caps.has(k))continue;caps.add(k);surfaces.push({...common,id:`cap:${r.id}:${ordinal++}`,polygon:Array.from({length:12},(_,i)=>[p[0]+radius*Math.cos(i*Math.PI/6),p[1]+radius*Math.sin(i*Math.PI/6)])});}
 }}return {version:'continuous-ground-ribbons-v5',surfaces,aliases,profiles,minimumPathGameM:.085};
}
export function coverageMask(surfaces,box,step=.05,labels=false){
 const width=Math.round((box[2]-box[0])/step),height=Math.round((box[3]-box[1])/step),mask=new Uint8Array(width*height);
 for(const s of surfaces){const rings=s.rings||[s.polygon],b=s.bounds||bounds(rings[0]);if(!intersects(b,box))continue;
  const lo=[Math.max(0,Math.ceil((b[0]-box[0])/step-.5)),Math.max(0,Math.ceil((b[1]-box[1])/step-.5))],hi=[Math.min(width-1,Math.floor((b[2]-box[0])/step-.5)),Math.min(height-1,Math.floor((b[3]-box[1])/step-.5))];
  for(let y=lo[1];y<=hi[1];y++)for(let x=lo[0];x<=hi[0];x++){const i=y*width+x;if((labels||!mask[i])&&inside([box[0]+(x+.5)*step,box[1]+(y+.5)*step],rings))mask[i]=labels?(s.green?1:0):1;}
 }return mask;
}
