// Pola uprawne: „szachownica” wąskich pasów (jak na Lubelszczyźnie), każdy pas jedną uprawą, w rzędach wzdłuż pasa,
// wygląd zależny od miesiąca (wzrost, kwitnienie, dojrzewanie, ściernisko, orka, ozimina), miedze z chwastami i kwiatami,
// (w grze: src/gen/pola.ts, z wycinkiem kawałka i rysunkami roślin od grafika – OpcjePasa)
// a w warzywach część roślin DOJRZAŁA (do zebrania, jak drzewa z zaciosem) – reszta to dekoracja.
// Wszystko deterministyczne: ziarno z id obszaru OSM, pozycje we współrzędnych świata.
import { Obraz, hex, hash, rng, szum, bayer, ustaw, wez, mieszaj, ciemniej, jasniej, OBRYS } from './wspolne';
import { KATY_PIKSELOWE } from './budynki';
import { runo } from './runo';

export type Uprawa = 'marchewka' | 'brokul' | 'salata' | 'kapusta' | 'ziemniak' | 'burak' | 'dynia' | 'zboze' | 'rzepak' | 'kukurydza' | 'chmiel' | 'slonecznik';
/** Faza w danym miesiącu: goła ziemia, młode, rosnące, kwitnie, dojrzałe (do zbioru), zebrane/ściernisko, ozimina. */
export type Faza = 'orka' | 'mlode' | 'rosnie' | 'kwitnie' | 'dojrzale' | 'zebrane' | 'ozimina';

interface Opis { rzad: number; krok: number; ziemia: boolean; zbiór: string | null; fazy: Faza[] /* 12 miesięcy, styczeń = 0 */; waga: number }
const F = (s: string): Faza[] => s.split(' ').map((k) => ({ o: 'orka', m: 'mlode', r: 'rosnie', k: 'kwitnie', d: 'dojrzale', z: 'zebrane', w: 'ozimina' } as Record<string, Faza>)[k]);
/** Uprawy: rozstaw rzędów i roślin w px świata, czy widać ziemię, przedmiot do zebrania (id z OWOCE w grze), fazy po miesiącach, waga losowania. */
export const UPRAWY: Record<Uprawa, Opis> = {
  //                                             sty ...                                  gru
  marchewka: { rzad: 11, krok: 7, ziemia: true, zbiór: 'marchewka', fazy: F('o o o m m r r d d d o o'), waga: 1 },
  brokul:    { rzad: 14, krok: 12, ziemia: true, zbiór: 'brokul',    fazy: F('o o o o m r d d d d o o'), waga: 0.7 },
  salata:    { rzad: 12, krok: 10, ziemia: true, zbiór: 'salata',    fazy: F('o o o m r d d d d o o o'), waga: 0.6 },
  kapusta:   { rzad: 15, krok: 14, ziemia: true, zbiór: 'kapusta',  fazy: F('o o o o m r r d d d o o'), waga: 0.8 },
  ziemniak:  { rzad: 12, krok: 9, ziemia: true, zbiór: 'ziemniak',  fazy: F('o o o o m k k r d d o o'), waga: 1.4 },
  burak:     { rzad: 12, krok: 9, ziemia: true, zbiór: 'burak',     fazy: F('o o o o m r r r d d d o'), waga: 0.8 },
  dynia:     { rzad: 22, krok: 18, ziemia: true, zbiór: 'dynia',   fazy: F('o o o o o m r r d d o o'), waga: 0.4 },
  zboze:     { rzad: 5, krok: 4, ziemia: false, zbiór: null,       fazy: F('w w w r r r d z z o w w'), waga: 3 },
  rzepak:    { rzad: 6, krok: 5, ziemia: false, zbiór: null,       fazy: F('w w w r k r d z w w w w'), waga: 1.4 },
  kukurydza: { rzad: 12, krok: 7, ziemia: true, zbiór: null,        fazy: F('o o o o m r r r d z o o'), waga: 1.2 },
  chmiel:    { rzad: 20, krok: 9, ziemia: true, zbiór: null,       fazy: F('o o o m r r r d z o o o'), waga: 0.5 },
  slonecznik:{ rzad: 13, krok: 10, ziemia: true, zbiór: null,        fazy: F('o o o o m r k d z o o o'), waga: 0.4 },
};

/** Uprawa pasa: z tagu OSM `crop`, jeśli jest; inaczej losowana z wag (deterministycznie z ziarna pasa). Działki (allotments) mają tylko warzywa. */
export function uprawaPasa(seed: number, dzialka = false, cropOSM?: string): Uprawa {
  const map: Record<string, Uprawa> = { wheat: 'zboze', barley: 'zboze', rye: 'zboze', oats: 'zboze', triticale: 'zboze', cereal: 'zboze', rape: 'rzepak', rapeseed: 'rzepak', maize: 'kukurydza', corn: 'kukurydza', potato: 'ziemniak', potatoes: 'ziemniak', sugar_beet: 'burak', hop: 'chmiel', hops: 'chmiel', sunflower: 'slonecznik', vegetables: 'marchewka', cabbage: 'kapusta', carrot: 'marchewka', pumpkin: 'dynia' };
  if (cropOSM && map[cropOSM]) return map[cropOSM];
  const lista = (Object.keys(UPRAWY) as Uprawa[]).filter((u) => !dzialka || UPRAWY[u].zbiór);
  const suma = lista.reduce((a, u) => a + UPRAWY[u].waga, 0);
  let r = hash(seed, 3, 91) * suma;
  for (const u of lista) { r -= UPRAWY[u].waga; if (r <= 0) return u; }
  return lista[0];
}

/**
 * Pas: prostokąt pasa (`pierscien`, nieprzycięty) i obrys całego pola (`pole`). Punkt należy do pasa, gdy leży w polu
 * i jego współrzędna w poprzek rzędów mieści się w [va, vb) – działa dla każdego kształtu pola, także z wcięciami
 * (przycinanie wielokątem psuło się na polach wklęsłych: z pola z OSM pod Węglinkiem nie zostawał żaden pas).
 */
export interface Pas { pierscien: number[]; kat: number; seed: number; pole?: number[]; va?: number; vb?: number }

/**
 * Dzieli obszar pola (pierścień w px świata) na wąskie pasy wzdłuż najdłuższej krawędzi, kąt przyciągnięty do 8 kątów
 * pikselowych (równe schodki rzędów). Szerokość pasa 60–160 px (ok. 15–40 m), losowana z ziarna obszaru.
 */
export function pasyPola(pierscien: number[], seed: number, dzialka = false): Pas[] {
  const n = pierscien.length / 2;
  let best = 0, bk = 0;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n, dx = pierscien[2 * j] - pierscien[2 * i], dy = pierscien[2 * j + 1] - pierscien[2 * i + 1], l = Math.hypot(dx, dy); if (l > best) { best = l; bk = (Math.atan2(dy, dx) * 180) / Math.PI; } }
  const k0 = ((bk % 180) + 180) % 180;
  const kat = KATY_PIKSELOWE.reduce((a, k) => (Math.min(Math.abs(k - k0), 180 - Math.abs(k - k0)) < Math.min(Math.abs(a - k0), 180 - Math.abs(a - k0)) ? k : a), 0);
  const t = (kat * Math.PI) / 180, ux = Math.cos(t), uy = Math.sin(t), vx = -uy, vy = ux;
  let v0 = 1e9, v1 = -1e9, u0 = 1e9, u1 = -1e9;
  for (let i = 0; i < n; i++) { const x = pierscien[2 * i], y = pierscien[2 * i + 1], v = x * vx + y * vy, u = x * ux + y * uy; v0 = Math.min(v0, v); v1 = Math.max(v1, v); u0 = Math.min(u0, u); u1 = Math.max(u1, u); }
  const R = rng(seed), out: Pas[] = [];
  let v = v0, k = 0;
  while (v < v1 - 4) {
    const w = dzialka ? 40 + R() * 30 : 60 + R() * 100, va = v, vb = Math.min(v1, v + w);
    const prost = [u0 - 2, va, u1 + 2, va, u1 + 2, vb, u0 - 2, vb];
    const ring: number[] = [];
    for (let i = 0; i < 8; i += 2) ring.push(prost[i] * ux + prost[i + 1] * vx, prost[i] * uy + prost[i + 1] * vy);
    out.push({ pierscien: ring, kat, seed: (seed * 31 + k++) | 0, pole: pierscien, va, vb });
    v = vb;
  }
  return out;
}
void przytnij;

/** Przycięcie wypukłego prostokąta pasa do obszaru (Sutherland–Hodgman po krawędziach obszaru; obszary pól są prawie zawsze wypukłe). */
function przytnij(sub: number[], clip: number[]): number[] {
  let out = sub;
  const n = clip.length / 2;
  let area = 0; for (let i = 0; i < n; i++) { const j = (i + 1) % n; area += clip[2 * i] * clip[2 * j + 1] - clip[2 * j] * clip[2 * i + 1]; }
  const s = area > 0 ? 1 : -1;
  for (let i = 0; i < n && out.length; i++) {
    const j = (i + 1) % n, ax = clip[2 * i], ay = clip[2 * i + 1], bx = clip[2 * j], by = clip[2 * j + 1];
    const inside = (x: number, y: number) => s * ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) >= 0;
    const inp = out, m = inp.length / 2; out = [];
    for (let k = 0; k < m; k++) {
      const px = inp[2 * k], py = inp[2 * k + 1], qx = inp[2 * ((k + 1) % m)], qy = inp[2 * ((k + 1) % m) + 1];
      const pi = inside(px, py), qi = inside(qx, qy);
      if (pi) out.push(px, py);
      if (pi !== qi) { const d1 = (bx - ax) * (py - ay) - (by - ay) * (px - ax), d2 = (bx - ax) * (qy - ay) - (by - ay) * (qx - ax), t = d1 / (d1 - d2); out.push(px + (qx - px) * t, py + (qy - py) * t); }
    }
  }
  return out;
}

const pip = (r: number[], x: number, y: number) => { let c = false; const n = r.length / 2; for (let i = 0, j = n - 1; i < n; j = i++) { const ax = r[2 * i], ay = r[2 * i + 1], bx = r[2 * j], by = r[2 * j + 1]; if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) c = !c; } return c; };
/** Odległość od brzegu wielokąta, najwyżej `cap` (dalsze krawędzie odrzuca od razu po ramce – w środku pola szybko). */
const odKrawedzi = (r: number[], x: number, y: number, cap = 1e9) => { let m = cap; const n = r.length / 2; for (let i = 0; i < n; i++) { const j = (i + 1) % n, ax = r[2 * i], ay = r[2 * i + 1], bx = r[2 * j], by = r[2 * j + 1]; if (x < Math.min(ax, bx) - m || x > Math.max(ax, bx) + m || y < Math.min(ay, by) - m || y > Math.max(ay, by) + m) continue; const dx = bx - ax, dy = by - ay; let t = ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1); t = Math.max(0, Math.min(1, t)); const ex = ax + t * dx - x, ey = ay + t * dy - y; const d = Math.sqrt(ex * ex + ey * ey); if (d < m) m = d; } return m; };

const P = (a: string[]) => a.map(hex);
const K = {
  ziemia: P(['#4a3424', '#5a4030', '#6b4d38', '#7c5c43', '#8e6c50']),
  ziemiaSucha: P(['#6e5a42', '#7f6a4e', '#90795a', '#a28a68']),
  lisc: P(['#2c4a22', '#3a5e2a', '#4c7434', '#628a40', '#7ea250']),
  liscSiny: P(['#2c4a44', '#3a5e56', '#4c7468', '#62887a', '#80a294']),
  liscJasny: P(['#4a7a2c', '#5e9234', '#78aa40', '#94c050', '#b4d66a']),
  zloto: P(['#8a6a2c', '#a8843a', '#c49e4a', '#d8b65e', '#ead07a']),
  sciern: P(['#9a8450', '#ae965c', '#c0a86a', '#d0ba7c']),
  rzepakZ: P(['#b89a10', '#d8b818', '#f0d230', '#f8e65a']),
  pomar: P(['#8a3a10', '#b4521a', '#d86e22', '#f08c34', '#f8b05a']),
  burak: P(['#5a1a2a', '#7a2236', '#982e44']),
  kwiaty: P(['#d83a3a', '#5a7ad8', '#f2f2f2', '#e8d04a', '#b06ad0']),
  slupy: P(['#4a3424', '#6a4a30', '#8a6440']),
  drut: hex('#5a5560'),
  slom: P(['#a88a48', '#c4a458', '#dcc070', '#ecd890']),
};
const OBRYS_LISCIA = hex('#16261a');
// Wycinki palet liczone raz (w pętli po pikselach .slice() tworzył nowe tablice – dużo pracy dla odśmiecania pamięci).
const LISC_1 = K.lisc.slice(1), SCIERN_1 = K.sciern.slice(1), LISC_J14 = K.liscJasny.slice(1, 4), ZIEMIA_14 = K.ziemia.slice(1, 4);
const pick = (t: number[], v: number) => t[Math.max(0, Math.min(t.length - 1, Math.floor(v * t.length)))];

export interface DoZebrania { x: number; y: number; przedmiot: string; uprawa: Uprawa }

/** Rysunek rośliny od grafika (zamówienie 12): obraz i punkt podstawy (środek dolnej krawędzi). */
export interface Sprite { o: Obraz; bx: number; by: number }
/** Faza rysunku: młoda, dorosła (warianty 1–3), dojrzała do zebrania (1–2), dołek po zbiorze. */
export type FazaRysunku = 'mloda' | 'dorosla' | 'dojrzala' | 'po_zbiorze';
/** Klucz rysunku: `<uprawa>_<faza>[_<wariant>]`, jak nazwy plików `uprawa_<...>.png`. */
export const kluczRysunku = (u: Uprawa, f: FazaRysunku, wariant: number) =>
  f === 'mloda' || f === 'po_zbiorze' ? `${u}_${f}` : `${u}_${f}_${f === 'dorosla' ? 1 + (wariant % 3) : 1 + (wariant % 2)}`;
/** Identyfikator rośliny do zebrania (to samo miejsce = ta sama roślina w każdym kawałku). */
export const idRosliny = (x: number, y: number) => `${Math.round(x)},${Math.round(y)}`;

/** Dodatki gry do malujPas: wycinek do malowania, rysunki roślin, zebrane rośliny, udział dojrzałych. */
export interface OpcjePasa {
  /** Malować tylko w tym prostokącie (px świata); pas może być dużo większy niż kawałek mapy. */
  wycinek?: { x0: number; y0: number; x1: number; y1: number };
  /** Rysunki roślin (klucz `kluczRysunku`); brak = rośliny rysowane kodem jak w makiecie. */
  rysunki?: Record<string, Sprite>;
  /** Rośliny zebrane w tej sesji (idRosliny): dołek po zbiorze, nie wracają na listę do zebrania. */
  zebrane?: Set<string>;
  /** Udział roślin dojrzałych do zebrania w miesiącach zbioru (domyślnie 0,035). */
  dojrzale?: number;
}

/**
 * Maluje pas pola w obraz (współrzędne świata, przesunięcie ox, oy). `miesiac` 0–11. `wiatr` przechyla wysokie rośliny (px).
 * Zwraca rośliny dojrzałe do zebrania (ok. co 9. w warzywach, w miesiącach zbioru) – gra robi z nich obiekty jak drzewa do ścięcia.
 */
export function malujPas(o: Obraz, pas: Pas, uprawa: Uprawa, miesiac: number, ox = 0, oy = 0, wiatr = 0, op: OpcjePasa = {}): DoZebrania[] {
  const U = UPRAWY[uprawa], faza = U.fazy[((miesiac % 12) + 12) % 12];
  const r = pas.pierscien, t = (pas.kat * Math.PI) / 180, ux = Math.cos(t), uy = Math.sin(t), vx = -uy, vy = ux;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); y0 = Math.min(y0, r[i + 1]); y1 = Math.max(y1, r[i + 1]); }
  if (pas.pole) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (let i = 0; i < pas.pole.length; i += 2) { a = Math.min(a, pas.pole[i]); c = Math.max(c, pas.pole[i]); b = Math.min(b, pas.pole[i + 1]); d = Math.max(d, pas.pole[i + 1]); } x0 = Math.max(x0, a); y0 = Math.max(y0, b); x1 = Math.min(x1, c); y1 = Math.min(y1, d); }
  // Gra: tylko wycinek (kawałek mapy z zapasem), rośliny trochę dalej (sięgają w kawałek liśćmi).
  const W = op.wycinek, ZAPAS = 26;
  const wx0 = W ? Math.max(x0, W.x0) : x0, wy0 = W ? Math.max(y0, W.y0) : y0, wx1 = W ? Math.min(x1, W.x1) : x1, wy1 = W ? Math.min(y1, W.y1) : y1;
  const wPoblizu = (x: number, y: number) => !W || (x >= W.x0 - ZAPAS && x <= W.x1 + ZAPAS && y >= W.y0 - 6 && y <= W.y1 + ZAPAS * 2);
  const udzial = op.dojrzale ?? 0.035;
  const put = (x: number, y: number, c: number) => ustaw(o, Math.round(x - ox), Math.round(y - oy), c);
  // W pasie: w polu i w paśmie [va, vb) w poprzek rzędów; odległość od brzegu = do brzegu pola albo do granicy pasma.
  const pole = pas.pole ?? r, va = pas.va ?? -1e9, vb = pas.vb ?? 1e9;
  // Odległość do brzegu pola: w kratkach 8 px najpierw zgrubnie (środek kratki); daleko od brzegu nie liczymy dokładnie.
  // Kratka zapamiętuje też, czy jej środek leży w polu: kratka cała z jednej strony brzegu nie potrzebuje testu wielokąta.
  const KR = 8, zgrubnie = new Map<number, number>();
  const kratka = (x: number, y: number) => {
    const kx = Math.floor(x / KR), ky = Math.floor(y / KR), k = kx * 73856093 ^ ky * 19349663;
    let g = zgrubnie.get(k);
    if (g === undefined) { const cx = (kx + 0.5) * KR, cy = (ky + 0.5) * KR; g = odKrawedzi(pole, cx, cy, 60) * (pip(pole, cx, cy) ? 1 : -1); zgrubnie.set(k, g); }
    return g;
  };
  const doPola = (x: number, y: number) => { const g = Math.abs(kratka(x, y)); return g - KR > 40 ? 40 : odKrawedzi(pole, x, y, 40); };
  const wPasie = (x: number, y: number) => {
    const v = x * vx + y * vy;
    if (v < va || v >= vb) return false;
    const g = kratka(x, y);
    return Math.abs(g) > KR ? g > 0 : pip(pole, x, y);
  };
  const odBrzegu = (x: number, y: number) => { const v = x * vx + y * vy; return Math.min(doPola(x, y), v - va, vb - v, 40); };
  const MIEDZA = 5;
  /** Odległość od brzegu pasa z falowaniem (brzeg pola nie jest prosty: trawa wchodzi w pole, pole w miedzę). */
  const brzeg = (x: number, y: number) => { const d0 = odBrzegu(x, y); return d0 >= 40 ? d0 : d0 + (szum(x / 14 + pas.seed % 50, y / 14) - 0.5) * 11 + (szum(x / 4.5 + 30, y / 4.5) - 0.5) * 3; };
  // 1. podłoże pasa: ziemia w bruzdach wzdłuż rzędów / łan / ściernisko / ozimina; miedza z trawą
  for (let y = Math.floor(wy0); y <= wy1; y++) for (let x = Math.floor(wx0); x <= wx1; x++) {
    if (!wPasie(x + 0.5, y + 0.5)) continue;
    const d = brzeg(x + 0.5, y + 0.5), h = hash(x, y, pas.seed), n = szum(x / 7, y / 7), b = bayer(x, y);
    const v = x * vx + y * vy, u = x * ux + y * uy, fv = ((v % U.rzad) + U.rzad) % U.rzad;
    let c: number;
    if (d < MIEDZA || (d < MIEDZA + 6 && b > (d - MIEDZA) / 6 + 0.15)) { // miedza i poszarpany pas przejścia
      c = pick(LISC_1, n * 0.7 + h * 0.4);
      if (h < 0.025 && miesiac >= 4 && miesiac <= 8) c = K.kwiaty[Math.floor(hash(x, y, 7) * 5)];
    } else if (faza === 'orka' || (U.ziemia && faza !== 'zebrane')) {
      const grzbiet = fv < U.rzad / 2;
      c = pick(K.ziemia, (grzbiet ? 0.55 : 0.2) + n * 0.25 + h * 0.2 + (b - 0.5) * 0.15);
      if (faza === 'orka' && Math.floor(fv) === 0) c = K.ziemia[0];
    } else if (faza === 'zebrane') {
      c = (Math.floor(fv) === 0 && h < 0.7) ? K.sciern[0] : pick(SCIERN_1, n * 0.6 + h * 0.4);
      if (U.ziemia) c = pick(K.ziemiaSucha, n * 0.6 + h * 0.4);
    } else if (faza === 'ozimina') {
      c = Math.floor(fv) <= 1 ? pick(LISC_J14, n * 0.5 + h * 0.5) : pick(ZIEMIA_14, n * 0.5 + h * 0.5);
    } else if (uprawa === 'zboze') { // łan: falujące kłosy (fala z szumu wzdłuż wiatru)
      const fala = szum(u / 18 + wiatr * 0.3, v / 30);
      const pal = faza === 'dojrzale' ? K.zloto : K.liscJasny;
      c = pick(pal, 0.25 + fala * 0.55 + (Math.floor(fv) === 0 ? -0.2 : 0) + (h - 0.5) * 0.25);
      if (faza === 'dojrzale' && h < 0.004 && miesiac === 6) c = K.kwiaty[0]; // maki w zbożu
    } else if (uprawa === 'rzepak') {
      c = faza === 'kwitnie' ? pick(K.rzepakZ, 0.3 + n * 0.5 + (h - 0.5) * 0.3) : faza === 'dojrzale' ? pick(K.ziemiaSucha, 0.4 + n * 0.4) : pick(K.liscSiny, 0.3 + n * 0.5 + (h - 0.5) * 0.3);
    } else c = pick(K.lisc, n);
    const X = x - ox, Y = y - oy; if (X >= 0 && Y >= 0 && X < o.w && Y < o.h) o.px[Y * o.w + X] = c;
  }
  // 2. rośliny w rzędach
  let vmin = 1e9, vmax = -1e9, umin = 1e9, umax = -1e9;
  for (let i = 0; i < r.length; i += 2) { const v = r[i] * vx + r[i + 1] * vy, u = r[i] * ux + r[i + 1] * uy; vmin = Math.min(vmin, v); vmax = Math.max(vmax, v); umin = Math.min(umin, u); umax = Math.max(umax, u); }
  const zbiór: DoZebrania[] = [];
  if (faza === 'orka' || faza === 'ozimina') { if (faza === 'orka' && uprawa === 'chmiel') chmielPusty(); trawaNaBrzegu(); return zbiór; }
  if (uprawa === 'zboze' || uprawa === 'rzepak') { if (faza === 'zebrane' && uprawa === 'zboze') bele(); trawaNaBrzegu(); return zbiór; }
  const rosliny: [number, number, number][] = [];
  for (let v = Math.ceil(vmin / U.rzad) * U.rzad + U.rzad * 0.25; v < vmax; v += U.rzad)
    for (let u = Math.ceil(umin / U.krok) * U.krok; u < umax; u += U.krok) {
      const ju = (hash(Math.round(u), Math.round(v), 5) - 0.5) * U.krok * 0.3;
      const x = (u + ju) * ux + v * vx, y = (u + ju) * uy + v * vy;
      if (!wPoblizu(x, y) || !wPasie(x, y)) continue;
      const kon = MIEDZA + 3 + hash(Math.round(v), 0, pas.seed + 3) * 9; // każdy rząd kończy się gdzie indziej
      const db = brzeg(x, y); if (db < kon || (db < kon + 6 && hash(Math.round(x), Math.round(y), 17) < 0.5)) continue;
      if (hash(Math.round(x), Math.round(y), 13) < 0.04) continue; // luki w rzędach
      rosliny.push([x, y, hash(Math.round(x), Math.round(y), pas.seed + 1)]);
    }
  if (uprawa === 'chmiel') chmielSlupy();
  rosliny.sort((a, b) => a[1] - b[1]);
  for (const [x, y, h] of rosliny) {
    const dojrzala = faza === 'dojrzale' && !!U.zbiór && h < udzial;
    const zebrana = dojrzala && !!op.zebrane?.has(idRosliny(x, y));
    if (!rysunek(x, y, h, dojrzala, zebrana)) roslina(x, y, h, dojrzala);
    if (dojrzala && !zebrana) zbiór.push({ x: Math.round(x), y: Math.round(y), przedmiot: U.zbiór!, uprawa });
  }
  trawaNaBrzegu();
  return zbiór;

  /** Roślina z rysunku grafika (jeśli jest): młoda / dorosła / dojrzała / dołek po zbiorze, wariant z hasha pozycji. */
  function rysunek(x: number, y: number, h: number, dojrz: boolean, zebrana: boolean): boolean {
    if (!op.rysunki) return false;
    const f: FazaRysunku = zebrana ? 'po_zbiorze' : dojrz ? 'dojrzala' : faza === 'mlode' ? 'mloda' : 'dorosla';
    // Ziemniak: trzeci wariant dorosłego kwitnie (białe i fioletowe kwiatki) – tylko w miesiącach kwitnienia.
    const war = Math.floor(h * 997);
    const klucz = uprawa === 'ziemniak' && f === 'dorosla' ? `ziemniak_dorosla_${faza === 'kwitnie' ? 3 : 1 + (war % 2)}` : kluczRysunku(uprawa, f, war);
    const s = op.rysunki[klucz];
    if (!s) return false;
    const X = Math.round(x) - s.bx - ox, Y = Math.round(y) - s.by - oy;
    for (let j = 0; j < s.o.h; j++) for (let i = 0; i < s.o.w; i++) {
      const c = s.o.px[j * s.o.w + i];
      if (c >>> 24) ustaw(o, X + i, Y + j, c);
    }
    return true;
  }

  /** Kępki trawy i chwastów na skraju pasa i rzadko w polu – przykrywają równą krawędź. */
  function trawaNaBrzegu() {
    const lato = miesiac >= 4 && miesiac <= 8;
    for (let y = Math.floor(wy0 / 3) * 3 - 3; y <= wy1; y += 3) for (let x = Math.floor(wx0 / 3) * 3 - 3; x <= wx1; x += 3) {
      const jx = x + Math.floor(hash(x, y, 41) * 3), jy = y + Math.floor(hash(x, y, 42) * 3);
      if (!wPasie(jx, jy)) continue;
      const d = brzeg(jx, jy), h = hash(jx, jy, pas.seed + 9);
      let k: 'trawa_niska' | 'trawa_wysoka' | 'kwiaty' | null = null;
      if (d > MIEDZA - 2 && d < MIEDZA + 5 && h < 0.3) k = h < 0.04 ? 'trawa_wysoka' : lato && h < 0.08 ? 'kwiaty' : 'trawa_niska';
      else if (d >= MIEDZA + 7 && h < 0.012 && faza !== 'orka') k = 'trawa_niska'; // pojedyncze chwasty
      if (k) runo(o, jx - ox, jy - oy, k, jx * 131 + jy, wiatr * 0.6);
    }
  }

  /** Liść: elipsa wzdłuż kąta, jasna żyłka, ciemny brzeg (falisty dla sałaty i dyni), światło z lewej-góry. */
  function lisc(cx: number, cy: number, a: number, dl: number, sz: number, pal: number[], falisty = false) {
    const ca = Math.cos(a), sa = Math.sin(a), R = Math.ceil(dl + 1);
    for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
      const u = i * ca + j * sa, v = -i * sa + j * ca; // u wzdłuż liścia od nasady
      if (u < 0) continue;
      const t = u / dl, half = sz * Math.sin(Math.min(1, t) * Math.PI) * (falisty ? 0.85 + 0.25 * Math.sin(u * 2.3) : 1);
      if (t > 1 || Math.abs(v) > half) continue;
      const brzegL = Math.abs(v) > half - 0.9 || t > 0.93;
      const swiatlo = (-i - j) / (dl * 2.4) - (ca + sa) * 0.22 + (v * (sa - ca) > 0 ? 0.12 : -0.08);
      let c = pal[Math.max(1, Math.min(4, Math.round(2.3 + swiatlo * 2)))];
      if (Math.abs(v) < 0.5 && t > 0.1 && t < 0.85) c = pal[4];
      else if (brzegL) c = OBRYS_LISCIA;
      put(cx + i, cy + j, c);
    }
  }
  /** Główka kapusty: koło z liśćmi okrywowymi (łuki) i jasnym środkiem. */
  function glowa(cx: number, cy: number, R0: number, pal: number[]) {
    for (let j = -Math.ceil(R0); j <= R0; j++) for (let i = -Math.ceil(R0); i <= R0; i++) {
      const d = Math.hypot(i, j); if (d > R0 + 0.3) continue;
      const l = (-i - j) / (R0 * 1.6); let k = Math.max(0, Math.min(3, Math.round(1.6 + l * 1.6 - d / R0 * 0.6)));
      if (Math.abs(d - R0 * 0.62) < 0.45 && i + j > -1) k = Math.max(0, k - 1); // łuk liścia
      put(cx + i, cy + j, d > R0 - 0.6 ? OBRYS_LISCIA : pal[k]);
    }
  }
  /** Brokuł: zbite różyczki (guzki z jasnym czubkiem). */
  function rozyczki(cx: number, cy: number, R0: number, dojrz: boolean) {
    const pal = dojrz ? [hex('#1e3a26'), hex('#2e5634'), hex('#467a44'), hex('#6a9e58')] : [hex('#24402c'), hex('#2e4e36'), hex('#3c6244'), hex('#507652')];
    for (let j = -Math.ceil(R0); j <= R0; j++) for (let i = -Math.ceil(R0); i <= R0; i++) { const d = Math.hypot(i, j * 1.1); if (d > R0 + 0.3) continue; put(cx + i, cy + j, d > R0 - 0.6 ? OBRYS_LISCIA : pal[1]); }
    for (let k = 0; k < 7; k++) { const a = k * 2.4, rr = k ? R0 * 0.55 : 0, bx = Math.round(cx + Math.cos(a) * rr), by = Math.round(cy + Math.sin(a) * rr * 0.9);
      put(bx, by, pal[2]); put(bx - 1, by - 1, pal[3]); put(bx + 1, by, pal[1]); put(bx, by + 1, pal[0]); }
  }
  /** Dynia: spłaszczona kula z 4–5 bruzdami, połysk z lewej-góry, ciemny dół, ogonek. */
  function dyniaOwoc(cx: number, cy: number, sk: number) {
    const rx = 5.2 * sk, ry = 3.9 * sk;
    cien(Math.round(cx), Math.round(cy), rx);
    for (let j = -Math.ceil(ry); j <= ry; j++) for (let i = -Math.ceil(rx); i <= rx; i++) {
      const e = (i / rx) ** 2 + (j / ry) ** 2; if (e > 1.05) continue;
      if (e > 0.78 && e <= 1.05) { put(cx + i, cy + j, hex('#5a2208')); continue; }
      const seg = Math.abs(Math.sin((i / rx) * Math.PI * 2.2)); // bruzdy
      const l = (-i / rx - j / ry) * 0.9 + 0.1;
      let k = Math.round(2 + l * 1.6); if (seg < 0.22) k -= 2; else if (seg > 0.85 && l > 0) k += 1;
      put(cx + i, cy + j, K.pomar[Math.max(0, Math.min(4, k))]);
    }
    const tx = Math.round(cx + 0.5), ty = Math.round(cy - ry);
    put(tx, ty, hex('#4a5a24')); put(tx, ty - 1, hex('#6a7a30')); put(tx + 1, ty - 2, hex('#6a7a30'));
    put(Math.round(cx - rx * 0.45), Math.round(cy - ry * 0.45), K.pomar[4]); put(Math.round(cx - rx * 0.45) + 1, Math.round(cy - ry * 0.45), hex('#fcd08a'));
  }
  function cien(X: number, Y: number, R0: number) {
    for (let j = -Math.ceil(R0 * 0.6); j <= R0 * 0.6; j++) for (let i = -Math.ceil(R0); i <= R0; i++) { if ((i / R0) ** 2 + (j / (R0 * 0.6)) ** 2 > 1) continue; const xx = X + i + 2 - ox, yy = Y + j + 1 - oy; const c = wez(o, xx, yy); if (c >>> 24) ustaw(o, xx, yy, ciemniej(c)); }
  }
  function roslina(x: number, y: number, h: number, dojrz: boolean) {
    const X = Math.round(x), Y = Math.round(y), w = Math.round(wiatr * (0.5 + h * 0.5));
    const mlode = faza === 'mlode', s = mlode ? 0.5 : 1;
    switch (uprawa) {
      case 'marchewka': { // pierzaste naci, dojrzała: pomarańczowa główka wystaje
        const n = mlode ? 3 : 5;
        for (let i = 0; i < n; i++) { const lx = (i - (n - 1) / 2) * 1.5, hh = Math.round((mlode ? 3 : 6) + hash(X, Y + i, 3) * 3);
          for (let j = 0; j < hh; j++) { const xx = X + lx * (j / hh) * 1.8 + (j > hh - 3 ? w : 0); put(xx, Y - j, j === hh - 1 ? K.liscJasny[4] : K.liscJasny[1 + ((j + i) % 3)]); if (j > 1 && (j + i) % 2 === 0) put(xx + (lx < 0 ? -1 : 1), Y - j, K.liscJasny[2]); } }
        if (dojrz) { for (const [i, j, c] of [[-1, 1, 3], [0, 1, 3], [1, 1, 2], [-1, 2, 2], [0, 2, 2], [1, 2, 1], [0, 3, 1], [-2, 1, 4]] as [number, number, number][]) put(X + i, Y + j, K.pomar[c]); }
        break; }
      case 'salata': case 'kapusta': case 'brokul': {
        const sc = (uprawa === 'kapusta' ? 1.25 : uprawa === 'brokul' ? 1.15 : 0.95) * s * (dojrz ? 1.12 : 1);
        const pal = uprawa === 'salata' ? K.liscJasny : K.liscSiny;
        cien(X, Y, 6 * sc);
        // liście zewnętrzne: 5–6 płatów dookoła, z żyłką i falistym brzegiem
        const nL = uprawa === 'salata' ? 7 : 6;
        for (let k = 0; k < nL; k++) { const a = (k / nL) * Math.PI * 2 + h * 3; lisc(X + Math.cos(a) * 1.5 * sc, Y - 1 + Math.sin(a) * 1.1 * sc, a, 6.2 * sc, 3.3 * sc, pal, uprawa === 'salata'); }
        if (uprawa === 'kapusta' && !mlode) glowa(X, Y - 2, 3.4 * sc, dojrz ? [hex('#7a9a6e'), hex('#9cbc8a'), hex('#c4dcae'), hex('#e2f0cc')] : [K.liscSiny[1], K.liscSiny[2], K.liscSiny[3], K.liscSiny[4]]);
        if (uprawa === 'brokul' && !mlode) rozyczki(X, Y - 2, 3 * sc, dojrz);
        if (uprawa === 'salata') { for (let k = 0; k < 4; k++) { const a = k * 1.7 + h * 5; lisc(X + Math.cos(a) * 0.8, Y - 2 + Math.sin(a) * 0.6, a, 3.6 * sc, 2.4 * sc, K.liscJasny, true); } if (dojrz) { put(X, Y - 3, hex('#d8ec9a')); put(X - 1, Y - 3, hex('#eef7c8')); } }
        break; }
      case 'ziemniak': case 'burak': {
        const R0 = 4.4 * s; cien(X, Y, R0);
        for (let j = -5; j <= 5; j++) for (let i = -6; i <= 6; i++) { const d = Math.hypot(i, j * 1.3); if (d > R0 + 0.5) continue; if (d > R0 - 0.5) { if (hash(X + i, Y + j, 9) < 0.5) put(X + i, Y + j - 1, OBRYS_LISCIA); continue; } if (hash(X + i, Y + j, 9) < 0.12) continue; put(X + i, Y + j - 1, uprawa === 'burak' ? K.lisc[1 + Math.floor(hash(X + i, Y + j, 2) * 3)] : K.lisc[2 + Math.floor(hash(X + i, Y + j, 2) * 3)]); }
        if (uprawa === 'burak') { put(X, Y - 1, K.burak[2]); put(X, Y, K.burak[1]); }
        if (faza === 'kwitnie' && h < 0.4) { put(X, Y - 3, h < 0.2 ? K.kwiaty[2] : K.kwiaty[4]); put(X + 1, Y - 3, K.kwiaty[3]); }
        if (dojrz) { const kol = uprawa === 'ziemniak' ? [hex('#c8a46a'), hex('#a8844e')] : [K.burak[2], K.burak[0]]; put(X - 1, Y + 1, kol[0]); put(X, Y + 1, kol[0]); put(X + 1, Y + 1, kol[1]); put(X, Y + 2, kol[1]); put(X + 2, Y, kol[0]); }
        break; }
      case 'dynia': {
        // pnącze z wąsami i duże klapowane liście
        for (let k = 0; k < 14; k++) { const a = h * 6 + k * 0.45; const xx = X + Math.cos(a) * (2 + k * 0.9), yy = Y + Math.sin(a) * (1 + k * 0.45); put(xx, yy, K.lisc[1]); if (k % 4 === 3) { put(xx + 1, yy - 1, K.liscJasny[2]); put(xx + 2, yy - 1, K.liscJasny[1]); } }
        for (let k = 0; k < 3; k++) { const a = h * 6 + k * 2.1; lisc(X + Math.cos(a) * 6, Y + Math.sin(a) * 3 - 1, a + 1.2, 8, 6, K.lisc, true); }
        if (faza === 'dojrzale' && (dojrz || h < 0.45)) dyniaOwoc(X + 1, Y + 1, dojrz ? 1.5 : 1.1);
        break; }
      case 'kukurydza': case 'slonecznik': { // wysokie łodygi z wiatrem
        const H = Math.round((uprawa === 'kukurydza' ? 27 : 30) * (mlode ? 0.35 : 1) + h * 4), sucha = faza === 'zebrane';
        if (sucha && uprawa === 'kukurydza') { put(X, Y, K.sciern[1]); put(X, Y - 1, K.sciern[2]); break; }
        const lod = faza === 'dojrzale' && uprawa === 'slonecznik' ? K.ziemiaSucha : K.lisc;
        for (let j = 0; j < H; j++) { const xx = X + Math.round((w * j * j) / (H * H)); put(xx, Y - j, lod[2]); if (j > 3 && j % 4 === 0) { put(xx - 1, Y - j + 1, lod[3]); put(xx + 1, Y - j, lod[1]); put(xx - 2, Y - j + 2, lod[2]); put(xx + 2, Y - j + 1, lod[1]); } }
        const tx = X + w, ty = Y - H;
        if (uprawa === 'kukurydza' && !mlode) { put(tx, ty, faza === 'dojrzale' ? K.zloto[3] : K.liscJasny[4]); put(tx - 1, ty + 1, K.zloto[2]); put(tx + 1, ty + 1, K.zloto[2]); if (faza !== 'rosnie') { put(X + 1, Y - Math.round(H * 0.5), K.zloto[3]); put(X + 1, Y - Math.round(H * 0.5) + 1, K.zloto[2]); } }
        if (uprawa === 'slonecznik' && !mlode) { const zolty = faza === 'kwitnie';
          for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) { const d = Math.hypot(i, j); if (d > 3.8) continue; put(tx + i, ty + j, d < 2 ? hex('#4a2e18') : zolty ? K.rzepakZ[2 + ((i + j) & 1)] : hex('#6a4a28')); } }
        break; }
      case 'chmiel': { // pnącze po sznurku do drutu (słupy rysuje chmielSlupy)
        const H = mlode ? 16 : 40;
        for (let j = 0; j < H; j++) { const xx = X + Math.round(Math.sin(j * 0.6 + h * 6) * 1.2); put(xx, Y - j, K.lisc[2 + ((j >> 1) & 1)]); if (!mlode && j > 4 && hash(X, j, 4) < 0.5) { put(xx + 1, Y - j, K.lisc[3]); put(xx - 1, Y - j, K.lisc[1]); } if (faza === 'dojrzale' && j > 6 && hash(X, j, 6) < 0.18) put(xx + 1, Y - j, K.liscJasny[4]); }
        break; }
    }
  }
  function chmielSlupy() {
    for (let v = Math.ceil(vmin / 40) * 40; v < vmax; v += 40) for (let u = Math.ceil(umin / 54) * 54; u < umax; u += 54) {
      const x = u * ux + v * vx, y = u * uy + v * vy; if (!wPasie(x, y) || brzeg(x, y) < MIEDZA + 4) continue;
      for (let j = 0; j < 46; j++) { put(x, y - j, K.slupy[1]); put(x + 1, y - j, K.slupy[0]); }
      for (let k = 1; k < 54; k++) put(x + ux * k, y + uy * k - 46, K.drut); // drut u góry wzdłuż rzędu
    }
  }
  function chmielPusty() { chmielSlupy(); }
  function bele() { // bele słomy na ściernisku
    const R = rng(pas.seed + 77);
    for (let k = 0; k < 40; k++) {
      const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0); if (!wPasie(x, y) || brzeg(x, y) < 12 || R() > 0.35) continue;
      const X = Math.round(x), Y = Math.round(y);
      for (let j = -5; j <= 5; j++) for (let i = -6; i <= 6; i++) { const d = Math.hypot(i / 1.15, j); if (d > 5.4) continue; put(X + i, Y + j, d > 4.7 ? OBRYS : K.slom[Math.max(0, Math.min(3, Math.round(2 - (i + j) / 3 + (hash(X + i, Y + j, 2) - 0.5))))]); }
      for (let i = -3; i <= 3; i++) put(X + i + 2, Y + 4, ciemniej(wez(o, X + i + 2 - ox, Y + 4 - oy) || K.sciern[1]));
      put(X - 1, Y - 1, K.slom[3]); put(X + 1, Y, K.slom[1]);
    }
  }
}
void mieszaj; void jasniej;
