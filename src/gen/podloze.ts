// Podłoże liczone piksel po pikselu we współrzędnych ŚWIATA (px obrazu = 0,5 px mapy),
// więc sąsiednie kawałki mapy łączą się bez szwów i nic nie trzeba wczytywać.
import { Obraz, hex, hash, szum, bayer, ciemniej } from './wspolne';

export type Rodzaj =
  | 'trawa' | 'laka' | 'park' | 'las_lisciasty' | 'las_iglasty' | 'bruk' | 'chodnik' | 'plac' | 'droga'
  | 'piasek' | 'woda' | 'pole_orka' | 'pole_zboze' | 'zarosla' | 'parking' | 'cmentarz' | 'mokradlo' | 'skala' | 'tory';

const P = (a: string[]) => a.map(hex);
const T = {
  trawa: P(['#3f6a2e', '#4a7433', '#558039', '#628d40', '#70994a', '#80a552']),
  trawa_blysk: P(['#93b75a', '#a4c264', '#2f5426']),
  laka: P(['#5a8238', '#6a9441', '#7ba54b', '#93b75a']),
  park: P(['#3a6229', '#456f33', '#507b38', '#5c873e', '#678f44', '#75994c']),
  liscie: P(['#3b4f2a', '#46592d', '#566233', '#6b5a34', '#7d6538']),
  igly: P(['#3d3d26', '#4a4529', '#5a4c2c', '#6b5530', '#45552e']),
  bruk: P(['#5b5560', '#6e6872', '#807a83', '#938d94', '#3a3540']),
  chodnik: P(['#857e71', '#948d80', '#a19a8b', '#aea797', '#6a6358', '#5f6a3e', '#bab3a2']),
  plac: P(['#a08e74', '#b09d81', '#bfac8f', '#7a6a55']),
  droga: P(['#866744', '#98784e', '#ab8a5a', '#bf9c68', '#d3bb88', '#6a4f35']),
  piasek: P(['#b39b69', '#c7ae7b', '#d6bf8d', '#a28a5c']),
  woda: P(['#25506a', '#2e6380', '#3b7892', '#4a8aa2']),
  orka: P(['#5e4430', '#6d5038', '#7d5d41', '#4c3627']),
  zboze: P(['#b89a4c', '#c9ab58', '#d8bc68', '#9c8240']),
  zarosla: P(['#34502a', '#3f5f2e', '#4c6d34', '#2a4224']),
  parking: P(['#55525a', '#605d65', '#6b6870', '#d8d4c8']),
  skala: P(['#6c6870', '#7f7a80', '#948f92', '#55515a']),
  mokradlo: P(['#3d5a34', '#4a6a3a', '#3a6070', '#566f40']),
};

const pick = (t: number[], v: number) => t[Math.max(0, Math.min(t.length - 1, Math.floor(v * t.length)))];

/**
 * Chodnik z płyt, ale NIE równy: rzędy ok. 12–14 px z przesunięciem, płyty różnej szerokości (10–20 px),
 * każda płyta w innym odcieniu i lekko „przechylona” (jasna górna krawędź, ciemna dolna), część pęknięta,
 * część zapadnięta (ciemniejsza), wyszczerbione narożniki, mech i trawa w fugach.
 */
function chodnik(x: number, y: number, n1: number, n2: number, h: number): number {
  const C = T.chodnik;
  const rz = Math.floor(y / 13), yr = y - rz * 13;
  const szer = 10 + Math.floor(hash(rz, 0, 51) * 11), off = Math.floor(hash(rz, 1, 51) * szer);
  const kol = Math.floor((x + off) / szer), xr = (x + off) - kol * szer;
  const id = hash(kol, rz, 52), id2 = hash(kol, rz, 53);
  const sz = szer - 1 - (id2 < 0.3 ? 1 : 0);          // fuga czasem szersza
  const yb = 12 - (id < 0.25 ? 1 : 0);                 // płyta czasem niższa (krzywa fuga)
  const fuga = xr >= sz || yr >= yb;
  if (fuga) return h < 0.18 ? C[5] : h < 0.24 ? T.trawa[1] : C[4];
  // wyszczerbiony narożnik
  if (id2 > 0.82 && ((xr === 0 && yr === 0) || (xr <= 1 && yr === 0 && id2 > 0.93))) return C[4];
  let t = id * 0.55 + n2 * 0.25 + n1 * 0.2;
  if (id2 > 0.9) t -= 0.35;                            // zapadnięta, ciemniejsza
  let c = pick(C.slice(0, 4), t);
  if (yr === 0 || xr === 0) c = id2 > 0.9 ? C[0] : C[6];           // jasna górna/lewa krawędź
  else if (yr === yb - 1 || xr === sz - 1) c = C[Math.max(0, Math.floor(t * 4) - 1)]; // ciemniejsza dolna/prawa
  // pęknięcie po skosie
  if (id > 0.86 && Math.abs(xr - Math.round((yr * sz) / yb * (id2 < 0.5 ? 1 : -1) + (id2 < 0.5 ? 0 : sz))) < 1 && hash(x, y, 54) < 0.8) c = C[4];
  if (h > 0.985) c = C[4];                             // drobne plamki
  return c;
}

/** Rodzaj z postrzępioną granicą (ten sam rozrzut co w malujPodloze – używają go też brzegi wody). */
export function rodzajPostrzepiony(rodzajW: (x: number, y: number) => Rodzaj | null, x: number, y: number): Rodzaj | null {
  const jx = Math.round((hash(x, y, 31) - 0.5) * 3), jy = Math.round((hash(x, y, 32) - 0.5) * 3);
  return rodzajW(x + jx, y + jy) ?? rodzajW(x, y);
}

/** Kolor podłoża danego rodzaju w punkcie świata (x, y). */
export function kolorPodloza(r: Rodzaj, x: number, y: number): number {
  const n1 = szum(x / 9, y / 9), n2 = szum(x / 3.3 + 20, y / 3.3 + 7), h = hash(x, y, 1);
  const mix = n1 * 0.55 + n2 * 0.35 + h * 0.25 - 0.08;
  switch (r) {
    case 'trawa': case 'park': { // duże plamy jaśniejszej/ciemniejszej trawy + drobna faktura + pojedyncze błyski i cienie
      const duze = szum(x / 46 + 5, y / 46 + 9) - 0.5, t = mix * 0.85 + 0.12 + duze * 0.55;
      if (h < 0.012) return T.trawa_blysk[hash(x, y, 6) < 0.5 ? 0 : 1];
      if (h > 0.992) return T.trawa_blysk[2];
      return pick(r === 'park' ? T.park : T.trawa, t);
    }
    case 'laka': { const c = pick(T.laka, mix); return h < 0.006 ? hex(['#e8d06a', '#e6e6e6', '#d97aa0', '#8aa6e0'][Math.floor(hash(x, y, 2) * 4)]) : c; }
    case 'las_lisciasty': return h < 0.05 ? T.liscie[3 + (h < 0.025 ? 1 : 0)] : pick(T.liscie.slice(0, 3), mix);
    case 'las_iglasty': return h < 0.04 ? T.igly[4] : pick(T.igly.slice(0, 4), mix);
    case 'zarosla': return pick(T.zarosla, mix);
    case 'bruk': { // kamienie ok. 5×4 px, co drugi rząd przesunięty
      const ry = Math.floor(y / 4), ox = (ry & 1) * 2, rx = Math.floor((x + ox) / 5);
      if ((y & 3) === 3 || ((x + ox) % 5) === 4) return T.bruk[4];
      const t = hash(rx, ry, 3) * 0.7 + n1 * 0.3;
      return ((x + ox) % 5 === 0 || (y & 3) === 0) && t > 0.4 ? T.bruk[3] : pick(T.bruk.slice(0, 3), t);
    }
    case 'chodnik': return chodnik(x, y, n1, n2, h);
    case 'plac': { const ry = Math.floor(y / 16), ox = (ry & 1) * 12;
      if (y % 16 === 15 || (x + ox) % 24 === 23) return T.plac[3];
      return pick(T.plac.slice(0, 3), hash(Math.floor((x + ox) / 24), ry, 5) * 0.6 + n2 * 0.4); }
    case 'droga': { if (h < 0.02) return T.droga[4]; if (h > 0.985) return T.droga[5]; return pick(T.droga.slice(0, 4), n1 * 0.6 + n2 * 0.5 - 0.05); }
    case 'piasek': return pick(T.piasek.slice(0, 3), n1 * 0.5 + 0.25 + Math.sin((x + y * 0.3) * 0.5 + n1 * 6) * 0.12);
    case 'woda': { const t = n1 * 0.7 + szum(x / 30, y / 30) * 0.5 - 0.2; return ((y + Math.floor(n1 * 7)) % 6 === 0 && h < 0.4) ? T.woda[3] : pick(T.woda.slice(0, 3), t); }
    case 'pole_orka': return (y % 4 === 0) ? T.orka[3] : pick(T.orka.slice(0, 3), n2 * 0.6 + h * 0.4);
    case 'pole_zboze': return (y % 3 === 0 && h < 0.5) ? T.zboze[3] : pick(T.zboze.slice(0, 3), n2 * 0.6 + h * 0.4);
    case 'parking': return ((x % 24) === 0 && (y % 40) < 28) ? T.parking[3] : pick(T.parking.slice(0, 3), mix);
    case 'cmentarz': return pick(T.park, mix * 0.8);
    case 'mokradlo': return n1 > 0.62 ? T.mokradlo[2] : pick([T.mokradlo[0], T.mokradlo[1], T.mokradlo[3]], mix);
    case 'skala': return pick(T.skala, n1 * 0.6 + n2 * 0.6 - 0.1);
    case 'tory': return pick([hex('#6c6660'), hex('#7c756d'), hex('#8c847a'), hex('#5a544e')], h * 0.7 + n2 * 0.3);
  }
}

/**
 * Maluje prostokąt świata (x0, y0, w, h) do obrazu, biorąc rodzaj z funkcji `rodzajW(x, y)`.
 * Granice rodzajów są postrzępione (próbkowanie z przesunięciem ±1–2 px z hasha) – bez pasków krawędzi od grafika.
 * `rodzajW` w grze: odczyt z płótna „mapy rodzajów” (obszary OSM wypełnione kolorami-identyfikatorami, bez wygładzania).
 */
export function malujPodloze(o: Obraz, x0: number, y0: number, rodzajW: (x: number, y: number) => Rodzaj | null, cien?: Uint8Array) {
  for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) {
    const x = x0 + i, y = y0 + j;
    const r = rodzajPostrzepiony(rodzajW, x, y);
    if (!r) continue;
    let c = kolorPodloza(r, x, y);
    if (cien && cien[j * o.w + i]) c = ciemniej(c);
    o.px[j * o.w + i] = c;
  }
}

/** Ciemniejszy pasek wzdłuż granicy trawy z drogą (krawężnik ziemi): wywołać po malujPodloze. */
export function obwodka(o: Obraz, x0: number, y0: number, rodzajW: (x: number, y: number) => Rodzaj | null, z: Rodzaj, przy: Rodzaj[]) {
  for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) {
    const x = x0 + i, y = y0 + j;
    if (rodzajW(x, y) !== z) continue;
    let blisko = false;
    for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) { const r = rodzajW(x + dx, y + dy); if (r && przy.includes(r)) blisko = true; }
    if (blisko && bayer(x, y) < 0.7) o.px[j * o.w + i] = ciemniej(o.px[j * o.w + i]) ;
  }
}
