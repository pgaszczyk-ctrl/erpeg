// Tiny sounds made on the fly (no files to download).

let ctx: AudioContext | null = null;

function audio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
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
