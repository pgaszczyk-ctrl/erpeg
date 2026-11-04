import { contains, distance, principalAngle, rotate } from './geometry';
import type { Point, Rectangle } from './types';

/** Large wall axes, rather than raster stair steps, define roof volumes. Units: metres. */
export function massing(rings: Point[][], center: Point): {angle:number; rectangles:Rectangle[]; connectors:Rectangle[]; connected:boolean} {
  if (!rings[0]?.length) return {angle:0,rectangles:[],connectors:[],connected:false};
  const angle=principalAngle(rings[0]);
  const local=rings.map(r=>r.filter((p,i)=>!i||distance(p,r[i-1])>1e-7).map(p=>rotate([p[0]-center[0],p[1]-center[1]],-angle)));
  const holes=local.slice(1).map(r=>({x:Math.min(...r.map(p=>p[0])),y:Math.min(...r.map(p=>p[1])),w:Math.max(...r.map(p=>p[0]))-Math.min(...r.map(p=>p[0])),d:Math.max(...r.map(p=>p[1]))-Math.min(...r.map(p=>p[1]))}));
  const values:[number,number][][]=[[],[]];
  for(const ring of local)for(let i=0;i<ring.length;i++){
    const p=ring[i],q=ring[(i+1)%ring.length],dx=Math.abs(q[0]-p[0]),dy=Math.abs(q[1]-p[1]),length=distance(p,q);
    if(length<.6)continue;
    if(dx<dy*.3)values[0].push([(p[0]+q[0])/2,length]);
    if(dy<dx*.3)values[1].push([(p[1]+q[1])/2,length]);
  }
  function axes(items:[number,number][],axis:number){
    const sorted=items.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    // Bound work for unusually detailed imported footprints, independent of vertex order.
    let tolerance=4,result:number[]=[];
    do{
      const groups:{first:number;sum:number;weight:number}[]=[];
      for(const [v,w]of sorted){let g=groups.at(-1);if(!g||v-g.first>tolerance){g={first:v,sum:0,weight:0};groups.push(g);}g.sum+=v*w;g.weight+=w;}
      result=groups.map(g=>g.sum/g.weight);tolerance*=1.5;
    }while(result.length>32);
    if(result.length<2)result=[Math.min(...local[0].map(p=>p[axis])),Math.max(...local[0].map(p=>p[axis]))];
    // Protect the complete courtyard, including its edges, not just its centre sample.
    for(const h of holes)result.push(axis===0?h.x:h.y,axis===0?h.x+h.w:h.y+h.d);
    return result.sort((a,b)=>a-b).filter((v,i,a)=>!i||v-a[i-1]>1e-6);
  }
  const xx=axes(values[0],0),yy=axes(values[1],1),w=xx.length-1,h=yy.length-1;
  const intersectsHole=(r:Rectangle)=>holes.some(q=>Math.min(r.x+r.w,q.x+q.w)-Math.max(r.x,q.x)>1e-6&&Math.min(r.y+r.d,q.y+q.d)-Math.max(r.y,q.y)>1e-6);
  // Pathological multi-courtyard polygons are omitted rather than blocking the worker.
  if(w>96||h>96)return {angle,rectangles:[],connectors:[],connected:false};
  const mask=new Uint8Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const r={x:xx[x],y:yy[y],w:xx[x+1]-xx[x],d:yy[y+1]-yy[y]};let votes=0;
    if(intersectsHole(r))continue;
    for(const fy of [.2,.5,.8])for(const fx of [.2,.5,.8])if(contains(local[0],[r.x+r.w*fx,r.y+r.d*fy]))votes++;
    mask[y*w+x]=Number(votes>=5);
  }
  const partition:Rectangle[]=[];
  for(let iteration=0;iteration<64;iteration++){
    let best={area:0,x0:0,x1:0,y0:0,y1:0};
    for(let y0=0;y0<h;y0++){
      const valid=new Uint8Array(w).fill(1);
      for(let y1=y0+1;y1<=h;y1++){
        for(let x=0;x<w;x++)valid[x]&=mask[(y1-1)*w+x];
        let start=-1;
        for(let x=0;x<=w;x++){
          if(x<w&&valid[x]){if(start<0)start=x;}
          else if(start>=0){const area=(xx[x]-xx[start])*(yy[y1]-yy[y0]);if(area>best.area+1e-8)best={area,x0:start,x1:x,y0,y1};start=-1;}
        }
      }
    }
    if(!best.area)break;
    const {x0,x1,y0,y1}=best;
    for(let y=y0;y<y1;y++)mask.fill(0,y*w+x0,y*w+x1);
    const r={x:xx[x0],y:yy[y0],w:xx[x1]-xx[x0],d:yy[y1]-yy[y0]};
    if(best.area>=20&&Math.min(r.w,r.d)>=3)partition.push(r);
  }
  const first=partition[0],minimum=first?Math.max(3,Math.min(first.w,first.d)*.5):3;
  const rectangles=partition.filter(r=>r.w*r.d>=first.w*first.d*.15&&Math.min(r.w,r.d)>=minimum),connectors:Rectangle[]=[];
  function safeLink(r:Rectangle){
    if(intersectsHole(r))return false;
    // Allow simplification of shallow recesses, never a bridge across a large outdoor void.
    for(const fx of [.1,.5,.9])for(const fy of [.1,.5,.9]){
      const p:Point=[r.x+r.w*fx,r.y+r.d*fy];
      if(!contains(local[0],p)&&!local[0].some((a,i)=>{
        const b=local[0][(i+1)%local[0].length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
        return distance(p,[a[0]+dx*t,a[1]+dy*t])<=4;
      }))return false;
    }
    return true;
  }
  for(let iteration=0;iteration<rectangles.length*2;iteration++){
    const all=[...rectangles,...connectors],groups=components(all);if(groups.length<=1)break;
    const options:{cost:number;r:Rectangle}[]=[];
    for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++)for(const ai of groups[i])for(const bi of groups[j]){
      const a=all[ai],b=all[bi],clamp=(v:number,l:number,u:number)=>Math.max(l,Math.min(u,v));
      const p:Point=[clamp(b.x+b.w/2,a.x,a.x+a.w),clamp(b.y+b.d/2,a.y,a.y+a.d)];
      const q:Point=[clamp(a.x+a.w/2,b.x,b.x+b.w),clamp(a.y+a.d/2,b.y,b.y+b.d)];
      const cost=distance(p,q);if(cost>12)continue;
      const width=Math.max(3,Math.abs(q[0]-p[0])+.3),depth=Math.max(3,Math.abs(q[1]-p[1])+.3);
      const r={x:(p[0]+q[0]-width)/2,y:(p[1]+q[1]-depth)/2,w:width,d:depth};
      if(safeLink(r))options.push({cost,r});
    }
    options.sort((a,b)=>a.cost-b.cost||a.r.x-b.r.x||a.r.y-b.r.y);
    if(!options.length)break;connectors.push(options[0].r);
  }
  return {angle,rectangles,connectors,connected:components([...rectangles,...connectors]).length===1};
}
export function touching(a:Rectangle,b:Rectangle){
  const x=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),y=Math.min(a.y+a.d,b.y+b.d)-Math.max(a.y,b.y);
  return x>=-1e-5&&y>=-1e-5&&Math.max(x,y)>.1;
}
export function components(rectangles:Rectangle[]):number[][]{
  const unseen=new Set(rectangles.map((_,i)=>i)),groups:number[][]=[];
  while(unseen.size){const first=unseen.values().next().value!;unseen.delete(first);const group=[first];
    for(let at=0;at<group.length;at++)for(const i of unseen)if(touching(rectangles[group[at]],rectangles[i])){unseen.delete(i);group.push(i);}
    groups.push(group);
  }return groups;
}
/** Every connector is single-storey and lower than even a one-storey main wing. */
export const connectorHeight=(wallHeight:number,doorHeight:number)=>Math.min(wallHeight*.8,doorHeight*1.15);

/** Split only at touching volumes; omit internal walls and keep exposed upper storeys. */
export function exposedWalls(volumes:{r:Rectangle;height:number}[]){
  const segments:{a:Point;b:Point;height:number;base:number}[]=[];
  for(const volume of volumes){
    const {r,height}=volume,corners:Point[]=[[r.x,r.y],[r.x+r.w,r.y],[r.x+r.w,r.y+r.d],[r.x,r.y+r.d]];
    for(let i=0;i<4;i++){
      const a=corners[i],b=corners[(i+1)%4],length=distance(a,b),dx=(b[0]-a[0])/length,dy=(b[1]-a[1])/length,cuts=[0,length];
      const neighbours=volumes.filter(v=>{
        if(v===volume)return false;
        const outside=dx?a[1]-dx*.001:a[0]+dy*.001,low=dx?v.r.y:v.r.x,high=low+(dx?v.r.d:v.r.w);
        return outside>low&&outside<high;
      });
      for(const v of neighbours)for(const p of [[v.r.x,v.r.y],[v.r.x+v.r.w,v.r.y+v.r.d]]){
        const u=(p[0]-a[0])*dx+(p[1]-a[1])*dy;if(u>0&&u<length)cuts.push(u);
      }
      cuts.sort((a,b)=>a-b);
      for(let j=0;j+1<cuts.length;j++){
        const lo=cuts[j],hi=cuts[j+1];if(hi-lo<.01)continue;
        const mid=(lo+hi)/2,x=a[0]+dx*mid+dy*.001,y=a[1]+dy*mid-dx*.001;
        const hidden=neighbours.filter(v=>x>v.r.x&&x<v.r.x+v.r.w&&y>v.r.y&&y<v.r.y+v.r.d);
        const base=Math.max(0,...hidden.map(v=>v.height));
        if(base<height-.01)segments.push({a:[a[0]+dx*lo,a[1]+dy*lo],b:[a[0]+dx*hi,a[1]+dy*hi],height,base});
      }
    }
  }return segments;
}
