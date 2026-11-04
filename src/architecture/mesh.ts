import { connectorHeight, exposedWalls } from './massing';
import { STYLES } from './catalog';
import { distance, rotate } from './geometry';
import type { BuildingMesh, BuildingPlan, Point, Rectangle } from './types';

type V = [number,number,number];
/** Actual 3D geometry, shared by WebGL and deterministic software fallback. Z is height. */
export function buildingMesh(b: BuildingPlan, lod = 0): BuildingMesh {
  const positions:number[]=[], normals:number[]=[], uv:number[]=[], tones:number[]=[], kinds:number[]=[], indices:number[]=[];
  const style=STYLES[b.decision.style];
  let roofAlongY=false;
  function triangle(a:V,c:V,d:V,p:number[],kind:number,tex?:Point[]){
    const u=c.map((v,i)=>v-a[i]),v=d.map((v,i)=>v-a[i]);
    let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const len=Math.hypot(...n)||1;n=n.map(x=>x/len);
    for(const [i,q]of [a,c,d].entries()){
      const r=rotate([q[0],q[1]],b.angle),rn=rotate([n[0],n[1]],b.angle);
      positions.push(r[0],r[1],q[2]);normals.push(rn[0],rn[1],n[2]);
      uv.push(...(tex?.[i]??(kind===1&&roofAlongY?[q[1],q[0]]:[q[0],q[1]])));tones.push(...p);kinds.push(kind);indices.push(indices.length);
    }
  }
  function quad(a:V,c:V,d:V,e:V,p:number[],kind:number,tex?:Point[]){triangle(a,c,d,p,kind,tex&&[tex[0],tex[1],tex[2]]);triangle(a,d,e,p,kind,tex&&[tex[0],tex[2],tex[3]]);}
  function wall(a:Point,c:Point,height:number,base=0,material=b.palette.wall){
    const l=distance(a,c),dx=(c[0]-a[0])/l,dy=(c[1]-a[1])/l;
    const p=(u:number,z:number,offset=0):V=>[a[0]+dx*u+dy*offset,a[1]+dy*u-dx*offset,z];
    const wallKind=style.facade_detail.includes('brick')?5:style.facade_detail.includes('boards')?6:0;
    const tower=base>=b.wallHeight, floors=tower?1:Math.max(1,Math.round(height/(b.wallHeight/b.levels))),floorHeight=tower?height-base:height/floors;
    quad(p(0,base),p(l,base),p(l,height),p(0,height),material,wallKind,[[0,base],[l,base],[l,height],[0,height]]);
    // Project the door onto this physical wall, independently of the camera.
    const worldA=rotate(a,b.angle),worldC=rotate(c,b.angle);
    const ax=worldA[0]+b.center[0],ay=worldA[1]+b.center[1],cx=worldC[0]+b.center[0],cy=worldC[1]+b.center[1];
    const along=((b.door[0]-ax)*(cx-ax)+(b.door[1]-ay)*(cy-ay))/(l*l);
    const doorWall=base===0&&Math.abs((b.door[0]-ax)*(cy-ay)-(b.door[1]-ay)*(cx-ax))/l<.15&&along>.02&&along<.98&&l>=b.openings.doorWidth+.6;
    function patch(u:number,z:number,w:number,h:number,palette:number[],kind:number,offset=.035){quad(p(u,z,offset),p(u+w,z,offset),p(u+w,z+h,offset),p(u,z+h,offset),palette,kind);}
    // One-pixel ink line on the eave and plinth; all colours reference the master palette.
    patch(0,Math.max(base,height-.18),l,.18,b.palette.trim,2);
    patch(0,base,l,.45,b.palette.trim,2);
    if(style.facade_detail.includes('timber')){
      const bays=Math.max(1,Math.round(l/b.openings.spacing)),step=l/bays,beam=Math.max(.2,b.openings.doorWidth*.045);
      for(let i=0;i<=bays;i++)patch(Math.min(l-beam,i*step),base,beam,height-base,b.palette.trim,2,.04);
      patch(0,height-.45,l,.3,b.palette.trim,2,.045);
      for(let level=1;level<floors;level++)patch(0,level*floorHeight-.15,l,.3,b.palette.trim,2,.045);
      for(let i=0;i<bays;i++){
        const u=i*step+beam,q1=p(u,base+.6,.05),q2=p(u+step*.65,base+(height-base)*.56,.05);
        quad(q1,q2,[q2[0]+dx*beam,q2[1]+dy*beam,q2[2]],[q1[0]+dx*beam,q1[1]+dy*beam,q1[2]],b.palette.trim,2);
      }
    }
    if(style.facade_detail.includes('cornice')){
      patch(0,height-.6,l,.3,b.palette.trim,2,.06);
      for(let level=1;level<floors;level++)patch(0,level*floorHeight-.15,l,.3,b.palette.trim,2,.06);
    }
    // The entrance is drawn even at far LOD. No structural beam may cover the opening.
    if(doorWall){
      const dw=b.openings.doorWidth,dh=b.openings.doorHeight,u=along*l-dw/2,frame=dh*.035;
      patch(u-frame,base,dw+frame*2,dh+frame,b.palette.trim,2,.1);
      patch(u,base,dw,dh,[0,1,3],8,.13);
      patch(u+dw*.08,base+dh*.08,Math.max(.18,dw*.035),dh*.82,b.palette.trim,2,.14);
      patch(u+dw*.8,base+dh*.48,.3,.3,[11,11,11],4,.16);
    }
    if(lod)return;
    const columns=Math.max(1,Math.floor(l/b.openings.spacing)),spacing=l/columns;
    const ww=Math.min(b.openings.windowWidth*(style.window_pattern.shape==='large'?1.2:1),spacing*.62);
    const wh=Math.min(b.openings.windowHeight,floorHeight*.38);
    for(let level=0;level<floors;level++)for(let col=0;col<columns;col++){
      const z=tower?base+Math.min(b.openings.doorHeight*.5,floorHeight*.35):level*floorHeight+b.openings.doorHeight*.5;
      if(z<base+.2||z+wh>height-.2)continue;
      const u=spacing*(col+.5)-ww/2;
      if(doorWall&&level===0&&Math.abs(u+ww/2-along*l)<(b.openings.doorWidth+ww)/2+.35)continue;
      if(b.decision.region==='arid'&&col%2!==0)continue;
      patch(u-.2,z-.2,ww+.4,wh+.4,b.palette.trim,2,.1);
      patch(u,z,ww,wh,[0,2,5],3,.12);
      patch(u+.25,z+wh-.5,.26,.26,[15,15,15],4,.14);
      patch(u+ww*.47,z,.18,wh,b.palette.trim,2,.15);
      patch(u-.3,z-.35,ww+.6,.18,b.palette.trim,2,.16);
    }
  }
  function roof(r:Rectangle,base:number,height:number,type=b.roof){
    // A cottage presents its gable above the road-facing entrance, making the house silhouette readable.
    const frontGable=b.rectangles.length===1&&(type==='gable'||type==='steep')&&!['industrial','landmark'].includes(b.decision.style);
    const longX=frontGable?false:r.w>=r.d;
    roofAlongY=!longX;
    const o=style.overhang,x=r.x-o,y=r.y-o,w=r.w+o*2,d=r.d+o*2,z=base;
    const a:V=[x,y,z],c:V=[x+w,y,z],e:V=[x+w,y+d,z],f:V=[x,y+d,z];
    const mat=b.palette.roof;
    if(type==='flat'){
      quad(a,c,e,f,mat,1);
      for(const [u,v]of [[a,c],[c,e],[e,f],[f,a]])quad(u,v,[v[0],v[1],z+.45],[u[0],u[1],z+.45],b.palette.trim,2);
      return;
    }
    const ridgeA:V=longX?[x,y+d/2,z+height]:[x+w/2,y,z+height];
    const ridgeB:V=longX?[x+w,y+d/2,z+height]:[x+w/2,y+d,z+height];
    if(type==='hip'){
      const inset=Math.min(w,d)*.3;
      if(longX){ridgeA[0]+=inset;ridgeB[0]-=inset;}else{ridgeA[1]+=inset;ridgeB[1]-=inset;}
      if(longX){quad(a,c,ridgeB,ridgeA,mat,1);quad(ridgeA,ridgeB,e,f,mat,1);triangle(a,ridgeA,f,mat,1);triangle(c,e,ridgeB,mat,1);}
      else{quad(a,ridgeA,ridgeB,f,mat,1);quad(ridgeA,c,e,ridgeB,mat,1);triangle(a,c,ridgeA,mat,1);triangle(f,ridgeB,e,mat,1);}
    }else if(type==='barrel'||type==='curved'){
      const segments=type==='barrel'?8:6;
      for(let k=0;k<segments;k++){
        const t=k/segments,t1=(k+1)/segments;
        const rise=(u:number)=>type==='barrel'?Math.sin(u*Math.PI)*height:height*(1-Math.abs(2*u-1))**.65;
        if(longX)quad([x,y+d*t,z+rise(t)],[x+w,y+d*t,z+rise(t)],[x+w,y+d*t1,z+rise(t1)],[x,y+d*t1,z+rise(t1)],mat,1);
        else quad([x+w*t,y,z+rise(t)],[x+w*t1,y,z+rise(t1)],[x+w*t1,y+d,z+rise(t1)],[x+w*t,y+d,z+rise(t)],mat,1);
        if(longX){quad([x,y+d*t,z],[x,y+d*t1,z],[x,y+d*t1,z+rise(t1)],[x,y+d*t,z+rise(t)],b.palette.wall,0);quad([x+w,y+d*t,z],[x+w,y+d*t,z+rise(t)],[x+w,y+d*t1,z+rise(t1)],[x+w,y+d*t1,z],b.palette.wall,0);}
        else{quad([x+w*t,y,z],[x+w*t,y,z+rise(t)],[x+w*t1,y,z+rise(t1)],[x+w*t1,y,z],b.palette.wall,0);quad([x+w*t,y+d,z],[x+w*t1,y+d,z],[x+w*t1,y+d,z+rise(t1)],[x+w*t,y+d,z+rise(t)],b.palette.wall,0);}
      }
    }else if(type==='sawtooth'){
      const count=Math.max(2,Math.min(8,Math.floor((longX?d:w)/5)));
      for(let k=0;k<count;k++){
        const lo=k/count,hi=(k+1)/count;
        if(longX){quad([x,y+d*lo,z],[x+w,y+d*lo,z],[x+w,y+d*hi,z+height*.6],[x,y+d*hi,z+height*.6],mat,1);quad([x,y+d*hi,z],[x,y+d*hi,z+height*.6],[x+w,y+d*hi,z+height*.6],[x+w,y+d*hi,z],b.palette.trim,3);triangle([x,y+d*lo,z],[x,y+d*hi,z],[x,y+d*hi,z+height*.6],b.palette.wall,0);triangle([x+w,y+d*lo,z],[x+w,y+d*hi,z+height*.6],[x+w,y+d*hi,z],b.palette.wall,0);}
        else{quad([x+w*lo,y,z],[x+w*hi,y,z+height*.6],[x+w*hi,y+d,z+height*.6],[x+w*lo,y+d,z],mat,1);quad([x+w*hi,y,z],[x+w*hi,y+d,z],[x+w*hi,y+d,z+height*.6],[x+w*hi,y,z+height*.6],b.palette.trim,3);triangle([x+w*lo,y,z],[x+w*hi,y,z+height*.6],[x+w*hi,y,z],b.palette.wall,0);triangle([x+w*lo,y+d,z],[x+w*hi,y+d,z],[x+w*hi,y+d,z+height*.6],b.palette.wall,0);}
      }
    }else{
      if(longX){quad(a,c,ridgeB,ridgeA,mat,1);quad(ridgeA,ridgeB,e,f,mat,1);triangle(a,ridgeA,f,b.palette.wall,0);triangle(c,e,ridgeB,b.palette.wall,0);}
      else{quad(a,ridgeA,ridgeB,f,mat,1);quad(ridgeA,c,e,ridgeB,mat,1);triangle(a,c,ridgeA,b.palette.wall,0);triangle(f,ridgeB,e,b.palette.wall,0);}
    }
    // Ridge cap, a light palette tone, and dark eaves are intentionally separate geometry.
    const dx=ridgeB[0]-ridgeA[0],dy=ridgeB[1]-ridgeA[1],len=Math.hypot(dx,dy)||1,nx=-dy/len*.12,ny=dx/len*.12;
    quad([ridgeA[0]-nx,ridgeA[1]-ny,ridgeA[2]+.05],[ridgeB[0]-nx,ridgeB[1]-ny,ridgeB[2]+.05],[ridgeB[0]+nx,ridgeB[1]+ny,ridgeB[2]+.05],[ridgeA[0]+nx,ridgeA[1]+ny,ridgeA[2]+.05],[mat[2],mat[2],mat[2]],2);
  }
  const volumes=[...b.rectangles.map(r=>({r,height:b.wallHeight,connector:false})),...b.connectors.map(r=>({r,height:connectorHeight(b.wallHeight,b.openings.doorHeight),connector:true}))];
  for(const segment of exposedWalls(volumes))wall(segment.a,segment.b,segment.height,segment.base);
  for(const {r,height,connector}of volumes)roof(r,height,connector?0:b.roofHeight,connector?'flat':b.roof);
  if(b.decision.style==='landmark'&&b.rectangles[0]){
    const r=b.rectangles[0],size=Math.max(3,Math.min(r.w,r.d)*.24),t=b.source.tags;
    function tower(x:number,y:number,type:'flat'|'hip'|'barrel',extra=12){
      const box={x,y,w:size,d:size},corners:Point[]=[[x,y],[x+size,y],[x+size,y+size],[x,y+size]];
      for(let i=0;i<4;i++)wall(corners[i],corners[(i+1)%4],b.wallHeight+extra,b.wallHeight);
      roof(box,b.wallHeight+extra,Math.min(10,b.roofHeight*1.3),type);
      if(type==='flat')for(let i=0;i<4;i++){
        const a=corners[i],c=corners[(i+1)%4];
        for(let k=0;k<4;k+=2){const u=k/4,v=(k+1)/4;quad([a[0]+(c[0]-a[0])*u,a[1]+(c[1]-a[1])*u,b.wallHeight+extra],[a[0]+(c[0]-a[0])*v,a[1]+(c[1]-a[1])*v,b.wallHeight+extra],[a[0]+(c[0]-a[0])*v,a[1]+(c[1]-a[1])*v,b.wallHeight+extra+1.2],[a[0]+(c[0]-a[0])*u,a[1]+(c[1]-a[1])*u,b.wallHeight+extra+1.2],b.palette.wall,0);}
      }
    }
    if(['castle','fort','citywalls','city_gate'].includes(t.historic)||['castle','gatehouse'].includes(t.building)){
      for(const [x,y]of [[r.x+.4,r.y+.4],[r.x+r.w-size-.4,r.y+.4],[r.x+.4,r.y+r.d-size-.4],[r.x+r.w-size-.4,r.y+r.d-size-.4]])tower(x,y,'flat',7);
    }else if(['synagogue','mosque'].includes(t.building)||t.denomination==='orthodox'){
      tower(r.x+r.w/2-size/2,r.y+r.d/2-size/2,'barrel',6);
      if(t.denomination==='orthodox'){tower(r.x+.5,r.y+.5,'barrel',8);tower(r.x+r.w-size-.5,r.y+r.d-size-.5,'barrel',8);}
    }else tower(r.x+r.w/2-size/2,r.y+r.d*.65-size/2,'hip');
  }
  return {positions:new Float32Array(positions),normals:new Float32Array(normals),uv:new Float32Array(uv),tones:new Float32Array(tones),kinds:new Float32Array(kinds),indices:new Uint32Array(indices)};
}
