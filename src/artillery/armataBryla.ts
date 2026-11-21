// Bryła obrotowej armaty pasażerskiej rysowanej kodem (właściciel, 21 Nov 2026: „przerób armaty własnym generatorem, też
// obrotowe – te od grafika nie współgrają z resztą świata”). Bryła z prostych kształtów (src/gen/bryly.ts) w rzucie
// budynków: kamienna podstawa z mosiężną obręczą, obrotnica, żeliwne łoże, miedziany kocioł i mosiężna lufa pod kątem,
// schodki od zachodu, siatka do łapania od wschodu. Piksel płótna = piksel świata (pół piksela mapy), obrys jak
// u budynków, cień na południowy wschód. Animacje w kodzie: obrót wieży, odrzut lufy z błyskiem i dymem przy strzale,
// ugięcie siatki przy łapaniu. Model grafika (public/modele/armata_C.glb) zostaje w plikach, nieużywany.
import { SKALA_POSTACI } from '../skala';
import { Bryly, rasteruj, wpisz, hex, add, sub, mul, norm, cross, len, rzut, type V, type Wzor } from '../gen/bryly';

export const ARMATA_3D = {
  /** Rozmiar: piksele świata na jednostkę rysunku (1.1 ≈ lufa sięga ~2 wysokości bohatera). */
  skala: 1.1,
  /** Piksele płótna na piksel mapy (piksel świata = pół piksela mapy). */
  gestosc: 2,
  /** Kąt podniesienia lufy (stopnie). */
  podniesienie: 32,
  /** Czas obrotu wieży do celu (s). */
  obrot: 0.65,
  /** Chwila wylotu pasażera po strzale (s). */
  wylot: 0.12,
  klatekNaS: 24,
  /** Cień na ziemi na południowy wschód, jak u budynków (alfa, skos i skrót na jednostkę wysokości). */
  cien: { alfa: 0.5, kolor: '#14121a', wSkos: 0.75, wDol: 0.45 },
  /** Siatka: zwykłe ugięcie i podskok przy łapaniu (px świata przed skalą). */
  siatka: { ugiecie: 3.5, podskok: 6, czas: 0.9 },
  /** Odrzut lufy (px świata przed skalą) i jego czasy (s). */
  odrzut: { px: 6, w: 0.07, powrot: 0.55 },
};

/** Rozmiar płótna i miejsce podstawy na nim (px świata). */
export const P = { w: 200, h: 156, ox: 100, oy: 114 };

const pal = (...c: string[]) => c.map(hex);
const KAMIEN = pal('#38383e', '#68686e', '#949098', '#b4aea8', '#c6c2c6');
const MOSIADZ = pal('#4a3216', '#9a6420', '#c8963e', '#e9c56a', '#f2d888');
const ZELAZO = pal('#1e1b20', '#2a2a2e', '#46464c', '#68686e', '#949098');
const MIEDZ = pal('#3a1e1a', '#6e362c', '#ad5036', '#c86a44', '#d98a58');
const LINA = pal('#523c2a', '#866648', '#b89468', '#cdbd9c', '#e0d4b6');
const DREWNO = pal('#3e2a1c', '#563724', '#6a4426', '#8a613f', '#a57a52');
const OGIEN = pal('#ad5036', '#d98a58', '#f0c850', '#fbe58a', '#fff6c8');
const LUFA_W = hex('#141216');


export interface StanArmaty {
  /** Kierunek wieży na mapie (radiany, atan2(dy, dx)). */
  kat: number;
  /** Cofnięcie lufy (px świata przed skalą). */
  odrzut: number;
  /** Błysk z wylotu 0..1. */
  blysk: number;
  /** Ugięcie środka siatki (px świata przed skalą). */
  ugiecie: number;
}

/** Wszystkie ściany armaty w danym stanie (jednostki = px świata przed skalą; skalowane na końcu). */
export function bryla(st: StanArmaty): Bryly {
  const S = ARMATA_3D.skala;
  const b = new Bryly();
  const q = (v: V): V => mul(v, S);
  const kamienBok: Wzor = (s, t, k) => {
    const rz = Math.floor(t / (3 * S));
    const spoina = t % (3 * S) < 1 || (s + (rz % 2) * 5 * S) % (10 * S) < 1;
    return KAMIEN[Math.max(0, k - (spoina ? 1 : 0))];
  };
  const nity = (pl: number[], co: number): Wzor => (s, t, k) => (s % (co * S) < 1 && t > 1 && t < 2.2 ? pl[Math.min(4, k + 1)] : pl[k]);

  // 1. Kamienna podstawa z mosiężną obręczą na wierzchu i płytami.
  const R = 24;
  b.walec(q([0, 0, 0]), q([0, 0, 7]), R * S, R * S, 20, kamienBok, null, (_s, _t, k, p) => {
    const r = Math.hypot(p[0], p[1]);
    if (r > (R - 2) * S) return MOSIADZ[k];
    const spoina = (((p[0] / S) % 7) + 7) % 7 < 0.8 || (((p[1] / S) % 7) + 7) % 7 < 0.8;
    return KAMIEN[Math.min(4, k + (spoina ? 0 : 1))];
  });
  // Schodki od zachodu (kamień, drewniane stopnie).
  for (let i = 0; i < 3; i++) {
    const hz = ((i + 1) * 7) / 3;
    b.box(q([-36 + i * 4, -6, 0]), q([14 - i * 4, 0, 0]), q([0, 12, 0]), q([0, 0, hz]), (bok) =>
      bok === 'z1' ? (s, _t, k) => (s % (2 * S) < 0.8 ? DREWNO[k - 1] : DREWNO[k]) : kamienBok);
  }
  // Obrotnica (mosiądz z nitami).
  b.walec(q([0, 0, 7]), q([0, 0, 3]), 16 * S, 16 * S, 16, nity(MOSIADZ, 6), null, (_s, _t, k, p) => {
    const r = Math.hypot(p[0], p[1]) / S;
    return r > 14.6 ? MOSIADZ[k] : r < 4 ? MOSIADZ[Math.max(0, k - 1)] : ZELAZO[Math.min(4, k + (Math.floor(r) % 4 === 0 ? 1 : 0))];
  });

  // 2. Wieża (obraca się): łoże, oś, kocioł, lufa.
  const d: V = [Math.cos(st.kat), Math.sin(st.kat), 0];
  const sd: V = [-Math.sin(st.kat), Math.cos(st.kat), 0];
  const e = (ARMATA_3D.podniesienie * Math.PI) / 180;
  const u: V = [Math.cos(e) * d[0], Math.cos(e) * d[1], Math.sin(e)];
  const piv: V = [0, 0, 22];
  for (const strona of [-1, 1]) {
    const o = add(add(mul(sd, strona * 9 - 1.5), mul(d, -9)), [0, 0, 10]);
    b.box(q(o), q(mul(d, 17)), q(mul(sd, 3)), q([0, 0, 14]), (bok) =>
      bok === 'z1' ? (_s, _t, k) => ZELAZO[Math.min(4, k + 1)] : (s, t, k) => ((s + 2) % (5 * S) < 1 && t % (5 * S) < 1 ? MOSIADZ[3] : ZELAZO[k]));
  }
  b.walec(q(add(piv, mul(sd, -11))), q(mul(sd, 22)), 2 * S, 2 * S, 8, (_s, _t, k) => ZELAZO[k], (_s, _t, k) => MOSIADZ[k], (_s, _t, k) => MOSIADZ[k]);

  const cof = mul(u, -st.odrzut);
  const p0 = add(piv, cof);
  // Miedziany kocioł z mosiężnymi obręczami i kopułką z tyłu.
  const tyl = add(p0, mul(u, -12));
  b.walec(q(tyl), q(mul(u, 12)), 8.5 * S, 8.5 * S, 16, (_s, t, k) => (t % (5 * S) < 1.4 ? MOSIADZ[k] : MIEDZ[k]), (_s, _t, k) => MOSIADZ[k], null);
  b.walec(q(add(tyl, mul(u, -2.5))), q(mul(u, 2.5)), 5 * S, 7 * S, 12, (_s, _t, k) => MOSIADZ[k], (_s, _t, k) => MOSIADZ[Math.min(4, k + 1)], null);
  // Zawór parowy na grzbiecie kotła.
  const grzbiet = add(add(p0, mul(u, -6)), mul(norm(cross(sd, u)), 8));
  b.walec(q(grzbiet), q(mul(norm(cross(sd, u)), 4)), 1.4 * S, 1.4 * S, 6, (_s, _t, k) => MIEDZ[k], null, (_s, _t, k) => MOSIADZ[k]);
  // Lufa (mosiądz, żeliwne obręcze) i pierścień wylotu z ciemnym otworem.
  const dl = 36;
  b.walec(q(p0), q(mul(u, dl)), 6.5 * S, 5.6 * S, 16, (_s, t, k) => {
    const w = t / S;
    return (w > 9 && w < 11) || (w > 24 && w < 26) ? ZELAZO[k] : MOSIADZ[k];
  });
  const wylot = add(p0, mul(u, dl));
  b.walec(q(wylot), q(mul(u, 3)), 7.5 * S, 7.5 * S, 16, (_s, _t, k) => ZELAZO[k], null, (_s, _t, k, p) =>
    len(sub(p, q(add(wylot, mul(u, 3))))) < 4.6 * S ? LUFA_W : ZELAZO[k]);
  // Błysk przy strzale (bez obrysu, widoczny z każdej strony).
  if (st.blysk > 0) {
    const dlB = 4 + 12 * st.blysk;
    b.walec(q(add(wylot, mul(u, 3))), q(mul(u, dlB)), 4.5 * S, (3 + 8 * st.blysk) * S, 10,
      (_s, t) => OGIEN[Math.max(0, 4 - Math.floor((t / (dlB * S)) * 5))], null, null, { oba: true, bezObrysu: true });
  }

  // 3. Siatka do łapania od wschodu: cztery słupki i lina w kratkę, ugięta w środku.
  const SX0 = 27, SX1 = 51, SY = 10, ZS = 11;
  for (const [x, y] of [[SX0, -SY], [SX1, -SY], [SX0, SY], [SX1, SY]])
    b.walec(q([x, y, 0]), q([0, 0, ZS + 1]), 1.4 * S, 1.4 * S, 6, (_s, _t, k) => ZELAZO[k], null, (_s, _t, k) => MOSIADZ[k]);
  const zS = (x: number, y: number) => ZS - st.ugiecie * (1 - ((x - (SX0 + SX1) / 2) / ((SX1 - SX0) / 2)) ** 2) * (1 - (y / SY) ** 2);
  const N = 6;
  const oczko = 3.4;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const xa = SX0 + ((SX1 - SX0) * i) / N, xb = SX0 + ((SX1 - SX0) * (i + 1)) / N;
    const ya = -SY + (2 * SY * j) / N, yb = -SY + (2 * SY * (j + 1)) / N;
    const pa: V = [xa, ya, zS(xa, ya)], pb: V = [xb, ya, zS(xb, ya)], pc: V = [xa, yb, zS(xa, yb)];
    const e1 = sub(pb, pa), e2 = sub(pc, pa);
    let n = norm(cross(e1, e2));
    if (n[2] < 0) n = mul(n, -1);
    b.quad(q(pa), q(e1), q(e2), n, (_s, _t, k, p) => {
      const x = p[0] / S - SX0, y = p[1] / S + SY;
      const brzeg = x < 1 || x > SX1 - SX0 - 1 || y < 1 || y > 2 * SY - 1;
      return brzeg ? LINA[Math.max(0, k - 1)] : x % oczko < 0.9 || y % oczko < 0.9 ? LINA[k] : null;
    }, { oba: true });
  }
  return b;
}

/** Siatka i miejsce wyjścia jako przesunięcia na mapie od podstawy (siatka zawsze od wschodu). */
export function punktySiatki() {
  const S = ARMATA_3D.skala, z = 11 - ARMATA_3D.siatka.ugiecie;
  const [sx, sy] = rzut([39 * S, 0, z * S]);
  return {
    siatka: { dx: sx / ARMATA_3D.gestosc, dy: sy / ARMATA_3D.gestosc },
    wyjscie: { dx: (55 * S) / ARMATA_3D.gestosc, dy: (8 * S) / ARMATA_3D.gestosc },
  };
}

/** Wysokość bohatera w mapie (do porównań w testach). */
export const wysokoscBohatera = () => 56 * 0.36 * SKALA_POSTACI;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Kłąb dymu: pikselowe kółko z szachownicą (przezroczystość bez rozmycia), jaśniejsze w środku. */
export function klab(img: ImageData, cx: number, cy: number, r: number, gestosc: number) {
  const jas = [0xc6, 0xc2, 0xc6], cie = [0x94, 0x90, 0x98];
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
    if (d > 1 || gestosc * 16 * (1.15 - d * 0.6) < BAYER[(y & 3) * 4 + (x & 3)]) continue;
    const c = d > 0.72 ? cie : jas, o = (y * img.width + x) * 4;
    img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
  }
}

/** Podgląd bez gry (scripts): obraz armaty w danym stanie do ImageData. */
export function obrazArmaty(st: Partial<StanArmaty> = {}, img?: ImageData) {
  const s: StanArmaty = { kat: Math.PI / 4, odrzut: 0, blysk: 0, ugiecie: ARMATA_3D.siatka.ugiecie, ...st };
  const out = img ?? new ImageData(P.w, P.h);
  wpisz(out, 0, P.w, P.h, rasteruj(bryla(s).sciany, P.w, P.h, P.ox, P.oy));
  return { img: out, ox: P.ox, oy: P.oy };
}
