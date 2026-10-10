import fs from 'node:fs';
import assert from 'node:assert/strict';
import {CityMap,PX_PER_M} from '../../.cache/quest-tests/city.mjs';
import {planCityQuests} from '../../.cache/quest-tests/planner.mjs';
globalThis.fetch=async url=>new Response(fs.readFileSync('public/'+url),{headers:{'Content-Type':'application/json'}});
for(const id of ['lublin','pulawy']){
 const file=id==='lublin'?'public/map/lublin.json':'public/map/towns/pulawy.json';
 const city=new CityMap(JSON.parse(fs.readFileSync(file)),id);
 const near=id==='lublin'?city.findAnyStart('Plac Zamkowy','Plac Zamkowy'):city.places.find(p=>p.kind==='office')?.door ?? city.places[0].door;
 const start=Date.now();const offers=await planCityQuests(city,near,id==='lublin'?'Lublin':'Puławy',{},{});
 console.log(id,'near',near,'nearby places',city.places.filter(p=>Math.hypot(p.door.x-near.x,p.door.y-near.y)<1000*PX_PER_M).length,'offers',offers.map(q=>({id:q.id,routeM:q.scenariusz.routeM,at:q.scenariusz.giverName})), 'ms',Date.now()-start);
 assert(offers.length>=4,`At least four feasible quests in ${id}`);
 const completed={[offers[0].id]:'done'};const again=await planCityQuests(city,near,id,completed,{});assert(!again.some(q=>q.id===offers[0].id));
}
