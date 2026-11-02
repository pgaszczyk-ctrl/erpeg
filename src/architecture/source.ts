import { centroid, geometryId } from './geometry';
import { CityMap, PX_PER_M } from '../map/CityMap';
import type { ArchitectureSource, ContextArea, Point, Road } from './types';
interface Cell { sources:ArchitectureSource[]; areas:(ContextArea&{id?:string})[] }
interface Index { version:number;chunk:number;cells:string[];maxRadius:number;count:number;osmIds:number;idFallback:number }
export class ArchitectureData {
  private index?:Promise<Index|null>;
  private cells=new Map<string,Promise<Cell>>();
  constructor(private city:CityMap){}
  async around(x:number,y:number,radius:number):Promise<{sources:ArchitectureSource[];areas:ContextArea[];roads:Road[];fallback:boolean}>{
    // Use identical drawn road corridors, including pavement, rather than raw highway centrelines.
    const lines=this.city.query({x0:x-radius*PX_PER_M,y0:y-radius*PX_PER_M,x1:x+radius*PX_PER_M,y1:y+radius*PX_PER_M}).lines;
    const roadKinds=new Set(['major','medium','minor','service','track','pedestrian','path','steps','rail','tram']);
    const roads:Road[]=lines.filter(l=>roadKinds.has(l.kind)).map(l=>({id:String(l.id),width:l.kind==='rail'||l.kind==='tram'?Math.max(7,l.width/PX_PER_M):Math.max(3,l.width/PX_PER_M)+3,points:Array.from({length:l.pts.length/2},(_,i)=>[l.pts[i*2]/PX_PER_M,l.pts[i*2+1]/PX_PER_M])}));
    let index:Index|null=null;
    if(this.city.id==='lublin'){
      this.index??=fetch(`${import.meta.env.BASE_URL}architecture/lublin/index.json`).then(r=>r.ok?r.json():null).catch(()=>null);
      index=await this.index;
    }
    if(index){
      const known=new Set(index.cells),need:string[]=[];
      // Source ownership is at its centroid. Include the maximum enlarged envelope and context halo.
      const margin=Math.max(radius,200+index.maxRadius*2+16),mx=x/PX_PER_M,my=y/PX_PER_M;
      for(let cx=Math.floor((mx-margin)/index.chunk);cx<=Math.floor((mx+margin)/index.chunk);cx++)for(let cy=Math.floor((my-margin)/index.chunk);cy<=Math.floor((my+margin)/index.chunk);cy++){
        const key=`${cx}_${cy}`;if(known.has(key))need.push(key);
      }
      const data=await Promise.all(need.map(key=>{
        let p=this.cells.get(key);
        if(!p){p=fetch(`${import.meta.env.BASE_URL}architecture/lublin/${key}.json`).then(async r=>{if(!r.ok)throw new Error(`Architektura ${key}: HTTP ${r.status}`);return r.json() as Promise<Cell>;}).catch(error=>{this.cells.delete(key);throw error;});this.cells.set(key,p);}
        return p;
      }));
      const used=new Set(need);
      for(const key of this.cells.keys())if(!used.has(key))this.cells.delete(key);
      return {sources:[...new Map(data.flatMap(d=>d.sources).map(s=>[s.id,s])).values()],areas:[...new Map(data.flatMap(d=>d.areas).map(a=>[a.id??JSON.stringify(a),a])).values()],roads,fallback:false};
    }
    // World tiles retain their source metadata when available. Legacy files are still readable.
    const sources=this.city.query({x0:x-radius*PX_PER_M,y0:y-radius*PX_PER_M,x1:x+radius*PX_PER_M,y1:y+radius*PX_PER_M}).buildings.map(b=>{
      const rings:Point[][]=b.rings.map(r=>Array.from({length:r.length/2},(_,i)=>[r[i*2]/PX_PER_M,r[i*2+1]/PX_PER_M]));
      const c=centroid(rings[0]),ll=this.city.toLatLon(c[0]*PX_PER_M,c[1]*PX_PER_M);
      const geographic=rings.map(r=>r.map(p=>{const q=this.city.toLatLon(p[0]*PX_PER_M,p[1]*PX_PER_M);return [q.lon,q.lat] as Point;}));
      const meta=b.architecture;
      return {id:meta?.sourceId??geometryId(geographic),osmId:meta?.osmId,idSource:meta?.idSource??'geometry',rings,tags:{...meta?.tags,...(!meta?.tags['building:levels']?{'building:levels':String(b.levels)}:{}),...(b.name?{name:b.name}:{})},lon:ll.lon,lat:ll.lat,legacyId:b.id} as ArchitectureSource;
    });
    const areas=this.city.areas.filter(a=>['industrial','residential','farmyard','farmland','commercial','retail'].includes(a.kind)).map(a=>({kind:a.kind,rings:a.rings.map(r=>Array.from({length:r.length/2},(_,i)=>[r[i*2]/PX_PER_M,r[i*2+1]/PX_PER_M] as Point))}));
    return {sources,areas,roads,fallback:true};
  }
  dispose(){this.cells.clear();}
}
