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
  plate.style.transform = '';
  plate.style.opacity = '';
}

function startMedia(r: HTMLElement) {
  const plate = r.querySelector<HTMLElement>('.lm-plate')!;
  const still = () => {
    if (poster || !loadingMapVisible()) return;
    poster = new Image();
    poster.alt = '';
    poster.src = asset('map-poster.webp');
    plate.append(poster);
  };
  if (reduced()) return still();
  video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('aria-hidden', 'true');
  video.addEventListener('error', still, { once: true });
  video.src = asset('map-animation.mp4');
  plate.append(video);
  void video.play().catch(still);
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
  const ms = reduced() ? 150 : 2000;
  r.querySelector<HTMLElement>('.lm-plate')!.style.opacity = '1';
  fade = login.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: 'linear', fill: 'forwards' }).finished
    .catch(() => {})
    .then(() => { login.remove(); if (menu === login) menu = null; });
}

function flightFrames(r: HTMLElement) {
  const width = r.clientWidth, height = r.clientHeight;
  const w = Math.min(width, height * 1280 / 720), h = w * 720 / 1280;
  const dx = (point!.x - 0.5) * w, dy = (point!.y - 0.5) * h;
  const zoom = width < 600 ? 22 : 14;
  return Array.from({ length: 25 }, (_, i) => {
    const t = i / 24;
    const s = Math.exp(Math.log(zoom) * t ** 3);
    const pan = 1 - (1 - t) ** 3;
    return { offset: t, transform: `translate(${-dx * s * pan}px, ${-dy * s * pan}px) scale(${s})` };
  });
}

/** The destination is resolved by travel.ts from this character's real save. */
export async function flyToGameLocation(lat: number, lon: number) {
  const r = root();
  if (!r || r.hidden || !loadingGame()) return;
  point = punktNaMapieWczytywania(lat, lon);
  r.style.setProperty('--target-x', String(point.x));
  r.style.setProperty('--target-y', String(point.y));
  await fade;
  if (r.hidden || finished || r.dataset.phase === 'error') return;
  r.dataset.phase = 'zoom';
  if (!reduced()) {
    flight = r.querySelector<HTMLElement>('.lm-plate')!.animate(flightFrames(r), { duration: 2400, easing: 'linear', fill: 'forwards' });
    resize = () => (flight?.effect as KeyframeEffect | null)?.setKeyframes(flightFrames(r));
    window.addEventListener('resize', resize);
    await flight.finished.catch(() => {});
  }
  if (!r.hidden && !finished && r.dataset.phase === 'zoom') r.dataset.phase = 'waiting';
}

/** Reveal only after both the flight and actual terrain rendering are ready. */
export async function revealLoadedGame() {
  const r = root();
  if (!r || r.hidden || finished || r.dataset.phase === 'error') return;
  r.dataset.phase = 'revealing';
  resetTouch();
  await r.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced() ? 100 : 400, fill: 'forwards' }).finished.catch(() => {});
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
