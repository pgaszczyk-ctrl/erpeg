/** Cached native-pixel building surfaces. Depth is y + 0.7z in metres, not sprite baseline. */
export interface Surface {
  id:string;
  x:number;y:number;width:number;height:number;
  pixels:Uint8ClampedArray;
  depth:Float32Array;
  depthOffset:number;
}
/** Remove only pixels physically behind another building. No whole-house depth heuristic:
 * a wall and a neighbouring roof can have different front/back order in the same picture. */
export function composeSurfaces(surfaces:Surface[]):Map<string,Uint8ClampedArray>{
  const ordered=[...surfaces].sort((a,b)=>a.id.localeCompare(b.id));
  const result=new Map(ordered.map(s=>[s.id,s.pixels.slice()]));
  for(let ai=0;ai<ordered.length;ai++)for(let bi=ai+1;bi<ordered.length;bi++){
    const a=ordered[ai],b=ordered[bi],x0=Math.max(a.x,b.x),y0=Math.max(a.y,b.y),x1=Math.min(a.x+a.width,b.x+b.width),y1=Math.min(a.y+a.height,b.y+b.height);
    if(x1<=x0||y1<=y0)continue;
    const aa=result.get(a.id)!,bb=result.get(b.id)!;
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      const ia=(y-a.y)*a.width+x-a.x,ib=(y-b.y)*b.width+x-b.x;
      if(!a.pixels[ia*4+3]||!b.pixels[ib*4+3])continue;
      // Stable ID tie-break avoids order-dependent seams on coincident coplanar pixels.
      if(a.depth[ia]+a.depthOffset>b.depth[ib]+b.depthOffset)bb[ib*4+3]=0;
      else aa[ia*4+3]=0;
    }
  }return result;
}

export interface Reveal {x:number;y:number;rx:number;ry:number}
export interface PixelRect {x:number;y:number;width:number;height:number}
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+.5)/16);
export function revealBounds(r:Reveal,width:number,height:number):PixelRect|null{
  const x=Math.max(0,Math.floor(r.x-r.rx*1.1)),y=Math.max(0,Math.floor(r.y-r.ry*1.1)),right=Math.min(width,Math.ceil(r.x+r.rx*1.1)),bottom=Math.min(height,Math.ceil(r.y+r.ry*1.1));
  return right>x&&bottom>y?{x,y,width:right-x,height:bottom-y}:null;
}
/** A small world-aligned dithered window, matching the trees' binary-alpha cut-away.
 * Returns a dirty rectangle; the immutable composed surface restores it when the hero leaves. */
export function revealPixels(surface:Surface,composed:Uint8ClampedArray,r:Reveal):{rect:PixelRect;pixels:Uint8ClampedArray;removed:number}|null{
  const rect=revealBounds(r,surface.width,surface.height);if(!rect)return null;
  const pixels=new Uint8ClampedArray(rect.width*rect.height*4);let removed=0;
  for(let y=0;y<rect.height;y++)for(let x=0;x<rect.width;x++){
    const sx=rect.x+x,sy=rect.y+y,src=(sy*surface.width+sx)*4,dst=(y*rect.width+x)*4;
    pixels.set(composed.subarray(src,src+4),dst);
    const radius=Math.hypot((sx+.5-r.x)/r.rx,(sy+.5-r.y)/r.ry),coverage=Math.max(0,Math.min(1,(radius-.85)/.25));
    if(pixels[dst+3]&&BAYER[((sy+surface.y)&3)*4+((sx+surface.x)&3)]>=coverage){pixels[dst+3]=0;removed++;}
  }
  return {rect,pixels,removed};
}
