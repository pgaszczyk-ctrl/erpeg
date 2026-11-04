import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve('work/shop-sales-modules'), seen = new Set();
function compile(file) {
  file = path.resolve(file); if (seen.has(file)) return; seen.add(file);
  const js = stripTypeScriptTypes(readFileSync(file, 'utf8'), { mode: 'transform', disableExperimentalWarning: true });
  const out = js.replace(/(from\s*['"])(\.[^'"]+)(['"])/g, (_, a, b, c) => { compile(path.resolve(path.dirname(file), b + '.ts')); return a + b + '.js' + c; });
  const dest = path.join(root, path.relative(path.resolve('src'), file)).replace(/\.ts$/, '.js');
  mkdirSync(path.dirname(dest), { recursive: true }); writeFileSync(dest, out);
}
compile('src/shopSales.ts'); compile('src/ui/shopData.ts');
const { bagSaleOffer, sellBagItem } = await import(path.join(root, 'shopSales.js'));
const { gear, freshGear, item } = await import(path.join(root, 'inventory.js'));
const { shopBagItem } = await import(path.join(root, 'ui/shopData.js'));
Object.assign(gear, freshGear());
const sword = { item: 'zelazny' }, duplicate = { item: 'zelazny' }, helmet = { item: 'zelazny_helm' };
gear.equip.bron = 'zelazny'; gear.bag = [sword, duplicate, helmet];
assert.equal(bagSaleOffer(sword).price, 600);
gear.wear.zelazny = 300; assert.equal(bagSaleOffer(sword).price, 300);
assert(shopBagItem(sword, 1, 0).stats.some(([name, value]) => name === 'Wytrzymałość' && value === '300/600'));
gear.wear.zelazny = 600; assert.equal(bagSaleOffer(sword).price, 1);
delete gear.wear.zelazny;
assert.equal(sellBagItem({ item: 'zelazny' }), 0, 'equal-looking objects cannot sell another slot');
assert.equal(sellBagItem(sword), 600); assert.deepEqual(gear.bag, [duplicate, helmet]);
assert.equal(gear.equip.bron, 'zelazny', 'worn weapon is untouched');
assert.equal(sellBagItem(sword), 0, 'stale callback cannot sell the shifted duplicate');
assert.equal(sellBagItem(helmet), Math.floor(item(helmet.item).cena * .4));
assert.deepEqual(gear.bag, [duplicate]);
assert.equal(sellBagItem(duplicate), 600); assert.deepEqual(gear.bag, []);
for (const slot of [{ item: 'korona' }, { item: 'miecz_rekruta' }, { item: 'paczek' }, { item: 'hulajnoga_parowa' }, { item: 'unknown' }, { esencja: 'dab' }, { goods: 'owoce', counts: { jablko: 2 } }]) {
  gear.bag = [slot]; const before = JSON.stringify(gear);
  assert.equal(bagSaleOffer(slot).price, 0); assert(bagSaleOffer(slot).reason);
  assert.equal(sellBagItem(slot), 0); assert.equal(JSON.stringify(gear), before);
  if (!('goods' in slot)) assert(shopBagItem(slot, 0, 0).disabledReason);
}
const rare = { item: 'stalowy_jakosc4' }; gear.bag = [rare];
assert.equal(bagSaleOffer(rare).price, Math.floor(item(rare.item).cena * .4));
console.log('PASS: worn equipment, individual duplicates, exact identity/stale callbacks, protected rewards, premium items and essence, quality variants');
