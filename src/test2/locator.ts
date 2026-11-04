import {CityMap,PX_PER_M} from '../map/CityMap';
import type {BuildingPlan} from '../architecture/types';
import {LUBLIN_OVERVIEW} from './locations';
const ROAD_KINDS=new Set(['major','medium','minor','service','pedestrian','path','steps','rail']);
/** A north-up OSM reference. It never rewrites the game map, camera or controls. */
export class LublinLocator {
  private image=new Image();
  private overview=true;
  private last=0;
  private initialized=false;
  private overviewBitmap?:HTMLCanvasElement;
  private bitmapKey='';
  constructor(private canvas:HTMLCanvasElement,private label:HTMLElement,private osm:HTMLAnchorElement,private button:HTMLButtonElement){
    this.image.src=`${import.meta.env.BASE_URL}architecture/lublin-reference.svg`;
    button.onclick=()=>{this.overview=!this.overview;this.last=0;this.refreshButton();};this.refreshButton();
  }
  private refreshButton(){this.button.textContent=this.overview?'Okolica':'Cały Lublin';this.button.setAttribute('aria-label',this.overview?'Pokaż plan okolicy':'Pokaż plan całego Lublina');}
  update(city:CityMap,x:number,y:number,camera:{worldView:{left:number;right:number;top:number;bottom:number}},plans:BuildingPlan[],now:number){
    if(now-this.last<300&&this.initialized)return;this.last=now;this.initialized=true;
    const ll=city.toLatLon(x,y),street=city.streetNear(x,y,150*PX_PER_M)??city.nearestAddress(x,y,100);
    this.label.textContent=street?`Lublin · ${street}`:'Lublin';
    this.osm.href=`https://www.openstreetmap.org/?mlat=${ll.lat.toFixed(6)}&mlon=${ll.lon.toFixed(6)}#map=17/${ll.lat.toFixed(6)}/${ll.lon.toFixed(6)}`;
    const width=this.canvas.clientWidth,height=this.canvas.clientHeight,dpr=Math.min(2,window.devicePixelRatio||1);
    if(this.canvas.width!==Math.round(width*dpr)||this.canvas.height!==Math.round(height*dpr)){this.canvas.width=Math.round(width*dpr);this.canvas.height=Math.round(height*dpr);}
    const ctx=this.canvas.getContext('2d')!;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#f4ecd9';ctx.fillRect(0,0,width,height);
    let left:number,top:number,right:number,bottom:number;
    if(this.overview){const nw=city.fromLatLon(LUBLIN_OVERVIEW.north,LUBLIN_OVERVIEW.west),se=city.fromLatLon(LUBLIN_OVERVIEW.south,LUBLIN_OVERVIEW.east);left=nw.x;top=nw.y;right=se.x;bottom=se.y;}
    else{const radius=240*PX_PER_M;left=x-radius;right=x+radius;top=y-radius;bottom=y+radius;}
    const scale=Math.min((width-10)/(right-left),(height-10)/(bottom-top)),ox=(width-(right-left)*scale)/2,oy=(height-(bottom-top)*scale)/2;
    const point=(px:number,py:number):[number,number]=>[ox+(px-left)*scale,oy+(py-top)*scale];
    ctx.save();ctx.beginPath();ctx.rect(ox,oy,(right-left)*scale,(bottom-top)*scale);ctx.clip();
    if(this.overview&&this.image.complete&&this.image.naturalWidth){
      // Rasterize the city overview once per size, not on every player step.
      const key=`${width},${height},${dpr}`;
      if(!this.overviewBitmap||this.bitmapKey!==key){
        const cached=document.createElement('canvas');cached.width=this.canvas.width;cached.height=this.canvas.height;
        const c=cached.getContext('2d')!;c.setTransform(dpr,0,0,dpr,0,0);c.drawImage(this.image,ox,oy,(right-left)*scale,(bottom-top)*scale);this.overviewBitmap=cached;this.bitmapKey=key;
      }
      ctx.drawImage(this.overviewBitmap,0,0,width,height);
    }
    else{
      const data=city.query({x0:left,y0:top,x1:right,y1:bottom});
      ctx.fillStyle='#a49b8c';
      for(const b of data.buildings){ctx.beginPath();for(const ring of b.rings){for(let i=0;i<ring.length;i+=2){const p=point(ring[i],ring[i+1]);i?ctx.lineTo(...p):ctx.moveTo(...p);}ctx.closePath();}ctx.fill('evenodd');}
      for(const road of data.lines)if(ROAD_KINDS.has(road.kind)){ctx.strokeStyle='#665e52';ctx.lineWidth=Math.max(.7,road.width*scale);ctx.beginPath();for(let i=0;i<road.pts.length;i+=2){const p=point(road.pts[i],road.pts[i+1]);i?ctx.lineTo(...p):ctx.moveTo(...p);}ctx.stroke();}
      // The original OSM footprint stays visible underneath the selected generated body.
      ctx.strokeStyle='#b07012';ctx.lineWidth=1.3;
      for(const b of plans)for(const ring of b.footprints){ctx.beginPath();ring.forEach((p,i)=>{const q=point(p[0]*PX_PER_M,p[1]*PX_PER_M);i?ctx.lineTo(...q):ctx.moveTo(...q);});ctx.closePath();ctx.stroke();}
      const names=new Set<string>();ctx.font='9px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
      for(const road of data.lines)if(road.name&&!names.has(road.name)&&names.size<5){const i=Math.floor(road.pts.length/4)*2,p=point(road.pts[i],road.pts[i+1]);if(p[0]<20||p[0]>width-20||p[1]<12||p[1]>height-12)continue;names.add(road.name);ctx.lineWidth=3;ctx.strokeStyle='#f4ecd9';ctx.strokeText(road.name,...p);ctx.fillStyle='#302a22';ctx.fillText(road.name,...p);}
    }
    const v=camera.worldView,a=point(v.left,v.top),b=point(v.right,v.bottom);ctx.strokeStyle='#417292';ctx.lineWidth=1;ctx.strokeRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);
    const p=point(x,y);ctx.fillStyle='#b2453a';ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p[0],p[1],4,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
    ctx.fillStyle='#302a22';ctx.font='bold 10px system-ui';ctx.textAlign='right';ctx.textBaseline='top';ctx.fillText('N ↑',width-5,5);
    if(!this.overview){const metres=100,bar=metres*PX_PER_M*scale;ctx.strokeStyle='#302a22';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(8,height-9);ctx.lineTo(8+bar,height-9);ctx.stroke();ctx.textAlign='left';ctx.textBaseline='bottom';ctx.fillText('100 m',8,height-11);}
  }
}
