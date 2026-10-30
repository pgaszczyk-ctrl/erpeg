import { punktNaMapieWczytywania } from '../content/mapaWczytywania';
import { tx } from '../i18n';
import { resetTouch, resetKeys } from '../controls';

// Ekran pozostaje nad grą aż do narysowania pierwszego widoku. Oglądanie
// animacji i przygotowanie terenu biegną równolegle.
let fade: Promise<void> = Promise.resolve();
let flight: Animation | null = null;
let point: { x: number; y: number } | null = null;
let finished = false;
let menu: HTMLElement | null = null;
let video: HTMLVideoElement | null = null;
let poster: HTMLImageElement | null = null;
let resize: (() => void) | null = null;
let overviewOffset = 0.08;
const EUROPE = { x: 655 / 1280, y: 211 / 720 };

const root = () => document.getElementById('loading-map');
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const asset = (file: string) => new URL(`loading36/${file}`, document.baseURI).href;

export function loadingMapVisible() {
  const r = root();
  return !!r && !r.hidden;
}

/** GameScene can prepare/draw the map, but cannot move or hurt the player yet. */
export function loadingGame() {
  const r = root();
  return !!r && !r.hidden && r.dataset.phase !== 'menu' && r.dataset.phase !== 'boot';
}

function stopMedia() {
  if (resize) window.removeEventListener('resize', resize);
  resize = null;
  flight?.cancel();
  flight = null;
  drift?.anim.cancel();
  drift = null;
  video?.pause();
  if (video) { video.removeAttribute('src'); video.load(); video.remove(); }
  video = null;
  poster?.remove();
  poster = null;
}

export function showLoginMap() {
  const r = root();
  if (!r) return;
  stopMedia();
  r.getAnimations().forEach((animation) => animation.cancel());
  menu?.remove();
  menu = null;
  point = null;
  finished = false;
  fade = Promise.resolve();
  r.hidden = false;
  r.setAttribute('aria-busy', 'true');
  r.style.opacity = '';
  r.dataset.phase = 'menu';
  r.querySelector('.lm-error')?.remove();
  const plate = r.querySelector<HTMLElement>('.lm-plate')!;
  plate.style.transform = initialFrame(r);
  plate.style.opacity = '';
  resize = () => {
    if (flight) (flight.effect as KeyframeEffect).setKeyframes(flightFrames(r));
    else plate.style.transform = point ? frame(r, point, finalScale(r), true) : initialFrame(r);
  };
  window.addEventListener('resize', resize);
  preparePoster(r);
}

function preparePoster(r: HTMLElement) {
  if (poster || !loadingMapVisible()) return;
  poster = new Image();
  poster.alt = '';
  poster.src = asset('map-poster.webp');
  r.querySelector('.lm-plate')!.append(poster);
}

function startMedia(r: HTMLElement) {
  const plate = r.querySelector<HTMLElement>('.lm-plate')!;
  // Decode the still map while the player fills in the form. It also covers
  // the first video frame on slow connections and stays steady during zoom.
  preparePoster(r);
  if (reduced()) return;
  video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('aria-hidden', 'true');
  video.addEventListener('error', () => preparePoster(r), { once: true });
  video.src = asset('map-animation.mp4');
  plate.append(video);
  void video.play().catch(() => preparePoster(r));
}

/** Called after successful login/creation, before the real map is loaded. */
export function beginMapIntro(login: HTMLElement) {
  const r = root();
  if (!r) { login.remove(); return; }
  finished = false;
  menu = login;
  login.inert = true;
  (document.activeElement as HTMLElement | null)?.blur();
  resetTouch();
  resetKeys();
  r.dataset.phase = 'fading';
  startMedia(r);
  const ms = reduced() ? 150 : 650;
  r.querySelector<HTMLElement>('.lm-plate')!.style.opacity = '1';
  fade = login.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: 'linear', fill: 'forwards' }).finished
    .catch(() => {})
    .then(() => { login.remove(); if (menu === login) menu = null; });
}

const portrait = (r: HTMLElement) => r.clientHeight > r.clientWidth;
// Fill the viewport proportionally: contain left abrupt blurred side strips on wide screens.
const initialScale = (r: HTMLElement) => portrait(r)
  ? Math.max(r.clientWidth / 1280, r.clientHeight / 720) * 1.8
  : Math.max(r.clientWidth / 1280, r.clientHeight / 720);
const finalScale = (r: HTMLElement) => initialScale(r) * (portrait(r) ? 3.2 : 14);

/** Place a point on the actual image at the viewport's centre. */
function frame(r: HTMLElement, p: { x: number; y: number }, scale: number, crop = false) {
  let x = (0.5 - p.x) * 1280 * scale, y = (0.5 - p.y) * 720 * scale;
  if (crop) {
    // Keep every viewport covered during the flight, including destinations near an image edge.
    const mx = Math.max(0, (1280 * scale - r.clientWidth) / 2);
    const my = Math.max(0, (720 * scale - r.clientHeight) / 2);
    x = Math.max(-mx, Math.min(mx, x)); y = Math.max(-my, Math.min(my, y));
  }
  return `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
}
function initialFrame(r: HTMLElement) {
  return frame(r, portrait(r) ? EUROPE : { x: 0.5, y: 0.5 }, initialScale(r), true);
}
/**
 * One movement (owner, 11 Oct 2026: „nie centruj najpierw, tylko centruj zoomując”): after a short
 * look at the whole map the zoom starts from its middle and the destination glides to the centre while
 * the picture grows – no separate pan. Geometric zoom; the target's distance from the screen centre
 * shrinks as (1 − u)², so it moves steadily inwards and never swings out.
 */
function flightFrames(r: HTMLElement) {
  const from = portrait(r) ? EUROPE : { x: 0.5, y: 0.5 };
  const s0 = initialScale(r), s1 = finalScale(r);
  const frames: Keyframe[] = [
    { offset: 0, transform: initialFrame(r), easing: 'linear' },
  ];
  const N = 40;
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const u = t ** 1.7; // slow start, then faster – as the old zoom felt
    const scale = s0 * (s1 / s0) ** u;
    const f = 1 - (1 - u) ** 2 * (s0 / scale);
    const p = { x: from.x + (point!.x - from.x) * f, y: from.y + (point!.y - from.y) * f };
    frames.push({ offset: overviewOffset + (1 - overviewOffset) * t, transform: frame(r, p, scale, true), easing: 'linear' });
  }
  return frames;
}

/** The destination is resolved by travel.ts from this character's real save. */
export async function flyToGameLocation(lat: number, lon: number, mapReady: Promise<void>) {
  const r = root();
  if (!r || r.hidden || !loadingGame()) return;
  point = punktNaMapieWczytywania(lat, lon);
  r.style.setProperty('--target-x', String(point.x));
  r.style.setProperty('--target-y', String(point.y));
  if (r.hidden || finished || r.dataset.phase === 'error') return;
  r.dataset.phase = 'pan';
  // The supplied movie runs at 9 fps. During movement use its still frame,
  // then resume the lamp animation if terrain preparation takes longer.
  video?.pause();
  await fade;
  if (r.hidden || finished || r.dataset.phase === 'error') return;
  if (!reduced()) {
    // A short look at the whole map, then one zoom that also brings the destination to the centre.
    const overviewMs = 700, zoomMs = 10_000, zoomStart = overviewMs;
    const duration = zoomStart + zoomMs;
    overviewOffset = overviewMs / duration;
    flight = r.querySelector<HTMLElement>('.lm-plate')!.animate(flightFrames(r), { duration, easing: 'linear', fill: 'forwards' });
    const current = flight, done = current.finished.catch(() => {});
    let terrainReady = false, finishing = false;
    void mapReady.then(() => { terrainReady = true; });
    const began = performance.now();
    while (flight === current && current.playState !== 'finished' && current.playState !== 'idle' && !finished && r.dataset.phase !== 'error') {
      const time = Number(current.currentTime ?? 0);
      if (time >= zoomStart && !finishing) {
        const progress = Math.max(0, Math.min(1, (time - zoomStart) / zoomMs));
        if (terrainReady) {
          // A gentle tail towards the destination once the actual first view is painted.
          const remaining = Math.max(1800, (1-progress)*3600, zoomStart+3600-(performance.now()-began));
          current.updatePlaybackRate((duration-time)/remaining);
          finishing = true;
        } else if (progress > 0.6) {
          // Keep approaching instead of parking at maximum zoom while workers are busy.
          current.updatePlaybackRate(Math.max(0.001, (1-progress)*0.8));
        }
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
    }
    await done;
  } else {
    r.querySelector<HTMLElement>('.lm-plate')!.style.transform = frame(r, point, finalScale(r), true);
  }
  await fade;
  if (!r.hidden && !finished && r.dataset.phase === 'pan') {
    r.dataset.phase = 'waiting';
    void video?.play().catch(() => {});
  }
}

/**
 * QR demo (owner, 11 Oct 2026: no „Rozwijasz mapę…”/„Budzisz się…” texts and no green screen): the sharp world
 * map is shown at once, as the page starts. `demoIntro` then plays the opening over it.
 */
export function demoMapAtOnce() {
  const r = root();
  if (!r) return;
  stopMedia();
  finished = false;
  point = null;
  r.hidden = false;
  r.dataset.phase = 'demo';
  r.setAttribute('aria-busy', 'true');
  r.querySelector<HTMLElement>('.lm-lamp')?.style.setProperty('display', 'none');
  const plate = r.querySelector<HTMLElement>('.lm-plate')!;
  plate.style.opacity = '1';
  startDrift(r);
  resize = () => { if (!flight) startDrift(r); };
  window.addEventListener('resize', resize);
  preparePoster(r);
  // The badge logo: index.html already shows it before any code loads; otherwise (e.g. a scene restart) add it now.
  logoImg = r.querySelector<HTMLImageElement>('.lm-logo');
  if (!logoImg) {
    logoImg = new Image();
    logoImg.className = 'lm-logo';
    logoImg.alt = 'Exp-lore';
    logoImg.src = new URL('logo/odznaka.webp', document.baseURI).href;
    r.append(logoImg);
  }
}

let logoImg: HTMLImageElement | null = null;

/**
 * The demo's wallpaper (owner, 12 Oct 2026: „ucięta po bokach – pokazuj płynnie z losowej strony i przesuwaj delikatnie”):
 * the map covers the whole screen and drifts slowly sideways, starting from a random side.
 */
let drift: { anim: Animation; from: { x: number; y: number }; to: { x: number; y: number }; scale: number; ms: number } | null = null;
const DRYF_MS = 45_000;
function startDrift(r: HTMLElement) {
  drift?.anim.cancel();
  const plate = r.querySelector<HTMLElement>('.lm-plate')!;
  const w = r.clientWidth, h = r.clientHeight;
  const scale = portrait(r) ? initialScale(r) : Math.max(w / 1280, h / 720) * 1.15;
  const room = Math.max(0, (1280 * scale - w) / 2) / (1280 * scale);
  const y = portrait(r) ? EUROPE.y : 0.5;
  const cx = portrait(r) ? EUROPE.x : 0.5;
  const lo = Math.max(0.5 - room, cx - room), hi = Math.min(0.5 + room, cx + room);
  const left = Math.random() < 0.5;
  const from = { x: left ? lo : hi, y }, to = { x: left ? hi : lo, y };
  if (reduced()) {
    plate.style.transform = frame(r, { x: cx, y }, scale, true);
    drift = null;
    return;
  }
  const anim = plate.animate([{ transform: frame(r, from, scale, true) }, { transform: frame(r, to, scale, true) }], { duration: DRYF_MS, easing: 'ease-in-out', fill: 'forwards' });
  drift = { anim, from, to, scale, ms: DRYF_MS };
}
/** Where the drifting wallpaper is now (the point at the screen centre) and its scale. */
function driftNow() {
  if (!drift) return null;
  const t = Math.min(1, Number(drift.anim.currentTime ?? 0) / drift.ms);
  const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; // close to ease-in-out
  return { p: { x: drift.from.x + (drift.to.x - drift.from.x) * e, y: drift.from.y }, scale: drift.scale };
}

/** A coin spinning on its edge (owner: „monetą między palcami, wokół własnej osi”, not a wheel). */
const COIN = (deg: number, scale = 1) => `translate(-50%,-50%) perspective(900px) rotateY(${deg}deg) scale(${scale})`;

/**
 * The demo's opening: the wallpaper drifts with the logo over it (shown at once by index.html); once the game is
 * loading, the logo spins like a coin and vanishes, and a quick zoom flies to the dream's spot (Wawel). If the first
 * view still isn't ready then, a small spinning coin waits at the bottom (owner: „nic się nie zadziało”).
 */
export async function demoIntro(lat: number, lon: number, mapReady: Promise<void>) {
  const r = root();
  if (!r || r.hidden || finished) return;
  point = punktNaMapieWczytywania(lat, lon);
  const plate = r.querySelector<HTMLElement>('.lm-plate')!;
  const wait = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));
  if (reduced()) {
    logoImg?.remove();
    drift?.anim.cancel();
    plate.style.transform = frame(r, point, finalScale(r) / 2, true);
    await mapReady;
    return;
  }
  const logo = logoImg ?? r.querySelector<HTMLImageElement>('.lm-logo');
  if (logo) {
    // Let the logo be seen for a moment (it fades in 0.3 s after the page opens).
    const shown = 1800 - performance.now();
    if (shown > 0) await wait(shown);
    await Promise.race([logo.decode().catch(() => {}), wait(800)]);
    logo.style.animation = 'none';
    logo.style.opacity = '1';
    await logo.animate([
      { opacity: 1, transform: COIN(0) },
      { opacity: 1, transform: COIN(540, 1.04), offset: 0.55 },
      { opacity: 0, transform: COIN(1260, 0.3) },
    ], { duration: 1300, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
    logo.remove();
  }
  // A quick zoom from where the wallpaper drifted to straight onto the dream's spot.
  const now = driftNow();
  drift?.anim.cancel();
  drift = null;
  const p0 = now?.p ?? { x: 0.5, y: 0.5 }, s0 = now?.scale ?? initialScale(r), s1 = Math.max(s0 * 2, finalScale(r) / 2);
  const frames: Keyframe[] = [];
  const N = 30;
  for (let k = 0; k <= N; k++) {
    const t = k / N, u = t ** 1.5, scale = s0 * (s1 / s0) ** u, f = 1 - (1 - u) ** 2 * (s0 / scale);
    frames.push({ offset: t, transform: frame(r, { x: p0.x + (point.x - p0.x) * f, y: p0.y + (point.y - p0.y) * f }, scale, true) });
  }
  flight = plate.animate(frames, { duration: 1700, easing: 'ease-in-out', fill: 'forwards' });
  await flight.finished.catch(() => {});
  let ready = false;
  void mapReady.then(() => { ready = true; });
  await wait(50);
  if (!ready) {
    const coin = new Image();
    coin.src = new URL('logo/odznaka.webp', document.baseURI).href;
    coin.alt = '';
    coin.style.cssText = 'position:absolute;left:50%;bottom:max(36px,env(safe-area-inset-bottom));top:auto;width:56px;height:auto;pointer-events:none;filter:drop-shadow(0 3px 4px rgba(0,0,0,.6));';
    r.append(coin);
    const spin = coin.animate([{ transform: 'translateX(-50%) perspective(400px) rotateY(0deg)' }, { transform: 'translateX(-50%) perspective(400px) rotateY(360deg)' }], { duration: 1400, iterations: Infinity });
    await mapReady;
    spin.cancel();
    coin.remove();
  }
}

/** Reveal only after both the flight and actual terrain rendering are ready. */
export async function revealLoadedGame() {
  const r = root();
  if (!r || r.hidden || finished || r.dataset.phase === 'error') return;
  r.dataset.phase = 'revealing';
  resetTouch();
  await r.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced() ? 100 : 250, fill: 'forwards' }).finished.catch(() => {});
  hideLoadingMap();
}

/** Demos skip character login; they already have their own awakening sequence. */
export function hideLoadingMap() {
  finished = true;
  const r = root();
  if (r) {
    r.hidden = true;
    r.dataset.phase = 'hidden';
    r.getAnimations().forEach((animation) => animation.cancel());
    r.style.opacity = '';
    r.setAttribute('aria-busy', 'false');
  }
  menu?.remove();
  menu = null;
  stopMedia();
  resetTouch();
  resetKeys();
}

/** Keep the illustration on a loading failure, with a working recovery action. */
export function loadingMapError(message: string, retry: () => void) {
  const r = root();
  if (!r) return;
  r.hidden = false;
  r.dataset.phase = 'error';
  // An inert login still covers pointer hits while fading; remove it on failure.
  menu?.getAnimations().forEach((animation) => animation.cancel());
  menu?.remove();
  menu = null;
  stopMedia();
  r.getAnimations().forEach((animation) => animation.cancel());
  r.style.opacity = '';
  r.querySelector<HTMLElement>('.lm-plate')!.style.opacity = '0';
  r.querySelector('.lm-error')?.remove();
  const box = document.createElement('div');
  box.className = 'lm-error';
  box.setAttribute('role', 'alert');
  const text = document.createElement('p');
  text.textContent = `${tx('Nie udało się przygotować mapy.', 'Could not prepare the map.')}\n${message}`;
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = tx('Wczytaj ponownie', 'Reload');
  button.onclick = retry;
  box.append(text, button);
  r.append(box);
}
