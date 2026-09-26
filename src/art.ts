import Phaser from 'phaser';
import { rng } from './rng';
import { drawLookSheet, LOOK_W, LOOK_H, type Look, type Worn } from './look';

// Placeholder art drawn in code, so the game runs without downloaded assets.
// Every texture is registered under a key (see TEX); to switch to a real
// asset pack, load PNGs under the same keys in BootScene and drop the
// matching draw function here.

export const TILE = 16;

export const TEX = {
  tiles: 'tiles',
  hero: 'hero',
  slime: 'slime',
  slash: 'slash',
  heart: 'heart',
  heartEmpty: 'heart-empty',
  coin: 'coin',
  pickupHeart: 'pickup-heart',
  marker: 'marker',
  markerDone: 'marker-done',
  arrow: 'arrow',
  bandit: 'bandit',
  arrowShot: 'arrow-shot',
  magicShot: 'magic-shot',
  dummy: 'dummy',
  target: 'target',
  crystal: 'crystal',
  signLibrary: 'sign-library',
  signHotel: 'sign-hotel',
  treeApple: 'tree-apple',
  treePlum: 'tree-plum',
  vine: 'vine',
  fruitApple: 'fruit-apple',
  fruitPlum: 'fruit-plum',
  fruitGrape: 'fruit-grape',
  mushroom: 'mushroom',
  heartDuel: 'heart-duel',
  heartDuelEmpty: 'heart-duel-empty',
  dryad: 'dryad',
  zombie: 'zombie',
  skeleton: 'skeleton',
  dragon: 'dragon',
  wizard: 'wizard',
  exclaim: 'exclaim',
  log: 'log',
  pine: 'pine',
  signBank: 'sign-bank',
  signShop: 'sign-shop',
  signChurch: 'sign-church',
  signOffice: 'sign-office',
  signHospital: 'sign-hospital',
  signPolice: 'sign-police',
  signSchool: 'sign-school',
  home: 'home',
  dog: 'dog',
  cart: 'cart',
  coach: 'coach',
  piggy: 'piggy',
  bubble: 'bubble',
} as const;

// Tile indices in the 'tiles' texture.
export const T = {
  GRASS: 0,
  FLOWERS: 1,
  PATH: 2,
  SAND: 3,
  WATER: 4,
  TREE: 5,
  ROCK: 6,
  BUSH: 7,
} as const;
export const TILE_COUNT = 8;
export const SOLID_TILES = [T.WATER, T.TREE, T.ROCK, T.BUSH];

const OUTLINE = '#1e1a24';

type Ctx = CanvasRenderingContext2D;

function px(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number) {
  const tex = scene.textures.createCanvas(key, w, h)!;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  return { tex, ctx };
}

// ---------------------------------------------------------------- tiles

function grassBase(ctx: Ctx, ox: number, seed: number) {
  px(ctx, ox, 0, TILE, TILE, '#6abe30');
  const r = rng(seed);
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(r() * 15);
    const y = Math.floor(r() * 14);
    px(ctx, ox + x, y, 1, 2, '#4b9a2a');
    if (r() > 0.6) px(ctx, ox + x + 1, y + 1, 1, 1, '#4b9a2a');
  }
  for (let i = 0; i < 4; i++) {
    px(ctx, ox + Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, '#8fd44f');
  }
}

function drawTiles(scene: Phaser.Scene) {
  const { tex, ctx } = canvasTexture(scene, TEX.tiles, TILE * TILE_COUNT, TILE);
  let o = 0;

  // GRASS
  o = T.GRASS * TILE;
  grassBase(ctx, o, 11);

  // FLOWERS
  o = T.FLOWERS * TILE;
  grassBase(ctx, o, 23);
  const flower = (x: number, y: number, c: string) => {
    px(ctx, o + x, y - 1, 1, 1, c);
    px(ctx, o + x - 1, y, 3, 1, c);
    px(ctx, o + x, y + 1, 1, 1, c);
    px(ctx, o + x, y, 1, 1, '#fbf236');
  };
  flower(4, 4, '#ffffff');
  flower(11, 7, '#ff6b9a');
  flower(6, 12, '#ffffff');

  // PATH
  o = T.PATH * TILE;
  px(ctx, o, 0, TILE, TILE, '#d9a066');
  {
    const r = rng(37);
    for (let i = 0; i < 9; i++) {
      const x = Math.floor(r() * 14);
      const y = Math.floor(r() * 14);
      px(ctx, o + x, y, 2, 1, '#b8834f');
      if (r() > 0.5) px(ctx, o + x, y + 1, 1, 1, '#eec39a');
    }
  }

  // SAND
  o = T.SAND * TILE;
  px(ctx, o, 0, TILE, TILE, '#eedc8f');
  {
    const r = rng(51);
    for (let i = 0; i < 12; i++) {
      px(ctx, o + Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, '#d4bd6a');
    }
  }

  // WATER
  o = T.WATER * TILE;
  px(ctx, o, 0, TILE, TILE, '#3f8fd8');
  px(ctx, o + 2, 3, 5, 1, '#8ccaf7');
  px(ctx, o + 9, 8, 5, 1, '#8ccaf7');
  px(ctx, o + 3, 13, 4, 1, '#8ccaf7');
  px(ctx, o + 7, 4, 2, 1, '#2f6fb3');
  px(ctx, o + 1, 9, 3, 1, '#2f6fb3');

  // TREE (round cartoon canopy on grass)
  o = T.TREE * TILE;
  grassBase(ctx, o, 67);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(o + 8, 14, 6, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, o + 6, 10, 4, 5, OUTLINE);
  px(ctx, o + 7, 10, 2, 4, '#8a5a2b');
  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.arc(o + 8, 7, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2f7a2f';
  ctx.beginPath();
  ctx.arc(o + 8, 7, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#44a044';
  ctx.beginPath();
  ctx.arc(o + 7, 6, 4.5, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, o + 5, 3, 2, 2, '#7bd35f');

  // ROCK
  o = T.ROCK * TILE;
  grassBase(ctx, o, 79);
  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.ellipse(o + 8, 9, 7, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8b8f9a';
  ctx.beginPath();
  ctx.ellipse(o + 8, 9, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, o + 4, 6, 4, 2, '#c2c6cf');
  px(ctx, o + 9, 11, 4, 1, '#6a6d77');

  // BUSH
  o = T.BUSH * TILE;
  grassBase(ctx, o, 91);
  ctx.fillStyle = OUTLINE;
  for (const [x, y, r] of [[5, 9, 4.5], [11, 9, 4.5], [8, 6, 4.5]] as const) {
    ctx.beginPath();
    ctx.arc(o + x, y, r + 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#3d9a3d';
  for (const [x, y, r] of [[5, 9, 4.5], [11, 9, 4.5], [8, 6, 4.5]] as const) {
    ctx.beginPath();
    ctx.arc(o + x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  px(ctx, o + 6, 4, 2, 2, '#7bd35f');
  px(ctx, o + 10, 8, 1, 1, '#d83a3a');
  px(ctx, o + 5, 10, 1, 1, '#d83a3a');

  tex.refresh();
}

// ---------------------------------------------------------------- hero

export type Dir = 'down' | 'up' | 'side';
export const HERO_DIRS: Dir[] = ['down', 'up', 'side'];
export const HERO_FRAMES = 3; // 0 = stand, 1/2 = walk steps

interface Outfit { skin: string; hair: string; tunic: string; tunicDark: string; boots: string; mask?: boolean }
const HERO_OUTFIT: Outfit = { skin: '#f5c89a', hair: '#7a4a24', tunic: '#3fa34d', tunicDark: '#2b7a37', boots: '#5a3a22' };
// A masked villain in a dark red coat.
const BANDIT_OUTFIT: Outfit = { skin: '#e9b98c', hair: '#2a2228', tunic: '#8a2b2b', tunicDark: '#5e1c1c', boots: '#1e1a24', mask: true };

function drawHero(ctx: Ctx, ox: number, oy: number, dir: Dir, frame: number, o: Outfit = HERO_OUTFIT) {
  const { skin, hair, tunic, tunicDark, boots } = o;
  const p = (x: number, y: number, w: number, h: number, c: string) => px(ctx, ox + x, oy + y, w, h, c);

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(ox + 8, oy + 15, 5, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // legs (step animation)
  const lUp = frame === 1 ? -1 : 0;
  const rUp = frame === 2 ? -1 : 0;
  p(5, 12 + lUp, 3, 3, OUTLINE);
  p(8, 12 + rUp, 3, 3, OUTLINE);
  p(6, 12 + lUp, 1, 2, boots);
  p(9, 12 + rUp, 1, 2, boots);

  // body
  p(4, 8, 8, 5, OUTLINE);
  p(5, 8, 6, 4, tunic);
  p(5, 11, 6, 1, tunicDark);
  p(5, 10, 6, 1, '#6b4423'); // belt
  // arms
  if (dir === 'side') {
    p(7, 9, 2, 2, skin);
  } else {
    p(3, 9, 1, 2, OUTLINE);
    p(12, 9, 1, 2, OUTLINE);
    p(4, 9, 1, 2, skin);
    p(11, 9, 1, 2, skin);
  }

  // head
  p(3, 1, 10, 8, OUTLINE);
  p(4, 2, 8, 6, skin);
  if (dir === 'down') {
    p(4, 2, 8, 2, hair);
    p(4, 4, 1, 2, hair);
    p(11, 4, 1, 2, hair);
    p(6, 5, 1, 2, OUTLINE);
    p(9, 5, 1, 2, OUTLINE);
    p(5, 7, 1, 1, '#f09a8a');
    p(10, 7, 1, 1, '#f09a8a');
  } else if (dir === 'up') {
    p(4, 2, 8, 6, hair);
    p(5, 3, 2, 1, '#9a6434');
  } else {
    // facing left; right is drawn by flipping the sprite
    p(4, 2, 8, 2, hair);
    p(8, 4, 4, 3, hair);
    p(5, 5, 1, 2, OUTLINE);
    p(4, 7, 1, 1, '#f09a8a');
  }
  // little cap tip
  p(12, 1, 2, 2, OUTLINE);
  p(12, 2, 1, 1, tunic);
  // bandit's eye mask
  if (o.mask && dir !== 'up') p(dir === 'side' ? 4 : 5, 5, dir === 'side' ? 4 : 6, 1, OUTLINE);
}

/** The player's own hero, drawn from the look chosen at character creation. */
export const PLAYER_TEX = 'hero-me';
/** A character drawn like the hero (frames `down-0`… like PLAYER_TEX), e.g. the wizard. */
export function makeLookTexture(scene: Phaser.Scene, key: string, look: Look, worn: Worn = {}) {
  if (scene.textures.exists(key)) return;
  const { tex, ctx } = canvasTexture(scene, key, LOOK_W * HERO_FRAMES, LOOK_H * HERO_DIRS.length);
  drawLookSheet(ctx, look, worn);
  HERO_DIRS.forEach((dir, row) => {
    for (let f = 0; f < HERO_FRAMES; f++) tex.add(`${dir}-${f}`, 0, f * LOOK_W, row * LOOK_H, LOOK_W, LOOK_H);
  });
  tex.refresh();
}

export function makePlayerTexture(scene: Phaser.Scene, look: Look, worn: Worn = {}) {
  if (scene.textures.exists(PLAYER_TEX)) scene.textures.remove(PLAYER_TEX);
  const { tex, ctx } = canvasTexture(scene, PLAYER_TEX, LOOK_W * HERO_FRAMES, LOOK_H * HERO_DIRS.length);
  drawLookSheet(ctx, look, worn);
  HERO_DIRS.forEach((dir, row) => {
    for (let f = 0; f < HERO_FRAMES; f++) tex.add(`${dir}-${f}`, 0, f * LOOK_W, row * LOOK_H, LOOK_W, LOOK_H);
  });
  tex.refresh();
  for (const dir of HERO_DIRS) {
    const key = `me-walk-${dir}`;
    if (scene.anims.exists(key)) scene.anims.remove(key);
    scene.anims.create({ key, frames: [1, 0, 2, 0].map((f) => ({ key: PLAYER_TEX, frame: `${dir}-${f}` })), frameRate: 9, repeat: -1 });
  }
}

function drawHeroSheet(scene: Phaser.Scene, key: string = TEX.hero, outfit: Outfit = HERO_OUTFIT) {
  const { tex, ctx } = canvasTexture(scene, key, TILE * HERO_FRAMES, TILE * HERO_DIRS.length);
  HERO_DIRS.forEach((dir, row) => {
    for (let f = 0; f < HERO_FRAMES; f++) {
      drawHero(ctx, f * TILE, row * TILE, dir, f, outfit);
      tex.add(`${dir}-${f}`, 0, f * TILE, row * TILE, TILE, TILE);
    }
  });
  tex.refresh();
}

// ---------------------------------------------------------------- slime

type Px = (x: number, y: number, w: number, h: number, c: string) => void;

/** A two-frame little creature (16×16, 'f0' and 'f1' a step later). */
function drawCritter(scene: Phaser.Scene, key: string, paint: (p: Px, f: number) => void) {
  const { tex, ctx } = canvasTexture(scene, key, TILE * 2, TILE);
  for (let f = 0; f < 2; f++) {
    const ox = f * TILE;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(ox + 8, 14.5, 5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    paint((x, y, w, h, c) => px(ctx, ox + x, y, w, h, c), f);
    tex.add(`f${f}`, 0, ox, 0, TILE, TILE);
  }
  tex.refresh();
}

/** Enemies: the imp (chochlik, TEX.slime for old saves' sake), dryad, zombie, skeleton. */
function drawSlimeSheet(scene: Phaser.Scene) {
  // Imp: a purple little devil with golden horns and a pointed tail.
  drawCritter(scene, TEX.slime, (p, f) => {
    const u = f; // hop
    p(12, 9 - u, 3, 1, OUTLINE); p(14, 7 - u, 1, 3, OUTLINE); p(13, 6 - u, 3, 2, OUTLINE); // tail
    p(3, 4 - u, 10, 10, OUTLINE);
    p(4, 5 - u, 8, 8, '#8a3ab8');
    p(5, 10 - u, 6, 3, '#c07ae0');
    p(3, 1 - u, 2, 4, OUTLINE); p(11, 1 - u, 2, 4, OUTLINE); // horns
    p(4, 2 - u, 1, 2, '#f7c531'); p(11, 2 - u, 1, 2, '#f7c531');
    p(5, 6 - u, 2, 2, '#ffffff'); p(9, 6 - u, 2, 2, '#ffffff');
    p(6, 7 - u, 1, 1, '#e02828'); p(9, 7 - u, 1, 1, '#e02828');
    p(6, 9 - u, 4, 1, OUTLINE); // grin
    p(4, 13, 2, 2, OUTLINE); p(10, 13, 2, 2, OUTLINE); // feet
  });
  // Dryad: a forest spirit with leafy hair and a pink flower.
  drawCritter(scene, TEX.dryad, (p, f) => {
    p(4, 1, 8, 7, OUTLINE); p(5, 2, 6, 5, '#2f7a2f'); // leafy hair
    p(3, 3, 2, 4, '#44a044'); p(11, 3, 2, 4, '#44a044');
    p(10, 1, 2, 2, '#f08ac0');
    p(5, 4, 6, 4, OUTLINE); p(6, 4, 4, 3, '#b8e8a0'); // face
    p(6, 5, 1, 1, OUTLINE); p(9, 5, 1, 1, OUTLINE);
    p(4, 8, 8, 6, OUTLINE); p(5, 8, 6, 5, '#4f9a3a'); p(5, 11, 6, 2, '#7bd35f'); // leaf dress
    p(2 + f, 8, 2, 4, OUTLINE); p(12 - f, 8, 2, 4, OUTLINE); // arms like branches
    p(5, 13, 2, 2, '#8a5a2b'); p(9, 13, 2, 2, '#8a5a2b');
  });
  // Zombie: a blue-skinned shuffler with its arms stretched out.
  drawCritter(scene, TEX.zombie, (p, f) => {
    p(4, 1, 8, 7, OUTLINE); p(5, 2, 6, 5, '#5a8ad8');
    p(5, 1, 6, 2, '#2b3f8a'); // hair
    p(6, 4, 1, 1, '#ffffff'); p(9, 4, 1, 1, '#ffffff');
    p(6, 6, 4, 1, '#2b3f8a');
    p(4, 7, 8, 6, OUTLINE); p(5, 8, 6, 4, '#4a4a6a'); p(7, 10, 2, 1, '#6a6a8a');
    p(0, 8 - f, 5, 2, OUTLINE); p(11, 8 + f, 5, 2, OUTLINE); // arms forward
    p(1, 8 - f, 3, 1, '#5a8ad8'); p(12, 8 + f, 3, 1, '#5a8ad8');
    p(5, 12, 2, 3, OUTLINE); p(9, 12, 2, 3, OUTLINE);
  });
  // Skeleton: white bones, dark eye holes, ribs.
  drawCritter(scene, TEX.skeleton, (p, f) => {
    p(4, 0, 8, 7, OUTLINE); p(5, 1, 6, 5, '#eeeedd');
    p(6, 3, 2, 2, OUTLINE); p(9, 3, 2, 2, OUTLINE);
    p(7, 5, 3, 1, '#9a9a88');
    p(5, 7, 6, 5, OUTLINE); p(6, 7, 4, 4, '#eeeedd');
    p(6, 8, 4, 1, OUTLINE); p(6, 10, 4, 1, OUTLINE); // ribs
    p(3, 7 + f, 2, 5, OUTLINE); p(11, 7 - f, 2, 5, OUTLINE); // arms
    p(3, 8 + f, 1, 3, '#eeeedd'); p(12, 8 - f, 1, 3, '#eeeedd');
    p(5 + f, 12, 2, 3, OUTLINE); p(9 - f, 12, 2, 3, OUTLINE);
    p(6 + f, 12, 1, 2, '#eeeedd'); p(9 - f, 12, 1, 2, '#eeeedd');
  });
}

/**
 * A red frame around every enemy, so they can't be mistaken for people: the
 * outermost pixels of the picture turn red.
 */
export function redOutline(scene: Phaser.Scene, key: string) {
  const tex = scene.textures.get(key) as Phaser.Textures.CanvasTexture;
  const ctx = tex.getContext?.();
  if (!ctx) return;
  const { width: w, height: h } = ctx.canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] >= 200;
  const edge: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!solid(x, y)) continue;
      if (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1)) edge.push((y * w + x) * 4);
    }
  }
  for (const i of edge) {
    d[i] = 225;
    d[i + 1] = 40;
    d[i + 2] = 40;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  tex.refresh();
}

// ---------------------------------------------------------------- effects & items

function drawSlash(scene: Phaser.Scene) {
  // A crescent pointing right; rotated in code to match facing.
  const { tex, ctx } = canvasTexture(scene, TEX.slash, 24, 24);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(6, 12, 11, -Math.PI / 2.4, Math.PI / 2.4);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(6, 12, 11, -Math.PI / 2.6, Math.PI / 2.6);
  ctx.stroke();
  tex.refresh();
}

function heartPath(ctx: Ctx, ox: number, oy: number, fill: string) {
  const rows = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === 'X') px(ctx, ox + x + 1, oy + y + 1, 1, 1, fill);
    });
  });
}

function drawHeart(scene: Phaser.Scene, key: string, full: boolean, color = '#e43b44', light = '#ffb3b8') {
  const { tex, ctx } = canvasTexture(scene, key, 9, 8);
  // outline: draw the shape offset in 4 directions, then the fill
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) heartPath(ctx, dx, dy, OUTLINE);
  heartPath(ctx, 0, 0, full ? color : '#4a3a4a');
  if (full) px(ctx, 2, 2, 1, 1, light);
  tex.refresh();
}

function drawCoin(scene: Phaser.Scene) {
  const { tex, ctx } = canvasTexture(scene, TEX.coin, 8, 8);
  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.arc(4, 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7c531';
  ctx.beginPath();
  ctx.arc(4, 4, 3, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, 4, 2, 1, 4, '#c98a1a');
  px(ctx, 2, 2, 1, 1, '#fff2a8');
  tex.refresh();
}

// Floating "!" above mission doors (gold = new/active, green tick = done).
function drawMarker(scene: Phaser.Scene, key: string, done: boolean) {
  const { tex, ctx } = canvasTexture(scene, key, 14, 18);
  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.arc(7, 7, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, 12);
  ctx.lineTo(10, 12);
  ctx.lineTo(7, 18);
  ctx.fill();
  ctx.fillStyle = done ? '#5ac85a' : '#f7c531';
  ctx.beginPath();
  ctx.arc(7, 7, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(5, 12);
  ctx.lineTo(9, 12);
  ctx.lineTo(7, 16);
  ctx.fill();
  if (done) {
    px(ctx, 3, 7, 2, 2, OUTLINE);
    px(ctx, 5, 9, 2, 2, OUTLINE);
    px(ctx, 7, 7, 2, 2, OUTLINE);
    px(ctx, 9, 5, 2, 2, OUTLINE);
  } else {
    px(ctx, 6, 2, 2, 7, OUTLINE);
    px(ctx, 6, 10, 2, 2, OUTLINE);
  }
  tex.refresh();
}

// Arrow pointing right; rotated on screen towards the current goal.
function drawArrow(scene: Phaser.Scene) {
  const { tex, ctx } = canvasTexture(scene, TEX.arrow, 16, 16);
  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.moveTo(15, 8);
  ctx.lineTo(1, 1);
  ctx.lineTo(5, 8);
  ctx.lineTo(1, 15);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f7c531';
  ctx.beginPath();
  ctx.moveTo(13, 8);
  ctx.lineTo(3, 3);
  ctx.lineTo(6, 8);
  ctx.lineTo(3, 13);
  ctx.closePath();
  ctx.fill();
  tex.refresh();
}

// Hanging signs over shop and school doors.
/** The hero's home at the start point, and the "?" over a riddle-giver. */
function drawHome(scene: Phaser.Scene) {
  {
    const { tex, ctx } = canvasTexture(scene, TEX.home, 26, 24);
    // Roof, drawn as widening rows.
    for (let r = 0; r < 10; r++) {
      const w = 6 + r * 2;
      px(ctx, 13 - w / 2, r, w, 1, OUTLINE);
      if (r > 0) px(ctx, 13 - w / 2 + 1, r, w - 2, 1, r % 3 === 0 ? '#a8432f' : '#c75b4a');
    }
    px(ctx, 18, 1, 3, 5, OUTLINE);
    px(ctx, 19, 2, 1, 4, '#8d6e63');
    // Walls, door and a window.
    px(ctx, 3, 10, 20, 13, OUTLINE);
    px(ctx, 4, 10, 18, 12, '#f3e2a0');
    px(ctx, 10, 14, 6, 8, OUTLINE);
    px(ctx, 11, 15, 4, 7, '#8a5a2b');
    px(ctx, 14, 18, 1, 1, '#f7c531');
    px(ctx, 5, 13, 4, 4, OUTLINE);
    px(ctx, 6, 14, 2, 2, '#9be7ff');
    px(ctx, 17, 13, 4, 4, OUTLINE);
    px(ctx, 18, 14, 2, 2, '#9be7ff');
    px(ctx, 2, 22, 22, 2, '#6d6560');
    tex.refresh();
  }
  {
    const { tex, ctx } = canvasTexture(scene, TEX.bubble, 9, 11);
    px(ctx, 0, 0, 9, 9, OUTLINE);
    px(ctx, 1, 1, 7, 7, '#ffffff');
    px(ctx, 3, 9, 3, 2, OUTLINE);
    px(ctx, 4, 8, 1, 1, '#ffffff');
    // "?"
    px(ctx, 3, 2, 3, 1, '#3f7fd8');
    px(ctx, 5, 3, 1, 1, '#3f7fd8');
    px(ctx, 4, 4, 1, 1, '#3f7fd8');
    px(ctx, 4, 6, 1, 1, '#3f7fd8');
    tex.refresh();
  }
}

/** The travelling merchant's cart: a striped canopy over a wooden wagon. */
function drawCart(scene: Phaser.Scene) {
  const { tex, ctx } = canvasTexture(scene, TEX.cart, 22, 20);
  px(ctx, 1, 1, 20, 6, OUTLINE);
  for (let i = 0; i < 5; i++) px(ctx, 2 + i * 4, 2, 4, 4, i % 2 ? '#fff6e0' : '#e43b44');
  px(ctx, 3, 7, 1, 5, OUTLINE);
  px(ctx, 18, 7, 1, 5, OUTLINE);
  px(ctx, 1, 11, 20, 5, OUTLINE);
  px(ctx, 2, 12, 18, 3, '#9c6b3e');
  px(ctx, 5, 9, 3, 3, '#e43b44'); // apples on display
  px(ctx, 9, 9, 3, 3, '#f7c531');
  px(ctx, 13, 9, 3, 3, '#3fa34d');
  px(ctx, 3, 15, 5, 5, OUTLINE);
  px(ctx, 4, 16, 3, 3, '#6b4423');
  px(ctx, 14, 15, 5, 5, OUTLINE);
  px(ctx, 15, 16, 3, 3, '#6b4423');
  tex.refresh();
}

/** The coachman's horse and cart at a railway station (horse facing left). */
function drawCoach(scene: Phaser.Scene) {
  const { tex, ctx } = canvasTexture(scene, TEX.coach, 30, 20);
  // Horse
  px(ctx, 1, 4, 5, 4, OUTLINE); // head
  px(ctx, 2, 5, 3, 2, '#8a5a2b');
  px(ctx, 4, 3, 2, 2, OUTLINE); // ear
  px(ctx, 5, 6, 3, 3, OUTLINE); // neck
  px(ctx, 5, 7, 2, 2, '#8a5a2b');
  px(ctx, 6, 8, 10, 6, OUTLINE); // body
  px(ctx, 7, 9, 8, 4, '#a0683a');
  px(ctx, 6, 7, 3, 2, '#3a2416'); // mane
  px(ctx, 7, 14, 2, 5, OUTLINE); // legs
  px(ctx, 13, 14, 2, 5, OUTLINE);
  px(ctx, 16, 9, 2, 4, '#3a2416'); // tail
  // Cart with the coachman
  px(ctx, 16, 11, 3, 1, OUTLINE); // shaft
  px(ctx, 18, 8, 11, 7, OUTLINE);
  px(ctx, 19, 9, 9, 5, '#9c6b3e');
  px(ctx, 22, 2, 5, 7, OUTLINE); // coachman
  px(ctx, 23, 3, 3, 2, '#f2c39b');
  px(ctx, 22, 1, 5, 2, '#1e1a24'); // hat
  px(ctx, 23, 5, 3, 3, '#3b5dc9');
  px(ctx, 19, 14, 6, 6, OUTLINE); // wheel
  px(ctx, 20, 15, 4, 4, '#6b4423');
  px(ctx, 21, 16, 2, 2, OUTLINE);
  tex.refresh();
}

/** A black-and-white dog (facing right) and its pink rubber piggy. */
function drawDog(scene: Phaser.Scene) {
  {
    const { tex, ctx } = canvasTexture(scene, TEX.dog, 16, 12);
    px(ctx, 2, 3, 11, 6, OUTLINE); // body outline
    px(ctx, 3, 4, 9, 4, '#ffffff');
    px(ctx, 5, 4, 3, 3, '#222');
    px(ctx, 10, 1, 5, 5, OUTLINE); // head
    px(ctx, 11, 2, 3, 3, '#ffffff');
    px(ctx, 11, 1, 1, 2, '#222'); // ear
    px(ctx, 13, 3, 1, 1, '#222'); // eye
    px(ctx, 15, 4, 1, 1, '#222'); // nose
    px(ctx, 0, 3, 3, 1, OUTLINE); // tail
    px(ctx, 3, 9, 2, 3, OUTLINE); // legs
    px(ctx, 9, 9, 2, 3, OUTLINE);
    px(ctx, 3, 9, 1, 2, '#ffffff');
    px(ctx, 9, 9, 1, 2, '#ffffff');
    tex.refresh();
  }
  {
    const { tex, ctx } = canvasTexture(scene, TEX.piggy, 10, 8);
    px(ctx, 1, 1, 8, 6, OUTLINE);
    px(ctx, 2, 2, 6, 4, '#ff9ecb');
    px(ctx, 7, 3, 3, 2, OUTLINE);
    px(ctx, 8, 3, 1, 1, '#ff7ab3');
    px(ctx, 6, 2, 1, 1, '#222');
    px(ctx, 2, 0, 2, 1, OUTLINE);
    px(ctx, 2, 7, 1, 1, OUTLINE);
    px(ctx, 6, 7, 1, 1, OUTLINE);
    tex.refresh();
  }
}

function drawSigns(scene: Phaser.Scene) {
  {
    // Shop: a sword on a blue sign.
    const { tex, ctx } = canvasTexture(scene, TEX.signShop, 14, 12);
    px(ctx, 0, 0, 14, 12, OUTLINE);
    px(ctx, 1, 1, 12, 10, '#3f7fd8');
    px(ctx, 2, 2, 10, 1, '#7fb4f0');
    px(ctx, 6, 3, 2, 6, '#e8e8f0');
    px(ctx, 4, 8, 6, 1, '#f7c531');
    px(ctx, 6, 9, 2, 2, '#8a5a2b');
    tex.refresh();
  }
  {
    // School: an open book on a red sign.
    const { tex, ctx } = canvasTexture(scene, TEX.signSchool, 14, 12);
    px(ctx, 0, 0, 14, 12, OUTLINE);
    px(ctx, 1, 1, 12, 10, '#b84a3a');
    px(ctx, 2, 2, 10, 1, '#e07a66');
    px(ctx, 3, 4, 4, 5, '#fff6e0');
    px(ctx, 7, 4, 4, 5, '#f0e2c0');
    px(ctx, 6, 4, 2, 5, OUTLINE);
    px(ctx, 4, 5, 2, 1, '#888');
    px(ctx, 8, 5, 2, 1, '#888');
    px(ctx, 4, 7, 2, 1, '#888');
    px(ctx, 8, 7, 2, 1, '#888');
    tex.refresh();
  }
}

// Small square signs for the other public buildings.
function drawSign(scene: Phaser.Scene, key: string, bg: string, light: string, glyph: (p: (x: number, y: number, w: number, h: number, c: string) => void) => void) {
  const { tex, ctx } = canvasTexture(scene, key, 14, 12);
  const p = (x: number, y: number, w: number, h: number, c: string) => px(ctx, x, y, w, h, c);
  p(0, 0, 14, 12, OUTLINE);
  p(1, 1, 12, 10, bg);
  p(2, 2, 10, 1, light);
  glyph(p);
  tex.refresh();
}

function drawMoreSigns(scene: Phaser.Scene) {
  drawSign(scene, TEX.signChurch, '#7a5ab8', '#a88be0', (p) => {
    p(6, 3, 2, 7, '#fff2a8');
    p(4, 5, 6, 2, '#fff2a8');
  });
  drawSign(scene, TEX.signOffice, '#c8c8d0', '#ffffff', (p) => {
    p(3, 4, 8, 1, '#8a2b2b');
    p(4, 5, 1, 4, '#5a5a66');
    p(6, 5, 1, 4, '#5a5a66');
    p(8, 5, 1, 4, '#5a5a66');
    p(10, 5, 1, 4, '#5a5a66');
    p(3, 9, 8, 1, '#5a5a66');
  });
  drawSign(scene, TEX.signHospital, '#ffffff', '#ffffff', (p) => {
    p(6, 3, 2, 7, '#e43b44');
    p(3, 5, 8, 2, '#e43b44');
  });
  drawSign(scene, TEX.signPolice, '#2b3f8a', '#4f67c0', (p) => {
    p(5, 3, 4, 1, '#f7c531');
    p(4, 4, 6, 4, '#f7c531');
    p(5, 8, 4, 1, '#f7c531');
    p(6, 9, 2, 1, '#f7c531');
    p(6, 5, 2, 2, '#2b3f8a');
  });
}

// Fruit trees (frame 'full' with fruit, 'bare' once picked) and fruit items.
function drawFruitTree(scene: Phaser.Scene, key: string, fruit: string, fruitLight: string) {
  const W = 22, H = 24;
  const { tex, ctx } = canvasTexture(scene, key, W * 2, H);
  for (let f = 0; f < 2; f++) {
    const ox = f * W;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(ox + 11, 22, 7, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    px(ctx, ox + 9, 14, 4, 8, OUTLINE);
    px(ctx, ox + 10, 14, 2, 7, '#8a5a2b');
    for (const [c, r] of [[OUTLINE, 10], ['#2f7a2f', 9], ['#44a044', 6]] as const) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(ox + 11 - (r === 6 ? 2 : 0), 10 - (r === 6 ? 2 : 0), r, 0, Math.PI * 2);
      ctx.fill();
    }
    px(ctx, ox + 6, 4, 3, 2, '#7bd35f');
    if (f === 0) {
      for (const [x, y] of [[6, 9], [13, 6], [15, 12], [9, 14], [11, 9]]) {
        px(ctx, ox + x - 1, y - 1, 4, 4, OUTLINE);
        px(ctx, ox + x, y, 2, 2, fruit);
        px(ctx, ox + x, y, 1, 1, fruitLight);
      }
    }
    tex.add(f === 0 ? 'full' : 'bare', 0, ox, 0, W, H);
  }
  tex.refresh();
}

function drawVine(scene: Phaser.Scene) {
  const W = 20, H = 18;
  const { tex, ctx } = canvasTexture(scene, TEX.vine, W * 2, H);
  for (let f = 0; f < 2; f++) {
    const ox = f * W;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(ox + 2, 15, 16, 2);
    // trellis posts and wire
    px(ctx, ox + 2, 3, 2, 13, OUTLINE);
    px(ctx, ox + 16, 3, 2, 13, OUTLINE);
    px(ctx, ox + 2, 5, 16, 1, '#6b4423');
    // leaves
    for (const [x, y] of [[5, 4], [9, 3], [13, 4], [7, 8], [11, 8]]) {
      px(ctx, ox + x - 1, y - 1, 5, 5, OUTLINE);
      px(ctx, ox + x, y, 3, 3, '#4f9a3a');
    }
    if (f === 0) {
      for (const [x, y] of [[6, 11], [12, 11]]) {
        for (const [dx, dy] of [[0, 0], [2, 0], [1, 2], [0, 1], [2, 1], [1, 3]]) px(ctx, ox + x + dx, y + dy, 1, 1, '#6a3f9a');
        px(ctx, ox + x, y, 1, 1, '#b48be0');
      }
    }
    tex.add(f === 0 ? 'full' : 'bare', 0, ox, 0, W, H);
  }
  tex.refresh();
}

function drawFruitItem(scene: Phaser.Scene, key: string, color: string, light: string, grape = false) {
  const { tex, ctx } = canvasTexture(scene, key, 8, 8);
  if (grape) {
    for (const [x, y] of [[1, 1], [4, 1], [2, 3], [5, 3], [3, 5]]) {
      px(ctx, x - 1, y - 1, 4, 4, OUTLINE);
      px(ctx, x, y, 2, 2, color);
    }
    px(ctx, 1, 1, 1, 1, light);
  } else {
    ctx.fillStyle = OUTLINE;
    ctx.beginPath();
    ctx.arc(4, 4.5, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(4, 4.5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    px(ctx, 3, 3, 1, 1, light);
    px(ctx, 4, 0, 1, 2, '#6b4423');
  }
  tex.refresh();
}

/** The dragon (facing left, wings up 'f0' and down 'f1') and a big "!" over a head. */
function drawDragon(scene: Phaser.Scene) {
  const W = 40, H = 30;
  const { tex, ctx } = canvasTexture(scene, TEX.dragon, W * 2, H);
  for (let f = 0; f < 2; f++) {
    const o = f * W;
    const body = '#3f9a4a', light = '#6fd06a', belly = '#e8d27a';
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(o + 21, 27, 13, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // wing
    if (f === 0) {
      px(ctx, o + 16, 1, 16, 12, OUTLINE);
      px(ctx, o + 17, 2, 14, 10, '#2f7a3a');
      px(ctx, o + 20, 2, 1, 10, OUTLINE);
      px(ctx, o + 25, 2, 1, 10, OUTLINE);
    } else {
      px(ctx, o + 16, 11, 18, 7, OUTLINE);
      px(ctx, o + 17, 12, 16, 5, '#2f7a3a');
    }
    // tail
    px(ctx, o + 29, 17, 10, 4, OUTLINE);
    px(ctx, o + 30, 18, 8, 2, body);
    px(ctx, o + 36, 15, 3, 3, OUTLINE);
    // body
    px(ctx, o + 13, 13, 18, 11, OUTLINE);
    px(ctx, o + 14, 14, 16, 9, body);
    px(ctx, o + 15, 19, 13, 4, belly);
    px(ctx, o + 15, 14, 8, 2, light);
    // neck and head
    px(ctx, o + 8, 9, 8, 8, OUTLINE);
    px(ctx, o + 9, 10, 6, 6, body);
    px(ctx, o + 1, 6, 11, 8, OUTLINE);
    px(ctx, o + 2, 7, 9, 6, body);
    px(ctx, o + 2, 11, 4, 2, belly);
    px(ctx, o + 5, 8, 2, 2, '#fff3a0');
    px(ctx, o + 6, 8, 1, 1, OUTLINE);
    px(ctx, o + 8, 4, 2, 3, OUTLINE); // horn
    px(ctx, o + 2, 12, 1, 1, OUTLINE); // nostril
    // legs
    px(ctx, o + 15, 23, 4, 4, OUTLINE);
    px(ctx, o + 25, 23, 4, 4, OUTLINE);
    px(ctx, o + 16, 23, 2, 3, body);
    px(ctx, o + 26, 23, 2, 3, body);
    tex.add(`f${f}`, 0, o, 0, W, H);
  }
  tex.refresh();
  const ex = canvasTexture(scene, TEX.exclaim, 8, 14);
  px(ex.ctx, 1, 0, 6, 14, OUTLINE);
  px(ex.ctx, 2, 1, 4, 8, '#f7c531');
  px(ex.ctx, 2, 10, 4, 3, '#f7c531');
  ex.tex.refresh();
}

/** A red toadstool-like bolete (to pick up) and a log of wood. */
function drawForestItems(scene: Phaser.Scene) {
  {
    const { tex, ctx } = canvasTexture(scene, TEX.mushroom, 8, 8);
    px(ctx, 1, 1, 6, 4, OUTLINE);
    px(ctx, 0, 2, 8, 2, OUTLINE);
    px(ctx, 1, 2, 6, 2, '#a0522d');
    px(ctx, 2, 1, 4, 1, '#c8743f');
    px(ctx, 2, 2, 1, 1, '#e8a060');
    px(ctx, 2, 4, 4, 4, OUTLINE);
    px(ctx, 3, 4, 2, 3, '#f3e2c0');
    tex.refresh();
  }
  {
    const { tex, ctx } = canvasTexture(scene, TEX.log, 10, 6);
    px(ctx, 0, 0, 10, 6, OUTLINE);
    px(ctx, 1, 1, 7, 4, '#8a5a2b');
    px(ctx, 1, 2, 7, 1, '#6b4423');
    px(ctx, 8, 1, 1, 4, '#e8c890');
    px(ctx, 8, 2, 1, 2, '#c8a060');
    tex.refresh();
  }
  {
    // A pine to cut down: 'full' and a 'stump'.
    const W = 16, H = 26;
    const { tex, ctx } = canvasTexture(scene, TEX.pine, W * 2, H);
    for (let f = 0; f < 2; f++) {
      const ox = f * W;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(ox + 8, 24, 5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      if (f === 0) {
        px(ctx, ox + 6, 18, 4, 6, OUTLINE);
        px(ctx, ox + 7, 18, 2, 5, '#6b4423');
        for (const [y, w] of [[1, 4], [5, 8], [9, 12], [13, 14]]) {
          px(ctx, ox + 8 - w / 2 - 1, y, w + 2, 6, OUTLINE);
          px(ctx, ox + 8 - w / 2, y + 1, w, 4, '#2a6a3a');
          px(ctx, ox + 8 - w / 2, y + 1, w / 2, 1, '#3f8f4f');
        }
      } else {
        px(ctx, ox + 5, 20, 6, 4, OUTLINE);
        px(ctx, ox + 6, 21, 4, 2, '#8a5a2b');
        px(ctx, ox + 6, 20, 4, 1, '#e8c890');
      }
      tex.add(f === 0 ? 'full' : 'stump', 0, ox, 0, W, H);
    }
    tex.refresh();
  }
}

// Projectiles (pointing right, rotated in flight) and training stations.
function drawCombatExtras(scene: Phaser.Scene) {
  {
    const { tex, ctx } = canvasTexture(scene, TEX.arrowShot, 12, 5);
    px(ctx, 0, 1, 2, 1, '#e8e8f0');
    px(ctx, 0, 3, 2, 1, '#e8e8f0');
    px(ctx, 1, 2, 9, 1, '#8a5a2b');
    px(ctx, 9, 1, 2, 3, '#c0c4cc');
    px(ctx, 11, 2, 1, 1, '#c0c4cc');
    tex.refresh();
  }
  {
    const { tex, ctx } = canvasTexture(scene, TEX.magicShot, 10, 10);
    const g = ctx.createRadialGradient(5, 5, 0, 5, 5, 5);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, '#9be7ff');
    g.addColorStop(1, 'rgba(90,120,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 10, 10);
    tex.refresh();
  }
  {
    // Straw training dummy on a pole.
    const { tex, ctx } = canvasTexture(scene, TEX.dummy, 14, 20);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(3, 18, 8, 2);
    px(ctx, 6, 10, 2, 9, OUTLINE);
    px(ctx, 1, 7, 12, 3, OUTLINE);
    px(ctx, 2, 8, 10, 1, '#c9a14a');
    px(ctx, 3, 5, 8, 8, OUTLINE);
    px(ctx, 4, 6, 6, 6, '#e0bd5c');
    px(ctx, 4, 0, 6, 6, OUTLINE);
    px(ctx, 5, 1, 4, 4, '#e8cc7a');
    px(ctx, 6, 2, 1, 1, OUTLINE);
    px(ctx, 8, 2, 1, 1, OUTLINE);
    px(ctx, 4, 9, 6, 1, '#a33d3d');
    tex.refresh();
  }
  {
    // Archery target on a stand.
    const { tex, ctx } = canvasTexture(scene, TEX.target, 16, 20);
    px(ctx, 3, 12, 2, 8, OUTLINE);
    px(ctx, 11, 12, 2, 8, OUTLINE);
    for (const [r, c] of [[8, OUTLINE], [7, '#ffffff'], [5, '#e43b44'], [3, '#ffffff'], [1.5, '#e43b44']] as const) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(8, 8, r, 0, Math.PI * 2);
      ctx.fill();
    }
    tex.refresh();
  }
  {
    // Magic practice crystal on a stone.
    const { tex, ctx } = canvasTexture(scene, TEX.crystal, 14, 20);
    px(ctx, 2, 15, 10, 5, OUTLINE);
    px(ctx, 3, 16, 8, 3, '#8b8f9a');
    ctx.fillStyle = OUTLINE;
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(12, 7);
    ctx.lineTo(7, 16);
    ctx.lineTo(2, 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5fc8ff';
    ctx.beginPath();
    ctx.moveTo(7, 2);
    ctx.lineTo(10.5, 7);
    ctx.lineTo(7, 14);
    ctx.lineTo(3.5, 7);
    ctx.closePath();
    ctx.fill();
    px(ctx, 5, 5, 2, 3, '#d8f3ff');
    tex.refresh();
  }
  drawSign(scene, TEX.signBank, '#b8902a', '#f0cc5a', (p) => {
    // A gold coin.
    p(4, 3, 6, 8, '#1e1a24');
    p(3, 4, 8, 6, '#1e1a24');
    p(4, 4, 6, 6, '#f7c531');
    p(5, 5, 1, 4, '#fff3a0');
    p(7, 5, 1, 4, '#b8902a');
  });
  drawSign(scene, TEX.signHotel, '#8a3a6a', '#c86aa0', (p) => {
    // A bed with a pillow.
    p(2, 5, 1, 6, '#fff6e0');
    p(3, 6, 3, 2, '#ffffff');
    p(3, 8, 8, 2, '#e07a66');
    p(11, 7, 1, 4, '#fff6e0');
  });
  drawSign(scene, TEX.signLibrary, '#2f8a6a', '#5fc09a', (p) => {
    p(3, 3, 2, 7, '#fff6e0');
    p(5, 4, 2, 6, '#f7c531');
    p(7, 3, 2, 7, '#e07a66');
    p(9, 5, 2, 5, '#9be7ff');
  });
}

export function createArt(scene: Phaser.Scene) {
  drawCombatExtras(scene);
  drawFruitTree(scene, TEX.treeApple, '#e43b44', '#ffb3b8');
  drawFruitTree(scene, TEX.treePlum, '#5b3a9a', '#a88be0');
  drawVine(scene);
  drawFruitItem(scene, TEX.fruitApple, '#e43b44', '#ffb3b8');
  drawForestItems(scene);
  drawDragon(scene);
  drawFruitItem(scene, TEX.fruitPlum, '#5b3a9a', '#a88be0');
  drawFruitItem(scene, TEX.fruitGrape, '#6a3f9a', '#b48be0', true);
  drawSigns(scene);
  drawHome(scene);
  drawDog(scene);
  drawCart(scene);
  drawCoach(scene);
  drawMoreSigns(scene);
  drawHeroSheet(scene, TEX.bandit, BANDIT_OUTFIT);
  drawMarker(scene, TEX.marker, false);
  drawMarker(scene, TEX.markerDone, true);
  drawArrow(scene);
  drawTiles(scene);
  drawHeroSheet(scene);
  drawSlimeSheet(scene);
  drawSlash(scene);
  drawHeart(scene, TEX.heart, true);
  drawHeart(scene, TEX.heartEmpty, false);
  drawHeart(scene, TEX.pickupHeart, true);
  drawHeart(scene, TEX.heartDuel, true, '#9a4ad8', '#d8b0ff');
  drawHeart(scene, TEX.heartDuelEmpty, false);
  drawCoin(scene);
  for (const k of [TEX.slime, TEX.dryad, TEX.zombie, TEX.skeleton, TEX.bandit, TEX.dragon]) redOutline(scene, k);
}
