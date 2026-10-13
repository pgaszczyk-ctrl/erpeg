import type { GameScene } from '../scenes/GameScene';
import { PX_PER_M } from '../map/CityMap';
import { FOG_CELL } from '../map/Fog';
import { drawCity } from '../map/drawCity';
import { session } from '../quests';
import { worldInfo, mapName, cachedMap } from '../travel';
import { worldOrigin } from '../map/world';
import { krajWPunkcie } from '../kraj';
import { DUZE_MIASTA } from '../content/pociagi';
import { SKALE_MAPY, OKOLICA, KRAJ_WIDOK, MIASTA_WOJEWODZKIE, ODWIEDZONE_KM } from '../content/mapa';

export { drawCity };

// The map screen (an HTML overlay): the area around the hero, drawn simply,
// with unexplored places left black, then the whole city, the region (station
// towns, visited ones named) and the country (visited voivodeship capitals).
// Scales in content/mapa.ts; drag to move the view. Opened with the 🗺 button or M.

const PLACE_ICONS: Record<string, [string, string]> = {
  shop: ['#3f7fd8', '⚔'],
  school: ['#b84a3a', '✎'],
  church: ['#7a5ab8', '✝'],
  office: ['#8d8f99', '§'],
  hospital: ['#ffffff', '✚'],
  police: ['#2b3f8a', '★'],
  library: ['#2f8a6a', '¶'],
  merchant: ['#e43b44', '$'],
  maker: ['#a86d37', '♨'],
  workshop: ['#71624f', '⚒'],
  port: ['#2b3f6a', '⚓'],
};
let open: HTMLDivElement | null = null;
let zoom = 0;

export function isMinimapOpen() {
  return !!open;
}

/** Called once when the map screen closes (the world goes on). */
let closed: (() => void) | null = null;

export function closeMinimap() {
  if (!open) return;
  open.remove();
  open = null;
  const c = closed;
  closed = null;
  c?.();
}

export function toggleMinimap(game: GameScene, onClose?: () => void) {
  if (open) closeMinimap();
  else {
    closed = onClose ?? null;
    showMinimap(game);
  }
}

function showMinimap(game: GameScene) {
  knownCache.clear();
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
  // Dragging moves the view: an offset from the hero (map px) for the city scales, degrees for the others.
  let off = { x: 0, y: 0 };
  let geoOff = { lat: 0, lon: 0 };
  const setZoom = (z: number) => {
    zoom = Math.max(0, Math.min(SKALE_MAPY.length - 1, z));
    off = { x: 0, y: 0 };
    geoOff = { lat: 0, lon: 0 };
    draw();
  };
  btn('−', () => setZoom(zoom + 1));
  bar.append(label);
  btn('+', () => setZoom(zoom - 1));
  btn('✕', closeMinimap);
  root.append(canvas, bar);
  root.onclick = (e) => {
    if (e.target === root) closeMinimap();
  };
  document.body.append(root);
  open = root;

  let pending = 0;
  let geoView: GeoFrame = { lat: 0, lon: 0, km: 100, nazwa: '' };
  const draw = () => {
    const sk = SKALE_MAPY[zoom];
    if (sk.rodzaj !== 'miasto') {
      geoView = geoFrame(game, sk.rodzaj);
      label.textContent = geoView.nazwa;
      renderGeo(game, canvas, sk.rodzaj, geoView, geoOff);
      return;
    }
    const radiusM = sk.r;
    const km = `${radiusM * 2 >= 1000 ? `${(radiusM * 2) / 1000} km` : `${radiusM * 2} m`}`;
    const name = sk.nazwa ? mapName(game.city.id) : '';
    label.textContent = name && name !== 'Daleko' ? name : km;
    const R = radiusM * PX_PER_M;
    const c = { x: game.player.x + off.x, y: game.player.y + off.y };
    render(game, canvas, R, c);
    // Tiled map: fetch what's missing in view (not for the whole city – that view shows what's loaded), then draw again.
    if (radiusM <= 2000 && !game.city.ready({ x0: c.x - R, y0: c.y - R, x1: c.x + R, y1: c.y + R })) {
      const z = zoom;
      game.city.ensure(c.x, c.y, R).then(() => {
        if (open === root && z === zoom) render(game, canvas, R, { x: game.player.x + off.x, y: game.player.y + off.y });
      }, () => {});
    }
  };
  // Drag and drop.
  let drag: { id: number; x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    const sk = SKALE_MAPY[zoom];
    if (sk.rodzaj === 'miasto') {
      const k = (2 * sk.r * PX_PER_M) / size;
      off.x -= dx * k;
      off.y -= dy * k;
    } else {
      const v = geoView;
      const kmPerPx = (2 * v.km) / size;
      geoOff.lat += (dy * kmPerPx) / 111.32;
      geoOff.lon -= (dx * kmPerPx) / (111.32 * Math.cos((v.lat * Math.PI) / 180));
    }
    if (!pending) pending = requestAnimationFrame(() => {
      pending = 0;
      if (open === root) draw();
    });
  });
  const end = (e: PointerEvent) => {
    if (drag && e.pointerId === drag.id) drag = null;
    canvas.style.cursor = 'grab';
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  draw();
}

/** Where the hero has been, in lat/lon: stations ridden to/from, maps with fog, the map he is on. */
function visitedPoints(game: GameScene) {
  const { world, stops } = worldInfo();
  const pts: { lat: number; lon: number }[] = [];
  const towns = new Set<string>(['lublin']);
  for (const s of session.byl) {
    pts.push({ lat: s.lat, lon: s.lon });
    towns.add(s.mapId);
  }
  for (const id of [...Object.keys(session.fogs), game.city.id]) {
    towns.add(id);
    const m = /^w:(-?[\d.]+),(-?[\d.]+)$/.exec(id);
    if (m) pts.push({ lat: Number(m[1]), lon: Number(m[2]) });
  }
  for (const t of world.towns) if (towns.has(t.id) && t.stations[0]) pts.push(t.stations[0]);
  if (world.lublin[0]) pts.push(world.lublin.find((s) => /Główny/.test(s.name)) ?? world.lublin[0]);
  const here = game.city.toLatLon?.(game.player.x, game.player.y);
  if (here) pts.push(here);
  return { pts, towns, world, stops, here };
}

type GeoFrame = { lat: number; lon: number; km: number; nazwa: string };

/**
 * Where the hero has been, roughly (owner, 13 Oct 2026: „nie rysuj dokładnie dróg, pokaż orientacyjnie”):
 * every explored fog chunk (~130 m) of every map, turned into lat/lon and counted in cells of `cellKm`.
 */
const knownCache = new Map<number, { lat: number; lon: number }[]>();
function knownCells(game: GameScene, cellKm: number) {
  const hit = knownCache.get(cellKm);
  if (hit) return hit;
  const out = knownCellsNow(game, cellKm);
  knownCache.set(cellKm, out);
  return out;
}

function knownCellsNow(game: GameScene, cellKm: number) {
  const cells = new Map<string, { lat: number; lon: number }>();
  const fogs: [string, { s: number; chunks: Record<string, string> } | undefined][] = [
    ['lublin', game.city.id === 'lublin' ? game.explored.chunkKeys() : session.fog],
    ...Object.entries(session.fogs).filter(([id]) => id !== game.city.id),
  ];
  if (game.city.id !== 'lublin') fogs.push([game.city.id, game.explored.chunkKeys()]);
  const chunkPx = 64 * FOG_CELL;
  for (const [id, fog] of fogs) {
    if (!fog?.chunks) continue;
    const s = fog.s || PX_PER_M;
    const map = id === game.city.id ? game.city : cachedMap(id);
    const o = worldOrigin(id);
    // A world map not loaded this session: the same projection as CityMap.world (origin = its own point).
    const toLL = map
      ? (xm: number, ym: number) => map.toLatLon(xm * PX_PER_M, ym * PX_PER_M)
      : o
        ? (xm: number, ym: number) => {
          const mLat = 111132.954 - 559.822 * Math.cos((2 * o.lat * Math.PI) / 180);
          const mLon = 111412.84 * Math.cos((o.lat * Math.PI) / 180);
          return { lat: o.lat - ym / mLat, lon: o.lon + xm / mLon };
        }
        : null;
    if (!toLL) continue;
    for (const key of Object.keys(fog.chunks)) {
      const [cx, cy] = key.split(',').map(Number);
      const ll = toLL(((cx + 0.5) * chunkPx) / s, ((cy + 0.5) * chunkPx) / s);
      if (!Number.isFinite(ll.lat)) continue;
      const gy = Math.floor((ll.lat * 111.32) / cellKm);
      const gx = Math.floor((ll.lon * 111.32 * Math.cos((ll.lat * Math.PI) / 180)) / cellKm);
      const k = `${gx},${gy}`;
      if (!cells.has(k)) cells.set(k, ll);
    }
  }
  return [...cells.values()];
}

const NAZWY_KRAJOW: Record<string, string> = { PL: 'Polska', DE: 'Niemcy', CZ: 'Czechy', SK: 'Słowacja', UA: 'Ukraina', LT: 'Litwa', AT: 'Austria', IT: 'Włochy', FR: 'Francja', ES: 'Hiszpania', GB: 'Wielka Brytania', SE: 'Szwecja', DK: 'Dania', NO: 'Norwegia', HU: 'Węgry', CH: 'Szwajcaria', HR: 'Chorwacja', SI: 'Słowenia', NL: 'Holandia', BE: 'Belgia' };

/** The view of the region (around the hero) or of the country / world (fitting everything known). */
function geoFrame(game: GameScene, kind: 'wojewodztwo' | 'kraj'): GeoFrame {
  const here = game.city.toLatLon?.(game.player.x, game.player.y) ?? { lat: 51.25, lon: 22.57 };
  if (kind === 'wojewodztwo') return { lat: here.lat, lon: here.lon, km: OKOLICA.km, nazwa: 'Okolica' };
  const pts = [...knownCells(game, KRAJ_WIDOK.kratkaKm), ...visitedPoints(game).pts, here];
  let n = -90, s = 90, w = 180, e = -180;
  for (const p of pts) {
    n = Math.max(n, p.lat); s = Math.min(s, p.lat);
    w = Math.min(w, p.lon); e = Math.max(e, p.lon);
  }
  const lat = (n + s) / 2, lon = (w + e) / 2;
  const half = Math.max(((n - s) / 2) * 111.32, ((e - w) / 2) * 111.32 * Math.cos((lat * Math.PI) / 180));
  const km = Math.min(KRAJ_WIDOK.maksKm, Math.max(KRAJ_WIDOK.minKm, half * KRAJ_WIDOK.zapas + 40));
  const kraje = new Set(pts.map((p) => krajWPunkcie(p.lat, p.lon)));
  const jeden = kraje.size === 1 ? [...kraje][0] : null;
  const nazwa = km > 1500 ? 'Świat' : jeden ? NAZWY_KRAJOW[jeden] ?? 'Kraj' : 'Kraje';
  return { lat, lon, km, nazwa };
}

/** The region and country views: a simple drawn map in lat/lon. */
function renderGeo(game: GameScene, canvas: HTMLCanvasElement, kind: 'wojewodztwo' | 'kraj', v: GeoFrame, geoOff: { lat: number; lon: number }) {
  const ctx = canvas.getContext('2d')!;
  const S = canvas.width;
  const u = S / 400;
  const lat0 = v.lat + geoOff.lat, lon0 = v.lon + geoOff.lon;
  const cos = Math.cos((v.lat * Math.PI) / 180);
  const s = S / (2 * v.km);
  const toS = (lat: number, lon: number) => [S / 2 + (lon - lon0) * 111.32 * cos * s, S / 2 - (lat - lat0) * 111.32 * s] as const;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // No borders on purpose (owner, bug report 41): only the scale – the places, railways and a grid.
  ctx.fillStyle = '#e8dcb8';
  ctx.fillRect(0, 0, S, S);
  const step = kind === 'kraj' ? (v.km > 1500 ? 10 : v.km > 700 ? 2 : 1) : 0.25;
  ctx.strokeStyle = 'rgba(110,90,58,0.15)';
  ctx.lineWidth = 1 * u;
  const [lx0, ly0] = [lon0 - (S / 2 / s) / (111.32 * cos), lat0 + S / 2 / s / 111.32];
  const [lx1, ly1] = [lon0 + (S / 2 / s) / (111.32 * cos), lat0 - S / 2 / s / 111.32];
  for (let lon = Math.ceil(lx0 / step) * step; lon <= lx1; lon += step) {
    const [x] = toS(lat0, lon);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, S);
    ctx.stroke();
  }
  for (let lat = Math.ceil(ly1 / step) * step; lat <= ly0; lat += step) {
    const [, y] = toS(lat, lon0);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(S, y);
    ctx.stroke();
  }
  const { pts, towns, world, stops, here } = visitedPoints(game);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Known land, roughly: soft warm patches where the fog of war was lifted (no exact routes).
  const cell = kind === 'kraj' ? KRAJ_WIDOK.kratkaKm : OKOLICA.kratkaKm;
  const rKnown = Math.max(3 * u, cell * 0.85 * s);
  for (const c of knownCells(game, cell)) {
    const [x, y] = toS(c.lat, c.lon);
    if (x < -rKnown || y < -rKnown || x > S + rKnown || y > S + rKnown) continue;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rKnown);
    g.addColorStop(0, 'rgba(214,170,74,0.55)');
    g.addColorStop(1, 'rgba(214,170,74,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rKnown, y - rKnown, rKnown * 2, rKnown * 2);
  }
  // Places ridden to or from: gold dots with their names.
  ctx.font = `bold ${Math.round(11 * u)}px monospace`;
  const named = new Set<string>();
  for (const st of session.byl) {
    const [x, y] = toS(st.lat, st.lon);
    if (x < 0 || y < 0 || x > S || y > S) continue;
    dot(ctx, x, y, 4 * u, u);
    const nm = st.mapName && st.mapName !== 'Daleko' ? st.mapName : st.name;
    if (named.has(nm)) continue;
    named.add(nm);
    label(ctx, nm, x, y - 11 * u, u);
  }
  if (kind === 'wojewodztwo') {
    // Railways between stations, then every station town: grey, the visited ones gold with 3 letters.
    ctx.strokeStyle = 'rgba(90,70,50,0.45)';
    ctx.lineWidth = 1.2 * u;
    for (const e of world.edges) {
      const a = stops.get(e.from), b = stops.get(e.to);
      if (!a || !b) continue;
      const [x1, y1] = toS(a.lat, a.lon), [x2, y2] = toS(b.lat, b.lon);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    const list = [...world.towns.map((t) => ({ id: t.id, name: t.name, st: t.stations[0] })), { id: 'lublin', name: 'Lublin', st: world.lublin.find((x) => /Główny/.test(x.name)) ?? world.lublin[0] }];
    for (const t of list) {
      if (!t.st || towns.has(t.id)) continue;
      const [x, y] = toS(t.st.lat, t.st.lon);
      ctx.fillStyle = 'rgba(80,70,60,0.55)';
      ctx.beginPath();
      ctx.arc(x, y, 2.2 * u, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = `bold ${Math.round(12 * u)}px monospace`;
    for (const t of list) {
      if (!t.st || !towns.has(t.id)) continue;
      const [x, y] = toS(t.st.lat, t.st.lon);
      dot(ctx, x, y, 5 * u, u);
      label(ctx, t.name.slice(0, 3), x, y - 12 * u, u);
    }
  } else {
    ctx.font = `bold ${Math.round(11 * u)}px monospace`;
    // Big cities (voivodeship capitals + the long trains' cities) in view; named once the hero has been near.
    const miasta = [...MIASTA_WOJEWODZKIE, ...DUZE_MIASTA.filter((d) => !MIASTA_WOJEWODZKIE.some((m) => m.nazwa === d.nazwa))];
    for (const c of miasta) {
      const [x, y] = toS(c.lat, c.lon);
      if (x < 0 || y < 0 || x > S || y > S) continue;
      const been = pts.some((p) => kmBetween(p, c) <= ODWIEDZONE_KM);
      if (!been || named.has(c.nazwa)) {
        ctx.fillStyle = 'rgba(80,70,60,0.35)';
        ctx.beginPath();
        ctx.arc(x, y, 2 * u, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      dot(ctx, x, y, 5 * u, u);
      label(ctx, c.nazwa, x, y - 12 * u, u);
    }
  }
  // The hero.
  if (here) {
    const [x, y] = toS(here.lat, here.lon);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e43b44';
    ctx.lineWidth = 2.5 * u;
    ctx.beginPath();
    ctx.arc(x, y, 6 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // Scale bar.
  const km = kind === 'kraj' ? (v.km > 2500 ? 1000 : v.km > 1200 ? 500 : v.km > 600 ? 200 : 100) : 20;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(8 * u, S - 26 * u, km * s + 16 * u, 18 * u);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(16 * u, S - 14 * u, km * s, 3 * u);
  ctx.font = `${Math.round(11 * u)}px monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(`${km} km`, 16 * u, S - 20 * u);
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, u: number) {
  ctx.fillStyle = '#f7c531';
  ctx.strokeStyle = '#1e1a24';
  ctx.lineWidth = 1.5 * u;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, u: number) {
  ctx.lineWidth = 3 * u;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#1e1a24';
  ctx.fillText(text, x, y);
}

function kmBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const dy = (a.lat - b.lat) * 111.32;
  const dx = (a.lon - b.lon) * 111.32 * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

function render(game: GameScene, canvas: HTMLCanvasElement, R: number, c: { x: number; y: number }) {
  const ctx = canvas.getContext('2d')!;
  const S = canvas.width;
  const px = c.x;
  const py = c.y;
  const s = S / (2 * R);
  const box = { x0: px - R, y0: py - R, x1: px + R, y1: py + R };
  drawCity(canvas, game.city, box);

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
  // Shops and schools, only where already explored.
  ctx.font = `${Math.round(13 * u)}px sans-serif`;
  for (const p of game.placeMarkers()) {
    if (p.x < box.x0 || p.x > box.x1 || p.y < box.y0 || p.y > box.y1) continue;
    if (!game.explored.hasCell(Math.floor(p.x / FOG_CELL), Math.floor(p.y / FOG_CELL))) continue;
    const [x, y] = toS(p.x, p.y);
    const [bg, glyph] = PLACE_ICONS[p.kind] ?? ['#666', '?'];
    ctx.fillStyle = bg;
    ctx.fillRect(x - 8 * u, y - 8 * u, 16 * u, 16 * u);
    ctx.fillStyle = p.kind === 'hospital' ? '#e43b44' : '#ffffff';
    ctx.fillText(glyph, x, y + u);
  }
  ctx.font = `bold ${Math.round(16 * u)}px monospace`;

  // Every active quest's goal, in its arrow's colour.
  for (const q of game.activeQuests()) {
    if (!q.pos) continue;
    const [x, y] = toS(q.pos.x, q.pos.y);
    ctx.strokeStyle = q.color;
    ctx.lineWidth = 3 * u;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(11 * u, q.main ? 0 : game.goalRadius() * s), 0, Math.PI * 2);
    ctx.stroke();
  }
  const [hx, hy] = toS(game.player.x, game.player.y);
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

  // Scale bar: 100 m, or 1 km on the whole-city view.
  const barM = R > 3000 * PX_PER_M ? 1000 : 100;
  const bar = barM * PX_PER_M * s;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(8 * u, S - 26 * u, bar + 16 * u, 18 * u);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(16 * u, S - 14 * u, bar, 3 * u);
  ctx.font = `${Math.round(11 * u)}px monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(barM >= 1000 ? '1 km' : '100 m', 16 * u, S - 20 * u);
}
