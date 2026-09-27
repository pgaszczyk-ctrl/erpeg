// The game's name drawn in a tiny pixel font (5×7 letters), gold with a dark
// outline and a shadow, enlarged without smoothing. A placeholder logo:
// change GAME_NAME (and add letters to FONT if needed).

export const GAME_NAME = 'EXP-LORE';

const FONT: Record<string, string[]> = {
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  '-': ['000', '000', '000', '111', '000', '000', '000'],
  ' ': ['000', '000', '000', '000', '000', '000', '000'],
};

/** The logo as a canvas: `scale` screen pixels per font pixel. */
export function pixelLogo(text = GAME_NAME, scale = 4): HTMLCanvasElement {
  const glyphs = [...text.toUpperCase()].map((ch) => FONT[ch] ?? FONT[' ']);
  const w = glyphs.reduce((a, g) => a + g[0].length + 1, 0) - 1;
  const h = 7;
  // 1 px outline all round, 1 px shadow below.
  const W = w + 2, H = h + 3;
  const small = document.createElement('canvas');
  small.width = W;
  small.height = H;
  const ctx = small.getContext('2d')!;
  const on = (x: number, y: number) => {
    let gx = 0;
    for (const g of glyphs) {
      const gw = g[0].length;
      if (x >= gx && x < gx + gw) return y >= 0 && y < h && g[y][x - gx] === '1';
      gx += gw + 1;
    }
    return false;
  };
  const px = (x: number, y: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  };
  // A soft shadow one pixel lower, the outline, then the letters (lighter on top, darker at the bottom).
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on(x, y)) px(x + 1, y + 3, 'rgba(0,0,0,0.55)');
  for (let y = -1; y <= h; y++)
    for (let x = -1; x <= w; x++) {
      const near = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => on(x + dx, y + dy));
      if (near) px(x + 1, y + 1, '#1e1a24');
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (on(x, y)) px(x + 1, y + 1, y < 2 ? '#fff0a0' : y < 5 ? '#f7c531' : '#d98e1c');
  const big = document.createElement('canvas');
  big.width = W * scale;
  big.height = H * scale;
  const b = big.getContext('2d')!;
  b.imageSmoothingEnabled = false;
  b.drawImage(small, 0, 0, big.width, big.height);
  big.className = 'm-logo';
  big.setAttribute('role', 'img');
  big.setAttribute('aria-label', text);
  return big;
}
