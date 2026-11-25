// Jaskinie i kopalnie (content/kopalnie.ts, src/loch/plan.ts): każda wielkość spójna (z wejścia dojdziesz do skrzyni,
// zejścia i każdej żyły rudy), żyły stoją przy licu ściany, płótno mieści się w granicach, liczba poziomów jak trzeba.
// Uruchom: node scripts/tests/kopalnie-plan.mjs
import { planLochu, podloga, poziomyLochu } from '../../src/loch/plan';
import { SKALE, MAKS_WEZLOW, regionZloz, KOPALNIE_STALE, type SkalaLochu } from '../../src/content/kopalnie';
import { czytajIdLochu, idLochu, idPoziomu } from '../../src/loch/mapa';

let zle = 0;
const blad = (...a: unknown[]) => { console.log(...a); zle++; };
const t0 = performance.now();
const sur = [['ruda_zelaza', 5], ['miedz', 2], ['wegiel', 2]] as [import('../../src/content/kopalnie').Surowiec, number][];
for (const rodzaj of ['jaskinia', 'kopalnia'] as const) for (const skala of Object.keys(SKALE) as SkalaLochu[]) {
  const pola: number[] = [], zylyN: number[] = [], poz = new Map<number, number>();
  let maxPx = 0, maxMs = 0;
  for (let seed = 1; seed <= (skala === 'duzy' ? 25 : 60); seed++) {
    const lv = poziomyLochu(rodzaj, seed * 7919, skala);
    poz.set(lv.normalne, (poz.get(lv.normalne) ?? 0) + 1);
    const [a, b] = SKALE[skala].poziomy;
    if (lv.normalne < a || lv.normalne > b || lv.ukryty) blad('liczba poziomów', rodzaj, skala, lv);
    for (let poziom = 1; poziom <= lv.normalne; poziom++) {
      const t = performance.now();
      const p = planLochu(rodzaj, seed * 7919, false, { poziom, ...lv }, { skala, surowce: sur, wRegionie: skala === 'duzy' });
      maxMs = Math.max(maxMs, performance.now() - t);
      maxPx = Math.max(maxPx, p.w * p.T * 2, p.h * p.T * 2);
      const byl = new Uint8Array(p.w * p.h);
      if (!podloga(p, p.start.x, p.start.y)) { blad('start w skale', rodzaj, skala, seed); continue; }
      const kol = [p.start.y * p.w + p.start.x];
      byl[kol[0]] = 1;
      for (let i = 0; i < kol.length; i++) {
        const k = kol[i], x = k % p.w, y = (k - x) / p.w;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (podloga(p, nx, ny) && !byl[ny * p.w + nx]) { byl[ny * p.w + nx] = 1; kol.push(ny * p.w + nx); }
        }
      }
      const pod = p.siatka.reduce((s, v) => s + v, 0);
      if (kol.length !== pod) blad('niespójny', rodzaj, skala, seed, poziom, kol.length, pod);
      if (p.maSkrzynie !== (poziom === lv.normalne)) blad('skrzynia na złym poziomie', rodzaj, skala, seed, poziom);
      if (p.maSkrzynie && !byl[p.skrzynia.y * p.w + p.skrzynia.x]) blad('skrzynia nieosiągalna', rodzaj, skala, seed);
      if (!p.maSkrzynie && (!p.zejscie || !byl[p.zejscie.y * p.w + p.zejscie.x])) blad('brak zejścia', rodzaj, skala, seed, poziom);
      for (const z of p.zyly) {
        if (!byl[z.y * p.w + z.x] || podloga(p, z.x, z.y - 1)) blad('żyła źle', rodzaj, skala, seed, z);
      }
      if (!p.zyly.length) blad('bez żył', rodzaj, skala, seed, poziom);
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (podloga(p, x, y) && (x < 2 || y < 2 || x >= p.w - 2 || y >= p.h - 2)) blad('podłoga przy brzegu', rodzaj, skala, seed);
      pola.push(pod);
      zylyN.push(p.zyly.length);
      const q = planLochu(rodzaj, seed * 7919, false, { poziom, ...lv }, { skala, surowce: sur, wRegionie: skala === 'duzy' });
      if (q.siatka.join() !== p.siatka.join() || JSON.stringify(q.zyly) !== JSON.stringify(p.zyly)) blad('niedeterministyczny', rodzaj, skala, seed);
    }
  }
  const sr = (a: number[]) => Math.round(a.reduce((s, v) => s + v, 0) / a.length);
  console.log(`${rodzaj}/${skala}: podłogi śr. ${sr(pola)} kratek, żył śr. ${sr(zylyN)}, płótno ≤ ${maxPx} px, plan ≤ ${maxMs.toFixed(0)} ms, poziomy ${[...poz.entries()].sort().map(([k, v]) => `${k}:${v}`).join(' ')}`);
  if (maxPx > 2600) blad('za duże płótno', rodzaj, skala, maxPx);
}
// Id mapy niesie wielkość i poziom.
const id = idLochu({ rodzaj: 'kopalnia', seed: 512017, lat: 51.3822, lon: 23.0025, skala: 'wielki' });
const l = czytajIdLochu(idPoziomu(id, 3));
if (!l || l.skala !== 'wielki' || l.poziom !== 3 || l.rodzaj !== 'kopalnia') blad('id', id, l);
if (czytajIdLochu('loch:krypta:5:51.2:22.5')?.skala !== 'zwykly') blad('id starego lochu');
// Bogdanka w regionie węglowym; Stary Gaj (Lublin) poza regionami.
if (regionZloz(51.3822, 23.0025)?.nazwa !== 'Lubelskie Zagłębie Węglowe') blad('Bogdanka poza regionem');
if (regionZloz(51.2058, 22.489)) blad('Stary Gaj w regionie');
if (new Set(KOPALNIE_STALE.map((k) => k.seed)).size !== KOPALNIE_STALE.length) blad('powtórzone ziarna stałych kopalń');
void MAKS_WEZLOW;
console.log(`czas ${(performance.now() - t0).toFixed(0)} ms, błędów: ${zle}`);
process.exit(zle ? 1 : 0);
