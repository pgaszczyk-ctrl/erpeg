// Dual wielding: one-handed weapons in the second hand add 50 % of their damage and all their powers.
import {stripTypeScriptTypes} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('work/druga-bron-modules');mkdirSync(root,{recursive:true});
const seen=new Set();
function compile(file){
 file=path.resolve(file);if(seen.has(file))return;seen.add(file);
 const js=stripTypeScriptTypes(readFileSync(file,'utf8'),{mode:'transform',disableExperimentalWarning:true});
 const out=js.replace(/(from\s*['"])(\.[^'"]+)(['"])/g,(_,a,b,c)=>{compile(path.resolve(path.dirname(file),b+'.ts'));return a+b+'.js'+c;});
 const dest=path.join(root,path.relative(path.resolve('src'),file)).replace(/\.ts$/,'.js');mkdirSync(path.dirname(dest),{recursive:true});writeFileSync(dest,out);
}
compile('src/inventory.ts');
const inv=await import(path.join(root,'inventory.js'));
const {gear}=inv;
inv.ustawPoziomPostaci(()=>20);
for(const k of ['miecz','luk','magia'])gear.skills[k]=inv.pointsForLevel(10);
gear.magic=true;
// What fits the second hand.
for(const id of ['stalowy','rycerski','pistolet_parowy','rozdzka','gromowladny','tarcza_drewniana','kula'])assert(inv.fits(id,'dystans'),id);
for(const id of ['luk','dlugi_luk','kusza','siekiera','kijek','skorzana_zbroja'])assert(!inv.fits(id,'dystans'),id);
// Two swords: +50 % of the second one's blow.
gear.equip.bron='stalowy';gear.equip.dystans=null;
const one=inv.meleeDamage();
const rycerskiAlone=(gear.equip.bron='rycerski',inv.meleeDamage());
gear.equip.bron='stalowy';gear.equip.dystans='rycerski';
assert(Math.abs(inv.meleeDamage()-(one+0.5*rycerskiAlone))<1e-9,'two swords');
// A sword in the second hand isn't armour.
assert.equal(inv.defense(),0);
// Two pistols.
gear.equip.bron='pistolet_parowy';gear.equip.dystans=null;
const p=inv.item('pistolet_parowy');const shot=inv.shotDamage(p);
gear.equip.dystans='pistolet_parowy';
assert(Math.abs(inv.shotDamage(p)-1.5*shot)<1e-9,'two pistols');
// Pistol + shield: the shield still guards, no damage bonus.
gear.equip.dystans='tarcza_okuta';
assert.equal(inv.shotDamage(p),shot);assert(inv.defense()>0);
// A bow needs both hands: the second weapon sleeps.
gear.equip.bron='luk';gear.equip.dystans='rycerski';
assert.equal(inv.bronDrugiejReki(),undefined);
// Powers of the second weapon work in full (thunder sword in the left hand).
gear.equip.bron='stalowy';gear.equip.dystans='gromowladny';
assert(inv.efektBroni('pioruny'));assert.equal(inv.weaponEffect(),'pioruny');
assert.equal(inv.zywiolBroni(),'piorun');assert(inv.lancuchBroni());
gear.equip.bron='swietlisty';
assert(inv.efektBroni('swiatlo')&&inv.efektBroni('pioruny'),'both powers');
// Dragging onto the second hand.
gear.equip.bron='stalowy';gear.equip.dystans=null;gear.bag=[{item:'rycerski'},{item:'luk'}];
assert.equal(inv.moveThing({zone:'bag',i:0},{zone:'eq',m:'dystans'}),'');assert.equal(gear.equip.dystans,'rycerski');
assert.notEqual(inv.moveThing({zone:'bag',i:0},{zone:'eq',m:'dystans'}),'');
// Old saves keep a one-handed second weapon, move bows away.
inv.loadGear({equip:{bron:'stalowy',dystans:'rycerski'}});assert.equal(gear.equip.dystans,'rycerski');
inv.loadGear({equip:{bron:'stalowy',dystans:'luk'}});assert.equal(gear.equip.dystans,null);
console.log('druga-bron OK');
