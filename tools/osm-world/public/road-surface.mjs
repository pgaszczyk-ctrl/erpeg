const key=p=>p.join(',');
const edgeKey=(a,b)=>[key(a),key(b)].sort().join('|');
export function polygonIntersectsBox(poly,box){
 const rect=[[box[0],box[1]],[box[2],box[1]],[box[2],box[3]],[box[0],box[3]]];
 const axes=[[1,0],[0,1],...poly.map((p,i)=>{const n=poly[(i+1)%poly.length];return [p[1]-n[1],n[0]-p[0]]})];
 return axes.every(axis=>{const a=poly.map(p=>p[0]*axis[0]+p[1]*axis[1]),b=rect.map(p=>p[0]*axis[0]+p[1]*axis[1]);return Math.max(...a)>Math.min(...b)+1e-9&&Math.max(...b)>Math.min(...a)+1e-9});
}
export function buildRoadSurface(cells,modules,box,blocked=()=>false){
 const roads=new Map(cells.map(c=>[key(c.xy),c])),tiles=[],connectors=[],links=new Map();
 const has=p=>roads.has(key(p));
 const shared=(...points)=>roads.get(key(points[0]))?.sourceIds.filter(id=>points.every(p=>roads.get(key(p))?.sourceIds.includes(id)))||[];
 const addLink=(a,b,ids)=>{if(ids.length)links.set(edgeKey(a,b),{id:edgeKey(a,b),cells:[a,b],sourceIds:ids});};
 for(const c of cells){const [x,y]=c.xy,vertices=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]],poly=[];
  for(let i=0;i<4;i++){
   const v=vertices[i],prev=vertices[(i+3)%4],next=vertices[(i+1)%4];
   const outside=[[x-1,y],[x,y-1],[x+1,y],[x,y+1]];
   // A convex exterior step becomes a diagonal bevel. Cell centers and the
   // full half-cell-wide orthogonal passage remain on the visible surface.
   if(!has(outside[i])&&!has(outside[(i+1)%4])){
    poly.push([(v[0]+prev[0])/2,(v[1]+prev[1])/2],[(v[0]+next[0])/2,(v[1]+next[1])/2]);
   }else poly.push(v);
  }
  tiles.push({xy:c.xy,polygon:poly});
  for(const [dx,dy] of [[1,1],[1,-1]]){const b=[x+dx,y+dy],o1=[x+dx,y],o2=[x,y+dy];if(has(b)&&has(o1)&&has(o2))addLink(c.xy,b,shared(c.xy,b,o1,o2));}
 }
 // Fill only an empty inside corner of the SAME source road. A triangular
 // connector links its two diagonal cells without occupying the whole plot.
 const candidates=new Set();for(const c of cells)for(const dx of [-1,0,1])for(const dy of [-1,0,1]){const p=[c.xy[0]+dx,c.xy[1]+dy];if(!has(p))candidates.add(key(p));}
 for(const k of [...candidates].sort()){const [x,y]=k.split(',').map(Number);if(x<box[0]||y<box[1]||x>=box[2]||y>=box[3])continue;
  for(const [sx,sy] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
   const a=[x+sx,y],b=[x,y+sy],diag=[x+sx,y+sy],ids=shared(a,b,diag);if(!ids.length)continue;
   const v=[x+(sx>0?1:0),y+(sy>0?1:0)],poly=[v,[v[0]-sx*.5,v[1]],[v[0],v[1]-sy*.5]];
   if(blocked(poly)||modules.some(m=>polygonIntersectsBox(poly,[m.pos[0]-m.w/2,m.pos[1]-m.d/2,m.pos[0]+m.w/2,m.pos[1]+m.d/2])))continue;
   const id=`corner:${k}:${sx},${sy}`;connectors.push({id,xy:[x,y],polygon:poly,sourceIds:ids,cells:[a,b]});addLink(a,b,ids);
  }
 }
 return {tiles,connectors,diagonalLinks:[...links.values()].sort((a,b)=>a.id.localeCompare(b.id))};
}
export function findRoadPath(start,goal,roadSet,diagonalLinks){
 const links=new Set(diagonalLinks.map(l=>l.id)),sk=key(start),gk=key(goal),queue=[sk],prev=new Map([[sk,null]]);
 for(let i=0;i<queue.length;i++){const k=queue[i];if(k===gk){const out=[];let p=k;while(p){out.push(p.split(',').map(Number));p=prev.get(p)}return out.reverse()}
  const a=k.split(',').map(Number);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const b=[a[0]+dx,a[1]+dy],n=key(b);if(!roadSet.has(n)||prev.has(n))continue;if(dx&&dy&&!links.has(edgeKey(a,b)))continue;prev.set(n,k);queue.push(n);}
 }return null;
}
