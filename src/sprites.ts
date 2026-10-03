import Phaser from 'phaser';
import { BOHATEROWIE, CHOCHLIK, WROGOWIE_HD, STALE_HD, PIERWSI_BOHATEROWIE, MIESZKANCY_HD, NOWE_POSTACIE, POSWIATA, STOPY_PX, STROJE, type Postac } from './content/wyglad';
import { HERO_DIRS } from './art';

// The new detailed characters (content/wyglad.ts). Every sheet becomes a
// texture `hd-<id>` with the same frame names as the old people (`down-0`…,
// 0 = standing, 1/2 = steps; `side` looks left and is mirrored for right),
// drawn smoothed (they are shrunk to about a third on the map). Also made:
// `hd-<id>-red` with a red glow (enemies, townsfolk in a duel) and recoloured
// townsfolk `hd-<id>-s<n>` (+ `-red`).

const F = 64;
/** Sheet column for frame 0 (standing), 1 and 2 (steps). */
const COL = [1, 0, 2];
/**
 * Walking shows only the two steps (A, B): the artist's standing frame is drawn
 * differently (the ranger's ponytail on the other side from behind, the
 * knight's helmet), so step–stand–step jittered even with the frames lined up.
 * The standing frame is used when the character stands still.
 */
const WALK = [1, 2];
/**
 * Townsfolk, fixed characters and enemies: step A – stand – step B – stand.
 * On many of their sheets steps A and B look almost the same (above all from
 * the side), so A–B alone looked like floating with only an arm moving.
 */
const WALK_FOLK = [1, 0, 2, 0];
const WALK_FOLK_FPS = 8;
/** ~165 ms a step (the artist suggests 140–180 ms). */
const WALK_FPS = 6;
/** Sheet row of each direction (the artist's order: down, side, up). */
const ROW = { down: 0, side: 1, up: 2 } as const;

export const hdOn = NOWE_POSTACIE;

const ENEMIES = WROGOWIE_HD.map((w) => w.postac);
const ALL = () => [...BOHATEROWIE, ...MIESZKANCY_HD, CHOCHLIK, ...ENEMIES, ...Object.values(STALE_HD)];

/**
 * A fixed character (FixedNpcs, the wizard) as the artist drew them, walking
 * by direction; the old tinted look-drawn person when the picture is missing.
 */
export function fixedSprite(scene: Phaser.Scene, x: number, y: number, who: keyof typeof STALE_HD, fallback: string, tint?: number) {
  const key = hdOn ? ensureHd(scene, `hd-${STALE_HD[who].id}`) : '';
  if (hdOn && scene.textures.exists(key)) return fitHd(scene.add.sprite(x, y, key, 'down-0'));
  const s = scene.add.sprite(x, y, fallback, 'down-0');
  return tint === undefined ? s : s.setTint(tint);
}

/** Turns a detailed character to where it moved and plays its walk (standing when it didn't). */
export function walkHd(s: Phaser.GameObjects.Sprite, dx: number, dy: number) {
  const key = s.texture.key;
  if (Math.abs(dx) + Math.abs(dy) < 0.01) {
    s.anims.stop();
    s.setFrame(`${s.frame.name.split('-')[0]}-0`);
    return;
  }
  const dir = Math.abs(dx) > Math.abs(dy) ? 'side' : dy < 0 ? 'up' : 'down';
  s.setFlipX(dir === 'side' && dx > 0);
  s.anims.play(`${key}-walk-${dir}`, true);
}

/** The detailed picture (with the red glow, made on first use) of an enemy kind, when the artist drew one. */
export function enemyTexture(scene: Phaser.Scene, kind: string): string | null {
  const w = kind === 'glut' || kind === 'wielki_glut' ? 'hd-chochlik' : WROGOWIE_HD.find((q) => q.rodzaje.includes(kind)) && `hd-${WROGOWIE_HD.find((q) => q.rodzaje.includes(kind))!.postac.id}`;
  return w && scene.textures.exists(ensureHd(scene, w)) ? ensureRed(scene, w) : null;
}

export function loadHdSprites(scene: Phaser.Scene) {
  if (!hdOn) return;
  for (const p of ALL()) {
    scene.load.image(`hdsrc-${p.id}`, `postacie/${p.plik}.png`);
    if (p.maska !== false) scene.load.image(`hdmask-${p.id}`, `postacie/${p.plik}_maska.png`);
  }
}

const skala = new Map<string, number>();
/** The artist's sheets and masks as plain pictures (taken out of the texture manager in createHdSprites). */
const srcImg = new Map<string, HTMLImageElement>();
const maskImg = new Map<string, HTMLImageElement>();

/** Is this one of the new characters' textures? */
export function isHd(key: string) {
  return key.startsWith('hd-');
}

/** Sizes and places a sprite of a new character so its feet are 8 px under its position, like the old people. */
export function fitHd(s: Phaser.GameObjects.Sprite, times = 1) {
  const k = s.texture.key;
  const sc = (skala.get(baseOf(k)) ?? 0.36) * times;
  s.setScale(sc).setOrigin(0.5, (STOPY_PX - 8 / sc) / F);
  return s;
}

/** Which of the new characters a texture shows (for its gender and age), if any. */
export function personOf(key: string): Postac | undefined {
  const id = baseOf(key).slice(3);
  return [...BOHATEROWIE, ...MIESZKANCY_HD].find((p) => p.id === id);
}

function baseOf(key: string) {
  const m = /^hd-[a-z]+/.exec(key);
  return m ? m[0] : key;
}

/** Every made sheet by texture key, so its red-glow copy can be made when first needed (ensureRed). */
const sheets = new Map<string, HTMLCanvasElement>();

/**
 * Readies the detailed characters. Each sheet (stray specks removed, frames
 * lined up, clothes colours, red glow) is painted the first time something
 * shows it (ensureHd/ensureRed): doing all ~36 sheets × colours × glow at the
 * start froze phones for seconds on a blank screen.
 */
export function createHdSprites(scene: Phaser.Scene) {
  if (!hdOn) return;
  for (const p of ALL()) {
    // The artist's sheets are only read when painting: keep the pictures, give the graphics card its memory back (~11 MB).
    for (const [k, map] of [[`hdsrc-${p.id}`, srcImg], [`hdmask-${p.id}`, maskImg]] as const) {
      if (!scene.textures.exists(k)) continue;
      map.set(p.id, scene.textures.get(k).getSourceImage() as HTMLImageElement);
      scene.textures.remove(k);
    }
    if (!srcImg.has(p.id)) continue;
    const key = `hd-${p.id}`;
    skala.set(key, p.skala);
    pending.set(key, p);
  }
}

/** Characters whose sheet is loaded but not painted yet. */
const pending = new Map<string, Postac>();
const masks = new Map<string, HTMLCanvasElement>();

/** Makes a detailed character's texture (`hd-<id>`, or a townsperson's clothes colour `hd-<id>-s<n>`) the first time it is needed. */
export function ensureHd(scene: Phaser.Scene, key: string): string {
  if (scene.textures.exists(key)) return key;
  const m = /^(hd-[a-z]+)(?:-s(\d+))?$/.exec(key);
  if (!m) return key;
  const base = m[1];
  const p = pending.get(base);
  if (p && !scene.textures.exists(base)) {
    const src = sheetPixels(scene, p);
    addSheet(scene, base, src);
    sheets.set(base, src);
    // Heroes get clothes colours only when they stand in for missing townsfolk.
    const recolourable = !(p === CHOCHLIK || ENEMIES.includes(p) || p.przebarwiaj === false || (BOHATEROWIE.includes(p) && MIESZKANCY_HD.length));
    if (recolourable) masks.set(base, maskPixels(scene, p));
  }
  const n = m[2] === undefined ? -1 : +m[2];
  const src = sheets.get(base);
  const mask = masks.get(base);
  if (n > 0 && src && mask && STROJE[n]) {
    const c = recolour(src, mask, STROJE[n]);
    addSheet(scene, key, c);
    sheets.set(key, c);
    return key;
  }
  return scene.textures.exists(key) ? key : scene.textures.exists(base) ? base : key;
}

/** The red-glowing copy of a detailed character's texture (enemies, duel opponents), made the first time it is asked for. */
export function ensureRed(scene: Phaser.Scene, key: string): string {
  key = ensureHd(scene, key);
  const red = `${key}-red`;
  if (!scene.textures.exists(red)) {
    const c = sheets.get(key);
    if (c) addSheet(scene, red, glow(c));
  }
  return red;
}

/** Keys of all townsfolk looks (every townsperson in every clothes colour). */
export function hdFolkLooks(): string[] {
  const out: string[] = [];
  // The artist's townsfolk when there are any, else the heroes recoloured.
  const who = MIESZKANCY_HD.length ? MIESZKANCY_HD : BOHATEROWIE;
  for (const p of who.filter((q) => !q.wylaczona)) STROJE.forEach((_, i) => {
    if (i === 0) out.push(`hd-${p.id}`);
    else if (p.przebarwiaj !== false) out.push(`hd-${p.id}-s${i}`);
  });
  return out;
}

/** The hero's picture: `look.postac` (chosen in the character sheet) or one picked by the name. */
export function heroSkin(postac: number | undefined, name: string): Postac {
  if (postac !== undefined && BOHATEROWIE[postac]) return BOHATEROWIE[postac];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return BOHATEROWIE[h % PIERWSI_BOHATEROWIE];
}

// ------------------------------------------------------------------ making the sheets

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** How far each frame is moved sideways so the head stands in the middle (see centreShifts); per character id. */
const shifts = new Map<string, number[]>();

/** The sheet with stray pixels removed, the side row turned to look left and every frame centred. */
function sheetPixels(scene: Phaser.Scene, p: Postac) {
  const img = srcImg.get(p.id)!;
  const c = canvas(F * 3, F * 3);
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  if (p.bokWPrawo) mirrorRow(c, 1);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  for (let r = 0; r < 3; r++) for (let col = 0; col < 3; col++) dropSpecks(data, col * F, r * F);
  ctx.putImageData(data, 0, 0);
  const s = centreShifts(data);
  shifts.set(p.id, s);
  shiftFrames(c, s);
  return c;
}

function maskPixels(scene: Phaser.Scene, p: Postac) {
  const c = canvas(F * 3, F * 3);
  const mask = maskImg.get(p.id);
  if (!mask) return c;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(mask, 0, 0);
  if (p.bokWPrawo) mirrorRow(c, 1);
  const s = shifts.get(p.id);
  if (s) shiftFrames(c, s);
  return c;
}

/**
 * The artist's frames don't all stand in the same place (the standing frame is
 * drawn 4–6 px right of the steps for the knight and the ranger), so walking
 * jitters, and turning left/right jumps. Per row: each step frame is moved to
 * where its outline best covers the standing frame's, then the whole row so
 * the standing figure's body (lower half: no plume or ponytail) is in the middle.
 */
function centreShifts(img: ImageData): number[] {
  const W = img.width;
  const d = img.data;
  const solid = (r: number, col: number, x: number, y: number) => x >= 0 && x < F && d[((r * F + y) * W + col * F + x) * 4 + 3] >= 20;
  const out: number[] = [];
  for (let r = 0; r < 3; r++) {
    // The standing frame's body: mean x of the lower half of the figure.
    let top = F, bottom = -1;
    for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) if (solid(r, 1, x, y)) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
    let sx = 0, n = 0;
    for (let y = Math.round((top + bottom) / 2); y <= bottom; y++) for (let x = 0; x < F; x++) if (solid(r, 1, x, y)) { sx += x; n++; }
    const row = n ? Math.round(F / 2 - 0.5 - sx / n) : 0;
    for (let col = 0; col < 3; col++) {
      let best = 0, bestScore = -1;
      if (col !== 1) {
        for (let dx = -12; dx <= 12; dx++) {
          let score = 0;
          for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) if (solid(r, col, x, y) && solid(r, 1, x + dx, y)) score++;
          if (score > bestScore || (score === bestScore && Math.abs(dx) < Math.abs(best))) { bestScore = score; best = dx; }
        }
      }
      out.push(row + best);
    }
  }
  return out;
}

/** Moves every frame sideways by its shift (row by row, 3 frames each). */
function shiftFrames(c: HTMLCanvasElement, s: number[]) {
  const ctx = c.getContext('2d')!;
  for (let r = 0; r < 3; r++) {
    for (let col = 0; col < 3; col++) {
      const dx = s[r * 3 + col];
      if (!dx) continue;
      const cell = ctx.getImageData(col * F, r * F, F, F);
      const tmp = canvas(F, F);
      tmp.getContext('2d')!.putImageData(cell, 0, 0);
      ctx.clearRect(col * F, r * F, F, F);
      ctx.save();
      ctx.beginPath();
      ctx.rect(col * F, r * F, F, F);
      ctx.clip();
      ctx.drawImage(tmp, col * F + dx, r * F);
      ctx.restore();
    }
  }
}

function mirrorRow(c: HTMLCanvasElement, row: number) {
  const ctx = c.getContext('2d')!;
  for (let col = 0; col < 3; col++) {
    const cell = ctx.getImageData(col * F, row * F, F, F);
    const tmp = canvas(F, F);
    tmp.getContext('2d')!.putImageData(cell, 0, 0);
    ctx.clearRect(col * F, row * F, F, F);
    ctx.save();
    ctx.translate(col * F + F, row * F);
    ctx.scale(-1, 1);
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();
  }
}

/** Removes small loose bits (the sheet has some stray lines from neighbouring frames). */
function dropSpecks(img: ImageData, ox: number, oy: number) {
  const W = img.width;
  const d = img.data;
  const seen = new Uint8Array(F * F);
  const at = (x: number, y: number) => ((oy + y) * W + ox + x) * 4;
  for (let y = 0; y < F; y++) {
    for (let x = 0; x < F; x++) {
      if (seen[y * F + x] || d[at(x, y) + 3] < 20) continue;
      const part: number[] = [];
      const stack = [y * F + x];
      seen[y * F + x] = 1;
      while (stack.length) {
        const i = stack.pop()!;
        part.push(i);
        const cx = i % F, cy = (i / F) | 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= F || ny >= F) continue;
            const j = ny * F + nx;
            if (seen[j] || d[at(nx, ny) + 3] < 20) continue;
            seen[j] = 1;
            stack.push(j);
          }
        }
      }
      if (part.length < 40) for (const i of part) d[at(i % F, (i / F) | 0) + 3] = 0;
    }
  }
}

/** A copy with a soft red glow behind the character. */
function glow(src: HTMLCanvasElement) {
  const c = canvas(src.width, src.height);
  const ctx = c.getContext('2d')!;
  // Red silhouette, blurred, per frame (so the glow doesn't bleed into the neighbours).
  const sil = canvas(src.width, src.height);
  const sctx = sil.getContext('2d')!;
  sctx.drawImage(src, 0, 0);
  sctx.globalCompositeOperation = 'source-in';
  sctx.fillStyle = POSWIATA.kolor;
  sctx.fillRect(0, 0, sil.width, sil.height);
  for (let r = 0; r < 3; r++) {
    for (let col = 0; col < 3; col++) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(col * F, r * F, F, F);
      ctx.clip();
      ctx.filter = `blur(${POSWIATA.rozmycie}px)`;
      ctx.globalAlpha = POSWIATA.mocno;
      for (let i = 0; i < POSWIATA.warstwy; i++) ctx.drawImage(sil, col * F, r * F, F, F, col * F, r * F, F, F);
      // A thin sharp red rim right at the edge too (some browsers have no canvas blur).
      ctx.filter = 'none';
      ctx.globalAlpha = 0.9;
      for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) ctx.drawImage(sil, col * F, r * F, F, F, col * F + dx, r * F + dy, F, F);
      ctx.restore();
    }
  }
  ctx.drawImage(src, 0, 0);
  return c;
}

/** Recolours the red (clothes) and green (second colour) parts of the mask. */
function recolour(src: HTMLCanvasElement, mask: HTMLCanvasElement, s: (typeof STROJE)[number]) {
  const c = canvas(src.width, src.height);
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const m = mask.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 20 || m[i + 3] < 20) continue;
    const t = m[i] > 128 ? s.ubranie : m[i + 1] > 128 ? s.drugi : null;
    if (!t || (t[0] === 0 && t[1] === 1 && t[2] === 1)) continue;
    const [h, sat, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
    const [r, g, b] = hslToRgb((h + t[0]) % 360, Math.min(1, sat * t[1]), Math.min(1, l * t[2]));
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function addSheet(scene: Phaser.Scene, key: string, c: HTMLCanvasElement) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, c)!;
  for (const dir of HERO_DIRS) {
    for (let f = 0; f < 3; f++) tex.add(`${dir}-${f}`, 0, COL[f] * F, ROW[dir] * F, F, F);
  }
  tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  for (const dir of HERO_DIRS) {
    const anim = `${key}-walk-${dir}`;
    if (!scene.anims.exists(anim)) scene.anims.create({ key: anim, frames: WALK_FOLK.map((f) => ({ key, frame: `${dir}-${f}` })), frameRate: WALK_FOLK_FPS, repeat: -1 });
  }
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

let heroKeyNow = '';

/** Makes the player's walk animations (`me-walk-*`) use the chosen new hero; returns its texture. */
export function useHdHero(scene: Phaser.Scene, postac: number | undefined, name: string) {
  const key = ensureHd(scene, `hd-${heroSkin(postac, name).id}`);
  heroKeyNow = key;
  for (const dir of HERO_DIRS) {
    const anim = `me-walk-${dir}`;
    if (scene.anims.exists(anim)) scene.anims.remove(anim);
    scene.anims.create({ key: anim, frames: WALK.map((f) => ({ key, frame: `${dir}-${f}` })), frameRate: WALK_FPS + 1, repeat: -1 });
  }
  return key;
}

/** The hero's head for the HUD portrait: texture, frame and the crop (in frame pixels) with its size. */
export function heroPortrait(): { key: string; crop: [number, number, number, number] } | null {
  if (!hdOn || !heroKeyNow) return null;
  return { key: heroKeyNow, crop: [8, 10, 48, 36] };
}
