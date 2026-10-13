// Puzzle of the day (src/lamiglowki.ts): every kind and level for many days – unique solutions, the stored
// solution passes the checker, the same day gives the same puzzle, timing. Run: node --experimental-strip-types scripts/test-lamiglowki.mjs
import { lamiglowkaDnia, rodzajDnia, RODZAJE, sprawdzSudoku, sprawdzKakuro, sprawdzKrzyzowke, sprawdzTrase } from '../src/lamiglowki.ts';

const dni = Number(process.argv[2] || 40);
let zle = 0;
const czasy = {};
const start = Date.parse('2026-10-12T12:00:00Z');
let poprzedni = null;
for (let d = 0; d < dni; d++) {
  const dzien = new Date(start + d * 864e5).toISOString().slice(0, 10);
  const r = rodzajDnia(dzien);
  if (r === poprzedni) { console.log('dwa razy z rzędu', dzien, r); zle++; }
  poprzedni = r;
  for (const rodzaj of RODZAJE) for (let p = 0; p < 5; p++) {
    const t0 = performance.now();
    const z = lamiglowkaDnia(dzien, p, rodzaj);
    const ms = performance.now() - t0;
    const k = `${rodzaj}${p}`;
    czasy[k] = Math.max(czasy[k] ?? 0, ms);
    const z2 = lamiglowkaDnia(dzien, p, rodzaj);
    if (JSON.stringify(z) !== JSON.stringify(z2)) { console.log('niedeterministyczne', k, dzien); zle++; }
    let ok;
    if (z.rodzaj === 'sudoku') ok = sprawdzSudoku(z, z.rozw.map((w) => [...w]));
    else if (z.rodzaj === 'kakuro') {
      ok = sprawdzKakuro(z, z.rozw);
      // no one-cell runs
      const H = z.siatka.length, W = z.siatka[0].length, b = (r, c) => r >= 0 && c >= 0 && r < H && c < W && z.siatka[r][c] === 'b';
      for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (b(r, c) && ((!b(r, c - 1) && !b(r, c + 1)) || (!b(r - 1, c) && !b(r + 1, c)))) { ok = false; console.log('pojedyncze pole', k); }
    } else if (z.rodzaj === 'krzyzowka') ok = sprawdzKrzyzowke(z, z.rozw.liczby, z.rozw.wiersze, z.rozw.kolumny);
    else ok = sprawdzTrase(z, z.przyklad);
    if (!ok) { console.log('rozwiązanie nie przechodzi', k, dzien); zle++; }
    if (z.rodzaj === 'krzyzowka' && z.n !== [2, 2, 3, 3, 3][p]) { console.log('krzyżówka zastępcza', k, dzien); }
    if (z.rodzaj === 'kakuro' && z.siatka.length !== [4, 4, 5, 6, 7][p]) { console.log('kakuro zastępcze', k, dzien); }
  }
}
console.log('najdłuższe czasy [ms]:', Object.fromEntries(Object.entries(czasy).map(([k, v]) => [k, Math.round(v)])));
console.log(zle ? `BŁĘDY: ${zle}` : 'OK');
process.exit(zle ? 1 : 0);
