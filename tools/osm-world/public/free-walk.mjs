import {moduleBoxes} from './building-geometry.mjs';
// Fine search lattice is an implementation detail. Position, collision sweeps,
// keyboard movement and the final smoothed path all use continuous game metres.
export class FreeWalk {
  constructor(box,modules,{step=.1,radius=.1,water=[]}={}) {
    this.box=box;this.step=step;this.radius=radius;this.water=water;
    this.obstacles=modules.flatMap(m=>moduleBoxes(m).map(b=>[b[0]-radius,b[1]-radius,b[2]+radius,b[3]+radius]));
    this.width=Math.round((box[2]-box[0])/step)+1;this.height=Math.round((box[3]-box[1])/step)+1;
    this.blocked=new Uint8Array(this.width*this.height);
    for(const r of this.obstacles){const lo=[Math.max(0,Math.ceil((r[0]-box[0])/step)),Math.max(0,Math.ceil((r[1]-box[1])/step))],hi=[Math.min(this.width-1,Math.floor((r[2]-box[0])/step)),Math.min(this.height-1,Math.floor((r[3]-box[1])/step))];for(let y=lo[1];y<=hi[1];y++)for(let x=lo[0];x<=hi[0];x++)this.blocked[y*this.width+x]=1;}
    // Water is optional, retained from source polygons rather than road cells.
    if(water.length)for(let i=0;i<this.blocked.length;i++)if(!this.blocked[i]&&this.inWater(this.point(i)))this.blocked[i]=1;
  }
  point(i){return [this.box[0]+(i%this.width)*this.step,this.box[1]+Math.floor(i/this.width)*this.step];}
  inWater(p){return this.water.some(rings=>{
    const inRing=r=>{let v=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])v=!v;}return v;};
    return inRing(rings[0])&&!rings.slice(1).some(inRing);
  });}
  free(p){const b=this.box,r=this.radius;if(p[0]<b[0]+r||p[1]<b[1]+r||p[0]>b[2]-r||p[1]>b[3]-r||this.inWater(p))return false;return !this.obstacles.some(o=>p[0]>=o[0]&&p[0]<=o[2]&&p[1]>=o[1]&&p[1]<=o[3]);}
  clear(a,b){if(!this.free(a)||!this.free(b))return false;
    for(const r of this.obstacles){let lo=0,hi=1;const d=[b[0]-a[0],b[1]-a[1]];let hit=true;for(let axis=0;axis<2;axis++){if(Math.abs(d[axis])<1e-12){if(a[axis]<r[axis]||a[axis]>r[axis+2]){hit=false;break;}}else{let x=(r[axis]-a[axis])/d[axis],y=(r[axis+2]-a[axis])/d[axis];if(x>y)[x,y]=[y,x];lo=Math.max(lo,x);hi=Math.min(hi,y);if(lo>hi){hit=false;break;}}}if(hit)return false;}
    // Segment/ring edge intersections prevent crossing even a very thin pond.
    for(const rings of this.water)for(const ring of rings)for(let i=0;i<ring.length;i++){const c=ring[i],d=ring[(i+1)%ring.length],cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return false;}
    return true;
  }
  move(pos,delta){let p=[...pos];const n=Math.max(1,Math.ceil(Math.hypot(...delta)/.04));for(let i=0;i<n;i++){const d=delta.map(v=>v/n),q=p.map((v,j)=>v+d[j]);if(this.clear(p,q)){p=q;continue;}for(let axis=0;axis<2;axis++){const s=[...p];s[axis]+=d[axis];if(this.clear(p,s))p=s;}}return p;}
  nearby(p){const x=Math.round((p[0]-this.box[0])/this.step),y=Math.round((p[1]-this.box[1])/this.step),choices=[];for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=this.width||yy>=this.height)continue;const i=yy*this.width+xx;if(!this.blocked[i])choices.push(i);}return choices.sort((a,b)=>{const pa=this.point(a),pb=this.point(b);return Math.hypot(pa[0]-p[0],pa[1]-p[1])-Math.hypot(pb[0]-p[0],pb[1]-p[1]);}).find(i=>this.clear(p,this.point(i)));}
  route(start,goal){if(!this.free(start)||!this.free(goal))return null;if(this.clear(start,goal))return [[...start],[...goal]];
    const s=this.nearby(start),end=this.nearby(goal);if(s===undefined||end===undefined)return null;
    const size=this.blocked.length,g=new Float32Array(size).fill(Infinity),prev=new Int32Array(size).fill(-1),closed=new Uint8Array(size),heap=[];
    const push=(i,f)=>{let n=heap.length;heap.push({i,f});while(n){const p=(n-1)>>1;if(heap[p].f<=f)break;heap[n]=heap[p];n=p;}heap[n]={i,f};};
    const pop=()=>{const result=heap[0],last=heap.pop();if(heap.length){let i=0;while(true){let c=i*2+1;if(c>=heap.length)break;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=last.f)break;heap[i]=heap[c];i=c;}heap[i]=last;}return result.i;};
    const ex=end%this.width,ey=Math.floor(end/this.width),heur=i=>Math.hypot(i%this.width-ex,Math.floor(i/this.width)-ey);g[s]=0;push(s,heur(s));let visits=0;
    while(heap.length&&visits<300000){const i=pop();if(closed[i])continue;closed[i]=1;visits++;if(i===end){const raw=[];for(let n=end;n!==-1;n=prev[n])raw.push(this.point(n));raw.reverse();raw.unshift(start);raw.push(goal);
      // Greedy visibility smoothing removes lattice turns and keeps exact ends.
      const path=[start];let from=0;while(from<raw.length-1){let next=raw.length-1;while(next>from+1&&!this.clear(raw[from],raw[next]))next--;if(!this.clear(raw[from],raw[next]))return null;path.push(raw[next]);from=next;}return path;
    }
    const x=i%this.width,y=Math.floor(i/this.width);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const xx=x+dx,yy=y+dy;if(xx<1||yy<1||xx>=this.width-1||yy>=this.height-1)continue;const n=yy*this.width+xx;if(this.blocked[n]||closed[n]||(dx&&dy&&(this.blocked[y*this.width+xx]||this.blocked[yy*this.width+x])))continue;const cost=g[i]+Math.hypot(dx,dy);if(cost+1e-4<g[n]){g[n]=cost;prev[n]=i;push(n,cost+heur(n));}}
    }return null;
  }
}
