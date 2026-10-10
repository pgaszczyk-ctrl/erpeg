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
    s = window.innerWidth >= 900 && !window.matchMedia('(pointer: coarse)').matches ? 1.5 : 1;
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
  function pic(name: string, x: number, y: number, w: number, h: number) {
    const im = images[name];
    if (im?.complete && im.naturalWidth) c.drawImage(im, x, y, w, h);
  }
  // Integer rows/edges, a restrained brass palette and no antialiased outline.
  const ink = '#211a22', dark = '#644226', brass = '#b28443', light = '#e0bc78';
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
  function pipe(x: number, end: number) {
    const im = images.pipes;
    if (im?.complete && im.naturalWidth) {
      for (let at = x; at < end; at += 8) {
        const n = Math.min(8, end - at);
        c.drawImage(im, 146, 54, n, 7, at, 57, n, 7);
      }
    } else {
      rect(x, 58, end - x, 5, ink); rect(x, 59, end - x, 3, brass);
      rect(x, 59, end - x, 1, light);
    }
  }
  function frame(x: number, active = false) {
    // Low-profile gear sockets, fitted to the icon instead of a large machine behind it.
    for (const [dx, dy] of [[-5,-23],[-5,17],[-23,-5],[17,-5],[-18,-18],[10,-18],[-18,10],[10,10]]) {
      rect(x + dx, 60 + dy, 8, 8, ink);
      rect(x + dx + 1, 61 + dy, 6, 6, dark);
      rect(x + dx + 1, 61 + dy, 5, 2, brass);
    }
    oval(x, 60, 21, 21, ink);
    oval(x, 59, 19, 19, active ? '#f5d38a' : light);
    oval(x, 61, 18, 18, dark);
    oval(x, 60, 16, 16, '#382d2a');
    for (const [dx, dy] of [[-14,-12],[12,-12],[-14,12],[12,12]]) {
      rect(x + dx, 60 + dy, 2, 2, light);
    }
  }
  function tank(v: HudView) {
    // Empty boiler shell and real fluid are drawn together; no photographic asset or blur.
    rect(116, 84, 8, 8, ink); rect(148, 84, 8, 8, ink);
    rect(118, 85, 4, 5, dark); rect(150, 85, 4, 5, dark);
    oval(136, 55, 35, 33, ink);
    oval(136, 54, 33, 31, light);
    oval(137, 56, 32, 30, dark);
    oval(136, 55, 30, 28, brass);
    oval(136, 55, 28, 26, ink);
    const total = Math.max(1, v.maxHp + v.extra);
    const red = Math.max(0, Math.min(1, v.hp / total));
    const blue = Math.max(0, Math.min(1 - red, v.extra / total));
    const surface = 79 - Math.round((red + blue) * 48);
    const redSurface = 79 - Math.round(red * 48);
    for (let y = 31; y <= 79; y++) {
      const n = Math.floor(26 * Math.sqrt(Math.max(0, 1 - (y - 55) ** 2 / (24 * 24))));
      const fluid = y >= redSurface ? (v.zatruty ? '#63803c' : '#bd3844') : y >= surface ? '#548cc0' : '#303034';
      rect(136 - n, y, n * 2 + 1, 1, fluid);
      if (y >= surface && n > 6) {
        rect(136 - n + 2, y, 3, 1, y >= redSurface ? (v.zatruty ? '#8d9f52' : '#df6257') : '#80b4d7');
        rect(136 + n - 3, y, 3, 1, y >= redSurface ? (v.zatruty ? '#425f35' : '#8d2c3c') : '#376384');
      }
      if (y === surface && n > 1) rect(136 - n + 1, y, n * 2 - 1, 1, blue ? '#add1df' : v.zatruty ? '#c1c787' : '#ed9580');
    }
    // Quiet glass shine, gauge ticks, rivets, neck and cap.
    rect(115, 43, 2, 10, '#bdd0c580'); rect(117, 38, 2, 5, '#bdd0c580');
    for (let y = 42; y < 75; y += 8) rect(155, y, 4, 1, '#271d28');
    for (const [x,y] of [[108,45],[110,71],[161,42],[161,69]]) {
      rect(x, y, 3, 3, ink); rect(x, y, 2, 2, light);
    }
    rect(123, 15, 26, 14, ink); rect(125, 16, 22, 11, dark);
    rect(125, 16, 22, 2, light); rect(128, 18, 16, 7, brass);
    rect(130, 8, 12, 9, ink); rect(132, 9, 8, 7, brass);
    rect(128, 5, 16, 4, ink); rect(129, 6, 14, 2, light);
    rect(128, 20, 2, 3, light); rect(141, 20, 2, 3, light);
    supply(v);
  }
  function supply(v: HudView) {
    c.save(); c.globalAlpha = v.noHeal ? .55 : 1;
    rect(148, 59, 25, 26, ink); rect(150, 60, 21, 24, brass);
    rect(151, 62, 19, 21, '#362929'); rect(150, 60, 21, 1, light);
    rect(155, 55, 11, 5, ink); rect(156, 56, 9, 3, light);
    if (v.preparedFood && v.potions <= 0 && v.fruit < v.fruitPerHeal) {
      c.font = '17px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(v.preparedFood.icon, 160.5, 72);
    } else pic(v.potions > 0 ? 'potion' : 'apple', 151, 62, 19, 19);
    c.restore();
  }
  function draw(v: HudView) {
    last = v;
    if (document.hidden) return;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, width, HEIGHT); c.imageSmoothingEnabled = false;
    pipe(44, 108); pipe(165, width - 20);
    // One horizontal experience reservoir, brass caps and a marked glass window.
    rect(1, 49, 48, 22, ink); rect(3, 50, 44, 20, brass);
    rect(3, 50, 44, 1, light); rect(7, 52, 36, 16, ink);
    rect(8, 53, 34, 14, '#322829');
    const xp = Math.round(34 * Math.max(0, Math.min(1, v.expShare)));
    rect(8, 54, xp, 12, '#c39c46'); rect(8, 54, xp, 2, '#e4c774');
    rect(8, 64, xp, 2, '#8d622d');
    for (let k = 1; k < 5; k++) rect(7 + k * 7, 60, 1, 6, ink);
    rect(4, 52, 2, 16, light); rect(44, 52, 2, 16, dark);
    frame(76); frame(197);
    tank(v);
    // Preserve the accepted camera illustration inside a small socket.
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    pic('camera', 177, 40, 40, 40); c.imageSmoothingEnabled = false;
    vehicles.forEach(b => {
      c.save(); c.globalAlpha = b.disabled ? .35 : 1;
      frame(242, b.getAttribute('aria-pressed') === 'true');
      c.restore();
    });
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
