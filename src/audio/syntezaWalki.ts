// Combat sounds made by the game itself (owner, 20 Nov 2026: „dźwięki zrób na razie swoje”) – contact of a blade, a
// stick, an arrow and magic with a creature, a heavy layer for strong blows, an arrow in a wall, and four kinds of a
// creature's fall. Computed once into AudioBuffers when audio is unlocked (no files, a few ms in all), then played
// through the same CombatAudio voices, limits and compressor as the recorded ones. Recorded samples can replace any
// of them later: give the id `variants` files in public/audio/sfx and drop its `synth` mark in combatCatalog.ts.

/** A seeded noise source, so every variant always sounds the same. */
function szum(ziarno: number) {
  let s = ziarno >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296) * 2 - 1; };
}

/** A biquad band-pass / low-pass / high-pass (RBJ), one sample at a time. */
function filtr(typ: 'bp' | 'lp' | 'hp', f: number, q: number, sr: number) {
  const w = 2 * Math.PI * f / sr, al = Math.sin(w) / (2 * q), cw = Math.cos(w);
  let b0, b1, b2;
  if (typ === 'bp') { b0 = al; b1 = 0; b2 = -al; }
  else if (typ === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; }
  else { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; }
  const a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x: number) => {
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}

/** Attack then exponential decay (s). */
const obw = (t: number, atak: number, zanik: number) => t < 0 ? 0 : t < atak ? t / atak : Math.exp(-(t - atak) / zanik);

/** A sine whose pitch slides from f0 to f1 over `czas` (phase kept continuous). */
function slizg(f0: number, f1: number, czas: number, sr: number) {
  let faza = 0;
  return (t: number) => { const f = f0 + (f1 - f0) * Math.min(1, t / czas); faza += 2 * Math.PI * f / sr; return Math.sin(faza); };
}

type Gen = (t: number, i: number) => number;
const PRZEPISY: Record<string, { dl: number; gen: (sr: number, v: number) => Gen }> = {
  // Steel into a body: a bright bite of noise, a dull thump under it, a short ring of the blade.
  'hit-blade': { dl: 0.24, gen: (sr, v) => {
    const n = szum(11 + v), bp = filtr('bp', 2600 + v * 300, 1.1, sr), th = slizg(150, 85, 0.06, sr);
    const r1 = slizg(2350 + v * 90, 2300 + v * 90, 1, sr), r2 = slizg(3550 - v * 70, 3500 - v * 70, 1, sr);
    return (t) => bp(n()) * obw(t, 0.002, 0.03) * 1.6 + th(t) * obw(t, 0.003, 0.05) * 0.75 + (r1(t) * 0.16 + r2(t) * 0.07) * obw(t, 0.001, 0.07);
  } },
  // A stick: a wooden knock and a thud.
  'hit-blunt': { dl: 0.26, gen: (sr, v) => {
    const n = szum(23 + v), bp = filtr('bp', 850 + v * 90, 2, sr), th = slizg(125, 68, 0.08, sr), kn = slizg(610 + v * 40, 560, 0.05, sr);
    return (t) => th(t) * obw(t, 0.004, 0.07) + bp(n()) * obw(t, 0.002, 0.04) * 1.4 + kn(t) * obw(t, 0.001, 0.03) * 0.3;
  } },
  // An arrow into a body: a short thunk.
  'hit-arrow': { dl: 0.2, gen: (sr, v) => {
    const n = szum(37 + v), bp = filtr('bp', 1700 + v * 150, 1.4, sr), tk = slizg(270 + v * 20, 140, 0.04, sr), lo = slizg(95, 70, 0.06, sr);
    return (t) => tk(t) * obw(t, 0.002, 0.04) * 0.85 + bp(n()) * obw(t, 0.001, 0.018) * 1.2 + lo(t) * obw(t, 0.003, 0.06) * 0.4;
  } },
  // Magic: a crackle of sparks and a falling glassy tone.
  'hit-magic': { dl: 0.36, gen: (sr, v) => {
    const n = szum(41 + v), hp = filtr('hp', 3800, 0.8, sr), sw = slizg(980 + v * 80, 300, 0.14, sr);
    const a = slizg(1320 + v * 60, 1320 + v * 60, 1, sr), b = slizg(1980 + v * 90, 1980 + v * 90, 1, sr), c = slizg(2640 + v * 120, 2640, 1, sr);
    return (t) => (a(t) + b(t) * 0.7 + c(t) * 0.5) * obw(t, 0.002, 0.09) * 0.22 * (0.6 + 0.4 * Math.sin(t * 190))
      + hp(n()) * obw(t, 0.004, 0.08) * 0.5 + sw(t) * obw(t, 0.002, 0.12) * 0.32;
  } },
  // Under a strong blow / critical: a deep boom and a crack.
  'hit-heavy': { dl: 0.42, gen: (sr, v) => {
    const n = szum(53 + v), lp = filtr('lp', 520, 0.9, sr), hp = filtr('hp', 2400, 0.9, sr), bm = slizg(78 + v * 4, 38, 0.18, sr);
    return (t) => bm(t) * obw(t, 0.003, 0.15) * 1.1 + lp(n()) * obw(t, 0.002, 0.08) * 1.5 + hp(n()) * obw(t, 0.0008, 0.016) * 0.7;
  } },
  // An arrow in a wall or the ground: a dull tick.
  'hit-wall': { dl: 0.16, gen: (sr, v) => {
    const n = szum(61 + v), bp = filtr('bp', 1150 + v * 100, 1.6, sr), tk = slizg(420, 250, 0.03, sr);
    return (t) => bp(n()) * obw(t, 0.001, 0.02) * 1.2 + tk(t) * obw(t, 0.001, 0.03) * 0.45;
  } },
  // A beast's fall: a whine sliding down and a thud of the body.
  'death-zwierze': { dl: 0.6, gen: (sr, v) => {
    const n = szum(71 + v), lp = filtr('lp', 950, 0.8, sr), lp2 = filtr('lp', 380, 0.7, sr);
    let faza = 0;
    return (t) => {
      const f = (160 + v * 12) * Math.pow(0.42, Math.min(1, t / 0.4)) * (1 + 0.04 * Math.sin(t * 37));
      faza += f / sr;
      const pila = 2 * (faza - Math.floor(faza + 0.5));
      return lp(pila) * obw(t, 0.02, 0.22) * 0.9 + lp2(n()) * obw(t - 0.32, 0.005, 0.08) * 1.3;
    };
  } },
  // A person's fall: a short grunt, then the body on the ground.
  'death-czlowiek': { dl: 0.55, gen: (sr, v) => {
    const n = szum(83 + v), f1 = filtr('bp', 680 + v * 40, 4, sr), f2 = filtr('bp', 1180 + v * 60, 5, sr), lp = filtr('lp', 300, 0.7, sr), th = slizg(85, 55, 0.08, sr);
    let faza = 0;
    return (t) => {
      const f = (175 - v * 10) * (1 - 0.45 * Math.min(1, t / 0.22));
      faza += f / sr;
      const pila = 2 * (faza - Math.floor(faza + 0.5));
      const glos = (f1(pila) + f2(pila) * 0.7) * obw(t, 0.012, 0.13) * 2.2;
      return glos + (th(t - 0.3) * 0.7 + lp(n()) * 0.9) * obw(t - 0.3, 0.004, 0.07);
    };
  } },
  // Bones: a clatter of small knocks.
  'death-kosci': { dl: 0.55, gen: (sr, v) => {
    const n = szum(97 + v), bp = filtr('bp', 2900, 2.2, sr), los = szum(5 + v);
    const uderzenia = Array.from({ length: 8 }, (_, i) => ({ t: 0.03 + i * 0.05 + Math.abs(los()) * 0.03, f: 1500 + Math.abs(los()) * 1800 }));
    const tony = uderzenia.map(u => slizg(u.f, u.f * 0.9, 0.02, sr));
    return (t) => {
      let s = 0;
      for (let i = 0; i < uderzenia.length; i++) { const e = obw(t - uderzenia[i].t, 0.0005, 0.012); if (e > 1e-4) s += (tony[i](t) * 0.4 + bp(n()) * 1.3) * e * (1 - i * 0.07); }
      return s;
    };
  } },
  // Magic folk: a puff rising and fading, with a falling tone and a few sparks.
  'death-magia': { dl: 0.65, gen: (sr, v) => {
    const n = szum(101 + v), tn = slizg(640 + v * 40, 150, 0.4, sr), sp = slizg(2400, 3200, 0.5, sr), hp = filtr('hp', 1500, 0.7, sr);
    let bp = filtr('bp', 400, 1.3, sr);
    return (t, i) => {
      if (i % 64 === 0) bp = filtr('bp', 400 + 2600 * Math.min(1, t / 0.5), 1.3, sr);
      return bp(n()) * Math.sin(Math.PI * Math.min(1, t / 0.6)) * 0.9 + tn(t) * obw(t, 0.005, 0.2) * 0.3
        + sp(t) * 0.08 * obw(t - 0.1, 0.002, 0.15) + hp(n()) * obw(t, 0.002, 0.03) * 0.3;
    };
  } },
  // The brass goat, the robot: a clank and a hiss of steam.
  'death-metal': { dl: 0.6, gen: (sr, v) => {
    const n = szum(113 + v), hp = filtr('hp', 3000, 0.7, sr), a = slizg(520 + v * 30, 500, 1, sr), b = slizg(1310, 1290, 1, sr), c = slizg(2210, 2190, 1, sr);
    return (t) => (a(t) + b(t) * 0.6 + c(t) * 0.4) * obw(t, 0.001, 0.12) * 0.35 + hp(n()) * Math.sin(Math.PI * Math.min(1, Math.max(0, t - 0.05) / 0.5)) * 0.35;
  } },
  // Footsteps (owner, 21 Nov 2026): quiet, short, by the ground under the boots.
  'krok-twardy': { dl: 0.09, gen: (sr, v) => {
    const n = szum(131 + v), bp = filtr('bp', 1500 + v * 250, 1.6, sr), th = slizg(130 + v * 10, 90, 0.03, sr);
    return (t) => bp(n()) * obw(t, 0.001, 0.014) * 1.3 + th(t) * obw(t, 0.002, 0.025) * 0.5;
  } },
  'krok-miekki': { dl: 0.12, gen: (sr, v) => {
    const n = szum(141 + v), lp = filtr('lp', 650 + v * 90, 0.8, sr), bp = filtr('bp', 2600, 1.2, sr);
    return (t) => lp(n()) * obw(t, 0.004, 0.035) * 1.6 + bp(n()) * obw(t - 0.01, 0.003, 0.02) * 0.35;
  } },
  'krok-piasek': { dl: 0.14, gen: (sr, v) => {
    const n = szum(151 + v), hp = filtr('hp', 2800 + v * 300, 0.8, sr), lp = filtr('lp', 500, 0.8, sr), los = szum(7 + v);
    return (t) => hp(n()) * obw(t, 0.006, 0.05) * (0.6 + 0.4 * Math.abs(los())) + lp(n()) * obw(t, 0.003, 0.03) * 0.8;
  } },
  'krok-bloto': { dl: 0.16, gen: (sr, v) => {
    const n = szum(161 + v), lp = filtr('lp', 420, 0.9, sr), sq = slizg(320 + v * 30, 140, 0.08, sr);
    return (t) => lp(n()) * obw(t, 0.005, 0.05) * 1.5 + sq(t) * obw(t - 0.02, 0.01, 0.04) * 0.35;
  } },
};

export const SYNTEZA = Object.keys(PRZEPISY);

/** Makes one variant (1…n) of a sound; peak-normalised so their catalog gains compare with the recorded ones. */
export function syntezuj(a: BaseAudioContext, id: string, wariant: number): AudioBuffer | undefined {
  const p = PRZEPISY[id];
  if (!p) return undefined;
  const sr = a.sampleRate, n = Math.ceil(p.dl * sr);
  const buf = a.createBuffer(1, n, sr), d = buf.getChannelData(0);
  const gen = p.gen(sr, wariant - 1);
  let szczyt = 1e-6;
  for (let i = 0; i < n; i++) { const t = i / sr; d[i] = gen(t, i); szczyt = Math.max(szczyt, Math.abs(d[i])); }
  const k = 0.9 / szczyt, ogon = Math.min(n, Math.ceil(0.012 * sr));
  for (let i = 0; i < n; i++) d[i] *= k * (i > n - ogon ? (n - i) / ogon : 1); // a soft tail: no click at the end
  return buf;
}
