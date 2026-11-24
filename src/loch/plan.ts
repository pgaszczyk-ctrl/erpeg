// Układ lochu (content/lochy.ts): siatka kratek, węzły połączone korytarzami (drzewo rozpinające + kilka
// pętli), w węzłach komnaty albo skrzyżowania, wejście w losowym węźle, skarb w najdalszym. Wszystko z ziarna –
// ten sam loch dla każdego i po każdym wejściu. Bez Phasera i DOM-u (scripts/test-lochy.mjs liczy to w Node).
import { rng } from '../rng';
import { LOCH, LOCHY, POZIOMY_LOCHU, type RodzajLochu } from '../content/lochy';

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
  /** Skrzynia (kratka) – stoi tylko, gdy `maSkrzynie` (ostatni zwykły albo ukryty poziom). */
  skrzynia: { x: number; y: number };
  /** Poziom (1 = tuż pod powierzchnią), ilu zwykłych poziomów ma loch i czy ma ukryty pod ostatnim. */
  poziom: number;
  normalne: number;
  ukryty: boolean;
  /** Ten poziom to ukryty (za luźną ścianą). */
  ukrytyPoziom: boolean;
  maSkrzynie: boolean;
  /** Schody w dół (w najdalszej komnacie) – na poziomach nad ostatnim zwykłym. */
  zejscie: { x: number; y: number } | null;
  /** Ukryte zejście za luźną ścianą (przy północnej ścianie losowej komnaty) – na ostatnim zwykłym poziomie lochu z ukrytym. */
  ukryte: { x: number; y: number } | null;
  /** Ściany jako prostokąty kratek [x0, y0, x1, y1) – kolizje i wzrok. */
  sciany: [number, number, number, number][];
  /** Pochodnie na licu ściany (kratka ściany, nad którą jest podłoga od południa). */
  pochodnie: { x: number; y: number }[];
  /** Ozdoby na podłodze (kratki). */
  ozdoby: { x: number; y: number; co: 'kosci' | 'czaszka' | 'trumna' | 'beczka' | 'skrzynka' | 'pajeczyna' | 'kaluza' | 'stalagmit' | 'krysztal' | 'grzybki'; r: number }[];
}

export function hashLochu(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Ile poziomów ma loch (z jego numeru): 75 % – 1…5 zwykłych, 25 % – 5 zwykłych + ukryty szósty. */
export function poziomyLochu(rodzaj: RodzajLochu, seed: number): { normalne: number; ukryty: boolean } {
  const r = rng(hashLochu(`poziomy:${rodzaj}:${seed}`));
  if (r() < POZIOMY_LOCHU.szansaUkrytego) return { normalne: POZIOMY_LOCHU.maks, ukryty: true };
  return { normalne: 1 + Math.floor(r() * POZIOMY_LOCHU.maks), ukryty: false };
}

export interface PoziomPlanu { poziom: number; normalne: number; ukryty: boolean }

export function planLochu(rodzaj: RodzajLochu, seed: number, tutorial = false, lv: PoziomPlanu = { poziom: 1, normalne: 1, ukryty: false }): PlanLochu {
  // Pierwszy poziom ma dawny układ (to samo ziarno); niższe – własne.
  const r = rng(lv.poziom > 1 ? hashLochu(`${seed}:poziom:${lv.poziom}`) : seed);
  const O = LOCHY[rodzaj];
  const L = LOCH;
  const losuj = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const cols = tutorial ? 2 : losuj(O.wezly[0][0], O.wezly[1][0]);
  const rows = tutorial ? 2 : losuj(O.wezly[0][1], O.wezly[1][1]);
  const S = L.odstep, kMax = L.komnata[1];
  const M = L.sciana + 2 + (rodzaj === 'jaskinia' ? 3 : 0);
  const w = M * 2 + (cols - 1) * S + kMax + 2;
  const h = M * 2 + (rows - 1) * S + kMax + 2;
  const g = new Uint8Array(w * h);
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : g[y * w + x]);
  const kop = (x0: number, y0: number, x1: number, y1: number) => {
    const b = rodzaj === 'jaskinia' ? L.sciana + 1 : 1; // jaskinia: krzywe korytarze nie dochodzą do brzegu planu
    for (let y = Math.max(b, y0); y < Math.min(h - b, y1); y++) for (let x = Math.max(b, x0); x < Math.min(w - b, x1); x++) g[y * w + x] = 1;
  };

  const jaskinia = rodzaj === 'jaskinia';
  // Jaskinia: komnata = elipsa o poszarpanym brzegu, korytarz = kręta smuga zmiennej szerokości.
  const kopElipse = (cx: number, cy: number, rx: number, ry: number) => {
    const fa = r() * 6.28, fb = r() * 6.28;
    for (let y = Math.floor(cy - ry - 2); y <= Math.ceil(cy + ry + 2); y++) for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x++) {
      const a = Math.atan2(y - cy, x - cx);
      const brzeg = 1 + Math.sin(a * 3 + fa) * 0.12 + Math.sin(a * 5 + fb) * 0.08;
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= brzeg * brzeg) kop(x, y, x + 1, y + 1);
    }
  };
  const kopKrety = (ax: number, ay: number, bx: number, by: number) => {
    const L = Math.hypot(bx - ax, by - ay), n = Math.max(4, Math.ceil(L / 2));
    const nx = -(by - ay) / (L || 1), ny = (bx - ax) / (L || 1);
    const amp = (r() - 0.5) * L * 0.35, faza = r() * 6.28;
    for (let i = 0; i <= n; i++) {
      const u = i / n, off = Math.sin(u * Math.PI) * amp + Math.sin(u * 9 + faza) * 1.2;
      const px = ax + (bx - ax) * u + nx * off, py = ay + (by - ay) * u + ny * off;
      const p = 1 + (r() < 0.3 ? 1 : 0);
      kop(Math.round(px) - p, Math.round(py) - p, Math.round(px) + p + 1, Math.round(py) + p + 1);
    }
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
    if (jaskinia && duza) kopElipse(wx[k], wy[k], bw / 2 + 0.5, bh / 2 + 0.5);
    else kop(x0, y0, x0 + bw, y0 + bh);
    komnaty.push({ x0, y0, x1: x0 + bw, y1: y0 + bh, cx: wx[k], cy: wy[k], glebokosc: dist[k] / maxD, wejscie: k === wej, skarb: k === skarb, duza });
  }
  // Korytarze (w kształcie L).
  for (const e of krawedzie) {
    const [a, b] = e.split(',').map(Number);
    const najpierwPoziomo = r() < 0.5;
    const ax = wx[a], ay = wy[a], bx = wx[b], by = wy[b];
    const poziom = (y: number, xa: number, xb: number) => kop(Math.min(xa, xb) - pol, y - pol, Math.max(xa, xb) + pol + 1, y + pol + 1);
    const pion = (x: number, ya: number, yb: number) => kop(x - pol, Math.min(ya, yb) - pol, x + pol + 1, Math.max(ya, yb) + pol + 1);
    if (jaskinia) kopKrety(ax, ay, bx, by);
    else if (najpierwPoziomo) { poziom(ay, ax, bx); pion(bx, ay, by); }
    else { pion(ax, ay, by); poziom(by, ax, bx); }
  }

  // Jaskinia: wygładzenie skał (tylko dokładanie podłogi, więc nic się nie rozłącza) – obłe ściany zamiast prostokątów.
  if (jaskinia) for (let pass = 0; pass < 2; pass++) {
    const dodaj: number[] = [];
    for (let y = L.sciana + 1; y < h - L.sciana - 1; y++) for (let x = L.sciana + 1; x < w - L.sciana - 1; x++) {
      if (g[y * w + x]) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) n += at(x + dx, y + dy);
      if (n >= 5) dodaj.push(y * w + x);
    }
    for (const i of dodaj) g[i] = 1;
  }
  if (jaskinia) for (const k of komnaty) {
    // Komnata = rzeczywisty zasięg podłogi wokół środka (do pochodni, ozdób i skrzyni).
    let y0 = k.cy; while (at(k.cx, y0 - 1)) y0--;
    k.y0 = y0;
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
        : rodzaj === 'jaskinia'
          ? (['stalagmit', 'krysztal', 'kosci', 'kaluza', 'grzybki', 'stalagmit'] as const)[Math.floor(r() * 6)]
          : (['beczka', 'skrzynka', 'kosci', 'kaluza'] as const)[Math.floor(r() * 4)];
      ozdoby.push({ x, y, co, r: r() });
    }
  }

  // Poziomy: zejście w głąb w najdalszej komnacie (zamiast skrzyni), na ostatnim zwykłym – skrzynia, a w lochu
  // z ukrytym poziomem także luźna ściana przy północnej ścianie losowej komnaty (osobne ziarno – układ się nie zmienia).
  const ukrytyPoziom = lv.poziom > lv.normalne;
  const maSkrzynie = lv.poziom >= lv.normalne;
  const zejscie = maSkrzynie ? null : { ...skrzynia };
  let ukryte: { x: number; y: number } | null = null;
  if (lv.ukryty && lv.poziom === lv.normalne) {
    const r2 = rng(hashLochu(`${seed}:ukryte:${lv.poziom}`));
    const kandydaci: { x: number; y: number; zly: number }[] = [];
    komnaty.forEach((k, i) => {
      if (!k.duza) return;
      const zly = i === wej || i === skarb ? 1 : 0;
      for (let x = k.x0 + 1; x < k.x1 - 1; x++) {
        const y = k.y0;
        let ok = !!at(x, y + 1) && !!at(x, y + 2);
        for (let dx = -1; dx <= 1 && ok; dx++) ok = !!at(x + dx, y) && !at(x + dx, y - 1);
        if (!ok) continue;
        if (Math.abs(x - schody.x) <= 3 && Math.abs(y - schody.y) <= 3) continue;
        if (Math.abs(x - skrzynia.x) <= 3 && Math.abs(y - skrzynia.y) <= 3) continue;
        kandydaci.push({ x, y, zly });
      }
    });
    const dobre = kandydaci.filter((q) => !q.zly);
    const z = dobre.length ? dobre : kandydaci;
    if (z.length) {
      const q = z[Math.floor(r2() * z.length)];
      ukryte = { x: q.x, y: q.y };
      for (let i = pochodnie.length - 1; i >= 0; i--) if (Math.abs(pochodnie[i].x - q.x) <= 2 && Math.abs(pochodnie[i].y - (q.y - 1)) <= 1) pochodnie.splice(i, 1);
      for (let i = ozdoby.length - 1; i >= 0; i--) if (Math.abs(ozdoby[i].x - q.x) <= 2 && Math.abs(ozdoby[i].y - q.y) <= 2) ozdoby.splice(i, 1);
    }
  }

  return { rodzaj, seed, tutorial, w, h, T: L.kratka, siatka: g, komnaty, schody, start, skrzynia, sciany, pochodnie, ozdoby,
    poziom: lv.poziom, normalne: lv.normalne, ukryty: lv.ukryty, ukrytyPoziom, maSkrzynie, zejscie, ukryte };
}

/** Kratka podłogi? (poza planem: skała) */
export function podloga(p: PlanLochu, x: number, y: number) {
  return x >= 0 && y >= 0 && x < p.w && y < p.h && p.siatka[y * p.w + x] === 1;
}
