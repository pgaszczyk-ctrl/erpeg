import type { GameScene } from '../scenes/GameScene';
import { PX_PER_M } from '../map/CityMap';
import { FOG_CELL } from '../map/Fog';
import { drawCity } from '../map/drawCity';
import { session } from '../quests';
import { worldInfo, mapName, cachedMap } from '../travel';
import { worldOrigin, landOfTile, tilesOver, type Lad } from '../map/world';
import { krajWPunkcie } from '../kraj';
import { DUZE_MIASTA } from '../content/pociagi';
import { SKALE_MAPY, OKOLICA, KRAJ_WIDOK, MIASTA_WOJEWODZKIE, ODWIEDZONE_KM, MAPA_PODROZNIKA } from '../content/mapa';
import { hubyBlisko, wybierz, IKONA_HUBA, type Hub } from '../huby';

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
/** The traveller's map: hubs near the hero (null while loading or without the map) and where their icons were drawn. */
let huby: Hub[] | null = null;
let ikony: { x: number; y: number; h: Hub }[] = [];
// For browser tests: the icons drawn now (canvas px).
(window as unknown as { __mm: () => unknown }).__mm = () => ikony.map((i) => ({ x: i.x, y: i.y, nazwa: i.h.nazwa }));
(window as unknown as { __mmKinds: () => unknown }).__mmKinds = () => [...new Set(ikony.map((i) => i.h.rodzaj))];

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
  huby = null;
  ikony = [];
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
      renderGeo(game, canvas, sk.rodzaj, geoView, geoOff, () => {
        if (open === root && SKALE_MAPY[zoom].rodzaj !== 'miasto') renderGeo(game, canvas, SKALE_MAPY[zoom].rodzaj as 'wojewodztwo' | 'kraj', geoView, geoOff);
      });
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
  // A tap (no drag) on a hub's icon: its name, distance and „🧭 Prowadź”.
  let tap: { x: number; y: number; moved: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => (tap = { x: e.clientX, y: e.clientY, moved: 0 }));
  canvas.addEventListener('pointermove', (e) => {
    if (tap) tap.moved = Math.max(tap.moved, Math.hypot(e.clientX - tap.x, e.clientY - tap.y));
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!tap || tap.moved > 8) return void (tap = null);
    tap = null;
    const r = canvas.getBoundingClientRect();
    const k = canvas.width / r.width;
    const x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k;
    const hit = ikony.filter((i) => Math.hypot(i.x - x, i.y - y) < 18 * k).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
    if (hit) hubPopup(game, root, hit.h, draw);
  });
  // Every traveller's map bought within reach of the widest „Okolica” view: its own hubs (around where it was bought).
  const here = game.city.toLatLon(game.player.x, game.player.y);
  const mapy = game.mapyPodroznika().filter((m) => kmBetween(m, here) < OKOLICA.km * 1.5 + MAPA_PODROZNIKA.promienKm);
  if (mapy.length) {
    Promise.all(mapy.map((m) => hubyBlisko(m, MAPA_PODROZNIKA.promienKm, Infinity).catch(() => [] as Hub[]))).then((ls) => {
      // Every hub of the maps bought, counted from the hero now; the nearest of each kind, then spread out (owner).
      const all: Hub[] = [];
      for (const h of ls.flat()) if (!all.some((q) => q.nazwa === h.nazwa && q.lat === h.lat)) all.push({ ...h, km: kmBetween(h, here) });
      const chosen = wybierz(all.sort((a, b) => a.km - b.km), MAPA_PODROZNIKA.maksIkon);
      // The hub being guided to stays on the map even when not among the chosen few.
      const d = game.drogaDo();
      if (d && !chosen.some((q) => q.nazwa === d.nazwa && q.lat === d.lat)) chosen.push({ ...d, km: kmBetween(d, here) });
      huby = chosen.sort((a, b) => a.km - b.km);
      if (open === root) draw();
    }, () => {});
  }
  draw();
}

/** The little card over the map: a hub's name and distance, and the guide button. */
function hubPopup(game: GameScene, root: HTMLDivElement, h: Hub, redraw: () => void) {
  root.querySelector('.mm-hub')?.remove();
  const box = document.createElement('div');
  box.className = 'mm-hub';
  const prowadzi = game.drogaDo()?.nazwa === h.nazwa && game.drogaDo()?.lat === h.lat;
  const nazwa = { kolej: 'Dworzec kolejowy', autobus: 'Dworzec autobusowy', port: 'Port promowy' }[h.rodzaj];
  box.innerHTML = `<b>${IKONA_HUBA[h.rodzaj]} ${h.nazwa.replace(/</g, '&lt;')}</b><span>${nazwa} · ${h.km < 1 ? `${Math.round(h.km * 1000)} m` : `${h.km.toFixed(h.km < 10 ? 1 : 0)} km`} stąd</span>`;
  const row = document.createElement('div');
  const b = (text: string, fn: () => void) => {
    const x = document.createElement('button');
    x.type = 'button';
    x.textContent = text;
    x.onclick = (e) => {
      e.stopPropagation();
      fn();
    };
    row.append(x);
  };
  if (prowadzi) b('✋ Przestań prowadzić', () => { game.prowadzDo(null); box.remove(); redraw(); });
  else b('🧭 Prowadź', () => { game.prowadzDo(h); closeMinimap(); });
  b('✕', () => box.remove());
  box.append(row);
  root.append(box);
}

/** The hubs' icons (traveller's map) at screen points, the guided one and the nearest named. */
function drawHubs(ctx: CanvasRenderingContext2D, S: number, u: number, game: GameScene, toS: (lat: number, lon: number) => readonly [number, number], names: number) {
  ikony = [];
  if (!huby) return;
  const guided = game.drogaDo();
  const napisy: { x: number; y: number; w: number }[] = [];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  huby.forEach((h, i) => {
    let [x, y] = toS(h.lat, h.lon);
    // Out of view (the closer scales): at the edge, towards it, with how far – still tappable (owner, 13 Oct 2026).
    const m = 16 * u;
    const edge = x < m || y < m || x > S - m || y > S - m;
    if (edge) {
      const dx = x - S / 2, dy = y - S / 2;
      const k = (S / 2 - m) / Math.max(Math.abs(dx), Math.abs(dy));
      x = S / 2 + dx * k;
      y = S / 2 + dy * k;
      const a = Math.atan2(dy, dx);
      ctx.fillStyle = '#1e1a24';
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * 15 * u, y + Math.sin(a) * 15 * u);
      ctx.lineTo(x + Math.cos(a + 0.5) * 10 * u, y + Math.sin(a + 0.5) * 10 * u);
      ctx.lineTo(x + Math.cos(a - 0.5) * 10 * u, y + Math.sin(a - 0.5) * 10 * u);
      ctx.fill();
    }
    const on = guided?.nazwa === h.nazwa && guided.lat === h.lat;
    ctx.fillStyle = on ? '#4fc3f7' : '#fbf3dc';
    ctx.strokeStyle = '#1e1a24';
    ctx.lineWidth = 1.5 * u;
    ctx.beginPath();
    ctx.roundRect(x - 9 * u, y - 9 * u, 18 * u, 18 * u, 4 * u);
    ctx.fill();
    ctx.stroke();
    ctx.font = `${Math.round(12 * u)}px sans-serif`;
    ctx.fillStyle = '#1e1a24';
    ctx.fillText(IKONA_HUBA[h.rodzaj], x, y + u);
    if (on || i < names || edge) {
      ctx.font = `bold ${Math.round(10 * u)}px monospace`;
      const n = h.nazwa.length > 22 ? `${h.nazwa.slice(0, 21)}…` : h.nazwa;
      const t = edge ? `${n} · ${h.km < 10 ? h.km.toFixed(1) : Math.round(h.km)} km` : n;
      const w = ctx.measureText(t).width;
      // Above the icon, or below it when another name is already there.
      const free = (ly: number) => !napisy.some((n) => Math.abs(n.x - x) < (n.w + w) / 2 + 4 * u && Math.abs(n.y - ly) < 12 * u);
      const ly = [y - 15 * u, y + 16 * u, y - 28 * u, y + 29 * u].map((q) => Math.max(8 * u, Math.min(S - 8 * u, q))).find(free) ?? y - 15 * u;
      const lx = Math.max(w / 2 + 2 * u, Math.min(S - w / 2 - 2 * u, x));
      napisy.push({ x: lx, y: ly, w });
      label(ctx, t, lx, ly, u);
    }
    ikony.push({ x, y, h });
  });
}

/** Without the traveller's map: where to get one (on the wide views). */
function mapHint(ctx: CanvasRenderingContext2D, S: number, u: number, other: boolean) {
  ctx.font = `${Math.round(11 * u)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const t = other ? '🗺 Twoja mapa podróżnika nie sięga tej okolicy' : `🗺 Mapa podróżnika pokaże dworce i porty do ${MAPA_PODROZNIKA.promienKm} km`;
  const t2 = other ? 'mapę tych stron kupisz u woźnicy, kapitana albo w bibliotece' : 'kupisz ją u woźnicy, kapitana portu albo w bibliotece';
  ctx.fillStyle = 'rgba(30,26,36,0.7)';
  ctx.fillRect(0, 0, S, 36 * u);
  ctx.fillStyle = '#fbf3dc';
  ctx.fillText(t, S / 2, 12 * u);
  ctx.fillText(t2, S / 2, 26 * u);
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
  // Centred on the hero (owner, 13 Oct 2026), wide enough for every known place around him.
  const pts = [...knownCells(game, KRAJ_WIDOK.kratkaKm), ...visitedPoints(game).pts];
  let half = 0;
  for (const p of pts) {
    const dy = Math.abs(p.lat - here.lat) * 111.32, dx = Math.abs(p.lon - here.lon) * 111.32 * Math.cos((here.lat * Math.PI) / 180);
    half = Math.max(half, dx, dy);
  }
  const lat = here.lat, lon = here.lon;
  const km = Math.min(KRAJ_WIDOK.maksKm, Math.max(KRAJ_WIDOK.minKm, half * KRAJ_WIDOK.zapas + 40));
  const kraje = new Set(pts.map((p) => krajWPunkcie(p.lat, p.lon)));
  const jeden = kraje.size === 1 ? [...kraje][0] : null;
  const nazwa = km > 1500 ? 'Świat' : jeden ? NAZWY_KRAJOW[jeden] ?? 'Kraj' : 'Kraje';
  return { lat, lon, km, nazwa };
}

/** The region and country views: a simple drawn map in lat/lon. */
function renderGeo(game: GameScene, canvas: HTMLCanvasElement, kind: 'wojewodztwo' | 'kraj', v: GeoFrame, geoOff: { lat: number; lon: number }, redraw?: () => void) {
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
  drawLand(ctx, S, u, s, lat0, lon0, cos, v.km, redraw);
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
  if (kind === 'wojewodztwo') {
    // The areas of the maps bought (dashed circles), their hubs; the hint while this area has no map.
    ctx.strokeStyle = 'rgba(79,195,247,0.8)';
    ctx.setLineDash([6 * u, 5 * u]);
    ctx.lineWidth = 1.5 * u;
    for (const m of game.mapyPodroznika()) {
      const [mx, my] = toS(m.lat, m.lon);
      ctx.beginPath();
      ctx.arc(mx, my, MAPA_PODROZNIKA.promienKm * s, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    drawHubs(ctx, S, u, game, toS, 6);
    if (!game.mamMapePodroznika()) mapHint(ctx, S, u, game.mapyPodroznika().length > 0);
  } else ikony = [];
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

/**
 * Continent outlines (owner, 13 Oct 2026): the world map's land at a low zoom (1–4, by the view's size), read
 * once per tile; until it arrives the plain parchment shows and `redraw` repaints when it does. Sea pale blue,
 * land parchment, the coast a thin brown line (tile borders are not coast and are not stroked).
 */
const landDone = new Map<string, { tx: number; ty: number; z: number; l: Lad[] | null }>();
function drawLand(ctx: CanvasRenderingContext2D, S: number, u: number, s: number, lat0: number, lon0: number, cos: number, km: number, redraw?: () => void) {
  const z = Math.max(1, Math.min(4, Math.floor(Math.log2((40075 * cos) / km))));
  const dLat = (S / 2 / s) / 111.32, dLon = (S / 2 / s) / (111.32 * cos);
  const tiles = tilesOver(z, lat0 - dLat, lon0 - dLon, lat0 + dLat, lon0 + dLon);
  const ready: { tx: number; ty: number; z: number; l: Lad[] | null }[] = [];
  let waiting = false;
  for (const [tx, ty] of tiles) {
    const key = `${z}/${tx}/${ty}`;
    const got = landDone.get(key);
    if (got) { ready.push(got); continue; }
    waiting = true;
    landOfTile(z, tx, ty).then((l) => { landDone.set(key, { tx, ty, z, l }); redraw?.(); }, () => {});
  }
  // Only once every tile is in: a half-drawn coast would show sea where land is still loading.
  if (waiting || !ready.length) return;
  const toS = (lat: number, lon: number) => [S / 2 + (lon - lon0) * 111.32 * cos * s, S / 2 - (lat - lat0) * 111.32 * s] as const;
  // Sea in every tile that was read (a tile missing from the file stays plain parchment), then its land.
  const nn = 2 ** z;
  const latOfY = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / nn))) * 180) / Math.PI;
  ctx.fillStyle = '#c4d3d0';
  for (const t of ready) {
    if (!t.l) continue;
    const [x0, y0] = toS(latOfY(t.ty), (t.tx / nn) * 360 - 180), [x1, y1] = toS(latOfY(t.ty + 1), ((t.tx + 1) / nn) * 360 - 180);
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  ctx.fillStyle = '#e8dcb8';
  for (const t of ready) for (const feat of t.l ?? []) {
    ctx.beginPath();
    for (const ring of feat) {
      for (let j = 0; j < ring.length; j += 3) {
        const [x, y] = toS(ring[j], ring[j + 1]);
        if (j) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
    }
    ctx.fill('evenodd');
  }
  ctx.strokeStyle = 'rgba(110,84,52,0.7)';
  ctx.lineWidth = 1.3 * u;
  ctx.beginPath();
  for (const t of ready) for (const feat of t.l ?? []) for (const ring of feat) {
    for (let j = 3; j < ring.length; j += 3) {
      if (ring[j - 1] && ring[j + 2]) continue; // along the tile's border
      const [x1, y1] = toS(ring[j - 3], ring[j - 2]), [x2, y2] = toS(ring[j], ring[j + 1]);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
  }
  ctx.stroke();
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
  drawHubs(ctx, S, u, game, (lat, lon) => {
    const p = game.city.fromLatLon(lat, lon);
    return toS(p.x, p.y);
  }, 99);
  if (!game.mamMapePodroznika() && R > 3000 * PX_PER_M) mapHint(ctx, S, u, game.mapyPodroznika().length > 0);
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
