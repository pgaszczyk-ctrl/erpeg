// Czy każdy przedmiot ma swoje miniatury (właściciel, 25.11.2026)?
//  1) opis „na postaci” (src/content/naPostaci.ts) – dla rzeczy, które widać na ludziku (broń, druga ręka, zbroja, hełm, buty),
//  2) pikselową miniaturkę na ziemię (public/items/ziemia/<id>.png, scripts/miniatury-ziemia.py) – dla każdego przedmiotu z obrazkiem,
//  3) obrazek od grafika (plecak/sklep) – inaczej nie ma z czego liczyć miniatury.
// Uruchom: node --experimental-strip-types scripts/sprawdz-miniatury.mjs   (kod wyjścia 1 = są braki)
import fs from 'node:fs';
import path from 'node:path';
import { NA_POSTACI, MIEJSCA_NA_POSTACI } from '../src/content/naPostaci.ts';

const KORZEN = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const tekst = fs.readFileSync(path.join(KORZEN, 'src/content/przedmioty.ts'), 'utf8');
// Wpisy katalogu: id, miejsce i znaczniki, których nie widać na ludziku (pojazdy).
const wpisy = [...tekst.matchAll(/\{\s*id: '([a-z0-9_]+)'([^\n]*)/g)].map(([, id, reszta]) => ({
  id, miejsce: /miejsce: '([a-z0-9]+)'/.exec(reszta)?.[1], pojazd: /pojazd:/.test(reszta),
}));
const jest = (p) => fs.existsSync(path.join(KORZEN, 'public', p));
const obrazek = (id) => ['items_hd', 'items/duze', 'items', 'proby31', 'sklepy'].some((d) => jest(`${d}/${id}.png`));

const braki = { postac: [], ziemia: [], obrazek: [] };
for (const w of wpisy) {
  if (w.pojazd) continue;
  // the look on the hero needs no picture; the ground miniature is computed from one
  if (MIEJSCA_NA_POSTACI.includes(w.miejsce) && !NA_POSTACI[w.id]) braki.postac.push(w.id);
  if (!obrazek(w.id)) { braki.obrazek.push(w.id); continue; }
  if (!jest(`items/ziemia/${w.id}.png`)) braki.ziemia.push(w.id);
}
// Opisy bez przedmiotu (literówka w id).
const ids = new Set(wpisy.map((w) => w.id));
const sieroty = Object.keys(NA_POSTACI).filter((id) => !ids.has(id));

const linia = (t, l) => console.log(`${l.length ? '✗' : '✓'} ${t}: ${l.length ? l.join(', ') : 'wszystko jest'}`);
linia('opis na postaci (src/content/naPostaci.ts)', braki.postac);
linia('miniatura na ziemi (python3 -I scripts/miniatury-ziemia.py <id>)', braki.ziemia);
linia('obrazek od grafika', braki.obrazek);
if (sieroty.length) console.log(`✗ opisy bez przedmiotu: ${sieroty.join(', ')}`);
process.exit(braki.postac.length + braki.ziemia.length + sieroty.length ? 1 : 0);
