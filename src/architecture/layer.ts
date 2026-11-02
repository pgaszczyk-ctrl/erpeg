import { composeSurfaces, revealBounds, revealPixels, type Surface, type PixelRect, type Reveal } from './occlusion';
import Phaser from 'phaser';
import { CityMap, PX_PER_M } from '../map/CityMap';
import { GROUND_DEPTH, type MapRenderer } from '../map/MapRenderer';
import { PALETTE, STYLES } from './catalog';
import { connectorHeight } from './massing';
import { blockedByPlans } from './collision';
import { closest, distance, hash } from './geometry';
import { ArchitectureData } from './source';
import type { Raster } from './raster';
import type { DebugSettings } from './debug';
import { characterReference, type CharacterReference } from './proportions';
import type { BuildingPlan, PlanInput, PlanResult, Point } from './types';

interface SpriteEntry { image:Phaser.GameObjects.Image; key:string; bytes:number; lod:number; label?:Phaser.GameObjects.Text; decorations:Phaser.GameObjects.Image[]; shadow?:Phaser.GameObjects.Image; shadowKey?:string; signature:string; texture:Phaser.Textures.CanvasTexture; surface:Surface; composed:ImageData; revealKey?:string; revealRect?:PixelRect }
interface Pending { resolve:(value:any)=>void; reject:(error:Error)=>void }
const ART_DENSITY=2,MAX_TEXTURE_BYTES=32*1024*1024;
let serial=0;

export class ArchitectureLayer {
  private worker=new Worker(new URL('./architecture.worker.ts',import.meta.url),{type:'module'});
  private data:ArchitectureData;
  private pending=new Map<number,Pending>();
  private sequence=0;
  private sprites=new Map<string,SpriteEntry>();
  private jobs=new Set<string>();
  private failed=new Map<string,string>();
  private generation=0;
  private disposed=false;
  private planning=false;
  private dirty=true;
  private projection=1;
  private lastOrigin:Point=[Infinity,Infinity];
  private lastTileCount=0;
  private lastRefresh=0;
  private plan?:PlanResult;
  private planById=new Map<string,BuildingPlan>();
  private sourceFallback=false;
  private failures:string[]=[];
  private backend='przygotowanie';
  private textureBytes=0;
  private started=performance.now();
  private firstReadyMs=0;
  private visiblePlans:BuildingPlan[]=[];
  private occlusionDirty=true;
  private occlusionKey='';
  private hiddenSurfacePixels=0;
  private revealedBuildings=0;
  private lastInput?:PlanInput;
  private off:()=>void;
  constructor(private scene:Phaser.Scene,private city:CityMap,private terrain:MapRenderer,readonly settings:DebugSettings,private character:CharacterReference=characterReference()){
    this.data=new ArchitectureData(city);
    this.worker.onmessage=e=>{const p=this.pending.get(e.data.id);if(!p)return;this.pending.delete(e.data.id);e.data.error?p.reject(new Error(e.data.error)):p.resolve(e.data);};
    this.worker.onerror=e=>{this.failures.push(e.message);for(const p of this.pending.values())p.reject(new Error(e.message));this.pending.clear();};
    this.off=city.onTile(()=>{this.dirty=true;});
    scene.events.once('shutdown',()=>this.destroy());
  }
  private request(message:object):Promise<any>{
    if(this.disposed)return Promise.reject(new Error('Warstwa została zamknięta'));
    const id=++this.sequence;
    return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.worker.postMessage({...message,id});});
  }
  setProjection(ratio:number){if(this.projection===ratio)return;this.projection=ratio;this.generation++;for(const id of this.sprites.keys())this.remove(id);}
  async refresh(x:number,y:number,radius:number){
    if(this.planning||this.disposed)return;
    this.planning=true;this.dirty=false;
    try{
      const data=await this.data.around(x,y,radius+300);if(this.disposed)return;
      this.sourceFallback=data.fallback;
      this.lastInput={sources:data.sources,roads:data.roads,areas:data.areas,settings:this.settings,countries:{},character:this.character};
      const response=await this.request({input:this.lastInput});if(this.disposed)return;
      this.plan=response.result;this.lastOrigin=[x,y];this.lastTileCount=this.city.buildings.length;
      this.planById=new Map(this.plan!.buildings.map(b=>[b.id,b]));
      const ids=new Set(this.plan!.buildings.map(b=>b.id));
      for(const id of this.sprites.keys())if(!ids.has(id))this.remove(id);
    }catch(error){this.failures.push(error instanceof Error?error.message:String(error));this.dirty=true;}
    finally{this.planning=false;}
  }
  update(camera:Phaser.Cameras.Scene2D.Camera,now:number,actor?:Phaser.GameObjects.Sprite){
    if(this.disposed)return;
    const v=camera.worldView,cx=v.centerX,cy=v.centerY;
    if((this.dirty||distance(this.lastOrigin,[cx,cy])>80*PX_PER_M||this.city.buildings.length!==this.lastTileCount)&&now-this.lastRefresh>600){
      this.lastRefresh=now;void this.refresh(cx,cy,Math.max(300,Math.hypot(v.width,v.height)/PX_PER_M/2));
    }
    if(!this.plan)return;
    // Actual image bounds when available; conservative projected body bounds before rasterization.
    this.visiblePlans=this.plan.buildings.filter(b=>{
      const im=this.sprites.get(b.id)?.image;
      if(im&&im.x+im.displayWidth>v.left&&im.x<v.right&&im.y+im.displayHeight>v.top&&im.y<v.bottom)return true;
      const p=b.roofFootprints.flat(),xs=p.map(p=>p[0]*PX_PER_M),ys=p.map(p=>p[1]*PX_PER_M);
      return Math.max(...xs)>v.left&&Math.min(...xs)<v.right&&Math.max(...ys)>v.top&&Math.min(...ys)-(b.wallHeight+b.roofHeight+20)*PX_PER_M/this.projection<v.bottom;
    });
    const visible=new Set(this.visiblePlans.map(b=>b.id));
    // Keep the same world anchor as terrain, tree trunks, shadows and decorations.
    // A second camera snap on this layer makes houses jump relative to the ground.
    for(const [id,s]of this.sprites){s.image.setVisible(visible.has(id));s.label?.setVisible(visible.has(id)&&this.settings.overlay);for(const d of s.decorations)d.setVisible(visible.has(id));s.shadow?.setVisible(visible.has(id));}
    const wanted=[...this.visiblePlans].sort((a,b)=>distance(a.center,[cx/PX_PER_M,cy/PX_PER_M])-distance(b.center,[cx/PX_PER_M,cy/PX_PER_M]));
    for(const b of wanted){
      const entry=this.sprites.get(b.id);
      const limit=STYLES[b.decision.style].lod_simplification.distance,d=distance(b.center,[cx/PX_PER_M,cy/PX_PER_M]);
      const lod=entry?entry.lod?(d<limit-20?0:1):(d>limit+20?1:0):(d>limit?1:0);
      const signature=JSON.stringify([b.center,b.door,b.decision.style,b.angle,b.rectangles,b.connectors,b.levels,b.wallHeight,b.openings,b.roofHeight,b.roof,b.palette,b.decorations,this.projection,this.settings.outline,lod]);
      if(entry&&entry.signature===signature){if(!entry.shadow&&this.terrain.firstViewReady(camera))this.shadow(b,entry);continue;}
      if(this.failed.get(b.id)===signature)continue;
      if(this.jobs.size>=2)break;
      if(!this.jobs.has(b.id))void this.render(b,signature,lod);
    }
    for(const [id,entry]of this.sprites){
      if(!visible.has(id)&&this.textureBytes>MAX_TEXTURE_BYTES*.6)this.remove(id);
      for(const [i,d]of entry.decorations.entries()){
        const b=this.planById.get(id),deco=b?.decorations[i];
        if(deco){const frame=Math.floor(now/160+hash(id)%6)%(deco.kind==='tesla'?4:6);d.setFrame((deco.variant+['boiler','tesla','chimney','water-tower','tank','valve','turret'].indexOf(deco.kind)*3)*6+frame);}
      }
    }
    this.compose(visible);
    this.revealedBuildings=0;
    for(const entry of this.sprites.values())if(this.reveal(entry,actor))this.revealedBuildings++;
    if(this.ready()&&!this.firstReadyMs)this.firstReadyMs=performance.now()-this.started;
  }
  private async render(b:BuildingPlan,signature:string,lod:number){
    const generation=this.generation;this.jobs.add(b.id);
    try{
      const response=await this.request({building:b,density:PX_PER_M*ART_DENSITY,projection:this.projection,outline:this.settings.outline,lod});
      if(this.disposed||generation!==this.generation)return;
      const r=response.raster as Raster;this.backend=r.backend;
      this.remove(b.id);
      const key=`architecture-${++serial}`,canvas=document.createElement('canvas');canvas.width=r.width;canvas.height=r.height;
      const pixels=new Uint8ClampedArray(r.pixels),composed=new ImageData(pixels.slice(),r.width,r.height);
      canvas.getContext('2d')!.putImageData(composed,0,0);
      const texture=this.scene.textures.addCanvas(key,canvas)!;texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      const x=Math.round((b.center[0]+r.x)*PX_PER_M*ART_DENSITY)/ART_DENSITY,y=Math.round((b.center[1]+r.y/this.projection)*PX_PER_M*ART_DENSITY*this.projection)/(ART_DENSITY*this.projection);
      const bottom=Math.max(...b.footprints.flat().map(p=>p[1]))*PX_PER_M;
      const image=this.scene.add.image(x,y,key).setOrigin(0).setScale(1/ART_DENSITY,1/ART_DENSITY/this.projection).setDepth(bottom).setVisible(false);
      const label=this.settings.overlay?this.scene.add.text(b.center[0]*PX_PER_M,b.center[1]*PX_PER_M-b.wallHeight*PX_PER_M/this.projection,`${STYLES[b.decision.style].name}\n${b.decision.source} · ${b.decision.region}\n${b.source.idSource}: ${b.id}`,{fontSize:'8px',fontFamily:'monospace',color:'#ece6d6',backgroundColor:'#1e1a24',padding:{x:3,y:2}}).setDepth(1e7).setOrigin(.5,1):undefined;
      const decorations:Phaser.GameObjects.Image[]=[];
      if(!lod&&this.scene.textures.exists('architecture-decorations'))for(const deco of b.decorations){
        const [ax,ay,z]=deco.anchor.position;
        const frame=(['boiler','tesla','chimney','water-tower','tank','valve','turret'].indexOf(deco.kind)*3+deco.variant)*6;
        const d=this.scene.add.image((b.center[0]+ax)*PX_PER_M,(b.center[1]+ay-z/this.projection)*PX_PER_M,'architecture-decorations',frame).setOrigin(.5,54/64).setScale(.5,.5/this.projection).setDepth(bottom+.01);
        // Billboards keep the painted north-west light; mirroring would reverse their shading.
        decorations.push(d);
      }
      const surface:Surface={id:b.id,x:Math.round(x*ART_DENSITY),y:Math.round(y*ART_DENSITY*this.projection),width:r.width,height:r.height,pixels,depth:r.depth,depthOffset:y/PX_PER_M-r.y/this.projection};
      const entry:SpriteEntry={image,key,bytes:r.pixels.byteLength*3+r.depth.byteLength,lod,label,decorations,signature,texture,surface,composed};
      this.sprites.set(b.id,entry);this.textureBytes+=entry.bytes;this.occlusionDirty=true;
    }catch(error){this.failed.set(b.id,signature);this.failures.push(`${b.id}: ${error instanceof Error?error.message:String(error)}`);}
    finally{this.jobs.delete(b.id);}
  }
  private compose(visible:Set<string>){
    const entries=[...this.sprites.entries()].filter(([id])=>visible.has(id));
    const key=entries.map(([id,s])=>`${id}:${s.key}`).sort().join('|');
    if(!this.occlusionDirty&&key===this.occlusionKey)return;
    const composed=composeSurfaces(entries.map(([,s])=>s.surface));this.hiddenSurfacePixels=0;
    for(const [id,s]of entries){
      const pixels=composed.get(id)!;
      for(let i=3;i<pixels.length;i+=4)if(s.surface.pixels[i]&&!pixels[i])this.hiddenSurfacePixels++;
      s.composed=new ImageData(new Uint8ClampedArray(pixels),s.surface.width,s.surface.height);
      s.texture.context.putImageData(s.composed,0,0);s.texture.refresh();
      s.revealKey=undefined;s.revealRect=undefined;
    }
    this.occlusionKey=key;this.occlusionDirty=false;
  }
  private reveal(entry:SpriteEntry,actor?:Phaser.GameObjects.Sprite):boolean{
    let window:Reveal|undefined;
    if(actor&&entry.image.visible&&entry.image.depth>actor.depth){
      const b=actor.getBounds();
      window={x:Math.round((b.centerX-entry.image.x)*ART_DENSITY),y:Math.round((b.centerY-entry.image.y)*ART_DENSITY*this.projection),rx:Math.ceil(b.width*.65*ART_DENSITY+2),ry:Math.ceil(b.height*.62*ART_DENSITY*this.projection+2)};
      if(!revealBounds(window,entry.surface.width,entry.surface.height))window=undefined;
    }
    const key=window?`${window.x},${window.y},${window.rx},${window.ry}`:'off';
    if(key!==entry.revealKey){
      let changed=false;
      if(entry.revealRect){const r=entry.revealRect;entry.texture.context.putImageData(entry.composed,0,0,r.x,r.y,r.width,r.height);entry.revealRect=undefined;changed=true;}
      if(window){
        const patch=revealPixels(entry.surface,entry.composed.data,window);
        if(patch?.removed){entry.texture.context.putImageData(new ImageData(new Uint8ClampedArray(patch.pixels),patch.rect.width,patch.rect.height),patch.rect.x,patch.rect.y);entry.revealRect=patch.rect;changed=true;}
      }
      entry.revealKey=key;if(changed)entry.texture.refresh();
    }
    // A roof decoration must not hide the character inside the cut-away either.
    const bounds=actor?.getBounds();
    for(const d of entry.decorations){const q=d.getBounds(),touch=bounds&&q.right>bounds.left&&q.left<bounds.right&&q.bottom>bounds.top&&q.top<bounds.bottom;
      d.setDepth(entry.revealRect&&actor&&touch?actor.depth-.01:entry.image.depth+.01);
    }
    return Boolean(entry.revealRect);
  }
  private shadow(b:BuildingPlan,entry:SpriteEntry){
    const dx=b.wallHeight*.32,dy=b.wallHeight*.25;
    const points=b.footprints.flat();const x0=Math.floor(Math.min(...points.map(p=>p[0]))*PX_PER_M),y0=Math.floor(Math.min(...points.map(p=>p[1]))*PX_PER_M);
    const w=Math.ceil((Math.max(...points.map(p=>p[0]))+dx)*PX_PER_M-x0)+2,h=Math.ceil((Math.max(...points.map(p=>p[1]))+dy)*PX_PER_M-y0)+2;
    if(w*h>1_000_000)return;
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d')!;
    for(const [index,ring]of b.footprints.entries()){
      const height=index<b.rectangles.length?b.wallHeight:connectorHeight(b.wallHeight,b.openings.doorHeight);
      const hull=convexHull([...ring,...ring.map(p=>[p[0]+height*.32,p[1]+height*.25] as Point)]);
      ctx.beginPath();hull.forEach((p,i)=>{const x=p[0]*PX_PER_M-x0,y=p[1]*PX_PER_M-y0;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.fill();
    }
    const mask=ctx.getImageData(0,0,w,h),colors=PALETTE.map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)));
    const ground=this.terrain.groundSample(x0,y0,w,h);
    if(!ground)return;
    for(let k=0;k<w*h;k++){
      if(mask.data[k*4+3]<128){mask.data[k*4+3]=0;continue;}
      const base=ground.subarray(k*4,k*4+3),target=[...base].map(v=>v*.72);
      const lum=(c:ArrayLike<number>)=>c[0]*.2126+c[1]*.7152+c[2]*.0722;
      const darker=colors.filter(c=>lum(c)<lum(base)*.93);
      const closest=(darker.length?darker:colors).reduce((a,c)=>c.reduce((sum,v,i)=>sum+(v-target[i])**2,0)<a.reduce((sum,v,i)=>sum+(v-target[i])**2,0)?c:a);
      mask.data.set([...closest,255],k*4);
    }
    ctx.putImageData(mask,0,0);const key=`architecture-shadow-${++serial}`;
    this.scene.textures.addImage(key,canvas as unknown as HTMLImageElement)!.setFilter(Phaser.Textures.FilterMode.NEAREST);
    entry.shadow=this.scene.add.image(x0,y0,key).setOrigin(0).setDepth(GROUND_DEPTH+1);entry.shadowKey=key;
    entry.bytes+=w*h*4;this.textureBytes+=w*h*4;
  }
  isFree(x:number,y:number,radius=2){return Boolean(this.plan)&&this.city.isFree(x,y,radius,radius,true)&&!blockedByPlans(this.plan?.buildings??[],[x/PX_PER_M,y/PX_PER_M],radius/PX_PER_M);}
  hasPlan(){return Boolean(this.plan);}
  freeNear(x:number,y:number):Point|null{
    if(this.isFree(x,y))return [x,y];
    const p:Point=[x/PX_PER_M,y/PX_PER_M],candidates:Point[]=[];
    for(const road of this.lastInput?.roads??[])for(let i=0;i+1<road.points.length;i++){
      const q=closest(p,road.points[i],road.points[i+1]);if(distance(p,q)<150)candidates.push(q);
    }
    candidates.sort((a,b)=>distance(p,a)-distance(p,b));
    const q=candidates.find(q=>this.isFree(q[0]*PX_PER_M,q[1]*PX_PER_M));
    return q?[q[0]*PX_PER_M,q[1]*PX_PER_M]:null;
  }
  ready(){return Boolean(this.plan&&!this.planning&&!this.occlusionDirty&&this.jobs.size===0&&this.visiblePlans.every(b=>this.sprites.has(b.id)));}
  diagnostics(){return {ready:this.ready(),buildings:this.plan?.buildings.length??0,visible:this.visiblePlans.length,rejected:this.plan?.rejected.length??0,planning:this.planning,pending:this.jobs.size,workerMs:this.plan?.milliseconds??0,textureBytes:this.textureBytes,textureBudget:MAX_TEXTURE_BYTES,backend:this.backend,hiddenSurfacePixels:this.hiddenSurfacePixels,revealedBuildings:this.revealedBuildings,sourceFallback:this.sourceFallback,firstReadyMs:this.firstReadyMs,failures:[...new Set(this.failures)].slice(-10),styles:Object.fromEntries(Object.keys(STYLES).map(id=>[id,this.plan?.buildings.filter(b=>b.decision.style===id).length??0])),idFallbacks:this.lastInput?.sources.filter(s=>s.idSource!=='osm').length??0};}
  inspect(){return {input:this.lastInput,plan:this.plan};}
  private remove(id:string){const s=this.sprites.get(id);if(!s)return;s.image.destroy();s.label?.destroy();s.decorations.forEach(d=>d.destroy());s.shadow?.destroy();this.scene.textures.remove(s.key);if(s.shadowKey)this.scene.textures.remove(s.shadowKey);this.textureBytes-=s.bytes;this.sprites.delete(id);this.occlusionDirty=true;}
  destroy(){if(this.disposed)return;this.disposed=true;this.off();this.worker.terminate();this.data.dispose();for(const id of this.sprites.keys())this.remove(id);for(const p of this.pending.values())p.reject(new Error('Warstwa została zamknięta'));this.pending.clear();}
}
function convexHull(points:Point[]):Point[]{
  const p=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(o:Point,a:Point,b:Point)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lower:Point[]=[],upper:Point[]=[];
  for(const q of p){while(lower.length>=2&&cross(lower[lower.length-2],lower[lower.length-1],q)<=0)lower.pop();lower.push(q);}
  for(const q of [...p].reverse()){while(upper.length>=2&&cross(upper[upper.length-2],upper[upper.length-1],q)<=0)upper.pop();upper.push(q);}
  return lower.slice(0,-1).concat(upper.slice(0,-1));
}
