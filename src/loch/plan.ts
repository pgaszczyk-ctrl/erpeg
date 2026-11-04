// Układ lochu (content/lochy.ts): siatka kratek, węzły połączone korytarzami (drzewo rozpinające + kilka
// pętli), w węzłach komnaty albo skrzyżowania, wejście w losowym węźle, skarb w najdalszym. Wszystko z ziarna –
// ten sam loch dla każdego i po każdym wejściu. Bez Phasera i DOM-u (scripts/test-lochy.mjs liczy to w Node).
import { rng } from '../rng';
import { LOCH, LOCHY, type RodzajLochu } from '../content/lochy';

export interface Komnata {
  x0: number; y0: number; x1: number; y1: number;
  cx: number; cy: number;
  /** 0 = przy wejściu … 1 = najdalej. */
  glebokosc: number;
  wejscie: boolean;
  skarb: boolean;
  /** Prawdziwa komnata (nie samo skrzyżowanie korytarzy). */
  duza: boolean;
}

export interface PlanLochu {
  rodzaj: RodzajLochu;
  seed: number;
  tutorial?: boolean;
  /** Kratki: szerokość, wysokość i bok w px mapy. */
  w: number;
  h: number;
  T: number;
  /** 1 = podłoga, 0 = skała. */
  siatka: Uint8Array;
  komnaty: Komnata[];
  /** Schody w górę (kratka środka) i miejsce, gdzie staje bohater po zejściu. */
  schody: { x: number; y: number };
  start: { x: number; y: number };
  /** Skrzynia (kratka). */
  skrzynia: { x: number; y: number };
  /** Ściany jako prostokąty kratek [x0, y0, x1, y1) – kolizje i wzrok. */
  sciany: [number, number, number, number][];
  /** Pochodnie na licu ściany (kratka ściany, nad którą jest podłoga od południa). */
  pochodnie: { x: number; y: number }[];
  /** Ozdoby na podłodze (kratki). */
  ozdoby: { x: number; y: number; co: 'kosci' | 'czaszka' | 'trumna' | 'beczka' | 'skrzynka' | 'pajeczyna' | 'kaluza'; r: number }[];
}

export function hashLochu(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function planLochu(rodzaj: RodzajLochu, seed: number, tutorial = false): PlanLochu {
  const r = rng(seed);
  const O = LOCHY[rodzaj];
  const L = LOCH;
  const losuj = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const cols = tutorial ? 2 : losuj(O.wezly[0][0], O.wezly[1][0]);
  const rows = tutorial ? 2 : losuj(O.wezly[0][1], O.wezly[1][1]);
  const S = L.odstep, kMax = L.komnata[1];
  const M = L.sciana + 2;
  const w = M * 2 + (cols - 1) * S + kMax + 2;
  const h = M * 2 + (rows - 1) * S + kMax + 2;
  const g = new Uint8Array(w * h);
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : g[y * w + x]);
  const kop = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = Math.max(1, y0); y < Math.min(h - 1, y1); y++) for (let x = Math.max(1, x0); x < Math.min(w - 1, x1); x++) g[y * w + x] = 1;
  };

  // Węzły: środki z małym przesunięciem.
  const n = cols * rows;
  const wx: number[] = [], wy: number[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    wx.push(M + Math.floor(kMax / 2) + 1 + i * S + losuj(-2, 2));
    wy.push(M + Math.floor(kMax / 2) + 1 + j * S + losuj(-2, 2));
  }
  const sasiedzi = (k: number) => {
    const i = k % cols, j = Math.floor(k / cols), out: number[] = [];
    if (i > 0) out.push(k - 1);
    if (i < cols - 1) out.push(k + 1);
    if (j > 0) out.push(k - cols);
    if (j < rows - 1) out.push(k + cols);
    return out;
  };
  // Drzewo rozpinające (losowy DFS) + pętle.
  const krawedzie = new Set<string>();
  const klucz = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`);
  const byl = new Uint8Array(n);
  const stos = [losuj(0, n - 1)];
  byl[stos[0]] = 1;
  while (stos.length) {
    const k = stos[stos.length - 1];
    const wolni = sasiedzi(k).filter((q) => !byl[q]);
    if (!wolni.length) { stos.pop(); continue; }
    const q = wolni[Math.floor(r() * wolni.length)];
    byl[q] = 1;
    krawedzie.add(klucz(k, q));
    stos.push(q);
  }
  for (let k = 0; k < n; k++) for (const q of sasiedzi(k)) if (q > k && !krawedzie.has(klucz(k, q)) && r() < L.petle) krawedzie.add(klucz(k, q));
  const graf: number[][] = Array.from({ length: n }, () => []);
  for (const e of krawedzie) {
    const [a, b] = e.split(',').map(Number);
    graf[a].push(b);
    graf[b].push(a);
  }

  // Wejście: losowy węzeł na brzegu; skarb: najdalszy od niego (w krokach grafu).
  const brzeg = [...Array(n).keys()].filter((k) => k % cols === 0 || k % cols === cols - 1 || k < cols || k >= n - cols);
  const wej = brzeg[Math.floor(r() * brzeg.length)];
  const dist = new Array<number>(n).fill(-1);
  dist[wej] = 0;
  const kol = [wej];
  for (let i = 0; i < kol.length; i++) for (const q of graf[kol[i]]) if (dist[q] < 0) { dist[q] = dist[kol[i]] + 1; kol.push(q); }
  let skarb = wej;
  for (let k = 0; k < n; k++) if (dist[k] > dist[skarb] || (dist[k] === dist[skarb] && r() < 0.5 && k !== wej)) skarb = k;
  const maxD = Math.max(1, dist[skarb]);

  // Komnaty i skrzyżowania.
  const komnaty: Komnata[] = [];
  const pol = Math.floor(L.korytarz / 2);
  for (let k = 0; k < n; k++) {
    const duza = tutorial || k === wej || k === skarb || r() < L.szansaKomnaty;
    let bw: number, bh: number;
    if (k === skarb) bw = bh = kMax;
    else if (k === wej) bw = bh = L.komnata[0] + 1;
    else if (duza) { bw = losuj(L.komnata[0], kMax); bh = losuj(L.komnata[0], kMax); }
    else bw = bh = L.korytarz;
    const x0 = wx[k] - Math.floor(bw / 2), y0 = wy[k] - Math.floor(bh / 2);
    kop(x0, y0, x0 + bw, y0 + bh);
    komnaty.push({ x0, y0, x1: x0 + bw, y1: y0 + bh, cx: wx[k], cy: wy[k], glebokosc: dist[k] / maxD, wejscie: k === wej, skarb: k === skarb, duza });
  }
  // Korytarze (w kształcie L).
  for (const e of krawedzie) {
    const [a, b] = e.split(',').map(Number);
    const najpierwPoziomo = r() < 0.5;
    const ax = wx[a], ay = wy[a], bx = wx[b], by = wy[b];
    const poziom = (y: number, xa: number, xb: number) => kop(Math.min(xa, xb) - pol, y - pol, Math.max(xa, xb) + pol + 1, y + pol + 1);
    const pion = (x: number, ya: number, yb: number) => kop(x - pol, Math.min(ya, yb) - pol, x + pol + 1, Math.max(ya, yb) + pol + 1);
    if (najpierwPoziomo) { poziom(ay, ax, bx); pion(bx, ay, by); }
    else { pion(ax, ay, by); poziom(by, ax, bx); }
  }

  // Schody w górę: środek komnaty wejściowej, przy jej północnej ścianie; bohater staje 2 kratki niżej.
  const kw = komnaty[wej];
  const schody = { x: kw.cx, y: kw.y0 + 1 };
  const start = { x: kw.cx, y: Math.min(kw.y1 - 1, schody.y + 3) };
  const ks = komnaty[skarb];
  const skrzynia = { x: ks.cx, y: ks.y0 + 1 };

  // Ściany: skała w promieniu L.sciana od podłogi (dalej nikt nie zajrzy).
  const sciana = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (at(x, y)) continue;
    let blisko = false;
    for (let dy = -L.sciana; dy <= L.sciana && !blisko; dy++) for (let dx = -L.sciana; dx <= L.sciana; dx++) if (at(x + dx, y + dy)) { blisko = true; break; }
    if (blisko) sciana[y * w + x] = 1;
  }
  // Prostokąty: odcinki w wierszach, sklejane z identycznymi z wiersza wyżej.
  const sciany: [number, number, number, number][] = [];
  let otwarte = new Map<string, [number, number, number, number]>();
  for (let y = 0; y <= h; y++) {
    const teraz = new Map<string, [number, number, number, number]>();
    if (y < h) {
      for (let x = 0; x < w; ) {
        if (!sciana[y * w + x]) { x++; continue; }
        let e = x;
        while (e < w && sciana[y * w + e]) e++;
        const key = `${x},${e}`;
        const stary = otwarte.get(key);
        if (stary) { stary[3] = y + 1; teraz.set(key, stary); otwarte.delete(key); }
        else teraz.set(key, [x, y, e, y + 1]);
        x = e;
      }
    }
    for (const p of otwarte.values()) sciany.push(p);
    otwarte = teraz;
  }

  // Pochodnie na północnych ścianach komnat (lico widać od dołu), co L.pochodniaCo kratek.
  const pochodnie: { x: number; y: number }[] = [];
  for (const k of komnaty) {
    if (!k.duza) continue;
    const y = k.y0 - 1;
    for (let x = k.x0 + 1 + (k.cx % 2); x < k.x1 - 1; x += L.pochodniaCo) {
      if (!at(x, y) && at(x, y + 1) && !(k.wejscie && Math.abs(x - schody.x) < 2) && !(k.skarb && Math.abs(x - skrzynia.x) < 2)) pochodnie.push({ x, y });
    }
  }

  // Ozdoby: kości, czaszki, trumny (krypta) albo beczki i skrzynki (podziemia), pajęczyny w rogach, kałuże.
  const ozdoby: PlanLochu['ozdoby'] = [];
  const wolne = (x: number, y: number) => at(x, y) && !(Math.abs(x - schody.x) <= 1 && Math.abs(y - schody.y) <= 3) && !(Math.abs(x - skrzynia.x) <= 1 && Math.abs(y - skrzynia.y) <= 1) && !ozdoby.some((o) => Math.abs(o.x - x) < 2 && Math.abs(o.y - y) < 2);
  for (const k of komnaty) {
    if (!k.duza) continue;
    for (const [x, y] of [[k.x0, k.y0], [k.x1 - 1, k.y0]]) if (r() < 0.6) ozdoby.push({ x, y, co: 'pajeczyna', r: r() });
    const ile = losuj(1, 3);
    for (let i = 0; i < ile; i++) {
      const x = losuj(k.x0, k.x1 - 1), y = losuj(k.y0 + 1, k.y1 - 1);
      if (!wolne(x, y)) continue;
      const co = rodzaj === 'krypta'
        ? (['kosci', 'czaszka', 'trumna', 'kaluza'] as const)[Math.floor(r() * 4)]
        : (['beczka', 'skrzynka', 'kosci', 'kaluza'] as const)[Math.floor(r() * 4)];
      ozdoby.push({ x, y, co, r: r() });
    }
  }

  return { rodzaj, seed, tutorial, w, h, T: L.kratka, siatka: g, komnaty, schody, start, skrzynia, sciany, pochodnie, ozdoby };
}

/** Kratka podłogi? (poza planem: skała) */
export function podloga(p: PlanLochu, x: number, y: number) {
  return x >= 0 && y >= 0 && x < p.w && y < p.h && p.siatka[y * p.w + x] === 1;
}
