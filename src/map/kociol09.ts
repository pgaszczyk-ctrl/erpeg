import { hex, ustaw, rurociagWzdluz, type Obraz } from '../gen';
import type { Kociol09 } from './rury09';

/** Temporary replaceable brass boiler, drawn on the same pixel grid as the world.
 * Coordinates in generator pixels. No gameplay/collision role yet.
 */
export function malujKociol(o: Obraz, ox: number, oy: number, k: Kociol09): [number, number] {
  rurociagWzdluz(o, [k.pipeX,k.pipeY,k.x,k.y], ox, oy, 0, 'nic', 'nic', true);
  const x=Math.round(k.x), y=Math.round(k.y);
  if(x+25<ox || x-18>ox+o.w || y+8<oy || y-46>oy+o.h) return [x+9,y-45];
  const ink=hex('#1e1a24'), dark=hex('#4a3216'), mid=hex('#9a6420'), brass=hex('#c8963e'), light=hex('#e9c56a');
  const put=(dx:number,dy:number,c:number)=>ustaw(o,x+dx-ox,y+dy-oy,c);
  const rect=(a:number,b:number,w:number,h:number,c:number)=>{
    for(let j=b;j<b+h;j++)for(let i=a;i<a+w;i++)put(i,j,c);
  };
  const oval=(cx:number,cy:number,rx:number,ry:number,outer:number,inner:number)=>{
    for(let j=-ry;j<=ry;j++)for(let i=-rx;i<=rx;i++){
      const d=i*i/(rx*rx)+j*j/(ry*ry);
      if(d<=1)put(cx+i,cy+j,d>.68?outer:inner);
    }
  };
  // Stone foundation, raised vertical tank and elliptical top: slightly top-down.
  rect(-15,-3,33,8,ink);rect(-14,-2,30,5,hex('#6a6361'));
  rect(-10,-5,5,7,dark);rect(6,-5,5,7,dark);
  rect(-12,-32,25,27,ink);rect(-11,-31,23,26,dark);
  rect(-8,-31,16,25,mid);rect(-7,-30,4,24,brass);rect(-6,-29,2,22,light);
  oval(0,-32,12,5,ink,brass);oval(0,-33,8,2,dark,light);
  oval(0,-7,11,4,ink,mid);
  for(const yy of [-27,-11]){
    rect(-12,yy,25,3,dark);rect(-11,yy,22,1,light);
    for(const xx of [-9,-2,5,10])put(xx,yy+1,ink);
  }
  // Pale pressure dial with a red needle, furnace hatch, side valve wheel.
  oval(2,-22,6,6,ink,light);oval(2,-22,4,4,dark,hex('#eee2bc'));
  rect(2,-25,1,4,hex('#aa4430'));put(1,-22,ink);put(2,-22,ink);
  rect(-4,-15,10,7,ink);rect(-3,-14,8,5,dark);
  for(let xx=-2;xx<=3;xx+=2)rect(xx,-13,1,3,brass);
  rect(12,-19,5,3,brass);oval(19,-18,4,4,ink,hex('#99472b'));
  rect(18,-21,2,7,brass);rect(16,-19,7,2,brass);
  // Chimney above the tank. Steam uses the existing animated world effect.
  rect(6,-43,6,10,ink);rect(7,-42,4,9,dark);rect(7,-42,1,9,brass);
  rect(4,-44,10,3,ink);rect(5,-44,8,1,light);
  return [x+9,y-45];
}
