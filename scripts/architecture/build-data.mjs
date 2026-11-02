// Additive sidecar: never changes public/map's legacy geometry, IDs, nature or roads.
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { geometryId, centroid, ringArea } from '../../src/architecture/geometry.ts';
const src='data/lublin-osm.geojsonseq.gz', mapFile='.cache/lublin-full.json', dir='public/architecture/lublin';
if(!existsSync(src)||!existsSync(mapFile)){console.log('architecture: source unavailable');process.exit(0);}
const script=statSync(new URL(import.meta.url)).mtimeMs;
const context='data/architecture-context.geojsonseq.gz';
if(existsSync(`${dir}/index.json`)&&statSync(`${dir}/index.json`).mtimeMs>Math.max(statSync(src).mtimeMs,statSync(mapFile).mtimeMs,script,existsSync(context)?statSync(context).mtimeMs:0,statSync('src/architecture/geometry.ts').mtimeMs)){
  console.log('architecture: up to date');process.exit(0);
}
const map=JSON.parse(readFileSync(mapFile,'utf8')),origin=map.origin??{lon:map.bounds.minLon,lat:map.bounds.maxLat,lat0:(map.bounds.minLat+map.bounds.maxLat)/2};
const rad=origin.lat0*Math.PI/180,mlat=111132.954-559.822*Math.cos(2*rad),mlon=111412.84*Math.cos(rad);
const project=([lon,lat])=>[Math.round((lon-origin.lon)*mlon*100)/100,Math.round((origin.lat-lat)*mlat*100)/100];
const cells=new Map(),areas=new Map(),keys=['building','building:architecture','building:material','building:levels','roof:shape','roof:material','roof:height','start_date','historic','amenity','name','religion','denomination','landuse'];
let count=0,osm=0,maxRadius=0;
const add=(store,key,value)=>{const list=store.get(key)??[];list.push(value);store.set(key,list);};
async function* records(file){
  const stream=createReadStream(file).pipe(createGunzip());stream.setEncoding('utf8');let pending='';
  for await(const chunk of stream){pending+=chunk;let end;while((end=pending.indexOf('\n'))>=0){yield pending.slice(0,end);pending=pending.slice(end+1);}}
  if(pending.trim())yield pending;
}
for(const file of [src,...(existsSync('data/architecture-context.geojsonseq.gz')?['data/architecture-context.geojsonseq.gz']:[])]) for await(const line of records(file)){
  const text=line.replace(/^\x1e/,'').trim();if(!text)continue;
  const f=JSON.parse(text),p=f.properties??{},g=f.geometry;
  if(!g||!['Polygon','MultiPolygon'].includes(g.type))continue;
  if(!p.building&&!['residential','industrial','farmyard','commercial','retail','farmland'].includes(p.landuse))continue;
  const polygons=g.type==='Polygon'?[g.coordinates]:g.coordinates;
  for(let part=0;part<polygons.length;part++){
    const ll=polygons[part],c=centroid(ll[0]);
    if(c[0]<map.bounds.minLon||c[0]>map.bounds.maxLon||c[1]<map.bounds.minLat||c[1]>map.bounds.maxLat)continue;
    const rings=ll.map(r=>r.map(project)),center=centroid(rings[0]),key=`${Math.floor(center[0]/250)}_${Math.floor(center[1]/250)}`;
    if(p.building&&p.building!=='no'){
      if(Math.abs(ringArea(rings[0]))<15)continue;
      const explicit=[f.id,p['@id'],p['@type']&&p['@id']?`${p['@type']}/${p['@id']}`:undefined].find(id=>id!=null&&/^(?:[nwr]\d+|(?:node|way|relation)\/\d+)$/.test(String(id)));
      const osmId=explicit?String(explicit):undefined;
      const id=osmId??geometryId(ll);if(osmId)osm++;
      const radius=Math.max(...rings[0].map(q=>Math.hypot(q[0]-center[0],q[1]-center[1])));
      if(radius>1500)continue; // Invalid source geometry, recorded in build output rather than raster OOM.
      maxRadius=Math.max(maxRadius,radius);
      add(cells,key,{id:part?`${id}:part:${part}`:id,osmId,idSource:osmId?'osm':'geometry',rings,tags:Object.fromEntries(keys.filter(k=>p[k]!=null).map(k=>[k,String(p[k])])),lon:c[0],lat:c[1]});count++;
    }else{
      // Context polygons are indexed in every cell they touch (deduplicated by ID at load).
      const points=rings[0],xs=points.map(q=>q[0]),ys=points.map(q=>q[1]);
      for(let x=Math.floor(Math.min(...xs)/250);x<=Math.floor(Math.max(...xs)/250);x++)for(let y=Math.floor(Math.min(...ys)/250);y<=Math.floor(Math.max(...ys)/250);y++)add(areas,`${x}_${y}`,{id:geometryId(ll),rings,kind:p.landuse});
    }
  }
}
mkdirSync(dir,{recursive:true});
const files=[...new Set([...cells.keys(),...areas.keys()])].sort();
for(const key of files)writeFileSync(`${dir}/${key}.json`,JSON.stringify({sources:cells.get(key)??[],areas:areas.get(key)??[]}));
writeFileSync(`${dir}/index.json`,JSON.stringify({version:1,chunk:250,origin,cells:files,maxRadius:Math.ceil(maxRadius),count,osmIds:osm,idFallback:count-osm,attribution:'© OpenStreetMap contributors, ODbL 1.0'}));
console.log(`architecture: ${count} source buildings, ${osm} OSM IDs, ${count-osm} explicit geometry fallbacks; ${files.length} chunks`);
