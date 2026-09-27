import { tx } from './i18n';

// The hero's look, chosen when creating a character: head, body and legs
// (modular 24×30 pixel-art parts from public/postacie/, drawn legs → body →
// head) and colours (skin, hair, top, bottom swapped in for the palette the
// parts are painted in). The same drawing is used for the preview in the
// menu, the player, townsfolk and the wizard.
//
// Saved looks keep their old field names: `head` = head part, `outfit` =
// body part, `build` = legs part (`hair` is no longer used).

export type Dir = 'down' | 'up' | 'side';

export interface Look {
  head: number;
  build: number;
  outfit: number;
  hair: number;
  skin: number;
  hairColor: number;
  top: number;
  bottom: number;
}

export const HEADS = () => [tx('Kwadratowa', 'Square'), tx('Okrągła', 'Round'), tx('Pociągła', 'Long'), tx('Drobna', 'Small'), tx('Szeroka', 'Wide'), tx('Kaptur', 'Hood')];
export const BUILDS = () => [tx('Chudszy', 'Slim'), tx('Zwykły', 'Regular'), tx('Grubszy', 'Chubby'), tx('Przypakowany', 'Muscular')];
export const OUTFITS = () => [tx('Zwykły', 'Casual'), tx('Magik', 'Wizard'), tx('Wojownik', 'Warrior'), tx('Łowca', 'Hunter'), tx('Ninja', 'Ninja'), tx('Naukowiec', 'Scientist')];
export const HAIRS = () => [tx('Łysy', 'Bald'), tx('Krótkie', 'Short'), tx('Długie', 'Long'), tx('Afro', 'Afro'), tx('Irokez', 'Mohawk'), tx('Kucyk', 'Ponytail')];
export const SKINS = ['#f5c89a', '#ffdcb5', '#e0a878', '#c68642', '#8d5524', '#5c3a1e'];
export const HAIR_COLORS = ['#7a4a24', '#2b1d14', '#e8c46a', '#c0392b', '#e07a2e', '#b0b0b0', '#3f7fd8', '#e056a0'];
export const CLOTHES = ['#3fa34d', '#3f7fd8', '#e43b44', '#f7c531', '#7a5ab8', '#2b2b33', '#f2f2f2', '#8a5a2b', '#e07a2e', '#4fc3c3'];

export const DEFAULT_LOOK: Look = { head: 0, build: 1, outfit: 0, hair: 1, skin: 0, hairColor: 0, top: 0, bottom: 7 };

const LIMITS: Record<keyof Look, number> = {
  head: 6, build: 6, outfit: 6, hair: 6, skin: SKINS.length, hairColor: HAIR_COLORS.length, top: CLOTHES.length, bottom: CLOTHES.length,
};

/** A valid look from whatever was saved (missing or broken parts become the default). */
export function cleanLook(v: unknown): Look {
  const out = { ...DEFAULT_LOOK };
  if (v && typeof v === 'object') {
    for (const k of Object.keys(LIMITS) as (keyof Look)[]) {
      const n = (v as Record<string, unknown>)[k];
      if (typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < LIMITS[k]) out[k] = n;
    }
  }
  return out;
}

export function randomLook(): Look {
  const r = (n: number) => Math.floor(Math.random() * n);
  return { head: r(6), build: r(6), outfit: r(6), hair: r(6), skin: r(SKINS.length), hairColor: r(HAIR_COLORS.length), top: r(CLOTHES.length), bottom: r(CLOTHES.length) };
}

export function lookLimits() {
  return LIMITS;
}

const OUTLINE = '#1e1a24';

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0')}`;
}

/** Things worn in the game that show on the hero (item ids from przedmioty.ts). */
export interface Worn {
  helm?: string | null;
  armor?: string | null;
  boots?: string | null;
}

/** The parts, in the order of the numbers stored in a look (public/postacie/<part>_<name>.png). */
export const LOOK_PARTS = {
  heads: ['kwadratowa', 'okragla', 'wysoka', 'drobna', 'szeroka', 'kaptur'],
  bodies: ['tunika', 'kamizelka', 'kaftan', 'szata', 'pancerz', 'kurtka'],
  legs: ['proste', 'buty', 'szerokie', 'krotkie', 'spodnica', 'wysokie_buty'],
} as const;
export type LookPart = keyof typeof LOOK_PARTS;
/** Every sheet file (for loading at start). */
export const LOOK_SHEETS = (Object.keys(LOOK_PARTS) as LookPart[]).flatMap((part) => LOOK_PARTS[part].map((n) => `${part}_${n}`));

/** Frames are 24×30; the feet stand at the bottom middle. */
export const LOOK_W = 24;
export const LOOK_H = 30;
/** Kept for older callers: the frame has no empty band on top any more. */
export const LOOK_TOP = 0;
/** Where a character stands in its frame (as a fraction of the height): 8 px above the soles, like the old 16×20 hero. */
export const LOOK_PIVOT_Y = (LOOK_H - 8) / LOOK_H;

// Sheet layout: 4 walk frames (columns) × 4 directions (rows: down, left, right, up).
const ROW: Record<Dir, number> = { down: 0, side: 1, up: 3 };
/** The game's 3 frames (stand, step, other step) from the sheets' 4. */
const SRC_FRAME = [0, 1, 3];

const sheets = new Map<string, CanvasImageSource>();
/** The loaded part sheets (BootScene hands them over from its loader). */
export function setLookSheets(get: (name: string) => CanvasImageSource | undefined) {
  for (const n of LOOK_SHEETS) {
    const img = get(n);
    if (img) sheets.set(n, img);
  }
}

// The colours the parts are painted in (palette.json), swapped for the look's.
const PAL = {
  skin: 0xd79a68, skinLight: 0xf0bb86, skinDark: 0xac694b,
  hair: 0x77452c, hairDark: 0x4b2b22, hairLight: 0x9d5e32,
  top: 0x3fa34d, topDark: 0x287238,
  bottom: 0x86562f, bottomDark: 0x5b3927,
};
const rgb = (hex: string) => parseInt(hex.slice(1), 16);

const recoloured = new Map<string, HTMLCanvasElement>();
/** A part sheet in the look's colours (cached). */
function sheetFor(name: string, look: Look): HTMLCanvasElement | null {
  const key = `${name}|${look.skin}|${look.hairColor}|${look.top}|${look.bottom}`;
  const done = recoloured.get(key);
  if (done) return done;
  const src = sheets.get(name);
  if (!src) return null;
  const c = document.createElement('canvas');
  c.width = LOOK_W * 4;
  c.height = LOOK_H * 4;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
  const skin = SKINS[look.skin], hair = HAIR_COLORS[look.hairColor], top = CLOTHES[look.top], bottom = CLOTHES[look.bottom];
  const swap = new Map<number, number>([
    [PAL.skin, rgb(skin)], [PAL.skinLight, rgb(shade(skin, 1.12))], [PAL.skinDark, rgb(shade(skin, 0.78))],
    [PAL.hair, rgb(hair)], [PAL.hairDark, rgb(shade(hair, 0.65))], [PAL.hairLight, rgb(shade(hair, 1.3))],
    [PAL.top, rgb(top)], [PAL.topDark, rgb(shade(top, 0.7))],
    [PAL.bottom, rgb(bottom)], [PAL.bottomDark, rgb(shade(bottom, 0.68))],
  ]);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const to = swap.get((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    if (to === undefined) continue;
    d[i] = to >> 16;
    d[i + 1] = (to >> 8) & 255;
    d[i + 2] = to & 255;
  }
  ctx.putImageData(img, 0, 0);
  recoloured.set(key, c);
  return c;
}

/** Draws one 24×30 frame of the hero with its top-left corner at (ox, oy). Side frames face left. */
export function drawLook(ctx: CanvasRenderingContext2D, ox: number, oy: number, dir: Dir, frame: number, look: Look, worn: Worn = {}) {
  ctx.imageSmoothingEnabled = false;
  // Shadow under the feet.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(ox + 12, oy + 28.5, 6, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  const legs = worn.boots ? 'wysokie_buty' : LOOK_PARTS.legs[look.build] ?? 'proste';
  const body = worn.armor ? 'pancerz' : LOOK_PARTS.bodies[look.outfit] ?? 'tunika';
  const head = worn.helm && look.head === 5 ? 'kwadratowa' : LOOK_PARTS.heads[look.head] ?? 'kwadratowa'; // no hood under a helmet
  const sx = SRC_FRAME[frame] ?? 0, sy = ROW[dir];
  for (const name of [`legs_${legs}`, `bodies_${body}`, `heads_${head}`]) {
    const sh = sheetFor(name, look);
    if (sh) ctx.drawImage(sh, sx * LOOK_W, sy * LOOK_H, LOOK_W, LOOK_H, ox, oy, LOOK_W, LOOK_H);
  }
  if (worn.helm) drawHelm(ctx, ox, oy, dir, worn.helm);
}

/** Headwear over the head (the parts have no hats). */
function drawHelm(ctx: CanvasRenderingContext2D, ox: number, oy: number, dir: Dir, helm: string) {
  const p = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(ox + x, oy + y, w, h);
  };
  const dx = dir === 'side' ? -1 : 0;
  if (helm === 'czapka_maga') {
    const c = '#7a5ab8', d = '#5a3f90';
    p(4 + dx, 5, 16, 2, OUTLINE);
    p(5 + dx, 5, 14, 1, c);
    p(8 + dx, 2, 8, 3, OUTLINE);
    p(9 + dx, 2, 6, 3, c);
    p(10 + dx, 0, 4, 2, OUTLINE);
    p(11 + dx, 0, 2, 2, d);
    p(9 + dx, 4, 6, 1, '#f7c531');
  } else if (helm === 'kapelusz') {
    const c = '#3f8a3a';
    p(4 + dx, 5, 16, 2, OUTLINE);
    p(5 + dx, 5, 14, 1, c);
    p(8 + dx, 2, 8, 3, OUTLINE);
    p(9 + dx, 2, 6, 3, c);
    p(dir === 'side' ? 14 : 15, 0, 1, 3, '#e43b44');
  } else if (helm === 'korona') {
    const g = '#f7c531';
    p(7 + dx, 2, 10, 4, OUTLINE);
    p(8 + dx, 3, 8, 2, g);
    for (const x of [7, 11, 15]) p(x + dx, 0, 2, 2, OUTLINE), p(x + dx, 1, 2, 1, g);
    p(11 + dx, 3, 2, 1, '#e43b44');
  } else {
    // Leather or iron helmet.
    const iron = !helm.startsWith('skorzany');
    const c = iron ? '#aab0bc' : '#8a5a2b', l = iron ? '#d5d9e0' : '#a9743d';
    p(6 + dx, 2, 12, 6, OUTLINE);
    p(7 + dx, 3, 10, 4, c);
    p(8 + dx, 3, 4, 1, l);
    p(5 + dx, 7, 14, 1, OUTLINE);
    if (dir !== 'up' && iron) p(11 + dx, 5, 2, 3, OUTLINE);
  }
}

/** The whole sheet: 3 frames (stand, step, step) × 3 directions (down, up, side). */
export function drawLookSheet(ctx: CanvasRenderingContext2D, look: Look, worn: Worn = {}) {
  (['down', 'up', 'side'] as Dir[]).forEach((dir, row) => {
    for (let f = 0; f < 3; f++) drawLook(ctx, f * LOOK_W, row * LOOK_H, dir, f, look, worn);
  });
}
