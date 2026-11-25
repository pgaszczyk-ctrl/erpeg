// The hero's big figure from the artist's layers (pack 51-G001), recoloured by the game: the grey layers (skin, hair,
// brows) get a colour ramp around the chosen colour, the lips/blush layer a rose from the skin, the clothes and eyes
// stay as drawn. Used by the Kufer's look tab, its daguerreotype, the HUD portrait and dialog portraits.
import type { Look } from '../look';
import { SKORY_51, WLOSY_51, FRYZURY, PODBRODEK_51, PLOTNO_51, type Plec, type Fryzura } from '../content/wygladPostaci';
import { SKORY_MODUL, WLOSY_MODUL } from '../content/modul';

export interface Wyglad { p: Plec; f: string; w: number; s: number }

type Rgb = [number, number, number];
const zHex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** The character's gender (picked once at creation). */
export function plecPostaci(look: Look): Plec {
  return (look.guard3d ?? look.modul?.p) === 'k' ? 'k' : 'm';
}

/** A hairstyle of that gender (an unknown id → the first one). */
export function fryzura(p: Plec, id: string): Fryzura {
  return FRYZURY[p].find((x) => x.id === id) ?? FRYZURY[p][0];
}

function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

const najblizszy = (c: Rgb | undefined, lista: { hex: string }[], zapas: number) => {
  if (!c) return zapas;
  let best = zapas, d0 = Infinity;
  lista.forEach((x, i) => {
    const q = zHex(x.hex);
    const d = (q[0] - c[0]) ** 2 + (q[1] - c[1]) ** 2 + (q[2] - c[2]) ** 2;
    if (d < d0) { d0 = d; best = i; }
  });
  return best;
};

/**
 * The character's editor look: the saved one, else one made from what it had before (older modular looks keep
 * roughly their skin and hair colours), with a hairstyle picked from the name (the same every time).
 */
export function wygladGracza(look: Look, name: string): Wyglad {
  const p = plecPostaci(look);
  if (look.wyg) return { p, f: fryzura(p, look.wyg.f).id, w: look.wyg.w % WLOSY_51.length, s: look.wyg.s % SKORY_51.length };
  const h = hash(name.toLowerCase());
  const m = look.modul;
  return {
    p,
    f: FRYZURY[p][h % FRYZURY[p].length].id,
    w: m ? najblizszy(WLOSY_MODUL[m.w], WLOSY_51, 2) : (h >>> 5) % WLOSY_51.length,
    s: m ? najblizszy(SKORY_MODUL[m.s], SKORY_51, 1) : (h >>> 9) % 4,
  };
}

/** A random look for a new character (any hairstyle, any hair colour but grey, any skin). */
export function losowyWyglad(p: Plec): { f: string; w: number; s: number } {
  const r = (n: number) => Math.floor(Math.random() * n);
  return { f: FRYZURY[p][r(FRYZURY[p].length)].id, w: r(WLOSY_51.length - 1), s: r(SKORY_51.length) };
}

export const kluczWygladu = (w: Wyglad) => `${w.p}-${w.f}-${w.w}-${w.s}`;

// ---------------------------------------------------------------- layers
const obrazy = new Map<string, Promise<HTMLImageElement | null>>();
function obraz(p: Plec, nazwa: string): Promise<HTMLImageElement | null> {
  const url = `${import.meta.env.BASE_URL || '/'}postacie/edytor/${p}/${nazwa}.webp`;
  let o = obrazy.get(url);
  if (!o) {
    o = new Promise((ok) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => ok(img);
      img.onerror = () => { obrazy.delete(url); ok(null); };
      img.src = url;
    });
    obrazy.set(url, o);
  }
  return o;
}

/** Median grey of a layer's solid pixels (the „usual” tone the chosen colour goes to). */
const mediany = new Map<HTMLImageElement, number>();
function mediana(img: HTMLImageElement, d: Uint8ClampedArray) {
  let m = mediany.get(img);
  if (m !== undefined) return m;
  const hist = new Uint32Array(256);
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) { hist[d[i]]++; n++; }
  let acc = 0;
  m = 128;
  for (let g = 0; g < 256; g++) { acc += hist[g]; if (acc >= n / 2) { m = g; break; } }
  mediany.set(img, m);
  return m;
}

/**
 * A colour ramp for a grey layer: the median grey gets the chosen colour, darker greys a deeper, more saturated
 * version (each channel raised to a power, so shadows stay warm), lighter greys a lighter one; the darkest greys
 * (the artist's outline) go to the ink colour.
 */
function rampa(B: Rgb, ref: number): Uint8ClampedArray {
  const K = [0.12, 0.1, 0.14];
  const b = B.map((v) => Math.max(0.02, v / 255));
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    for (let c = 0; c < 3; c++) {
      let v = t < ref ? b[c] ** (1 + (2.2 * (ref - t)) / ref) : b[c] ** (1 - (0.75 * (t - ref)) / (1 - ref));
      if (t < 0.14) v = K[c] + (v - K[c]) * (t / 0.14);
      lut[i * 3 + c] = v * 255;
    }
  }
  return lut;
}

let robocze: HTMLCanvasElement | null = null;
function narysuj(ctx: CanvasRenderingContext2D, img: HTMLImageElement, kolor?: { B: Rgb; refMnoznik?: number; roz?: boolean }) {
  if (!kolor) { ctx.drawImage(img, 0, 0); return; }
  robocze ??= document.createElement('canvas');
  robocze.width = PLOTNO_51.w;
  robocze.height = PLOTNO_51.h;
  const r = robocze.getContext('2d', { willReadFrequently: true })!;
  r.clearRect(0, 0, robocze.width, robocze.height);
  r.drawImage(img, 0, 0);
  const id = r.getImageData(0, 0, robocze.width, robocze.height);
  const d = id.data;
  if (kolor.roz) {
    // lips and blush: the layer's grey shades a rose made from the skin
    const [R, G, Bb] = kolor.B;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const k = 0.55 + (0.6 * d[i]) / 255;
      d[i] = R * k; d[i + 1] = G * k; d[i + 2] = Bb * k;
    }
  } else {
    const lut = rampa(kolor.B, Math.min(0.95, Math.max(0.05, (mediana(img, d) / 255) * (kolor.refMnoznik ?? 1))));
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const g = d[i] * 3;
      d[i] = lut[g]; d[i + 1] = lut[g + 1]; d[i + 2] = lut[g + 2];
    }
  }
  r.putImageData(id, 0, 0);
  ctx.drawImage(robocze, 0, 0);
}

const postacie = new Map<string, Promise<HTMLCanvasElement | null>>();

/** The whole figure (768 × 1152, transparent background); null when the pictures couldn't be loaded. */
export function zlozPostac(w: Wyglad): Promise<HTMLCanvasElement | null> {
  const key = kluczWygladu(w);
  let p = postacie.get(key);
  if (p) {
    postacie.delete(key);
    postacie.set(key, p);
    return p;
  }
  p = (async () => {
    const fr = fryzura(w.p, w.f);
    const [tyl, skora, stroj, twarz, usta, brwi, przod] = await Promise.all([
      fr.tyl ? obraz(w.p, `wlosy_tyl_${fr.id}`) : Promise.resolve(null),
      obraz(w.p, 'skora'), obraz(w.p, 'stroj'), obraz(w.p, 'twarz'), obraz(w.p, 'usta_policzki'), obraz(w.p, 'brwi'),
      obraz(w.p, `wlosy_przod_${fr.id}`),
    ]);
    if (!skora || !stroj || !twarz) return null;
    const c = document.createElement('canvas');
    c.width = PLOTNO_51.w;
    c.height = PLOTNO_51.h;
    const ctx = c.getContext('2d')!;
    const S = zHex(SKORY_51[w.s % SKORY_51.length].hex), H = zHex(WLOSY_51[w.w % WLOSY_51.length].hex);
    if (tyl) narysuj(ctx, tyl, { B: H });
    narysuj(ctx, skora, { B: S, refMnoznik: 0.9 });
    narysuj(ctx, stroj);
    narysuj(ctx, twarz);
    if (usta) narysuj(ctx, usta, { B: [S[0] * 0.55 + 199 * 0.45, S[1] * 0.55 + 92 * 0.45, S[2] * 0.55 + 87 * 0.45], roz: true });
    if (brwi) narysuj(ctx, brwi, { B: [H[0] * 0.45, H[1] * 0.45, H[2] * 0.45] });
    if (przod) narysuj(ctx, przod, { B: H });
    return c;
  })();
  postacie.set(key, p);
  // keep a few figures (each is ~3.5 MB of pixels)
  while (postacie.size > 6) postacie.delete(postacie.keys().next().value!);
  p.then((c) => { if (!c) postacie.delete(key); });
  return p;
}

/** Portrait size (HUD and dialog medallions). */
export const PORTRET_POSTACI_PX = 384;
const portrety = new Map<string, Promise<HTMLCanvasElement | null>>();

/** The head and shoulders as a square (the artist's portrait point). */
export function portretPostaci(w: Wyglad): Promise<HTMLCanvasElement | null> {
  const key = kluczWygladu(w);
  let p = portrety.get(key);
  if (!p) {
    p = zlozPostac(w).then((cala) => {
      if (!cala) return null;
      // Owner, 25 Nov 2026: the face with all its hair fills the whole window (no dark margin round a small head).
      // The square spans from the top of the hair to just under the chin, or the head's full width if wider.
      const broda = PODBRODEK_51[w.p];
      const d = cala.getContext('2d')!.getImageData(0, 0, cala.width, broda).data;
      let gora = broda, lewo = cala.width, prawo = 0;
      for (let y = 0; y < broda; y++) {
        for (let x = 0; x < cala.width; x++) {
          if (d[(y * cala.width + x) * 4 + 3] < 128) continue;
          if (y < gora) gora = y;
          if (x < lewo) lewo = x;
          if (x > prawo) prawo = x;
        }
      }
      if (prawo <= lewo) { lewo = 0; prawo = cala.width; gora = 0; }
      const bok = Math.max(broda - gora, prawo - lewo + 1) * 1.04;
      const sx = (lewo + prawo) / 2 - bok / 2, sy = (gora + broda) / 2 - bok / 2;
      const c = document.createElement('canvas');
      c.width = c.height = PORTRET_POSTACI_PX;
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(cala, sx, sy, bok, bok, 0, 0, PORTRET_POSTACI_PX, PORTRET_POSTACI_PX);
      return c;
    });
    portrety.set(key, p);
    p.then((c) => { if (!c) portrety.delete(key); });
  }
  return p;
}
