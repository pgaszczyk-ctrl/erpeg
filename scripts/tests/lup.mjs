// Łup (22.11.2026): zwierzęta bez złota i ekwipunku (też z panelu admina), rzadkość z jakości, grudki złota.
// Run: node scripts/tests/lup.mjs
import {stripTypeScriptTypes} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('work/lup-modules');mkdirSync(root,{recursive:true});
const seen=new Set();
function compile(file){
 file=path.resolve(file);if(seen.has(file))return;seen.add(file);
 const src=readFileSync(file,'utf8');
 const js=stripTypeScriptTypes(src,{mode:'transform',disableExperimentalWarning:true});
 const out=js.replace(/(from\s*['"])(\.[^'"]+)(['"])/g,(_,a,b,c)=>{compile(path.resolve(path.dirname(file),b+'.ts'));return a+b+'.js'+c;});
 const dest=path.join(root,path.relative(path.resolve('src'),file)).replace(/\.ts$/,'.js');mkdirSync(path.dirname(dest),{recursive:true});writeFileSync(dest,out);
}
compile('src/content/stwory.ts');compile('src/content/rzadkosc.ts');
const {losujLup,ustawStwory,DOMYSLNY_LUP,ZWIERZETA}=await import(path.join(root,'content/stwory.js'));
const {rzadkoscPrzedmiotu}=await import(path.join(root,'content/rzadkosc.js'));
const {PRZEDMIOTY}=await import(path.join(root,'content/przedmioty.js'));
const sprzet=(co)=>co.startsWith('los_')||PRZEDMIOTY.some(p=>p.id===co);
// Defaults: animals carry neither gold nor gear; imps and bandits do carry gold.
for(const r of ZWIERZETA)for(const w of DOMYSLNY_LUP[r]??[])assert(w.co!=='zloto'&&!sprzet(w.co),`${r}: ${w.co}`);
assert(DOMYSLNY_LUP.glut.some(w=>w.co==='zloto'));assert(DOMYSLNY_LUP.bandyta.some(w=>w.co==='zloto'));
// Admin rows can't put gold or a sword on a wolf; the rest of the row list still counts.
ustawStwory({wilk:{lup:[{co:'zloto',ile:5,szansa:100},{co:'zelazny',ile:1,szansa:100},{co:'los_skorzana_zbroja',ile:1,szansa:100},{co:'kiel',ile:2,szansa:100}]},glut:{lup:[{co:'zloto',ile:5,szansa:100},{co:'zelazny',ile:1,szansa:100}]}});
assert.deepEqual(losujLup('wilk',()=>0),[{co:'kiel',ile:2}]);
assert.deepEqual(losujLup('glut',()=>0).map(x=>x.co),['zloto','zelazny']);
ustawStwory({});
for(let i=0;i<500;i++)for(const r of ['wilk','warg','koziol'])for(const x of losujLup(r)??[])assert(x.co!=='zloto'&&!sprzet(x.co));
// Rarity from quality; mythic = unique.
assert.equal(rzadkoscPrzedmiotu('zelazny_jakosc0'),'kiepski');
assert.equal(rzadkoscPrzedmiotu('zelazny'),'zwykly');
assert.equal(rzadkoscPrzedmiotu('zelazny_jakosc2'),'niepospolity');
assert.equal(rzadkoscPrzedmiotu('zelazny_jakosc3'),'rzadki');
assert.equal(rzadkoscPrzedmiotu('skorzana_zbroja_jakosc4'),'epicki');
assert.equal(rzadkoscPrzedmiotu('swietlisty'),'unikat');
assert.equal(rzadkoscPrzedmiotu('korona'),'unikat');
assert.equal(rzadkoscPrzedmiotu('paczek'),'zwykly');
console.log('lup: ok');
