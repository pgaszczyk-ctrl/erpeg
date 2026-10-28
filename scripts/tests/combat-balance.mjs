// Resource budget at level 1: attacking must exhaust; repositioning must allow recovery.
import assert from 'node:assert/strict';
import { ZASOBY, zasoby, wczytajZasoby, wydajStamine, regenerujZasoby, wyczerpany, maxStaminy, zapiszZasoby } from '../../src/content/zasoby.ts';

wczytajZasoby(undefined, 1);
for (let i = 0; i < 10; i++) {
  wydajStamine(ZASOBY.koszt.cios, 1, false);
  regenerujZasoby(0.32, 1, false);
}
assert.equal(zasoby.s, 0, 'ten ordinary blows exhaust a level 1 hero');
assert(wyczerpany(1));
const before = zapiszZasoby();
assert(!wydajStamine(ZASOBY.koszt.mocny, 1), 'empty stamina blocks the strong skill');
assert.deepEqual(zapiszZasoby(), before, 'rejected skill takes nothing');
regenerujZasoby(1, 1, false);
assert.equal(zasoby.s, 0, 'no immediate recovery between blows');
for (let i = 0; i < 250; i++) regenerujZasoby(0.02, 1, false);
assert(zasoby.s >= 25 && zasoby.s < 35, 'six seconds of retreat restore about 30 stamina');
assert(!wyczerpany(1));
for (let i = 0; i < 100; i++) {
  wydajStamine(ZASOBY.koszt.cios, 1, false);
  regenerujZasoby(0.6, 1, false);
}
assert.equal(zasoby.s, 0);
const recovery = (dt) => {
  wczytajZasoby({ s: 0, m: 0 }, 1);
  wydajStamine(1, 1, false);
  for (let i = 0; i < Math.round(6 / dt); i++) regenerujZasoby(dt, 1, false);
  return zasoby.s;
};
assert(Math.abs(recovery(1 / 30) - recovery(1 / 120)) < 0.25, 'recovery independent of frame rate');
wczytajZasoby({ s: 13, m: 7 }, 1);
assert.deepEqual(zapiszZasoby(), { s: 13, m: 7 }, 'save/load preserves depleted pools');
assert(maxStaminy(5) > maxStaminy(1), 'progression increases the stamina budget');
console.log('OK: level 1 depletion, retreat, failed skill, FPS independence, saves, progression');
