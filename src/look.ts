import { tx } from './i18n';

// The hero's look, chosen when creating a character: head shape, build,
// outfit, hairstyle and colours. Drawn pixel by pixel into a 16×16 frame
// (the same drawing is used for the preview in the menu and in the game).

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

export const HEADS = () => [tx('Kwadratowa', 'Square'), tx('Okrągła', 'Round'), tx('Pociągła', 'Long')];
export const BUILDS = () => [tx('Chudszy', 'Slim'), tx('Zwykły', 'Regular'), tx('Grubszy', 'Chubby'), tx('Przypakowany', 'Muscular')];
export const OUTFITS = () => [tx('Zwykły', 'Casual'), tx('Magik', 'Wizard'), tx('Wojownik', 'Warrior'), tx('Łowca', 'Hunter'), tx('Ninja', 'Ninja'), tx('Naukowiec', 'Scientist')];
export const HAIRS = () => [tx('Łysy', 'Bald'), tx('Krótkie', 'Short'), tx('Długie', 'Long'), tx('Afro', 'Afro'), tx('Irokez', 'Mohawk'), tx('Kucyk', 'Ponytail')];
export const SKINS = ['#f5c89a', '#ffdcb5', '#e0a878', '#c68642', '#8d5524', '#5c3a1e'];
export const HAIR_COLORS = ['#7a4a24', '#2b1d14', '#e8c46a', '#c0392b', '#e07a2e', '#b0b0b0', '#3f7fd8', '#e056a0'];
export const CLOTHES = ['#3fa34d', '#3f7fd8', '#e43b44', '#f7c531', '#7a5ab8', '#2b2b33', '#f2f2f2', '#8a5a2b', '#e07a2e', '#4fc3c3'];

export const DEFAULT_LOOK: Look = { head: 0, build: 1, outfit: 0, hair: 1, skin: 0, hairColor: 0, top: 0, bottom: 7 };

const LIMITS: Record<keyof Look, number> = {
  head: 3, build: 4, outfit: 6, hair: 6, skin: SKINS.length, hairColor: HAIR_COLORS.length, top: CLOTHES.length, bottom: CLOTHES.length,
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
  return { head: r(3), build: r(4), outfit: r(6), hair: r(6), skin: r(SKINS.length), hairColor: r(HAIR_COLORS.length), top: r(CLOTHES.length), bottom: r(CLOTHES.length) };
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

const LEATHER = '#8a5a2b';
const IRON = '#aab0bc';

/** Draws one 16×16 frame of the hero at (ox, oy). Side frames face left. */
export function drawLook(ctx: CanvasRenderingContext2D, ox: number, oy: number, dir: Dir, frame: number, look: Look, worn: Worn = {}) {
  const p = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(ox + x, oy + y, w, h);
  };
  const skin = SKINS[look.skin];
  const hair = HAIR_COLORS[look.hairColor];
  const top = CLOTHES[look.top];
  const topDark = shade(top, 0.72);
  const bottom = CLOTHES[look.bottom];
  const outfit = look.outfit;

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(ox + 8, oy + 15, 5, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body box by build: [outline x, width, arm left x, arm right x, arm width].
  const B = [
    { x: 5, w: 6, al: 4, ar: 11, aw: 1, lx: [6, 8], lw: 2 },
    { x: 4, w: 8, al: 3, ar: 12, aw: 1, lx: [5, 8], lw: 3 },
    { x: 3, w: 10, al: 2, ar: 13, aw: 1, lx: [4, 9], lw: 3 },
    { x: 4, w: 8, al: 1, ar: 13, aw: 2, lx: [5, 8], lw: 3 },
  ][look.build];

  // Legs (step animation); a wizard's robe hides them.
  const up = [frame === 1 ? -1 : 0, frame === 2 ? -1 : 0];
  const bootColor = worn.boots ? (worn.boots.startsWith('zelazne') ? IRON : LEATHER) : null;
  B.lx.forEach((lx, i) => {
    p(lx, 12 + up[i], B.lw, 3, OUTLINE);
    p(lx + 1, 12 + up[i], B.lw - 2 || 1, 2, bottom);
    if (bootColor) p(lx + 1, 13 + up[i], B.lw - 2 || 1, 1, bootColor);
  });

  // Body.
  const muscles = look.build === 3;
  if (muscles) {
    // Broad shoulders, narrow waist.
    p(2, 8, 12, 3, OUTLINE);
    p(B.x, 10, B.w, 3, OUTLINE);
    p(3, 8, 10, 2, top);
    p(B.x + 1, 10, B.w - 2, 2, top);
    p(7, 9, 2, 1, shade(top, 0.8)); // chest line
  } else if (look.build === 2) {
    // A round belly.
    p(B.x, 8, B.w, 5, OUTLINE);
    p(B.x - 1, 10, B.w + 2, 2, OUTLINE);
    p(B.x + 1, 8, B.w - 2, 4, top);
    p(B.x, 10, B.w, 2, top);
    p(B.x + 1, 11, B.w - 2, 1, topDark);
  } else {
    p(B.x, 8, B.w, 5, OUTLINE);
    p(B.x + 1, 8, B.w - 2, 4, top);
  }
  const bx = B.x + 1;
  const bw = B.w - 2;
  if (outfit === 0) {
    p(bx, 11, bw, 1, topDark);
    p(bx, 10, bw, 1, '#6b4423'); // belt
  } else if (outfit === 1) {
    // Wizard's robe down to the feet, with stars.
    p(B.x, 8, B.w, 7, OUTLINE);
    p(bx, 8, bw, 6, top);
    p(bx, 13, bw, 1, topDark);
    p(bx + 1, 9, 1, 1, '#f7e27a');
    p(bx + bw - 2, 11, 1, 1, '#f7e27a');
  } else if (outfit === 2) {
    // Warrior: steel chest plate, coloured shoulders.
    p(bx + 1, 9, bw - 2, 3, '#b8bcc8');
    p(bx + 1, 9, bw - 2, 1, '#e8eaf0');
    p(bx, 8, 1, 2, top);
    p(bx + bw - 1, 8, 1, 2, top);
    p(bx, 11, bw, 1, '#6b4423');
  } else if (outfit === 3) {
    // Hunter: a strap across the chest (and a quiver on the back).
    for (let i = 0; i < 4; i++) p(bx + Math.round((i * (bw - 1)) / 3), 8 + i, 1, 1, '#6b4423');
    p(bx, 11, bw, 1, topDark);
  } else if (outfit === 4) {
    // Ninja: dark belt.
    p(bx, 10, bw, 1, OUTLINE);
  } else {
    // Scientist: white lab coat, open over a coloured shirt.
    p(B.x, 8, B.w, 6, OUTLINE);
    p(bx, 8, bw, 5, '#f4f4f4');
    p(bx, 12, bw, 1, '#d8d8d8');
    if (dir !== 'up') p(7, 8, 2, 3, top);
  }
  // Arms.
  const armColor = outfit === 5 ? '#f4f4f4' : outfit === 4 ? top : skin;
  if (dir === 'side') p(7, 9, 2, 2, armColor === skin ? skin : armColor);
  else {
    p(B.al - 1, 9, 1, 2, OUTLINE);
    p(B.ar + B.aw, 9, 1, 2, OUTLINE);
    p(B.al, 9, B.aw, 2, armColor);
    p(B.ar, 9, B.aw, 2, armColor);
    p(B.al, 11, B.aw, 1, skin); // hands
    p(B.ar, 11, B.aw, 1, skin);
  }
  // Armour from the game, over the clothes.
  if (worn.armor) {
    const chain = !worn.armor.startsWith('skorzana');
    const c = chain ? IRON : LEATHER;
    p(bx, 8, bw, 3, c);
    if (chain) for (let x = 0; x < bw; x += 2) p(bx + x, 9, 1, 1, '#7d8391');
    else p(bx, 8, bw, 1, shade(LEATHER, 1.25));
  }
  if (outfit === 3 && dir === 'up') {
    p(9, 6, 2, 6, OUTLINE);
    p(9, 7, 1, 4, '#8a5a2b');
    p(9, 5, 1, 1, '#e8e8f0');
    p(10, 5, 1, 1, '#e43b44');
  }

  // Head: fill box by shape.
  const H = [{ x: 4, w: 8, y: 2, h: 6 }, { x: 4, w: 8, y: 2, h: 6 }, { x: 5, w: 6, y: 1, h: 7 }][look.head];
  const hr = H.x + H.w; // first column right of the face

  // Hair behind the head (long hair, afro, ponytail from the front).
  const hairOut = (x: number, y: number, w: number, h: number) => {
    p(x - 1, y - 1, w + 2, h + 2, OUTLINE);
    p(x, y, w, h, hair);
  };
  if (look.hair === 2) {
    if (dir === 'down') {
      hairOut(H.x - 1, H.y + 1, 1, 8);
      hairOut(hr, H.y + 1, 1, 8);
    } else if (dir === 'up') hairOut(H.x, H.y + 2, H.w, 9);
    else hairOut(hr - 3, H.y + 2, 4, 8);
  } else if (look.hair === 3) {
    hairOut(H.x - 2, H.y - 2, H.w + 4, dir === 'up' ? H.h + 3 : 6);
  } else if (look.hair === 5 && dir !== 'down') {
    if (dir === 'up') hairOut(7, H.y + H.h, 2, 4);
    else {
      hairOut(hr, H.y + 2, 2, 1);
      hairOut(hr + 1, H.y + 3, 1, 3);
    }
  }

  // The head itself.
  if (look.head === 1) {
    p(H.x, H.y - 1, H.w, 1, OUTLINE);
    p(H.x - 1, H.y, H.w + 2, H.h, OUTLINE);
    p(H.x, H.y + H.h, H.w, 1, OUTLINE);
  } else p(H.x - 1, H.y - 1, H.w + 2, H.h + 2, OUTLINE);
  p(H.x, H.y, H.w, H.h, skin);

  // Hair on top of the head.
  const fringe = () => p(H.x, H.y, H.w, 2, hair);
  if (look.hair === 0) {
    if (dir !== 'side') p(H.x + 2, H.y, 2, 1, shade(skin, 1.15)); // shine
  } else if (look.hair === 4) {
    // Mohawk: a crest in the middle, standing up.
    if (dir === 'side') {
      p(H.x, H.y - 2, H.w, 2, OUTLINE);
      p(H.x + 1, H.y - 2, H.w - 2, 2, hair);
    } else {
      p(6, H.y - 3, 4, 3, OUTLINE);
      p(7, H.y - 3, 2, dir === 'up' ? H.h + 3 : 4, hair);
    }
  } else if (dir === 'up') p(H.x, H.y, H.w, H.h, hair);
  else if (dir === 'down') {
    fringe();
    p(H.x, H.y + 2, 1, 2, hair);
    p(hr - 1, H.y + 2, 1, 2, hair);
    if (look.hair === 3) p(H.x, H.y, H.w, 1, hair);
  } else {
    fringe();
    p(hr - 4, H.y + 2, 4, 3, hair);
  }

  // Face.
  const narrow = H.w < 8;
  const e1 = narrow ? H.x + 1 : H.x + 2;
  const e2 = narrow ? hr - 2 : hr - 3;
  if (dir === 'down') {
    p(e1, H.y + 3, 1, 2, OUTLINE);
    p(e2, H.y + 3, 1, 2, OUTLINE);
    p(e1 - 1, H.y + 5, 1, 1, '#f09a8a');
    p(e2 + 1, H.y + 5, 1, 1, '#f09a8a');
  } else if (dir === 'side') {
    p(H.x + 1, H.y + 3, 1, 2, OUTLINE);
    p(H.x, H.y + 5, 1, 1, '#f09a8a');
  }

  const wizardHat = (c: string) => {
    p(H.x - 2, H.y, H.w + 4, 1, OUTLINE);
    p(H.x - 1, H.y, H.w + 2, 1, c);
    p(6, H.y - 2, 4, 2, OUTLINE);
    p(7, H.y - 2, 2, 2, c);
    p(7, H.y - 3, 2, 1, OUTLINE);
    p(7, H.y - 1, 1, 1, '#f7e27a');
  };
  // Headwear from the game covers the top of the head (and replaces any hat).
  const helm = worn.helm ?? '';
  if (helm === 'czapka_maga') wizardHat('#7a5ab8');
  else if (helm === 'kapelusz') {
    // Robin Hood's hat: green, a wide brim and a red feather.
    const g = '#3f8f3a';
    p(H.x - 2, H.y - 1, H.w + 4, 3, OUTLINE);
    p(H.x - 1, H.y, H.w + 2, 1, shade(g, 0.8));
    p(H.x + 1, H.y - 2, H.w - 2, 2, OUTLINE);
    p(H.x + 1, H.y - 1, H.w - 2, 1, g);
    p(dir === 'side' ? hr - 1 : hr - 2, H.y - 4, 1, 3, '#e43b44');
  } else if (helm === 'korona') {
    // A golden crown with a red jewel.
    const gold = '#f7c531';
    p(H.x - 1, H.y - 2, H.w + 2, 3, OUTLINE);
    p(H.x, H.y - 1, H.w, 2, gold);
    for (const x of [H.x, H.x + Math.floor(H.w / 2) - 1, hr - 1]) {
      p(x, H.y - 3, 1, 1, OUTLINE);
      p(x, H.y - 2, 1, 1, gold);
    }
    if (dir !== 'up') p(H.x + Math.floor(H.w / 2) - 1, H.y, 2, 1, '#e43b44');
  } else if (helm) {
    const iron = !helm.startsWith('skorzany');
    const c = iron ? IRON : LEATHER;
    p(H.x - 1, H.y - 2, H.w + 2, 4, OUTLINE);
    p(H.x, H.y - 1, H.w, 2, c);
    p(H.x, H.y - 1, H.w, 1, shade(c, 1.2));
    if (iron && dir === 'down') p(7, H.y + 1, 2, 3, c); // nose guard
    if (iron && dir === 'side') p(H.x, H.y + 1, 1, 3, c);
    if (!iron && dir === 'side') p(hr - 1, H.y + 1, 2, 2, c);
  }
  // Outfit extras on the head.
  if (worn.helm) {
    // (the helmet is already on)
  } else if (outfit === 1) {
    wizardHat(top);
  } else if (outfit === 4) {
    // Ninja mask and headband.
    if (dir !== 'up') p(H.x, H.y + 4, H.w, 2, top);
    p(H.x, H.y + 1, H.w, 1, top);
    if (dir === 'side') p(hr, H.y + 1, 2, 1, top);
    if (dir === 'up') p(7, H.y + 2, 2, 2, top);
  } else if (outfit === 5 && dir !== 'up') {
    // Glasses.
    const g = '#8d8f99';
    if (dir === 'down') {
      p(e1 - 1, H.y + 3, 3, 1, g);
      p(e2 - 1, H.y + 3, 3, 1, g);
    } else p(H.x, H.y + 3, 3, 1, g);
  } else if (outfit === 2 && dir !== 'up') {
    // A little helmet rim.
    p(H.x, H.y, H.w, 1, '#b8bcc8');
  }
}

/** Frames are 16×20: 4 extra pixels on top for tall hair and hats. */
export const LOOK_W = 16;
export const LOOK_H = 20;
export const LOOK_TOP = LOOK_H - 16;

/** The whole sheet: 3 frames (stand, step, step) × 3 directions (down, up, side). */
export function drawLookSheet(ctx: CanvasRenderingContext2D, look: Look, worn: Worn = {}) {
  (['down', 'up', 'side'] as Dir[]).forEach((dir, row) => {
    for (let f = 0; f < 3; f++) drawLook(ctx, f * LOOK_W, row * LOOK_H + LOOK_TOP, dir, f, look, worn);
  });
}
