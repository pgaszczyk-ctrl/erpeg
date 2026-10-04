// Test deterministyczności generatora świata (src/gen): to samo wejście → ten sam obraz.
// Uruchom: node scripts/test-gen.mjs  (buduje ten plik rolldownem i uruchamia)
import { nowy, drzewo, GATUNKI, malujPodloze, malujWode, posiejRuno, budynek, hash } from '../src/gen';
import type { Obraz, Rodzaj } from '../src/gen';

const suma = (o: Obraz) => { let h = 2166136261; for (let i = 0; i < o.px.length; i++) h = Math.imul(h ^ o.px[i], 16777619) >>> 0; return h; };
const bledy: string[] = [];
const sprawdz = (nazwa: string, f: () => number) => {
  const a = f(), b = f();
  if (a !== b) bledy.push(nazwa); else console.log('ok', nazwa, a.toString(16));
};

for (const g of Object.keys(GATUNKI)) sprawdz('drzewo ' + g, () => suma(drzewo(g, 3).korona));
sprawdz('hash', () => hash(10, 20, 3));
const rodzaje: Rodzaj[] = ['trawa', 'bruk', 'woda', 'chodnik', 'las_lisciasty'];
const rodzaj = (x: number, y: number): Rodzaj => rodzaje[(Math.floor(x / 40) + Math.floor(y / 40)) % rodzaje.length];
sprawdz('podloze+woda', () => { const o = nowy(256, 256); malujPodloze(o, 100, 200, rodzaj); malujWode(o, 100, 200, rodzaj); return suma(o); });
sprawdz('runo', () => { const k = posiejRuno(0, 0, 200, 200, () => 'trawa'); return k.length * 31 + (k[0] ? (k[0] as any).x : 0); });
sprawdz('budynek', () => suma(budynek([0, 0, 60, 0, 60, 40, 0, 40], { wysokosc: 12, seed: 5, dach: 'dachowka_czerwona', sciana: 'lupek' }).obraz));
// przesunięcie o całkowitą liczbę kawałków nie psuje szwów: ten sam piksel świata ma ten sam kolor
sprawdz('szwy', () => { const a = nowy(128, 128), b = nowy(64, 64); malujPodloze(a, 0, 0, rodzaj); malujPodloze(b, 64, 64, rodzaj); let r = 0; for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (a.px[(y + 64) * 128 + x + 64] !== b.px[y * 64 + x]) r++; return r; });
if (bledy.length) { console.error('PROBLEMY:', bledy.join(', ')); process.exit(1); }
console.log('Generator deterministyczny.');
