// City boards (tablice z mapką miasta, owner 2 Nov 2026: „drogowskazy są zupełnie niewidoczne … potrzebna nam
// tablica z orientacyjną mapką miasta i drogami wylotowymi z dwoma nazwami miejscowości”). Worked out by split-map
// from the whole Lublin map plus the raw OSM extract (the city's own boundary and its roundabouts):
//   plan    – what the board's map draws: the city boundary, main roads, railways, rivers, and every way out of the
//             city with two names: a middle-sized town on the way and the big city that road leads to;
//   miejsca – where the boards stand: by every way out, by the stations, at big roundabouts and main crossings.
// Towns come from data/tablice-miejscowosci.json (scripts/tablice/miejscowosci.py, GeoNames).
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { PX_PER_M, pointInRings, distToPolyline } from '../../src/map/CityMap.ts';

const M = PX_PER_M;
/** Ways out: only on these roads (OSM motorway/trunk/primary). */
const WYLOT = new Set(['major']);
/** A road leaving the city must head out of it, not run along its edge (cos of the angle to the radius). */
const PROMIENIOWO = 0.4;
/** Crossings of one way out (both carriageways, slip roads) closer than this are one. */
const JEDEN_WYLOT_M = 2000;
/** A main road ending this close to the city boundary is cut by the map's edge there (a way out). */
const NA_GRANICY_M = 250;
/** Names: a town on the way (km from the city centre, people) and the big city the road leads to. */
const BLISKO = { minKm: 12, maxKm: 75, minLudzi: 1500, maxLudzi: 70_000, srodekKm: 30 };
const DALEKO = { minKm: 45, maxKm: 450, minLudzi: 100_000, zapas: { minLudzi: 40_000, maxKm: 200 } };
/** A big city is hidden behind another big one this much nearer (share of the distance) within this angle. */
const OSLONA = { blizej: 0.7, kat: 30 };
/** How far off the road's direction a town may lie (degrees). */
const KAT = 35;
/** Boards: the board by a way out stands this far inside the city; boards closer than ODSTEP_M are merged. */
const W_GLAB_M = 600;
const ODSTEP_M = 900;
const RONDO_MIN_M = 140; // roundabout ring length (≈ 45 m across)
const MAKS_TABLIC = 70;

/** Douglas–Peucker on a flat [x, y, x, y…] list. */
function uprosc(pts, tol) {
  const n = pts.length / 2;
  // A closed ring (first point = last): halve it at its farthest point, else nothing is kept.
  if (n > 3 && Math.hypot(pts[0] - pts[pts.length - 2], pts[1] - pts[pts.length - 1]) < 1e-6) {
    let far = 1, fd = 0;
    for (let i = 1; i < n - 1; i++) {
      const d = Math.hypot(pts[i * 2] - pts[0], pts[i * 2 + 1] - pts[1]);
      if (d > fd) { fd = d; far = i; }
    }
    const a = uprosc(pts.slice(0, far * 2 + 2), tol), b = uprosc(pts.slice(far * 2), tol);
    return [...a, ...b.slice(2)];
  }
  if (n < 3) return pts.slice();
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const ax = pts[a * 2], ay = pts[a * 2 + 1], bx = pts[b * 2], by = pts[b * 2 + 1];
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    let best = -1, bd = tol;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i * 2] - ax) * dy - (pts[i * 2 + 1] - ay) * dx) / L;
      if (d > bd) { bd = d; best = i; }
    }
    if (best >= 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  const out = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(Math.round(pts[i * 2]), Math.round(pts[i * 2 + 1]));
  return out;
}

/** Bearing in degrees (0 = north, clockwise) from a to b in lat/lon. */
function namiar(a, b) {
  const k = Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180);
  return (Math.atan2((b.lon - a.lon) * k, b.lat - a.lat) * 180 / Math.PI + 360) % 360;
}
function km(a, b) {
  const k = Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180);
  return Math.hypot((b.lon - a.lon) * 111.32 * k, (b.lat - a.lat) * 111.132);
}
const roznica = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

/** The raw OSM features this needs: the city's admin boundary and the roundabouts. */
function surowe(src, nazwaMiasta) {
  const granica = [];
  const ronda = [];
  for (const line of gunzipSync(readFileSync(src)).toString('utf8').split('\n')) {
    const rondo = line.includes('"roundabout"');
    const admin = line.includes('"administrative"') && line.includes(`"${nazwaMiasta}"`);
    if (!rondo && !admin) continue;
    let f;
    try { f = JSON.parse(line.replace(/^\x1e/, '')); } catch { continue; }
    const t = f.properties || {}, g = f.geometry;
    if (!g) continue;
    if (admin && t.boundary === 'administrative' && t.name === nazwaMiasta && ['6', '7', '8'].includes(t.admin_level) && !granica.length) {
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
      for (const p of polys) granica.push(p[0]);
    }
    if (rondo && t.junction === 'roundabout' && /^(trunk|primary|secondary|tertiary)(_link)?$/.test(t.highway ?? '')) {
      const pts = g.type === 'LineString' ? g.coordinates : g.type === 'Polygon' ? g.coordinates[0] : [];
      if (pts.length > 1) ronda.push(pts);
    }
  }
  return { granica, ronda };
}

/**
 * @param city the whole Lublin map (CityMap)
 * @param centre {lat, lon} the city's centre (lublin-area.json)
 * @param opts { src: raw OSM file, nazwa: city name in OSM, miejscowosci: towns file }
 */
export function tablice(city, centre, opts) {
  const t0 = Date.now();
  const { granica: granicaLL, ronda: rondaLL } = surowe(opts.src, opts.nazwa);
  if (!granicaLL.length) throw new Error(`tablice: no admin boundary of ${opts.nazwa}`);
  const rings = granicaLL.map((r) => r.flatMap(([lon, lat]) => { const p = city.fromLatLon(lat, lon); return [p.x, p.y]; }));
  const wMiescie = (x, y) => pointInRings(rings, x, y);
  const c = city.fromLatLon(centre.lat, centre.lon);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of rings) for (let i = 0; i < r.length; i += 2) {
    x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); y0 = Math.min(y0, r[i + 1]); y1 = Math.max(y1, r[i + 1]);
  }
  const zapas = 1500 * M;
  const wRamce = (l) => l.x1 > x0 - zapas && l.x0 < x1 + zapas && l.y1 > y0 - zapas && l.y0 < y1 + zapas;

  // Roads near a point (for putting boards beside them, not on them).
  const G = 100 * M;
  const siatka = new Map();
  for (const l of city.lines) {
    if (!['major', 'medium', 'minor', 'service', 'rail', 'tram'].includes(l.kind) || !wRamce(l)) continue;
    for (let gx = Math.floor(l.x0 / G); gx <= Math.floor(l.x1 / G); gx++)
      for (let gy = Math.floor(l.y0 / G); gy <= Math.floor(l.y1 / G); gy++) {
        const k = `${gx}:${gy}`;
        (siatka.get(k) ?? siatka.set(k, []).get(k)).push(l);
      }
  }
  const naDrodze = (x, y, m) => {
    for (const l of siatka.get(`${Math.floor(x / G)}:${Math.floor(y / G)}`) ?? [])
      if (distToPolyline(l.pts, x, y) < l.width / 2 + m * M) return true;
    return false;
  };
  /** A free spot for a board near (x, y), beside the road (dx, dy = the road's direction, may be 0). */
  const miejsce = (x, y, dx, dy, szer) => {
    const L = Math.hypot(dx, dy);
    const kier = L ? [[-dy / L, dx / L], [dy / L, -dx / L]] : [];
    for (let a = 0; a < 8; a++) kier.push([Math.cos(a * Math.PI / 4), Math.sin(a * Math.PI / 4)]);
    for (const odM of [4, 7, 11, 16, 24])
      for (const [nx, ny] of kier) {
        const d = (L ? szer / 2 : 0) + odM * M;
        const px = x + nx * d, py = y + ny * d;
        if (!wMiescie(px, py) || naDrodze(px, py, 2) || !city.isFree(px, py, 6, 4)) continue;
        return { x: Math.round(px), y: Math.round(py) };
      }
    return null;
  };

  // ---------------------------------------------------------------- ways out of the city
  const krzyz = [];
  for (const l of city.lines) {
    if (!WYLOT.has(l.kind) || !wRamce(l)) continue;
    const p = l.pts;
    for (let i = 0; i + 3 < p.length; i += 2) {
      const ax = p[i], ay = p[i + 1], bx = p[i + 2], by = p[i + 3];
      const inA = wMiescie(ax, ay), inB = wMiescie(bx, by);
      if (inA === inB) continue;
      // The crossing point, by halving the segment.
      let lo = 0, hi = 1;
      for (let k = 0; k < 12; k++) {
        const m = (lo + hi) / 2;
        if (wMiescie(ax + (bx - ax) * m, ay + (by - ay) * m) === inA) lo = m; else hi = m;
      }
      const x = ax + (bx - ax) * lo, y = ay + (by - ay) * lo;
      const s = inA ? 1 : -1;
      const L = Math.hypot(bx - ax, by - ay) || 1;
      const dx = ((bx - ax) / L) * s, dy = ((by - ay) / L) * s;
      const rl = Math.hypot(x - c.x, y - c.y) || 1;
      if (dx * (x - c.x) / rl + dy * (y - c.y) / rl < PROMIENIOWO) continue;
      krzyz.push({ x, y, dx, dy, l, i, inA, szer: l.width });
    }
  }
  // Where the map ends at the city boundary (north, east, south of Lublin) roads are cut right on it, so they never
  // cross it: a main road ending within NA_GRANICY_M of the boundary, heading out, is a way out too.
  // The same at the edge of the whole map (around Jastków/Garbów the map reaches past the city, the S19 bypass
  // ends there): the arrow is then put where the ray from the centre to that end leaves the city.
  const doKrawedzi = (rr, x, y) => Math.min(...rr.map((r) => distToPolyline([...r, r[0], r[1]], x, y)));
  const doGranicy = (x, y) => Math.min(doKrawedzi(rings, x, y), doKrawedzi(city.boundary, x, y));
  const naGranicy = (x, y) => {
    let lo = 0, hi = 1;
    for (let k = 0; k < 20; k++) {
      const m = (lo + hi) / 2;
      if (wMiescie(c.x + (x - c.x) * m, c.y + (y - c.y) * m)) lo = m; else hi = m;
    }
    return { x: c.x + (x - c.x) * lo, y: c.y + (y - c.y) * lo };
  };
  for (const l of city.lines) {
    if (!WYLOT.has(l.kind) || !wRamce(l) || l.pts.length < 4) continue;
    const p = l.pts, n = p.length;
    for (const [i, j] of [[n - 2, n - 4], [0, 2]]) {
      const x = p[i], y = p[i + 1];
      if (doGranicy(x, y) > NA_GRANICY_M * M) continue;
      // The road's heading over its last ~300 m (a single last segment can turn anywhere).
      let k = j;
      while (k > 0 && k < n - 2 && Math.hypot(x - p[k], y - p[k + 1]) < 300 * M) k += j > i ? 2 : -2;
      const L = Math.hypot(x - p[k], y - p[k + 1]) || 1;
      const dx = (x - p[k]) / L, dy = (y - p[k + 1]) / L;
      const rl = Math.hypot(x - c.x, y - c.y) || 1;
      // Past the city (the map's own edge) a road bending round it still leaves the map there.
      if (dx * (x - c.x) / rl + dy * (y - c.y) / rl < (wMiescie(x, y) ? PROMIENIOWO : 0.1)) continue;
      if (wMiescie(x, y)) krzyz.push({ x, y, dx, dy, l, i: i === 0 ? 0 : n - 4, inA: i !== 0, szer: l.width });
      else if (Math.hypot(x - c.x, y - c.y) < 25_000 * M) {
        // Its arrow points straight out from the centre (the road itself is bending round the city there).
        const q = naGranicy(x, y), r = Math.hypot(q.x - c.x, q.y - c.y) || 1;
        krzyz.push({ ...q, dx: (q.x - c.x) / r, dy: (q.y - c.y) / r, l: null, szer: l.width - 0.01 });
      }
    }
  }
  krzyz.sort((a, b) => b.szer - a.szer);
  const wyloty = [];
  // One way out = close together AND heading the same way (an expressway junction sends roads off in several directions).
  const kierunekWylotu = (k) => Math.atan2(k.dy * 0.5 + (k.y - c.y) / Math.hypot(k.x - c.x, k.y - c.y), k.dx * 0.5 + (k.x - c.x) / Math.hypot(k.x - c.x, k.y - c.y));
  for (const k of krzyz)
    if (!wyloty.some((w) => Math.hypot(w.x - k.x, w.y - k.y) < JEDEN_WYLOT_M * M && Math.abs(((kierunekWylotu(w) - kierunekWylotu(k) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) < (35 * Math.PI) / 180)) wyloty.push(k);

  // Towns of the city's own country (GeoNames: the nearest place to the centre names the country).
  const miejsc = JSON.parse(readFileSync(opts.miejscowosci, 'utf8')).map(([pl, en, kraj, lat, lon, ludzi]) => ({ pl, en, kraj, lat, lon, ludzi }));
  const kraj = miejsc.reduce((b, m) => (km(m, centre) < km(b, centre) ? m : b)).kraj;
  const swoje = miejsc.filter((m) => m.kraj === kraj && km(m, centre) > 5);
  const uzyte = new Map();
  const wybierz = (kierunek, lista, ocena) => {
    let best = null, bo = Infinity;
    for (const m of lista) {
      const a = roznica(namiar(centre, m), kierunek);
      if (a > KAT) continue;
      const o = ocena(m, km(centre, m), a) + 0.35 * (uzyte.get(m.pl) ?? 0);
      if (o < bo) { bo = o; best = m; }
    }
    if (best) uzyte.set(best.pl, (uzyte.get(best.pl) ?? 0) + 1);
    return best;
  };
  const blisko = swoje.filter((m) => m.ludzi >= BLISKO.minLudzi && m.ludzi <= BLISKO.maxLudzi && km(centre, m) >= BLISKO.minKm && km(centre, m) <= BLISKO.maxKm);
  // The big city a road leads to is the first one that way (owner, 2 Nov 2026: „z Krakowa nie ma być drogowskazu
  // do Lublina, wcześniej jest Rzeszów”): a city with another big one much nearer in nearly the same direction is
  // hidden behind it.
  const duze = swoje.filter((m) => m.ludzi >= DALEKO.minLudzi);
  const zaslonieta = (m) => duze.some((o) => o !== m && km(centre, o) < km(centre, m) * OSLONA.blizej && roznica(namiar(centre, o), namiar(centre, m)) < OSLONA.kat);
  const daleko = duze.filter((m) => km(centre, m) >= DALEKO.minKm && km(centre, m) <= DALEKO.maxKm && !zaslonieta(m));
  const zapasowe = swoje.filter((m) => m.ludzi >= DALEKO.zapas.minLudzi && km(centre, m) >= DALEKO.minKm && km(centre, m) <= DALEKO.zapas.maxKm);
  const plWylot = [];
  // Ways out sorted round the clock, so neighbouring roads share out the names fairly.
  for (const w of wyloty) {
    const ll = city.toLatLon(w.x, w.y);
    const naRadzie = namiar(centre, ll);
    const dalej = city.toLatLon(w.x + w.dx * 3000 * M, w.y + w.dy * 3000 * M);
    const naDrodze = namiar(ll, dalej);
    // A circular mean: mostly where the road leaves the city, a bit where it heads.
    const r = Math.PI / 180;
    w.kierunek = (Math.atan2(0.6 * Math.sin(naRadzie * r) + 0.4 * Math.sin(naDrodze * r), 0.6 * Math.cos(naRadzie * r) + 0.4 * Math.cos(naDrodze * r)) / r + 360) % 360;
  }
  wyloty.sort((a, b) => a.kierunek - b.kierunek);
  // Each big city on one sign only: the way out that points at it best gets it (pairs taken best first); the
  // smaller fallback cities only for ways out that got no big one.
  const zajete = new Set();
  const przydziel = (lista, ocena) => {
    const pary = [];
    for (const w of wyloty) {
      if (w.far) continue;
      for (const m of lista) { const a = roznica(namiar(centre, m), w.kierunek); if (a <= KAT && !zajete.has(m)) pary.push({ w, m, o: ocena(m, km(centre, m), a) }); }
    }
    for (const pr of pary.sort((a, b) => a.o - b.o)) if (!pr.w.far && !zajete.has(pr.m)) { pr.w.far = pr.m; zajete.add(pr.m); }
  };
  przydziel(daleko, (m, d, a) => 2 * (a / KAT) ** 2 + d / 200 - 0.25 * Math.log10(m.ludzi / 1e5));
  przydziel(zapasowe, (m, d, a) => (a / KAT) ** 2 + d / 200 - 0.3 * Math.log10(m.ludzi / 4e4));
  for (const w of wyloty) {
    const far = w.far ?? null;
    const near = wybierz(w.kierunek, blisko.filter((m) => m !== far && (!far || km(centre, m) < km(centre, far) * 0.8)),
      (m, d, a) => 1.2 * (a / KAT) ** 2 + Math.abs(d - BLISKO.srodekKm) / 60 - 0.15 * Math.log10(m.ludzi / 1500));
    if (!far && !near) continue;
    // Directions only, no kilometres (owner, 2 Nov 2026: steampunk boards, not real road signs).
    const nazwa = (m) => (m ? [m.pl, m.en] : [0, 0]);
    plWylot.push([Math.round(w.x), Math.round(w.y), Math.round(Math.atan2(w.dy, w.dx) * 100) / 100, ...nazwa(near), ...nazwa(far)]);
    w.plan = true;
  }

  // ---------------------------------------------------------------- where boards stand
  const kandydaci = [];
  // By every way out, W_GLAB_M back into the city along its road.
  for (const w of wyloty) {
    if (!w.plan || !w.l) continue;
    const p = w.l.pts;
    // Walk the road from the crossing towards the inside.
    let x = w.x, y = w.y, zostalo = W_GLAB_M * M, i = w.inA ? w.i : w.i + 2, krok = w.inA ? -2 : 2;
    let dx = -w.dx, dy = -w.dy;
    while (zostalo > 0 && i >= 0 && i + 1 < p.length) {
      const nx = p[i], ny = p[i + 1], d = Math.hypot(nx - x, ny - y);
      if (d >= zostalo) { x += ((nx - x) / d) * zostalo; y += ((ny - y) / d) * zostalo; zostalo = 0; break; }
      if (d > 0) { dx = (nx - x) / d; dy = (ny - y) / d; }
      x = nx; y = ny; zostalo -= d; i += krok;
    }
    kandydaci.push({ x, y, dx, dy, szer: w.l.width, waga: 0, co: 'wylot' });
  }
  // By the stations (railway and bus).
  for (const pl of city.places)
    if (pl.kind === 'station' && wMiescie(pl.door.x, pl.door.y)) kandydaci.push({ x: pl.door.x, y: pl.door.y, dx: 0, dy: 0, szer: 0, waga: 1, co: 'dworzec' });
  // Big roundabouts (their pieces joined by where they lie).
  const ronda = [];
  for (const pts of rondaLL) {
    const xy = pts.map(([lon, lat]) => city.fromLatLon(lat, lon));
    let dl = 0, sx = 0, sy = 0;
    for (let i = 1; i < xy.length; i++) dl += Math.hypot(xy[i].x - xy[i - 1].x, xy[i].y - xy[i - 1].y);
    for (const q of xy) { sx += q.x; sy += q.y; }
    const s = { x: sx / xy.length, y: sy / xy.length, dl, n: 1 };
    const r = ronda.find((o) => Math.hypot(o.x - s.x, o.y - s.y) < 80 * M);
    if (r) { r.x = (r.x * r.n + s.x) / (r.n + 1); r.y = (r.y * r.n + s.y) / (r.n + 1); r.n++; r.dl += dl; } else ronda.push(s);
  }
  for (const r of ronda) if (r.dl >= RONDO_MIN_M * M && wMiescie(r.x, r.y)) kandydaci.push({ x: r.x, y: r.y, dx: 0, dy: 0, szer: r.dl / Math.PI, waga: 2, co: 'rondo' });
  // Crossings of main roads: road points shared by differently named main roads (one of them major).
  const wezly = new Map();
  for (const l of city.lines) {
    if ((l.kind !== 'major' && l.kind !== 'medium') || !l.name || !wRamce(l)) continue;
    for (let i = 0; i < l.pts.length; i += 2) {
      const k = `${Math.round(l.pts[i] / 3)}:${Math.round(l.pts[i + 1] / 3)}`;
      const w = wezly.get(k) ?? wezly.set(k, { x: l.pts[i], y: l.pts[i + 1], nazwy: new Set(), major: 0 }).get(k);
      w.nazwy.add(l.name);
      if (l.kind === 'major') w.major++;
    }
  }
  for (const w of wezly.values())
    if (w.nazwy.size >= 2 && w.major && wMiescie(w.x, w.y)) kandydaci.push({ x: w.x, y: w.y, dx: 0, dy: 0, szer: 24 * M, waga: w.major >= 2 && w.nazwy.size >= 2 ? 3 : 4, co: 'wezel' });
  kandydaci.sort((a, b) => a.waga - b.waga);
  const miejsca = [];
  const ile = {};
  for (const k of kandydaci) {
    if (miejsca.length >= MAKS_TABLIC) break;
    const odstep = (k.co === 'wylot' || k.co === 'dworzec' ? 300 : ODSTEP_M) * M;
    if (miejsca.some((m) => Math.hypot(m.x - k.x, m.y - k.y) < odstep)) continue;
    const p = miejsce(k.x, k.y, k.dx, k.dy, k.szer);
    if (!p) continue;
    miejsca.push({ x: p.x, y: p.y });
    ile[k.co] = (ile[k.co] ?? 0) + 1;
  }

  // ---------------------------------------------------------------- the board's map
  // Drawn like a map burnt into wood (owner, 2 Nov 2026): a rough outline, only the main roads, railways and rivers
  // smoothed hard, lakes as blue patches (an ellipse each), short bits (slip roads, sidings) dropped.
  const tol = 40 * M;
  const dlugosc = (pts) => { let d = 0; for (let i = 2; i < pts.length; i += 2) d += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]); return d; };
  const plan = {
    granica: rings.map((r) => uprosc(r, 120 * M)).filter((r) => r.length >= 6),
    drogi: [],
    tory: [],
    rzeki: [],
    jeziora: [],
    wyloty: plWylot,
    srodek: [Math.round(c.x), Math.round(c.y)],
  };
  for (const l of city.lines) {
    if (!wRamce(l)) continue;
    if (l.kind === 'major' && dlugosc(l.pts) > 300 * M) plan.drogi.push(uprosc(l.pts, tol));
    else if (l.kind === 'rail' && dlugosc(l.pts) > 400 * M) plan.tory.push(uprosc(l.pts, tol));
    else if (l.kind === 'river' && dlugosc(l.pts) > 500 * M) plan.rzeki.push(uprosc(l.pts, tol));
  }
  // Lakes: the outer ring's centre and spread along its main direction → [x, y, rx, ry, angle].
  for (const a of city.areas) {
    if (a.kind !== 'water' || !wRamce(a) || (a.x1 - a.x0) * (a.y1 - a.y0) < (300 * M) ** 2) continue;
    const r = a.rings[0], n = r.length / 2;
    let sx = 0, sy = 0;
    for (let i = 0; i < r.length; i += 2) { sx += r[i]; sy += r[i + 1]; }
    const mx = sx / n, my = sy / n;
    let xx = 0, yy = 0, xy = 0;
    for (let i = 0; i < r.length; i += 2) { const dx = r[i] - mx, dy = r[i + 1] - my; xx += dx * dx; yy += dy * dy; xy += dx * dy; }
    const kat = 0.5 * Math.atan2(2 * xy, xx - yy);
    // Half-widths: the farthest outline point along and across that direction, a bit less (a blob, not a box).
    let ra = 0, rb = 0;
    for (let i = 0; i < r.length; i += 2) {
      const dx = r[i] - mx, dy = r[i + 1] - my;
      ra = Math.max(ra, Math.abs(dx * Math.cos(kat) + dy * Math.sin(kat)));
      rb = Math.max(rb, Math.abs(-dx * Math.sin(kat) + dy * Math.cos(kat)));
    }
    // Long thin water (pieces of a river drawn as areas) is left to the river lines.
    if (rb < ra * 0.35) continue;
    plan.jeziora.push([Math.round(mx), Math.round(my), Math.round(ra * 0.85), Math.round(rb * 0.85), Math.round(kat * 100) / 100]);
  }
  console.log(`tablice: ${miejsca.length} boards (${Object.entries(ile).map(([k, v]) => `${k} ${v}`).join(', ')}), ${plWylot.length} ways out: ${plWylot.map((w) => `${w[3] || '–'}/${w[5] || '–'}`).join(', ')} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  return { plan, miejsca: miejsca.map((m) => [m.x, m.y]) };
}
