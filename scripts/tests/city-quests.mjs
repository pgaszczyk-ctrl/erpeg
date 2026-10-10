import assert from 'node:assert/strict';
import fs from 'node:fs';
import { routeDistance, planCityQuests } from '../../.cache/quest-tests/planner.mjs';
import { materializeScenario, restoreScenario, scenarioPending, CITY_SCENARIOS } from '../../.cache/quest-tests/scenarios.mjs';
import { questText, questTextMetadata } from '../../.cache/quest-tests/text.mjs';
const content=JSON.parse(fs.readFileSync('src/content/questy/catalog.json'));
const ids=new Set();
for(const text of content.texts){assert(!ids.has(text.id),text.id);ids.add(text.id);for(const language of ['pl','en']){const v=text.variants.filter(v=>v.language===language);assert.equal(v.length,1);assert.equal(typeof v[0].localHumor,'boolean');assert(v[0].text.trim());}}
const binding={version:1,mapId:'pulawy',mapName:'Puławy',giverName:'Warsztat',anchors:[{lat:51.41,lon:21.97},{lat:51.411,lon:21.97},{lat:51.412,lon:21.97},{lat:51.413,lon:21.97}],choices:{},routeM:500};
const states={};const taken={};
for(const definition of CITY_SCENARIOS){const m=materializeScenario(definition.id,structuredClone(binding));assert(m.etapy.length);assert.equal(m.id,definition.id);assert(scenarioPending(m.id,states,taken));}
const m=materializeScenario('quest.helper_workshop',structuredClone(binding));
states[m.id]='active';taken[m.id]=m; m.scenariusz.choices.service='creature';
const save=JSON.parse(JSON.stringify({missions:states,gen:[m],etap:{[m.id]:3}}));
const restored=restoreScenario(save.gen[0]);
assert.equal(restored.scenariusz.mapId,'pulawy');assert.equal(restored.scenariusz.choices.service,'creature');assert.equal(save.etap[m.id],3);
assert(!scenarioPending(m.id,save.missions,{[m.id]:restored}),'Active in Puławy must be blocked in Lublin');
save.missions[m.id]='done';save.gen=[];
assert(!scenarioPending(m.id,save.missions,{}),'Done survives empty gen after reload');
assert(!scenarioPending(m.id,{[m.id]:'goal'},{}),'Awaiting reward also blocked');
assert(scenarioPending('quest.clock_opinion',save.missions,{}),'Other scenarios remain available');
const original=questText('quest.clock_opinion.offer','pl'),english=questText('quest.clock_opinion.offer','en');assert.notEqual(original,english);assert.equal(questTextMetadata('intro.clock_wordplay').variants[0].localHumor,true);
// Water wall: no imaginary crossing; a real gap makes a route possible.
const flat={isFree:()=>true};assert.equal(routeDistance(flat,{x:0,y:0},{x:192,y:0},200),100);
const water={isFree:(x,y)=> !(x>=80&&x<=100)};assert.equal(routeDistance(water,{x:0,y:0},{x:192,y:0},200),null);
const bridge={isFree:(x,y)=> !(x>=80&&x<=100&&Math.abs(y-60)>12)};assert(routeDistance(bridge,{x:0,y:0},{x:192,y:0},200)>100);
assert.equal(routeDistance(flat,{x:0,y:0},{x:384,y:0},100),null);
const desert={ensure:async()=>{},places:[]};assert.deepEqual(await planCityQuests(desert,{x:0,y:0},'Desert',{},{}),[]);
console.log(`PASS: ${CITY_SCENARIOS.length} scenarios, ${content.modules.length} design modules, ${ids.size} bilingual records; cross-city/reload/choices, route obstacles/bridge and empty-map checks.`);
