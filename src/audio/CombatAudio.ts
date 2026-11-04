import type Phaser from 'phaser';
import { audio } from '../sfx';
// On every server since 1.041 (owner, 31 Oct 2026); `?dzwieki=0` switches combat sounds off.
const TEST = typeof location === 'undefined' || new URLSearchParams(location.search).get('dzwieki') !== '0';
import { COMBAT_SOUNDS, soundTiming, type CombatSound } from './combatCatalog';

const buffers = new Map<string, AudioBuffer>();
const downloads = new Map<string, Promise<ArrayBuffer | null>>();
let loading: Promise<void> | undefined;
let bus: { context: AudioContext; node: DynamicsCompressorNode } | undefined;
function output(a: AudioContext) {
  if (bus?.context === a) return bus.node;
  const node = a.createDynamicsCompressor();
  node.threshold.value = -10; node.knee.value = 12; node.ratio.value = 6;
  node.attack.value = .003; node.release.value = .12;
  node.connect(a.destination); bus = { context: a, node }; return node;
}
const path = (id: CombatSound, v: number) => `${import.meta.env.BASE_URL}audio/sfx/${id}-${v}.mp3`;
let visible = true;

function preloadBytes() {
  if (!TEST) return;
  for (const [id, d] of Object.entries(COMBAT_SOUNDS)) for (let v = 1; v <= d.variants; v++) {
    const url = path(id as CombatSound, v);
    if (!downloads.has(url)) downloads.set(url, fetch(url).then(r => r.ok ? r.arrayBuffer() : null).catch(() => null));
  }
}
async function unlock() {
  if (!TEST) return;
  const a = audio(); // Called synchronously from the native gesture, including iOS.
  if (!a) return;
  preloadBytes();
  if (buffers.size === downloads.size) return;
  if (loading) return loading;
  loading = Promise.all([...downloads].map(async ([url, bytes]) => {
    if (buffers.has(url)) return;
    const data = await bytes;
    if (data) try { buffers.set(url, await a.decodeAudioData(data.slice(0))); } catch { /* missing audio never blocks play */ }
  })).then(() => { loading = undefined; });
  return loading;
}
if (TEST) {
  for (const event of ['pointerdown', 'touchstart', 'keydown']) document.addEventListener(event, () => { void unlock(); }, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });
}

/** A scene owns its voices and timers. No stale hits after pause, death, interrupted windup or restart. */
export class CombatAudio {
  private voices = new Map<AudioBufferSourceNode, { id: CombatSound; gain: GainNode }>();
  private timers = new Set<Phaser.Time.TimerEvent>();
  private last = new Map<CombatSound, number>();
  private disposed = false;
  readonly stats = { played: 0, skipped: 0 };
  epoch = 0;
  get ready() { return buffers.size; }
  constructor(private scene: Phaser.Scene) {
    preloadBytes();
    // A prior login gesture may already have unlocked the shared context.
    if (buffers.size) void unlock();
    scene.events.on('pause', this.stop);
    scene.events.on('sleep', this.stop);
    scene.events.once('shutdown', this.destroy);
    document.addEventListener('visibilitychange', this.onVisibility);
  }
  private onVisibility = () => { if (document.hidden) this.stop(); };
  /** A valid predicate is checked when the sound starts, never only when it is queued. */
  at(id: CombatSound, eventMs = 0, valid: () => boolean = () => true, gain = 1): () => void {
    if (!TEST || this.disposed) return () => {};
    const timing = soundTiming(COMBAT_SOUNDS[id].cue, Math.max(0, eventMs));
    let source: AudioBufferSourceNode | undefined;
    let timer: Phaser.Time.TimerEvent | undefined;
    const start = () => {
      if (timer) this.timers.delete(timer);
      if (!this.disposed && visible && this.scene.scene.isActive() && valid()) source = this.play(id, timing.offset, gain);
    };
    if (timing.delayMs > 1) {
      timer = this.scene.time.delayedCall(timing.delayMs, start);
      this.timers.add(timer);
    } else start();
    return () => { if (timer) { timer.remove(false); this.timers.delete(timer); } if (source) this.stopVoice(source); };
  }
  private play(id: CombatSound, offset: number, volume: number) {
    const d = COMBAT_SOUNDS[id];
    // Avoid a chorus of identical attacks; drop extra voices, never delay them.
    if (this.voices.size >= 8 || [...this.voices.values()].filter(v => v.id === id).length >= (id === 'wolf-growl' ? 2 : 3)) return;
    const prev = this.last.get(id) ?? 0;
    const variant = d.variants === 1 ? 1 : 1 + ((prev + Math.floor(Math.random() * (d.variants - 1))) % d.variants);
    const buffer = buffers.get(path(id, variant));
    if (!buffer) { this.stats.skipped++; return; } // Never replay a missed attack when decoding finishes.
    const a = audio();
    if (!a || a.state !== 'running' || offset >= buffer.duration) return;
    this.last.set(id, variant);
    const source = a.createBufferSource(), g = a.createGain();
    source.buffer = buffer;
    g.gain.setValueAtTime(0, a.currentTime);
    g.gain.linearRampToValueAtTime(d.gain * Math.max(0, Math.min(1, volume)), a.currentTime + .005);
    source.connect(g).connect(output(a));
    this.voices.set(source, { id, gain: g });
    source.onended = () => { this.voices.delete(source); source.disconnect(); g.disconnect(); };
    source.start(0, offset);
    this.stats.played++;
    this.scene.events.emit('combat-sound', { id, variant, offset, at: this.scene.time.now,
      actionAt: this.scene.time.now + Math.max(0, d.cue - offset) * 1000 });
    return source;
  }
  private stopVoice(source: AudioBufferSourceNode) {
    const v = this.voices.get(source);
    if (!v) return;
    const a = audio();
    if (a) { v.gain.gain.cancelScheduledValues(a.currentTime); v.gain.gain.setTargetAtTime(0, a.currentTime, .008); }
    try { source.stop((a?.currentTime ?? 0) + .035); } catch { /* already ended */ }
    this.voices.delete(source);
  }
  stop = () => {
    this.epoch++;
    for (const t of this.timers) t.remove(false);
    this.timers.clear();
    for (const source of this.voices.keys()) this.stopVoice(source);
  };
  destroy = () => {
    this.disposed = true;
    this.stop();
    this.scene.events.off('pause', this.stop);
    this.scene.events.off('sleep', this.stop);
    document.removeEventListener('visibilitychange', this.onVisibility);
  };
}
