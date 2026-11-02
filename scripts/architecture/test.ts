import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { massing, components, connectorHeight, exposedWalls } from '../../src/architecture/massing';
import { buildingMesh } from '../../src/architecture/mesh';
import { planArchitecture, blockedByPlans } from '../../src/architecture/planner';
import { centroid, contains, decompose, geometryId, overlap, rectangleRing, rotate, ringArea, roadCollision } from '../../src/architecture/geometry';
import { decideStyle, regionFor } from '../../src/architecture/style';
import { PALETTE, STYLES, REGIONS } from '../../src/architecture/catalog';
import { softwareRaster } from '../../src/architecture/raster';
import { countryAt } from '../../src/architecture/countries';
import { buildingLevels, characterReference, labHeroScale } from '../../src/architecture/proportions';
import { DEFAULT_SETTINGS, type ArchitectureSource, type PlanInput, type Point, type Road } from '../../src/architecture/types';
import { ziemia, RODZAJE, MARGINES } from '../../src/map/ziemia09';
import { CityMap, PX_PER_M } from '../../src/map/CityMap';

const report:{name:string;result:string;details?:unknown}[]=[];
function check(name:string,fn:()=>unknown){const details=fn();report.push({name,result:'PASS',details});console.log(`PASS ${name}`);}
const ring:Point[]=[[-8,-6],[8,-6],[8,6],[-8,6]];
const source=(id:string,x=0,y=0,tags:Record<string,string>={}):ArchitectureSource=>({id,idSource:'osm',osmId:id,lon:22.56,lat:51.24,rings:[ring.map(p=>[p[0]+x,p[1]+y])],tags:{building:'house',...tags}});
const road:Road={id:'street-1',points:[[-500,36],[500,36]],width:7};
const input:PlanInput={sources:[source('w1')],roads:[road],areas:[],countries:{},settings:DEFAULT_SETTINGS};

check('7 styles + 4 regional profiles; all material indices in master palette',()=>{
 assert.equal(Object.keys(STYLES).length,7);assert.equal(REGIONS.length,4);assert.equal(PALETTE.length,16);
 for(const style of [...Object.values(STYLES),...REGIONS])for(const group of Object.values(style.subpalette))for(const triple of group){assert.equal(triple.length,3);for(const index of triple)assert(Number.isInteger(index)&&index>=0&&index<16);}
 return PALETTE;
});
check('canonical fallback ID survives ring rotation/winding',()=>{
 const ll:Point[]=[[22,51],[22.01,51],[22.01,51.01],[22,51.01]];
 assert.equal(geometryId([ll]),geometryId([[...ll].reverse()]));assert.equal(geometryId([ll]),geometryId([[...ll.slice(2),...ll.slice(0,2),ll[2]]]));
});
check('rectangular decomposition preserves a courtyard and removes small teeth',()=>{
 const outer:Point[]=[[-12,-10],[12,-10],[12,10],[-12,10]],hole:Point[]=[[-4,-4],[4,-4],[4,4],[-4,4]];
 const d=decompose([outer,hole],[0,0]);assert(d.rectangles.length>1);
 for(const r of d.rectangles){const p:Point=[r.x+r.w/2,r.y+r.d/2];assert(contains(outer,p));assert(!contains(hole,p));assert(r.w>0&&r.d>0);}
 assert(d.rectangles.length<=16);return {rectangles:d.rectangles.length};
});
check('real KUL and irregular estates reproduce the accepted major wings and flat links',()=>{
 const fixtures=JSON.parse(readFileSync('docs/architecture/massing/fixtures.json','utf8')).buildings;
 const expected:Record<string,[number,number]>={'Collegium Jana Pawła II':[1,0],'Collegium Norwidianum':[1,0],'Gmach Główny KUL':[4,0],'Dziewanny 10':[3,2],'Dziewanny 9':[4,1],'Dziewanny 14':[2,1],'Szczytowa 11':[7,2]};
 const details=[];
 for(const f of fixtures){
  const [lon,lat]=f.center,k=111320*Math.cos(lat*Math.PI/180);
  const rings:Point[][]=f.rings.map((r:Point[])=>r.map(p=>[(p[0]-lon)*k,-(p[1]-lat)*111320]));
  const center=centroid(rings[0]),split=massing(rings,center);
  assert.deepEqual([split.rectangles.length,split.connectors.length],expected[f.name],f.name);
  assert(split.connected);assert.equal(components([...split.rectangles,...split.connectors]).length,1);
  const round=(x:unknown)=>JSON.parse(JSON.stringify(x,(_,v)=>typeof v==='number'?Math.round(v*1e5)/1e5:v));
  assert.deepEqual(round(massing(rings.map(r=>[...r].reverse()),center)),round(split));
  const source:ArchitectureSource={id:f.name,idSource:'geometry',lon,lat,rings,tags:f.tags};
  const b=planArchitecture({...input,sources:[source],roads:[],settings:{...DEFAULT_SETTINGS,angleSnap:0},character:characterReference(.25,1.92)}).buildings[0];
  assert(b, f.name);assert.equal(b.connectors.length,split.connectors.length);
  const mesh=buildingMesh(b),doors=[...mesh.kinds].filter(k=>k===8);assert.equal(doors.length,6,`${f.name}: unobstructed door`);
  assert(mesh.positions.every(Number.isFinite));
  assert.equal(b.footprints.length,b.rectangles.length+b.connectors.length);
  const ch=connectorHeight(b.wallHeight,b.openings.doorHeight);assert(ch<b.wallHeight);assert(ch>b.openings.doorHeight);
  // Sample every courtyard, including its boundary-near interior, against actual colliders.
  for(const hole of rings.slice(1)){
   const xs=hole.map(p=>p[0]),ys=hole.map(p=>p[1]);
   for(let x=Math.min(...xs);x<Math.max(...xs);x+=.5)for(let y=Math.min(...ys);y<Math.max(...ys);y+=.5){
    const p:Point=[x,y];if(!contains(hole,p))continue;
    const scaled:Point=[center[0]+(x-center[0])*DEFAULT_SETTINGS.scale,center[1]+(y-center[1])*DEFAULT_SETTINGS.scale];
    assert(!b.footprints.some(r=>contains(r,scaled)),`${f.name}: courtyard filled`);
   }
  }
  const raster=softwareRaster(mesh,1.92,.72,true);assert(raster.pixels.some((v,i)=>i%4===3&&v===255));
  details.push({name:f.name,main:b.rectangles.length,connectors:b.connectors.length,levels:b.levels,triangles:mesh.indices.length/3});
 }return details;
});
check('joined wings have no internal facade, lower links expose upper walls, and empty geometry is safe',()=>{
 const a={r:{x:0,y:0,w:20,d:10},height:20},b={r:{x:20,y:0,w:20,d:10},height:20};
 const exposed=exposedWalls([a,b]);assert.equal(exposed.length,6);assert(!exposed.some(s=>s.a[0]===20&&s.b[0]===20));
 b.height=8;const upper=exposedWalls([a,b]).filter(s=>s.a[0]===20&&s.b[0]===20);assert.equal(upper.length,1);assert.equal(upper[0].base,8);assert.equal(upper[0].height,20);
 assert.deepEqual(massing([], [0,0]).rectangles,[]);
});
check('full scale, street orientation, road and neighbour separation',()=>{
 const sources=Array.from({length:12},(_,i)=>source(`w${i}`,i*22,0));
 const result=planArchitecture({...input,sources});assert(result.buildings.length>0);assert(result.rejected.length>0);
 for(const b of result.buildings){assert(b.wallHeight>=b.roofHeight);assert(Math.abs(b.angle/(Math.PI/8)-Math.round(b.angle/(Math.PI/8)))<1e-8);assert(!b.roofFootprints.some(r=>roadCollision(r,input.roads)));for(const c of result.buildings)if(c.id!==b.id)assert(!b.roofFootprints.some(r=>c.roofFootprints.some(q=>overlap(r,q))));}
 return {kept:result.buildings.length,rejected:result.rejected.length};
});
check('single houses keep street heading; complex wings use the nearest equivalent source axis',()=>{
 const angle=3*Math.PI/8;
 const street={...road,points:[rotate([-500,36],angle),rotate([500,36],angle)]};
 const single=planArchitecture({...input,roads:[street]}).buildings[0];assert(single);assert.equal(single.angle,angle);
 const irregular=source('irregular-heading');irregular.rings=[[[0,0],[40,0],[40,10],[10,10],[10,40],[0,40]]];
 const cross={...road,points:[[50,-100],[50,100]] as Point[]};
 const complex=planArchitecture({...input,sources:[irregular],roads:[cross],settings:{...DEFAULT_SETTINGS,scale:1}}).buildings[0];
 assert(complex);assert(complex.rectangles.length>1);assert.equal(complex.angle,0);
});
check('load order and reload determinism, including source decision and geometry',()=>{
 const sources=Array.from({length:20},(_,i)=>source(`w${i}`,i*19,(i%3)*65));
 const a=planArchitecture({...input,sources}),b=planArchitecture({...input,sources:[...sources].reverse()});
 assert.deepEqual(a.buildings,b.buildings);assert.deepEqual(a.rejected,b.rejected);
 const second=planArchitecture({...input,sources:JSON.parse(JSON.stringify(sources))});assert.deepEqual(a.buildings,second.buildings);
 const reversedRoad={...road,points:[...road.points].reverse()};
 const roadOrder=planArchitecture({...input,sources,roads:[reversedRoad]});assert.deepEqual(a.buildings,roadOrder.buildings);
});
check('tag precedence and seven architectural families',()=>{
 const examples:[string,Record<string,string>][]=[['landmark',{building:'church'}],['industrial',{building:'warehouse'}],['wooden',{'building:material':'wood'}],['half-timber',{'building:architecture':'half-timbered'}],['apartments',{building:'apartments','building:levels':'7',start_date:'1970'}],['modern',{start_date:'2005'}],['old-town',{'building:architecture':'baroque'}]];
 for(const [style,tags]of examples){const s=source(`style:${style}`,0,0,tags);assert.equal(decideStyle(s,[s],[road],[]).style,style);}
});
check('one footprint, OSM 1–3 / 4–6 / >6 compress to 1 / 2 / 3, with a fixed-size entrance',()=>{
 const character=characterReference(labHeroScale(2/3),1.92);
 const heights=new Map<number,number>();
 for(const levels of ['1','2','3','4','5','6','7','11','99']){
  const s=source(`house-${levels}`,0,0,{building:'apartments','building:levels':levels,'roof:shape':'flat',start_date:'1970'});
  const b=planArchitecture({...input,sources:[s],character}).buildings[0];assert(b);
  const displayed=Number(levels)<=3?1:Number(levels)<=6?2:3;
  assert.equal(b.levels,displayed);assert.equal(b.rectangles.length,1);assert.notEqual(b.roof,'flat');
  assert(b.wallHeight/b.levels>=b.openings.doorHeight*1.3);heights.set(Number(levels),b.wallHeight);
  assert(b.openings.doorHeight>character.height);assert(b.openings.doorWidth>character.width);
  const mesh=buildingMesh(b),doorHeights:number[]=[],windowHeights:number[]=[];
  for(let i=0;i<mesh.kinds.length;i++){if(mesh.kinds[i]===8)doorHeights.push(mesh.positions[i*3+2]);if(mesh.kinds[i]===3)windowHeights.push(mesh.positions[i*3+2]);}
  assert.equal(doorHeights.length,6);assert(Math.abs(Math.max(...doorHeights)-b.openings.doorHeight)<1e-5);
  const rows=[...new Set(windowHeights.map(z=>Math.round(z*1e4)))];
  assert.equal(rows.length,displayed*2); // One bottom/top pair for each row of large panes.
  const distant=buildingMesh(b,1);assert.equal([...distant.kinds].filter(k=>k===8).length,6);
 }
 assert.equal(heights.get(1),heights.get(3));assert.equal(heights.get(4),heights.get(6));
 assert.equal(heights.get(7),heights.get(11));assert.equal(heights.get(7),heights.get(99));
 assert(Math.abs(heights.get(4)!/heights.get(1)!-2)<1e-8);assert(Math.abs(heights.get(7)!/heights.get(1)!-3)<1e-8);
 for(const invalid of [undefined,'','invalid','-3','Infinity'])assert.equal(buildingLevels(invalid),1);
 assert.equal(buildingLevels('3.5'),2);assert.equal(buildingLevels('6.5'),3);
 const wide=source('wide-low-house',0,0,{start_date:'2010','building:levels':'1'});wide.rings=wide.rings.map(r=>r.map(p=>[p[0]*4,p[1]*3]));
 const low=planArchitecture({...input,sources:[wide],roads:[],character}).buildings[0];
 assert(low);assert.equal(low.levels,1);assert(low.wallHeight<low.openings.doorHeight*1.6);
 const bigHero=characterReference(labHeroScale(1),1.92),s=source('big-hero');
 const b=planArchitecture({...input,sources:[s],character:bigHero}).buildings[0];assert(b.openings.doorHeight>bigHero.height);assert(b.wallHeight>b.openings.doorHeight);
 return {character,doorHeightToCharacter:1.12,doorWidthToCharacter:1.12,wallHeights:Object.fromEntries(heights)};
});
check('regional selection is data-driven: Bergen, Seville, Kyoto, dry climate',()=>{
 const places:[number,number,string][]=[[5.3245,60.3971,'north'],[-5.9953,37.3886,'mediterranean'],[135.778,35.003,'east-asia'],[31.23,30.04,'arid']];
 for(const [lon,lat,region]of places)assert.equal(regionFor({...source('region'),lon,lat}).id,region);
 assert.equal(countryAt(5.3245,60.3971),'NOR');assert.equal(countryAt(-5.9953,37.3886),'ESP');assert.equal(countryAt(135.778,35.003),'JPN');
 return places;
});
check('all roofs/angles rasterize into strictly palette-only pixels; facade collision matches mesh',()=>{
 const colors=new Set(PALETTE.map(c=>c.toLowerCase()));const statistics=[];
 for(const roof of ['gabled','hipped','flat','sawtooth','round','onion'])for(const deg of [0,22.5,67.5]){
  const s=source(`roof-${roof}-${deg}`,0,0,{'roof:shape':roof});const b=planArchitecture({...input,sources:[s],roads:[]}).buildings[0];assert(b);b.angle=deg*Math.PI/180;
  b.footprints=b.rectangles.map(r=>rectangleRing(r,b.center,b.angle));
  assert(blockedByPlans([b],b.center));const mesh=buildingMesh(b);assert(mesh.positions.length>100);
  for(const v of mesh.positions)assert(Number.isFinite(v));
  const r=softwareRaster(mesh,2,.72,true);let opaque=0;
  for(let i=0;i<r.pixels.length;i+=4)if(r.pixels[i+3]){assert.equal(r.pixels[i+3],255);opaque++;const hex='#'+[...r.pixels.subarray(i,i+3)].map(v=>v.toString(16).padStart(2,'0')).join('');assert(colors.has(hex),hex);}
  assert(opaque>300);statistics.push({roof,deg,opaque});
 }
 return statistics;
});
check('architecture-free ground, tree positions and pipes stay byte-identical',()=>{
 const N=96,S=N+2*MARGINES,ids=new Uint8Array(S*S).fill(RODZAJE.indexOf('trawa'));
 const job={ids,S,N,X0:0,Y0:0,budynki:[{r:[118,0,142,0,142,24,118,24],dziury:[],h:18,seed:1,id:1}],noc:false,sciete:[],tory:[],perony:[],pola:[],miesiac:5,zebrane:[],dojrzale:1,miasto:'duze' as const,rury:[{pts:[12,64,82,64],seed:2}]};
 const a=ziemia(job),b=ziemia({...job,hideArchitecture:true});assert.deepEqual(a,b);return {pixels:a.px.length,trees:a.drzewa.length};
});
check('real Lublin source plans: collision audit in four districts',()=>{
 const city=new CityMap(JSON.parse(readFileSync('.cache/lublin-full.json','utf8')),'lublin');
 const places=[['old-town',51.2483,22.5679],['apartments',51.2314,22.534],['homes',51.2434,22.5344],['industrial',51.2308,22.599]] as const;
 const allStyles=new Set<string>(),stats=[];
 for(const [name,lat,lon]of places){
  const c=city.fromLatLon(lat,lon),mx=c.x/PX_PER_M,my=c.y/PX_PER_M,radius=450,sources:ArchitectureSource[]=[],areas:any[]=[];
  for(let x=Math.floor((mx-radius)/250);x<=Math.floor((mx+radius)/250);x++)for(let y=Math.floor((my-radius)/250);y<=Math.floor((my+radius)/250);y++){
   try{const cell=JSON.parse(readFileSync(`public/architecture/lublin/${x}_${y}.json`,'utf8'));sources.push(...cell.sources);areas.push(...cell.areas);}catch{}
  }
  const roads:Road[]=city.query({x0:c.x-radius*PX_PER_M,y0:c.y-radius*PX_PER_M,x1:c.x+radius*PX_PER_M,y1:c.y+radius*PX_PER_M}).lines.filter(l=>['major','medium','minor','service','track','path','pedestrian','rail','tram'].includes(l.kind)).map(l=>({id:String(l.id),width:l.kind==='rail'||l.kind==='tram'?Math.max(7,l.width/PX_PER_M):Math.max(3,l.width/PX_PER_M)+3,points:Array.from({length:l.pts.length/2},(_,i)=>[l.pts[i*2]/PX_PER_M,l.pts[i*2+1]/PX_PER_M])}));
  const result=planArchitecture({...input,sources,roads,areas});assert(result.buildings.length>0);
  for(const b of result.buildings){allStyles.add(b.decision.style);assert(!b.roofFootprints.some(r=>roadCollision(r,roads)));for(const q of result.buildings)if(b.id<q.id)assert(!b.roofFootprints.some(r=>q.roofFootprints.some(s=>overlap(r,s))));}
  stats.push({name,sources:sources.length,kept:result.buildings.length,styles:[...new Set(result.buildings.map(b=>b.decision.style))],angles:[...new Set(result.buildings.map(b=>Math.round(b.angle*180/Math.PI)))],milliseconds:result.milliseconds});
 }
 assert(allStyles.size>=4);return stats;
});
mkdirSync('docs/architecture/artifacts',{recursive:true});
writeFileSync('docs/architecture/artifacts/unit-results.json',JSON.stringify({generatedAt:new Date().toISOString(),tests:report},null,2)+'\n');
console.log(`${report.length} architecture checks passed`);
