// EPSG:2180 / ETRS89 Poland CS92: GRS80, lon0=19°, k0=.9993,
// false easting=500000, false northing=-5300000. Snyder TM series (local Poland).
export function project([lon,lat],c){
 const a=6378137,f=1/298.257222101,e2=f*(2-f),ep=e2/(1-e2),phi=lat*Math.PI/180,lambda=(lon-19)*Math.PI/180;
 const sin=Math.sin(phi),cos=Math.cos(phi),tan=Math.tan(phi),N=a/Math.sqrt(1-e2*sin*sin),T=tan*tan,C=ep*cos*cos,A=lambda*cos;
 const M=a*((1-e2/4-3*e2**2/64-5*e2**3/256)*phi-(3*e2/8+3*e2**2/32+45*e2**3/1024)*Math.sin(2*phi)+(15*e2**2/256+45*e2**3/1024)*Math.sin(4*phi)-35*e2**3/3072*Math.sin(6*phi));
 const east=500000+.9993*N*(A+(1-T+C)*A**3/6+(5-18*T+T*T+72*C-58*ep)*A**5/120);
 const north=-5300000+.9993*(M+N*tan*(A*A/2+(5-T+9*C+4*C*C)*A**4/24+(61-58*T+T*T+600*C-330*ep)*A**6/720));
 return [east*c.realToGame,north*c.realToGame];
}
export const key=p=>p.map(x=>Math.round(x*1e6)/1e6).join(',');
export function hash(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(16)}
// Conservative supercover: includes both side cells on exact corner crossings.
export function supercover(a,b,size=.5){let x=Math.floor(a[0]/size),y=Math.floor(a[1]/size),ex=Math.floor(b[0]/size),ey=Math.floor(b[1]/size);const out=[[x,y]],dx=b[0]-a[0],dy=b[1]-a[1],sx=Math.sign(dx),sy=Math.sign(dy),tx=dx?Math.abs(size/dx):Infinity,ty=dy?Math.abs(size/dy):Infinity;let mx=dx?((x+(sx>0?1:0))*size-a[0])/dx:Infinity,my=dy?((y+(sy>0?1:0))*size-a[1])/dy:Infinity;for(let i=0;i<50000&&(x!==ex||y!==ey);i++){if(Math.abs(mx-my)<1e-10){out.push([x+sx,y],[x,y+sy]);x+=sx;y+=sy;mx+=tx;my+=ty}else if(mx<my){x+=sx;mx+=tx}else{y+=sy;my+=ty}out.push([x,y])}return out}
export function inside(p,rings){const ring=r=>{let v=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])v=!v}return v};return ring(rings[0])&&!rings.slice(1).some(ring)}
export function astar(start,goal,walk,max=500000){const sk=start.join(','),gk=goal.join(','),queue=[sk],prev=new Map([[sk,null]]);for(let i=0;i<queue.length&&i<max;i++){let k=queue[i];if(k===gk){const path=[];while(k){path.push(k.split(',').map(Number));k=prev.get(k)}return path.reverse()}const [x,y]=k.split(',').map(Number);for(const p of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){const n=p.join(',');if(walk.has(n)&&!prev.has(n)){prev.set(n,k);queue.push(n)}}}return null}
export const chunk=p=>p.map(x=>Math.floor(x/64)).join(',');
