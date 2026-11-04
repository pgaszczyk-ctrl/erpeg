import type { HudView } from './hud';

type Parts = {
  m: HTMLDivElement; heal: HTMLButtonElement; hp: HTMLButtonElement; xp: HTMLButtonElement;
  count: HTMLDivElement; wpn: HTMLButtonElement; wpnImg: HTMLImageElement;
  wcount: HTMLDivElement; avPic: HTMLCanvasElement;
  vehicles: Record<'rower' | 'hulajnoga', HTMLButtonElement>;
};
type Portrait = { src: CanvasImageSource; sx: number; sy: number; sw: number; sh: number } | null;
const BASE = `${import.meta.env.BASE_URL || '/'}hud/v6/`;
const HEIGHT = 94;
const LIFE_X = 136;

/** Compact TEST HUD, drawn on the same small pixel grid as the world. Life anchors the screen centre. */
export function createReservoirHud(p: Parts) {
  p.m.classList.add('hud-reservoir');
  p.m.querySelector('canvas')!.style.display = 'none';
  p.hp.style.display = p.wpn.style.display = 'none';
  p.m.querySelector<HTMLButtonElement>('.hud-b2')!.style.display = 'none';
  const av = p.m.querySelector<HTMLButtonElement>('.hud-av')!;
  const camera = p.m.querySelector<HTMLButtonElement>('.hud-b1')!;
  const canvas = document.createElement('canvas');
  canvas.className = 'hud-reservoir-art';
  canvas.style.cssText = 'pointer-events:none;image-rendering:pixelated';
  p.m.prepend(canvas);
  const c = canvas.getContext('2d')!;
  const images: Record<string, HTMLImageElement> = {};
  let last: HudView | null = null, alive = true;
  let fallback: Portrait = null;
  let s = 1, dpr = 1;
  const width = 267;
  let vehicles: HTMLButtonElement[] = [];

  const load = (name: string, url: string) => {
    const im = new Image(); images[name] = im;
    im.onload = () => { if (alive && last) draw(last); };
    im.src = url;
  };
  load('camera', BASE + 'aparat.webp');
  load('apple', `${import.meta.env.BASE_URL || '/'}hud/v5/jablko.png`);
  load('potion', `${import.meta.env.BASE_URL || '/'}hud/v5/mikstura.png`);
  load('pipes', `${import.meta.env.BASE_URL || '/'}hud/v5/rurki.png`);
  // The approved vehicle art is requested only when that vehicle is in the backpack.

  const removers: (() => void)[] = [];
  for (const b of p.m.querySelectorAll('button')) {
    let start: { x: number; y: number } | null = null, dragged = false;
    const down = (e: PointerEvent) => { start = { x: e.clientX, y: e.clientY }; dragged = false; };
    const move = (e: PointerEvent) => {
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) dragged = true;
    };
    const cancel = () => { dragged = true; start = null; };
    const click = (e: MouseEvent) => {
      if (dragged && e.detail !== 0) { e.preventDefault(); e.stopImmediatePropagation(); }
      start = null;
    };
    b.addEventListener('pointerdown', down); b.addEventListener('pointermove', move);
    b.addEventListener('pointercancel', cancel); b.addEventListener('click', click, true);
    removers.push(() => {
      b.removeEventListener('pointerdown', down); b.removeEventListener('pointermove', move);
      b.removeEventListener('pointercancel', cancel); b.removeEventListener('click', click, true);
    });
  }
  const at = (el: HTMLElement, x: number, y: number, w: number, h: number) => Object.assign(el.style, {
    left: `${x * s}px`, top: `${y * s}px`, width: `${w * s}px`, height: `${h * s}px`,
  });
  function layout() {
    dpr = window.devicePixelRatio || 1;
    // A computer gets a bigger machine (owner, 11 Oct 2026): ×2 on a tall enough window, else ×1.5.
    const desk = window.innerWidth >= 900 && !window.matchMedia('(pointer: coarse)').matches;
    s = desk ? (window.innerHeight >= 760 ? 2 : 1.5) : 1;
    vehicles = [p.vehicles.rower, p.vehicles.hulajnoga].filter(b => !b.hidden);
    // One fixed vehicle socket; inventory/availability selection lives in hud.ts.
    // Its inactive bicycle placeholder keeps the life tank's anchor unchanged.
    const left = Math.round((window.innerWidth / 2 - LIFE_X * s) * dpr) / dpr;
    Object.assign(p.m.style, {
      left: `${left}px`, right: 'auto', bottom: 'calc(8px + env(safe-area-inset-bottom))',
      width: `${width * s}px`, height: `${HEIGHT * s}px`, transform: '',
    });
    const w = width, h = HEIGHT;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    at(p.xp, 2, 38, 44, 44);
    at(av, 54, 38, 44, 44);
    at(p.avPic, 55, 39, 42, 42);
    // Life is the biggest button, and the overlapping healing bottle belongs to it.
    at(p.heal, LIFE_X - 77 / 2, 0, 77, 94);
    p.heal.style.borderRadius = '35%';
    at(camera, 175, 38, 44, 44);
    vehicles.forEach(b => {
      at(b, 220, 38, 44, 44);
      const im = b.querySelector('img')!;
      Object.assign(im.style, { left: `${3 * s}px`, top: `${3 * s}px`, width: `${38 * s}px`, height: `${38 * s}px`, imageRendering: 'auto' });
      const wanted = b === p.vehicles.rower ? BASE + 'velocyped.webp' : `${import.meta.env.BASE_URL || '/'}items/hulajnoga_parowa.png`;
      if (!im.getAttribute('src')) im.src = wanted;
    });
    at(p.count, 150, 80, 22, 13);
    Object.assign(p.count.style, { minWidth: '0', padding: '0', border: '1px solid #b8893b', borderRadius: '4px', font: `700 ${10 * s}px/${11 * s}px 'Pixelify Sans',monospace` });
    // Retain ammo/wear information without another large weapon socket.
    at(p.wcount, 62, 80, 28, 13);
    p.wcount.style.font = `700 ${10 * s}px/${11 * s}px 'Pixelify Sans',monospace`;
    paintAvatar();
    if (last) draw(last);
  }
  // Steampunk dress (owner, 10 Oct 2026: "zbyt mało steampunkowo… z rurkami, może manometrami"):
  // the same layout and hit areas, drawn as one small boiler-room machine on the world's pixel grid.
  const ink = '#211a22', dark = '#644226', brass = '#b28443', light = '#e0bc78', pale = '#f4dc9c';
  const copper = '#8f4f2c', copperL = '#c97b4a', copperD = '#5a2f22', iron = '#3b3438', ironL = '#5d5258';
  const cream = '#eadcb4', needle = '#a3262e';
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  function rect(x: number, y: number, w: number, h: number, color: string) {
    c.fillStyle = color; c.fillRect(x, y, w, h);
  }
  function oval(x: number, y: number, rx: number, ry: number, color: string) {
    c.fillStyle = color;
    for (let j = -ry; j <= ry; j++) {
      const n = Math.floor(rx * Math.sqrt(Math.max(0, 1 - j * j / (ry * ry))));
      c.fillRect(x - n, y + j, n * 2 + 1, 1);
    }
  }
  function rivet(x: number, y: number) {
    rect(x, y, 3, 3, ink); rect(x, y, 2, 2, light); rect(x, y, 1, 1, pale);
  }
  function line(x0: number, y0: number, x1: number, y1: number, color: string) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) rect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1, color);
  }
  /** A horizontal pipe: dark outline, lit top, shaded bottom (light from the north-west like the world). */
  function hpipe(x0: number, x1: number, y: number, th: number, kind: 'brass' | 'copper' = 'brass') {
    const [hi, mid, lo] = kind === 'brass' ? [light, brass, dark] : [copperL, copper, copperD];
    rect(x0, y, x1 - x0, th, ink);
    rect(x0, y + 1, x1 - x0, th - 2, mid);
    rect(x0, y + 1, x1 - x0, 1, hi);
    if (th > 5) rect(x0, y + 2, x1 - x0, 1, kind === 'brass' ? pale : '#e0a070');
    rect(x0, y + th - 2, x1 - x0, 1, lo);
  }
  function vpipe(x: number, y0: number, y1: number, th: number, kind: 'brass' | 'copper' = 'brass') {
    const [hi, mid, lo] = kind === 'brass' ? [light, brass, dark] : [copperL, copper, copperD];
    rect(x, y0, th, y1 - y0, ink);
    rect(x + 1, y0, th - 2, y1 - y0, mid);
    rect(x + 1, y0, 1, y1 - y0, hi);
    rect(x + th - 2, y0, 1, y1 - y0, lo);
  }
  /** A flange on a horizontal pipe: a taller collar with two bolts. */
  function flange(x: number, y: number, th: number) {
    rect(x, y - 2, 4, th + 4, ink); rect(x + 1, y - 1, 2, th + 2, brass);
    rect(x + 1, y - 1, 1, th + 2, light);
    rect(x + 1, y - 1, 2, 1, pale); rect(x + 1, y + th, 2, 1, dark);
  }
  function vflange(x: number, y: number, th: number) {
    rect(x - 2, y, th + 4, 4, ink); rect(x - 1, y + 1, th + 2, 2, brass);
    rect(x - 1, y + 1, th + 2, 1, light);
  }
  /** A small valve wheel (seen from the front) on a pipe. */
  function wheel(x: number, y: number, r: number, turn: number) {
    oval(x, y, r, r, ink); oval(x, y, r - 1, r - 1, copperL); oval(x, y, r - 2, r - 2, ink);
    for (let k = 0; k < 4; k++) {
      const a = turn + k * Math.PI / 2;
      line(x, y, x + Math.round(Math.cos(a) * (r - 1)), y + Math.round(Math.sin(a) * (r - 1)), copperL);
    }
    rect(x - 1, y - 1, 2, 2, pale);
  }
  /** A pressure gauge: brass bezel, cream dial, ticks, a red zone, the needle at share 0..1. */
  function gauge(x: number, y: number, r: number, share: number, redZone: 'low' | 'high' | null, flutter: number) {
    oval(x, y + 1, r + 1, r + 1, ink);
    oval(x, y, r + 1, r + 1, ink);
    oval(x, y, r, r, light); oval(x + 1, y + 1, r - 1, r - 1, dark); oval(x, y, r - 1, r - 1, brass);
    oval(x, y, r - 2, r - 2, ink); oval(x, y, r - 3, r - 3, cream);
    oval(x + 1, y + 1, r - 4, r - 4, '#e3d3a6');
    const from = Math.PI * 0.75, span = Math.PI * 1.5;
    const ticks = r >= 9 ? 8 : 6;
    for (let k = 0; k <= ticks; k++) {
      const a = from + span * k / ticks;
      const big = k % 2 === 0;
      const r1 = r - 3, r0 = r - (big ? 5 : 4);
      line(x + Math.round(Math.cos(a) * r0), y + Math.round(Math.sin(a) * r0), x + Math.round(Math.cos(a) * r1), y + Math.round(Math.sin(a) * r1), ink);
    }
    if (redZone) {
      for (let k = 0; k <= 6; k++) {
        const a = from + span * (redZone === 'low' ? k / 6 * 0.22 : 0.78 + k / 6 * 0.22);
        rect(x + Math.round(Math.cos(a) * (r - 3)), y + Math.round(Math.sin(a) * (r - 3)), 1, 1, needle);
      }
    }
    const a = from + span * Math.max(0, Math.min(1, share)) + flutter;
    const len = r - 3;
    line(x, y, x + Math.round(Math.cos(a) * len), y + Math.round(Math.sin(a) * len), needle);
    line(x - Math.round(Math.cos(a) * 2), y - Math.round(Math.sin(a) * 2), x, y, ink);
    rect(x - 1, y - 1, 2, 2, ink); rect(x - 1, y - 1, 1, 1, light);
    // Glass glint.
    rect(x - r + 3, y - r + 4, 1, 2, '#ffffffa0'); rect(x - r + 4, y - r + 3, 2, 1, '#ffffffa0');
  }
  /** Cog pictures, made once per size: 12 steps over one tooth so the turning is smooth. */
  const cogs = new Map<string, HTMLCanvasElement[]>();
  function cogFrames(r: number, teeth: number, tone: 'brass' | 'iron') {
    const key = `${r}:${teeth}:${tone}`;
    let fr = cogs.get(key);
    if (fr) return fr;
    fr = [];
    const size = r * 2 + 3, o = r + 1;
    const [hi, mid, lo] = tone === 'brass' ? ['#d9b56f', '#9c7139', '#5c3e22'] : [ironL, iron, '#29232a'];
    for (let step = 0; step < 12; step++) {
      const cv = document.createElement('canvas'); cv.width = cv.height = size;
      const g = cv.getContext('2d')!;
      const rot = step / 12 * Math.PI * 2 / teeth;
      for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
        const dx = px - o + 0.5, dy = py - o + 0.5, d = Math.hypot(dx, dy);
        const a = Math.atan2(dy, dx) - rot;
        const tooth = Math.cos(a * teeth) > 0.1;
        const edge = tooth ? r : r - 3;
        if (d > edge + 0.5) continue;
        let col = mid;
        if (d > edge - 0.6 || (d < r * 0.38 + 0.6 && d > r * 0.38 - 0.6)) col = ink;
        else if (d < r * 0.38) col = '#00000000';
        else if (dx + dy < -r * 0.3) col = hi;
        else if (dx + dy > r * 0.5) col = lo;
        if (col === '#00000000') continue;
        g.fillStyle = col; g.fillRect(px, py, 1, 1);
      }
      // Spokes holes for a lighter look on big cogs.
      fr.push(cv);
    }
    cogs.set(key, fr);
    return fr;
  }
  function cog(x: number, y: number, r: number, teeth: number, t: number, dir: number, tone: 'brass' | 'iron' = 'brass') {
    const fr = cogFrames(r, teeth, tone);
    const i = still ? 0 : ((Math.floor(t * 12) * dir) % 12 + 12) % 12;
    c.drawImage(fr[i], x - r - 1, y - r - 1);
  }
  /** A porthole socket: a riveted brass ring with a dark inside (portrait, camera, vehicle). */
  function porthole(x: number, y: number, active = false) {
    oval(x, y + 1, 21, 21, ink);
    oval(x, y, 21, 21, ink);
    oval(x, y, 20, 20, active ? pale : light);
    oval(x + 1, y + 1, 19, 19, dark);
    oval(x, y, 18, 18, brass);
    oval(x, y, 16, 16, ink);
    oval(x, y, 15, 15, '#2c2326');
    oval(x - 1, y - 1, 13, 13, '#352b2d');
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4 + Math.PI / 8;
      rivet(x + Math.round(Math.cos(a) * 18) - 1, y + Math.round(Math.sin(a) * 18) - 1);
    }
  }
  /** A pipe's end (owner, 11 Oct 2026: bare ends looked unfinished): a collar, a brass acorn knob and a small spike. */
  function finial(x: number, y: number, th: number, dir: 1 | -1) {
    const cx = x + dir * 2;
    rect(cx - 2, y - 2, 4, th + 4, ink); rect(cx - 1, y - 1, 2, th + 2, light); rect(cx - 1, y + th, 2, 1, dark);
    const kx = x + dir * 7, ky = y + Math.floor(th / 2);
    oval(kx, ky, 4, 4, ink); oval(kx, ky, 3, 3, brass); oval(kx - 1, ky - 1, 2, 2, light); rect(kx - 2, ky - 2, 1, 1, pale);
    rect(kx + dir * 4, ky - 1, 1, 2, ink); rect(kx + dir * 5, ky, 1, 1, ink);
    rect(kx - 1, ky + 2, 3, 1, dark);
  }
  /** The end of the steam line: a fluted brass whistle with a cap, instead of a bare stub. */
  function whistle(x: number, y: number) {
    rect(x - 4, y + 10, 9, 5, ink); rect(x - 3, y + 11, 7, 3, brass); rect(x - 3, y + 11, 7, 1, pale);
    rect(x - 2, y, 5, 11, ink); rect(x - 1, y + 1, 3, 10, brass); rect(x - 1, y + 1, 1, 10, pale); rect(x + 1, y + 1, 1, 10, dark);
    rect(x - 1, y + 4, 3, 1, ink); rect(x - 1, y + 7, 3, 1, ink);
    rect(x - 3, y - 3, 7, 4, ink); rect(x - 2, y - 2, 5, 2, light); rect(x - 2, y - 1, 5, 1, brass);
    rect(x, y - 5, 1, 3, ink); rect(x - 1, y - 6, 3, 2, ink); rect(x, y - 6, 1, 1, pale);
  }
  function steamPuff(x: number, y: number, t: number, period: number, phase: number) {
    if (still) return;
    const k = ((t + phase) % period) / period;
    if (k > 0.45) return;
    const p = k / 0.45;
    const yy = y - Math.round(p * 14), xx = x + Math.round(Math.sin(p * 5) * 2 + p * 4);
    const r = 1 + Math.round(p * 3);
    c.save(); c.globalAlpha = 0.75 * (1 - p);
    oval(xx, yy, r, r, '#e9eef0'); oval(xx - 1, yy - 1, Math.max(0, r - 1), Math.max(0, r - 1), '#ffffff');
    c.restore();
  }
  function pic(name: string, x: number, y: number, w: number, h: number) {
    const im = images[name];
    if (im?.complete && im.naturalWidth) c.drawImage(im, x, y, w, h);
  }
  function tank(v: HudView, t: number) {
    // Feet and the cradle the boiler stands on.
    rect(112, 84, 10, 9, ink); rect(150, 84, 10, 9, ink);
    rect(113, 85, 8, 7, iron); rect(151, 85, 8, 7, iron);
    rect(113, 85, 8, 1, ironL); rect(151, 85, 8, 1, ironL);
    // Shell: an iron hoop, a riveted brass band, then the glass.
    oval(136, 56, 36, 34, ink);
    oval(136, 55, 36, 34, ink);
    oval(136, 55, 35, 33, iron); oval(135, 54, 33, 31, ironL); oval(137, 56, 33, 31, '#29232a');
    oval(136, 55, 33, 31, iron);
    oval(136, 55, 31, 29, ink);
    oval(136, 55, 30, 28, light); oval(137, 56, 29, 27, dark); oval(136, 55, 29, 27, brass);
    oval(136, 55, 27, 25, ink);
    for (let k = 0; k < 16; k++) {
      const a = k * Math.PI / 8;
      rivet(136 + Math.round(Math.cos(a) * 33) - 1, 55 + Math.round(Math.sin(a) * 31) - 1);
    }
    const total = Math.max(1, v.maxHp + v.extra);
    const red = Math.max(0, Math.min(1, v.hp / total));
    const blue = Math.max(0, Math.min(1 - red, v.extra / total));
    const surface = 79 - Math.round((red + blue) * 46);
    const redSurface = 79 - Math.round(red * 46);
    const wave = still ? 0 : Math.round(Math.sin(t * 2.2));
    for (let y = 31; y <= 79; y++) {
      const n = Math.floor(25 * Math.sqrt(Math.max(0, 1 - (y - 55) ** 2 / (24 * 24))));
      const fluid = y >= redSurface ? (v.zatruty ? '#63803c' : '#bd3844') : y >= surface ? '#548cc0' : '#2a2a30';
      rect(136 - n, y, n * 2 + 1, 1, fluid);
      if (y >= surface && n > 6) {
        rect(136 - n + 2, y, 3, 1, y >= redSurface ? (v.zatruty ? '#8d9f52' : '#df6257') : '#80b4d7');
        rect(136 + n - 3, y, 3, 1, y >= redSurface ? (v.zatruty ? '#425f35' : '#8d2c3c') : '#376384');
      }
      if (y === surface && n > 1) {
        rect(136 - n + 1, y, n * 2 - 1, 1, blue ? '#add1df' : v.zatruty ? '#c1c787' : '#ed9580');
        if (wave) rect(136 - n + 4 + (wave > 0 ? 6 : 14), y - 1, 6, 1, blue ? '#add1df' : '#ed9580');
      }
    }
    // Bubbles rising through the liquid.
    if (!still && surface < 77) {
      for (let b = 0; b < 3; b++) {
        const per = 2.6 + b * 0.7, k = ((t + b * 1.3) % per) / per;
        const by = Math.round(78 - k * (78 - surface - 2));
        const bx = 128 + b * 8 + Math.round(Math.sin(t * 3 + b) * 1.5);
        rect(bx, by, 2, 2, v.zatruty ? '#a9b86a' : y2(by) ? '#f08a8a' : '#a8d0ea');
      }
    }
    function y2(by: number) { return by >= redSurface; }
    // Glass: shine, a scale with brass marks on the right.
    rect(116, 40, 2, 12, '#ffffff55'); rect(118, 36, 2, 5, '#ffffff55'); rect(119, 34, 3, 1, '#ffffff40');
    for (let k = 0; k <= 4; k++) {
      const y = 33 + k * 11;
      rect(154, y, k % 2 ? 3 : 5, 1, '#1d1619'); rect(154, y + 1, k % 2 ? 3 : 5, 1, '#ffffff30');
    }
    // Neck, safety valve with a whistle and a puff of steam now and then.
    rect(124, 17, 24, 10, ink); rect(125, 18, 22, 8, brass); rect(125, 18, 22, 1, pale); rect(125, 24, 22, 1, dark);
    for (const x of [127, 143]) rivet(x, 20);
    rect(130, 9, 12, 9, ink); rect(131, 10, 10, 8, brass); rect(131, 10, 2, 8, light); rect(139, 10, 1, 8, dark);
    rect(128, 6, 16, 4, ink); rect(129, 7, 14, 2, light); rect(129, 8, 14, 1, brass);
    rect(134, 2, 4, 5, ink); rect(135, 3, 2, 3, pale);
    steamPuff(136, 1, t, 4.2, 0);
    if (v.hp / Math.max(1, v.maxHp) < 0.34) steamPuff(140, 2, t, 1.1, 0.4);
    // A pressure gauge on the boiler's shoulder: life as pressure, red zone at the bottom.
    vpipe(107, 30, 40, 5);
    gauge(109, 22, 10, red + blue, 'low', still ? 0 : Math.sin(t * 9) * 0.04);
    supply(v);
  }
  function supply(v: HudView) {
    c.save(); c.globalAlpha = v.noHeal ? .55 : 1;
    // A small brass cage with a hinged lid, hung on the boiler.
    rect(148, 58, 25, 27, ink); rect(150, 60, 21, 23, brass); rect(150, 60, 21, 1, pale);
    rect(150, 60, 1, 23, light); rect(170, 60, 1, 23, dark);
    rect(152, 63, 17, 18, '#2f2427');
    rect(155, 54, 11, 5, ink); rect(156, 55, 9, 3, light); rect(156, 57, 9, 1, dark);
    if (v.preparedFood && v.potions <= 0 && v.fruit < v.fruitPerHeal) {
      c.font = '15px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(v.preparedFood.icon, 160.5, 72);
    } else pic(v.potions > 0 ? 'potion' : 'apple', 151, 62, 19, 19);
    for (const x of [149, 169]) { rect(x, 59, 2, 2, pale); rect(x, 81, 2, 2, pale); }
    c.restore();
  }
  function expTube(v: HudView, t: number) {
    // A horizontal glass tube between two hex caps, a gauge on top showing the same share.
    vpipe(21, 38, 50, 6);
    vflange(21, 44, 6);
    gauge(24, 28, 11, v.expShare, null, still ? 0 : Math.sin(t * 7 + 1) * 0.03);
    rect(1, 48, 48, 24, ink);
    rect(2, 49, 7, 22, brass); rect(41, 49, 7, 22, brass);
    rect(2, 49, 7, 1, pale); rect(41, 49, 7, 1, pale); rect(2, 49, 1, 22, light); rect(41, 49, 1, 22, light);
    rect(8, 49, 1, 22, dark); rect(47, 49, 1, 22, dark);
    rivet(4, 52); rivet(4, 65); rivet(43, 52); rivet(43, 65);
    rect(9, 51, 32, 18, ink); rect(10, 52, 30, 16, '#2b2427');
    const xp = Math.round(30 * Math.max(0, Math.min(1, v.expShare)));
    rect(10, 53, xp, 14, '#c39c46'); rect(10, 53, xp, 2, '#ecd085'); rect(10, 65, xp, 2, '#8d622d');
    if (!still && xp > 4) {
      const k = (t % 1.8) / 1.8;
      rect(10 + Math.round(k * (xp - 2)), 58 + Math.round(Math.sin(t * 6) * 2), 2, 2, '#f6e3a4');
    }
    for (let k = 1; k < 5; k++) rect(10 + k * 6, 61, 1, 6, ink);
    rect(10, 52, 30, 1, '#ffffff40'); rect(12, 54, 8, 1, '#ffffff60');
  }
  function draw(v: HudView) {
    last = v;
    if (document.hidden) return;
    const t = performance.now() / 1000;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, width, HEIGHT); c.imageSmoothingEnabled = false;
    // Lower copper return pipe along the whole machine, with elbows up into each socket.
    hpipe(12, 254, 85, 6, 'copper');
    finial(12, 85, 6, -1); finial(254, 85, 6, 1);
    // Elbows up into the EXP tube (its bottom at 72) and the three portholes (bottom rim ~80).
    vpipe(18, 70, 88, 6, 'copper');
    for (const x of [73, 194, 239]) vpipe(x, 76, 88, 6, 'copper');
    wheel(98, 88, 5, still ? 0 : t * 0.6);
    // Cogs turning slowly behind the sockets.
    cog(96, 40, 11, 9, t * 0.18, 1, 'iron');
    cog(57, 82, 9, 8, t * 0.24, -1);
    cog(219, 40, 10, 9, t * 0.2, -1, 'iron');
    // The main brass steam line through every socket.
    hpipe(44, 260, 56, 8);
    for (const x of [48, 100, 170, 216]) flange(x, 56, 8);
    expTube(v, t);
    porthole(76, 60);
    porthole(197, 60);
    tank(v, t);
    // Keep the accepted camera illustration inside its porthole.
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    pic('camera', 179, 42, 36, 36); c.imageSmoothingEnabled = false;
    vehicles.forEach(b => {
      c.save(); c.globalAlpha = b.disabled ? .45 : 1;
      porthole(242, 60, b.getAttribute('aria-pressed') === 'true');
      c.restore();
    });
    // A steam whistle at the end of the line.
    rect(259, 55, 7, 10, ink); rect(260, 56, 5, 8, brass); rect(260, 56, 5, 1, pale); rect(260, 63, 5, 1, dark);
    whistle(262, 41);
    steamPuff(262, 33, t, 5.5, 2);
  }
  function paintAvatar() {
    const cv = p.avPic;
    if (cv.width !== 42) cv.width = cv.height = 42;
    const g = cv.getContext('2d')!; g.clearRect(0, 0, 42, 42);
    g.imageSmoothingEnabled = false;
    if (fallback) g.drawImage(fallback.src, fallback.sx, fallback.sy, fallback.sw, fallback.sh, 5, 5, 32, 32);
    // Observed by the browser check; the source is the actual standing hero sprite.
    cv.dataset.source = fallback ? 'sprite' : 'empty';
  }
  return {
    layout, draw,
    avatar(a: Portrait) { fallback = a; paintAvatar(); },
    destroy() {
      alive = false;
      Object.values(images).forEach(im => { im.onload = null; });
      removers.forEach(f => f()); canvas.remove();
    },
  };
}
