// The loading zoom's close-up (owner, 24 Nov 2026: „zoom nie na wielkie piksele, tylko na orientacyjny teren, w którym
// jesteśmy – żeby gracz wiedział, że jest w Polsce, a nie na Madagaskarze; bez pinezki i napisów”).
//
// The painted Earth poster is enlarged only a little; then this canvas takes over with our own world map: Natural
// Earth II (painted land cover + shaded relief + rivers, public domain) cut into Web Mercator tiles 512 px, zooms
// 0..7, with a crisp coastline and country borders (scripts/mapa-swiata/generuj.py → public/mapa-swiata/). It is
// drawn every frame at the screen's real pixels; every step closer brings in the next zoom's tiles over the coarser
// ones, so the picture gains detail instead of growing pixels. A few clouds rush past on the way down. The zoom
// stops at a country-sized view around the destination – never the street.

/** Tunables. Spans are the screen's width in km. */
export const OKOLICA = {
  /** Where the zoom stops (km across the screen): the destination's country and its neighbours. */
  doKm: 900,
  /** Length of the zoom (ms); slow at the end, then it holds still until the game is shown. */
  czasMs: 6000,
  /** A tile zoom is used once one of its pixels takes at most this many canvas pixels (smaller = sharper, more tiles). */
  ostrosc: 1.15,
  /** Fade-in of a tile that has just arrived (ms). */
  pojawianieMs: 260,
  /** Clouds on the way down: share of the zoom when they pass, how many, how opaque. */
  chmury: { od: 0.12, do: 0.62, ile: 9, alfa: 0.82 },
};

const KM_SWIATA = 40075.016686;
const KATALOG = 'mapa-swiata';
type Spis = { rozmiar: number; maxz: number; morze: string; kafle: Record<string, string[]> };
type Kafel = { img: HTMLImageElement; ok: boolean; od: number };

const mx = (lon: number) => (lon + 180) / 360;
const my = (lat: number) => (1 - Math.asinh(Math.tan((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180)) / Math.PI) / 2;
const url = (p: string) => new URL(`${KATALOG}/${p}`, document.baseURI).href;

let spisP: Promise<{ spis: Spis; jest: Set<string> } | null> | null = null;
/** The list of tiles (which exist – open sea has none), read once per page. */
function spis() {
  spisP ??= fetch(url('kafle.json')).then((r) => (r.ok ? r.json() : null)).then((s: Spis | null) => {
    if (!s) return null;
    const jest = new Set<string>();
    for (const [z, lista] of Object.entries(s.kafle)) for (const k of lista) jest.add(`${z}/${k}`);
    return { spis: s, jest };
  }).catch(() => { spisP = null; return null; });
  return spisP;
}
/** Called while the start menu is up: the list and the whole world at zoom 0–1 are tiny, so read them early. */
export function wczytajMapeSwiata() {
  void spis().then((s) => { if (s) for (const k of s.jest) if (/^[01]\//.test(k)) new Image().src = url(`${k}.webp`); });
}

let biezace: Okolica | null = null;

/** Start reading the map for a destination (call as soon as it is known). */
export function przygotujOkolice(host: HTMLElement, lat: number, lon: number) {
  if (biezace && biezace.lat === lat && biezace.lon === lon) return biezace;
  biezace?.zamknij();
  biezace = new Okolica(host, lat, lon);
  return biezace;
}
export function zamknijOkolice() { biezace?.zamknij(); biezace = null; }

class Okolica {
  readonly canvas = document.createElement('canvas');
  private cx: number; private cy: number;
  private kmNaJednostke: number;
  private t0 = 0; private raf = 0; private zamkniete = false;
  private startKm = 20000;
  private kafle = new Map<string, Kafel>();
  private dane: { spis: Spis; jest: Set<string> } | null = null;
  private chmury: { kat: number; r0: number; w: number; obr: number; faza: number; wzor: number }[] = [];
  private obrazyChmur: HTMLCanvasElement[] = [];
  /** Resolved when the coarse map around the destination is in (the canvas can be shown). */
  readonly gotowa: Promise<boolean>;

  constructor(private host: HTMLElement, readonly lat: number, readonly lon: number) {
    this.cx = mx(lon); this.cy = my(lat);
    this.kmNaJednostke = KM_SWIATA * Math.cos((lat * Math.PI) / 180);
    this.canvas.className = 'lm-okolica';
    this.canvas.setAttribute('aria-hidden', 'true');
    host.querySelector('.lm-plate')?.after(this.canvas);
    this.gotowa = spis().then(async (d) => {
      if (!d || this.zamkniete) return false;
      this.dane = d;
      // Zooms 0–2 around the destination: enough to start, the rest comes while zooming in.
      const lista: Kafel[] = [];
      for (let z = 0; z <= 2; z++) {
        const n = 2 ** z, kx = Math.floor(this.cx * n), ky = Math.floor(this.cy * n);
        for (let x = kx - 1; x <= kx + 1; x++) for (let y = ky - 1; y <= ky + 1; y++) { const k = this.kafel(z, x, y); if (k) lista.push(k); }
      }
      await Promise.all(lista.map((k) => k.img.decode().catch(() => {})));
      return !this.zamkniete && lista.some((k) => k.ok);
    });
  }

  /** The tile (z, x, y), asked for on first use; null = open sea (none exists) or outside the world. */
  private kafel(z: number, x: number, y: number): Kafel | null {
    const n = 2 ** z;
    if (y < 0 || y >= n || !this.dane) return null;
    x = ((x % n) + n) % n;
    const klucz = `${z}/${x}_${y}`;
    if (!this.dane.jest.has(klucz)) return null;
    let k = this.kafle.get(klucz);
    if (!k) {
      const img = new Image();
      img.decoding = 'async';
      k = { img, ok: false, od: 0 };
      const kk = k;
      img.onload = () => { kk.ok = true; kk.od = performance.now(); };
      img.src = url(`${klucz}.webp`);
      this.kafle.set(klucz, k);
    }
    return k;
  }

  /** Begin the zoom at `odKm` across the screen (where the poster leaves off). */
  start(odKm: number) {
    const W = Math.max(1, this.host.clientWidth), H = Math.max(1, this.host.clientHeight);
    // Never wider than the whole world fits from top to bottom.
    this.startKm = Math.max(OKOLICA.doKm * 1.5, Math.min(odKm, this.kmNaJednostke * (W / H) * 0.95));
    this.t0 = performance.now();
    this.przygotujChmury();
    cancelAnimationFrame(this.raf);
    const krok = () => { if (this.zamkniete) return; this.rysuj(); this.raf = requestAnimationFrame(krok); };
    krok();
  }

  private zredukowany() { return matchMedia('(prefers-reduced-motion: reduce)').matches; }

  /** Share of the zoom done (0..1) with its easing: quick at first, settling at the end. */
  private postep(now: number) {
    if (this.zredukowany()) return 1;
    const t = Math.min(1, (now - this.t0) / OKOLICA.czasMs);
    return 1 - (1 - t) ** 2.4;
  }

  private rysuj() {
    const c = this.canvas, dpr = Math.min(2, devicePixelRatio || 1);
    const W = this.host.clientWidth, H = this.host.clientHeight;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const g = c.getContext('2d')!;
    const now = performance.now();
    const u = this.postep(now);
    const km = this.startKm * (OKOLICA.doKm / this.startKm) ** u;
    const s = c.width / (km / this.kmNaJednostke); // canvas px per world unit
    const ox = c.width / 2 - this.cx * s, oy = c.height / 2 - this.cy * s;
    const T = this.dane?.spis.rozmiar ?? 512, maxz = this.dane?.spis.maxz ?? 0;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.fillStyle = this.dane?.spis.morze ?? '#96b6be';
    g.fillRect(0, 0, c.width, c.height);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    // The finest zoom needed now; every coarser one stays drawn underneath, so nothing is ever blank.
    const zc = Math.max(0, Math.min(maxz, Math.ceil(Math.log2(s / (T * OKOLICA.ostrosc)))));
    // Read one zoom ahead while zooming in, so its tiles are there when needed.
    const zp = Math.min(maxz, zc + (u < 1 ? 1 : 0));
    for (let z = 0; z <= zp; z++) {
      const n = 2 ** z, b = s / n;
      const x0 = Math.floor(-ox / b), x1 = Math.floor((c.width - ox) / b);
      const y0 = Math.max(0, Math.floor(-oy / b)), y1 = Math.min(n - 1, Math.floor((c.height - oy) / b));
      for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
          const k = this.kafel(z, x, y);
          if (!k?.ok || z > zc) continue;
          g.globalAlpha = Math.min(1, (now - k.od) / OKOLICA.pojawianieMs);
          // Whole canvas pixels and a hair of overlap, so seams never show.
          const X = Math.floor(x * b + ox), Y = Math.floor(y * b + oy);
          const X2 = Math.ceil((x + 1) * b + ox), Y2 = Math.ceil((y + 1) * b + oy);
          g.drawImage(k.img, X, Y, X2 - X + (z ? 0.5 : 0), Y2 - Y + 0.5);
        }
      }
    }
    g.globalAlpha = 1;
    this.rysujChmury(g, u, c.width, c.height);
  }

  /** Soft clouds made once by code: a few white puffs with a cool shadow underneath. */
  private przygotujChmury() {
    if (this.zredukowany() || this.chmury.length) return;
    const los = (() => { let a = Math.floor((this.lat * 131 + this.lon * 71) * 1000) >>> 0; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 2 ** 32); })();
    for (let w = 0; w < 3; w++) {
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 160;
      const g = cv.getContext('2d')!;
      const puchy = Array.from({ length: 9 }, () => ({ x: 50 + los() * 156, y: 60 + los() * 50, r: 22 + los() * 34 }));
      for (const [kolor, dy] of [['rgba(120,140,165,.30)', 10], ['rgba(255,255,255,.92)', 0]] as const) {
        for (const p of puchy) {
          const gr = g.createRadialGradient(p.x, p.y + dy, 0, p.x, p.y + dy, p.r);
          gr.addColorStop(0, kolor); gr.addColorStop(0.6, kolor); gr.addColorStop(1, kolor.replace(/[\d.]+\)$/, '0)'));
          g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y + dy, p.r, 0, Math.PI * 2); g.fill();
        }
      }
      this.obrazyChmur.push(cv);
    }
    const ile = OKOLICA.chmury.ile;
    for (let i = 0; i < ile; i++) {
      this.chmury.push({ kat: (i / ile) * Math.PI * 2 + los() * 0.6, r0: 0.05 + los() * 0.35, w: 0.55 + los() * 0.6, obr: (los() - 0.5) * 0.5, faza: los() * 0.25, wzor: i % 3 });
    }
  }

  /** Clouds rushing outwards past the viewer while the map falls closer. */
  private rysujChmury(g: CanvasRenderingContext2D, u: number, W: number, H: number) {
    const { od, do: d, alfa } = OKOLICA.chmury;
    if (!this.chmury.length || u <= od || u >= d) return;
    const D = Math.hypot(W, H) / 2;
    for (const ch of this.chmury) {
      const p = (u - od) / (d - od) - ch.faza;
      if (p <= 0 || p >= 1) continue;
      const r = (ch.r0 + p * 1.25) * D;
      const skala = (0.6 + p * 2.6) * ch.w * (Math.min(W, H) / 256);
      g.save();
      g.globalAlpha = alfa * Math.sin(Math.PI * p) ** 1.5;
      g.translate(W / 2 + Math.cos(ch.kat) * r, H / 2 + Math.sin(ch.kat) * r);
      g.rotate(ch.obr);
      g.scale(skala, skala);
      g.drawImage(this.obrazyChmur[ch.wzor], -128, -80);
      g.restore();
    }
  }

  zamknij() {
    this.zamkniete = true;
    cancelAnimationFrame(this.raf);
    this.canvas.remove();
    for (const k of this.kafle.values()) k.img.src = '';
    this.kafle.clear();
  }
}
