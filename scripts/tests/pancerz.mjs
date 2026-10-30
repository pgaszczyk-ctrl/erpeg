// Pure catalog/settings/loot checks, including compatibility with saved IDs.
import {stripTypeScriptTypes} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('work/pancerz-modules');mkdirSync(root,{recursive:true});
const seen=new Set();
function compile(file){
 file=path.resolve(file);if(seen.has(file))return;seen.add(file);
 const src=readFileSync(file,'utf8');
 const js=stripTypeScriptTypes(src,{mode:'transform',disableExperimentalWarning:true});
 const out=js.replace(/(from\s*['"])(\.[^'"]+)(['"])/g,(_,a,b,c)=>{compile(path.resolve(path.dirname(file),b+'.ts'));return a+b+'.js'+c;});
 const dest=path.join(root,path.relative(path.resolve('src'),file)).replace(/\.ts$/,'.js');mkdirSync(path.dirname(dest),{recursive:true});writeFileSync(dest,out);
}
compile('src/inventory.ts');compile('src/content/pancerz.ts');compile('src/content/stwory.ts');
const inv=await import(path.join(root,'inventory.js'));
const {PRZEDMIOTY}=await import(path.join(root,'content/przedmioty.js'));
const {poPancerzu,pancerze,ustawPancerze,kluczPancerza,losujPancerz}=await import(path.join(root,'content/pancerz.js'));
const {losujJakosc,losujLup,ustawStwory,lupOpcje}=await import(path.join(root,'content/stwory.js'));
assert.equal(new Set(PRZEDMIOTY.map(p=>p.id)).size,PRZEDMIOTY.length);
for(const [id,expected] of [['skorzana_zbroja',[5,6,7,8,10]],['skorzany_helm',[2,3,4,5,6]],['skorzane_buty',[1,2,3,4,5]]]){
 assert.deepEqual(pancerze().filter(p=>p.baza===id).map(p=>p.moc),expected);
 assert(lupOpcje().some(o=>o.id===`los_${id}`&&o.grupa==='Pancerze — losowa jakość'));
 for(let q=0;q<5;q++){
  ustawStwory({wilk:{lup:[{co:`los_${id}`,ile:1,szansa:100}]}});
  const roll=[0,[.1,.3,.5,.8,.99][q]];
  const out=losujLup('wilk',()=>roll.shift());
  assert.equal(inv.item(out[0].co).moc,expected[q]);
 }
}
assert.equal(poPancerzu(20,0),20);assert.equal(poPancerzu(20,30),10);
assert.equal(poPancerzu(20,100,false),20);
assert(poPancerzu(.1,10000)>0);assert.equal(poPancerzu(-1,5),0);
inv.loadGear({equip:{bron:'kijek',zbroja:'skorzana_zbroja',helm:'skorzany_helm',buty:'skorzane_buty'},bag:[{item:'skorzana_zbroja_jakosc4'}]});
assert.equal(inv.defense(),11);assert.equal(inv.blockChance(),0);
inv.equipFromBag(0);assert.equal(inv.defense(),15);assert.equal(inv.gear.bag[0].item,'skorzana_zbroja');
const saved=JSON.parse(JSON.stringify(inv.saveGear()));inv.loadGear(saved);assert.equal(inv.defense(),15);
assert.equal(inv.moveThing({zone:'eq',m:'zbroja'},{zone:'bag',i:1}),'');assert.equal(inv.defense(),5);
ustawPancerze({[kluczPancerza('skorzana_zbroja')]:17});assert.equal(inv.item('skorzana_zbroja').moc,17);
ustawPancerze({});assert.equal(inv.item('skorzana_zbroja').moc,6);
assert(pancerze().every(p=>kluczPancerza(p.id).length<=40));
assert.equal(losujPancerz(()=>.5,losujJakosc),null);
const rolls=[0,0,0];assert.equal(losujPancerz(()=>rolls.shift(),losujJakosc),'skorzana_zbroja_jakosc0');
assert.equal(inv.normalizeSlot({item:'skorzany_helm_jakosc4'}).item,'skorzany_helm_jakosc4');
console.log('PASS: armour families, sums, mitigation, magic bypass, weak hits, loot qualities, settings reset and save/equip compatibility.');
