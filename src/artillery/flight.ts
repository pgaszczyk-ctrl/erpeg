import { tx } from "../i18n";
import { resetKeys, resetTouch } from "../controls";
import { audio } from "../sfx";

// The cannon flight (owner, 1 Nov 2026): no side view and no parachute. A picture of the map taken at the shot
// shrinks under the hero and slides away as he flies off in the shot's direction, clouds close in while the
// destination loads behind them, then a picture of the destination map zooms in under him and he falls towards the
// net. The net catch, its bounce and the smoke happen on the real map (ladowanie.ts). Clouds are code-drawn
// placeholders until the artist's (order 46).

/** Where a map picture sits on screen: the point (fx, fy as a share of the view) and CSS px per map px. */
export type Kadr = {
  /** A panorama spans two view widths/heights; fx/fy below still describe the live landing camera. */
  panorama?: { fx: number; fy: number; span: number };
  shot: HTMLCanvasElement | null;
  /** The point the animation is about (start: the cannon's muzzle; landing: the net), share of the view. */
  fx: number;
  fy: number;
  /** CSS px per map px of the picture. */
  px: number;
};

export const LOT = {
  /** Map shrinking + sliding away. */
  odlotMs: 1500,
  /** The map is shrunk to this at the end of the take-off. */
  mapaMin: 0.3,
  /** How far the map slides, in view diagonals. */
  przesuw: 0.55,
  /** Clouds close in over this period (from the start). */
  chmuryOd: 700,
  chmuryDo: 2100,
  /** Landing can start only after this (from the start), so the take-off always finishes. */
  minLotMs: 2600,
  /** Zoom-in and fall into the net. */
  ladowanieMs: 3000,
  /** The hero's height in map px (56 × 0.36 × 2/3). */
  bohaterPx: 13.4,
  /** The hero's size in flight relative to his map size. */
  wLocie: 3.2,
  /** Text timing. */
  tekstChmury: 1900,
  tekstWczytuje: 4200,
};

type Chmura = { x: number; y: number; s: number; v: number; obraz: HTMLCanvasElement; a: number };

/** Illustrated cloud silhouettes, shaded from the NW; large source pictures avoid enlarged black pixel blobs. */
function rysunkiChmur(): HTMLCanvasElement[] {
  return Array.from({ length: 6 }, (_, n) => {
    const c = document.createElement("canvas");
    c.width = 240 + n * 12; c.height = 132;
    const g = c.getContext("2d")!;
    const lobes = Array.from({ length: 7 }, (_, i) => {
      const t = i / 6;
      return { x: 36 + t * (c.width - 72), y: 86 - Math.sin(t * Math.PI) * (24 + n * 2),
        r: 24 + Math.sin(t * Math.PI) * 17 + Math.sin(i * 2.4 + n) * 4 };
    });
    const shape = () => {
      g.beginPath();
      for (const p of lobes) { g.moveTo(p.x + p.r, p.y); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); }
    };
    shape();
    g.fillStyle = "#8b9caa"; g.fill();
    g.save(); shape(); g.clip();
    const shade = g.createLinearGradient(0, 25, 0, 123);
    shade.addColorStop(0, "#fffdf2"); shade.addColorStop(.52, "#f3f2e9"); shade.addColorStop(1, "#b7c9d5");
    g.translate(-1, -3); shape(); g.fillStyle = shade; g.fill(); g.translate(1, 3);
    for (const p of lobes.slice(1, -1)) {
      g.beginPath(); g.ellipse(p.x - 5, p.y - p.r * .42, p.r * .66, p.r * .35, -.2, 0, Math.PI * 2);
      g.fillStyle = "rgba(255,255,248,.22)"; g.fill();
    }
    g.restore();
    return c;
  });
}

const ease = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const clamp = (t: number) => Math.max(0, Math.min(1, t));

export function flight(
  hero: string | string[] | undefined,
  describe: (e: unknown) => string = (e) =>
    e instanceof Error ? e.message : String(e),
  start: Kadr & { kat: number; cel: string } = { shot: null, fx: 0.5, fy: 0.5, px: 4, kat: 0, cel: "" },
) {
  resetKeys();
  resetTouch();
  const still = matchMedia("(prefers-reduced-motion:reduce)").matches;
  const root = document.createElement("div");
  root.id = "artillery-flight";
  root.className = "m-screen";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", tx("Lot armatą", "Cannon flight"));
  root.innerHTML = `<style>#artillery-flight{z-index:10020;background:transparent;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:end;padding:24px;color:#1e1a24}#artillery-flight canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}#artillery-flight p{position:relative;font:600 17px 'Alegreya Sans',system-ui,sans-serif;background:#f6e7c6;padding:10px 18px;border:3px solid #1e1a24;box-shadow:4px 4px 0 #1e1a24;max-width:95%;text-align:center;margin:0 0 8px;transition:opacity .25s}#artillery-flight p.znika{opacity:0}#artillery-flight button{position:relative;min-height:44px;padding:10px 18px;border:3px solid #1e1a24;box-shadow:3px 3px 0 #1e1a24;background:#e9b856;margin:4px;font:600 16px 'Alegreya Sans',system-ui,sans-serif}</style><canvas></canvas><p aria-live="polite"></p>`;
  const canvas = root.querySelector("canvas")!;
  const ctx = canvas.getContext("2d")!;
  const text = root.querySelector("p")!;
  document.body.append(root);
  const focus = document.activeElement as HTMLElement | null;

  // Text with a short fade so a change is noticed.
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
  pisz(
    start.cel
      ? tx(`BUM! Wystrzał w stronę: ${start.cel}`, `BOOM! Fired towards: ${start.cel}`)
      : tx("BUM! Wystrzał!", "BOOM! Fired!"),
  );

  // Hero pictures (the 3D model's flight frames, else the sheet frame).
  const klatki = (Array.isArray(hero) ? hero : hero ? [hero] : []).map((src) => {
    const i = new Image();
    i.src = src;
    return i;
  });
  const chmuryObrazy = rysunkiChmur();

  // Canvas size in device pixels (capped at 2 per CSS px).
  let W = 0, H = 0, dpr = 1;
  const rozmiar = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = root.clientWidth || window.innerWidth;
    H = root.clientHeight || window.innerHeight;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
  };
  rozmiar();
  window.addEventListener("resize", rozmiar);

  const dir = { x: Math.cos(start.kat), y: Math.sin(start.kat) };
  const t0 = performance.now();
  const chmury: Chmura[] = [];
  let ostatnio = t0;
  // Landing state.
  let lad: (Kadr & { t: number; done: () => void; cel: string }) | null = null;
  let koniec = false;
  let raf = 0;

  /** A cloud enters from the side the hero flies towards and rushes past backwards. */
  const nowaChmura = (gdziekolwiek: boolean) => {
    const s = 0.65 + Math.random() * 1.15; // near clouds are larger and faster
    const obraz = chmuryObrazy[(Math.random() * chmuryObrazy.length) | 0];
    const diag = Math.hypot(W, H) / 2 + obraz.width * s;
    // A point on a line across the view, pushed ahead along the flight direction.
    const bok = (Math.random() - 0.5) * 2 * diag;
    const naprzod = gdziekolwiek ? (Math.random() - 0.5) * 2 * diag : diag;
    chmury.push({
      x: W / 2 + dir.x * naprzod - dir.y * bok,
      y: H / 2 + dir.y * naprzod + dir.x * bok,
      s,
      v: 120 + s * 210,
      obraz,
      a: 1,
    });
  };

  /** A map picture drawn so its point (fx, fy) lands at screen (sx, sy), scaled by k. */
  const mapa = (k: Kadr, sx: number, sy: number, skala: number) => {
    if (!k.shot) return;
    const span = k.panorama?.span ?? 1;
    const w = W * skala * span, h = H * skala * span;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(k.shot, sx - (k.panorama?.fx ?? k.fx) * w, sy - (k.panorama?.fy ?? k.fy) * h, w, h);
  };

  const niebo = (alfa = 1) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#5f9cc2");
    g.addColorStop(1, "#cfe6ee");
    ctx.globalAlpha = alfa;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  };

  /** The cloud floor (a full cover). */
  const pokrywa = (alfa: number, t: number) => {
    if (alfa <= 0) return;
    ctx.globalAlpha = alfa;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#e9f1f6");
    g.addColorStop(1, "#c6d7e3");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Overlapping, low-contrast cloud banks hide loading without a flat slab or speed stripes.
    ctx.imageSmoothingEnabled = true;
    const drift = still ? 0 : t * .025;
    for (let row = -1; row <= Math.ceil(H / 140); row++) {
      for (let col = -1; col <= Math.ceil(W / 240) + 1; col++) {
        const cloud = chmuryObrazy[((row + col) % 6 + 6) % 6];
        ctx.globalAlpha = alfa * .28;
        ctx.drawImage(cloud, col * 240 - drift % 240 + (row % 2) * 100, row * 140, 380, 210);
      }
    }
    ctx.globalAlpha = 1;
  };

  const rysujChmury = (dt: number, gestosc: number, rozstep: number) => {
    ctx.imageSmoothingEnabled = true;
    // Keep enough clouds for the density.
    const chce = Math.round(gestosc * 26);
    let zywych = 0;
    for (const c of chmury) if (c.a > 0) zywych++;
    for (let i = zywych; i < chce; i++) nowaChmura(still || (chmury.length < 4 && gestosc > 0.9));
    const diag = Math.hypot(W, H);
    for (let i = chmury.length - 1; i >= 0; i--) {
      const c = chmury[i];
      if (still) {
        if (rozstep > 0) c.a = 0;
      } else if (rozstep > 0) {
        // Parting: pushed away from the middle and fading.
        const ox = c.x - W / 2, oy = c.y - H / 2, d = Math.hypot(ox, oy) || 1;
        c.x += (ox / d) * dt * (300 + 900 * rozstep);
        c.y += (oy / d) * dt * (300 + 900 * rozstep);
        c.a = Math.max(0, c.a - dt * 1.4);
      } else {
        c.x -= dir.x * c.v * dt;
        c.y -= dir.y * c.v * dt;
      }
      const w = c.obraz.width * c.s, h = c.obraz.height * c.s;
      // Same reach as where clouds are spawned (nowaChmura), so a fresh one isn't dropped at once on small screens.
      const zasieg = diag / 2 + w;
      const ox = c.x - W / 2, oy = c.y - H / 2;
      const odSrodka = ox * dir.x + oy * dir.y, wBok = Math.abs(-ox * dir.y + oy * dir.x);
      if (c.a <= 0 || odSrodka < -zasieg || wBok > zasieg * 1.5 || Math.hypot(ox, oy) > zasieg * 2.2) {
        chmury.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = c.a;
      ctx.drawImage(c.obraz, Math.round(c.x - w / 2), Math.round(c.y - h / 2), Math.round(w), Math.round(h));
    }
    ctx.globalAlpha = 1;
  };

  const bohater = (x: number, y: number, wys: number, obrot: number, t: number) => {
    const img = klatki.length ? klatki[Math.floor(t / 60) % klatki.length] : null;
    if (!img || !img.complete || !img.naturalWidth) return;
    // The figure fills ~54 of the frame's 64 px (ludzik3d / sheets).
    const s = (wys * 64) / 54 / img.naturalHeight;
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(obrot);
    ctx.drawImage(img, -img.naturalWidth * s / 2, -img.naturalHeight * s / 2, img.naturalWidth * s, img.naturalHeight * s);
    ctx.restore();
  };

  const cien = (x: number, y: number, r: number, alfa: number) => {
    if (alfa <= 0 || r <= 0) return;
    ctx.globalAlpha = alfa;
    ctx.fillStyle = "#1e1a24";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  /** A muzzle puff on the shrinking map: white circles growing and fading. */
  const dym = (x: number, y: number, t: number, skala: number) => {
    if (t > 900 || t < 0) return;
    const u = t / 900;
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      const d = (6 + 26 * easeOut(u)) * skala;
      ctx.globalAlpha = (1 - u) * 0.85;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6 - 10 * u * skala, (5 + 12 * u) * skala, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  let napisChmury = false, napisWczytuje = false;
  const klatka = (now: number) => {
    if (koniec) return;
    raf = requestAnimationFrame(klatka);
    const dt = Math.min(0.05, (now - ostatnio) / 1000);
    ostatnio = now;
    const t = now - t0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const bohWys = LOT.bohaterPx * start.px; // hero's height on the map, CSS px
    const diag = Math.hypot(W, H);

    if (!lad) {
      // Take-off: the map shrinks under the muzzle and slides away backwards.
      const u = still ? 1 : clamp(t / LOT.odlotMs);
      const skala = 1 - (1 - LOT.mapaMin) * easeOut(u);
      const przesuw = diag * LOT.przesuw * u * u;
      const sx = start.fx * W - dir.x * przesuw, sy = start.fy * H - dir.y * przesuw;
      const pokryte = still ? 1 : ease(clamp((t - LOT.chmuryOd) / (LOT.chmuryDo - LOT.chmuryOd)));
      if (pokryte < 1) {
        niebo();
        mapa(start, sx, sy, skala);
        // Haze over the map as the hero climbs.
        ctx.fillStyle = `rgba(207,230,238,${0.45 * easeOut(u)})`;
        ctx.fillRect(0, 0, W, H);
        dym(sx, sy, t, skala);
      }
      pokrywa(pokryte, t);
      // The hero: out of the muzzle to just behind the middle, growing (closer to us), turning head-first.
      const hx = start.fx * W + (W / 2 - dir.x * W * 0.06 - start.fx * W) * ease(u);
      const hy = start.fy * H + (H * 0.38 - dir.y * H * 0.06 - start.fy * H) * ease(u);
      const wys = bohWys * (1 + (LOT.wLocie - 1) * easeOut(u));
      const obrot = (start.kat + Math.PI / 2) * easeOut(clamp(u * 1.6)) + Math.sin(t / 260) * 0.08;
      // His shadow stays on the map under him and fades as he climbs.
      if (pokryte < 1) cien(hx + 18 * u, hy + bohWys * 0.5 + 40 * u, bohWys * 0.35 * skala * (1 - 0.5 * u), 0.35 * (1 - u) * (1 - pokryte));
      rysujChmury(still ? 0 : dt, pokryte, 0);
      bohater(hx, hy + Math.sin(t / 330) * 4 * u, wys, obrot, t);
      if (!napisChmury && t > LOT.tekstChmury) {
        napisChmury = true;
        pisz(tx("Lecisz wysoko nad chmurami…", "Flying high above the clouds…"));
      }
      if (!napisWczytuje && t > LOT.tekstWczytuje) {
        napisWczytuje = true;
        pisz(
          tx(
            "Pod chmurami szykują siatkę – wczytuję okolicę celu…",
            "Below the clouds they're readying the net – loading the destination…",
          ),
        );
      }
      return;
    }

    // Landing: clouds part, the destination map zooms in under the hero, he falls into the net.
    const L = now - lad.t;
    const u = still ? 1 : clamp(L / LOT.ladowanieMs);
    const z = ease(clamp(L / (LOT.ladowanieMs * 0.92)));
    const skalaNalotu = lad.panorama ? 0.72 : 1;
    let skala = skalaNalotu + (1 - skalaNalotu) * z;
    const nx = lad.fx * W, ny = lad.fy * H;
    // The map arrives from the flight direction and settles with the net under the hero's landing point.
    const sx = nx + dir.x * W * 0.14 * (1 - z), sy = ny + dir.y * H * 0.14 * (1 - z);
    if (lad.panorama) {
      const p = lad.panorama;
      // Never reveal a picture edge, including unusual aspect ratios and a net away from the centre.
      skala = Math.max(skala, sx / (p.fx * W * p.span), (W - sx) / ((1 - p.fx) * W * p.span),
        sy / (p.fy * H * p.span), (H - sy) / ((1 - p.fy) * H * p.span));
    }
    niebo();
    mapa(lad, sx, sy, skala);
    ctx.fillStyle = `rgba(207,230,238,${0.45 * (1 - z)})`;
    ctx.fillRect(0, 0, W, H);
    pokrywa(1 - clamp(L / 650), t);
    rysujChmury(still ? 0 : dt, 0, clamp(L / 650) + 0.01);
    // The hero: from the middle, big, down an arc into the net, shrinking to his map size, turning feet-first.
    const bohLad = LOT.bohaterPx * lad.px;
    // A visible fly-over first; the final part descends into the net.
    const k = easeOut(clamp((u - 0.3) / 0.7));
    const ax = W / 2, ay = H * 0.38, bx = nx, by = ny - bohLad * 0.5;
    const hx = ax + (bx - ax) * k, hy = ay + (by - ay) * k - Math.sin(Math.PI * u) * H * 0.08;
    const wys = bohLad * (LOT.wLocie + (1 - LOT.wLocie) * k);
    const obrot = (start.kat + Math.PI / 2) * (1 - ease(clamp((u - .3) / .7)));
    cien(nx, ny + bohLad * 0.1, bohLad * 0.35 * skala * (0.3 + 0.7 * k), 0.4 * k);
    bohater(hx, hy, wys, obrot, t * (1 - k));
    if (u >= 1) {
      const done = lad.done;
      lad = { ...lad, done: () => {} };
      done();
    }
  };
  raf = requestAnimationFrame(klatka);

  // Boom.
  const a = audio();
  if (a) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(110, a.currentTime);
    o.frequency.exponentialRampToValueAtTime(35, a.currentTime + 0.22);
    g.gain.setValueAtTime(0.18, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.35);
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + 0.36);
  }

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
    /** Kept for the old call order; the take-off already runs. */
    launch() {},
    /** Clouds part over the destination picture and the hero falls; resolves when he reaches the net. */
    async land(k: Kadr & { cel: string }) {
      const zostalo = t0 + LOT.minLotMs - performance.now();
      if (!still && zostalo > 0) await new Promise((r) => setTimeout(r, zostalo));
      pisz(
        k.cel
          ? tx(`Chmury się rozstępują – w dole ${k.cel}!`, `The clouds part – ${k.cel} below!`)
          : tx("Chmury się rozstępują – w dole siatka!", "The clouds part – the net below!"),
      );
      await new Promise<void>((done) => {
        lad = { ...k, t: performance.now(), done };
      });
    },
    async recover(message: string, actions: { label: string; run: () => Promise<void> }[]) {
      clearTimeout(tekstTimer);
      text.classList.remove("znika");
      text.textContent = message;
      // The timed lines mustn't replace the error.
      napisChmury = napisWczytuje = true;
      await new Promise<void>((resolve) => {
        const buttons = actions.map((action) => {
          const b = document.createElement("button");
          b.textContent = action.label;
          b.onclick = async () => {
            // Hidden while it runs: a retry flies on over the clouds without the error window.
            buttons.forEach((b) => ((b.disabled = true), (b.hidden = true)));
            pisz(tx("Ponawiam lot…", "Retrying the flight…"));
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
