// Puzzle of the day in the „Kurier Parowy” (owner, 12 Oct 2026; from the puzzle book photos): every day one
// kind (the same for everyone) – a 6×6 sudoku with 3×2 boxes, kakuro, a number crossword, the shortest
// route or queens (from 15 Oct 2026) – and one puzzle per difficulty level (TRUDNOSCI index 0–4: the same puzzle for everyone on that
// level). Hard puzzles only from Wysoki (3), very hard on Hardkor (4). Everything here is deterministic from
// the day and the level (no Math.random), pure and DOM-free, so the game and the admin panel build the very
// same puzzles and scripts/test-lamiglowki.mjs can check them in Node.

export type RodzajLamiglowki = 'sudoku' | 'kakuro' | 'krzyzowka' | 'trasa' | 'krolowe';
export const RODZAJE: RodzajLamiglowki[] = ['sudoku', 'kakuro', 'krzyzowka', 'trasa', 'krolowe'];

/** Sudoku 6×6: `dane[r][c]` 0 = empty. */
export interface Sudoku { rodzaj: 'sudoku'; dane: number[][]; rozw: number[][] }

/** Kakuro: cells are null (black, no sums), {d, p} (black with a down/right sum, 0 = none) or 'b' (white).
 *  `dane` = digits printed in as hints (0 = to fill): random fills often allow swaps (2×2 white blocks), so
 *  hints are added until the solution is unique. */
export type KomorkaKakuro = null | { d: number; p: number } | 'b';
export interface Kakuro { rodzaj: 'kakuro'; siatka: KomorkaKakuro[][]; dane: number[][]; rozw: number[][] }

/** Number crossword: an n×n square of numbers with operators between them, read left to right / top to bottom
 *  (no operator precedence, like the book), row results on the right, column results at the bottom.
 *  Hidden numbers are null in `liczby`, hidden operators null in `wiersze`/`kolumny`. */
export type Op = '+' | '-' | '×' | '÷';
export interface Krzyzowka {
  rodzaj: 'krzyzowka';
  n: number;
  liczby: (number | null)[][];
  /** wiersze[r][c] = the operator between liczby[r][c] and liczby[r][c+1]. */
  wiersze: (Op | null)[][];
  /** kolumny[r][c] = the operator between liczby[r][c] and liczby[r+1][c]. */
  kolumny: (Op | null)[][];
  wynikiW: number[];
  wynikiK: number[];
  rozw: { liczby: number[][]; wiersze: Op[][]; kolumny: Op[][] };
}

/** Shortest route: from the bottom-left cell to the top-right one, a step to a side neighbour at a time;
 *  each number is the metres of that stretch; the total counts every cell on the way. */
export interface Trasa { rodzaj: 'trasa'; pola: number[][]; najkrotsza: number; przyklad: [number, number][] }

/** Queens (owner, 13 Oct 2026): an n×n board cut into n coloured regions (`obszary[r][c]` = region 0…n−1);
 *  one queen in every row, every column and every region, and no two queens touching, not even at a corner.
 *  `rozw[r]` = the queen's column in row r (the only solution). */
export interface Krolowe { rodzaj: 'krolowe'; obszary: number[][]; rozw: number[] }

export type Lamiglowka = Sudoku | Kakuro | Krzyzowka | Trasa | Krolowe;

// ------------------------------------------------------------------ randomness

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** mulberry32: small and identical on every device. */
function los(seed: number) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    r,
    int: (a0: number, b0: number) => a0 + Math.floor(r() * (b0 - a0 + 1)),
    mieszaj<T>(a0: T[]) {
      for (let i = a0.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [a0[i], a0[j]] = [a0[j], a0[i]];
      }
      return a0;
    },
  };
}
type Los = ReturnType<typeof los>;

/** The puzzle's day: Warsaw date, so everyone gets the same one at the same time. */
export function dzienLamiglowki(d = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/** The first day with queens in the rotation (before it the four older kinds kept their order). */
const KROLOWE_OD = Math.floor(Date.parse('2026-10-15T12:00:00Z') / 864e5);
const STARE = RODZAJE.filter((k) => k !== 'krolowe');

/** The day's kind: no kind twice in a row. */
export function rodzajDnia(dzien: string): RodzajLamiglowki {
  const nr = Math.floor(Date.parse(`${dzien}T12:00:00Z`) / 864e5);
  // Each block of days is a shuffled order of all the kinds, its first never equal to the previous block's last
  // (swapping the first two never moves the last one, so the previous block's raw order is enough).
  const stary = (n: number) => {
    const blok = Math.floor(n / 4);
    const kolejnosc = (b: number) => los(hash(`lamiglowki-blok:${b}`)).mieszaj([...STARE]);
    let k = kolejnosc(blok);
    const prev = kolejnosc(blok - 1);
    if (k[0] === prev[3]) k = [k[1], k[0], k[2], k[3]];
    return k[((n % 4) + 4) % 4];
  };
  if (nr < KROLOWE_OD) return stary(nr);
  const N = RODZAJE.length, d = nr - KROLOWE_OD, blok = Math.floor(d / N);
  const kolejnosc = (b: number) => los(hash(`lamiglowki-blok5:${b}`)).mieszaj([...RODZAJE]);
  let k = kolejnosc(blok);
  const przed = blok === 0 ? stary(KROLOWE_OD - 1) : kolejnosc(blok - 1)[N - 1];
  if (k[0] === przed) k = [k[1], k[0], ...k.slice(2)];
  return k[d % N];
}

export const POZIOMY_LAMIGLOWEK = [
  { pl: 'bardzo łatwa', en: 'very easy' },
  { pl: 'łatwa', en: 'easy' },
  { pl: 'średnia', en: 'medium' },
  { pl: 'trudna', en: 'hard' },
  { pl: 'bardzo trudna', en: 'very hard' },
];

/** The puzzle of the day for a difficulty level (0 Dziecięcy … 4 Hardkor). */
export function lamiglowkaDnia(dzien: string, poziom: number, rodzaj = rodzajDnia(dzien)): Lamiglowka {
  const p = Math.max(0, Math.min(4, Math.round(poziom)));
  const R = los(hash(`lamiglowka:${dzien}:${rodzaj}:${p}`));
  return rodzaj === 'sudoku' ? sudoku(R, p) : rodzaj === 'kakuro' ? kakuro(R, p) : rodzaj === 'krzyzowka' ? krzyzowka(R, p) : rodzaj === 'krolowe' ? krolowe(R, p) : trasa(R, p);
}

// ------------------------------------------------------------------ sudoku 6×6 (boxes 3 wide × 2 tall)

const S = 6;
const boxOf = (r: number, c: number) => Math.floor(r / 2) * 2 + Math.floor(c / 3);

function sudokuLiczRozw(g: number[][], limit: number): number {
  let best = -1, bestOpts: number[] = [];
  for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) {
    if (g[r][c]) continue;
    const opts: number[] = [];
    for (let v = 1; v <= S; v++) if (sudokuMozna(g, r, c, v)) opts.push(v);
    if (best < 0 || opts.length < bestOpts.length) { best = r * S + c; bestOpts = opts; }
    if (!opts.length) return 0;
  }
  if (best < 0) return 1;
  const r = Math.floor(best / S), c = best % S;
  let n = 0;
  for (const v of bestOpts) {
    g[r][c] = v;
    n += sudokuLiczRozw(g, limit - n);
    g[r][c] = 0;
    if (n >= limit) break;
  }
  return n;
}

function sudokuMozna(g: number[][], r: number, c: number, v: number) {
  for (let i = 0; i < S; i++) if (g[r][i] === v || g[i][c] === v) return false;
  const b = boxOf(r, c);
  for (let rr = 0; rr < S; rr++) for (let cc = 0; cc < S; cc++) if (boxOf(rr, cc) === b && g[rr][cc] === v) return false;
  return true;
}

function sudoku(R: Los, p: number): Sudoku {
  // A full grid: a base pattern shuffled by digits, rows within bands, bands, columns within stacks, stacks.
  const base = (r: number, c: number) => ((Math.floor(r / 2) + (r % 2) * 3 + c) % S) + 1;
  const cyfry = R.mieszaj([1, 2, 3, 4, 5, 6]);
  const pasy = R.mieszaj([0, 1, 2]).flatMap((b) => R.mieszaj([0, 1]).map((i) => b * 2 + i));
  const kolumny = R.mieszaj([0, 1]).flatMap((s) => R.mieszaj([0, 1, 2]).map((i) => s * 3 + i));
  const rozw = pasy.map((r) => kolumny.map((c) => cyfry[base(r, c) - 1]));
  // Remove numbers while the solution stays unique, down to the level's target of givens.
  const cel = [22, 18, 14, 12, 10][p];
  const g = rozw.map((w) => [...w]);
  let zostalo = S * S;
  for (const i of R.mieszaj([...Array(S * S).keys()])) {
    if (zostalo <= cel) break;
    const r = Math.floor(i / S), c = i % S;
    const v = g[r][c];
    g[r][c] = 0;
    if (sudokuLiczRozw(g.map((w) => [...w]), 2) !== 1) g[r][c] = v;
    else zostalo--;
  }
  return { rodzaj: 'sudoku', dane: g, rozw };
}

export function sprawdzSudoku(s: Sudoku, wpis: number[][]) {
  for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) {
    const v = wpis[r]?.[c] || 0;
    if (v < 1 || v > S) return false;
  }
  // Any valid full grid that keeps the givens is right (the solution is unique anyway).
  for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) {
    if (s.dane[r][c] && wpis[r][c] !== s.dane[r][c]) return false;
    const v = wpis[r][c];
    wpis[r][c] = 0;
    const ok = sudokuMozna(wpis, r, c, v);
    wpis[r][c] = v;
    if (!ok) return false;
  }
  return true;
}

// ------------------------------------------------------------------ kakuro

/** Runs of white cells: across and down, each a list of [r, c]. */
function biegi(bialy: boolean[][]) {
  const H = bialy.length, W = bialy[0].length;
  const out: { cells: [number, number][]; poz: boolean; r: number; c: number }[] = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (bialy[r][c]) continue;
    const across: [number, number][] = [];
    for (let k = c + 1; k < W && bialy[r][k]; k++) across.push([r, k]);
    if (across.length) out.push({ cells: across, poz: true, r, c });
    const down: [number, number][] = [];
    for (let k = r + 1; k < H && bialy[k][c]; k++) down.push([k, c]);
    if (down.length) out.push({ cells: down, poz: false, r, c });
  }
  return out;
}

function kakuroLiczRozw(siatka: KomorkaKakuro[][], dane: number[][], limit: number) {
  const H = siatka.length, W = siatka[0].length;
  const bialy = siatka.map((w) => w.map((k) => k === 'b'));
  const runs = biegi(bialy).map((b) => {
    const k = siatka[b.r][b.c] as { d: number; p: number };
    return { cells: b.cells, suma: b.poz ? k.p : k.d };
  });
  const runsOf: number[][][] = Array.from({ length: H }, () => Array.from({ length: W }, () => [] as number[]));
  runs.forEach((b, i) => b.cells.forEach(([r, c]) => runsOf[r][c].push(i)));
  const cells: [number, number][] = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (bialy[r][c]) cells.push([r, c]);
  const sum = runs.map(() => 0), cnt = runs.map(() => 0), used = runs.map(() => 0);
  const zajete = cells.map(() => false);
  // Smallest / largest total of k different digits not yet used in the run (and not v).
  const kraniec = (mask: number, k: number, odDolu: boolean) => {
    let s = 0;
    for (let i = 0, d = odDolu ? 1 : 9; i < k && d >= 1 && d <= 9; d += odDolu ? 1 : -1) if (!(mask & (1 << d))) { s += d; i++; }
    return s;
  };
  const opcje = (r: number, c: number) => {
    const out: number[] = [];
    for (let v = 1; v <= 9; v++) {
      if (dane[r][c] && dane[r][c] !== v) continue;
      let ok = true;
      for (const b of runsOf[r][c]) {
        const run = runs[b];
        if (used[b] & (1 << v)) { ok = false; break; }
        const s = sum[b] + v, left = run.cells.length - cnt[b] - 1, m = used[b] | (1 << v);
        if (s + kraniec(m, left, true) > run.suma || s + kraniec(m, left, false) < run.suma) { ok = false; break; }
      }
      if (ok) out.push(v);
    }
    return out;
  };
  let n = 0;
  const go = (zostalo: number) => {
    if (n >= limit) return;
    if (!zostalo) { n++; return; }
    // The cell with the fewest possible digits first.
    let bi = -1, bo: number[] = [];
    for (let i = 0; i < cells.length; i++) {
      if (zajete[i]) continue;
      const o = opcje(cells[i][0], cells[i][1]);
      if (!o.length) return;
      if (bi < 0 || o.length < bo.length) { bi = i; bo = o; if (o.length === 1) break; }
    }
    const [r, c] = cells[bi];
    zajete[bi] = true;
    for (const v of bo) {
      for (const b of runsOf[r][c]) { sum[b] += v; cnt[b]++; used[b] |= 1 << v; }
      go(zostalo - 1);
      for (const b of runsOf[r][c]) { sum[b] -= v; cnt[b]--; used[b] &= ~(1 << v); }
      if (n >= limit) break;
    }
    zajete[bi] = false;
  };
  go(cells.length);
  return n;
}

/** Shapes per level: the white cells of the grid (row 0 and column 0 are always black for the sums). */
const KAKURO_KSZTALTY: string[][] = [
  // 0, 1: 3×3 (the book's diagram A is like these)
  ['....', '.##.', '.###', '..##'],
  ['....', '.###', '.###', '.##.'],
  // 2: 4×4
  ['.....', '.##..', '.####', '.####', '..##.'],
  // 3: 5×5
  ['......', '.##.##', '.#####', '..###.', '.#####', '.##.##'],
  // 4: 6×6
  ['.......', '.###.##', '.######', '.##.###', '.###.##', '.######', '.##.###'],
];

function kakuro(R: Los, p: number): Kakuro {
  const wzory = p <= 1 ? [KAKURO_KSZTALTY[0], KAKURO_KSZTALTY[1]] : [KAKURO_KSZTALTY[p]];
  for (let proba = 0; proba < 400; proba++) {
    let wzor = wzory[R.int(0, wzory.length - 1)];
    // Mirror the shape across the diagonal now and then (still black row/column 0).
    if (R.r() < 0.5) wzor = wzor.map((_, r) => wzor.map((w) => w[r]).join(''));
    const bialy = wzor.map((w) => [...w].map((ch) => ch === '#'));
    const H = bialy.length, W = bialy[0].length;
    // Fill the white cells with digits, different within each run (small digits on the easy levels).
    const maks = p === 0 ? 6 : p === 1 ? 8 : 9;
    const val = bialy.map((w) => w.map(() => 0));
    const runs = biegi(bialy);
    const runsOf: number[][][] = Array.from({ length: H }, () => Array.from({ length: W }, () => [] as number[]));
    runs.forEach((b, i) => b.cells.forEach(([r, c]) => runsOf[r][c].push(i)));
    const cells: [number, number][] = [];
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (bialy[r][c]) cells.push([r, c]);
    const fill = (i: number): boolean => {
      if (i === cells.length) return true;
      const [r, c] = cells[i];
      for (const v of R.mieszaj([...Array(maks).keys()].map((x) => x + 1))) {
        if (runsOf[r][c].some((b) => runs[b].cells.some(([rr, cc]) => val[rr][cc] === v))) continue;
        val[r][c] = v;
        if (fill(i + 1)) return true;
        val[r][c] = 0;
      }
      return false;
    };
    if (!fill(0)) continue;
    const siatka: KomorkaKakuro[][] = bialy.map((w) => w.map((b) => (b ? 'b' : null)));
    for (const b of runs) {
      const s = b.cells.reduce((a, [r, c]) => a + val[r][c], 0);
      const k = (siatka[b.r][b.c] ??= { d: 0, p: 0 }) as { d: number; p: number };
      if (b.poz) k.p = s; else k.d = s;
    }
    // Print hint digits in until the solution is unique (fewer on harder levels is natural: bigger grids
    // pin more cells by their sums).
    const dane = val.map((w) => w.map(() => 0));
    const kolej = R.mieszaj([...cells]);
    let podpowiedzi = 0;
    while (kakuroLiczRozw(siatka, dane, 2) !== 1 && podpowiedzi < kolej.length) {
      const [r, c] = kolej[podpowiedzi++];
      dane[r][c] = val[r][c];
    }
    // Too many hints make it dull: try another fill.
    if (podpowiedzi > Math.max(2, cells.length * 0.3)) continue;
    // Drop hints that turned out unneeded.
    for (const [r, c] of kolej.slice(0, podpowiedzi)) {
      dane[r][c] = 0;
      if (kakuroLiczRozw(siatka, dane, 2) !== 1) dane[r][c] = val[r][c];
    }
    return { rodzaj: 'kakuro', siatka, dane, rozw: val };
  }
  // Practically never: fall back to a sudoku-free tiny one by easing the shape.
  return kakuro(los(R.int(1, 1e9)), Math.max(0, p - 1));
}

export function sprawdzKakuro(k: Kakuro, wpis: number[][]) {
  const bialy = k.siatka.map((w) => w.map((x) => x === 'b'));
  for (let r = 0; r < bialy.length; r++) for (let c = 0; c < bialy[0].length; c++) {
    if (bialy[r][c] && !(wpis[r]?.[c] >= 1 && wpis[r][c] <= 9)) return false;
    if (k.dane[r][c] && wpis[r][c] !== k.dane[r][c]) return false;
  }
  for (const b of biegi(bialy)) {
    const cel = k.siatka[b.r][b.c] as { d: number; p: number };
    const v = b.cells.map(([r, c]) => wpis[r][c]);
    if (new Set(v).size !== v.length) return false;
    if (v.reduce((a, x) => a + x, 0) !== (b.poz ? cel.p : cel.d)) return false;
  }
  return true;
}

// ------------------------------------------------------------------ number crossword

export const OPY: Op[] = ['+', '-', '×', '÷'];

/** Left to right; null when a division isn't exact or the result leaves 0…maks. */
function licz(liczby: number[], ops: Op[], maks: number): number | null {
  let a = liczby[0];
  for (let i = 0; i < ops.length; i++) {
    const b = liczby[i + 1];
    if (ops[i] === '+') a += b;
    else if (ops[i] === '-') a -= b;
    else if (ops[i] === '×') a *= b;
    else { if (b === 0 || a % b) return null; a /= b; }
    if (a < 0 || a > maks) return null;
  }
  return a;
}

const KRZ = [
  // n numbers per side, numbers 1…liczbyDo, results ≤ wynikDo, operators allowed, hidden numbers / operators.
  { n: 2, liczbyDo: 9, wynikDo: 20, opy: ['+', '-'] as Op[], ukryteL: 1, ukryteO: 0 },
  { n: 2, liczbyDo: 10, wynikDo: 30, opy: ['+', '-', '×'] as Op[], ukryteL: 2, ukryteO: 0 },
  { n: 3, liczbyDo: 9, wynikDo: 50, opy: ['+', '-', '×'] as Op[], ukryteL: 3, ukryteO: 1 },
  { n: 3, liczbyDo: 12, wynikDo: 99, opy: OPY, ukryteL: 4, ukryteO: 2 },
  { n: 3, liczbyDo: 15, wynikDo: 150, opy: OPY, ukryteL: 5, ukryteO: 3 },
];

function krzyzowka(R: Los, p: number): Krzyzowka {
  const K = KRZ[p];
  const n = K.n;
  for (let proba = 0; proba < 2000; proba++) {
    const L = Array.from({ length: n }, () => Array.from({ length: n }, () => R.int(1, K.liczbyDo)));
    const W = Array.from({ length: n }, () => Array.from({ length: n - 1 }, () => K.opy[R.int(0, K.opy.length - 1)]));
    const Kol = Array.from({ length: n - 1 }, () => Array.from({ length: n }, () => K.opy[R.int(0, K.opy.length - 1)]));
    const wynikiW: number[] = [], wynikiK: number[] = [];
    let ok = true;
    for (let r = 0; r < n && ok; r++) {
      const v = licz(L[r], W[r], K.wynikDo);
      if (v === null) ok = false; else wynikiW.push(v);
    }
    for (let c = 0; c < n && ok; c++) {
      const v = licz(L.map((w) => w[c]), Kol.map((w) => w[c]), K.wynikDo);
      if (v === null) ok = false; else wynikiK.push(v);
    }
    if (!ok) continue;
    // Too dull: every operator the same, or a result equal to its first number many times.
    if (new Set([...W.flat(), ...Kol.flat()]).size < Math.min(2, K.opy.length)) continue;
    const liczby: (number | null)[][] = L.map((w) => [...w]);
    const wiersze: (Op | null)[][] = W.map((w) => [...w]);
    const kolumny: (Op | null)[][] = Kol.map((w) => [...w]);
    const pozL = R.mieszaj([...Array(n * n).keys()]).slice(0, K.ukryteL);
    for (const i of pozL) liczby[Math.floor(i / n)][i % n] = null;
    const opPoz: [boolean, number, number][] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n - 1; c++) opPoz.push([true, r, c]);
    for (let r = 0; r < n - 1; r++) for (let c = 0; c < n; c++) opPoz.push([false, r, c]);
    for (const [w, r, c] of R.mieszaj(opPoz).slice(0, K.ukryteO)) (w ? wiersze : kolumny)[r][c] = null;
    const z: Krzyzowka = { rodzaj: 'krzyzowka', n, liczby, wiersze, kolumny, wynikiW, wynikiK, rozw: { liczby: L, wiersze: W, kolumny: Kol } };
    if (krzyzowkaLiczRozw(z, K.liczbyDo, K.opy, 2) === 1) return z;
  }
  return krzyzowka(los(R.int(1, 1e9)), Math.max(0, p - 1));
}

/** Counts solutions (up to limit): hidden numbers 1…liczbyDo, hidden operators from opy. */
function krzyzowkaLiczRozw(z: Krzyzowka, liczbyDo: number, opy: Op[], limit: number) {
  const { n } = z;
  const L = z.liczby.map((w) => [...w]);
  const W = z.wiersze.map((w) => [...w]);
  const Kol = z.kolumny.map((w) => [...w]);
  type Slot = { typ: 'l'; r: number; c: number } | { typ: 'w' | 'k'; r: number; c: number };
  const slots: Slot[] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (L[r][c] === null) slots.push({ typ: 'l', r, c });
  for (let r = 0; r < n; r++) for (let c = 0; c < n - 1; c++) if (W[r][c] === null) slots.push({ typ: 'w', r, c });
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n; c++) if (Kol[r][c] === null) slots.push({ typ: 'k', r, c });
  const rowOk = (r: number) => {
    if (L[r].some((x) => x === null) || W[r].some((x) => x === null)) return true;
    return licz(L[r] as number[], W[r] as Op[], 1e9) === z.wynikiW[r];
  };
  const colOk = (c: number) => {
    const col = L.map((w) => w[c]), ops = Kol.map((w) => w[c]);
    if (col.some((x) => x === null) || ops.some((x) => x === null)) return true;
    return licz(col as number[], ops as Op[], 1e9) === z.wynikiK[c];
  };
  let cnt = 0;
  const go = (i: number) => {
    if (cnt >= limit) return;
    if (i === slots.length) { cnt++; return; }
    const s = slots[i];
    if (s.typ === 'l') {
      for (let v = 1; v <= liczbyDo && cnt < limit; v++) {
        L[s.r][s.c] = v;
        if (rowOk(s.r) && colOk(s.c)) go(i + 1);
      }
      L[s.r][s.c] = null;
    } else {
      const T = s.typ === 'w' ? W : Kol;
      for (const o of opy) {
        if (cnt >= limit) break;
        T[s.r][s.c] = o;
        if (s.typ === 'w' ? rowOk(s.r) : colOk(s.c)) go(i + 1);
      }
      T[s.r][s.c] = null;
    }
  };
  go(0);
  return cnt;
}

export function sprawdzKrzyzowke(z: Krzyzowka, liczby: (number | null)[][], wiersze: (Op | null)[][], kolumny: (Op | null)[][]) {
  const { n } = z;
  const L = z.liczby.map((w, r) => w.map((v, c) => v ?? liczby[r]?.[c] ?? null));
  const W = z.wiersze.map((w, r) => w.map((v, c) => v ?? wiersze[r]?.[c] ?? null));
  const K = z.kolumny.map((w, r) => w.map((v, c) => v ?? kolumny[r]?.[c] ?? null));
  if (L.flat().some((x) => x === null || !Number.isInteger(x)) || W.flat().some((x) => !x) || K.flat().some((x) => !x)) return false;
  for (let r = 0; r < n; r++) if (licz(L[r] as number[], W[r] as Op[], 1e9) !== z.wynikiW[r]) return false;
  for (let c = 0; c < n; c++) if (licz(L.map((w) => w[c]) as number[], K.map((w) => w[c]) as Op[], 1e9) !== z.wynikiK[c]) return false;
  return true;
}

// ------------------------------------------------------------------ shortest route

const TRASA = [
  { w: 4, h: 4, do: 5 },
  { w: 5, h: 5, do: 9 },
  { w: 6, h: 6, do: 9 },
  { w: 8, h: 8, do: 9 },
  { w: 10, h: 10, do: 9 },
];

/** Dijkstra over the grid (side steps), counting every cell's number; returns the cost and one best path. */
export function najkrotszaTrasa(pola: number[][]) {
  const H = pola.length, W = pola[0].length;
  const dist = pola.map((w) => w.map(() => Infinity));
  const skad = pola.map((w) => w.map(() => -1));
  const done = pola.map((w) => w.map(() => false));
  const sr = H - 1, sc = 0;
  dist[sr][sc] = pola[sr][sc];
  for (;;) {
    let br = -1, bc = -1, bd = Infinity;
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (!done[r][c] && dist[r][c] < bd) { bd = dist[r][c]; br = r; bc = c; }
    if (br < 0) break;
    done[br][bc] = true;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const r = br + dr, c = bc + dc;
      if (r < 0 || c < 0 || r >= H || c >= W || done[r][c]) continue;
      if (bd + pola[r][c] < dist[r][c]) { dist[r][c] = bd + pola[r][c]; skad[r][c] = br * W + bc; }
    }
  }
  const sciezka: [number, number][] = [];
  for (let r = 0, c = W - 1; ;) {
    sciezka.unshift([r, c]);
    const s = skad[r][c];
    if (s < 0) break;
    r = Math.floor(s / W);
    c = s % W;
  }
  return { koszt: dist[0][W - 1], sciezka };
}

function trasa(R: Los, p: number): Trasa {
  const T = TRASA[p];
  const pola = Array.from({ length: T.h }, () => Array.from({ length: T.w }, () => R.int(1, T.do)));
  const { koszt, sciezka } = najkrotszaTrasa(pola);
  return { rodzaj: 'trasa', pola, najkrotsza: koszt, przyklad: sciezka };
}

/** The player's path: starts bottom-left, ends top-right, side steps only, no cell twice, shortest total. */
export function sprawdzTrase(t: Trasa, sciezka: [number, number][]) {
  const H = t.pola.length, W = t.pola[0].length;
  if (sciezka.length < 2) return false;
  const [r0, c0] = sciezka[0], [r1, c1] = sciezka[sciezka.length - 1];
  if (r0 !== H - 1 || c0 !== 0 || r1 !== 0 || c1 !== W - 1) return false;
  const byl = new Set<number>();
  let suma = 0;
  for (let i = 0; i < sciezka.length; i++) {
    const [r, c] = sciezka[i];
    if (r < 0 || c < 0 || r >= H || c >= W || byl.has(r * W + c)) return false;
    byl.add(r * W + c);
    if (i && Math.abs(r - sciezka[i - 1][0]) + Math.abs(c - sciezka[i - 1][1]) !== 1) return false;
    suma += t.pola[r][c];
  }
  return suma === t.najkrotsza;
}

export const sumaTrasy = (t: Trasa, sciezka: [number, number][]) => sciezka.reduce((a, [r, c]) => a + t.pola[r][c], 0);

// ------------------------------------------------------------------ queens

/** Board size per level. */
const KROLOWE_N = [5, 6, 7, 8, 9];

/** Solutions of a region map (each row's column), at most `ile` of them. */
export function rozwiazaniaKrolowych(obszary: number[][], ile = 2): number[][] {
  const n = obszary.length, out: number[][] = [], kol = new Array<number>(n);
  const zajK = new Array<boolean>(n).fill(false), zajO = new Array<boolean>(n).fill(false);
  const krok = (r: number) => {
    if (out.length >= ile) return;
    if (r === n) { out.push([...kol]); return; }
    for (let c = 0; c < n; c++) {
      const o = obszary[r][c];
      if (zajK[c] || zajO[o] || (r && Math.abs(kol[r - 1] - c) < 2)) continue;
      zajK[c] = zajO[o] = true;
      kol[r] = c;
      krok(r + 1);
      zajK[c] = zajO[o] = false;
    }
  };
  krok(0);
  return out;
}

/** Columns for n queens, one per row and column, rows next to each other at least 2 columns apart. */
function ustawienie(R: Los, n: number): number[] {
  const kol: number[] = [], zaj = new Set<number>();
  const krok = (r: number): boolean => {
    if (r === n) return true;
    for (const c of R.mieszaj([...Array(n).keys()])) {
      if (zaj.has(c) || (r && Math.abs(kol[r - 1] - c) < 2)) continue;
      zaj.add(c);
      kol[r] = c;
      if (krok(r + 1)) return true;
      zaj.delete(c);
    }
    return false;
  };
  krok(0);
  return kol;
}

const SASIEDZI4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Whether region `o` is still in one piece without the cell (r, c). */
function spojnyBez(obszary: number[][], o: number, r: number, c: number) {
  const n = obszary.length, komorki: [number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (obszary[i][j] === o && (i !== r || j !== c)) komorki.push([i, j]);
  if (!komorki.length) return false;
  const byl = new Set([komorki[0][0] * n + komorki[0][1]]), kolejka = [komorki[0]];
  while (kolejka.length) {
    const [i, j] = kolejka.pop()!;
    for (const [di, dj] of SASIEDZI4) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= n || b >= n || (a === r && b === c) || obszary[a][b] !== o || byl.has(a * n + b)) continue;
      byl.add(a * n + b);
      kolejka.push([a, b]);
    }
  }
  return byl.size === komorki.length;
}

function krolowe(R: Los, p: number): Krolowe {
  const n = KROLOWE_N[p];
  for (let proba = 0; ; proba++) {
    const rozw = ustawienie(R, n);
    // Regions grow from the queens' cells, a random border cell at a time.
    const obszary = Array.from({ length: n }, () => new Array<number>(n).fill(-1));
    rozw.forEach((c, r) => (obszary[r][c] = r));
    for (let wolne = n * n - n; wolne > 0; ) {
      const brzeg: [number, number, number][] = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (obszary[r][c] >= 0) continue;
        for (const [dr, dc] of SASIEDZI4) {
          const a = r + dr, b = c + dc;
          if (a >= 0 && b >= 0 && a < n && b < n && obszary[a][b] >= 0) brzeg.push([r, c, obszary[a][b]]);
        }
      }
      const [r, c, o] = brzeg[Math.floor(R.r() * brzeg.length)];
      obszary[r][c] = o;
      wolne--;
    }
    // While another solution exists, hand one of its queens' cells (never ours) to a neighbouring region:
    // that region then holds two of its queens, and ours stays untouched.
    for (let k = 0; k < n * n * 3; k++) {
      const inne = rozwiazaniaKrolowych(obszary).find((s) => s.some((c, r) => c !== rozw[r]));
      if (!inne) return { rodzaj: 'krolowe', obszary, rozw };
      const ruchy: [number, number, number][] = [];
      inne.forEach((c, r) => {
        if (c === rozw[r]) return;
        const o = obszary[r][c];
        if (!spojnyBez(obszary, o, r, c)) return;
        for (const [dr, dc] of SASIEDZI4) {
          const a = r + dr, b = c + dc;
          if (a >= 0 && b >= 0 && a < n && b < n && obszary[a][b] !== o) ruchy.push([r, c, obszary[a][b]]);
        }
      });
      if (!ruchy.length) break;
      const [r, c, o] = ruchy[Math.floor(R.r() * ruchy.length)];
      obszary[r][c] = o;
    }
    if (proba > 50) throw new Error('krolowe: no unique puzzle');
  }
}

/** The player's queens (true = a queen there): one per row, column and region, none touching. */
export function sprawdzKrolowe(z: Krolowe, krolowe: boolean[][]) {
  const n = z.obszary.length, kol: number[] = [];
  for (let r = 0; r < n; r++) {
    const w = krolowe[r] ?? [];
    const cs = [...Array(n).keys()].filter((c) => w[c]);
    if (cs.length !== 1) return false;
    kol.push(cs[0]);
  }
  if (new Set(kol).size !== n || new Set(kol.map((c, r) => z.obszary[r][c])).size !== n) return false;
  return kol.every((c, r) => !r || Math.abs(kol[r - 1] - c) > 1);
}
