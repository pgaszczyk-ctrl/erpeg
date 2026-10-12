import { api } from './api';

// Rides take time: a coach or a train goes PODROZ_KMH along a straight line
// (so hopping station to station is never faster than riding straight). The
// ride runs by the server's clock, also with the game closed; meanwhile the
// screen shows a bar with the cart moving from one sign to the other. The
// arrival station is the load point at once (a bench on the platform, no
// healing), so logging out on the way neither loses the trip nor takes the
// hero home for free. Test characters (immortal) ride at once.

/** Speed of every ride, km/h. */
export const PODROZ_KMH = 80;

export interface Journey {
  /** Where from and where to (names for the signs). */
  from: string;
  to: string;
  km: number;
  /** Server time (ms) of departure and arrival. */
  start: number;
  end: number;
  /** A train (long distance) or a coach. */
  train?: boolean;
  /** A ferry (content/porty.ts): the sea picture and port words. */
  statek?: boolean;
}

/** `times`: a diamond ride goes this many times faster. */
export function rideMs(km: number, times = 1, kmh = PODROZ_KMH) {
  return Math.round((km / kmh / times) * 3_600_000);
}

/** Server time minus the phone's (so the phone clock can't shorten a ride). */
let offset = 0;
export async function syncClock() {
  try {
    const t0 = Date.now();
    const server = new Date(await api.now()).getTime();
    offset = server - (t0 + Date.now()) / 2;
  } catch {
    // Offline: the phone's clock.
  }
}
export const serverNow = () => Date.now() + offset;

function fmtLeft(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const d = Math.floor(h / 24);
  if (d) return `${d} ${d === 1 ? 'dzień' : 'dni'} ${h % 24} godz.`;
  return h ? `${h} godz. ${m} min` : m ? `${m} min ${String(sec).padStart(2, '0')} s` : `${sec} s`;
}

/** Arrival time; another day gets its date („ok. 7:40, 14.10”). */
function fmtArrival(t: number) {
  const d = new Date(t - offset);
  const today = new Date(Date.now()).toDateString() === d.toDateString();
  return `ok. ${fmtClock(t)}${today ? '' : `, ${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`}`;
}

function fmtClock(t: number) {
  const d = new Date(t - offset);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Ride time for the coachman's list, e.g. "ok. 19 min". */
export function rideText(km: number, times = 1, kmh = PODROZ_KMH) {
  const ms = rideMs(km, times, kmh);
  const min = Math.round(ms / 60_000);
  if (min >= 48 * 60) return `ok. ${Math.round(min / 60 / 24)} dni`;
  return min >= 60 ? `ok. ${Math.floor(min / 60)} godz. ${min % 60 ? `${min % 60} min` : ''}`.trim() : `ok. ${Math.max(1, min)} min`;
}

/** The ride screen until arrival; resolves when the cart gets there. */
export function showJourney(j: Journey): Promise<void> {
  document.getElementById('journey')?.remove();
  const box = document.createElement('div');
  box.id = 'journey';
  box.style.cssText = 'position:fixed;inset:0;z-index:70;background:#141a14;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:16px;font-family:monospace;color:#fff;text-align:center;';
  const icon = j.statek ? '⛴' : j.train ? '🚂' : '🐴';
  box.innerHTML = `
    <div style="font-size:20px;color:#f7c531">${icon} ${j.statek ? 'Na morzu' : 'W drodze'}</div>
    <div style="width:min(94vw,640px)">
      <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:6px"><span class="j-a"></span><span class="j-b"></span></div>
      <canvas class="j-road" width="${ROAD_W}" height="${ROAD_H}" style="width:100%;image-rendering:pixelated;display:block"></canvas>
    </div>
    <div class="j-left" style="font-size:16px"></div>
    <div class="j-eta" style="font-size:14px;color:#bbb"></div>
    <div style="font-size:12px;color:#888;max-width:420px">${j.statek
      ? 'Możesz zamknąć grę albo zagrać inną postacią – rejs trwa dalej. Gdy wrócisz po przypłynięciu, będziesz już w porcie.'
      : 'Możesz zamknąć grę – podróż trwa dalej. Gdy wrócisz po przyjeździe, będziesz już na peronie.'}</div>`;
  box.querySelector('.j-a')!.textContent = j.from;
  box.querySelector('.j-b')!.textContent = j.to;
  box.querySelector('.j-eta')!.textContent = `${j.km.toFixed(0)} km · ${j.statek ? 'w porcie' : 'przyjazd'} ${fmtArrival(j.end)}`;
  document.body.append(box);
  return new Promise((done) => {
    const tick = () => {
      if (!box.isConnected) return done();
      const now = serverNow();
      const f = Math.min(1, Math.max(0, (now - j.start) / Math.max(1, j.end - j.start)));
      if (j.statek) drawSea(box.querySelector('canvas')!, f, now);
      else drawRoad(box.querySelector('canvas')!, f, !!j.train, now);
      box.querySelector('.j-left')!.textContent = now >= j.end ? (j.statek ? 'Wpływamy do portu…' : 'Dojeżdżamy…') : `Zostało ${fmtLeft(j.end - now)}`;
      if (now >= j.end) {
        setTimeout(() => {
          box.remove();
          done();
        }, 600);
        return;
      }
      setTimeout(tick, 250);
    };
    tick();
  });
}

// ---------------------------------------------------------------- the road picture

/** The picture of the way, in game pixels (shown enlarged, crisp). */
const ROAD_W = 180;
const ROAD_H = 40;
/** Where the road runs (y of its top and bottom edge). */
const ROAD_Y0 = 27;
const ROAD_Y1 = 34;

type Img = CanvasImageSource & { width: number; height: number };

/** A picture the game has drawn (art.ts textures), if the game is there. */
function gameImage(key: string): Img | null {
  const g = (window as unknown as { __game?: { textures: { exists(k: string): boolean; get(k: string): { getSourceImage(): Img } } } }).__game;
  return g?.textures.exists(key) ? g.textures.get(key).getSourceImage() : null;
}

/**
 * An earthen road (rails for a train) from one signpost to the other; the
 * cart stands where it is on the way: just set off – a few pixels from the
 * first sign; half way – in the middle.
 */
function drawRoad(c: HTMLCanvasElement, f: number, train: boolean, now: number) {
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  // Grass, then the road across.
  ctx.fillStyle = '#4f8f3a';
  ctx.fillRect(0, 0, ROAD_W, ROAD_H);
  ctx.fillStyle = '#3f7a2e';
  for (let x = 3; x < ROAD_W; x += 7) ctx.fillRect(x, (x * 7) % 11 + 4, 1, 1), ctx.fillRect((x * 5) % ROAD_W, ROAD_H - 3 - ((x * 3) % 4), 1, 1);
  if (train) {
    ctx.fillStyle = '#8a7f73';
    ctx.fillRect(0, ROAD_Y0 + 1, ROAD_W, ROAD_Y1 - ROAD_Y0 - 1);
    ctx.fillStyle = '#5a3a22';
    for (let x = 1; x < ROAD_W; x += 4) ctx.fillRect(x, ROAD_Y0 + 1, 2, ROAD_Y1 - ROAD_Y0 - 1);
    ctx.fillStyle = '#d0d0d8';
    ctx.fillRect(0, ROAD_Y0 + 2, ROAD_W, 1);
    ctx.fillRect(0, ROAD_Y1 - 2, ROAD_W, 1);
  } else {
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(0, ROAD_Y0, ROAD_W, ROAD_Y1 - ROAD_Y0 + 1);
    ctx.fillStyle = '#b8864f';
    ctx.fillRect(0, ROAD_Y0 + 1, ROAD_W, ROAD_Y1 - ROAD_Y0 - 1);
    ctx.fillStyle = '#9a6d3c';
    ctx.fillRect(0, ROAD_Y0 + 2, ROAD_W, 1);
    ctx.fillRect(0, ROAD_Y1 - 2, ROAD_W, 1);
    for (let x = 5; x < ROAD_W; x += 9) ctx.fillRect(x, ROAD_Y0 + 3 + (x % 2), 1, 1);
  }
  // A signpost at each end.
  const sign = gameImage('signpost');
  const sw = sign?.width ?? 16;
  const sh = sign?.height ?? 20;
  for (const x of [1, ROAD_W - sw - 1]) {
    if (sign) ctx.drawImage(sign, x, ROAD_Y0 - sh + 2);
    else {
      ctx.fillStyle = '#6b4a2a';
      ctx.fillRect(x + 7, ROAD_Y0 - 14, 2, 16);
      ctx.fillStyle = '#e8d9b0';
      ctx.fillRect(x + 1, ROAD_Y0 - 16, 14, 6);
    }
  }
  // The cart (facing right, the way it goes) where it is now, bobbing a little.
  const x0 = sw + 2;
  const x1 = ROAD_W - sw - 2;
  const cart = train ? null : gameImage('coach');
  const cw = cart?.width ?? 26;
  const ch = cart?.height ?? 14;
  const x = Math.round(x0 + (x1 - x0 - cw) * f);
  const bob = f < 1 ? Math.round(Math.sin(now / 160)) : 0;
  const y = ROAD_Y1 - ch + 1 + (train ? 0 : bob);
  if (cart) {
    ctx.save();
    ctx.translate(x + cw, y);
    ctx.scale(-1, 1);
    ctx.drawImage(cart, 0, 0);
    ctx.restore();
  } else drawLoco(ctx, x, y + ch - 14);
}

/**
 * The sea: a pier with a lighthouse at each end and the ferry (facing right) where it is now,
 * rocking on the waves, a puff of steam from its funnel.
 */
function drawSea(c: HTMLCanvasElement, f: number, now: number) {
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const p = (x: number, y: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };
  // Sky and water.
  p(0, 0, ROAD_W, 18, '#9fc6e6');
  p(0, 18, ROAD_W, ROAD_H - 18, '#2e6aa8');
  p(0, 18, ROAD_W, 1, '#c8e2f5');
  // Waves drifting left (the ship goes right).
  const shift = Math.floor(now / 220);
  for (let y = 21; y < ROAD_H; y += 4) {
    for (let x = (y * 7 + shift) % 11; x < ROAD_W; x += 11) p(ROAD_W - x, y + ((x >> 2) & 1), 3, 1, y % 8 ? '#5b93cf' : '#22558c');
  }
  // A pier with a lighthouse at both ends.
  for (const x of [0, ROAD_W - 14]) {
    p(x, 24, 14, 3, '#6b4a2a');
    for (let k = 1; k < 14; k += 4) p(x + k, 27, 1, 6, '#4a3020');
    const lx = x === 0 ? 2 : ROAD_W - 6;
    p(lx, 9, 4, 15, '#e8e0d0');
    p(lx, 12, 4, 2, '#c03030');
    p(lx, 18, 4, 2, '#c03030');
    p(lx - 1, 7, 6, 2, '#1e1a24');
    p(lx + 1, 5, 2, 2, (Math.floor(now / 600) & 1) ? '#ffe680' : '#b89a40');
  }
  // The ferry.
  const x0 = 16;
  const x1 = ROAD_W - 16 - 30;
  const x = Math.round(x0 + (x1 - x0) * f);
  const rock = f < 1 ? Math.round(Math.sin(now / 420)) : 0;
  const y = 14 + rock;
  p(x, y + 10, 30, 1, '#1e1a24');
  p(x + 1, y + 11, 28, 4, '#1e1a24');
  p(x + 2, y + 11, 26, 2, '#7a2a2a');
  p(x + 2, y + 13, 25, 1, '#2b2b33');
  p(x + 27, y + 9, 3, 2, '#1e1a24');
  p(x + 5, y + 5, 19, 5, '#1e1a24');
  p(x + 6, y + 6, 17, 4, '#efe9dc');
  for (let k = 8; k < 22; k += 3) p(x + k, y + 7, 1, 1, '#3f6fa8');
  p(x + 12, y, 4, 5, '#1e1a24');
  p(x + 13, y + 1, 2, 3, '#c8902a');
  // Steam puffs behind the funnel.
  if (f < 1) {
    const t = (now / 900) % 1;
    for (let k = 0; k < 3; k++) {
      const u = (t + k / 3) % 1;
      const r = 1 + Math.round(u * 2);
      p(x + 12 - u * 12, y - 2 - u * 7, r, r, `rgba(240,240,245,${(1 - u).toFixed(2)})`);
    }
  }
}

/** A small steam engine (facing right). */
function drawLoco(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const p = (px: number, py: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + px, y + py, w, h);
  };
  p(0, 3, 12, 8, '#1e1a24');
  p(1, 4, 10, 6, '#3f7fd8');
  p(12, 5, 13, 6, '#1e1a24');
  p(13, 6, 11, 4, '#2b2b33');
  p(20, 1, 3, 5, '#1e1a24');
  p(2, 5, 4, 3, '#f7e08a');
  for (const wx of [2, 8, 15, 21]) {
    p(wx, 10, 4, 4, '#1e1a24');
    p(wx + 1, 11, 2, 2, '#8a8a99');
  }
}

export const journeyOpen = () => !!document.getElementById('journey');

// For automated browser checks (scripts/tests/browser-porty.mjs).
(window as unknown as { __showJourney: typeof showJourney }).__showJourney = showJourney;
