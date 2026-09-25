import type { CityMap } from './CityMap';

// Colours of the map and a plain drawing of the city, shared by the game
// (map screen, ghost map) and the admin panel. No Phaser here.

export const AREA_FILL: Record<string, string> = {
  water: '#3f8fd8', forest: '#3d8b3d', scrub: '#5e9e3a', wetland: '#6aa89a', park: '#7ccf45', grass: '#72c23a',
  farmland: '#c8d77a', cemetery: '#6aa84f', allotments: '#8bc34a', pitch: '#4fb34f', playground: '#e0c070',
  parking: '#d2ad7c', plaza: '#dccfb2',
};
// Plain earthen roads (no asphalt): wider = more trodden and darker.
export const ROAD_FILL: Record<string, string> = {
  major: '#c28a52', medium: '#c9935c', minor: '#d09d66', service: '#d6a771', track: '#d6a771',
  pedestrian: '#dccfb2', path: '#e3bd86', steps: '#c9a47a',
};
/** Draws the city (green, water, roads, buildings) inside `box` onto the whole canvas. */
export function drawCity(canvas: HTMLCanvasElement, city: CityMap, box: { x0: number; y0: number; x1: number; y1: number }) {
  const ctx = canvas.getContext('2d')!;
  const S = canvas.width;
  const R = (box.x1 - box.x0) / 2;
  const s = S / (2 * R);
  const { areas, lines, buildings } = city.query(box);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#6abe30';
  ctx.fillRect(0, 0, S, S);
  ctx.setTransform(s, 0, 0, s, -box.x0 * s, -box.y0 * s);
  ctx.lineJoin = ctx.lineCap = 'round';

  const path = (rings: number[][]) => {
    ctx.beginPath();
    for (const r of rings) {
      ctx.moveTo(r[0], r[1]);
      for (let i = 2; i < r.length; i += 2) ctx.lineTo(r[i], r[i + 1]);
      ctx.closePath();
    }
  };
  areas.sort((a, b) => city.areas.indexOf(a) - city.areas.indexOf(b));
  for (const a of areas) {
    path(a.rings);
    ctx.fillStyle = AREA_FILL[a.kind] ?? '#72c23a';
    ctx.fill('evenodd');
  }
  for (const l of lines) {
    const water = l.kind === 'river' || l.kind === 'stream' || l.kind === 'ditch';
    const color = water ? '#3f8fd8' : l.kind === 'rail' || l.kind === 'tram' ? '#6d6560' : ROAD_FILL[l.kind];
    if (!color) continue;
    ctx.beginPath();
    ctx.moveTo(l.pts[0], l.pts[1]);
    for (let i = 2; i < l.pts.length; i += 2) ctx.lineTo(l.pts[i], l.pts[i + 1]);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(l.width, 1.5 / s);
    ctx.stroke();
  }
  for (const b of buildings) {
    path(b.rings);
    ctx.fillStyle = '#9c5b45';
    ctx.fill('evenodd');
  }
  // Outside the city.
  ctx.beginPath();
  ctx.rect(box.x0, box.y0, 2 * R, 2 * R);
  for (const r of city.boundary) {
    ctx.moveTo(r[0], r[1]);
    for (let i = 2; i < r.length; i += 2) ctx.lineTo(r[i], r[i + 1]);
    ctx.closePath();
  }
  ctx.fillStyle = '#1f4d24';
  ctx.fill('evenodd');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
