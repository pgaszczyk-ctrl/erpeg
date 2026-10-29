/** Stream the soundtrack: a separate Web Audio bus keeps the slider working on iOS. */
export type MusicState = { underground: boolean; combat: boolean } | null;
const FILES = ['caravan-trails-1', 'caravan-trails-2', 'catacombs', 'skirmish'];
const VOLUME_KEY = 'exp-music-volume', ENABLED_KEY = 'exp-music-enabled';
let volume = .45, enabled = true;
try {
  const saved = localStorage.getItem(VOLUME_KEY);
  if (saved !== null && Number.isFinite(Number(saved))) volume = Math.max(0, Math.min(1, Number(saved)));
  enabled = localStorage.getItem(ENABLED_KEY) !== '0';
} catch { /* Private storage must not block the game. */ }
type Track = { media: HTMLAudioElement; gain: GainNode; mix: number; pending: boolean; retryAt: number; failed: boolean };
let context: AudioContext | undefined, master: GainNode | undefined;
let tracks: Track[] = [], state: MusicState = null;
let surface = 0, desired = -1, previous = 0, lastCombat = -Infinity;
let stopped = true;
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
  if (!t || t.pending || t.failed || !t.media.paused || document.hidden || !enabled || !volume) return;
  if (!prime && (!state || i !== desired || performance.now() < t.retryAt)) return;
  t.pending = true;
  void t.media.play().then(() => {
    t.pending = false;
    if (!state || stopped || document.hidden || !enabled || !volume || (i !== desired && !t.mix)) t.media.pause();
  }).catch(() => { t.pending = false; t.retryAt = performance.now() + 1000; });
}
/** Also called in the login gesture, BEFORE asynchronous login/map loading (Safari). */
function unlock() {
  if (document.hidden || !enabled || !volume) return;
  try {
    if (!context) {
      context = new AudioContext();
      master = context.createGain(); master.gain.value = volume; master.connect(context.destination);
      tracks = FILES.map((name, i) => {
        const media = new Audio(`${import.meta.env.BASE_URL}audio/${name}.mp3`);
        media.preload = 'none'; media.loop = i >= 2;
        const gain = context!.createGain(); gain.gain.value = 0;
        context!.createMediaElementSource(media).connect(gain).connect(master!);
        const track: Track = { media, gain, mix: 0, pending: false, retryAt: 0, failed: false };
        media.addEventListener('error', () => { track.failed = true; });
        media.addEventListener('ended', () => { if (i < 2) { surface = 1 - i; media.currentTime = 0; } });
        return track;
      });
      // Silent priming grants each streamed element permission in the native gesture.
      tracks.forEach((_, i) => play(i, true));
    }
    if (context.state === 'suspended') void context.resume().catch(() => {});
    if (desired >= 0) play(desired);
  } catch { /* Audio errors must never stop play. */ }
}
/** Called from the global game step, also while dialogs pause GameScene. */
export function updateMusic(next: MusicState, now = performance.now()) {
  state = next;
  const dt = previous ? Math.min(.1, Math.max(0, (now - previous) / 1000)) : 0;
  previous = now;
  if (!next) lastCombat = -Infinity;
  else if (next.combat) lastCombat = now;
  const target = !next ? -1 : now - lastCombat < 800 ? 3 : next.underground ? 2 : surface;
  desired = target; stopped = !next;
  if (document.hidden || !enabled || !volume) return;
  if (!context) {
    if (next && navigator.userActivation?.hasBeenActive) unlock();
    return;
  }
  // Stop immediately on logout; no previous encounter can leak into another login.
  if (!next) { pause(); tracks.forEach(t => { t.mix = 0; t.gain.gain.value = 0; }); return; }
  if (target >= 0) play(target);
  const ready = target >= 0 && tracks[target].media.readyState >= 2 && !tracks[target].media.paused;
  tracks.forEach((t, i) => {
    // Keep the old bed until the new stream actually has audio, including a slow download.
    const goal = i === target ? (ready ? 1 : 0) : !ready ? t.mix : 0;
    const seconds = target === 3 ? 1.2 : 2;
    t.mix += Math.sign(goal - t.mix) * Math.min(Math.abs(goal - t.mix), dt / seconds);
    t.gain.gain.setTargetAtTime(t.mix, context!.currentTime, .015);
    if (t.mix === 0 && i !== target) t.media.pause();
  });
}
for (const event of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(event, unlock, { capture: true, passive: true });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else if (state) unlock(); });
window.addEventListener('pagehide', () => { state = null; stopped = true; pause(); });
