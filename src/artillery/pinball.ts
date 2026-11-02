import { tx, tr } from "../i18n";
import { resetKeys, resetTouch } from "../controls";
import { audio } from "../sfx";
import { FLAGI, KOLORY_FLAG } from "../content/flagi";
import { MARKA } from "../content/metro";

// The underground pinball ride (owner, 2 Nov 2026: in metro cities instead of the cannon; „musi być wyrzutnia,
// zbudowanie napięcia startu, w trakcie którego już budujesz metę; nazwa stacji na tablicy lub mozaika w kolorze flagi,
// czytelna; jaśniej niż w lochu, klimatycznie”). Under the hatch lies a bright station hall: cream tiles, brass, gas
// lamps, an enamel board with the station's name and a floor mosaic of it in the country's flag colours. The hero
// comes down the stairs, climbs into the glass ball on the launcher, and the pressure builds while the destination
// loads (the shot waits for it, up to maxNapiecieMs); then the tubes, the steam brakes and the destination's own hall,
// from which he walks up the stairs to its hatch. Same interface as flight.ts. Code-drawn until the artist's.

export const PINBALL = {
  /** The hero walks from the stairs to the launcher and climbs into the ball. */
  wejscieMs: 1500,
  wsiadanieMs: 450,
  /** Pressure builds at least this long; then it holds at full until the destination is ready (at most maxNapiecieMs). */
  minNapiecieMs: 2600,
  maxNapiecieMs: 9000,
  wystrzalMs: 500,
  /** Tubes at least this long, then the brakes. */
  minRuryMs: 1400,
  hamowanieMs: 1000,
  /** Destination hall: the ball comes down the lane, the hero gets out and walks to the stairs, daylight. */
  zjazdMs: 700,
  wysiadanieMs: 1500,
  swiatloMs: 600,
  /** Ball size as a share of the shorter side of the view. */
  kula: 0.085,
  tekstWczytuje: 4200,
};

const INK = "#1e1a24";
const KREM = "#f6e7c6";
const ease = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const clamp = (t: number) => Math.max(0, Math.min(1, t));

function ding(freq: number, glosnosc = 0.06, typ: OscillatorType = "square") {
  const a = audio();
  if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = typ;
  o.frequency.setValueAtTime(freq, a.currentTime);
  g.gain.setValueAtTime(glosnosc, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.18);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + 0.2);
}

/** A hiss of steam (filtered noise), louder with `sila` 0..1. */
function syk(sila: number, ms = 400) {
  const a = audio();
  if (!a) return;
  const n = Math.floor(a.sampleRate * (ms / 1000)), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = buf;
  f.type = "highpass";
  f.frequency.value = 2200;
  g.gain.value = 0.05 * sila;
  s.connect(f).connect(g).connect(a.destination);
  s.start();
}

type Faza = "hala" | "napiecie" | "strzal" | "rury" | "hamowanie" | "przyjazd";

export function pinball(
  hero: string | string[] | undefined,
  describe: (e: unknown) => string = (e) => (e instanceof Error ? e.message : String(e)),
  stacje: { z?: string; cel?: string; kraj?: string } = {},
) {
  resetKeys();
  resetTouch();
  const still = matchMedia("(prefers-reduced-motion:reduce)").matches;
  const marka = tr(MARKA);
  const root = document.createElement("div");
  root.id = "artillery-flight";
  root.className = "m-screen";
  root.dataset.tryb = "pinball";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", marka);
  root.innerHTML = `<style>#artillery-flight{z-index:10020;background:#141216;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:end;padding:24px;color:#1e1a24}#artillery-flight canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}#artillery-flight p{position:relative;font:600 17px 'Alegreya Sans',system-ui,sans-serif;background:#f6e7c6;padding:10px 18px;border:3px solid #1e1a24;box-shadow:4px 4px 0 #1e1a24;max-width:95%;text-align:center;margin:0 0 8px;transition:opacity .25s}#artillery-flight p.znika{opacity:0}#artillery-flight button{position:relative;min-height:44px;padding:10px 18px;border:3px solid #1e1a24;box-shadow:3px 3px 0 #1e1a24;background:#e9b856;margin:4px;font:600 16px 'Alegreya Sans',system-ui,sans-serif}</style><canvas></canvas><p aria-live="polite"></p>`;
  const canvas = root.querySelector("canvas")!;
  const ctx = canvas.getContext("2d")!;
  const text = root.querySelector("p")!;
  document.body.append(root);
  const focus = document.activeElement as HTMLElement | null;

  let tekstTimer: ReturnType<typeof setTimeout> | undefined;
  const pisz = (s: string) => {
    if (text.textContent === s) return;
    clearTimeout(tekstTimer);
    if (!text.textContent || still) {
      text.textContent = s;
      return;
    }
    text.classList.add("znika");
    tekstTimer = setTimeout(() => {
      text.textContent = s;
      text.classList.remove("znika");
    }, 220);
  };
  const z = stacje.z || "";
  let cel = stacje.cel || "";
  pisz(
    z
      ? tx(`${marka} · stacja „${z}”. Wsiadasz do kuli…`, `${marka} · “${z}” station. Climbing into the ball…`)
      : tx(`${marka} – wsiadasz do kuli…`, `${marka} – climbing into the ball…`),
  );

  const klatki = (Array.isArray(hero) ? hero : hero ? [hero] : []).map((src) => {
    const i = new Image();
    i.src = src;
    return i;
  });

  let W = 0, H = 0, dpr = 1;
  const tla = new Map<string, HTMLCanvasElement>();
  const rozmiar = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = root.clientWidth || window.innerWidth;
    H = root.clientHeight || window.innerHeight;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    tla.clear();
  };
  rozmiar();
  window.addEventListener("resize", rozmiar);

  const t0 = performance.now();
  let faza: Faza = "hala", fazaOd = t0;
  const zmien = (f: Faza, now: number) => {
    faza = f;
    fazaOd = now;
  };
  let gotowy = false;
  let lad: { done: () => void } | null = null;
  let koniec = false, raf = 0;
  let droga = 0; // tube distance travelled, px
  let ostatnio = t0, ostatniDing = 0, ostatniSyk = 0;
  let napisPelne = false, napisWczytuje = false;

  /** Hall geometry for the current view (CSS px). */
  const uklad = () => {
    const u = Math.min(W, H) / 14;
    const sciana = Math.round(H * 0.3);
    const rx = Math.round(W * 0.8);
    return {
      u,
      sciana,
      // Launcher lane: tube down from the ceiling, the ball resting on the plunger.
      rx,
      kulaY: Math.round(H * 0.56),
      // The spring ends on the cabinet's top; the cabinet fills the rest down to the bottom edge.
      sprezynaD: Math.round(H * 0.8),
      // Stairs top-left; their foot on the floor.
      schody: { x: Math.round(W * 0.12), y: sciana + u * 0.6 },
      // Where the hero stands to climb in.
      przed: { x: rx - u * 2.2, y: Math.round(H * 0.74) },
      // Enamel board and the mosaic.
      tab: { x: Math.round(W * 0.46), y: Math.round(sciana * 0.56), w: Math.min(W * 0.46, u * 11), h: Math.max(28, u * 1.5) },
      moz: { x: Math.round(W * 0.45), y: Math.round(H * 0.64), w: Math.min(W * 0.52, u * 13), h: Math.min(H * 0.24, u * 4.6) },
    };
  };

  /** A station's still picture (walls, floor, stairs, board, mosaic), cached per name and size. */
  const tlo = (nazwa: string) => {
    const k = nazwa + "|" + W + "x" + H;
    const c0 = tla.get(k);
    if (c0) return c0;
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(W * dpr));
    c.height = Math.max(1, Math.round(H * dpr));
    const g = c.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.imageSmoothingEnabled = false;
    rysujHale(g, nazwa);
    tla.set(k, c);
    return c;
  };

  function rysujHale(g: CanvasRenderingContext2D, nazwa: string) {
    const L = uklad(), { u, sciana } = L;
    // Floor: light stone slabs in a checker, warm.
    g.fillStyle = "#d9cdb2";
    g.fillRect(0, sciana, W, H - sciana);
    const p = Math.max(16, Math.round(u * 1.4));
    for (let y = sciana; y < H; y += p)
      for (let x = 0; x < W; x += p) {
        const k = (Math.floor(x / p) + Math.floor((y - sciana) / p)) % 2;
        g.fillStyle = k ? "#e4d9bf" : "#cfc2a4";
        g.fillRect(x, y, p - 1, p - 1);
      }
    // Brass strip where the floor meets the wall, and a dark skirting.
    g.fillStyle = INK;
    g.fillRect(0, sciana - 2, W, 6);
    g.fillStyle = "#6a4c2c";
    g.fillRect(0, sciana - 10, W, 8);
    // Back wall: cream subway tiles in a running bond, a dark-green band, brass trim.
    g.fillStyle = "#b8ab90";
    g.fillRect(0, 0, W, sciana - 10);
    const tw = Math.max(14, Math.round(u * 0.9)), th = Math.max(7, Math.round(tw / 2));
    for (let y = 0, r = 0; y < sciana - 10; y += th, r++)
      for (let x = (r % 2) * (-tw / 2); x < W; x += tw) {
        g.fillStyle = ((x * 3 + r * 7) & 15) < 3 ? "#efe3c8" : "#f7eed8";
        g.fillRect(Math.round(x) + 1, y + 1, tw - 2, th - 2);
      }
    const pas = Math.round(sciana * 0.82);
    g.fillStyle = INK;
    g.fillRect(0, pas - 2, W, Math.round(u * 0.7) + 4);
    g.fillStyle = "#2f5a48";
    g.fillRect(0, pas, W, Math.round(u * 0.7));
    g.fillStyle = "#c8963e";
    g.fillRect(0, pas, W, 2);
    g.fillRect(0, pas + Math.round(u * 0.7) - 2, W, 2);
    g.fillStyle = "#c8963e";
    g.fillRect(0, Math.round(u * 0.35), W, 3);
    // Stairs up, top-left, with daylight falling down them.
    const sx = L.schody.x, sw = u * 2.6;
    g.fillStyle = INK;
    g.fillRect(sx - sw / 2 - 3, 0, sw + 6, sciana);
    for (let i = 0; i < 7; i++) {
      const y = (sciana * i) / 7;
      g.fillStyle = i % 2 ? "#8b8173" : "#a39a8a";
      g.fillRect(sx - sw / 2, y, sw, sciana / 7 - 1);
      g.fillStyle = "#c9c0ae";
      g.fillRect(sx - sw / 2, y, sw, 2);
    }
    g.fillStyle = "#c8963e";
    g.fillRect(sx - sw / 2 - 3, 0, 3, sciana);
    g.fillRect(sx + sw / 2, 0, 3, sciana);
    const swiatlo = g.createLinearGradient(0, 0, 0, sciana + u * 3);
    swiatlo.addColorStop(0, "rgba(255,250,225,0.75)");
    swiatlo.addColorStop(1, "rgba(255,250,225,0)");
    g.fillStyle = swiatlo;
    g.beginPath();
    g.moveTo(sx - sw / 2, 0);
    g.lineTo(sx + sw / 2, 0);
    g.lineTo(sx + sw / 2 + u, sciana + u * 3);
    g.lineTo(sx - sw / 2 - u, sciana + u * 3);
    g.fill();
    // The launcher's tube down from the ceiling into the floor bed (the moving parts are drawn per frame).
    const rx = L.rx, rw = u * 1.9;
    g.fillStyle = INK;
    g.fillRect(rx - rw / 2 - 4, 0, rw + 8, L.sprezynaD + 4);
    g.fillStyle = "rgba(160,210,200,0.35)";
    g.fillRect(rx - rw / 2, 0, rw, L.sprezynaD);
    for (const b of [-1, 1]) {
      g.fillStyle = "#a08448";
      g.fillRect(rx + b * (rw / 2) - (b > 0 ? 6 : 0), 0, 6, L.sprezynaD);
      g.fillStyle = "#e8d08c";
      g.fillRect(rx + b * (rw / 2) - (b > 0 ? 5 : -1), 0, 2, L.sprezynaD);
    }
    for (let y = u; y < L.sprezynaD; y += u * 1.6) {
      g.fillStyle = INK;
      g.fillRect(rx - rw / 2 - 6, y - 4, rw + 12, 8);
      g.fillStyle = "#c8963e";
      g.fillRect(rx - rw / 2 - 5, y - 3, rw + 10, 6);
      g.fillStyle = "#f0c850";
      g.fillRect(rx - rw / 2 - 3, y - 1, 2, 2);
      g.fillRect(rx + rw / 2 + 1, y - 1, 2, 2);
    }
    // The launcher's housing at the bottom: a riveted brass cabinet.
    const hy = L.sprezynaD, hw = u * 3.4, hh = H - hy;
    g.fillStyle = INK;
    g.fillRect(rx - hw / 2 - 3, hy - 3, hw + 6, hh + 6);
    g.fillStyle = "#8a613f";
    g.fillRect(rx - hw / 2, hy, hw, hh);
    g.fillStyle = "#c8963e";
    g.fillRect(rx - hw / 2, hy, hw, 4);
    g.fillStyle = "#f0c850";
    for (let x = rx - hw / 2 + 5; x < rx + hw / 2 - 4; x += 10) g.fillRect(x, hy + 7, 2, 2);
    // Brand plate on the cabinet.
    g.fillStyle = INK;
    g.font = `700 ${Math.max(9, Math.round(u * 0.42))}px 'Alegreya Sans',system-ui,sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(marka.toUpperCase(), rx, hy + u * 0.8, hw - 6);
    // A pipe from the cabinet across the wall to a pressure tank by the board.
    g.fillStyle = INK;
    g.fillRect(rx - hw / 2 - u * 1.2, pas + u * 0.2, u * 1.2, u * 0.5);
    g.fillStyle = "#a08448";
    g.fillRect(rx - hw / 2 - u * 1.2, pas + u * 0.26, u * 1.2, u * 0.38);
    // Enamel board with the station's name, a brass frame and the brand on a plaque above it.
    tablica(g, L.tab, nazwa);
    // Floor mosaic in the country's flag colours, the name in dark stones with a cream rim.
    mozaika(g, L.moz, nazwa);
    // Soft lamplight pools on the floor (warm), so the hall reads as lit, not a dungeon.
    for (const lx of [L.tab.x - L.tab.w / 2 - u * 1.2, L.tab.x + L.tab.w / 2 + u * 1.2]) {
      const gr = g.createRadialGradient(lx, sciana, 0, lx, sciana, u * 6);
      gr.addColorStop(0, "rgba(255,220,150,0.35)");
      gr.addColorStop(1, "rgba(255,220,150,0)");
      g.fillStyle = gr;
      g.fillRect(lx - u * 6, sciana - u * 2, u * 12, u * 8);
    }
  }

  function tablica(g: CanvasRenderingContext2D, t: { x: number; y: number; w: number; h: number }, nazwa: string) {
    const x0 = t.x - t.w / 2, y0 = t.y - t.h / 2;
    g.fillStyle = INK;
    g.fillRect(x0 - 6, y0 - 6, t.w + 12, t.h + 12);
    g.fillStyle = "#c8963e";
    g.fillRect(x0 - 4, y0 - 4, t.w + 8, t.h + 8);
    g.fillStyle = "#f0c850";
    for (const [x, y] of [[x0 - 2, y0 - 2], [x0 + t.w, y0 - 2], [x0 - 2, y0 + t.h], [x0 + t.w, y0 + t.h]]) g.fillRect(x, y, 2, 2);
    g.fillStyle = "#1f4a3c";
    g.fillRect(x0, y0, t.w, t.h);
    g.fillStyle = "rgba(255,255,255,0.08)";
    g.fillRect(x0, y0, t.w, Math.max(2, t.h * 0.18));
    g.textAlign = "center";
    g.textBaseline = "middle";
    let fs = Math.round(t.h * 0.62);
    const font = (n: number) => `800 ${n}px 'Alegreya Sans',system-ui,sans-serif`;
    g.font = font(fs);
    while (fs > 9 && g.measureText(nazwa).width > t.w - 14) g.font = font(--fs);
    g.fillStyle = KREM;
    g.fillText(nazwa, t.x, t.y + 1);
    // Brand plaque above it.
    const bs = Math.max(9, Math.round(t.h * 0.34));
    g.font = `700 ${bs}px 'Alegreya Sans',system-ui,sans-serif`;
    const bw = Math.min(t.w * 0.8, g.measureText("⚙ " + marka.toUpperCase() + " ⚙").width + 16), bh = bs + 8;
    const by = y0 - 10 - bh;
    if (by > 2) {
      g.fillStyle = INK;
      g.fillRect(t.x - bw / 2 - 2, by - 2, bw + 4, bh + 4);
      g.fillStyle = "#e0b45a";
      g.fillRect(t.x - bw / 2, by, bw, bh);
      g.fillStyle = INK;
      g.fillText("⚙ " + marka.toUpperCase() + " ⚙", t.x, by + bh / 2 + 1, bw - 8);
    }
  }

  function mozaika(g: CanvasRenderingContext2D, m: { x: number; y: number; w: number; h: number }, nazwa: string) {
    const flaga = (stacje.kraj && FLAGI[stacje.kraj]) || ["PPPPPP", "PPPPPP", "PPPPPP", "PPPPPP"];
    // The name as a small bitmap: each lit pixel becomes a stone. Two lines when one would be too small.
    const slowa = nazwa.split(/\s+/);
    const linie = slowa.length > 1 && nazwa.length > 14 ? [slowa.slice(0, Math.ceil(slowa.length / 2)).join(" "), slowa.slice(Math.ceil(slowa.length / 2)).join(" ")] : [nazwa];
    const LH = 11, c = document.createElement("canvas");
    const mg = c.getContext("2d")!;
    mg.font = "700 10px system-ui,sans-serif";
    const sz = Math.ceil(Math.max(...linie.map((l) => mg.measureText(l).width))) + 4;
    c.width = sz;
    c.height = LH * linie.length + 4;
    mg.font = "700 10px system-ui,sans-serif";
    mg.textBaseline = "top";
    mg.fillStyle = "#000";
    linie.forEach((l, i) => mg.fillText(l, 2, 2 + i * LH));
    const d = mg.getImageData(0, 0, c.width, c.height).data;
    const lit = (x: number, y: number) => x >= 0 && y >= 0 && x < c.width && y < c.height && d[(y * c.width + x) * 4 + 3] > 120;
    // Stone size so the text fits with a border of 2 stones.
    const kol = c.width + 4, rz = c.height + 4;
    const s = Math.max(3, Math.floor(Math.min(m.w / kol, m.h / rz)));
    const ww = kol * s, hh = rz * s, x0 = Math.round(m.x - ww / 2), y0 = Math.round(m.y - hh / 2);
    g.fillStyle = INK;
    g.fillRect(x0 - 4, y0 - 4, ww + 8, hh + 8);
    g.fillStyle = "#8a7a5e"; // grout
    g.fillRect(x0, y0, ww, hh);
    for (let j = 0; j < rz; j++)
      for (let i = 0; i < kol; i++) {
        const px = i - 2, py = j - 2;
        let kolor: string;
        if (lit(px, py)) kolor = INK;
        else if (lit(px - 1, py) || lit(px + 1, py) || lit(px, py - 1) || lit(px, py + 1) || lit(px - 1, py - 1) || lit(px + 1, py + 1) || lit(px + 1, py - 1) || lit(px - 1, py + 1)) kolor = KREM;
        else {
          const f = flaga[Math.min(flaga.length - 1, Math.floor((j / rz) * flaga.length))];
          const ch = f[Math.min(f.length - 1, Math.floor((i / kol) * f.length))];
          kolor = KOLORY_FLAG[ch] || KREM;
        }
        g.fillStyle = kolor;
        g.fillRect(x0 + i * s, y0 + j * s, s - 1, s - 1);
        // Each stone a touch lighter or darker.
        const v = ((i * 73856093) ^ (j * 19349663)) & 7;
        if (v < 2) {
          g.fillStyle = v ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";
          g.fillRect(x0 + i * s, y0 + j * s, s - 1, s - 1);
        }
      }
  }

  /** Gas lamps on the wall either side of the board, flickering. */
  const lampy = (t: number) => {
    const L = uklad(), { u } = L;
    for (const [n, lx] of [L.tab.x - L.tab.w / 2 - u * 1.2, L.tab.x + L.tab.w / 2 + u * 1.2].entries()) {
      const ly = L.tab.y - u * 0.2;
      const f = 0.85 + 0.1 * Math.sin(t / 90 + n * 2) + 0.05 * Math.sin(t / 37 + n);
      const gr = ctx.createRadialGradient(lx, ly, 0, lx, ly, u * 3.2);
      gr.addColorStop(0, `rgba(255,230,160,${0.55 * f})`);
      gr.addColorStop(1, "rgba(255,230,160,0)");
      ctx.fillStyle = gr;
      ctx.fillRect(lx - u * 3.2, ly - u * 3.2, u * 6.4, u * 6.4);
      // Bracket, glass, flame.
      ctx.fillStyle = INK;
      ctx.fillRect(lx - u * 0.35 - 2, ly - u * 0.6 - 2, u * 0.7 + 4, u * 1.1 + 4);
      ctx.fillStyle = "#c8963e";
      ctx.fillRect(lx - u * 0.35, ly - u * 0.6, u * 0.7, u * 0.16);
      ctx.fillRect(lx - u * 0.35, ly + u * 0.34, u * 0.7, u * 0.16);
      ctx.fillStyle = `rgba(255,${210 + 30 * f},140,1)`;
      ctx.fillRect(lx - u * 0.25, ly - u * 0.44, u * 0.5, u * 0.78);
      ctx.fillStyle = "#fff6c8";
      ctx.fillRect(lx - u * 0.08, ly - u * 0.2 - f * u * 0.1, u * 0.16, u * 0.36);
    }
  };

  /** Pressure gauge on the cabinet: the needle goes from 0 to the red zone with `p` 0..1; shakes at full. */
  const manometr = (p: number, t: number) => {
    const L = uklad(), { u } = L;
    const x = L.rx - u * 2.6, y = L.kulaY + u * 1.6, r = u * 0.95;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(x, y, r + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c8963e";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = KREM;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.82, 0, Math.PI * 2);
    ctx.fill();
    const a0 = Math.PI * 0.8, a1 = Math.PI * 2.2;
    ctx.strokeStyle = "#c8323c";
    ctx.lineWidth = Math.max(2, r * 0.16);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.66, a0 + (a1 - a0) * 0.78, a1);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
      const a = a0 + ((a1 - a0) * i) / 8;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62);
      ctx.lineTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78);
      ctx.stroke();
    }
    const drz = p >= 0.99 ? Math.sin(t / 30) * 0.05 : 0;
    const a = a0 + (a1 - a0) * Math.min(1, p) + drz;
    ctx.strokeStyle = "#8f1f24";
    ctx.lineWidth = Math.max(2, r * 0.1);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  };

  /** The plunger and spring under the ball: `sciskanie` 0..1 pulls it down. */
  const sprezyna = (gora: number, sciskanie: number) => {
    const L = uklad(), { u } = L, rx = L.rx;
    const top = gora + u * 0.9 + sciskanie * u * 0.7;
    const dol = L.sprezynaD;
    ctx.strokeStyle = "#d9a84a";
    ctx.lineWidth = Math.max(3, u * 0.14);
    ctx.beginPath();
    const zw = 8;
    for (let i = 0; i <= zw; i++) ctx.lineTo(rx + (i % 2 ? u * 0.6 : -u * 0.6), top + ((dol - top) * i) / zw);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.fillRect(rx - u * 0.85 - 3, top - 3, u * 1.7 + 6, u * 0.36 + 6);
    ctx.fillStyle = "#8f3a2c";
    ctx.fillRect(rx - u * 0.85, top, u * 1.7, u * 0.36);
    return top;
  };

  /** The glass ball with the hero inside. */
  const kula = (x: number, y: number, r: number, obrot: number, t: number, zHero = true) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(0, 0, r + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(140,192,170,0.55)";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    const img = zHero && klatki.length ? klatki[Math.floor(t / 120) % klatki.length] : null;
    if (img && img.complete && img.naturalWidth) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.rotate(obrot);
      const s = (r * 1.7) / img.naturalHeight;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, (-img.naturalWidth * s) / 2, (-img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
      ctx.restore();
    }
    ctx.strokeStyle = "#c8963e";
    ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.beginPath();
    ctx.ellipse(0, 0, r - 1, r * 0.28, obrot, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,246,200,0.85)";
    ctx.beginPath();
    ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.22, r * 0.14, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  /** The hero standing/walking in the hall (his flight frames, arms waving – excited). */
  const ludzik = (x: number, y: number, t: number, idzie: boolean) => {
    const img = klatki.length ? klatki[Math.floor(t / (idzie ? 110 : 260)) % klatki.length] : null;
    const h = uklad().u * 2.4;
    ctx.fillStyle = "rgba(30,26,36,0.28)";
    ctx.beginPath();
    ctx.ellipse(x + 3, y, h * 0.22, h * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!img || !img.complete || !img.naturalWidth) {
      ctx.fillStyle = INK;
      ctx.fillRect(x - h * 0.15, y - h, h * 0.3, h);
      return;
    }
    const s = h / img.naturalHeight, hop = idzie ? Math.abs(Math.sin(t / 110)) * h * 0.04 : 0;
    ctx.drawImage(img, x - (img.naturalWidth * s) / 2, y - h - hop, img.naturalWidth * s, h);
  };

  const para = (x: number, y: number, t: number, ile: number, skala = 1) => {
    ctx.fillStyle = "#f2f4f6";
    for (let i = 0; i < ile; i++) {
      const u = (t / 900 + i / ile) % 1;
      ctx.globalAlpha = (1 - u) * 0.6;
      ctx.beginPath();
      ctx.arc(x + Math.sin(i * 2.1 + t / 400) * 20 * u * skala, y - 60 * u * skala, (8 + 18 * u) * skala, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  /** Brick wall with mortar, scrolling by `przes` (the tubes between stations). */
  const cegly = (przes: number) => {
    ctx.fillStyle = "#2a1f1c";
    ctx.fillRect(0, 0, W, H);
    const P = 12, bw = P * 4, bh = P * 2;
    const o = ((przes % (bh * 2)) + bh * 2) % (bh * 2);
    for (let y = -bh * 2 + o; y < H + bh; y += bh) {
      const rz = Math.round((y - o) / bh);
      for (let x = (rz % 2) * (-bw / 2) - bw; x < W + bw; x += bw) {
        const k = ((x * 7 + rz * 13) & 7) / 7;
        ctx.fillStyle = k > 0.6 ? "#4e2723" : k > 0.3 ? "#4e1f1c" : "#3e2519";
        ctx.fillRect(Math.round(x) + 2, Math.round(y) + 2, bw - 4, bh - 4);
      }
    }
  };

  const odbijacz = (x: number, y: number, r: number, swieci: number) => {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(x, y, r + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c8963e";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = swieci > 0 ? `rgba(255,${200 + 55 * swieci},120,1)` : "#8a3a3a";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
    if (swieci > 0) {
      ctx.globalAlpha = 0.5 * swieci;
      ctx.fillStyle = "#fff6c8";
      ctx.beginPath();
      ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  };

  /** The tubes: the view rushes down past brick and bumpers. `predkosc` px/s. */
  const rury = (now: number, t: number, predkosc: number, dt: number) => {
    const r = Math.min(W, H) * PINBALL.kula * 1.3, cx = W / 2;
    if (!still) droga += predkosc * dt;
    cegly(droga * 0.6);
    const wezyk = (y: number) => cx + Math.sin((y - droga) / 260) * W * 0.12;
    for (const bok of [-1, 1]) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = r * 0.45 + 6;
      ctx.beginPath();
      for (let y = -20; y <= H + 20; y += 16) ctx.lineTo(wezyk(y) + bok * r * 1.6, y);
      ctx.stroke();
      ctx.strokeStyle = "#a08448";
      ctx.lineWidth = r * 0.45;
      ctx.stroke();
      ctx.strokeStyle = "#e8d08c";
      ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.beginPath();
      for (let y = -20; y <= H + 20; y += 16) ctx.lineTo(wezyk(y) + bok * r * 1.6 - r * 0.1, y);
      ctx.stroke();
      const krok = 140, o = droga % krok;
      ctx.fillStyle = "#f0c850";
      for (let y = -krok + o; y < H + krok; y += krok) ctx.fillRect(Math.round(wezyk(y) + bok * r * 1.6 - 3), Math.round(y - 3), 6, 6);
    }
    const ky = H * 0.55, krokB = 380;
    for (let k = Math.floor((droga - H) / krokB) - 1; k <= Math.floor((droga + H) / krokB) + 1; k++) {
      const y = ky + droga - k * krokB;
      if (y < -krokB || y > H + krokB) continue;
      const bok = k % 2 ? 1 : -1;
      const swieci = clamp(1 - Math.abs(y - ky) / (r * 2.2));
      if (swieci > 0.9 && now - ostatniDing > 260 && !still && predkosc > 300) {
        ostatniDing = now;
        ding(880 + (((k % 3) + 3) % 3) * 220);
      }
      odbijacz(wezyk(y) + bok * r * 3.1, y, r * 0.55, swieci);
    }
    if (predkosc > 200) {
      ctx.strokeStyle = "rgba(255,246,200,0.35)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const x = wezyk(ky) + Math.sin(i * 1.7) * r * 0.9, y0 = ky + r + ((i * 47 + droga * 0.9) % (H * 0.4));
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y0 + 30 + predkosc / 40);
        ctx.stroke();
      }
    }
    kula(wezyk(ky) + Math.sin(t / 90) * r * 0.15, ky + Math.sin(t / 130) * r * 0.1, r, droga / (r * 1.2), t);
  };

  const klatka = (now: number) => {
    if (koniec) return;
    raf = requestAnimationFrame(klatka);
    const dt = Math.min(0.05, (now - ostatnio) / 1000);
    ostatnio = now;
    const t = now - t0, tf = now - fazaOd;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const L = uklad(), r = Math.min(W, H) * PINBALL.kula;

    if (faza === "hala" || faza === "napiecie" || faza === "strzal") {
      ctx.drawImage(tlo(z), 0, 0, W, H);
      lampy(t);
      let p = 0, sc = 0, kulaY = L.kulaY, zHero = true;
      if (faza === "hala") {
        const u = still ? 1 : clamp(tf / PINBALL.wejscieMs);
        if (u < 1) {
          const e = ease(u);
          ludzik(L.schody.x + (L.przed.x - L.schody.x) * e, L.schody.y + (L.przed.y - L.schody.y) * e, t, true);
          zHero = false;
        } else {
          // Climbing in: a hop from the front of the cabinet into the ball.
          const w = clamp((tf - PINBALL.wejscieMs) / PINBALL.wsiadanieMs);
          if (w < 1 && !still) {
            const x = L.przed.x + (L.rx - L.przed.x) * w, y = L.przed.y + (kulaY - L.przed.y) * w - Math.sin(w * Math.PI) * L.u * 1.5;
            ludzik(x, y + L.u * 1.2, t, true);
            zHero = false;
          } else {
            zmien("napiecie", now);
            ding(440, 0.04, "triangle");
            pisz(
              cel
                ? tx(`Ciśnienie rośnie… zwrotnice ustawiają tor do: ${cel}`, `Pressure rising… the switches set the track to: ${cel}`)
                : tx("Ciśnienie rośnie…", "Pressure rising…"),
            );
          }
        }
      } else if (faza === "napiecie") {
        p = still ? 1 : ease(clamp(tf / PINBALL.minNapiecieMs));
        sc = p;
        if (p >= 1 && !napisPelne) {
          napisPelne = true;
          pisz(gotowy ? tx("Pełne ciśnienie!", "Full pressure!") : tx("Pełne ciśnienie – czekamy na wolny tor…", "Full pressure – waiting for a clear track…"));
        }
        if (now - ostatniSyk > 700 - 400 * p && !still) {
          ostatniSyk = now;
          syk(0.3 + 0.7 * p, 250 + 300 * p);
        }
        if (tf >= PINBALL.minNapiecieMs && (gotowy || tf >= PINBALL.maxNapiecieMs)) {
          zmien("strzal", now);
          pisz(tx("PSTRYK!", "PING!"));
          ding(660);
          syk(1, 700);
        }
      } else {
        // The shot: the spring lets go, the ball shoots up the tube out of the ceiling.
        const s = still ? 1 : clamp(tf / PINBALL.wystrzalMs);
        p = 1 - s;
        sc = 1 - Math.min(1, s * 4);
        kulaY = L.kulaY - (L.kulaY + r * 3) * easeOut(s);
        if (s >= 1) {
          zmien("rury", now);
          pisz(tx("Pędzisz rurami pod miastem…", "Rushing through the tubes under the city…"));
        }
      }
      const drz = faza === "napiecie" && p >= 1 ? Math.sin(t / 25) * 1.5 : 0;
      const gora = (faza === "strzal" ? L.kulaY : kulaY) + drz;
      sprezyna(gora, sc);
      kula(L.rx + drz, kulaY + sc * L.u * 0.7 + drz, r, faza === "strzal" ? tf / 60 : 0, t, zHero);
      manometr(p, t);
      if (faza !== "hala") {
        para(L.rx - L.u * 1.6, L.kulaY + L.u, t, 3 + Math.round(p * 5), 0.6 + p * 0.6);
        para(L.rx + L.u * 1.6, L.kulaY + L.u * 1.2, t + 400, 2 + Math.round(p * 4), 0.6 + p * 0.5);
      }
      return;
    }

    if (faza === "rury" || faza === "hamowanie") {
      let v = 1500;
      if (faza === "rury") {
        if (gotowy && tf >= PINBALL.minRuryMs) {
          zmien("hamowanie", now);
          pisz(cel ? tx(`Hamulce parowe! Stacja: ${cel}`, `Steam brakes! Station: ${cel}`) : tx("Hamulce parowe!", "Steam brakes!"));
          syk(1, 800);
        } else if (!napisWczytuje && t > PINBALL.tekstWczytuje) {
          napisWczytuje = true;
          pisz(tx("Zwrotnice przestawiają tor – wczytuję wylot…", "The switches set the track – loading the exit…"));
        }
      } else {
        const u = still ? 1 : clamp(tf / PINBALL.hamowanieMs);
        v *= 1 - easeOut(u) * 0.85;
        if (u >= 1) zmien("przyjazd", now);
      }
      rury(now, t, v, dt);
      if (faza === "hamowanie") {
        para(W / 2, H * 0.62, t, 8, 1.4);
        ctx.globalAlpha = ease(clamp(tf / PINBALL.hamowanieMs));
        ctx.fillStyle = "#f2f4f6";
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }
      return;
    }

    // Arrival: the destination's own hall. The ball drops down the lane onto the plunger, the hero gets out and
    // walks to the stairs, daylight from above fills the view.
    ctx.drawImage(tlo(cel || z), 0, 0, W, H);
    lampy(t);
    const zj = still ? 1 : clamp(tf / PINBALL.zjazdMs);
    const wy = still ? 1 : clamp((tf - PINBALL.zjazdMs) / PINBALL.wysiadanieMs);
    const sw = still ? 1 : clamp((tf - PINBALL.zjazdMs - PINBALL.wysiadanieMs) / PINBALL.swiatloMs);
    const ky = -r * 2 + (L.kulaY + r * 2) * easeOut(zj);
    const odbicie = zj >= 1 ? Math.max(0, 1 - (tf - PINBALL.zjazdMs) / 250) : 0;
    sprezyna(L.kulaY, odbicie * 0.8);
    kula(L.rx, ky + odbicie * L.u * 0.5, r, 0, t, wy <= 0);
    manometr(0, t);
    if (zj >= 1 && tf - PINBALL.zjazdMs < 900) para(L.rx, L.kulaY + L.u, t, 7, 1.2);
    if (wy > 0) {
      const e = ease(wy);
      ludzik(L.przed.x + (L.schody.x - L.przed.x) * e, L.przed.y + (L.schody.y - L.przed.y) * e, t, wy < 1);
    }
    // The fade in from the tubes' steam.
    if (tf < 300 && !still) {
      ctx.globalAlpha = 1 - tf / 300;
      ctx.fillStyle = "#f2f4f6";
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (wy > 0 && text.dataset.wysiada !== "1") {
      text.dataset.wysiada = "1";
      pisz(tx("Schody w górę – do włazu!", "Up the stairs – to the hatch!"));
    }
    if (sw > 0) {
      ctx.globalAlpha = ease(sw);
      ctx.fillStyle = "#fff6c8";
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (sw >= 1 && lad) {
      const done = lad.done;
      lad = null;
      done();
    }
  };
  raf = requestAnimationFrame(klatka);

  const key = (e: KeyboardEvent) => {
    if (e.key !== "Tab") {
      e.preventDefault();
      e.stopImmediatePropagation();
    } else {
      const b = [...root.querySelectorAll("button")];
      if (b.length) {
        e.preventDefault();
        b[(b.indexOf(document.activeElement as HTMLButtonElement) + (e.shiftKey ? -1 : 1) + b.length) % b.length].focus();
      } else e.preventDefault();
    }
  };
  window.addEventListener("keydown", key, true);

  return {
    root,
    text,
    launch() {},
    /** The destination is ready: the shot goes (if still waiting), the tubes end in the destination's hall; resolves
     *  when the hero has walked up into the daylight. */
    async land(k: { cel: string }) {
      if (k.cel && !cel) cel = k.cel;
      gotowy = true;
      await new Promise<void>((done) => {
        lad = { done };
      });
    },
    async recover(message: string, actions: { label: string; run: () => Promise<void> }[]) {
      clearTimeout(tekstTimer);
      text.classList.remove("znika");
      text.textContent = message;
      napisWczytuje = napisPelne = true;
      await new Promise<void>((resolve) => {
        const buttons = actions.map((action) => {
          const b = document.createElement("button");
          b.textContent = action.label;
          b.onclick = async () => {
            buttons.forEach((b) => ((b.disabled = true), (b.hidden = true)));
            pisz(tx("Ponawiam jazdę…", "Retrying the ride…"));
            try {
              await action.run();
              buttons.forEach((b) => b.remove());
              resolve();
            } catch (e) {
              clearTimeout(tekstTimer);
              text.classList.remove("znika");
              text.textContent = describe(e);
              buttons.forEach((b) => ((b.disabled = false), (b.hidden = false)));
            }
          };
          root.append(b);
          return b;
        });
        buttons[0]?.focus();
      });
    },
    close() {
      koniec = true;
      cancelAnimationFrame(raf);
      clearTimeout(tekstTimer);
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("resize", rozmiar);
      root.remove();
      resetKeys();
      resetTouch();
      focus?.focus();
    },
  };
}
