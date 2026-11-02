// City boards for every town in the world (owner, 2 Nov 2026: „jak to zrobić dla każdego miasta świata?”). Nothing
// is stored for it: when the hero walks into a town, its board map is worked out in the game from the world map's own
// low-zoom tiles – zoom 9 for the built-up land, main roads and water, zoom 8 for the towns on the way, zoom 6 for
// the big cities roads lead to (with population and Polish/English names). Lublin keeps its own board data, made
// from the full map by split-map (scripts/tablice/tablice.mjs) – the rules here are the same, only coarser.
import type { CityMap, PlanMiasta } from '../map/CityMap';
import { PX_PER_M, pointInRings } from '../map/CityMap';
import { kafelSwiata, tilesOver } from '../map/world';
import { krajWPunkcie } from '../kraj';
import { TABLICE_SWIAT as T } from '../content/tablice';

type LL = { lat: number; lon: number };
export interface MiastoTablic { id: string; pl: string; en: string; lat: number; lon: number; ludzi: number; r: number }
interface Miejsce { pl: string; en: string; lat: number; lon: number; ludzi: number }
interface Spot { x: number; y: number; dx: number; dy: number }

const metry = (a: LL, b: LL) => Math.hypot((b.lat - a.lat) * 111_132, (b.lon - a.lon) * 111_320 * Math.cos((a.lat * Math.PI) / 180));
const namiar = (a: LL, b: LL) => ((Math.atan2((b.lon - a.lon) * Math.cos((a.lat * Math.PI) / 180), b.lat - a.lat) * 180) / Math.PI + 360) % 360;
const roznica = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
/** A box of ± m metres around a point, for tilesOver (s, w, n, e). */
const ramka = (c: LL, m: number) => {
  const dl = m / 111_132, dn = m / (111_320 * Math.cos((c.lat * Math.PI) / 180));
  return [c.lat - dl, c.lon - dn, c.lat + dl, c.lon + dn] as const;
};

/** A feature point in a z/x/y tile → lat/lon. */
function naLL(z: number, tx: number, ty: number, ext: number, q: { x: number; y: number }): LL {
  const n = 2 ** z, x = tx + q.x / ext, y = ty + q.y / ext;
  return { lat: (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI, lon: (x / n) * 360 - 180 };
}

/** Every town with a population in the tiles of zoom z over a box. */
async function miejsca(z: number, c: LL, m: number): Promise<Miejsce[]> {
  const [s, w, n, e] = ramka(c, m);
  const out: Miejsce[] = [];
  const widziane = new Set<string>();
  for (const [tx, ty] of tilesOver(z, s, w, n, e)) {
    const vt = await kafelSwiata(z, tx, ty).catch(() => null);
    const l = vt?.layers.places;
    for (let i = 0; l && i < l.length; i++) {
      const f = l.feature(i), p = f.properties;
      if (p.kind !== 'locality' || !p.population || !p.name) continue;
      const q = f.loadGeometry()[0]?.[0];
      if (!q) continue;
      const ll = naLL(z, tx, ty, l.extent, q);
      const k = `${p.name}:${ll.lat.toFixed(2)}:${ll.lon.toFixed(2)}`;
      if (widziane.has(k)) continue;
      widziane.add(k);
      out.push({ pl: String(p['name:pl'] ?? p.name), en: String(p['name:en'] ?? p.name), ...ll, ludzi: Number(p.population) });
    }
  }
  return out;
}

/** How far a town of this size reaches (built-up radius, the artillery generator's rule). */
const zasieg = (ludzi: number) => Math.max(T.minPromienM, 9.5 * Math.sqrt(ludzi));

/** The town the hero stands in (≥ T.minLudzi people), or null. */
export async function miastoPrzy(ll: LL): Promise<MiastoTablic | null> {
  const lista = (await miejsca(8, ll, T.szukajM)).filter((m) => m.ludzi >= T.minLudzi && metry(ll, m) < zasieg(m.ludzi) * T.wMiescie);
  if (!lista.length) return null;
  const m = lista.sort((a, b) => b.ludzi - a.ludzi)[0];
  return { id: `${m.en}:${m.lat.toFixed(3)},${m.lon.toFixed(3)}`, pl: m.pl, en: m.en, lat: m.lat, lon: m.lon, ludzi: m.ludzi, r: zasieg(m.ludzi) };
}

/** Douglas–Peucker on a flat list. */
function uprosc(pts: number[], tol: number): number[] {
  const n = pts.length / 2;
  if (n < 3) return pts.map(Math.round);
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const ax = pts[a * 2], ay = pts[a * 2 + 1], dx = pts[b * 2] - ax, dy = pts[b * 2 + 1] - ay, L = Math.hypot(dx, dy) || 1;
    let best = -1, bd = tol;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i * 2] - ax) * dy - (pts[i * 2 + 1] - ay) * dx) / L;
      if (d > bd) { bd = d; best = i; }
    }
    if (best >= 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(Math.round(pts[i * 2]), Math.round(pts[i * 2 + 1]));
  return out;
}

const dlugosc = (p: number[]) => { let d = 0; for (let i = 2; i < p.length; i += 2) d += Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]); return d; };
const MIASTOWE = new Set(['residential', 'commercial', 'industrial', 'retail']);
const GLOWNE = new Set(['motorway', 'trunk', 'primary']);
const JEZIORA = new Set(['lake', 'water', 'reservoir', 'basin', 'pond']);

/**
 * A town's board: its plan in this map's pixels and where boards could stand (refined to free ground later, once the
 * game tiles there are loaded). Names on the way-out signs follow the hero's language at drawing time.
 */
export async function planMiasta(city: CityMap, m: MiastoTablic): Promise<{ plan: PlanMiasta; spoty: Spot[] }> {
  const M = PX_PER_M;
  const c = city.fromLatLon(m.lat, m.lon);
  const zakres = Math.max(2.2 * m.r, T.minZakresM);
  const [s, w, n, e] = ramka(m, zakres);
  // ---- geometry from zoom 9
  const miastowe: { x: number; y: number }[][] = [];
  const drogi: { pts: number[]; nazwa: string; id: number }[] = [];
  const rzeki: number[][] = [];
  const woda: { x: number; y: number }[][] = [];
  let nr = 0;
  for (const [tx, ty] of tilesOver(9, s, w, n, e)) {
    const vt = await kafelSwiata(9, tx, ty).catch(() => null);
    if (!vt) continue;
    const px = (ext: number) => (q: { x: number; y: number }) => { const ll = naLL(9, tx, ty, ext, q); return city.fromLatLon(ll.lat, ll.lon); };
    const lu = vt.layers.landuse;
    for (let i = 0; lu && i < lu.length; i++) {
      const f = lu.feature(i);
      if (f.type === 3 && MIASTOWE.has(String(f.properties.kind))) for (const r of f.loadGeometry()) miastowe.push(r.map(px(lu.extent)));
    }
    const rd = vt.layers.roads;
    for (let i = 0; rd && i < rd.length; i++) {
      const f = rd.feature(i), p = f.properties;
      if (f.type !== 2 || !GLOWNE.has(String(p.kind_detail))) continue;
      for (const g of f.loadGeometry()) drogi.push({ pts: g.flatMap((q) => { const v = px(rd.extent)(q); return [v.x, v.y]; }), nazwa: String(p.ref ?? p.name ?? ''), id: nr++ });
    }
    const wd = vt.layers.water;
    for (let i = 0; wd && i < wd.length; i++) {
      const f = wd.feature(i), k = String(f.properties.kind_detail ?? f.properties.kind);
      if (f.type === 2 && (k === 'river' || f.properties.kind === 'river')) for (const g of f.loadGeometry()) rzeki.push(g.flatMap((q) => { const v = px(wd.extent)(q); return [v.x, v.y]; }));
      if (f.type === 3 && (JEZIORA.has(k) || k === 'ocean' || k === 'sea' || f.properties.kind === 'water')) for (const r of f.loadGeometry()) if (r.length > 3) woda.push(r.map(px(wd.extent)));
    }
  }
  // ---- the town's outline: built-up land reached from the centre, read along rays (rough on purpose – carved)
  const kom = Math.max(T.kratkaM, m.r / 40) * M;
  const R = zakres * M;
  const N = Math.ceil((2 * R) / kom);
  const siatka = new Uint8Array(N * N);
  const naKom = (x: number, y: number) => [Math.floor((x - c.x + R) / kom), Math.floor((y - c.y + R) / kom)] as const;
  for (const r of miastowe) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const q of r) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
    const [a0, b0] = naKom(x0, y0), [a1, b1] = naKom(x1, y1);
    const ring = [r.flatMap((q) => [q.x, q.y])];
    for (let a = Math.max(0, a0); a <= Math.min(N - 1, a1); a++)
      for (let b = Math.max(0, b0); b <= Math.min(N - 1, b1); b++)
        if (!siatka[b * N + a] && pointInRings(ring, c.x - R + (a + 0.5) * kom, c.y - R + (b + 0.5) * kom)) siatka[b * N + a] = 1;
  }
  const PROMIENI = 72;
  const promien: number[] = [];
  for (let k = 0; k < PROMIENI; k++) {
    const kat = (k / PROMIENI) * Math.PI * 2;
    let ost = 0, przerwa = 0;
    for (let d = 0; d < R; d += kom / 2) {
      const [a, b] = naKom(c.x + Math.cos(kat) * d, c.y + Math.sin(kat) * d);
      if (a < 0 || b < 0 || a >= N || b >= N) break;
      // The old town in the middle often has no built-up land at this zoom: the first gap may be longer.
      if (siatka[b * N + a]) { ost = d; przerwa = 0; } else if ((przerwa += kom / 2) > (ost ? T.przerwaM : T.przerwaStartM) * M) break;
    }
    promien.push(Math.max(ost, m.r * T.minCzescPromienia * M));
  }
  for (let p = 0; p < 2; p++) for (let k = 0; k < PROMIENI; k++) promien[k] = (promien[(k + PROMIENI - 1) % PROMIENI] + 2 * promien[k] + promien[(k + 1) % PROMIENI]) / 4;
  const granica = promien.flatMap((d, k) => [Math.round(c.x + Math.cos((k / PROMIENI) * Math.PI * 2) * d), Math.round(c.y + Math.sin((k / PROMIENI) * Math.PI * 2) * d)]);
  const rings = [granica];
  const wMiescie = (x: number, y: number) => pointInRings(rings, x, y);

  // ---- ways out: main roads crossing the outline, heading out of town
  const krzyz: { x: number; y: number; dx: number; dy: number; d: (typeof drogi)[number]; i: number; inA: boolean }[] = [];
  for (const d of drogi) {
    const p = d.pts;
    for (let i = 0; i + 3 < p.length; i += 2) {
      const inA = wMiescie(p[i], p[i + 1]);
      if (inA === wMiescie(p[i + 2], p[i + 3])) continue;
      const sg = inA ? 1 : -1, L = Math.hypot(p[i + 2] - p[i], p[i + 3] - p[i + 1]) || 1;
      const dx = ((p[i + 2] - p[i]) / L) * sg, dy = ((p[i + 3] - p[i + 1]) / L) * sg;
      const x = (p[i] + p[i + 2]) / 2, y = (p[i + 1] + p[i + 3]) / 2, rl = Math.hypot(x - c.x, y - c.y) || 1;
      if ((dx * (x - c.x) + dy * (y - c.y)) / rl < T.promieniowo) continue;
      krzyz.push({ x, y, dx, dy, d, i, inA });
    }
  }
  const kierunek = (k: { x: number; y: number; dx: number; dy: number }) => Math.atan2(k.dy * 0.5 + (k.y - c.y) / Math.hypot(k.x - c.x, k.y - c.y), k.dx * 0.5 + (k.x - c.x) / Math.hypot(k.x - c.x, k.y - c.y));
  const wyloty: typeof krzyz = [];
  for (const k of krzyz)
    if (!wyloty.some((w2) => Math.hypot(w2.x - k.x, w2.y - k.y) < T.jedenWylotM * M && Math.abs(((kierunek(w2) - kierunek(k) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) < (T.kat * Math.PI) / 180)) wyloty.push(k);

  // ---- names: a town on the way (zoom 8) and the big city the road leads to (zoom 6), of this country
  const kraj = krajWPunkcie(m.lat, m.lon);
  const [bliskie, dalekieM] = await Promise.all([miejsca(8, m, T.blisko.maxKm * 1000), miejsca(6, m, T.daleko.maxKm * 1000)]);
  const swoje = (l: Miejsce[]) => l.filter((q) => metry(m, q) > m.r && (!kraj || krajWPunkcie(q.lat, q.lon) === kraj));
  const km = (q: Miejsce) => metry(m, q) / 1000;
  const blisko = swoje(bliskie).filter((q) => q.ludzi >= T.blisko.minLudzi && q.ludzi <= T.blisko.maxLudzi && km(q) >= T.blisko.minKm && km(q) <= T.blisko.maxKm);
  // The same city comes in both zoom levels: keep it once.
  const duze = [...new Map(swoje([...dalekieM, ...bliskie]).map((q) => [`${q.en}:${Math.round(q.lat * 10)}:${Math.round(q.lon * 10)}`, q] as const)).values()];
  // The first big city that way: one with another big city much nearer in nearly the same direction is hidden.
  const wielkie = duze.filter((q) => q.ludzi >= T.daleko.minLudzi);
  const zaslonieta = (q: Miejsce) => wielkie.some((o) => o !== q && km(o) < km(q) * T.oslona.blizej && roznica(namiar(m, o), namiar(m, q)) < T.oslona.kat);
  const daleko = wielkie.filter((q) => km(q) >= T.daleko.minKm && km(q) <= T.daleko.maxKm && !zaslonieta(q));
  const zapas = duze.filter((q) => q.ludzi >= T.daleko.zapasLudzi && km(q) >= T.daleko.minKm && km(q) <= T.daleko.zapasKm);
  const uzyte = new Map<string, number>();
  const wybierz = (kier: number, lista: Miejsce[], ocena: (q: Miejsce, d: number, a: number) => number) => {
    let best: Miejsce | null = null, bo = Infinity;
    for (const q of lista) {
      const a = roznica(namiar(m, q), kier);
      if (a > T.kat) continue;
      const o = ocena(q, km(q), a) + 0.35 * (uzyte.get(q.pl) ?? 0);
      if (o < bo) { bo = o; best = q; }
    }
    if (best) uzyte.set(best.pl, (uzyte.get(best.pl) ?? 0) + 1);
    return best;
  };
  const plWylot: PlanMiasta['wyloty'] = [];
  const zWylotami: typeof krzyz = [];
  const kierunki = wyloty.map((wy) => {
    const ll = city.toLatLon(wy.x, wy.y);
    const dalej = city.toLatLon(wy.x + wy.dx * 3000 * M, wy.y + wy.dy * 3000 * M);
    const r = Math.PI / 180, a1 = namiar(m, ll), a2 = namiar(ll, dalej);
    return (Math.atan2(0.6 * Math.sin(a1 * r) + 0.4 * Math.sin(a2 * r), 0.6 * Math.cos(a1 * r) + 0.4 * Math.cos(a2 * r)) / r + 360) % 360;
  });
  // Each big city on one sign only: the way out that points at it best gets it (pairs taken best first); the
  // smaller fallback cities only for ways out that got no big one.
  const dalekie = new Map<number, Miejsce>();
  const zajete = new Set<Miejsce>();
  const przydziel = (lista: Miejsce[], ocena: (q: Miejsce, d: number, a: number) => number) => {
    const pary: { w: number; q: Miejsce; o: number }[] = [];
    kierunki.forEach((kier, w) => {
      if (dalekie.has(w)) return;
      for (const q of lista) { const a = roznica(namiar(m, q), kier); if (a <= T.kat && !zajete.has(q)) pary.push({ w, q, o: ocena(q, km(q), a) }); }
    });
    for (const pr of pary.sort((a, b) => a.o - b.o)) if (!dalekie.has(pr.w) && !zajete.has(pr.q)) { dalekie.set(pr.w, pr.q); zajete.add(pr.q); }
  };
  przydziel(daleko, (q, d, a) => 2 * (a / T.kat) ** 2 + d / 200 - 0.25 * Math.log10(q.ludzi / 1e5));
  przydziel(zapas, (q, d, a) => (a / T.kat) ** 2 + d / 200 - 0.3 * Math.log10(q.ludzi / 4e4));
  for (const [w, wy] of wyloty.entries()) {
    const kier = kierunki[w];
    const far = dalekie.get(w) ?? null;
    const near = wybierz(kier, blisko.filter((q) => q !== far && (!far || km(q) < km(far) * 0.8)),
      (q, d, a) => 1.2 * (a / T.kat) ** 2 + Math.abs(d - T.blisko.srodekKm) / 60 - 0.15 * Math.log10(q.ludzi / 1500));
    if (!far && !near) continue;
    plWylot.push([Math.round(wy.x), Math.round(wy.y), Math.round(Math.atan2(wy.dy, wy.dx) * 100) / 100, near?.pl ?? 0, near?.en ?? 0, far?.pl ?? 0, far?.en ?? 0]);
    zWylotami.push(wy);
  }

  // ---- lakes (an ellipse each) and the sea (a rough patch)
  const jeziora: number[][] = [];
  const morza: number[][] = [];
  for (const r of woda) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, sx = 0, sy = 0;
    for (const q of r) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); sx += q.x; sy += q.y; }
    if ((x1 - x0) * (y1 - y0) < (T.jezioroMinM * M) ** 2) continue;
    if (x1 - x0 > 1.5 * R || y1 - y0 > 1.5 * R) { morza.push(uprosc(r.flatMap((q) => [q.x, q.y]), 300 * M)); continue; }
    const mx = sx / r.length, my = sy / r.length;
    let xx = 0, yy = 0, xy = 0;
    for (const q of r) { const dx = q.x - mx, dy = q.y - my; xx += dx * dx; yy += dy * dy; xy += dx * dy; }
    const kat = 0.5 * Math.atan2(2 * xy, xx - yy);
    let ra = 0, rb = 0;
    for (const q of r) { const dx = q.x - mx, dy = q.y - my; ra = Math.max(ra, Math.abs(dx * Math.cos(kat) + dy * Math.sin(kat))); rb = Math.max(rb, Math.abs(-dx * Math.sin(kat) + dy * Math.cos(kat))); }
    if (rb < ra * 0.35) continue;
    jeziora.push([Math.round(mx), Math.round(my), Math.round(ra * 0.85), Math.round(rb * 0.85), Math.round(kat * 100) / 100]);
  }

  // ---- where boards could stand: by each way out (inside town, along its road) and at main crossings
  const spoty: Spot[] = [];
  for (const wy of zWylotami) {
    const p = wy.d.pts;
    let x = wy.x, y = wy.y, zost = T.wGlabM * M, i = wy.inA ? wy.i : wy.i + 2;
    const krok = wy.inA ? -2 : 2;
    let dx = -wy.dx, dy = -wy.dy;
    while (zost > 0 && i >= 0 && i + 1 < p.length) {
      const d = Math.hypot(p[i] - x, p[i + 1] - y);
      if (d >= zost) { x += ((p[i] - x) / d) * zost; y += ((p[i + 1] - y) / d) * zost; break; }
      if (d > 0) { dx = (p[i] - x) / d; dy = (p[i + 1] - y) / d; }
      x = p[i]; y = p[i + 1]; zost -= d; i += krok;
    }
    spoty.push({ x, y, dx, dy });
  }
  const wezly = new Map<string, { x: number; y: number; ile: Set<number> }>();
  for (const d of drogi)
    for (let i = 0; i < d.pts.length; i += 2) {
      const k = `${Math.round(d.pts[i] / (40 * M))}:${Math.round(d.pts[i + 1] / (40 * M))}`;
      const w2 = wezly.get(k) ?? wezly.set(k, { x: d.pts[i], y: d.pts[i + 1], ile: new Set() }).get(k)!;
      w2.ile.add(d.id);
    }
  for (const w2 of wezly.values()) if (w2.ile.size >= 3 && wMiescie(w2.x, w2.y)) spoty.push({ x: w2.x, y: w2.y, dx: 0, dy: 0 });
  const wybrane: Spot[] = [];
  for (const sp of spoty) if (wybrane.length < T.maksTablic && !wybrane.some((q) => Math.hypot(q.x - sp.x, q.y - sp.y) < T.odstepM * M)) wybrane.push(sp);

  const plan: PlanMiasta = {
    granica: [uprosc(granica, 60 * M)],
    drogi: drogi.filter((d) => dlugosc(d.pts) > 300 * M && d.pts.some((v, j) => j % 2 === 0 && Math.abs(v - c.x) < R && Math.abs(d.pts[j + 1] - c.y) < R)).map((d) => uprosc(d.pts, 40 * M)),
    tory: [],
    rzeki: rzeki.filter((r) => dlugosc(r) > 500 * M).map((r) => uprosc(r, 40 * M)),
    jeziora,
    morza,
    wyloty: plWylot,
    srodek: [Math.round(c.x), Math.round(c.y)],
  };
  return { plan, spoty: wybrane };
}

/** A free spot for a board near a planned one: off the road first, then anything free. */
export function wolneMiejsce(city: CityMap, sp: Spot) {
  const L = Math.hypot(sp.dx, sp.dy);
  const kier: [number, number][] = L ? [[-sp.dy / L, sp.dx / L], [sp.dy / L, -sp.dx / L]] : [];
  for (let a = 0; a < 8; a++) kier.push([Math.cos((a * Math.PI) / 4), Math.sin((a * Math.PI) / 4)]);
  for (const pozaDroga of [true, false])
    for (const odM of [8, 12, 18, 26, 36])
      for (const [nx, ny] of kier) {
        const x = sp.x + nx * odM * PX_PER_M, y = sp.y + ny * odM * PX_PER_M;
        if (!city.isFree(x, y, 6, 4) || (pozaDroga && city.surfaceAt(x, y) === 'asfalt')) continue;
        return { x: Math.round(x), y: Math.round(y) };
      }
  return null;
}

/** Is there a way-out board within reach of its spot already (avoid two boards on one spot after a restart)? */
export function blisko(city: CityMap, x: number, y: number, m = T.odstepM * 0.5) {
  return city.tablice.some((t) => Math.hypot(t.x - x, t.y - y) < m * PX_PER_M);
}

