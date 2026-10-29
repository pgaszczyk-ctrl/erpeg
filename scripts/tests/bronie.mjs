// Pure catalog/settings/loot checks, including compatibility with saved IDs.
import {stripTypeScriptTypes} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('work/bronie-modules');mkdirSync(root,{recursive:true});
const seen=new Set();
function compile(file){
 file=path.resolve(file);if(seen.has(file))return;seen.add(file);
 const src=readFileSync(file,'utf8');
 const js=stripTypeScriptTypes(src,{mode:'transform',disableExperimentalWarning:true});
 const out=js.replace(/(from\s*['"])(\.[^'"]+)(['"])/g,(_,a,b,c)=>{compile(path.resolve(path.dirname(file),b+'.ts'));return a+b+'.js'+c;});
 const dest=path.join(root,path.relative(path.resolve('src'),file)).replace(/\.ts$/,'.js');mkdirSync(path.dirname(dest),{recursive:true});writeFileSync(dest,out);
}
compile('src/inventory.ts');compile('src/ui/itemIcon.ts');compile('src/content/bron.ts');compile('src/content/stwory.ts');
const {PRZEDMIOTY,UMIEJETNOSCI}=await import(path.join(root,'content/przedmioty.js'));
const {kodujZakres,kluczBroni,ustawBronie,obrazeniaBroni}=await import(path.join(root,'content/bron.js'));
const {lupOpcje,ustawStwory,losujLup,losujJakosc}=await import(path.join(root,'content/stwory.js'));
assert.equal(new Set(PRZEDMIOTY.map(p=>p.id)).size,PRZEDMIOTY.length);
assert.deepEqual(['miecz','luk','magia'].map(k=>UMIEJETNOSCI[k].nazwa),['Krzepa','Celność','Skupienie']);
for(const [id,min,max] of [['kijek',3,5],['zelazny',5,7],['stalowy',7,10]]){
 const family=PRZEDMIOTY.filter(p=>p.baza===id);assert.equal(family.length,5);
 for(const p of family){assert.deepEqual(p.obrazenia,[min+p.jakosc,max+p.jakosc]);assert(p.id.length<=40);assert(kluczBroni(p.id).length<=40);assert(lupOpcje().some(o=>o.id===p.id));}
}
assert.deepEqual([0,.20999,.21,.42999,.43,.67999,.68,.89999,.9,.99999].map(n=>losujJakosc(()=>n)),[0,0,1,1,2,2,3,3,4,4]);
const sword=PRZEDMIOTY.find(p=>p.id==='zelazny');assert.match(sword.nazwa,/Miecz treningowy/);
assert.equal(obrazeniaBroni(sword,13,4,()=>0),6*1.48);
assert.equal(obrazeniaBroni(sword,13,4,()=>.999),8*1.48);
assert.equal(obrazeniaBroni(sword,13,4),7*1.48);
for(const bad of [[8,7],[0,1],[1,10001],[1.5,3],[NaN,3]])assert.throws(()=>kodujZakres(...bad));
ustawBronie({[kluczBroni('zelazny')]:kodujZakres(12,15)});assert.deepEqual(sword.obrazenia,[12,15]);
ustawBronie({[kluczBroni('zelazny')]:-1});assert.deepEqual(sword.obrazenia,[6,8]);
ustawStwory({wilk:{exp:12,lup:[{co:'stalowy_jakosc4',ile:1,szansa:100}]}});
assert.deepEqual(losujLup('wilk',()=>0),[{co:'stalowy_jakosc4',ile:1}]);
ustawStwory({wilk:{lup:[{co:'los_zelazny',ile:2,szansa:100}]}});
assert.deepEqual(losujLup('wilk',()=>.999),[{co:'zelazny_jakosc4',ile:2}]);
ustawBronie({wytrzymalosc_mnoznik:2});assert.equal(sword.wytrzymalosc,1200);
ustawBronie({wytrzymalosc_mnoznik:2,bron_zelazny_trwalosc:700});assert.equal(sword.wytrzymalosc,700);
ustawBronie({});assert.equal(sword.wytrzymalosc,600);
assert(PRZEDMIOTY.some(p=>p.id==='rycerski'&&!p.obrazenia));
console.log('PASS: 15 variants, saved IDs, ranges, additive 2%/6%, validation/reset, fixed/random loot.');

const inv=await import(path.join(root,'inventory.js'));
const {itemPictureUrl,itemTexture}=await import(path.join(root,'ui/itemIcon.js'));
assert.equal(itemPictureUrl('luk_rekruta'),'items/luk.png');assert.equal(itemTexture('luk_rekruta'),'item-luk');
const {gear,freshGear,pointsForLevel,equipFromBag,moveThing,addItem,weaponRequirement,meleeDamage,shotDamage,rangedWeapon}=inv;
Object.assign(gear,freshGear());
gear.bag=[{item:'stalowy_jakosc4'}];
const before=JSON.stringify(gear);
equipFromBag(0);assert.equal(JSON.stringify(gear),before);
assert.match(moveThing({zone:'bag',i:0},{zone:'eq',m:'bron'}),/Wymaga krzepy: 5/);
assert.equal(JSON.stringify(gear),before);
assert.equal(addItem('zelazny'),'bag');assert.equal(gear.equip.bron,'kijek');
// An older save may already wear a locked weapon. It stays owned but cannot attack or confer effects.
gear.equip.bron='stalowy_jakosc4';assert.equal(meleeDamage(),0);
gear.skills.luk=pointsForLevel(20);assert(weaponRequirement('stalowy_jakosc4'));
gear.skills.miecz=pointsForLevel(5);assert.equal(weaponRequirement('stalowy_jakosc4'),null);assert(meleeDamage()>0);
equipFromBag(0);assert.equal(gear.equip.bron,'stalowy_jakosc4');
gear.skills.luk=0;gear.equip.bron='dlugi_luk';assert.equal(rangedWeapon(),null);assert.equal(shotDamage(inv.item('dlugi_luk')),0);
gear.skills.luk=pointsForLevel(7);assert.equal(rangedWeapon().id,'dlugi_luk');
const wand=inv.item('rozdzka');wand.wymaganySkill=3;
gear.skills.magia=0;gear.magic=true;gear.equip.bron='rozdzka';assert.equal(rangedWeapon(),null);
gear.skills.magia=pointsForLevel(3);assert.equal(rangedWeapon().id,'rozdzka');wand.wymaganySkill=1;
gear.skills.miecz=0;gear.equip.bron='stalowy';gear.bag=[{item:'rycerski'}];
const locked=JSON.stringify(gear);assert.match(moveThing({zone:'eq',m:'bron'},{zone:'bag',i:0}),/Wymaga/);assert.equal(JSON.stringify(gear),locked);
assert.equal(moveThing({zone:'eq',m:'bron'},{zone:'bag',i:1}),'');assert.equal(gear.equip.bron,'kijek');assert(gear.bag.some(s=>s.item==='stalowy'));
gear.skills={miecz:0,luk:0,magia:0};
for(const id of ['kijek','miecz_rekruta','luk_rekruta','rozdzka_szkolna','luk','rozdzka'])assert.equal(weaponRequirement(id),null);
console.log('PASS: weapon skill thresholds, click/drag/reverse swap/loot, old saves, bows/magic, training icons.');
