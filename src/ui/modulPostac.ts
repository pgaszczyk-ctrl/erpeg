// Modular heroes (artist pack „postacie modułowe v6.1”): for every row (front / left profile / back) and
// column (step A / standing / step B) the body is drawn, then the head moved so its mount point lands on the
// body's neck (dx = round(neck − mount), as the artist's README says). Skin, hair and clothes are recoloured by
// the artist's masks, keeping each pixel's brightness relative to its material's reference colour.
// Parts: four strips in public/postacie/modul/ (20 sheets of 192×192 side by side), data in content/modulDane.ts.
import { POSTACIE_MODUL, type Wzorzec } from '../content/modulDane';
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
/** The artist's feet end at row 61; the game's sheets stand on row 62 (STOPY_PX), so everything goes 2 px down. */
const DOL = 2;
export const MODUL_W = F;
export const MODUL_H = F;
export const PLIKI_MODUL = ['glowy', 'glowy_maska', 'ciala', 'ciala_maska'] as const;
type Czesci = Record<(typeof PLIKI_MODUL)[number], ImageData>;

const sciezka = (n: string) => `${import.meta.env.BASE_URL}postacie/modul/${n}.png`;
/** The strips' URLs (BootScene preloads them on the test server so the hero can be made at once). */
export const modulPlik = sciezka;

let czesci: Czesci | null = null;
let ladowanie: Promise<Czesci> | null = null;

function piksele(img: CanvasImageSource & { width: number; height: number }) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}

/** Gives the parts already loaded elsewhere (BootScene's images), so sheets can be made without waiting. */
export function modulZObrazow(obrazy: Record<string, (CanvasImageSource & { width: number; height: number }) | undefined>) {
  if (czesci) return true;
  if (PLIKI_MODUL.some((n) => !obrazy[n] || !obrazy[n]!.width)) return false;
  czesci = Object.fromEntries(PLIKI_MODUL.map((n) => [n, piksele(obrazy[n]!)])) as Czesci;
  return true;
}

function wczytaj(): Promise<Czesci> {
  if (czesci) return Promise.resolve(czesci);
  ladowanie ??= Promise.all(PLIKI_MODUL.map((n) => new Promise<[string, ImageData]>((ok, bad) => {
    const img = new Image();
    img.onload = () => ok([n, piksele(img)]);
    img.onerror = bad;
    img.src = sciezka(n);
  }))).then((l) => (czesci = Object.fromEntries(l) as Czesci));
  return ladowanie;
}

const rint = (n: number) => Math.floor(Math.random() * n);
const pick = <T>(a: T[]) => a[rint(a.length)];

/** A random look of that gender (head and body of that gender, any colours); the skin tone is kept when given. */
export function randomModul(p: 'k' | 'm', s?: number): ModulLook {
  const ci = POSTACIE_MODUL.filter((x) => x.plec === p);
  return { g: pick(ci).id, c: pick(ci).id, p, s: s ?? rint(SKORY_MODUL.length), w: rint(WLOSY_MODUL.length), u: rint(UBRANIA_MODUL.length), u2: rint(UBRANIA_MODUL.length) };
}

/** A saved look, or null when it is broken. */
export function cleanModul(v: unknown): ModulLook | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const idx = (k: string, n: number) => (typeof o[k] === 'number' && Number.isInteger(o[k]) && (o[k] as number) >= 0 && (o[k] as number) < n ? (o[k] as number) : 0);
  if (!POSTACIE_MODUL.some((h) => h.id === o.g) || !POSTACIE_MODUL.some((b) => b.id === o.c)) return null;
  return { g: o.g as string, c: o.c as string, p: o.p === 'k' ? 'k' : 'm', s: idx('s', SKORY_MODUL.length), w: idx('w', WLOSY_MODUL.length), u: idx('u', UBRANIA_MODUL.length), u2: idx('u2', UBRANIA_MODUL.length) };
}

/** The hero's modular look: the one picked at creation, else a stable one from the name (same every time). */
export function modulGracza(look: { modul?: ModulLook }, name: string): ModulLook {
  if (look.modul) return look.modul;
  let h = 2166136261;
  for (const ch of name) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const r = (n: number) => {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    return (h >>> 8) % n;
  };
  const p: 'k' | 'm' = r(2) ? 'k' : 'm';
  const ci = POSTACIE_MODUL.filter((x) => x.plec === p);
  return { g: ci[r(ci.length)].id, c: ci[r(ci.length)].id, p, s: r(2), w: r(WLOSY_MODUL.length), u: r(UBRANIA_MODUL.length), u2: r(UBRANIA_MODUL.length) };
}

/** A short key of a look (texture names, caches). */
export function modulKlucz(l: ModulLook) {
  return `${l.g}-${l.c}-${l.p}-${l.s}-${l.w}-${l.u}-${l.u2}`;
}

/** Recolours one pixel: the target colour at the pixel's brightness relative to its material's reference colour. */
function tone(d: Uint8ClampedArray, i: number, to: number[], base: Wzorzec) {
  const v = Math.max(d[i], d[i + 1], d[i + 2]) / Math.max(1, base ? Math.max(...base) : 255);
  for (let c = 0; c < 3; c++) d[i + c] = Math.min(255, Math.round(to[c] * v));
}

/** One part's whole sheet (192×192) recoloured: index = which of the 20 sheets in the strip. */
function arkuszCzesci(src: ImageData, mask: ImageData, index: number, look: ModulLook, ref: { skora?: Wzorzec; wlosy?: Wzorzec; u1?: Wzorzec; u2?: Wzorzec }) {
  const S = F * 3;
  const out = new ImageData(S, S);
  const d = out.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const s = (y * src.width + index * S + x) * 4;
    const o = (y * S + x) * 4;
    d.set(src.data.subarray(s, s + 4), o);
    if (!d[o + 3] || !mask.data[s + 3]) continue;
    const [r, g, b] = [mask.data[s], mask.data[s + 1], mask.data[s + 2]];
    if (b === 255 && r === 0 && g === 0) { if (ref.skora !== undefined) tone(d, o, SKORY_MODUL[look.s], ref.skora); }
    else if (r === 255 && g === 255) { if (ref.wlosy !== undefined) tone(d, o, WLOSY_MODUL[look.w], ref.wlosy); }
    else if (r === 255) { if (ref.u1 !== undefined) tone(d, o, UBRANIA_MODUL[look.u], ref.u1); }
    else if (g === 255) { if (ref.u2 !== undefined) tone(d, o, UBRANIA_MODUL[look.u2], ref.u2); }
  }
  return out;
}

function naPlotno(img: ImageData) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  c.getContext('2d')!.putImageData(img, 0, 0);
  return c;
}

/** The whole walking sheet (192×192, the game's layout: rows front/left/back, columns step A/standing/step B). */
function arkusz(p: Czesci, look: ModulLook): HTMLCanvasElement {
  const hi = POSTACIE_MODUL.findIndex((x) => x.id === look.g);
  const bi = POSTACIE_MODUL.findIndex((x) => x.id === look.c);
  const h = POSTACIE_MODUL[hi], b = POSTACIE_MODUL[bi];
  const ciala = naPlotno(arkuszCzesci(p.ciala, p.ciala_maska, bi, look, b.cialo));
  const glowy = naPlotno(arkuszCzesci(p.glowy, p.glowy_maska, hi, look, h.glowa));
  const c = document.createElement('canvas');
  c.width = c.height = F * 3;
  const ctx = c.getContext('2d')!;
  for (let r = 0; r < 3; r++) {
    const k = b.kier[r], kg = h.kier[r];
    const dx = Math.round(k.nx - kg.mx), dy = Math.round(k.ny - kg.my);
    for (let col = 0; col < 3; col++) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(col * F, r * F, F, F);
      ctx.clip();
      ctx.drawImage(ciala, col * F, r * F, F, F, col * F, r * F + DOL, F, F);
      ctx.drawImage(glowy, col * F, r * F, F, F, col * F + dx, r * F + DOL + dy, F, F);
      ctx.restore();
    }
  }
  return c;
}

const arkusze = new Map<string, HTMLCanvasElement>();

/** The walking sheet at once – null until the parts are loaded (modulZObrazow or an earlier async call). */
export function modulArkuszTeraz(look: ModulLook): HTMLCanvasElement | null {
  const key = modulKlucz(look);
  const got = arkusze.get(key);
  if (got) return got;
  if (!czesci) return null;
  const c = arkusz(czesci, look);
  arkusze.set(key, c);
  return c;
}

export async function modulArkusz(look: ModulLook): Promise<HTMLCanvasElement> {
  await wczytaj();
  return modulArkuszTeraz(look)!;
}

/** The standing figure facing us (64×64) – the menu's preview. */
export async function modulCanvas(look: ModulLook): Promise<HTMLCanvasElement> {
  const s = await modulArkusz(look);
  const c = document.createElement('canvas');
  c.width = MODUL_W;
  c.height = MODUL_H;
  c.getContext('2d')!.drawImage(s, F, 0, F, F, 0, 0, F, F);
  return c;
}

const dataUrl = new Map<string, Promise<string>>();
/** The walking sheet as a picture URL (the Kufer's daguerreotype uses the same 3×3 layout as the artist's sheets). */
export function modulArkuszUrl(look: ModulLook): Promise<string> {
  const key = modulKlucz(look);
  let u = dataUrl.get(key);
  if (!u) {
    u = modulArkusz(look).then((c) => c.toDataURL('image/png'));
    dataUrl.set(key, u);
  }
  return u;
}

/** Portrait size: the head's 48×48 crop enlarged ×8 blocky, so smooth shrinking in the HUD stays crisp. */
export const PORTRET_PX = 384;
const portrety = new Map<string, Promise<HTMLCanvasElement>>();

/** The head alone (recoloured, no body), facing us, as a PORTRET_PX square. */
export function modulPortret(look: ModulLook): Promise<HTMLCanvasElement> {
  const key = modulKlucz(look);
  let p = portrety.get(key);
  if (!p) {
    p = wczytaj().then((d) => {
      const hi = POSTACIE_MODUL.findIndex((x) => x.id === look.g);
      const h = POSTACIE_MODUL[hi];
      const glowy = naPlotno(arkuszCzesci(d.glowy, d.glowy_maska, hi, look, h.glowa));
      const c = document.createElement('canvas');
      c.width = c.height = PORTRET_PX;
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      // v8 heads are whole (beards, chins): the 48 px square ends a few px under the mount point
      const S = 48, x0 = F + Math.round(h.kier[0].mx - S / 2), y0 = Math.max(0, Math.min(F - S, Math.round(h.kier[0].my) + 6 - S));
      ctx.drawImage(glowy, x0, y0, S, S, 0, 0, PORTRET_PX, PORTRET_PX);
      return c;
    });
    portrety.set(key, p);
  }
  return p;
}
