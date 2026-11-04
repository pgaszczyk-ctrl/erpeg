/** Technical render sheet, explicitly not a game/browser screenshot. */
import {writeFileSync,mkdirSync} from 'node:fs';
import {deflateSync} from 'node:zlib';
import {planArchitecture} from '../../src/architecture/planner';
import {buildingMesh} from '../../src/architecture/mesh';
import {softwareRaster} from '../../src/architecture/raster';
import {STYLES} from '../../src/architecture/catalog';
import {rotate} from '../../src/architecture/geometry';
import {characterReference} from '../../src/architecture/proportions';
import {DEFAULT_SETTINGS,type ArchitectureSource,type StyleId} from '../../src/architecture/types';

function crc32(bytes:Uint8Array){let c=0xffffffff;for(const v of bytes){c^=v;for(let k=0;k<8;k++)c=(c>>>1)^(c&1?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function png(file:string,w:number,h:number,rgba:Uint8Array|Uint8ClampedArray){
 const chunk=(name:string,data:Uint8Array)=>{const n=Buffer.from(name),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);n.copy(out,4);Buffer.from(data).copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([n,data])),8+data.length);return out;};
 const header=Buffer.alloc(13);header.writeUInt32BE(w);header.writeUInt32BE(h,4);header[8]=8;header[9]=6;
 const raw=Buffer.alloc(h*(w*4+1));for(let y=0;y<h;y++)Buffer.from(rgba.subarray(y*w*4,(y+1)*w*4)).copy(raw,y*(w*4+1)+1);
 writeFileSync(file,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',new Uint8Array())]));
}
mkdirSync('docs/architecture/artifacts/models',{recursive:true});
mkdirSync('docs/architecture/artifacts/heights',{recursive:true});
const examples:Record<StyleId,Record<string,string>>={
 'old-town':{building:'apartments','building:architecture':'baroque'},'half-timber':{building:'house','building:architecture':'half-timbered'},wooden:{building:'barn','building:material':'wood'},apartments:{building:'apartments','building:levels':'6',start_date:'1970'},industrial:{building:'industrial'},modern:{building:'house',start_date:'2010'},landmark:{building:'church'},
};
const figures=[];
const measurements=[];
for(const id of Object.keys(STYLES) as StyleId[])for(const degrees of [0,22.5,67.5]){
 const source:ArchitectureSource={id:`preview:${id}`,idSource:'geometry',lat:51.24,lon:22.56,rings:[[[-6,-4],[6,-4],[6,4],[-6,4]]],tags:examples[id]};
 const angle=degrees*Math.PI/180;
 const plan=planArchitecture({sources:[source],roads:[{id:'preview-street',width:7,points:[rotate([-80,36],angle),rotate([80,36],angle)]}],areas:[],settings:DEFAULT_SETTINGS,countries:{}}).buildings[0];
 const raster=softwareRaster(buildingMesh(plan),3,.72,true),file=`models/${id}-${degrees}.png`;
 png(`docs/architecture/artifacts/${file}`,raster.width,raster.height,raster.pixels);
 measurements.push({style:id,file,degrees,levels:plan.levels,wallHeight:plan.wallHeight,door:plan.door,center:plan.center,openings:plan.openings,character:characterReference(),raster:{x:raster.x,y:raster.y,width:raster.width,height:raster.height,density:3,projection:.72}});
 figures.push(`<figure><img src="${file}" alt="${STYLES[id].name}, ${degrees} stopni"><figcaption>${STYLES[id].name} · ${degrees}°</figcaption></figure>`);
}
writeFileSync('docs/architecture/artifacts/model-proportions.json',JSON.stringify(measurements,null,2)+'\n');
const heightMeasurements=[];
for(const levels of [1,3,4,6,7,11]){
 const source:ArchitectureSource={id:'height-comparison',idSource:'geometry',lat:51.24,lon:22.56,rings:[[[-6,-4],[6,-4],[6,4],[-6,4]]],tags:{building:'apartments','building:levels':String(levels),start_date:'1970','roof:shape':'gabled'}};
 const angle=Math.PI/8;
 const plan=planArchitecture({sources:[source],roads:[{id:'preview-street',width:7,points:[rotate([-80,36],angle),rotate([80,36],angle)]}],areas:[],settings:DEFAULT_SETTINGS,countries:{}}).buildings[0];
 const raster=softwareRaster(buildingMesh(plan),3,.72,true),file=`heights/${levels}.png`;
 png(`docs/architecture/artifacts/${file}`,raster.width,raster.height,raster.pixels);
 heightMeasurements.push({sourceLevels:levels,file,levels:plan.levels,wallHeight:plan.wallHeight,door:plan.door,center:plan.center,openings:plan.openings,raster:{x:raster.x,y:raster.y,width:raster.width,height:raster.height,density:3,projection:.72}});
}
writeFileSync('docs/architecture/artifacts/height-proportions.json',JSON.stringify(heightMeasurements,null,2)+'\n');
writeFileSync('docs/architecture/artifacts/preview.html',`<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>EXP-LORE — domy o skali postaci</title><style>body{background:#1e1a24;color:#ece6d6;font:16px system-ui;margin:24px}h1{font-size:24px}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;max-width:1000px}figure{margin:0;padding:12px;background:#34302e;display:flex;flex-direction:column;justify-content:end;align-items:center}img{max-width:100%;image-rendering:pixelated}figcaption{font-size:12px;padding-top:10px;text-align:center}@media(max-width:600px){main{grid-template-columns:1fr}}</style><h1>EXP-LORE — duże wejście, maksymalnie trzy kondygnacje</h1><p>Każda kondygnacja ma duże okna i wysokość dopasowaną do postaci. Drzwi nie maleją w wyższych domach. Rasteryzacja programowa, nie zrzuty z gry.</p><p><a href="height-comparison.png" style="color:#ece6d6">Porównanie progów 1–3 / 4–6 / powyżej 6 z postacią</a></p><main>${figures.join('')}</main></html>`);
console.log('21 model previews + HTML contact sheet written');

// These are actual runtime meshes for the seven accepted OSM examples, not study mock-ups.
const {readFileSync}=await import('node:fs');
const fixtures=JSON.parse(readFileSync('docs/architecture/massing/fixtures.json','utf8')).buildings;
mkdirSync('docs/architecture/artifacts/massing',{recursive:true});
const masses=[];
for(const [index,f]of fixtures.entries()){
 const [lon,lat]=f.center,k=111320*Math.cos(lat*Math.PI/180);
 const source:ArchitectureSource={id:f.name,idSource:'geometry',lon,lat,tags:f.tags,rings:f.rings.map((r:[number,number][])=>r.map(p=>[(p[0]-lon)*k,-(p[1]-lat)*111320]))};
 const b=planArchitecture({sources:[source],roads:[],areas:[],countries:{},settings:{...DEFAULT_SETTINGS,scale:1,angleSnap:0},character:characterReference(.25,1.92)}).buildings[0];
 const raster=softwareRaster(buildingMesh(b),3,.72,true),file=`massing/${index}.png`;
 png(`docs/architecture/artifacts/${file}`,raster.width,raster.height,raster.pixels);
 masses.push({name:f.name,file,main:b.rectangles.length,connectors:b.connectors.length,levels:b.levels,door:b.door,center:b.center,openings:b.openings,raster:{x:raster.x,y:raster.y,width:raster.width,height:raster.height,density:3,projection:.72}});
}
writeFileSync('docs/architecture/artifacts/massing/models.json',JSON.stringify(masses,null,2)+'\n');
writeFileSync('docs/architecture/artifacts/massing/index.html',`<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Bryły KUL i bloków — generator gry</title><style>body{font:16px system-ui;background:#f5e8c8;color:#34271d;margin:24px}figure{margin:24px 0;padding:20px;background:#e5d4ae;overflow:auto}img{image-rendering:pixelated;max-width:100%}</style><h1>Bryły KUL i bloków — generator gry</h1><p>Techniczne podglądy rzeczywistej geometrii, fasad i dachu z generatora /test2/. Skala obrysu 1.0; bez mapy, kolizji ulic i dekoracji. Rasteryzacja programowa, nie zrzuty z gry.</p>${masses.map(m=>`<figure><figcaption>${m.name}: ${m.main} skrzydeł, ${m.connectors} niskich łączników, ${m.levels} kond.</figcaption><img src="${m.file.split('/').at(-1)}" alt="${m.name}"></figure>`).join('')}<p>© OpenStreetMap contributors, ODbL 1.0</p></html>`);
console.log('7 actual OSM runtime meshes and review page written');
