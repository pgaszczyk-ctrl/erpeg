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

/** Compact TEST HUD: EXP → portrait → clickable life tank → camera → owned vehicles. */
export function createReservoirHud(p: Parts) {
  p.m.classList.add('hud-reservoir');
  p.m.querySelector('canvas')!.style.display = 'none';
  p.hp.style.display = p.wpn.style.display = 'none';
  p.m.querySelector<HTMLButtonElement>('.hud-b2')!.style.display = 'none';
  const av = p.m.querySelector<HTMLButtonElement>('.hud-av')!;
  const camera = p.m.querySelector<HTMLButtonElement>('.hud-b1')!;
  const canvas = document.createElement('canvas');
  canvas.className = 'hud-reservoir-art';
  canvas.style.cssText = 'pointer-events:none;image-rendering:auto';
  p.m.prepend(canvas);
  const c = canvas.getContext('2d')!;
  const images: Record<string, HTMLImageElement> = {};
  let last: HudView | null = null, alive = true;
  let fallback: Portrait = null, portrait: HTMLImageElement | null = null;
  let pendingPortrait: HTMLImageElement | null = null, heroId = '';
  let s = 1, dpr = 1, width = 220;
  let vehicles: HTMLButtonElement[] = [];

  const load = (name: string, url: string) => {
    const im = new Image(); images[name] = im;
    im.onload = () => { if (alive && last) draw(last); };
    im.src = url;
  };
  load('tank', BASE + 'baniak.webp');
  load('camera', BASE + 'aparat.webp');
  load('apple', `${import.meta.env.BASE_URL || '/'}hud/v5/jablko.png`);
  load('potion', `${import.meta.env.BASE_URL || '/'}hud/v5/mikstura.png`);
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
    s = window.innerWidth >= 900 && !window.matchMedia('(pointer: coarse)').matches ? 1.1 : 1;
    vehicles = [p.vehicles.rower, p.vehicles.hulajnoga].filter(b => !b.hidden);
    width = 220 + vehicles.length * 45;
    const right = Math.max(4, Math.min(12, (window.innerWidth - width * s) / 2));
    Object.assign(p.m.style, {
      left: 'auto', right: `${right}px`, bottom: 'calc(8px + env(safe-area-inset-bottom))',
      width: `${width * s}px`, height: `${HEIGHT * s}px`, transform: '',
    });
    const w = Math.round(width * s * dpr), h = Math.round(HEIGHT * s * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    at(p.xp, 2, 38, 44, 44);
    at(av, 54, 38, 44, 44);
    at(p.avPic, 55, 39, 42, 42);
    // Life is the biggest button, and the overlapping healing bottle belongs to it.
    at(p.heal, 98, 0, 77, 94);
    p.heal.style.borderRadius = '35%';
    at(camera, 175, 38, 44, 44);
    vehicles.forEach((b, i) => {
      at(b, 220 + i * 45, 38, 44, 44);
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
  const metal = () => {
    const g = c.createLinearGradient(0, 49, 0, 73);
    g.addColorStop(0, '#ffe09a'); g.addColorStop(.25, '#c38a3d');
    g.addColorStop(.6, '#67401e'); g.addColorStop(1, '#daa551'); return g;
  };
  function rounded(x: number, y: number, w: number, h: number, r: number) {
    c.beginPath(); c.roundRect(x, y, w, h, r);
  }
  function pipe(x: number, end: number) {
    c.fillStyle = '#251919'; c.fillRect(x, 58, end - x, 5);
    c.fillStyle = '#b78643'; c.fillRect(x, 59, end - x, 3);
    c.fillStyle = '#f5d088'; c.fillRect(x, 59, end - x, 1);
  }
  function frame(x: number, active = false) {
    c.beginPath(); c.arc(x, 60, 21, 0, Math.PI * 2);
    c.fillStyle = 'rgba(37,25,24,.72)'; c.fill();
    c.strokeStyle = active ? '#fff0a6' : metal(); c.lineWidth = active ? 2.5 : 1.5; c.stroke();
  }
  function tank(v: HudView) {
    // Artwork is an empty glass shell; the actual life and bonus fluid remain independent.
    c.save();
    c.beginPath(); c.ellipse(136, 55, 31, 28, 0, 0, Math.PI * 2); c.clip();
    c.fillStyle = '#271c27'; c.fillRect(103, 27, 66, 58);
    const total = Math.max(1, v.maxHp + v.extra);
    const red = Math.max(0, Math.min(1, v.hp / total));
    const blue = Math.max(0, Math.min(1 - red, v.extra / total));
    // The shell's transparent window occupies y=35..69 at this display size.
    // Measure fluid inside that window, rather than counting the opaque neck/base.
    const top = 69 - (red + blue) * 34;
    const g = c.createLinearGradient(104, 0, 168, 0);
    g.addColorStop(0, v.zatruty ? '#879e38' : '#ff8176');
    g.addColorStop(.25, v.zatruty ? '#99b43e' : '#f63b46');
    g.addColorStop(1, v.zatruty ? '#3c571b' : '#9b162d');
    c.fillStyle = g; c.fillRect(103, 69 - red * 34, 66, red * 34);
    if (blue) { c.fillStyle = '#579ee7'; c.fillRect(103, top, 66, blue * 34); }
    if (red + blue > 0) {
      c.strokeStyle = blue ? '#bde7ff' : v.zatruty ? '#d0e588' : '#ffc3b5';
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(105, top + 1); c.quadraticCurveTo(135, top - 1, 166, top + 1); c.stroke();
    }
    c.restore();
    pic('tank', 100, 0, 72, 90);
    // Small overlapping bottle: the selected healing supply, not another action.
    c.save(); c.globalAlpha = v.noHeal ? .55 : 1;
    rounded(148, 59, 25, 25, 7); c.fillStyle = '#342725'; c.fill();
    c.strokeStyle = metal(); c.lineWidth = 2; c.stroke();
    rounded(155, 55, 11, 6, 2); c.fillStyle = metal(); c.fill();
    if (v.preparedFood && v.potions <= 0 && v.fruit < v.fruitPerHeal) {
      c.font = '17px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(v.preparedFood.icon, 160.5, 72);
    } else pic(v.potions > 0 ? 'potion' : 'apple', 151, 62, 19, 19);
    c.restore();
  }
  function draw(v: HudView) {
    last = v;
    if (document.hidden) return;
    c.setTransform(canvas.width / width, 0, 0, canvas.height / HEIGHT, 0, 0);
    c.clearRect(0, 0, width, HEIGHT); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    pipe(44, 108); pipe(165, width - 20);
    // The one horizontal amber experience reservoir.
    rounded(0, 49, 49, 22, 7); c.fillStyle = '#21181b'; c.fill();
    c.strokeStyle = metal(); c.lineWidth = 2; c.stroke();
    c.save(); rounded(7, 53, 35, 14, 4); c.clip();
    c.fillStyle = '#281c22'; c.fillRect(7, 53, 35, 14);
    const xp = c.createLinearGradient(0, 53, 0, 67);
    xp.addColorStop(0, '#ffefad'); xp.addColorStop(.4, '#eeb940'); xp.addColorStop(1, '#975810');
    c.fillStyle = xp; c.fillRect(7, 53, 35 * Math.max(0, Math.min(1, v.expShare)), 14);
    c.fillStyle = '#ffe5af88'; c.fillRect(7, 54, 35, 1);
    c.fillStyle = '#25181a'; for (let k = 1; k < 5; k++) c.fillRect(7 + k * 7, 60, 1, 6);
    c.restore();
    c.fillStyle = metal(); c.fillRect(2, 52, 4, 16); c.fillRect(43, 52, 4, 16);
    frame(76); frame(197);
    tank(v); pic('camera', 177, 40, 40, 40);
    vehicles.forEach((b, i) => frame(242 + i * 45, b.getAttribute('aria-pressed') === 'true'));
  }
  function paintAvatar() {
    const cv = p.avPic, n = Math.max(1, Math.round(42 * s * dpr));
    if (cv.width !== n) cv.width = cv.height = n;
    const g = cv.getContext('2d')!; g.clearRect(0, 0, n, n);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    if (portrait) g.drawImage(portrait, 0, 0, n, n);
    else if (fallback) g.drawImage(fallback.src, fallback.sx, fallback.sy, fallback.sw, fallback.sh, 0, 0, n, n);
  }
  function hero(id: string) {
    if (id === heroId) return;
    heroId = id; portrait = null;
    if (pendingPortrait) pendingPortrait.onload = pendingPortrait.onerror = null;
    const letter = /^lista([a-y])$/.exec(id)?.[1];
    if (!letter) { paintAvatar(); return; }
    const index = letter.charCodeAt(0) - 96;
    const im = new Image(); pendingPortrait = im;
    im.onload = () => {
      if (!alive || id !== heroId) return;
      portrait = im; p.avPic.dataset.portrait = String(index); paintAvatar();
    };
    im.onerror = () => { if (alive && id === heroId) paintAvatar(); };
    im.src = BASE + `portrety/postac_${String(index).padStart(2, '0')}.webp`;
  }
  return {
    layout, draw, hero,
    avatar(a: Portrait) { fallback = a; paintAvatar(); },
    destroy() {
      alive = false; if (pendingPortrait) pendingPortrait.onload = pendingPortrait.onerror = null;
      Object.values(images).forEach(im => { im.onload = null; });
      removers.forEach(f => f()); canvas.remove();
    },
  };
}
