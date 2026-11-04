import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import { CityMap } from '../../src/map/CityMap';
import { planAnchors } from '../../src/prolog/planner';
for(const [id,path,name] of [['lublin','.cache/lublin-full.json','Plac Zamkowy'],['pulawy','public/map/towns/pulawy.json','Puławy']]){
 const raw=JSON.parse(readFileSync(path,'utf8'));
 const city=new CityMap(raw,id);
 const start=city.findAnyStart(name,name)??{x:city.width/2,y:city.height/2};
 const home=city.reachableNear(start.x,start.y);
 const p=planAnchors(city,home,[],name);
 assert(Object.values(p.anchors).length===6);
 for(const a of Object.values(p.anchors)){const q=city.fromLatLon(a.lat,a.lon);assert(city.isFree(q.x,q.y+4,3,2),a.id);}
 assert(p.walkM<3000);
 console.log(id,JSON.stringify({walkM:Math.round(p.walkM),places:Object.fromEntries(Object.entries(p.anchors).map(([k,a])=>[k,{name:a.name,fallback:a.fallback}]))}));
}
