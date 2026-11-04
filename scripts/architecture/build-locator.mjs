// A flat, real OSM reference map, generated from the game's existing tiles.
// No API, external tiles, architecture sampling or changes to terrain assets.
import {readFileSync,writeFileSync,mkdirSync,existsSync,statSync} from 'node:fs';
import {CityMap,PX_PER_M} from '../../src/map/CityMap.ts';
import {LUBLIN_PLACES,LUBLIN_OVERVIEW as bounds} from '../../src/test2/locations.ts';
const indexPath='public/map/lublin.json',out='public/architecture/lublin-reference.svg';
const newest=Math.max(statSync(indexPath).mtimeMs,statSync(new URL(import.meta.url)).mtimeMs,statSync('src/test2/locations.ts').mtimeMs);
if(existsSync(out)&&statSync(out).mtimeMs>=newest){console.log('Lublin reference: up to date');process.exit(0);}
const raw=JSON.parse(readFileSync(indexPath,'utf8')),city=new CityMap(raw,'lublin');
const nw=city.fromLatLon(bounds.north,bounds.west),se=city.fromLatLon(bounds.south,bounds.east),scale=1000/(se.x-nw.x),height=(se.y-nw.y)*scale,k=PX_PER_M/raw.unitsPerM;
const decode=(flat)=>{let x=0,y=0;const p=[];for(let i=0;i<flat.length;i+=2){x=i?x+flat[i]:flat[i];y=i?y+flat[i+1]:flat[i+1];p.push([x*k,y*k]);}return p;};
const inView=p=>{const xs=p.map(q=>q[0]),ys=p.map(q=>q[1]);return Math.max(...xs)>=nw.x&&Math.min(...xs)<=se.x&&Math.max(...ys)>=nw.y&&Math.min(...ys)<=se.y;};
// Overview cartography: remove sub-pixel vertices; the local plan retains exact rings.
const vector=points=>{
 const out=[];for(const p of points){const q=[Math.round((p[0]-nw.x)*scale*2)/2,Math.round((p[1]-nw.y)*scale*2)/2],last=out.at(-1);if(!last||q[0]!==last[0]||q[1]!==last[1])out.push(q);}
 return out;
};
const line=p=>p.map(q=>`${q[0]},${q[1]}`).join('L');
const buildings=new Map(),roads=new Map();
for(const name of raw.tiles){
 const tile=JSON.parse(readFileSync(`public/map/lublin/${name.replace(',','_')}.json`,'utf8'));
 for(const [id,rings]of tile.b??[])if(!buildings.has(id)){
  const decoded=rings.map(decode);if(inView(decoded[0]))buildings.set(id,decoded);
 }
 for(const [id,kind,,pts]of tile.l??[])if(!roads.has(id)&&['major','medium','minor','pedestrian','rail'].includes(kind)){
  const decoded=decode(pts);if(inView(decoded))roads.set(id,{kind,points:decoded});
 }
}
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${height.toFixed(2)}" viewBox="0 0 1000 ${height.toFixed(2)}"><title>Lublin — plan źródłowy OpenStreetMap</title><desc>Rzeczywiste drogi i obrysy z danych mapy gry. © OpenStreetMap contributors, ODbL.</desc><rect width="1000" height="100%" fill="#f4ecd9"/><g fill="#a49b8c" fill-rule="evenodd">`;
let buildingPath='';
for(const rings of buildings.values())for(const ring of rings){const p=vector(ring);if(p.length>=3)buildingPath+='M'+line(p)+'Z';}
svg+=`<path d="${buildingPath}"/></g><g fill="none" stroke="#6b6357" stroke-linecap="round" stroke-linejoin="round">`;
for(const kind of ['minor','rail','pedestrian','medium','major']){
 let d='';for(const road of roads.values())if(road.kind===kind){const p=vector(road.points);if(p.length>=2)d+='M'+line(p);}
 const width=kind==='major'?3:kind==='medium'?1.8:kind==='rail'?1:.65;svg+=`<path stroke-width="${width}" d="${d}"/>`;
}
svg+='</g>';
for(const id of ['oldtown','kul','dziewanny','station','industrial']){
 const p=LUBLIN_PLACES[id],q=city.fromLatLon(p.lat,p.lon),x=(q.x-nw.x)*scale,y=(q.y-nw.y)*scale;
 svg+=`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3.5" fill="#775725"/><text x="${(x+6).toFixed(2)}" y="${(y-5).toFixed(2)}" font-family="sans-serif" font-size="16" font-weight="bold" fill="#352b20" stroke="#f4ecd9" stroke-width="3" paint-order="stroke">${p.short}</text>`;
}
svg+='</svg>';mkdirSync('public/architecture',{recursive:true});writeFileSync(out,svg);
console.log(`Lublin reference: ${buildings.size} building outlines, ${roads.size} road lines, ${(svg.length/1e6).toFixed(2)} MB SVG`);
