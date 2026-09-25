import type { GameScene } from '../scenes/GameScene';
import { PX_PER_M } from '../map/CityMap';
import { FOG_CELL } from '../map/Fog';
import { AREA_FILL, ROAD_FILL } from '../map/MapRenderer';

// The map screen (an HTML overlay): the area around the hero, drawn simply,
// with unexplored places left black. Opened with the 🗺 button or M.

const RADII_M = [250, 600, 1500];
let open: HTMLDivElement | null = null;
let zoom = 0;

export function isMinimapOpen() {
  return !!open;
}

export function closeMinimap() {
  open?.remove();
  open = null;
}

export function toggleMinimap(game: GameScene) {
  if (open) closeMinimap();
  else showMinimap(game);
}

function showMinimap(game: GameScene) {
  const root = document.createElement('div');
  root.id = 'minimap';
  const size = Math.floor(Math.min(window.innerWidth, window.innerHeight - 70) - 24);
  const canvas = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = canvas.height = Math.floor(size * dpr);
  canvas.style.width = canvas.style.height = `${size}px`;
  const bar = document.createElement('div');
  bar.className = 'mm-bar';
  const btn = (label: string, fn: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.onclick = (e) => {
      e.stopPropagation();
      fn();
    };
    bar.append(b);
    return b;
  };
  const label = document.createElement('span');
  btn('−', () => {
    zoom = Math.min(RADII_M.length - 1, zoom + 1);
    draw();
  });
  bar.append(label);
  btn('+', () => {
    zoom = Math.max(0, zoom - 1);
    draw();
  });
  btn('✕', closeMinimap);
  root.append(canvas, bar);
  root.onclick = (e) => {
    if (e.target === root) closeMinimap();
  };
  document.body.append(root);
  open = root;

  const draw = () => {
    const radiusM = RADII_M[zoom];
    label.textContent = `${radiusM * 2 >= 1000 ? `${(radiusM * 2) / 1000} km` : `${radiusM * 2} m`}`;
    render(game, canvas, radiusM * PX_PER_M);
  };
  draw();
}

function render(game: GameScene, canvas: HTMLCanvasElement, R: number) {
  const ctx = canvas.getContext('2d')!;
  const S = canvas.width;
  const px = game.player.x;
  const py = game.player.y;
  const s = S / (2 * R);
  const city = game.city;
  const box = { x0: px - R, y0: py - R, x1: px + R, y1: py + R };
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

  // Unexplored: black (sampled per screen pixel, blurred a bit).
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const n = Math.ceil(S / 2);
  const fog = document.createElement('canvas');
  fog.width = fog.height = n;
  const fctx = fog.getContext('2d')!;
  const img = fctx.createImageData(n, n);
  const step = (2 * R) / n;
  for (let j = 0; j < n; j++) {
    const gy = Math.floor((box.y0 + (j + 0.5) * step) / FOG_CELL);
    for (let i = 0; i < n; i++) {
      const gx = Math.floor((box.x0 + (i + 0.5) * step) / FOG_CELL);
      if (!game.explored.hasCell(gx, gy)) img.data[(j * n + i) * 4 + 3] = 255;
    }
  }
  fctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(fog, 0, 0, S, S);

  // Markers: missions, goal, hero.
  const toS = (x: number, y: number) => [(x - box.x0) * s, (y - box.y0) * s] as const;
  const u = S / 400;
  ctx.font = `bold ${Math.round(16 * u)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const m of game.missionMarkers()) {
    const [x, y] = toS(m.x, m.y);
    ctx.fillStyle = '#1e1a24';
    ctx.beginPath();
    ctx.arc(x, y, 9 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = m.done ? '#5ac85a' : '#f7c531';
    ctx.beginPath();
    ctx.arc(x, y, 7.5 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e1a24';
    ctx.fillText(m.done ? '✓' : '!', x, y + u);
  }
  const goal = game.goalPosition();
  if (goal) {
    const [x, y] = toS(goal.x, goal.y);
    ctx.strokeStyle = '#ff3b3b';
    ctx.lineWidth = 3 * u;
    ctx.beginPath();
    ctx.arc(x, y, 11 * u, 0, Math.PI * 2);
    ctx.stroke();
  }
  const [hx, hy] = toS(px, py);
  const a = Math.atan2(game.player.facing.y, game.player.facing.x);
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(a);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1e1a24';
  ctx.lineWidth = 2 * u;
  ctx.beginPath();
  ctx.moveTo(11 * u, 0);
  ctx.lineTo(-7 * u, -7 * u);
  ctx.lineTo(-3 * u, 0);
  ctx.lineTo(-7 * u, 7 * u);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Scale bar: 100 m.
  const bar = 100 * PX_PER_M * s;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(8 * u, S - 26 * u, bar + 16 * u, 18 * u);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(16 * u, S - 14 * u, bar, 3 * u);
  ctx.font = `${Math.round(11 * u)}px monospace`;
  ctx.textAlign = 'left';
  ctx.fillText('100 m', 16 * u, S - 20 * u);
}
