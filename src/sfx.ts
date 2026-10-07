// Tiny sounds made on the fly (no files to download).

let ctx: AudioContext | null = null;

function audio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

/** A distant dragon's screech: a falling whistle with a rough edge. */
export function screech() {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const gain = a.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.18, t + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  gain.connect(a.destination);
  for (const [type, from, to] of [['sawtooth', 2200, 700], ['square', 1650, 520]] as const) {
    const o = a.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + 1.3);
    // A wobble makes it sound alive.
    const lfo = a.createOscillator();
    const depth = a.createGain();
    lfo.frequency.value = 23;
    depth.gain.value = 60;
    lfo.connect(depth).connect(o.frequency);
    o.connect(gain);
    o.start(t);
    lfo.start(t);
    o.stop(t + 1.5);
    lfo.stop(t + 1.5);
  }
}

/** One soft pipe note (the dragons' melody), `freq` in Hz. */
export function pipe(freq: number, ms = 420) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const gain = a.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.16, t + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  gain.connect(a.destination);
  const o = a.createOscillator();
  o.type = 'triangle';
  o.frequency.value = freq;
  o.connect(gain);
  o.start(t);
  o.stop(t + ms / 1000 + 0.05);
}

/** A thunderclap: a burst of low, rumbling noise that cracks first and rolls away. */
export function grzmot() {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const len = 2.6;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * len), a.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    // Brown-ish noise: random steps, smoothed, louder at the crack.
    last = (last + (Math.random() * 2 - 1) * 0.08) * 0.985;
    d[i] = last * 6;
  }
  const src = a.createBufferSource();
  src.buffer = buf;
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(1800, t);
  lp.frequency.exponentialRampToValueAtTime(160, t + 0.6);
  const gain = a.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.5, t + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(lp).connect(gain).connect(a.destination);
  src.start(t);
  src.stop(t + len);
}
