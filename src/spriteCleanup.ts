/** Pixel preparation for human sprites on test. Colours outside the pupils are retained. */
const F = 64;
type Part = { pixels: number[]; x: number; y: number; w: number; h: number };
type EyeBox = readonly [number, number, number, number];
/** Verified pupil bounds where caps/fringes join the dark eye or skin joins a hat. */
const EYE_HINTS: Record<string, readonly (readonly [EyeBox, EyeBox] | null)[]> = {
  lista25_09: [null, [[26,28,3,4],[36,27,2,5]], null],
  lista25_16: [[[26,30,2,5],[35,30,3,5]], [[26,30,2,5],[36,31,2,4]], [[26,30,2,5],[35,30,3,5]]],
  lista25_17: [[[26,32,2,5],[36,32,2,5]], [[25,32,2,6],[36,32,2,6]], [[25,33,2,4],[35,33,2,4]]],
  lista25_19: [[[26,31,2,6],[37,31,2,6]], [[24,31,3,6],[36,31,2,6]], [[25,32,3,5],[36,32,2,5]]],
  lista25_20: [[[24,23,3,4],[36,23,3,4]], [[24,24,3,3],[36,24,3,3]], [[24,24,3,3],[36,24,3,3]]],
  lista25_25: [[[28,29,2,4],[37,28,2,5]], [[28,30,2,4],[37,29,2,4]], [[28,30,2,3],[37,28,2,5]]],
};

function parts(match: (x: number, y: number) => boolean): Part[] {
  const seen = new Uint8Array(F * F), out: Part[] = [];
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
    const at = y * F + x;
    if (seen[at] || !match(x, y)) continue;
    const pixels: number[] = [], queue = [at]; seen[at] = 1;
    let x0 = x, x1 = x, y0 = y, y1 = y;
    while (queue.length) {
      const p = queue.pop()!, px = p % F, py = Math.floor(p / F);
      pixels.push(p); x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = px + dx, ny = py + dy, n = ny * F + nx;
        if (nx < 0 || ny < 0 || nx >= F || ny >= F || seen[n] || !match(nx, ny)) continue;
        seen[n] = 1; queue.push(n);
      }
    }
    out.push({ pixels, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
  }
  return out.sort((a, b) => b.pixels.length - a.pixels.length);
}

function skin(d: Uint8ClampedArray, i: number) {
  const [r, g, b, a] = d.subarray(i, i + 4);
  return a >= 128 && r > 80 && g > 40 && r - g > 20 && r - g < 115 && g - b > 12 && g - b < 105;
}

/** Confident pairs only: spectacles, eyes hidden by hair and side views are left as drawn. */
export function frontEyes(d: Uint8ClampedArray, width: number, ox: number): [Part, Part] | null {
  const at = (x: number, y: number) => (y * width + ox + x) * 4;
  const faces = parts((x, y) => x >= 17 && x < 48 && y >= 16 && y <= 43 && skin(d, at(x, y)));
  const face = faces.find(p => p.w >= 10 && p.h >= 5 && p.pixels.length >= 45);
  if (!face) return null;
  const candidates = parts((x, y) => x > face.x && x < face.x + face.w - 1 && y >= face.y && y < face.y + face.h - 1
    && d[at(x, y) + 3] >= 128 && Math.max(...d.subarray(at(x, y), at(x, y) + 3)) < 65)
    .filter(p => p.w <= 4 && p.h >= 3 && p.h <= 6 && p.pixels.length <= 30);
  let best: [Part, Part] | null = null, score = -Infinity;
  for (const a of candidates) for (const b of candidates) {
    const distance = b.x + b.w / 2 - a.x - a.w / 2;
    if (distance < 6 || distance > 17 || Math.abs(a.y - b.y) > 2) continue;
    // Both pupils need skin neighbours; an eyebrow or a cap edge alone is insufficient.
    const surrounded = (p: Part) => p.pixels.reduce((n, v) => {
      const x = v % F, y = Math.floor(v / F);
      return n + Number(x > 0 && skin(d, at(x - 1, y))) + Number(x < F - 1 && skin(d, at(x + 1, y)));
    }, 0);
    if (surrounded(a) < 3 || surrounded(b) < 3) continue;
    const s = a.pixels.length + b.pixels.length - 8 * Math.abs(a.y - b.y);
    if (s > score) { score = s; best = [a, b]; }
  }
  return best;
}

export function cleanHumanSheet(img: ImageData, file?: string) {
  const d = img.data, width = img.width;
  // Keep the connected person, including diagonals, not leftovers from an adjacent source cell.
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
    const at = (x: number, y: number) => (((row * F + y) * width + col * F + x) * 4);
    const components = parts((x, y) => d[at(x, y) + 3] >= 20);
    for (const p of components.slice(1)) for (const v of p.pixels) d[at(v % F, Math.floor(v / F)) + 3] = 0;
  }
  // Choose one larger pupil across all three front walking frames, avoiding size changes with steps.
  const pairs = [0, 1, 2].map(col => {
    const hints = file ? EYE_HINTS[file]?.[col] : null;
    return hints ? hints.map(([x, y, w, h]): Part => ({ x, y, w, h,
      pixels: Array.from({ length: w * h }, (_, i) => (y + Math.floor(i / w)) * F + x + i % w)
        .filter(v => Math.max(...d.subarray((Math.floor(v / F) * width + col * F + v % F) * 4, (Math.floor(v / F) * width + col * F + v % F) * 4 + 3)) < 65),
    })) as [Part, Part] : frontEyes(d, width, col * F);
  });
  const pupils = pairs.flatMap(p => p ?? []);
  if (!pupils.length) return;
  const bigger = pupils.reduce((a, b) => b.w * b.h > a.w * a.h ? b : a);
  const sourceCol = pairs.findIndex(p => p?.includes(bigger));
  const w = Math.max(...pupils.map(p => p.w));
  const h = Math.max(...pupils.map(p => p.h));
  const distances = pairs.flatMap(pair => pair ? [pair[1].x + pair[1].w / 2 - pair[0].x - pair[0].w / 2] : []).sort((a, b) => a - b);
  const distance = Math.max(8, Math.floor(distances[Math.floor(distances.length / 2)] / 4) * 4);
  // Pupils are solid shapes, not rectangular crops containing neighbouring skin/hair.
  const pigment = bigger.pixels.map(v => (Math.floor(v / F) * width + sourceCol * F + v % F) * 4)
    .filter(i => Math.max(d[i], d[i + 1], d[i + 2]) < 65);
  pigment.sort((a, b) => d[a] + d[a + 1] + d[a + 2] - d[b] - d[b + 1] - d[b + 2]);
  const colour = pigment[Math.floor(pigment.length / 2)];
  if (colour === undefined) return;
  const pupil = new Uint8ClampedArray(d.subarray(colour, colour + 4));
  pairs.forEach((pair, col) => {
    if (!pair) return;
    const [left, right] = pair;
    const mid = (left.x + left.w / 2 + right.x + right.w / 2) / 2;
    // Separation in multiples of four: equal screen widths at integer zoom and scale 1/4.
    const x0 = Math.round(mid - distance / 2 - w / 2);
    // This short face needs a skin row between the larger eyes and the moustache.
    const y0 = file === 'lista25_20' ? 22 : Math.min(left.y, right.y);
    // Restore skin under an old pupil edge that falls outside the larger aligned rectangle.
    for (const [p, start] of [[left, x0], [right, x0 + distance]] as [Part, number][]) for (const v of Array.from({length: (p.w + 2) * (p.h + 1)}, (_, i) => (p.y + Math.floor(i / (p.w + 2))) * F + p.x - 1 + i % (p.w + 2))) {
      const x = v % F, y = Math.floor(v / F);
      if (file === 'lista25_20' && y >= p.y + p.h) continue;
      const old = (y * width + col * F + x) * 4;
      if ((x < p.x || x >= p.x + p.w || y >= p.y + p.h) && (y === p.y || Math.max(d[old], d[old + 1], d[old + 2]) >= 120)) continue;
      if (x >= start && x < start + w && y >= y0 && y < y0 + h) continue;
      let found = false;
      for (let radius = 1; radius <= 5 && !found; radius++) for (const dx of [-radius, radius]) {
        const nx = x + dx;
        if (nx < 0 || nx >= F) continue;
        const from = (y * width + col * F + nx) * 4;
        if (!skin(d, from)) continue;
        const to = (y * width + col * F + x) * 4;
        d.set(d.subarray(from, from + 4), to); found = true; break;
      }
    }
    for (const start of [x0, x0 + distance]) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const to = ((y0 + y) * width + col * F + start + x) * 4;
      if (d[to + 3] < 128) continue;
      d.set(pupil, to);
    }
  });
}
