// Układ lochu (content/lochy.ts): siatka kratek, węzły połączone korytarzami (drzewo rozpinające + kilka
// pętli), w węzłach komnaty albo skrzyżowania, wejście w losowym węźle, skarb w najdalszym. Wszystko z ziarna –
// ten sam loch dla każdego i po każdym wejściu. Bez Phasera i DOM-u (scripts/test-lochy.mjs liczy to w Node).
import { rng } from '../rng';
import { LOCH, LOCHY, POZIOMY_LOCHU, jaskiniowy, type RodzajLochu } from '../content/lochy';
import { MAKS_WEZLOW, POZIOMY_ZWYKLE, SKALE, ZYLY, type SkalaLochu, type Surowiec } from '../content/kopalnie';

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
  ozdoby: { x: number; y: number; co: 'kosci' | 'czaszka' | 'trumna' | 'beczka' | 'skrzynka' | 'pajeczyna' | 'kaluza' | 'stalagmit' | 'krysztal' | 'grzybki' | 'gruz' | 'swiece' | 'urna' | 'posag' | 'lancuch' | 'wozek' | 'kilof' | 'stempel'; r: number }[];
  /** Jaskinie i kopalnie: wielkość (content/kopalnie.ts). */
  skala: SkalaLochu;
  /** Żyły rudy w licu ściany (kratka podłogi pod licem) – kopie się je kilofem. */
  zyly: { x: number; y: number; s: Surowiec }[];
}

/** Jaskinie i kopalnie: wielkość i surowce z miejsca (content/kopalnie.ts). */
export interface OpcjePlanu { skala?: SkalaLochu; surowce?: [Surowiec, number][]; wRegionie?: boolean }

export function hashLochu(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Ile poziomów ma loch (z jego numeru): 75 % – 1…5 zwykłych, 25 % – 5 zwykłych + ukryty szósty.
 * Jaskinie i kopalnie: według wielkości (zwykła 1–3, duża 4–6, mała 1), bez ukrytego poziomu. */
export function poziomyLochu(rodzaj: RodzajLochu, seed: number, skala: SkalaLochu = 'zwykly'): { normalne: number; ukryty: boolean } {
  const r = rng(hashLochu(`poziomy:${rodzaj}:${seed}`));
  if (jaskiniowy(rodzaj)) {
    const [a, b] = SKALE[skala].poziomy;
    if (b - a === 2) {
      const u = r();
      const k = u < POZIOMY_ZWYKLE[0] ? 0 : u < POZIOMY_ZWYKLE[0] + POZIOMY_ZWYKLE[1] ? 1 : 2;
      return { normalne: a + k, ukryty: false };
    }
    return { normalne: a + Math.floor(r() * (b - a + 1)), ukryty: false };
  }
  if (r() < POZIOMY_LOCHU.szansaUkrytego) return { normalne: POZIOMY_LOCHU.maks, ukryty: true };
  return { normalne: 1 + Math.floor(r() * POZIOMY_LOCHU.maks), ukryty: false };
}

export interface PoziomPlanu { poziom: number; normalne: number; ukryty: boolean }

export function planLochu(rodzaj: RodzajLochu, seed: number, tutorial = false, lv: PoziomPlanu = { poziom: 1, normalne: 1, ukryty: false }, opcje: OpcjePlanu = {}): PlanLochu {
  // Pierwszy poziom ma dawny układ (to samo ziarno); niższe – własne.
  const r = rng(lv.poziom > 1 ? hashLochu(`${seed}:poziom:${lv.poziom}`) : seed);
  const O = LOCHY[rodzaj];
  const L = LOCH;
  const losuj = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const jaskinia = jaskiniowy(rodzaj);
  const skala: SkalaLochu = jaskinia ? opcje.skala ?? 'zwykly' : 'zwykly';
  const Sk = SKALE[skala];
  const zakres = jaskinia && Sk.wezly ? Sk.wezly : O.wezly;
  // Większe poziomy: więcej węzłów (pole × obszar), ale z górną granicą (płótno na telefonie).
  const mn = Math.sqrt(jaskinia ? Sk.obszar : 1);
  const cols = tutorial ? 2 : Math.min(MAKS_WEZLOW[0], Math.round(losuj(zakres[0][0], zakres[1][0]) * mn));
  const rows = tutorial ? 2 : Math.min(MAKS_WEZLOW[1], Math.round(losuj(zakres[0][1], zakres[1][1]) * mn));
  const S = L.odstep, kMax = L.komnata[1];
  const M = L.sciana + 2 + (jaskinia ? 3 : 0);
  const w = M * 2 + (cols - 1) * S + kMax + 2;
  const h = M * 2 + (rows - 1) * S + kMax + 2;
  const g = new Uint8Array(w * h);
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : g[y * w + x]);
  const kop = (x0: number, y0: number, x1: number, y1: number) => {
    const b = jaskinia ? L.sciana + 1 : 1; // jaskinia: krzywe korytarze nie dochodzą do brzegu planu
    for (let y = Math.max(b, y0); y < Math.min(h - b, y1); y++) for (let x = Math.max(b, x0); x < Math.min(w - b, x1); x++) g[y * w + x] = 1;
  };

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
    // Kopalnia: chodniki prostsze (kuci ludzie), jaskinia: kręte.
    const krety = rodzaj === 'kopalnia' ? 0.4 : 1;
    const amp = (r() - 0.5) * L * 0.35 * krety, faza = r() * 6.28;
    for (let i = 0; i <= n; i++) {
      const u = i / n, off = Math.sin(u * Math.PI) * amp + Math.sin(u * 9 + faza) * 1.2 * krety;
      const px = ax + (bx - ax) * u + nx * off, py = ay + (by - ay) * u + ny * off;
      const p = 1 + (r() < 0.3 ? 1 : 0);
      kop(Math.round(px) - p, Math.round(py) - p, Math.round(px) + p + 1, Math.round(py) + p + 1);
    }
  };
  // Węzły: środki z małym przesunięciem.
  const n = cols * rows;
  const wx: number[] = [], wy: number[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const dr = jaskinia && !tutorial ? 3 : 2; // jaskinie: węzły rozrzucone mocniej (nieregularny kształt)
    wx.push(M + Math.floor(kMax / 2) + 1 + i * S + losuj(-dr, dr));
    wy.push(M + Math.floor(kMax / 2) + 1 + j * S + losuj(-dr, dr));
  }
  const sasiedzi = (k: number) => {
    const i = k % cols, j = Math.floor(k / cols), out: number[] = [];
    if (i > 0) out.push(k - 1);
    if (i < cols - 1) out.push(k + 1);
    if (j > 0) out.push(k - cols);
    if (j < rows - 1) out.push(k + cols);
    // Jaskinie: także po skosie – korytarze idą we wszystkie strony, układ nie wygląda jak kratka.
    if (jaskinia && !tutorial) {
      if (i > 0 && j > 0) out.push(k - cols - 1);
      if (i < cols - 1 && j > 0) out.push(k - cols + 1);
      if (i > 0 && j < rows - 1) out.push(k + cols - 1);
      if (i < cols - 1 && j < rows - 1) out.push(k + cols + 1);
    }
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
  // Pętle: w jaskiniach więcej (dużo korytarzy, właściciel), skośne rzadziej, żeby się nie plątały.
  for (let k = 0; k < n; k++) for (const q of sasiedzi(k)) {
    if (q <= k || krawedzie.has(klucz(k, q))) continue;
    const skos = k % cols !== q % cols && Math.floor(k / cols) !== Math.floor(q / cols);
    const p = jaskinia && !tutorial ? (skos ? 0.14 : 0.38) : L.petle;
    if (r() < p) krawedzie.add(klucz(k, q));
  }
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
    const duza = tutorial || k === wej || k === skarb || r() < (jaskinia ? 0.7 : L.szansaKomnaty);
    // Jaskinie: komnaty większe (do kMax + 2), leże ze skarbem największe.
    const kM = jaskinia && !tutorial ? kMax + 2 : kMax;
    let bw: number, bh: number;
    if (k === skarb) bw = bh = kM;
    else if (k === wej) bw = bh = L.komnata[0] + 1;
    else if (duza) { bw = losuj(L.komnata[0], kM); bh = losuj(L.komnata[0], kM); }
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

  if (jaskinia && !tutorial) {
    // Wielkie sale: część połączeń dwóch komnat to jedna obszerna grota (elipsa w połowie drogi).
    for (const e of krawedzie) {
      const [a, b] = e.split(',').map(Number);
      if (!komnaty[a].duza || !komnaty[b].duza || r() > 0.16) continue;
      const mx = (wx[a] + wx[b]) / 2, my = (wy[a] + wy[b]) / 2;
      kopElipse(mx, my, S * (0.45 + r() * 0.2), S * (0.4 + r() * 0.2));
    }
    // Ślepe chodniki (kopalnia: boczne wyrobiska, jaskinia: wąskie szczeliny) – dużo korytarzy.
    const boczne = rodzaj === 'kopalnia' ? 0.55 : 0.3;
    for (let k = 0; k < n; k++) {
      if (r() > boczne) continue;
      const a = r() * Math.PI * 2, d = 6 + r() * 6;
      kopKrety(wx[k], wy[k], wx[k] + Math.cos(a) * d, wy[k] + Math.sin(a) * d);
    }
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
  const naDnie = lv.poziom >= lv.normalne;
  // Poziom ukryty (za luźną ścianą): marmurowa sala – posągi, urny, świeczniki, bez pajęczyn i gruzu.
  const ukrytyPoz = lv.poziom > lv.normalne;
  const wolne = (x: number, y: number) => at(x, y) && !(Math.abs(x - schody.x) <= 1 && Math.abs(y - schody.y) <= 3) && !(Math.abs(x - skrzynia.x) <= 1 && Math.abs(y - skrzynia.y) <= 1) && !ozdoby.some((o) => Math.abs(o.x - x) < 2 && Math.abs(o.y - y) < 2);
  for (const k of komnaty) {
    if (!k.duza) continue;
    for (const [x, y] of [[k.x0, k.y0], [k.x1 - 1, k.y0]]) if (r() < 0.6 && !ukrytyPoz) ozdoby.push({ x, y, co: 'pajeczyna', r: r() });
    const ile = losuj(ukrytyPoz ? 2 : 1, ukrytyPoz ? 4 : 4);
    for (let i = 0; i < ile; i++) {
      const x = losuj(k.x0, k.x1 - 1), y = losuj(k.y0 + 1, k.y1 - 1);
      if (!wolne(x, y)) continue;
      const lista = ukrytyPoz ? (['posag', 'urna', 'swiece', 'urna', 'posag'] as const)
        : rodzaj === 'krypta' ? (['kosci', 'czaszka', 'trumna', 'kaluza', 'gruz', 'swiece', 'lancuch'] as const)
          : rodzaj === 'jaskinia' ? (['stalagmit', 'krysztal', 'kosci', 'kaluza', 'grzybki', 'stalagmit', 'gruz'] as const)
            : rodzaj === 'kopalnia' ? (['wozek', 'stempel', 'kilof', 'gruz', 'beczka', 'kaluza', 'skrzynka', 'gruz'] as const)
            : (['beczka', 'skrzynka', 'kosci', 'kaluza', 'gruz', 'lancuch', 'swiece'] as const);
      const co = lista[Math.floor(r() * lista.length)];
      ozdoby.push({ x, y, co, r: r() });
    }
  }
  // Leże (jaskinie i kopalnie, skrzynia na dnie): kości i czaszki dookoła skarbu.
  if (jaskinia && naDnie && !tutorial) {
    const k = komnaty[skarb];
    for (let i = 0; i < 14; i++) {
      const x = losuj(k.x0, k.x1 - 1), y = losuj(k.y0 + 1, k.y1 - 1);
      if (wolne(x, y)) ozdoby.push({ x, y, co: r() < 0.35 ? 'czaszka' : 'kosci', r: r() });
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

  // Żyły rudy: lico ściany nad kratką podłogi (widać je od dołu), z dala od schodów/skrzyni/zejścia i od siebie.
  const zyly: PlanLochu['zyly'] = [];
  if (jaskinia && !tutorial && opcje.surowce?.length) {
    const r3 = rng(hashLochu(`${seed}:zyly:${lv.poziom}`));
    const kand: { x: number; y: number }[] = [];
    for (let y = 2; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      if (!at(x, y) || at(x, y - 1) || at(x, y - 2) || !at(x, y + 1)) continue;
      if (!at(x - 1, y) || !at(x + 1, y) || at(x - 1, y - 1) || at(x + 1, y - 1)) continue;
      const blisko = (q: { x: number; y: number } | null, d: number) => !!q && Math.abs(q.x - x) <= d && Math.abs(q.y - y) <= d;
      if (blisko(schody, 4) || blisko(skrzynia, 3) || blisko(zejscie, 3) || blisko(ukryte, 3)) continue;
      if (pochodnie.some((q) => q.x === x && q.y === y - 1)) continue;
      kand.push({ x, y });
    }
    const duze = komnaty.filter((k) => k.duza).length;
    const ile = Math.round(duze * ZYLY.naKomnate[rodzaj as 'jaskinia' | 'kopalnia'] * (opcje.wRegionie ? ZYLY.wRegionie : 1));
    const suma = opcje.surowce.reduce((a, q) => a + q[1], 0);
    for (let t = 0; t < ile * 6 && zyly.length < ile && kand.length; t++) {
      const i = Math.floor(r3() * kand.length);
      const q = kand[i];
      kand.splice(i, 1);
      if (zyly.some((z) => Math.abs(z.x - q.x) < 4 && Math.abs(z.y - q.y) < 3)) continue;
      let u = r3() * suma, s: Surowiec = opcje.surowce[0][0];
      for (const [k, wg] of opcje.surowce) { if ((u -= wg) < 0) { s = k; break; } }
      zyly.push({ x: q.x, y: q.y, s });
    }
  }

  return { rodzaj, seed, tutorial, w, h, T: L.kratka, siatka: g, komnaty, schody, start, skrzynia, sciany, pochodnie, ozdoby,
    poziom: lv.poziom, normalne: lv.normalne, ukryty: lv.ukryty, ukrytyPoziom, maSkrzynie, zejscie, ukryte, skala, zyly };
}

/** Kratka podłogi? (poza planem: skała) */
export function podloga(p: PlanLochu, x: number, y: number) {
  return x >= 0 && y >= 0 && x < p.w && y < p.h && p.siatka[y * p.w + x] === 1;
}
