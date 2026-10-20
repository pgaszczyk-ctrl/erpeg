// Draws a modular hero (content/modul.ts): body, then the head moved so its neck point lands on the body's,
// as the artist's README says (dx = round(neck − mount)); skin, hair and clothes recoloured by the masks
// keeping each pixel's brightness. Parts come from four strips in public/postacie/modul/.
import { GLOWY_MODUL, CIALA_MODUL } from '../content/modulDane';
import { SKORY_MODUL, WLOSY_MODUL, UBRANIA_MODUL } from '../content/modul';

/** What the player picked: head id, body id, gender, and colour indices. */
export interface ModulLook {
  g: string;
  c: string;
  p: 'k' | 'm';
  s: number;
  w: number;
  u: number;
  u2: number;
}

const F = 64;
/** Canvas of a whole figure: room for heads moved up/down (the artist's previews use 96×96). */
export const MODUL_W = 64;
export const MODUL_H = 80;
/** Where the body's 64×64 picture goes in the figure (feet all on one row). */
const STOPY_Y = 76;

let parts: Promise<Record<string, ImageData>> | null = null;
function loadParts() {
  parts ??= Promise.all(['glowy', 'glowy_maska', 'ciala', 'ciala_maska'].map((n) => new Promise<[string, ImageData]>((ok, bad) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      ok([n, ctx.getImageData(0, 0, img.width, img.height)]);
    };
    img.onerror = bad;
    img.src = `${import.meta.env.BASE_URL}postacie/modul/${n}.png`;
  }))).then((l) => Object.fromEntries(l));
  return parts;
}

const rint = (n: number) => Math.floor(Math.random() * n);
const pick = <T>(a: T[]) => a[rint(a.length)];

/** A random look of that gender (head and body of that gender, any colours); the skin tone is kept when given. */
export function randomModul(p: 'k' | 'm', s?: number): ModulLook {
  return {
    g: pick(GLOWY_MODUL.filter((h) => h.plec === p)).id,
    c: pick(CIALA_MODUL.filter((b) => b.plec === p)).id,
    p,
    s: s ?? rint(SKORY_MODUL.length),
    w: rint(WLOSY_MODUL.length),
    u: rint(UBRANIA_MODUL.length),
    u2: rint(UBRANIA_MODUL.length),
  };
}

/** A saved look, or null when it is broken. */
export function cleanModul(v: unknown): ModulLook | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const idx = (k: string, n: number) => (typeof o[k] === 'number' && Number.isInteger(o[k]) && (o[k] as number) >= 0 && (o[k] as number) < n ? (o[k] as number) : 0);
  if (!GLOWY_MODUL.some((h) => h.id === o.g) || !CIALA_MODUL.some((b) => b.id === o.c)) return null;
  return { g: o.g as string, c: o.c as string, p: o.p === 'k' ? 'k' : 'm', s: idx('s', SKORY_MODUL.length), w: idx('w', WLOSY_MODUL.length), u: idx('u', UBRANIA_MODUL.length), u2: idx('u2', UBRANIA_MODUL.length) };
}

/** Recolours one pixel: the target colour at the pixel's brightness relative to the part's base colour. */
function tone(d: Uint8ClampedArray, i: number, to: number[], base: number[] | null) {
  const v = Math.max(d[i], d[i + 1], d[i + 2]) / Math.max(1, base ? Math.max(...base) : 255);
  const peak = base ? Math.max(...to) : Math.max(1, ...to);
  for (let c = 0; c < 3; c++) d[i + c] = Math.min(255, Math.round((base ? to[c] : (to[c] / peak) * 255) * v));
}

function part(src: ImageData, mask: ImageData, index: number, look: ModulLook, skinBase: number[] | null, hairBase: number[] | null) {
  const out = new ImageData(F, F);
  const d = out.data;
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
    const s = (y * src.width + index * F + x) * 4;
    const o = (y * F + x) * 4;
    d.set(src.data.subarray(s, s + 4), o);
    if (!d[o + 3] || !mask.data[s + 3]) continue;
    const [r, g, b] = [mask.data[s], mask.data[s + 1], mask.data[s + 2]];
    if (b === 255 && r === 0 && skinBase) tone(d, o, SKORY_MODUL[look.s], skinBase);
    else if (r === 255 && g === 255 && hairBase) tone(d, o, WLOSY_MODUL[look.w], hairBase);
    else if (r === 255) tone(d, o, UBRANIA_MODUL[look.u], null);
    else if (g === 255) tone(d, o, UBRANIA_MODUL[look.u2], null);
  }
  return out;
}

/** The whole figure (MODUL_W × MODUL_H, feet at row STOPY_Y) as a canvas. */
export async function modulCanvas(look: ModulLook): Promise<HTMLCanvasElement> {
  const p = await loadParts();
  const hi = GLOWY_MODUL.findIndex((h) => h.id === look.g);
  const bi = CIALA_MODUL.findIndex((b) => b.id === look.c);
  const h = GLOWY_MODUL[hi], b = CIALA_MODUL[bi];
  const c = document.createElement('canvas');
  c.width = MODUL_W;
  c.height = MODUL_H;
  const ctx = c.getContext('2d')!;
  const tmp = document.createElement('canvas');
  tmp.width = tmp.height = F;
  const t = tmp.getContext('2d')!;
  const by = STOPY_Y - b.stopa - 1;
  t.putImageData(part(p.ciala, p.ciala_maska, bi, look, b.skora, null), 0, 0);
  ctx.drawImage(tmp, 0, by);
  t.clearRect(0, 0, F, F);
  t.putImageData(part(p.glowy, p.glowy_maska, hi, look, h.skora, h.wlosy), 0, 0);
  ctx.drawImage(tmp, Math.round(b.nx - h.mx), by + Math.round(b.ny - h.my));
  return c;
}

/** The hero's modular look: the one picked at creation, else a stable one from the name (same head every time). */
export function modulGracza(look: { modul?: ModulLook }, name: string): ModulLook {
  if (look.modul) return look.modul;
  let h = 2166136261;
  for (const ch of name) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const r = (n: number) => {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    return (h >>> 8) % n;
  };
  const p: 'k' | 'm' = r(2) ? 'k' : 'm';
  const hs = GLOWY_MODUL.filter((x) => x.plec === p), bs = CIALA_MODUL.filter((x) => x.plec === p);
  return { g: hs[r(hs.length)].id, c: bs[r(bs.length)].id, p, s: r(2), w: r(WLOSY_MODUL.length), u: r(UBRANIA_MODUL.length), u2: r(UBRANIA_MODUL.length) };
}

/** Portrait size: the head's 48×48 crop enlarged ×8 blocky, so smooth shrinking in the HUD stays crisp. */
export const PORTRET_PX = 384;
const portrety = new Map<string, Promise<HTMLCanvasElement>>();

/** The head alone (recoloured, no body), centred on the eyes' axis, as a PORTRET_PX square. */
export function modulPortret(look: ModulLook): Promise<HTMLCanvasElement> {
  const key = modulKlucz(look);
  let p = portrety.get(key);
  if (!p) {
    p = loadParts().then((d) => {
      const hi = GLOWY_MODUL.findIndex((h) => h.id === look.g);
      const h = GLOWY_MODUL[hi];
      const tmp = document.createElement('canvas');
      tmp.width = tmp.height = F;
      tmp.getContext('2d')!.putImageData(part(d.glowy, d.glowy_maska, hi, look, h.skora, h.wlosy), 0, 0);
      const c = document.createElement('canvas');
      c.width = c.height = PORTRET_PX;
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      const S = 48, x0 = Math.round(h.mx - S / 2), y0 = 2;
      ctx.drawImage(tmp, x0, y0, S, S, 0, 0, PORTRET_PX, PORTRET_PX);
      return c;
    });
    portrety.set(key, p);
  }
  return p;
}

/** A short key of a look (texture names, caches). */
export function modulKlucz(l: ModulLook) {
  return `${l.g}-${l.c}-${l.p}-${l.s}-${l.w}-${l.u}-${l.u2}`;
}
