// Tiny sounds made on the fly (no files to download).

let ctx: AudioContext | null = null;

export function audio() {
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

/** Two dull knocks from below (a dungeon entrance calling the hero). `glos` 0..1, `pan` −1 (left) … 1 (right). */
/** Kropla wody w lochu: krótkie, wznoszące się „kap” (cichy plusk w kałuży). */
export function kapniecie(glos: number, pan = 0) {
  const a = audio();
  if (!a || glos <= 0.02) return;
  const t = a.currentTime + 0.01;
  const out = a.createGain();
  out.gain.value = Math.min(1, glos) * 0.18;
  let wy: AudioNode = out;
  if (typeof a.createStereoPanner === 'function') {
    const sp = a.createStereoPanner();
    sp.pan.value = Math.max(-1, Math.min(1, pan));
    out.connect(sp);
    wy = sp;
  }
  wy.connect(a.destination);
  const o = a.createOscillator();
  o.type = 'sine';
  const f = 700 + Math.random() * 500;
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 2.2, t + 0.05);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(1, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.14);
}

export function pukanie(glos: number, pan = 0) {
  const a = audio();
  if (!a || glos <= 0.01) return;
  const t0 = a.currentTime + 0.02;
  const out = a.createGain();
  out.gain.value = Math.min(1, glos) * 0.32;
  let wy: AudioNode = out;
  if (typeof a.createStereoPanner === 'function') {
    const sp = a.createStereoPanner();
    sp.pan.value = Math.max(-1, Math.min(1, pan));
    out.connect(sp);
    wy = sp;
  }
  wy.connect(a.destination);
  const szum = a.createBuffer(1, Math.floor(a.sampleRate * 0.05), a.sampleRate);
  const d = szum.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  for (const [dt, sila] of [[0, 1], [0.17, 0.8]] as const) {
    const t = t0 + dt;
    // Body of the knock: a short falling low tone (wood on stone).
    const o = a.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(170, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.12);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(sila, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.2);
    // The click of the contact: a filtered noise tick.
    const s = a.createBufferSource();
    s.buffer = szum;
    const bp = a.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 1.2;
    const gs = a.createGain();
    gs.gain.value = 0.5 * sila;
    s.connect(bp).connect(gs).connect(out);
    s.start(t);
  }
}

/** A short tone at `t` (helper for the loot sounds). */
function ton(a: AudioContext, out: AudioNode, t: number, freq: number, dl: number, glos: number, typ: OscillatorType = 'triangle', do_?: number) {
  const o = a.createOscillator();
  o.type = typ;
  o.frequency.setValueAtTime(freq, t);
  if (do_) o.frequency.exponentialRampToValueAtTime(do_, t + dl);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(glos, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dl);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dl + 0.03);
}

let ostatniBrzdek = 0;
/** Gold picked up: a bright double clink, bigger nuggets ring lower and fuller (`n` = coins). */
export function brzdek(n = 1) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  if (t - ostatniBrzdek < 0.05) return;
  ostatniBrzdek = t;
  const g = Math.min(0.13, 0.07 + Math.log10(1 + n) * 0.03);
  const p = 1 + (Math.random() - 0.5) * 0.08;
  const nizej = n >= 8 ? 0.8 : 1;
  ton(a, a.destination, t, 2350 * p * nizej, 0.09, g, 'sine');
  ton(a, a.destination, t + 0.055, 3150 * p * nizej, 0.16, g * 0.8, 'sine');
  if (n >= 8) ton(a, a.destination, t + 0.1, 2800 * p, 0.2, g * 0.6, 'sine');
}

/** A piece of loot hits the ground: a tiny tick (gold) or a soft thud (things). */
export function upadekLupu(zloto: boolean) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  if (zloto) ton(a, a.destination, t, 1900 + Math.random() * 400, 0.05, 0.035, 'sine');
  else ton(a, a.destination, t, 220, 0.09, 0.08, 'sine', 90);
}

/**
 * A better-than-common thing drops: a rising sparkle, longer for rarer ones (1 uncommon … 4 unique),
 * unique ends with a shimmering chord.
 */
export function fanfaraLupu(poziom: number) {
  const a = audio();
  if (!a || poziom <= 0) return;
  const t = a.currentTime + 0.02;
  const nuty = [[784, 1175], [784, 988, 1319], [659, 880, 1109, 1480], [523, 784, 1047, 1319, 1568]][Math.min(3, poziom - 1)];
  nuty.forEach((f, i) => ton(a, a.destination, t + i * 0.075, f, 0.32, 0.09));
  if (poziom >= 3) for (let i = 0; i < 6; i++) ton(a, a.destination, t + nuty.length * 0.075 + i * 0.04, 2600 + Math.random() * 1600, 0.12, 0.03, 'sine');
  if (poziom >= 4) for (const f of [523, 659, 784]) ton(a, a.destination, t + 0.45, f, 0.9, 0.05);
}

/** A treasure chest bursts open: a wooden creak, a thump of the lid and a jingle of coins. */
export function skrzyniaOtwiera() {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.02;
  // Creak: a rough low tone wobbling upwards through a resonant filter.
  const o = a.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(95, t);
  o.frequency.linearRampToValueAtTime(160, t + 0.35);
  const lfo = a.createOscillator();
  const lg = a.createGain();
  lfo.frequency.value = 31;
  lg.gain.value = 25;
  lfo.connect(lg).connect(o.frequency);
  const bp = a.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 700;
  bp.Q.value = 3;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  o.connect(bp).connect(g).connect(a.destination);
  o.start(t); lfo.start(t);
  o.stop(t + 0.45); lfo.stop(t + 0.45);
  // The lid falls back.
  ton(a, a.destination, t + 0.38, 150, 0.18, 0.22, 'sine', 55);
  // Coins jingle out.
  for (let i = 0; i < 9; i++) ton(a, a.destination, t + 0.45 + i * 0.045 + Math.random() * 0.03, 2000 + Math.random() * 1800, 0.1, 0.05, 'sine');
  // And a little "ta-da".
  [523, 659, 784, 1047].forEach((f, i) => ton(a, a.destination, t + 0.5 + i * 0.08, f, 0.35, 0.07));
}
