/** Stream the soundtrack: a separate Web Audio bus keeps the slider working on iOS. */
export type MusicState = { underground: boolean; combat: boolean } | null;
/**
 * 4 = „Brassbound Horizons” (owner, 23 Nov 2026: „od otwarcia linka do momentu załadowania mapy”):
 * plays while the start menu / loading cover is up, then crossfades into the game's music.
 * Browsers only allow sound after the first tap/key unless the site may autoplay – then it starts at once.
 */
const FILES = ['caravan-trails-1', 'caravan-trails-2', 'catacombs', 'skirmish', 'brassbound-horizons'];
const INTRO = 4;
const VOLUME_KEY = 'exp-music-volume', ENABLED_KEY = 'exp-music-enabled';
let volume = .45, enabled = true;
try {
  const saved = localStorage.getItem(VOLUME_KEY);
  if (saved !== null && Number.isFinite(Number(saved))) volume = Math.max(0, Math.min(1, Number(saved)));
  enabled = localStorage.getItem(ENABLED_KEY) !== '0';
} catch { /* Private storage must not block the game. */ }
type Track = { media: HTMLAudioElement; gain: GainNode; mix: number; pending: boolean; retryAt: number; failed: boolean; losuj: boolean };
/**
 * Owner, 1 Nov 2026: „muzykę rozpoczynaj w losowym miejscu utworu, nie zawsze od początku”.
 * A track that starts anew (first time, after fading out, after logout, the next surface piece)
 * jumps to a random point within the first LOSOWY_START_DO of its length; a pause in the background
 * keeps its place.
 */
const LOSOWY_START_DO = .8;
function losujMiejsce(t: Track) {
  const d = t.media.duration;
  if (!t.losuj || t === tracks[INTRO] || !Number.isFinite(d) || d <= 0) return;
  t.losuj = false;
  try { t.media.currentTime = Math.random() * d * LOSOWY_START_DO; } catch { /* seeking is optional */ }
}
let context: AudioContext | undefined, master: GainNode | undefined;
let tracks: Track[] = [];
let surface = 0, desired = -1, previous = 0, lastCombat = -Infinity;
let stopped = true;
/** Held while the game waits for „Gram dalej” after the tab came back (powrot.ts): nothing plays. */
let wstrzymana = false;
export function wstrzymajMuzyke(v: boolean) {
  wstrzymana = v;
  if (v) pause(); else if (desired >= 0) unlock();
}
export const musicVolume = () => volume;
export const musicEnabled = () => enabled;
export function setMusicVolume(value: number) {
  if (!Number.isFinite(value)) return;
  volume = Math.max(0, Math.min(1, value));
  try { localStorage.setItem(VOLUME_KEY, String(volume)); } catch { /* optional */ }
  applyVolume();
}
export function setMusicEnabled(value: boolean) {
  enabled = value;
  try { localStorage.setItem(ENABLED_KEY, value ? '1' : '0'); } catch { /* optional */ }
  applyVolume();
}
function applyVolume() {
  if (context && master) master.gain.setTargetAtTime(enabled ? volume : 0, context.currentTime, .03);
  if (!enabled || !volume) pause(); else unlock();
}
function pause() { for (const t of tracks) t.media.pause(); }
function play(i: number, prime = false) {
  const t = tracks[i];
  if (!t || t.pending || t.failed || !t.media.paused || document.hidden || wstrzymana || !enabled || !volume) return;
  if (!prime && (desired < 0 || i !== desired || performance.now() < t.retryAt)) return;
  losujMiejsce(t);
  t.pending = true;
  void t.media.play().then(() => {
    t.pending = false;
    if (desired < 0 || stopped || document.hidden || wstrzymana || !enabled || !volume || (i !== desired && !t.mix)) t.media.pause();
  }).catch(() => { t.pending = false; t.retryAt = performance.now() + 1000; });
}
/**
 * The recordings pan instruments hard left/right and back within half a second (skirmish ±9 dB,
 * caravan-trails-2 ±6 dB; owner 1 Nov 2026: „muzyka skacze z prawego na lewy głośnik”). Mix each side
 * partly into the other: L' = a·L + b·R, R' = b·L + a·R, a = (1 + SZEROKOSC) / 2, b = (1 − SZEROKOSC) / 2.
 * 1 = untouched, 0 = mono. Swings become ~3 dB, the music still sounds stereo.
 */
const SZEROKOSC_STEREO = .4;
function zwezStereo(ctx: AudioContext, input: AudioNode): AudioNode {
  const split = ctx.createChannelSplitter(2), merge = ctx.createChannelMerger(2);
  const a = (1 + SZEROKOSC_STEREO) / 2, b = (1 - SZEROKOSC_STEREO) / 2;
  const g = (v: number) => { const n = ctx.createGain(); n.gain.value = v; return n; };
  input.connect(split);
  split.connect(g(a), 0).connect(merge, 0, 0); split.connect(g(b), 1).connect(merge, 0, 0);
  split.connect(g(b), 0).connect(merge, 0, 1); split.connect(g(a), 1).connect(merge, 0, 1);
  return merge;
}
/** Also called in the login gesture, BEFORE asynchronous login/map loading (Safari). */
let primed = false;
function unlock(gesture = false) {
  if (document.hidden || !enabled || !volume) return;
  try {
    if (!context) {
      context = new AudioContext();
      master = context.createGain(); master.gain.value = volume;
      zwezStereo(context, master).connect(context.destination);
      tracks = FILES.map((name, i) => {
        const media = new Audio(`${import.meta.env.BASE_URL}audio/${name}.mp3`);
        media.preload = i === INTRO ? 'auto' : 'none'; media.loop = i >= 2;
        const gain = context!.createGain(); gain.gain.value = 0;
        context!.createMediaElementSource(media).connect(gain).connect(master!);
        const track: Track = { media, gain, mix: 0, pending: false, retryAt: 0, failed: false, losuj: true };
        media.addEventListener('loadedmetadata', () => losujMiejsce(track));
        media.addEventListener('error', () => { track.failed = true; });
        media.addEventListener('ended', () => { if (i < 2) { surface = 1 - i; media.currentTime = 0; track.losuj = true; } });
        return track;
      });
    }
    // Silent priming grants each streamed element permission in the native gesture.
    // The intro may try to autoplay before any gesture; the priming waits for the first real one.
    if (gesture && !primed) { primed = true; tracks.forEach((_, i) => { if (i !== desired) play(i, true); }); }
    if (context.state === 'suspended') void context.resume().catch(() => {});
    // In a gesture the retry pause after a refused autoplay must not block the start.
    if (desired >= 0) play(desired, gesture);
  } catch { /* Audio errors must never stop play. */ }
}
/** Called from the global game step, also while dialogs pause GameScene. `intro` = menu/loading cover is up. */
export function updateMusic(next: MusicState, now = performance.now(), intro = false) {
  const dt = previous ? Math.min(.1, Math.max(0, (now - previous) / 1000)) : 0;
  previous = now;
  if (!next) lastCombat = -Infinity;
  else if (next.combat) lastCombat = now;
  const target = !next ? (intro ? INTRO : -1) : now - lastCombat < 800 ? 3 : next.underground ? 2 : surface;
  desired = target; stopped = target < 0;
  if (document.hidden || wstrzymana || !enabled || !volume) return;
  if (!context) {
    // The intro tries at once (allowed where the browser lets the site autoplay); the rest waits for a gesture.
    if (target === INTRO || (next && navigator.userActivation?.hasBeenActive)) unlock();
    if (!context) return;
  }
  // Stop immediately on logout; no previous encounter can leak into another login.
  if (target < 0) { pause(); tracks.forEach(t => { t.mix = 0; t.gain.gain.value = 0; t.losuj = true; }); return; }
  if (target >= 0) play(target);
  const ready = target >= 0 && !!tracks[target] && tracks[target].media.readyState >= 2 && !tracks[target].media.paused;
  tracks.forEach((t, i) => {
    // Keep the old bed until the new stream actually has audio, including a slow download.
    const goal = i === target ? (ready ? 1 : 0) : !ready ? t.mix : 0;
    const seconds = target === 3 ? 1.2 : 2;
    t.mix += Math.sign(goal - t.mix) * Math.min(Math.abs(goal - t.mix), dt / seconds);
    t.gain.gain.setTargetAtTime(t.mix, context!.currentTime, .015);
    if (t.mix === 0 && i !== target && !t.media.paused) { t.media.pause(); t.losuj = true; }
  });
}
for (const event of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(event, () => unlock(true), { capture: true, passive: true });
/**
 * A short trip to another tab/app (owner, 2 Nov 2026: „krótkie wyjścia nawet na 10 sekund niech nie przerywają”)
 * keeps the music playing; only after this long away does it stop (and powrot.ts asks „Gram dalej?” on return).
 */
export const KROTKIE_WYJSCIE_MS = 3_000;
let pauzaWTle: ReturnType<typeof setTimeout> | undefined;
document.addEventListener('visibilitychange', () => {
  clearTimeout(pauzaWTle);
  if (document.hidden) pauzaWTle = setTimeout(() => { if (document.hidden) pause(); }, KROTKIE_WYJSCIE_MS);
  else if (desired >= 0) unlock();
});
window.addEventListener('pagehide', () => { desired = -1; stopped = true; pause(); });
