import assert from 'node:assert/strict';
import fs from 'node:fs';
import { materializeScenario, restoreScenario } from '../../.cache/quest-tests/scenarios.mjs';
import { effectiveStage, addClue, readProgress, arrangeCard, missionNotes } from '../../.cache/quest-tests/progress.mjs';
import { setLanguage } from '../../.cache/quest-tests/i18n.mjs';
import { legacyText } from '../../.cache/quest-tests/text.mjs';
const binding=()=>({version:1,mapId:'pulawy',mapName:'Puławy',giverName:'Punkt',anchors:[0,1,2,3].map(i=>({lat:51.4+i/1000,lon:21.9})),choices:{},routeM:800});
const pack=JSON.parse(fs.readFileSync('src/content/questy/catalog.json'));
// Every reference in nested branch/evidence/card definitions must be complete in both languages.
for(const language of ['pl','en']){
 setLanguage(language);
 for(const definition of JSON.parse(fs.readFileSync('src/content/questy/runtime.json'))){
  const m=materializeScenario(definition.id,binding());
  const inspect=z=>{
   assert(z.cel?.trim());
   if(z.typ==='uklad'){assert.equal(z.karty.length,z.kolejnosc.length);assert.equal(new Set(z.kolejnosc).size,z.kolejnosc.length);assert(z.kolejnosc.every(id=>z.karty.some(c=>c.id===id)));}
   if(z.typ==='badanie'){assert(z.tropy.length>=z.ile);assert.equal(new Set(z.tropy.map(c=>c.id)).size,z.tropy.length);}
   for(const v of z.warianty ?? [])inspect(v.etap);
  };
  m.etapy.forEach(inspect);
 }
}
setLanguage('pl');
const pact=materializeScenario('quest.pact_pages',binding());
const ids=pact.etapy[0].tropy.map(c=>c.id);
for(const a of ids)for(const b of ids.filter(b=>b!==a)){
 const choices={};addClue(choices,'clues:0',ids,a);addClue(choices,'clues:0',ids,a);assert.equal(readProgress(choices,'clues:0',ids).length,1);
 addClue(choices,'clues:0',ids,b);assert.equal(readProgress(choices,'clues:0',ids).length,2);
 const chosen=pact.etapy[0].tropy.filter(c=>[a,b].includes(c.id));
 const sectors=chosen.map(c=>c.tekst.match(/\{(.*?)\}/)[1].split(', '));assert.deepEqual(sectors[0].filter(s=>sectors[1].includes(s)),['B']);
}
pact.scenariusz.choices['clues:0']='receiver_bc';
const reload=restoreScenario(JSON.parse(JSON.stringify(pact)));assert(missionNotes(reload).includes('{B, C}'));
setLanguage('en');const english=restoreScenario(JSON.parse(JSON.stringify(reload)));assert(missionNotes(english).includes('needle'));assert.equal(english.scenariusz.choices['clues:0'],'receiver_bc');
const core=materializeScenario('quest.core_trip',binding());core.scenariusz.choices.mode='precision';assert.deepEqual(effectiveStage(core,1).kolejnosc,['short','medium','long']);core.scenariusz.choices.mode='power';assert.deepEqual(effectiveStage(core,1).kolejnosc,['disconnect','clear','connect']);
const flask=materializeScenario('quest.flask_guardian',binding());flask.scenariusz.choices.essence='water';assert.equal(effectiveStage(flask,1).typ,'uklad');flask.scenariusz.choices.essence='leaf';assert.equal(effectiveStage(flask,1).typ,'melodia');
const choices={};assert.equal(arrangeCard(choices,'cards:1',['a','b','c'],'b').correct,false);assert.equal(choices['cards:1'],'');assert.equal(arrangeCard(choices,'cards:1',['a','b','c'],'a').complete,false);const saved=JSON.parse(JSON.stringify(choices));assert.equal(arrangeCard(saved,'cards:1',['a','b','c'],'b').complete,false);assert.equal(arrangeCard(saved,'cards:1',['a','b','c'],'c').complete,true);
// Legacy accepted quest must not silently gain a new stage or have its answer changed.
const old={...flask,etapy:[{typ:'napraw',miejsce:binding().anchors[1],cel:'Zamontuj wybrany element przy strażniku.',sekund:6}],scenariusz:{...flask.scenariusz,revision:undefined}};
assert.equal(restoreScenario(old).etapy.length,1);assert.equal(restoreScenario(old).etapy[0].typ,'napraw');
assert.equal(legacyText('Doręcz pismo urzędowe pod adres 香港 Central 12. Za potwierdzenie odbioru czeka nagroda.'),'Deliver an official letter to 香港 Central 12. There is a reward for confirming its receipt.');
assert.equal(legacyText('Przynieś 5 grzybów z lasu'),'Bring 5 mushrooms from the forest');
assert(legacyText('Hmm… Czuję, że widziałeś cień. Ale jesteś jeszcze za słaby na tę opowieść. Wróć, gdy osiągniesz 5. poziom.').includes('5'));
assert(!legacyText('Wiedza o nieznanym przedmiocie').includes('undefined'));
setLanguage('pl');assert.equal(legacyText('Bring 5 mushrooms from the forest'),'Przynieś 5 grzybów z lasu');
console.log('PASS: all branch/card/clue PL/EN references; all clue pairs; duplicate clue prevention; saved partial cards; branch activities; language reload; legacy stage preservation; named-place template translation.');
