import Phaser from 'phaser';
import { rng } from './rng';

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
  treeApple: 'tree-apple',
  treePlum: 'tree-plum',
  vine: 'vine',
  fruitApple: 'fruit-apple',
  fruitPlum: 'fruit-plum',
  fruitGrape: 'fruit-grape',
  signShop: 'sign-shop',
  signChurch: 'sign-church',
  signOffice: 'sign-office',
  signHospital: 'sign-hospital',
  signPolice: 'sign-police',
  signSchool: 'sign-school',
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

function drawSlimeSheet(scene: Phaser.Scene) {
  const { tex, ctx } = canvasTexture(scene, TEX.slime, TILE * 2, TILE);
  for (let f = 0; f < 2; f++) {
    const ox = f * TILE;
    const sq = f === 1 ? 1 : 0; // squashed frame: wider and lower
    const blob = (grow: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(ox + 8, 10 + sq, 6 + sq + grow, 7 - sq * 1.5 + grow, 0, Math.PI, 0);
      ctx.lineTo(ox + 14 + sq + grow, 14 + grow * 0.5);
      ctx.lineTo(ox + 2 - sq - grow, 14 + grow * 0.5);
      ctx.closePath();
      ctx.fill();
    };
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(ox + 8, 14.5, 6 + sq, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    blob(1, OUTLINE);
    blob(0, '#b455d6');
    px(ctx, ox + 3, 12, 10 + sq, 2, '#8f3cb0');
    px(ctx, ox + 4, 5 + sq * 2, 2, 2, '#e3a6f5');
    px(ctx, ox + 5, 8 + sq, 2, 3, OUTLINE);
    px(ctx, ox + 9, 8 + sq, 2, 3, OUTLINE);
    px(ctx, ox + 5, 8 + sq, 1, 1, '#ffffff');
    px(ctx, ox + 9, 8 + sq, 1, 1, '#ffffff');
    tex.add(`f${f}`, 0, ox, 0, TILE, TILE);
  }
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

function drawHeart(scene: Phaser.Scene, key: string, full: boolean) {
  const { tex, ctx } = canvasTexture(scene, key, 9, 8);
  // outline: draw the shape offset in 4 directions, then the fill
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) heartPath(ctx, dx, dy, OUTLINE);
  heartPath(ctx, 0, 0, full ? '#e43b44' : '#4a3a4a');
  if (full) px(ctx, 2, 2, 1, 1, '#ffb3b8');
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

export function createArt(scene: Phaser.Scene) {
  drawFruitTree(scene, TEX.treeApple, '#e43b44', '#ffb3b8');
  drawFruitTree(scene, TEX.treePlum, '#5b3a9a', '#a88be0');
  drawVine(scene);
  drawFruitItem(scene, TEX.fruitApple, '#e43b44', '#ffb3b8');
  drawFruitItem(scene, TEX.fruitPlum, '#5b3a9a', '#a88be0');
  drawFruitItem(scene, TEX.fruitGrape, '#6a3f9a', '#b48be0', true);
  drawSigns(scene);
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
  drawCoin(scene);
}
