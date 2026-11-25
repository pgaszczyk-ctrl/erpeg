// The loading zoom's close-up layers (owner, 24 Nov 2026: „zoomowana mapa jest bardzo brzydka – zróbmy więcej
// warstw i zbliżajmy, ujawniając więcej szczegółów, a nie coraz większe piksele”).
//
// The painted Earth poster is only enlarged a little; then this canvas takes over: an old-map drawing made
// in the phone from the world map's own vector tiles (land, water, forests, towns, roads, borders, names),
// redrawn every frame at the screen's real pixels, so it stays sharp at any zoom. Each step closer brings in
// tiles of a finer zoom (continent → region → surroundings → town), cross-faded over the coarser ones.
// Only the few tiles around the destination are read, a level at a time, while the zoom reaches it.

import { tx as txt } from '../i18n';

type VT = import('@mapbox/vector-tile').VectorTile;
type Pt = Float64Array; // x0, y0, x1, y1… in world units (0..1 = whole Web Mercator world)
type Napis = { x: number; y: number; t: string; r: number; kraj: boolean; stolica: boolean };
type Poziom = { z: number; ziemia: Pt[][]; woda: Pt[][]; rzeki: Pt[]; ziel: Pt[][]; miasto: Pt[][]; drogi: Record<string, Pt[]>; granice: Pt[]; napisy: Napis[]; kafle: [number, number, boolean][]; gotowe: boolean; alfa: number };

/** Tunables. Spans are the screen's width in km. */
export const OKOLICA = {
  /** Tile zooms used, coarse to fine. */
  poziomy: [2, 5, 8, 11],
  /** Where the canvas starts (km across the screen) and where the zoom stops. */
  odKm: 7000,
  doKm: 5,
  /** Length of the zoom (ms); slow at the end, then it holds still until the game is shown. */
  czasMs: 6500,
  /** A finer level fades in between these multiples of its tile's width. */
  wejscieOd: 2.4,
  wejscieDo: 1.3,
  kolory: {
    morze: '#9fb8b8', lad: '#e9dcb8', ziel: '#c3c993', miasto: '#d7b98f', woda: '#8fb0b4', brzeg: '#6f5a3c',
    droga: '#9a5a32', autostrada: '#7e3a1e', granica: '#8d6b4d', tusz: '#3a2716', aureola: 'rgba(240,228,196,.85)',
  },
};

const ZIEL = new Set(['forest', 'wood', 'nature_reserve', 'national_park', 'park', 'protected_area']);
const MIASTO = new Set(['residential', 'commercial', 'industrial', 'retail', 'urban_area']);
const WODA = new Set(['ocean', 'sea', 'lake', 'water', 'reservoir', 'basin', 'bay', 'strait', 'river', 'riverbank', 'lagoon']);
const SZEROKOSC_DROGI: Record<string, number> = { minor_road: 0.7, medium_road: 1.2, major_road: 2, highway: 3 };
const KM_SWIATA = 40075.016686;

const mx = (lon: number) => (lon + 180) / 360;
const my = (lat: number) => (1 - Math.asinh(Math.tan((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180)) / Math.PI) / 2;

let biezace: Okolica | null = null;

/** Start reading the levels for a destination (call as soon as it is known). */
export function przygotujOkolice(host: HTMLElement, lat: number, lon: number) {
  if (biezace && biezace.lat === lat && biezace.lon === lon) return biezace;
  biezace?.zamknij();
  biezace = new Okolica(host, lat, lon);
  return biezace;
}
export function zamknijOkolice() { biezace?.zamknij(); biezace = null; }

class Okolica {
  readonly canvas = document.createElement('canvas');
  private poziomy: Poziom[];
  private cx: number; private cy: number;
  private kmNaJednostke: number;
  private t0 = 0; private raf = 0; private zamkniete = false;
  private startKm = OKOLICA.odKm;
  private endKm = OKOLICA.doKm;
  /** Resolved when the coarsest level is in (the canvas can be shown). */
  readonly gotowa: Promise<boolean>;

  constructor(private host: HTMLElement, readonly lat: number, readonly lon: number) {
    this.cx = mx(lon); this.cy = my(lat);
    this.kmNaJednostke = KM_SWIATA * Math.cos((lat * Math.PI) / 180);
    this.poziomy = OKOLICA.poziomy.map((z) => ({ z, ziemia: [], woda: [], rzeki: [], ziel: [], miasto: [], drogi: {}, granice: [], napisy: [], kafle: [], gotowe: false, alfa: 0 }));
    this.canvas.className = 'lm-okolica';
    this.canvas.setAttribute('aria-hidden', 'true');
    host.querySelector('.lm-plate')?.after(this.canvas);
    // The first two levels at once; finer ones when the zoom gets near them.
    this.gotowa = this.wczytaj(0).then((ok) => { void this.wczytaj(1); return ok; });
  }

  /** Width of one tile of level i in km at this latitude. */
  private kafelKm(i: number) { return this.kmNaJednostke / 2 ** this.poziomy[i].z; }

  private async wczytaj(i: number): Promise<boolean> {
    const p = this.poziomy[i];
    if (!p || p.gotowe || this.zamkniete) return !!p?.gotowe;
    const { kafelSwiata } = await import('../map/world');
    const n = 2 ** p.z;
    // The tiles that can be on screen while this level shows: around the destination ± its widest view.
    const W = Math.max(1, this.host.clientWidth), H = Math.max(1, this.host.clientHeight);
    const rJ = (Math.min(this.startKm, this.kafelKm(i) * OKOLICA.wejscieOd) / this.kmNaJednostke) / 2;
    const rY = rJ * (H / W);
    const x0 = Math.floor((this.cx - rJ) * n), x1 = Math.floor((this.cx + rJ) * n);
    const y0 = Math.max(0, Math.floor((this.cy - rY) * n)), y1 = Math.min(n - 1, Math.floor((this.cy + rY) * n));
    const lista: [number, number][] = [];
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) lista.push([x, y]);
    lista.sort((a, b) => Math.hypot(a[0] + 0.5 - this.cx * n, a[1] + 0.5 - this.cy * n) - Math.hypot(b[0] + 0.5 - this.cx * n, b[1] + 0.5 - this.cy * n));
    const kafle = await Promise.all(lista.slice(0, 9).map(([x, y]) => kafelSwiata(p.z, x, y).then((vt) => ({ vt, x, y })).catch(() => null)));
    if (this.zamkniete) return false;
    let jest = false;
    for (const k of kafle) if (k?.vt) { const z0 = p.ziemia.length; this.dodaj(p, k.vt, k.x, k.y); p.kafle.push([k.x, k.y, p.ziemia.length > z0]); jest = true; }
    p.gotowe = jest;
    return jest;
  }

  private dodaj(p: Poziom, vt: VT, tx: number, ty: number) {
    const n = 2 ** p.z;
    const geo = (ext: number, g: { x: number; y: number }[][]) => g.map((r) => {
      const a = new Float64Array(r.length * 2);
      r.forEach((q, j) => { a[j * 2] = (tx + q.x / ext) / n; a[j * 2 + 1] = (ty + q.y / ext) / n; });
      return a;
    });
    const L = vt.layers;
    const kazdy = (name: string, fn: (f: import('@mapbox/vector-tile').VectorTileFeature, ext: number) => void) => {
      const l = L[name];
      for (let i = 0; l && i < l.length; i++) fn(l.feature(i), l.extent);
    };
    kazdy('earth', (f, e) => { if (f.type === 3) p.ziemia.push(geo(e, f.loadGeometry())); });
    kazdy('water', (f, e) => {
      const k = String(f.properties.kind_detail ?? f.properties.kind ?? '');
      if (f.type === 3 && (WODA.has(k) || f.properties.kind === 'water')) p.woda.push(geo(e, f.loadGeometry()));
      else if (f.type === 2) p.rzeki.push(...geo(e, f.loadGeometry()));
    });
    kazdy('landuse', (f, e) => {
      if (f.type !== 3) return;
      const k = String(f.properties.kind ?? '');
      if (ZIEL.has(k)) p.ziel.push(geo(e, f.loadGeometry()));
      else if (MIASTO.has(k)) p.miasto.push(geo(e, f.loadGeometry()));
    });
    kazdy('natural', (f, e) => { if (f.type === 3 && ZIEL.has(String(f.properties.kind ?? ''))) p.ziel.push(geo(e, f.loadGeometry())); });
    kazdy('roads', (f, e) => {
      if (f.type !== 2) return;
      const k = String(f.properties.kind ?? '');
      if (!SZEROKOSC_DROGI[k] || (k === 'minor_road' && p.z < 11)) return;
      (p.drogi[k] ??= []).push(...geo(e, f.loadGeometry()));
    });
    kazdy('boundaries', (f, e) => {
      const lvl = Number(f.properties.kind_detail ?? f.properties.admin_level ?? 9);
      if (f.type === 2 && (f.properties.kind === 'country' || lvl <= 2)) p.granice.push(...geo(e, f.loadGeometry()));
    });
    const pl = txt('pl', 'en') === 'pl';
    kazdy('places', (f, e) => {
      const pr = f.properties, k = String(pr.kind ?? '');
      if (k !== 'locality' && k !== 'country' && !(k === 'region' && p.z <= 5)) return;
      const q = f.loadGeometry()[0]?.[0];
      const nazwa = String((pl ? pr['name:pl'] : pr['name:en']) ?? pr.name ?? '');
      if (!q || !nazwa) return;
      const rank = Number(pr.population_rank ?? 0) + (k === 'country' ? 20 : 0);
      p.napisy.push({ x: (tx + q.x / e) / n, y: (ty + q.y / e) / n, t: k === 'country' ? nazwa.toUpperCase() : nazwa, r: rank, kraj: k === 'country', stolica: !!pr.capital });
    });
    p.napisy.sort((a, b) => b.r - a.r);
  }

  /** Begin the zoom at `odKm` across the screen (where the poster leaves off). */
  start(odKm = OKOLICA.odKm, doKm = OKOLICA.doKm) {
    this.startKm = odKm;
    this.endKm = doKm;
    this.t0 = performance.now();
    cancelAnimationFrame(this.raf);
    const krok = () => { if (this.zamkniete) return; this.rysuj(); this.raf = requestAnimationFrame(krok); };
    krok();
  }

  /** Current screen width in km: geometric zoom, quick at first, settling at the end. */
  private km(now: number) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return Math.max(this.endKm, 40);
    const t = Math.min(1, (now - this.t0) / OKOLICA.czasMs);
    const u = 1 - (1 - t) ** 2.4;
    return this.startKm * (this.endKm / this.startKm) ** u;
  }

  private rysuj() {
    const c = this.canvas, dpr = Math.min(2, devicePixelRatio || 1);
    const W = this.host.clientWidth, H = this.host.clientHeight;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const g = c.getContext('2d')!;
    const km = this.km(performance.now());
    const s = (W * dpr) / (km / this.kmNaJednostke); // canvas px per world unit
    const ox = (W * dpr) / 2 - this.cx * s, oy = (H * dpr) / 2 - this.cy * s;
    const K = OKOLICA.kolory;
    // Which levels show: the coarsest loaded is the base; finer ones fade in as the view gets small enough.
    let baza = -1;
    this.poziomy.forEach((p, i) => {
      if (!p.gotowe) { p.alfa = 0; return; }
      const r = km / this.kafelKm(i);
      const cel = baza < 0 ? 1 : Math.max(0, Math.min(1, (OKOLICA.wejscieOd - r) / (OKOLICA.wejscieOd - OKOLICA.wejscieDo)));
      if (baza < 0) baza = i;
      p.alfa += (cel - p.alfa) * 0.15;
      if (cel === 1 && p.alfa > 0.99) p.alfa = 1;
      // Read the next level once this one is in use.
      if (p.alfa > 0.2 && i + 1 < this.poziomy.length) void this.wczytaj(i + 1);
    });
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.fillStyle = K.morze;
    g.fillRect(0, 0, c.width, c.height);
    const sciezka = (rings: Pt[], zamknij: boolean) => {
      g.beginPath();
      for (const a of rings) {
        for (let j = 0; j < a.length; j += 2) {
          const x = a[j] * s + ox, y = a[j + 1] * s + oy;
          if (j === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        if (zamknij) g.closePath();
      }
    };
    // Each feature on its own (its outer rings and holes), so overlapping lakes or forests never cancel out.
    const wypelnij = (feats: Pt[][], kolor: string) => { g.fillStyle = kolor; for (const f of feats) { sciezka(f, true); g.fill('evenodd'); } };
    const linia = (rings: Pt[], kolor: string, w: number, dash?: number[]) => {
      if (!rings.length) return;
      sciezka(rings, false); g.strokeStyle = kolor; g.lineWidth = w * dpr; g.lineJoin = 'round'; g.lineCap = 'round';
      g.setLineDash(dash ? dash.map((d) => d * dpr) : []); g.stroke(); g.setLineDash([]);
    };
    const napisy: { x: number; y: number; w: number; h: number }[] = [];
    for (let i = 0; i < this.poziomy.length; i++) {
      const p = this.poziomy[i];
      if (!p.alfa) continue;
      g.save();
      g.globalAlpha = p.alfa;
      if (i > baza) { // a finer level covers only what lies under its own tiles
        const n = 2 ** p.z, b = s / n;
        g.beginPath();
        for (const [x, y] of p.kafle) g.rect(x * b + ox - 0.5, y * b + oy - 0.5, b + 1, b + 1);
        g.clip();
        // A tile at a closer zoom often carries no land polygon (it is all land); then the sea comes from the water layer.
        for (const [x, y, lad] of p.kafle) { g.fillStyle = lad ? K.morze : K.lad; g.fillRect(x * b + ox - 0.5, y * b + oy - 0.5, b + 1, b + 1); }
      }
      wypelnij(p.ziemia, K.lad);
      wypelnij(p.ziel, K.ziel);
      if (this.endKm === OKOLICA.doKm) wypelnij(p.miasto, K.miasto);
      wypelnij(p.woda, K.morze);
      linia(p.ziemia.flat(), K.brzeg, 0.8);
      linia(p.rzeki, K.woda, p.z >= 8 ? 1.4 : 0.8);
      linia(p.granice, K.granica, 1.1, [5, 4]);
      if (this.endKm === OKOLICA.doKm) {
        for (const k of Object.keys(SZEROKOSC_DROGI)) if (p.drogi[k]) linia(p.drogi[k], k === 'highway' ? K.autostrada : K.droga, SZEROKOSC_DROGI[k]);
      }
      g.restore();
    }
    // Names: from the most visible level, biggest first, no overlaps.
    const zrodlo = [...this.poziomy].reverse().find((p) => p.alfa > 0.55) ?? this.poziomy.find((p) => p.alfa > 0);
    if (zrodlo) {
      g.globalAlpha = 1;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      let ile = 0;
      for (const n of zrodlo.napisy) {
        if (this.endKm !== OKOLICA.doKm && !n.kraj) continue;
        if (ile > 14) break;
        const x = n.x * s + ox, y = n.y * s + oy;
        if (x < 0 || y < 0 || x > c.width || y > c.height) continue;
        const duzy = n.r >= 20 || n.stolica;
        const f = (duzy ? 15 : 12.5) * dpr;
        g.font = `${duzy ? 700 : 600} ${f}px 'Alegreya Sans', Georgia, serif`;
        const w = g.measureText(n.t).width, h = f * 1.2;
        const ty = y - (n.r >= 20 ? 0 : f * 0.9);
        const box = { x: x - w / 2 - 4, y: ty - h / 2, w: w + 8, h };
        if (napisy.some((b) => b.x < box.x + box.w && box.x < b.x + b.w && b.y < box.y + box.h && box.y < b.y + b.h)) continue;
        napisy.push(box); ile++;
        if (n.r < 20) { g.fillStyle = K.tusz; g.beginPath(); g.arc(x, y, (duzy ? 3 : 2.2) * dpr, 0, Math.PI * 2); g.fill(); }
        g.lineWidth = 3 * dpr; g.strokeStyle = K.aureola; g.strokeText(n.t, x, ty);
        g.fillStyle = K.tusz; g.fillText(n.t, x, ty);
      }
    }
    // The destination: a brass ring with a red enamel dot, gently pulsing.
    const px = (W * dpr) / 2, py = (H * dpr) / 2, puls = 1 + 0.12 * Math.sin(performance.now() / 260);
    g.globalAlpha = 1;
    g.beginPath(); g.arc(px, py, 9 * dpr * puls, 0, Math.PI * 2);
    g.lineWidth = 3 * dpr; g.strokeStyle = '#b8862f'; g.stroke();
    g.lineWidth = 1 * dpr; g.strokeStyle = '#3a2716'; g.stroke();
    g.beginPath(); g.arc(px, py, 3.6 * dpr, 0, Math.PI * 2); g.fillStyle = '#b3261e'; g.fill();
  }

  zamknij() {
    this.zamkniete = true;
    cancelAnimationFrame(this.raf);
    this.canvas.remove();
  }
}
