// Lochy (src/loch/plan.ts): każdy loch spójny (z wejścia dojdziesz do skrzyni i każdej komnaty), ściany zamykają
// podłogę, ten sam numer = ten sam układ. Uruchom: node scripts/tests/lochy-plan.mjs
import { planLochu, podloga, poziomyLochu } from '../../src/loch/plan';

let zle = 0;
const t0 = performance.now();
for (const rodzaj of ['krypta', 'podziemia', 'jaskinia'] as const) {
  for (let seed = 1; seed <= 300; seed++) {
    const p = planLochu(rodzaj, seed * 7919);
    const q = planLochu(rodzaj, seed * 7919);
    if (p.siatka.join() !== q.siatka.join()) { console.log('niedeterministyczny', rodzaj, seed); zle++; }
    // Spójność: zalewanie od startu.
    const byl = new Uint8Array(p.w * p.h);
    const kol = [p.start.y * p.w + p.start.x];
    if (!podloga(p, p.start.x, p.start.y)) { console.log('start w skale', rodzaj, seed); zle++; continue; }
    byl[kol[0]] = 1;
    for (let i = 0; i < kol.length; i++) {
      const k = kol[i], x = k % p.w, y = (k - x) / p.w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (podloga(p, nx, ny) && !byl[ny * p.w + nx]) { byl[ny * p.w + nx] = 1; kol.push(ny * p.w + nx); }
      }
    }
    const pod = p.siatka.reduce((a, v) => a + v, 0);
    if (kol.length !== pod) { console.log('niespójny', rodzaj, seed, kol.length, pod); zle++; }
    if (!byl[p.skrzynia.y * p.w + p.skrzynia.x]) { console.log('skrzynia nieosiągalna', rodzaj, seed); zle++; }
    // Ściany: każda podłoga ma dookoła skałę-ścianę albo podłogę (żadnej dziury na brzegu planu).
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      if (!podloga(p, x, y)) continue;
      if (x < 2 || y < 2 || x >= p.w - 2 || y >= p.h - 2) { console.log('podłoga przy brzegu', rodzaj, seed); zle++; }
    }
    const wSc = (x: number, y: number) => p.sciany.some(([a, b, c, d]) => x >= a && x < c && y >= b && y < d);
    for (let y = 1; y < p.h - 1; y++) for (let x = 1; x < p.w - 1; x++) {
      if (!podloga(p, x, y)) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!podloga(p, x + dx, y + dy) && !wSc(x + dx, y + dy)) { console.log('brak ściany', rodzaj, seed, x + dx, y + dy); zle++; }
    }
    if (seed === 1) console.log(rodzaj, `${p.w}×${p.h} kratek, komnat ${p.komnaty.filter((k) => k.duza).length}/${p.komnaty.length}, ścian ${p.sciany.length}, pochodni ${p.pochodnie.length}, ozdób ${p.ozdoby.length}`);
  }
}
// Poziomy: ~25 % lochów z ukrytym szóstym, reszta 1–5; każdy poziom spójny, zejście osiągalne, ukryte zejście zawsze znalezione.
const rozklad = new Map<string, number>();
for (const rodzaj of ['krypta', 'podziemia', 'jaskinia'] as const) for (let seed = 1; seed <= 400; seed++) {
  const lv = poziomyLochu(rodzaj, seed * 104729);
  const k = lv.ukryty ? '5+ukryty' : String(lv.normalne);
  rozklad.set(k, (rozklad.get(k) ?? 0) + 1);
  if (seed > 60) continue;
  for (let poziom = 1; poziom <= lv.normalne + (lv.ukryty ? 1 : 0); poziom++) {
    const p = planLochu(rodzaj, seed * 104729, false, { poziom, ...lv });
    const byl = new Uint8Array(p.w * p.h);
    const kol = [p.start.y * p.w + p.start.x];
    byl[kol[0]] = 1;
    for (let i = 0; i < kol.length; i++) {
      const q = kol[i], x = q % p.w, y = (q - x) / p.w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (podloga(p, nx, ny) && !byl[ny * p.w + nx]) { byl[ny * p.w + nx] = 1; kol.push(ny * p.w + nx); }
      }
    }
    const ost = poziom >= lv.normalne;
    if (p.maSkrzynie !== ost) { console.log('skrzynia na złym poziomie', rodzaj, seed, poziom); zle++; }
    if (!ost && (!p.zejscie || !byl[p.zejscie.y * p.w + p.zejscie.x])) { console.log('brak zejścia', rodzaj, seed, poziom); zle++; }
    const maUkryte = lv.ukryty && poziom === lv.normalne;
    if (maUkryte !== !!p.ukryte) { console.log('ukryte zejście', rodzaj, seed, poziom, !!p.ukryte); zle++; }
    if (p.ukryte && (!byl[(p.ukryte.y + 2) * p.w + p.ukryte.x] || podloga(p, p.ukryte.x, p.ukryte.y - 1))) { console.log('ukryte źle postawione', rodzaj, seed); zle++; }
    if (p.ukrytyPoziom !== poziom > lv.normalne) { console.log('ukryty poziom', rodzaj, seed, poziom); zle++; }
  }
}
console.log('poziomy:', [...rozklad.entries()].sort().map(([k, v]) => `${k}: ${v}`).join(', '));
console.log(`czas ${(performance.now() - t0).toFixed(0)} ms, błędów: ${zle}`);
process.exit(zle ? 1 : 0);
