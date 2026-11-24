// Własne przedmioty z panelu: wpis → przedmiot gry, rzadkość, łup miejsc, wyłączone nie wypadają, broń nie gubi obrażeń.
// node scripts/tests/przedmioty-wlasne.mjs
import {stripTypeScriptTypes} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve('work/przedmioty-wlasne-modules');mkdirSync(root,{recursive:true});
const seen=new Set();
function compile(file){
 file=path.resolve(file);if(seen.has(file))return;seen.add(file);
 const js=stripTypeScriptTypes(readFileSync(file,'utf8'),{mode:'transform',disableExperimentalWarning:true});
 const out=js.replace(/(from\s*['"])(\.[^'"]+)(['"])/g,(_,a,b,c)=>{compile(path.resolve(path.dirname(file),b+'.ts'));return a+b+'.js'+c;});
 const dest=path.join(root,path.relative(path.resolve('src'),file)).replace(/\.ts$/,'.js');mkdirSync(path.dirname(dest),{recursive:true});writeFileSync(dest,out);
}
for(const f of ['inventory','content/przedmiotyWlasne','content/rzadkosc','content/stwory','content/bron','content/pancerz'])compile(`src/${f}.ts`);
const m=(f)=>import(path.join(root,f+'.js'));
const {PRZEDMIOTY}=await m('content/przedmioty');
const {ustawWlasne,OBRAZKI_WLASNE}=await m('content/przedmiotyWlasne');
const {rzadkoscPrzedmiotu}=await m('content/rzadkosc');
const {ustawStwory,losujLup,lupOpcje}=await m('content/stwory');
const {ustawBronie,bronie}=await m('content/bron');
const {ustawPancerze}=await m('content/pancerz');
import assert from 'node:assert/strict';
const n0 = PRZEDMIOTY.length;
const lista = [
  { id: 'w_ostrze', dane: { nazwa: { pl: 'Ostrze Burzy', en: 'Storm Blade' }, miejsce: 'bron', obrazenia: [12, 18], wymaganySkill: 6, rzadkosc: 'epicki', umiejetnosc: 'zamach', wytrzymalosc: 900 }, ikona: 'data:image/png;base64,AA', ikona_hd: 'data:image/webp;base64,BB' },
  { id: 'w_helm', dane: { nazwa: { pl: 'Hełm Mgły' }, miejsce: 'helm', moc: 9, rzadkosc: 'unikat' }, aktywny: false },
  { id: 'zle id', dane: { nazwa: { pl: 'x' }, miejsce: 'bron' } },
];
ustawWlasne(lista);
assert.equal(PRZEDMIOTY.length, n0 + 2);
const o = PRZEDMIOTY.find((p) => p.id === 'w_ostrze');
assert.deepEqual(o.obrazenia, [12, 18]); assert.equal(o.wymaganySkill, 6); assert.equal(o.umiejetnosc, 'zamach');
assert.equal(rzadkoscPrzedmiotu('w_ostrze'), 'epicki'); assert.equal(rzadkoscPrzedmiotu('w_helm'), 'unikat');
assert.equal(OBRAZKI_WLASNE.get('w_ostrze').duzy, 'data:image/webp;base64,BB');
// Pokrętła broni/pancerzy nie kasują liczb własnych przedmiotów i nie pokazują ich w repozytoriach
ustawBronie({}); ustawPancerze({});
assert.deepEqual(o.obrazenia, [12, 18]); assert.equal(PRZEDMIOTY.find((p) => p.id === 'w_helm').moc, 9);
assert.ok(!bronie().some((p) => p.wlasny));
assert.ok(lupOpcje().some((x) => x.id === 'w_ostrze' && x.grupa.startsWith('Własne')));
// Łup miejsca; wyłączony przedmiot nie wypada
ustawStwory({ miejsce_skrzynia_ukryta: { exp: null, lup: [{ co: 'w_ostrze', ile: 1, szansa: 100 }, { co: 'w_helm', ile: 1, szansa: 100 }] } });
assert.deepEqual(losujLup('miejsce_skrzynia_ukryta', () => 0), [{ co: 'w_ostrze', ile: 1 }]);
assert.equal(losujLup('miejsce_banda'), null);
// Zwierzęta nie upuszczają ekwipunku, także własnego
ustawStwory({ wilk: { exp: null, lup: [{ co: 'w_ostrze', ile: 1, szansa: 100 }] } });
assert.equal(losujLup('wilk', () => 0), null);
// Ponowne wczytanie podmienia, nie dubluje
ustawWlasne(lista.slice(0, 1));
assert.equal(PRZEDMIOTY.length, n0 + 1);
console.log('przedmioty-wlasne: ok');
