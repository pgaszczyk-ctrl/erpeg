// A repeatable paper and paint texture. All fragments share the same grain so
// that country fills and the water look painted on the same sheet.
export const atlasInk = '#624424';
export const atlasWater = '#3b9391';

function random(seed: number) {
  return () => {
    seed = Math.imul(1664525, seed) + 1013904223 | 0;
    return (seed >>> 0) / 4294967296;
  };
}

function paintTile(color: string, shade: string) {
  const tile = document.createElement('canvas');
  const edge = 512;
  tile.width = tile.height = edge;
  const g = tile.getContext('2d')!;
  const rand = random(1489);
  g.fillStyle = color;
  g.fillRect(0, 0, tile.width, tile.height);
  for (let i = 0; i < 70; i++) {
    const x = rand() * tile.width;
    const y = rand() * tile.height;
    const radius = 16 + rand() * 69;
    for (const dx of [-edge, 0, edge]) for (const dy of [-edge, 0, edge]) {
      const wash = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, radius);
      wash.addColorStop(0, i % 3 === 0 ? '#fff2bf40' : shade);
      wash.addColorStop(1, '#ffffff00');
      g.fillStyle = wash;
      g.fillRect(x + dx - radius, y + dy - radius, radius * 2, radius * 2);
    }
  }
  const grain = g.getImageData(0, 0, tile.width, tile.height);
  for (let i = 0; i < grain.data.length; i += 4) {
    const value = Math.floor(rand() * 14) - 7;
    for (let j = 0; j < 3; j++) grain.data[i + j] += value;
  }
  g.putImageData(grain, 0, 0);
  return tile;
}

let tiles: [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement] | null = null;
const palettes = new WeakMap<CanvasRenderingContext2D, { sea: CanvasPattern; land: CanvasPattern; country: CanvasPattern }>();
export function atlasPaint(g: CanvasRenderingContext2D) {
  const cached = palettes.get(g);
  if (cached) return cached;
  tiles ??= [
    paintTile('#9bcec1', '#248c9150'),
    paintTile('#d7c286', '#98a05264'),
    paintTile('#eed082', '#9ca74979'),
  ];
  const [sea, land, country] = tiles.map((tile) => g.createPattern(tile, 'repeat')!);
  const palette = { sea, land, country };
  palettes.set(g, palette);
  return palette;
}

let sheet: HTMLImageElement | undefined;
let loading: Promise<void> | undefined;

/** Shared transparent brush stamps. This art is optional on slow connections. */
export function loadAtlasSymbols() {
  if (!loading) {
    const img = new Image();
    img.src = new URL('loading36/atlas/symbols.webp', document.baseURI).href;
    loading = img.decode().then(() => { sheet = img; }, () => {});
  }
  return loading;
}

function stamp(g: CanvasRenderingContext2D, cell: number, x: number, y: number, size: number) {
  if (!sheet) return false;
  const w = sheet.naturalWidth / 2, h = sheet.naturalHeight / 2;
  g.drawImage(sheet, cell % 2 * w, Math.floor(cell / 2) * h, w, h, x - size / 2, y - size * .76, size, size);
  return true;
}

export function atlasWaves(g: CanvasRenderingContext2D, x: number, y: number, size: number) {
  if (stamp(g, 3, x, y, size * 33)) return;
  g.beginPath();
  g.moveTo(x - 9 * size, y);
  g.quadraticCurveTo(x - 4 * size, y - 3 * size, x + 1 * size, y);
  g.quadraticCurveTo(x + 6 * size, y + 3 * size, x + 12 * size, y);
  g.strokeStyle = '#4c969083';
  g.lineWidth = .7;
  g.stroke();
}

function polygon(g: CanvasRenderingContext2D, points: readonly number[], color: string, outline = false) {
  g.beginPath();
  g.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
  g.closePath();
  g.fillStyle = color;
  g.fill();
  if (outline) g.stroke();
}

export function atlasTrees(g: CanvasRenderingContext2D, x: number, y: number, size: number) {
  if (stamp(g, 0, x, y, 39 * size)) return;
  g.save();
  g.translate(x, y);
  g.scale(size, size);
  g.lineWidth = .7;
  g.strokeStyle = '#475428';
  g.lineJoin = 'round';
  for (const [a, b, h] of [[-5, 2, .8], [5, 2, .72], [0, 0, 1]]) {
    g.save();
    g.translate(a, b);
    g.scale(h, h);
    g.fillStyle = '#70542b';
    g.fillRect(-.9, -3, 1.8, 5);
    polygon(g, [0, -12, 3, -6, 2, -6, 5, -1, 1, 0, -4, -1, -2, -5, -3, -5], '#607f3e', true);
    polygon(g, [0, -11, -1, -5, -3, -2, 0, -3, 1, -7], '#a9ac50');
    g.restore();
  }
  g.restore();
}

export function atlasPeaks(g: CanvasRenderingContext2D, x: number, y: number, size: number, snow: boolean) {
  if (snow && stamp(g, 1, x, y, 64 * size)) return;
  g.save();
  g.translate(x, y);
  g.scale(size, size);
  g.lineJoin = 'round';
  g.lineWidth = .72;
  g.strokeStyle = '#73502e';
  polygon(g, [-15, 2, -7, -11, 0, -4, 6, -16, 17, 2, 11, 4, 2, 3, -5, 4], '#af7844', true);
  polygon(g, [-13, 1, -7, -10, -5, -4, -2, 2], '#d7ab6a');
  polygon(g, [0, 1, 6, -15, 7, -8, 13, 2, 8, 1, 6, -1], '#d7ab6a');
  if (snow) {
    polygon(g, [-10, -5, -7, -10, -4, -6, -6, -7, -7, -5, -8, -6], '#fff0d2');
    polygon(g, [2, -7, 6, -15, 11, -8, 8, -9, 7, -7, 5, -9], '#fff0d2');
  }
  g.restore();
}

export function atlasSteamship(g: CanvasRenderingContext2D, x: number, y: number, size: number) {
  if (stamp(g, 2, x, y, 91 * size)) return;
  g.save();
  g.translate(x, y);
  g.scale(size, size);
  g.strokeStyle = atlasInk;
  g.lineWidth = 1;
  g.lineJoin = 'round';
  g.fillStyle = '#fdf0d8';
  for (const [cx, cy, radius] of [[-4, -11, 2.2], [-9, -14, 3], [-15, -15, 3.7]]) {
    g.beginPath();
    g.arc(cx, cy, radius, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  polygon(g, [-13, 0, -11, -5, 7, -5, 11, 0], '#f1d38b', true);
  polygon(g, [-5, -5, -5, -10, -2, -10, -2, -5], '#694328', true);
  polygon(g, [-18, 0, 19, 0, 12, 6, -11, 6], '#855334', true);
  g.beginPath();
  g.arc(1, 2, 4.3, 0, Math.PI * 2);
  g.fillStyle = '#d5983c';
  g.fill();
  g.stroke();
  g.restore();
}
