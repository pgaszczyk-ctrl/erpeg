"use strict";
(() => {
  // wspolne.ts
  var nowy = (w, h) => ({ w, h, px: new Uint32Array(w * h) });
  var cl = (v) => v < 0 ? 0 : v > 255 ? 255 : v | 0;
  var rgb = (r2, g, b, a = 255) => (cl(a) << 24 | cl(b) << 16 | cl(g) << 8 | cl(r2)) >>> 0;
  var hex = (h) => rgb(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16));
  var skladowe = (c) => [c & 255, c >>> 8 & 255, c >>> 16 & 255];
  var alfa = (c) => c >>> 24;
  var ciemniej = (c) => {
    const [r2, g, b] = skladowe(c);
    return rgb(r2 * 0.6 + 6, g * 0.64 + 8, b * 0.76 + 24, alfa(c));
  };
  var mieszaj = (a, b, t) => {
    const [r1, g1, b1] = skladowe(a), [r2, g2, b2] = skladowe(b);
    return rgb(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
  };
  var OBRYS = hex("#1e1a24");
  function hash(x, y, s = 0) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653) | 0;
    h = Math.imul(h ^ h >>> 13, 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function rng(seed) {
    return () => {
      seed |= 0;
      seed = seed + 1831565813 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var NT = new Float32Array(64 * 64);
  {
    const r2 = rng(7);
    for (let i = 0; i < NT.length; i++) NT[i] = r2();
  }
  function szum(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    let fx = x - xi, fy = y - yi;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    const x0 = xi & 63, y0 = yi & 63, x1 = x0 + 1 & 63, y1 = y0 + 1 & 63;
    const a = NT[y0 * 64 + x0], b = NT[y0 * 64 + x1], c = NT[y1 * 64 + x0], d = NT[y1 * 64 + x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  var BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  var bayer = (x, y) => BAY[(y & 3) << 2 | x & 3];
  var ustaw = (o, x, y, c) => {
    if (x >= 0 && y >= 0 && x < o.w && y < o.h) o.px[y * o.w + x] = c;
  };
  var wez = (o, x, y) => x >= 0 && y >= 0 && x < o.w && y < o.h ? o.px[y * o.w + x] : 0;
  function naloz(dst, src, x, y) {
    for (let j = 0; j < src.h; j++) {
      const yy = y + j;
      if (yy < 0 || yy >= dst.h) continue;
      for (let i = 0; i < src.w; i++) {
        const c = src.px[j * src.w + i];
        if (!(c >>> 24)) continue;
        const xx = x + i;
        if (xx < 0 || xx >= dst.w) continue;
        dst.px[yy * dst.w + xx] = c;
      }
    }
  }
  function doImageData(o) {
    const d = new Uint8ClampedArray(o.w * o.h * 4);
    d.set(new Uint8Array(o.px.buffer, o.px.byteOffset, o.px.byteLength));
    return new ImageData(d, o.w, o.h);
  }
  function doCanvas(o) {
    const c = document.createElement("canvas");
    c.width = o.w;
    c.height = o.h;
    c.getContext("2d").putImageData(doImageData(o), 0, 0);
    return c;
  }
  function obrysuj(o, ciemny = OBRYS, odSwiatla) {
    const out = o.px.slice();
    for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
      const c = o.px[y * o.w + x];
      if (!(c >>> 24)) continue;
      const up = wez(o, x, y - 1), lf = wez(o, x - 1, y), dn = wez(o, x, y + 1), rt = wez(o, x + 1, y);
      if (!(dn >>> 24) || !(rt >>> 24)) out[y * o.w + x] = ciemny;
      else if (!(up >>> 24) || !(lf >>> 24)) out[y * o.w + x] = odSwiatla ? odSwiatla(c) : ciemny;
    }
    o.px.set(out);
  }

  // drzewa.ts
  var L = {
    dab: ["#1f3826", "#2d4f2f", "#3f6b38", "#5a8a44", "#7da556"],
    buk: ["#213a25", "#30562f", "#44743a", "#61924a", "#86b05c"],
    lipa: ["#28482b", "#3a6634", "#52853f", "#70a24f", "#98c066"],
    brzoza: ["#355c2c", "#4c843a", "#6ca64c", "#94c467", "#bcdc86"],
    olcha: ["#1d3424", "#2b4a2e", "#3c6436", "#567f44", "#739a52"],
    wierzba: ["#3a5a2e", "#557c3c", "#73a04c", "#98bf62", "#bcd884"],
    owocowe: ["#28492b", "#3b6936", "#548a42", "#72a652", "#97c46a"],
    sosna: ["#1a3433", "#264a43", "#376452", "#4f7e62", "#6c9a74"],
    swierk: ["#122826", "#1c3b35", "#294f43", "#3a6753", "#54826a"],
    jodla: ["#16302d", "#22443c", "#305a4b", "#43735d", "#5f8f74"],
    krzak: ["#25412a", "#365e34", "#4c7c3e", "#69994d", "#8db766"]
  };
  var GATUNKI = {
    dab: { plotno: [96, 112], r: 38, fy: 0.82, kepy: 12, ksztalt: "kepy", pienH: 24, pienW: 9, kora: "braz", paleta: L.dab, sztywnosc: 1.3, sciecie: true },
    buk: { plotno: [96, 112], r: 36, fy: 0.95, kepy: 13, ksztalt: "kepy", pienH: 22, pienW: 8, kora: "szary", paleta: L.buk, sztywnosc: 1.2, sciecie: true },
    lipa: { plotno: [88, 112], r: 33, fy: 1.15, kepy: 12, ksztalt: "kepy", pienH: 20, pienW: 8, kora: "braz", paleta: L.lipa, sztywnosc: 1.3, sciecie: false },
    brzoza: { plotno: [64, 104], r: 23, fy: 1.35, kepy: 10, ksztalt: "kepy", pienH: 26, pienW: 5, kora: "brzoza", paleta: L.brzoza, sztywnosc: 2.1, sciecie: true },
    olcha: { plotno: [72, 96], r: 25, fy: 1.25, kepy: 10, ksztalt: "kepy", pienH: 20, pienW: 6, kora: "ciemny", paleta: L.olcha, sztywnosc: 1.4, sciecie: true },
    wierzba: { plotno: [96, 104], r: 34, fy: 0.75, kepy: 11, ksztalt: "zwisajaca", pienH: 20, pienW: 9, kora: "szary", paleta: L.wierzba, sztywnosc: 2.3, sciecie: false },
    jablon: { plotno: [64, 72], r: 25, fy: 0.8, kepy: 10, ksztalt: "kepy", pienH: 14, pienW: 6, kora: "braz", paleta: L.owocowe, sztywnosc: 1.4, owoc: "#c8463a", sciecie: false },
    grusza: { plotno: [64, 88], r: 23, fy: 1.2, kepy: 10, ksztalt: "kepy", pienH: 16, pienW: 6, kora: "ciemny", paleta: L.owocowe, sztywnosc: 1.4, owoc: "#c9b240", sciecie: false },
    sliwa: { plotno: [56, 68], r: 22, fy: 0.85, kepy: 9, ksztalt: "kepy", pienH: 13, pienW: 5, kora: "ciemny", paleta: L.owocowe, sztywnosc: 1.5, owoc: "#5b3a7a", sciecie: false },
    sosna: { plotno: [72, 120], r: 30, fy: 0.55, kepy: 10, ksztalt: "plaska", pienH: 50, pienW: 6, kora: "rudy", paleta: L.sosna, sztywnosc: 1, sciecie: true },
    swierk: { plotno: [56, 112], r: 26, fy: 1, kepy: 7, ksztalt: "pietra", pienH: 8, pienW: 4, kora: "ciemny", paleta: L.swierk, sztywnosc: 0.8, sciecie: true },
    jodla: { plotno: [60, 116], r: 28, fy: 1, kepy: 8, ksztalt: "pietra", pienH: 9, pienW: 5, kora: "szary", paleta: L.jodla, sztywnosc: 0.8, sciecie: true },
    kosodrzewina: { plotno: [64, 40], r: 28, fy: 0.42, kepy: 9, ksztalt: "plaska", pienH: 0, pienW: 0, kora: null, paleta: L.swierk, sztywnosc: 0.9, sciecie: false },
    jalowiec: { plotno: [28, 48], r: 11, fy: 2, kepy: 0, ksztalt: "kolumna", pienH: 0, pienW: 0, kora: null, paleta: L.sosna, sztywnosc: 0.7, sciecie: false },
    krzak: { plotno: [40, 32], r: 16, fy: 0.75, kepy: 7, ksztalt: "kepy", pienH: 0, pienW: 0, kora: null, paleta: L.krzak, sztywnosc: 1.7, sciecie: false },
    krzak_kwitnacy: { plotno: [40, 32], r: 15, fy: 0.75, kepy: 7, ksztalt: "kepy", pienH: 0, pienW: 0, kora: null, paleta: L.krzak, sztywnosc: 1.7, kwiaty: "#e8a0c0", sciecie: false }
  };
  var KORA = {
    braz: ["#2e211b", "#46321f", "#5e4430", "#7a5a3e", "#97754f"],
    szary: ["#34302e", "#4c4744", "#67615b", "#847d74", "#a39b90"],
    brzoza: ["#3a3631", "#9a9488", "#c9c3b5", "#e2dccf", "#f3efe5"],
    rudy: ["#3d231b", "#5e3424", "#844a2f", "#a6633d", "#c4824f"],
    ciemny: ["#241a16", "#382a21", "#4c392c", "#634b39", "#7c614b"]
  };
  var DREWNO = ["#8f6638", "#c79a5c", "#e2c08a", "#f1dcae"];
  function korona(g, w, h, cx, cy, r2, seed) {
    const R2 = rng(seed);
    const o = nowy(w, h);
    const own = new Int16Array(w * h).fill(-1);
    const val = new Float32Array(w * h);
    const P3 = g.paleta.map(hex);
    let ks = [];
    if (g.ksztalt === "pietra") {
      const n = g.kepy, ry = Math.max(4, r2 * 0.32), krok = r2 * 2.6 / n;
      for (let i = n - 1; i >= 0; i--) ks.push({ x: cx, y: cy + r2 * 0.9 - i * krok, rx: Math.max(3, r2 * (1 - i / (n + 0.4))), ry, tier: i });
    } else if (g.ksztalt === "kolumna") {
      for (let i = 0; i < 5; i++) ks.push({ x: cx + (R2() - 0.5) * 2, y: cy - r2 * 1.4 + i * r2 * 0.7, rx: r2 * (0.75 + 0.15 * Math.sin(i)), ry: r2 * 0.75 });
    } else {
      const fy = g.fy;
      ks.push({ x: cx, y: cy, rx: r2 * 0.62, ry: r2 * 0.62 * fy });
      for (let i = 0; i < g.kepy; i++) {
        const a = i / g.kepy * Math.PI * 2 + R2() * 0.5, rr = r2 * (0.3 + R2() * 0.16), d = r2 - rr;
        ks.push({ x: cx + Math.cos(a) * d * 0.96, y: cy + Math.sin(a) * d * fy, rx: rr, ry: rr * Math.max(0.75, Math.min(1.15, fy)) });
      }
      for (let i = 0; i < Math.round(g.kepy / 2); i++) {
        const a = R2() * Math.PI * 2, rr = r2 * (0.26 + R2() * 0.12), d = r2 * 0.4 * R2();
        ks.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * fy - r2 * 0.15, rx: rr, ry: rr * Math.min(1.1, fy) });
      }
      ks.sort((a, b) => a.y - b.y);
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const px = x + 0.5, py = y + 0.5, k = y * w + x;
      for (let s = 0; s < ks.length; s++) {
        const c = ks[s];
        const nx = (px - c.x) / c.rx, ny = (py - c.y) / c.ry;
        let inside = nx * nx + ny * ny < 1;
        if (c.tier !== void 0) inside = nx * nx + ny * ny < 1 + (hash(x >> 1, c.tier, seed) - 0.5) * 0.35 && ny > -1.5 && !(ny > 0.3 && (x + c.tier) % 4 === 0 && hash(x, c.tier, seed + 9) < 0.5);
        if (!inside) continue;
        own[k] = s;
        let v = -(nx * 0.6 + ny * 0.8) + (hash(x, y, seed) - 0.5) * 0.3;
        if (c.tier === void 0) v -= (py - cy) / r2 * 0.32 + 0.12;
        val[k] = v;
      }
    }
    if (g.ksztalt === "zwisajaca") {
      for (let x = Math.floor(cx - r2 * 0.95); x < cx + r2 * 0.95; x += 2) {
        let ystart = -1;
        for (let y = h - 1; y >= 0; y--) if (own[y * w + x] >= 0) {
          ystart = y;
          break;
        }
        if (ystart < 0) continue;
        const len = 6 + Math.floor(hash(x, 3, seed) * 18);
        for (let j = 1; j <= len; j++) {
          const yy = ystart + j, xx = x + Math.round(Math.sin(j * 0.35 + x) * 0.6);
          if (yy >= h || xx < 0 || xx >= w) break;
          own[yy * w + xx] = ks.length;
          val[yy * w + xx] = (j % 3 === 0 ? 0.35 : 0.05) - j / len * 0.4 - (xx > cx ? 0.25 : 0);
        }
      }
    }
    const at = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? -1 : own[y * w + x];
    let gora = h, dol = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = y * w + x, s = own[k];
      if (s < 0) continue;
      gora = Math.min(gora, y);
      dol = Math.max(dol, y);
      const v = val[k];
      let t = v > 0.62 ? 4 : v > 0.28 ? 3 : v > -0.08 ? 2 : v > -0.48 ? 1 : 0;
      const lh = hash(x >> 1, y >> 1, seed + 3);
      if (t < 4 && v > -0.3 && lh < 0.16) t++;
      else if (t > 0 && lh > 0.9) t--;
      const below = at(x, y + 1);
      if (below > s && below < ks.length && v < 0.25 && hash(x >> 2, y, seed + 4) < 0.7) t = Math.max(0, t - 2);
      o.px[k] = P3[t];
    }
    if (g.kwiaty) {
      const K = hex(g.kwiaty);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (own[y * w + x] >= 0 && hash(x, y, seed + 21) < 0.05 && val[y * w + x] > -0.3) o.px[y * w + x] = K;
    }
    obrysuj(o, OBRYS, () => P3[0]);
    return { o, own, val, gora, dol };
  }
  function pien(g, w, h, cx, gora, seed, zacios) {
    const o = nowy(w, h);
    if (!g.kora) return o;
    const K = KORA[g.kora].map(hex), tw = g.pienW, x0 = Math.round(cx - tw / 2), dol = h - 1;
    for (let y = gora; y <= dol; y++) {
      const korzen = y > dol - 3 ? y - (dol - 3) : 0;
      for (let i = -korzen; i < tw + korzen; i++) {
        const x = x0 + i, f = (i + korzen) / Math.max(1, tw + 2 * korzen - 1);
        let t = f < 0.25 ? 3 : f < 0.6 ? 2 : f < 0.85 ? 1 : 0;
        if (g.kora === "brzoza") {
          t = f < 0.3 ? 4 : f < 0.8 ? 3 : 2;
          if (hash(x, y >> 1, seed) < 0.18) t = 0;
        } else if (hash(x, y >> 2, seed) < 0.22) t = Math.max(0, t - 1);
        if (g.kora === "rudy" && y < gora + (dol - gora) * 0.7 && t > 1) t = Math.min(4, t + 1);
        ustaw(o, x, y, K[t]);
      }
    }
    if (g.kora === "rudy") {
      for (let b = 0; b < 3; b++) {
        const y = gora + 6 + Math.floor(hash(b, 1, seed) * (dol - gora) * 0.5), dir = b % 2 ? 1 : -1;
        for (let j = 1; j <= 3; j++) ustaw(o, x0 + (dir > 0 ? tw - 1 + j : -j), y - j, K[1]);
      }
    }
    if (zacios) {
      const W = DREWNO.map(hex), y0 = dol - 11;
      for (let j = 0; j < 6; j++) {
        const szer = Math.max(1, Math.round(Math.min(j + 1, 6 - j) * 0.8 * Math.min(1, tw / 6)) + 1);
        for (let i = 0; i < szer; i++) ustaw(o, x0 + i, y0 + j, j === 0 ? W[3] : j === 5 ? W[0] : i === szer - 1 ? W[1] : W[2]);
      }
    }
    obrysuj(o, OBRYS, (c) => c);
    return o;
  }
  function pieniek(g, w, h, cx, seed) {
    const o = nowy(w, h);
    if (!g.kora) return o;
    const K = KORA[g.kora].map(hex), W = DREWNO.map(hex), tw = g.pienW + 2, x0 = Math.round(cx - tw / 2), dol = h - 1;
    for (let y = dol - 4; y <= dol; y++) for (let i = 0; i < tw; i++) ustaw(o, x0 + i, y, K[i === 0 ? 3 : i === tw - 1 ? 0 : 2]);
    for (let i = 0; i < tw; i++) for (let j = 0; j < 3; j++) {
      const dx = (i - (tw - 1) / 2) / (tw / 2), dy = (j - 1) / 1.6, d = Math.sqrt(dx * dx + dy * dy);
      if (d <= 1.05) ustaw(o, x0 + i, dol - 7 + j, d < 0.35 ? W[0] : d < 0.7 ? W[2] : W[1]);
    }
    obrysuj(o, OBRYS, (c) => c);
    return o;
  }
  var SKALA_DRZEW = 0.6;
  function drzewo(nazwa, seed, skala = SKALA_DRZEW) {
    const g0 = GATUNKI[nazwa];
    const g = skala === 1 ? g0 : { ...g0, plotno: [Math.round(g0.plotno[0] * skala), Math.round(g0.plotno[1] * skala)], r: g0.r * skala, pienH: Math.round(g0.pienH * skala), pienW: Math.max(g0.pienW ? 2 : 0, Math.round(g0.pienW * skala)), kepy: Math.max(g0.ksztalt === "pietra" ? 4 : 6, Math.round(g0.kepy * (0.5 + skala / 2))) };
    const [w, h] = g.plotno, R2 = rng(seed);
    const r2 = g.r * (0.92 + R2() * 0.12);
    const cx = w / 2;
    const kepy = g.ksztalt === "pietra";
    const cy = kepy ? h - g.pienH - r2 * 1.25 : g.ksztalt === "kolumna" ? h - r2 * 2.3 : h - g.pienH - r2 * g.fy * 0.85;
    const k = korona(g, w, h, cx, cy, r2, seed);
    const gornyPnia = Math.round(kepy ? h - g.pienH - 6 : cy);
    const owoce = g.owoc ? warstwaOwocow(g, k.o, w, h, seed) : null;
    const sg = { ...g, r: g.r * 0.32, pienH: 6, pienW: Math.max(2, Math.round(g.pienW / 3)) };
    const sad = nowy(w, h);
    if (g.kora) {
      const ss = korona(sg, w, h, cx, h - 6 - sg.r * Math.max(0.8, g.fy) * 0.85, sg.r, seed + 5);
      const sp = pien(sg, w, h, cx, Math.round(h - 6 - sg.r * 0.4), seed, false);
      for (let i = 0; i < sad.px.length; i++) sad.px[i] = ss.o.px[i] || sp.px[i];
    }
    return {
      korona: k.o,
      pien: pien(g, w, h, cx, gornyPnia, seed, false),
      pienZacios: g.sciecie ? pien(g, w, h, cx, gornyPnia, seed, true) : null,
      pieniek: pieniek(g, w, h, cx, seed),
      sadzonka: sad,
      owoce,
      kotwica: [Math.floor(cx), h - 1],
      koronaGora: k.gora,
      koronaDol: k.dol
    };
  }
  function warstwaOwocow(g, kor, w, h, seed) {
    const o = nowy(w, h), F = hex(g.owoc), Fj = mieszaj(F, hex("#ffffff"), 0.45), Fc = mieszaj(F, hex("#1e1a24"), 0.45);
    let n = 0;
    for (let y = 2; y < h - 2 && n < 40; y++) for (let x = 2; x < w - 2; x++) {
      if (!(wez(kor, x, y) >>> 24) || !(wez(kor, x + 1, y + 1) >>> 24) || hash(x, y, seed + 11) > 0.018) continue;
      ustaw(o, x, y, Fj);
      ustaw(o, x + 1, y, F);
      ustaw(o, x, y + 1, F);
      ustaw(o, x + 1, y + 1, Fc);
      n++;
    }
    return o;
  }
  function klatkiWiatru(kor, gora, dol, sztywnosc, margines = 6) {
    const out = [];
    for (const k of [-2, -1, 0, 1, 2]) {
      const o = nowy(kor.w + 2 * margines, kor.h);
      for (let y = 0; y < kor.h; y++) {
        const rf = Math.max(0, Math.min(1, (dol - y) / Math.max(1, dol - gora)));
        const dx = Math.round(k * sztywnosc * (0.3 + 0.95 * rf));
        for (let x = 0; x < kor.w; x++) {
          const c = kor.px[y * kor.w + x];
          if (c >>> 24) o.px[y * o.w + x + margines + dx] = c;
        }
      }
      out.push(o);
    }
    return out;
  }

  // podloze.ts
  var P = (a) => a.map(hex);
  var T = {
    trawa: P(["#3f6a2e", "#4a7433", "#558039", "#628d40", "#70994a", "#80a552"]),
    trawa_blysk: P(["#93b75a", "#a4c264", "#2f5426"]),
    laka: P(["#5a8238", "#6a9441", "#7ba54b", "#93b75a"]),
    park: P(["#3a6229", "#456f33", "#507b38", "#5c873e", "#678f44", "#75994c"]),
    liscie: P(["#3b4f2a", "#46592d", "#566233", "#6b5a34", "#7d6538"]),
    igly: P(["#3d3d26", "#4a4529", "#5a4c2c", "#6b5530", "#45552e"]),
    bruk: P(["#5b5560", "#6e6872", "#807a83", "#938d94", "#3a3540"]),
    chodnik: P(["#857e71", "#948d80", "#a19a8b", "#aea797", "#6a6358", "#5f6a3e", "#bab3a2"]),
    plac: P(["#a08e74", "#b09d81", "#bfac8f", "#7a6a55"]),
    droga: P(["#866744", "#98784e", "#ab8a5a", "#bf9c68", "#d3bb88", "#6a4f35"]),
    piasek: P(["#b39b69", "#c7ae7b", "#d6bf8d", "#a28a5c"]),
    woda: P(["#25506a", "#2e6380", "#3b7892", "#4a8aa2"]),
    orka: P(["#5e4430", "#6d5038", "#7d5d41", "#4c3627"]),
    zboze: P(["#b89a4c", "#c9ab58", "#d8bc68", "#9c8240"]),
    zarosla: P(["#34502a", "#3f5f2e", "#4c6d34", "#2a4224"]),
    parking: P(["#55525a", "#605d65", "#6b6870", "#d8d4c8"]),
    skala: P(["#6c6870", "#7f7a80", "#948f92", "#55515a"]),
    mokradlo: P(["#3d5a34", "#4a6a3a", "#3a6070", "#566f40"])
  };
  var pick = (t, v) => t[Math.max(0, Math.min(t.length - 1, Math.floor(v * t.length)))];
  function chodnik(x, y, n1, n2, h) {
    const C2 = T.chodnik;
    const rz = Math.floor(y / 13), yr = y - rz * 13;
    const szer = 10 + Math.floor(hash(rz, 0, 51) * 11), off = Math.floor(hash(rz, 1, 51) * szer);
    const kol = Math.floor((x + off) / szer), xr = x + off - kol * szer;
    const id = hash(kol, rz, 52), id2 = hash(kol, rz, 53);
    const sz = szer - 1 - (id2 < 0.3 ? 1 : 0);
    const yb = 12 - (id < 0.25 ? 1 : 0);
    const fuga = xr >= sz || yr >= yb;
    if (fuga) return h < 0.18 ? C2[5] : h < 0.24 ? T.trawa[1] : C2[4];
    if (id2 > 0.82 && (xr === 0 && yr === 0 || xr <= 1 && yr === 0 && id2 > 0.93)) return C2[4];
    let t = id * 0.55 + n2 * 0.25 + n1 * 0.2;
    if (id2 > 0.9) t -= 0.35;
    let c = pick(C2.slice(0, 4), t);
    if (yr === 0 || xr === 0) c = id2 > 0.9 ? C2[0] : C2[6];
    else if (yr === yb - 1 || xr === sz - 1) c = C2[Math.max(0, Math.floor(t * 4) - 1)];
    if (id > 0.86 && Math.abs(xr - Math.round(yr * sz / yb * (id2 < 0.5 ? 1 : -1) + (id2 < 0.5 ? 0 : sz))) < 1 && hash(x, y, 54) < 0.8) c = C2[4];
    if (h > 0.985) c = C2[4];
    return c;
  }
  function rodzajPostrzepiony(rodzajW2, x, y) {
    const jx = Math.round((hash(x, y, 31) - 0.5) * 3), jy = Math.round((hash(x, y, 32) - 0.5) * 3);
    return rodzajW2(x + jx, y + jy) ?? rodzajW2(x, y);
  }
  function kolorPodloza(r2, x, y) {
    const n1 = szum(x / 9, y / 9), n2 = szum(x / 3.3 + 20, y / 3.3 + 7), h = hash(x, y, 1);
    const mix = n1 * 0.55 + n2 * 0.35 + h * 0.25 - 0.08;
    switch (r2) {
      case "trawa":
      case "park": {
        const duze = szum(x / 46 + 5, y / 46 + 9) - 0.5, t = mix * 0.85 + 0.12 + duze * 0.55;
        if (h < 0.012) return T.trawa_blysk[hash(x, y, 6) < 0.5 ? 0 : 1];
        if (h > 0.992) return T.trawa_blysk[2];
        return pick(r2 === "park" ? T.park : T.trawa, t);
      }
      case "laka": {
        const c = pick(T.laka, mix);
        return h < 6e-3 ? hex(["#e8d06a", "#e6e6e6", "#d97aa0", "#8aa6e0"][Math.floor(hash(x, y, 2) * 4)]) : c;
      }
      case "las_lisciasty":
        return h < 0.05 ? T.liscie[3 + (h < 0.025 ? 1 : 0)] : pick(T.liscie.slice(0, 3), mix);
      case "las_iglasty":
        return h < 0.04 ? T.igly[4] : pick(T.igly.slice(0, 4), mix);
      case "zarosla":
        return pick(T.zarosla, mix);
      case "bruk": {
        const ry = Math.floor(y / 4), ox = (ry & 1) * 2, rx = Math.floor((x + ox) / 5);
        if ((y & 3) === 3 || (x + ox) % 5 === 4) return T.bruk[4];
        const t = hash(rx, ry, 3) * 0.7 + n1 * 0.3;
        return ((x + ox) % 5 === 0 || (y & 3) === 0) && t > 0.4 ? T.bruk[3] : pick(T.bruk.slice(0, 3), t);
      }
      case "chodnik":
        return chodnik(x, y, n1, n2, h);
      case "plac": {
        const ry = Math.floor(y / 16), ox = (ry & 1) * 12;
        if (y % 16 === 15 || (x + ox) % 24 === 23) return T.plac[3];
        return pick(T.plac.slice(0, 3), hash(Math.floor((x + ox) / 24), ry, 5) * 0.6 + n2 * 0.4);
      }
      case "droga": {
        if (h < 0.02) return T.droga[4];
        if (h > 0.985) return T.droga[5];
        return pick(T.droga.slice(0, 4), n1 * 0.6 + n2 * 0.5 - 0.05);
      }
      case "piasek":
        return pick(T.piasek.slice(0, 3), n1 * 0.5 + 0.25 + Math.sin((x + y * 0.3) * 0.5 + n1 * 6) * 0.12);
      case "woda": {
        const t = n1 * 0.7 + szum(x / 30, y / 30) * 0.5 - 0.2;
        return (y + Math.floor(n1 * 7)) % 6 === 0 && h < 0.4 ? T.woda[3] : pick(T.woda.slice(0, 3), t);
      }
      case "pole_orka":
        return y % 4 === 0 ? T.orka[3] : pick(T.orka.slice(0, 3), n2 * 0.6 + h * 0.4);
      case "pole_zboze":
        return y % 3 === 0 && h < 0.5 ? T.zboze[3] : pick(T.zboze.slice(0, 3), n2 * 0.6 + h * 0.4);
      case "parking":
        return x % 24 === 0 && y % 40 < 28 ? T.parking[3] : pick(T.parking.slice(0, 3), mix);
      case "cmentarz":
        return pick(T.park, mix * 0.8);
      case "mokradlo":
        return n1 > 0.62 ? T.mokradlo[2] : pick([T.mokradlo[0], T.mokradlo[1], T.mokradlo[3]], mix);
      case "skala":
        return pick(T.skala, n1 * 0.6 + n2 * 0.6 - 0.1);
      case "tory":
        return pick([hex("#6c6660"), hex("#7c756d"), hex("#8c847a"), hex("#5a544e")], h * 0.7 + n2 * 0.3);
    }
  }
  function malujPodloze(o, x0, y0, rodzajW2, cien) {
    for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) {
      const x = x0 + i, y = y0 + j;
      const r2 = rodzajPostrzepiony(rodzajW2, x, y);
      if (!r2) continue;
      let c = kolorPodloza(r2, x, y);
      if (cien && cien[j * o.w + i]) c = ciemniej(c);
      o.px[j * o.w + i] = c;
    }
  }
  function obwodka(o, x0, y0, rodzajW2, z, przy) {
    for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) {
      const x = x0 + i, y = y0 + j;
      if (rodzajW2(x, y) !== z) continue;
      let blisko = false;
      for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) {
        const r2 = rodzajW2(x + dx, y + dy);
        if (r2 && przy.includes(r2)) blisko = true;
      }
      if (blisko && bayer(x, y) < 0.7) o.px[j * o.w + i] = ciemniej(o.px[j * o.w + i]);
    }
  }

  // runo.ts
  var C = {
    trawa: ["#3f6a2e", "#558039", "#70994a", "#8fb35c"].map(hex),
    wysoka: ["#5c8a3c", "#6a9643", "#80a952", "#a4c264", "#c4bb6c"].map(hex),
    trzcina: ["#4a6530", "#5c7a38", "#7a9a48", "#5a3a24", "#7a5232"].map(hex),
    paproc: ["#2f5a2a", "#3f6a32", "#5a8a40", "#77a552"].map(hex),
    wrzos: ["#5a4a6a", "#8a5a9a", "#b07ac0"].map(hex),
    kwiaty: ["#e05050", "#e8c84a", "#7a9ae8", "#f0f0f0", "#d97aa0"].map(hex),
    kamien: ["#4e4a50", "#6c676c", "#8a8488", "#a8a2a2"].map(hex),
    grzyb: ["#e9dcc0", "#7a4a2a", "#c8402a", "#f2f2f2"].map(hex)
  };
  function zdzblo(o, bx, by, h, lean, wiatr, kol, tip) {
    for (let j = 0; j < h; j++) {
      const t = j / Math.max(1, h - 1);
      const x = bx + Math.round(lean * t + wiatr * t * t);
      ustaw(o, x, by - j, j === h - 1 ? tip : j === 0 ? kol[0] : kol[Math.min(kol.length - 1, 1 + Math.floor(t * (kol.length - 1)))]);
    }
  }
  function runo(o, x, y, rodzaj2, seed, wiatr = 0) {
    const r2 = (k) => hash(seed, k, 77);
    switch (rodzaj2) {
      case "trawa_niska": {
        const n = 3 + Math.floor(r2(0) * 3);
        for (let b = 0; b < n; b++) zdzblo(o, x - 2 + b + Math.floor(r2(b + 1) * 2), y, 3 + Math.floor(r2(b + 5) * 4), (r2(b + 9) - 0.5) * 3, wiatr * 0.6, C.trawa.slice(0, 3), C.trawa[3]);
        break;
      }
      case "trawa_wysoka": {
        const n = 4 + Math.floor(r2(0) * 4);
        for (let b = 0; b < n; b++) zdzblo(o, x - 3 + b + Math.floor(r2(b + 1) * 2), y, 8 + Math.floor(r2(b + 5) * 8), (r2(b + 9) - 0.5) * 4, wiatr, C.wysoka.slice(0, 3), r2(b + 13) < 0.35 ? C.wysoka[4] : C.wysoka[3]);
        break;
      }
      case "trzcina": {
        const n = 3 + Math.floor(r2(0) * 3);
        for (let b = 0; b < n; b++) {
          const h = 14 + Math.floor(r2(b + 5) * 9), lean = (r2(b + 9) - 0.5) * 3, bx = x - 2 + b * 2;
          zdzblo(o, bx, y, h, lean, wiatr * 1.2, C.trzcina.slice(0, 3), C.trzcina[2]);
          if (r2(b + 20) < 0.6) {
            const tx = bx + Math.round(lean + wiatr * 1.2);
            for (let k = 0; k < 4; k++) ustaw(o, tx, y - h + 1 + k, k === 0 ? C.trzcina[4] : C.trzcina[3]);
          }
        }
        break;
      }
      case "paproc": {
        for (let b = -3; b <= 3; b++) zdzblo(o, x + b, y, 4 + (3 - Math.abs(b)), b * 1.4, wiatr * 0.4, C.paproc.slice(0, 3), C.paproc[3]);
        break;
      }
      case "wrzos": {
        for (let b = -2; b <= 2; b++) zdzblo(o, x + b, y, 3 + (b & 1), b * 0.6, wiatr * 0.3, [C.paproc[0], C.paproc[1]], C.wrzos[1 + (b & 1)]);
        break;
      }
      case "kwiaty": {
        const k = C.kwiaty[Math.floor(r2(0) * C.kwiaty.length)];
        for (let b = 0; b < 3; b++) {
          const bx = x - 2 + b * 2, h = 3 + Math.floor(r2(b + 1) * 3);
          zdzblo(o, bx, y, h, (r2(b + 4) - 0.5) * 2, wiatr * 0.6, [C.trawa[0], C.trawa[1]], k);
          ustaw(o, bx + Math.round((r2(b + 4) - 0.5) * 2 + wiatr * 0.6) + 1, y - h + 1, mieszaj(k, hex("#ffffff"), 0.3));
        }
        break;
      }
      case "kamyk":
      case "glaz": {
        const w = rodzaj2 === "kamyk" ? 2 + Math.floor(r2(0) * 3) : 8 + Math.floor(r2(0) * 8), h = Math.max(2, Math.round(w * 0.65));
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
          const dx = (i + 0.5 - w / 2) / (w / 2), dy = (j + 0.5 - h / 2) / (h / 2);
          if (dx * dx + dy * dy > 1.05) continue;
          const v = -(dx * 0.6 + dy * 0.8) + (hash(i, j, seed) - 0.5) * 0.4;
          const edge = dx * dx + dy * dy > 0.7 && (dy > 0 || dx > 0);
          ustaw(o, x - (w >> 1) + i, y - h + 1 + j, edge && rodzaj2 === "glaz" ? OBRYS : C.kamien[v > 0.4 ? 3 : v > 0 ? 2 : v > -0.4 ? 1 : 0]);
        }
        break;
      }
      case "grzyb": {
        const czerw = r2(0) < 0.3;
        ustaw(o, x, y, C.grzyb[0]);
        ustaw(o, x, y - 1, C.grzyb[0]);
        for (let i = -2; i <= 2; i++) ustaw(o, x + i, y - 2, czerw ? C.grzyb[2] : C.grzyb[1]);
        for (let i = -1; i <= 1; i++) ustaw(o, x + i, y - 3, czerw ? C.grzyb[2] : C.grzyb[1]);
        if (czerw) {
          ustaw(o, x - 1, y - 2, C.grzyb[3]);
          ustaw(o, x + 1, y - 3, C.grzyb[3]);
        }
        break;
      }
    }
  }
  function posiejRuno(x0, y0, w, h, rodzajW2) {
    const out = [];
    const krok = 3, sx = Math.ceil(x0 / krok) * krok, sy = Math.ceil(y0 / krok) * krok;
    for (let y = sy; y < y0 + h; y += krok) for (let x = sx; x < x0 + w; x += krok) {
      const k = rodzajW2(x, y);
      if (!k) continue;
      const hh = hash(x, y, 9), seed = x * 7919 + y * 104729 | 0;
      const wys = szum(x / 60 + 2, y / 60 + 7);
      let r2 = null;
      if (k === "trawa" || k === "park") {
        if (wys > 0.66 && k === "trawa") r2 = hh < 0.16 ? "trawa_wysoka" : hh < 0.2 ? "trawa_niska" : null;
        else r2 = hh < 0.075 ? "trawa_niska" : hh < 0.079 ? "kwiaty" : hh < 0.081 ? "kamyk" : null;
      } else if (k === "laka") r2 = hh < 0.2 ? "trawa_wysoka" : hh < 0.27 ? "trawa_niska" : hh < 0.295 ? "kwiaty" : null;
      else if (k === "zarosla" || k === "mokradlo") r2 = hh < 0.14 ? k === "mokradlo" && hh < 0.06 ? "trzcina" : "trawa_wysoka" : null;
      else if (k === "las_lisciasty") r2 = hh < 0.02 ? "paproc" : hh < 0.024 ? "grzyb" : hh < 0.03 ? "trawa_niska" : null;
      else if (k === "las_iglasty") r2 = hh < 0.012 ? "paproc" : hh < 0.018 ? "wrzos" : hh < 0.021 ? "grzyb" : null;
      else if (k === "cmentarz") r2 = hh < 0.04 ? "trawa_niska" : null;
      if (r2) out.push({ x: x + Math.floor(hash(x, y, 10) * krok), y, rodzaj: r2, seed });
    }
    return out;
  }

  // woda.ts
  var P2 = (a) => a.map(hex);
  var WODA = {
    glebia: P2(["#204a66", "#245170"]),
    srednia: P2(["#25506a", "#2e6380"]),
    plytka: P2(["#3b7892", "#4a8aa2"]),
    plycizna_piasek: P2(["#5e9c9a", "#6eaaa2"]),
    // nad piaskiem: jasna, zielonkawa
    plycizna_mul: P2(["#3e6e62", "#4a7a66"]),
    // przy szuwarach: mętna, zielona
    piana: hex("#9cc6cc"),
    fala: hex("#7fb0bd"),
    blysk: hex("#d4eef2"),
    uskok: hex("#16324a"),
    lilia: P2(["#3f7a3a", "#5a9a48", "#e8e0f0"])
  };
  var LAD = {
    piasek_mokry: P2(["#8f7d55", "#9c8a5e"]),
    piasek: P2(["#b39b69", "#c7ae7b", "#d6bf8d"]),
    mul: P2(["#4a4430", "#5a5236", "#4a5a30"]),
    bujna: P2(["#3a6229", "#45702f", "#527d36"]),
    kamien: P2(["#5e5a60", "#7f7a80", "#a8a2a2", "#3a3540"])
  };
  var TWARDE = ["bruk", "chodnik", "plac", "droga", "parking", "tory", "skala"];
  var DZIKIE = ["mokradlo", "zarosla", "las_lisciasty", "las_iglasty", "laka"];
  function rodzajBrzegu(lad, x, y) {
    if (lad === "piasek") return "plaza";
    if (TWARDE.includes(lad)) return "nabrzeze";
    if (DZIKIE.includes(lad)) return szum(x / 90 + 3, y / 90) > 0.8 ? "plaza" : "szuwary";
    return szum(x / 70 + 11, y / 70 + 5) > 0.5 ? "plaza" : "szuwary";
  }
  var pick2 = (t, v) => t[Math.max(0, Math.min(t.length - 1, Math.floor(v * t.length)))];
  function odlegloscBrzegu(x0, y0, w, h, rodzajW2, M2 = 32) {
    const W = w + 2 * M2, H = h + 2 * M2, n = W * H;
    const woda = new Uint8Array(n);
    let jest = false, sucho = false;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const r2 = rodzajPostrzepiony(rodzajW2, x0 + i - M2, y0 + j - M2);
      if (r2 === "woda") {
        woda[j * W + i] = 1;
        jest = true;
      } else sucho = true;
    }
    if (!jest || !sucho) return { jest, W, H, M: M2, woda, dW: null, dL: null };
    const BIG = 1e4;
    const pas = (cel) => {
      const d = new Float32Array(n);
      for (let k = 0; k < n; k++) d[k] = woda[k] === cel ? BIG : 0;
      const D = Math.SQRT2;
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const k = j * W + i;
        let v = d[k];
        if (!v) continue;
        if (i > 0) v = Math.min(v, d[k - 1] + 1);
        if (j > 0) {
          v = Math.min(v, d[k - W] + 1);
          if (i > 0) v = Math.min(v, d[k - W - 1] + D);
          if (i < W - 1) v = Math.min(v, d[k - W + 1] + D);
        }
        d[k] = v;
      }
      for (let j = H - 1; j >= 0; j--) for (let i = W - 1; i >= 0; i--) {
        const k = j * W + i;
        let v = d[k];
        if (!v) continue;
        if (i < W - 1) v = Math.min(v, d[k + 1] + 1);
        if (j < H - 1) {
          v = Math.min(v, d[k + W] + 1);
          if (i < W - 1) v = Math.min(v, d[k + W + 1] + D);
          if (i > 0) v = Math.min(v, d[k + W - 1] + D);
        }
        d[k] = v;
      }
      for (let k = 0; k < n; k++) if (d[k] > M2) d[k] = M2;
      return d;
    };
    return { jest, W, H, M: M2, woda, dW: pas(1), dL: pas(0) };
  }
  function malujWode(o, x0, y0, rodzajW2) {
    const f = odlegloscBrzegu(x0, y0, o.w, o.h, rodzajW2);
    const trzciny2 = [];
    if (!f.jest || !f.dW || !f.dL) return trzciny2;
    const { W, M: M2, woda, dW, dL } = f;
    const ladObok = (x, y) => {
      for (let r2 = 2; r2 <= 10; r2 += 2) for (const [dx, dy] of [[r2, 0], [-r2, 0], [0, r2], [0, -r2], [r2, r2], [-r2, -r2], [r2, -r2], [-r2, r2]]) {
        const q = rodzajW2(x + dx, y + dy);
        if (q && q !== "woda") return q;
      }
      return "trawa";
    };
    for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) {
      const x = x0 + i, y = y0 + j, k = (j + M2) * W + i + M2, h = hash(x, y, 41), n1 = szum(x / 11, y / 11), n2 = szum(x / 4 + 9, y / 4 + 3);
      if (woda[k]) {
        const d = dW[k] + (n1 - 0.5) * 4;
        const brzeg = d < 8 ? rodzajBrzegu(ladObok(x, y), x, y) : "plaza";
        let c;
        if (d < 1.4) c = bayer(x, y) < 0.7 ? WODA.piana : WODA.fala;
        else if (d < 5) c = pick2(brzeg === "szuwary" ? WODA.plycizna_mul : brzeg === "plaza" ? WODA.plycizna_piasek : WODA.plytka, n2);
        else if (d < 7) c = bayer(x, y) < (d - 5) / 2 ? WODA.plytka[0] : pick2(brzeg === "szuwary" ? WODA.plycizna_mul : WODA.plycizna_piasek, n2);
        else if (d < 13) c = pick2(WODA.plytka, n2 * 0.6 + n1 * 0.4);
        else if (d < 25) c = pick2(WODA.srednia, n2 * 0.6 + n1 * 0.4);
        else c = pick2(WODA.glebia, n2 * 0.5 + n1 * 0.5);
        if (d >= 7 && (y + Math.floor(n1 * 7)) % 6 === 0 && h < 0.45) c = d < 13 ? WODA.piana : d < 25 ? WODA.fala : WODA.plytka[0];
        if (d >= 9 && h > 0.9975) c = WODA.blysk;
        const kN = k - W, kN2 = k - 2 * W;
        if (!woda[kN] || !woda[kN2]) c = brzeg === "nabrzeze" ? WODA.uskok : ciemniej(c);
        if (brzeg === "szuwary" && d > 3 && d < 10 && szum(x / 7, y / 7) > 0.72) {
          const hl = hash(x >> 2, y >> 1, 43);
          if (hl < 0.18) c = hash(x, y, 44) < 0.06 ? WODA.lilia[2] : WODA.lilia[x + y & 1];
        }
        if (brzeg === "szuwary" && d > 1 && d < 4 && hash(x, y, 45) < 0.05) trzciny2.push([x, y]);
        o.px[j * o.w + i] = c;
      } else {
        const dl = dL[k];
        if (dl >= 10) continue;
        const r2 = rodzajPostrzepiony(rodzajW2, x, y);
        if (!r2) continue;
        const b = rodzajBrzegu(r2, x, y), d = dl + (n1 - 0.5) * 3;
        if (b === "plaza") {
          if (d < 2) o.px[j * o.w + i] = pick2(LAD.piasek_mokry, n2);
          else if (d < 6) o.px[j * o.w + i] = h < 0.01 ? LAD.kamien[2] : pick2(LAD.piasek, n1 * 0.5 + n2 * 0.5 + Math.sin((x + y * 0.3) * 0.5 + n1 * 6) * 0.1);
          else if (d < 8 && bayer(x, y) < (8 - d) / 2) o.px[j * o.w + i] = pick2(LAD.piasek, n2);
        } else if (b === "szuwary") {
          if (d < 2.5) o.px[j * o.w + i] = pick2(LAD.mul, n2);
          else if (d < 8) o.px[j * o.w + i] = d < 5 || bayer(x, y) < (8 - d) / 3 ? pick2(LAD.bujna, n2 * 0.7 + h * 0.3) : o.px[j * o.w + i];
          if (d < 6 && hash(x, y, 46) < 0.035) trzciny2.push([x, y]);
        } else {
          if (dl < 1.5) o.px[j * o.w + i] = LAD.kamien[3];
          else if (dl < 4) {
            const kam = hash(Math.floor((x + (Math.floor(y / 3) & 1) * 2) / 4), Math.floor(y / 3), 47);
            o.px[j * o.w + i] = x % 4 === 0 || y % 3 === 0 ? LAD.kamien[0] : mieszaj(LAD.kamien[1], LAD.kamien[2], kam);
          }
        }
      }
    }
    return trzciny2;
  }

  // budynki.ts
  var M = (t, k, wzor) => ({ tony: t.map(hex), krawedz: hex(k), wzor });
  var MATERIALY = {
    dachowka_czerwona: M(["#4e1f1c", "#6e2c24", "#8f3a2c", "#ad5036", "#c86a44"], "#d98a58", "dachowka"),
    dachowka_brazowa: M(["#3e2519", "#563724", "#704a30", "#8a613f", "#a57a52"], "#bf9466", "dachowka"),
    lupek: M(["#1f2130", "#2c2f42", "#3c4256", "#525a70", "#6c7790"], "#c8963e", "lupek"),
    gont: M(["#3a2a1e", "#523c2a", "#6c5038", "#866648", "#a08058"], "#b89468", "gont"),
    blacha_zielona: M(["#1f3a30", "#2c4f40", "#3c6652", "#538068", "#6e9a80"], "#8ab09a", "blacha"),
    miedz_patyna: M(["#24463e", "#356256", "#4a8070", "#66a08c", "#8cc0aa"], "#c8963e", "blacha"),
    papa: M(["#2a2a2e", "#38383e", "#46464c", "#56565c", "#68686e"], "#7a7a80", "gladki"),
    tynk_kremowy: M(["#6e5c4c", "#93806a", "#b5a286", "#cdbd9c", "#e0d4b6"], "#5a4a3c", "gladki"),
    tynk_zolty: M(["#7a6236", "#a08448", "#c2a45c", "#d8bc72", "#e8d08c"], "#5e4a2a", "gladki"),
    tynk_szary: M(["#58565a", "#77747a", "#949098", "#aeaab0", "#c6c2c6"], "#46444a", "gladki"),
    cegla: M(["#4e2723", "#6e362c", "#8a4836", "#a5644a", "#bc7c5c"], "#3a1e1a", "cegla"),
    drewno: M(["#3e2a1c", "#5a3e28", "#765436", "#926c46", "#ae8858"], "#2e2016", "deski"),
    kamien: M(["#4c4848", "#666060", "#807a78", "#9a9490", "#b4aea8"], "#3a3636", "kamien")
  };
  var MOSIADZ = ["#6b4a22", "#9a6420", "#c8963e", "#e9c56a"].map(hex);
  var SZYBA = ["#2a3450", "#56709a"].map(hex);
  var SWIATLO = ["#d9a84a", "#f2d888"].map(hex);
  function budynek(pierscien, op) {
    const H = op.wysokosc, sk = op.skos ?? 0.35;
    const n = pierscien.length / 2;
    const P3 = [];
    for (let i = 0; i < n; i++) P3.push([pierscien[2 * i], pierscien[2 * i + 1]]);
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const [x, y] of P3) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    const x0 = Math.floor(minX) - 2, y0 = Math.floor(minY) - 2, W = Math.ceil(maxX + H * sk) - x0 + 3, Hh = Math.ceil(maxY + H) - y0 + 3;
    const mask = new Uint8Array(W * Hh);
    for (let j = 0; j < Hh; j++) {
      const py = y0 + j + 0.5, xs = [];
      for (let i = 0; i < n; i++) {
        const [ax, ay] = P3[i], [bx, by] = P3[(i + 1) % n];
        if (ay > py !== by > py) xs.push(ax + (py - ay) * (bx - ax) / (by - ay));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x < xs[k + 1] - 0.5; x++) {
        const i = x - x0;
        if (i >= 0 && i < W) mask[j * W + i] = 1;
      }
    }
    const inFP = (x, y) => {
      const i = x - x0, j = y - y0;
      return i >= 0 && j >= 0 && i < W && j < Hh && mask[j * W + i] === 1;
    };
    let area = 0;
    for (let i = 0; i < n; i++) {
      const [ax, ay] = P3[i], [bx, by] = P3[(i + 1) % n];
      area += ax * by - bx * ay;
    }
    const E = P3.map(([ax, ay], i) => {
      const [bx, by] = P3[(i + 1) % n];
      const L2 = Math.hypot(bx - ax, by - ay) || 1;
      const ux = (bx - ax) / L2, uy = (by - ay) / L2;
      const s = area > 0 ? 1 : -1;
      return { ax, ay, ux, uy, L: L2, nx: uy * s, ny: -ux * s };
    });
    const najblizsze = (px, py) => {
      let d1 = 1e9, i1 = 0, d2 = 1e9, i2 = 0;
      E.forEach((e, i) => {
        const t = Math.max(0, Math.min(e.L, (px - e.ax) * e.ux + (py - e.ay) * e.uy));
        const d = Math.hypot(e.ax + e.ux * t - px, e.ay + e.uy * t - py);
        if (d < d1) {
          d2 = d1;
          i2 = i1;
          d1 = d;
          i1 = i;
        } else if (d < d2) {
          d2 = d;
          i2 = i;
        }
      });
      return { d1, i1, d2, i2 };
    };
    const D = MATERIALY[op.dach], S = MATERIALY[op.sciana];
    const o = nowy(W, Hh);
    const kind = new Uint8Array(W * Hh);
    const sOf = new Int16Array(W * Hh);
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) {
      const x = x0 + i, y = y0 + j;
      if (mask[j * W + i]) {
        kind[j * W + i] = 1;
        continue;
      }
      for (let s = 1; s <= H; s++) if (inFP(Math.round(x - s * sk), y - s)) {
        kind[j * W + i] = 2;
        sOf[j * W + i] = s;
        break;
      }
    }
    const K = (i, j) => i < 0 || j < 0 || i >= W || j >= Hh ? 0 : kind[j * W + i];
    let maxD = 0;
    const dd = new Float32Array(W * Hh);
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) if (kind[j * W + i] === 1) {
      const d = najblizsze(x0 + i + 0.5, y0 + j + 0.5).d1;
      dd[j * W + i] = d;
      maxD = Math.max(maxD, d);
    }
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) {
      const k = kind[j * W + i];
      if (!k) continue;
      const x = x0 + i, y = y0 + j;
      let c;
      if (k === 1) {
        const q = najblizsze(x + 0.5, y + 0.5), e = E[q.i1], d = q.d1;
        const lum = -(e.nx * 0.6 + e.ny * 0.8);
        let t = lum > 0.45 ? 4 : lum > 0.05 ? 3 : lum > -0.45 ? 2 : 1;
        const along = (x + 0.5 - e.ax) * e.ux + (y + 0.5 - e.ay) * e.uy;
        switch (D.wzor) {
          case "dachowka":
            if (Math.floor(d) % 3 === 2) t = Math.max(0, t - 1);
            else if (Math.floor(along + Math.floor(d / 3) * 2) % 4 === 0 && d > 1) t = Math.max(0, t - 1);
            break;
          case "lupek":
            if (Math.floor(d) % 2 === 1 || Math.floor(along + Math.floor(d / 2) % 2 * 2 + 400) % 4 === 0) t = Math.max(0, t - 1);
            break;
          case "gont":
            if (Math.floor(d) % 2 === 1 || Math.floor(along + Math.floor(d / 2) % 3) % 3 === 0) t = Math.max(0, t - 1);
            break;
          case "blacha":
            if (Math.floor(along) % 4 === 0) t = Math.min(4, t + 1);
            break;
        }
        c = D.tony[t];
        const ea = E[q.i1], eb = E[q.i2], dot = ea.nx * eb.nx + ea.ny * eb.ny;
        if (Math.abs(q.d1 - q.d2) < 0.75 && d > 1) c = dot < -0.5 ? D.krawedz : D.tony[Math.min(4, t + 1)];
        if (dot > -0.5 && dot < 0.5 && Math.abs(q.d1 - q.d2) < 0.75 && ea.nx * (eb.ax - ea.ax) + ea.ny * (eb.ay - ea.ay) > 0) c = D.tony[0];
        if (K(i - 1, j) === 0 || K(i + 1, j) === 0 || K(i, j - 1) === 0 || K(i, j + 1) === 2) c = OBRYS;
      } else {
        const s = sOf[j * W + i], hh = H - s, px = x - s * sk, py = y - s;
        const q = najblizsze(px + 0.5, py + 0.5), e = E[q.i1];
        let t = e.nx < -0.35 ? 3 : e.nx > 0.35 ? 1 : 2;
        const along = (px - e.ax) * e.ux + (py - e.ay) * e.uy;
        if (S.wzor === "cegla") {
          if (hh % 3 === 0 || Math.floor(along + Math.floor(hh / 3) % 2 * 2) % 4 === 0 && hash(Math.floor(along), hh, 7) < 0.6) t = Math.max(0, t - 1);
        } else if (S.wzor === "deski") {
          if (Math.floor(along) % 3 === 0) t = Math.max(0, t - 1);
        } else if (S.wzor === "kamien") {
          if (hh % 4 === 0 || Math.floor(along + Math.floor(hh / 4) % 2 * 3) % 6 === 0) t = Math.max(0, t - 1);
        } else if (hash(x, y, op.seed) < 0.1) t = Math.min(4, t + 1);
        c = S.tony[t];
        let okno = false;
        const pietra = H >= 14 ? 2 : 1;
        for (let f = 0; f < pietra; f++) {
          const lo = 3 + f * 7, m = Math.floor(along + op.seed % 5) % 7;
          if (hh >= lo && hh <= lo + 3 && m >= 2 && m <= 4 && along > 3 && along < e.L - 3) {
            const id = Math.floor((along + op.seed % 5) / 7) * 3 + f, swieci = !!op.noc && hash(id, f, op.seed) < 0.45;
            c = swieci ? hh === lo + 3 || m === 2 ? SWIATLO[1] : SWIATLO[0] : hh === lo + 3 && m === 2 ? SZYBA[1] : SZYBA[0];
            okno = true;
          }
          if (hh === lo - 1 && m >= 2 && m <= 4 && along > 3 && along < e.L - 3) c = S.tony[4];
        }
        if (op.drzwi) {
          const [dx, dy] = op.drzwi;
          const dq = najblizsze(dx, dy);
          if (dq.i1 === q.i1) {
            const da = (dx - e.ax) * e.ux + (dy - e.ay) * e.uy;
            if (Math.abs(along - da) <= 2 && hh <= 6) {
              c = hh === 6 || Math.abs(along - da) > 1.5 ? hex("#3a2416") : hex("#6a4426");
              okno = true;
            }
          }
        }
        if (op.rura && e.ny > 0.5 && e.L > 14) {
          const ra = e.L - 4;
          if (along >= ra && along < ra + 2) {
            c = MOSIADZ[along < ra + 1 ? 3 : 1];
            if (hh % 5 === 2) c = MOSIADZ[0];
            okno = true;
          }
        }
        if (!okno && K(i, j - 1) === 1) c = S.tony[0];
        if (hh === 0) c = S.tony[0];
        if (K(i - 1, j) === 0 || K(i + 1, j) === 0 || K(i, j + 1) === 0) c = OBRYS;
      }
      o.px[j * W + i] = c;
    }
    if (op.komin && maxD > 6) {
      let best = -1, bx = 0, by = 0;
      for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) if (kind[j * W + i] === 1 && dd[j * W + i] > 3 && dd[j * W + i] < maxD - 1.5) {
        const sc = -Math.abs(i - W * 0.4) - Math.abs(j - Hh * 0.3) + hash(i, j, op.seed) * 6;
        if (sc > best) {
          best = sc;
          bx = i;
          by = j;
        }
      }
      const C2 = MATERIALY.cegla.tony;
      for (let j = -5; j <= 0; j++) for (let i = 0; i < 4; i++) {
        const c = j === -5 ? OBRYS : i === 0 ? C2[3] : i === 3 ? C2[1] : j === -4 ? C2[0] : C2[2];
        const yy = by + j, xx = bx + i;
        if (yy >= 0 && xx < W) o.px[yy * W + xx] = (i === 0 || i === 3) && j > -5 ? mieszaj(c, OBRYS, i === 3 ? 0.5 : 0) : c;
      }
    }
    return { obraz: o, x0, y0 };
  }
  function cienBudynku(pierscien, wysokosc, maska, mw, mh, mx, my) {
    const n = pierscien.length / 2;
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (let i = 0; i < n; i++) {
      minX = Math.min(minX, pierscien[2 * i]);
      maxX = Math.max(maxX, pierscien[2 * i]);
      minY = Math.min(minY, pierscien[2 * i + 1]);
      maxY = Math.max(maxY, pierscien[2 * i + 1]);
    }
    const x0 = Math.floor(minX), y0 = Math.floor(minY), W = Math.ceil(maxX) - x0 + 1, H = Math.ceil(maxY) - y0 + 1;
    const fp = new Uint8Array(W * H);
    for (let j = 0; j < H; j++) {
      const py = y0 + j + 0.5, xs = [];
      for (let i = 0; i < n; i++) {
        const ax = pierscien[2 * i], ay = pierscien[2 * i + 1], bx = pierscien[(2 * i + 2) % (2 * n)], by = pierscien[(2 * i + 3) % (2 * n)];
        if (ay > py !== by > py) xs.push(ax + (py - ay) * (bx - ax) / (by - ay));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x < xs[k + 1] - 0.5; x++) {
        const i = x - x0;
        if (i >= 0 && i < W) fp[j * W + i] = 1;
      }
    }
    const Hs = Math.round(wysokosc * 0.9);
    for (let k = 1; k <= Hs; k++) {
      const dx = k, dy = Math.round(k * 0.5);
      for (let j = 0; j < H; j++) {
        const yy = y0 + j + dy - my;
        if (yy < 0 || yy >= mh) continue;
        for (let i = 0; i < W; i++) {
          if (!fp[j * W + i]) continue;
          const xx = x0 + i + dx - mx;
          if (xx >= 0 && xx < mw) maska[yy * mw + xx] = 1;
        }
      }
    }
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (fp[j * W + i]) {
      const yy = y0 + j - my, xx = x0 + i - mx;
      if (xx >= 0 && yy >= 0 && xx < mw && yy < mh) maska[yy * mw + xx] = 0;
    }
  }
  var KATY_PIKSELOWE = [0, 26.565, 45, 63.435, 90, 116.565, 135, 153.435];
  function przyciagnij(pierscien, opcje = {}) {
    const katy = opcje.katy ?? KATY_PIKSELOWE, siatka = opcje.siatka ?? 4, n = pierscien.length / 2;
    let cx = 0, cy = 0;
    for (let i = 0; i < n; i++) {
      cx += pierscien[2 * i];
      cy += pierscien[2 * i + 1];
    }
    cx /= n;
    cy /= n;
    let best = -1, ang = 0;
    for (let i = 0; i < n; i++) {
      const dx = pierscien[(2 * i + 2) % (2 * n)] - pierscien[2 * i], dy = pierscien[(2 * i + 3) % (2 * n)] - pierscien[2 * i + 1];
      const L2 = dx * dx + dy * dy;
      if (L2 > best) {
        best = L2;
        ang = Math.atan2(dy, dx);
      }
    }
    let deg = (ang * 180 / Math.PI % 180 + 180) % 180, cel = katy[0], bd = 999;
    for (const k of katy.concat([180])) {
      const d = Math.abs(deg - k);
      if (d < bd) {
        bd = d;
        cel = k % 180;
      }
    }
    const delta = (cel - deg) * Math.PI / 180, co = Math.cos(delta), si = Math.sin(delta);
    const out = [];
    for (let i = 0; i < n; i++) {
      const x = pierscien[2 * i] - cx, y = pierscien[2 * i + 1] - cy;
      out.push(cx + x * co - y * si, cy + x * si + y * co);
    }
    if (!opcje.prostokat) return out;
    const a = cel * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (let i = 0; i < n; i++) {
      const x = out[2 * i] - cx, y = out[2 * i + 1] - cy, u = x * ux + y * uy, v = x * vx + y * vy;
      u0 = Math.min(u0, u);
      u1 = Math.max(u1, u);
      v0 = Math.min(v0, v);
      v1 = Math.max(v1, v);
    }
    const W = Math.max(siatka * 2, Math.round((u1 - u0) / siatka) * siatka), H = Math.max(siatka * 2, Math.round((v1 - v0) / siatka) * siatka);
    const mu = (u0 + u1) / 2, mv = (v0 + v1) / 2;
    const P3 = [[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]];
    return P3.flatMap(([u, v]) => [cx + (mu + u) * ux + (mv + v) * vx, cy + (mu + u) * uy + (mv + v) * vy]);
  }

  // steampunk.ts
  var MOS = ["#4a3216", "#6b4a22", "#9a6420", "#c8963e", "#e9c56a"].map(hex);
  var ZEL = ["#2a2630", "#3a3440", "#55505c"].map(hex);
  var CZERW = hex("#b2453a");
  var BIEL = hex("#ece6d6");
  function modulRury(k, dodatek) {
    const o = nowy(8, 8);
    const poz = (x, y) => ustaw(o, x, y, y === 2 ? MOS[1] : y === 3 ? MOS[4] : y === 4 ? MOS[3] : MOS[2]);
    const pion = (x, y) => ustaw(o, x, y, x === 2 ? MOS[4] : x === 3 ? MOS[3] : x === 4 ? MOS[2] : MOS[1]);
    for (let y = 2; y <= 5; y++) for (let x = 2; x <= 5; x++) (k.e || k.w) && !(k.n || k.s) ? poz(x, y) : pion(x, y);
    if (k.w) for (let x = 0; x < 2; x++) for (let y = 2; y <= 5; y++) poz(x, y);
    if (k.e) for (let x = 6; x < 8; x++) for (let y = 2; y <= 5; y++) poz(x, y);
    if (k.n) for (let y = 0; y < 2; y++) for (let x = 2; x <= 5; x++) pion(x, y);
    if (k.s) for (let y = 6; y < 8; y++) for (let x = 2; x <= 5; x++) pion(x, y);
    const o2 = o.px.slice();
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      if (!(o.px[y * 8 + x] >>> 24)) continue;
      const pusty = (xx, yy) => xx >= 0 && yy >= 0 && xx < 8 && yy < 8 && !(o.px[yy * 8 + xx] >>> 24);
      if (pusty(x + 1, y) || pusty(x, y + 1) || pusty(x - 1, y) || pusty(x, y - 1)) o2[y * 8 + x] = MOS[0];
    }
    o.px.set(o2);
    if (dodatek === "kolnierz") {
      for (let i = 1; i <= 6; i++) {
        if (k.e || k.w) ustaw(o, 4, i, MOS[1]);
        else ustaw(o, i, 4, MOS[1]);
      }
    }
    if (dodatek === "zawor") {
      for (let i = 2; i <= 5; i++) {
        ustaw(o, i, 0, CZERW);
        ustaw(o, i, 2, CZERW);
      }
      ustaw(o, 2, 1, CZERW);
      ustaw(o, 5, 1, CZERW);
      ustaw(o, 3, 1, ZEL[1]);
      ustaw(o, 4, 1, ZEL[1]);
    }
    if (dodatek === "manometr") {
      for (let y = 0; y <= 3; y++) for (let x = 2; x <= 5; x++) ustaw(o, x, y, x === 2 || x === 5 || y === 0 || y === 3 ? MOS[0] : BIEL);
      ustaw(o, 4, 1, OBRYS);
    }
    if (dodatek === "podpora") {
      for (let y = 6; y < 8; y++) {
        ustaw(o, 2, y, ZEL[2]);
        ustaw(o, 5, y, ZEL[0]);
      }
    }
    return o;
  }
  function rurociag(o, komorki, ox, oy, seed) {
    const set = new Set(komorki.map(([x, y]) => `${x},${y}`));
    komorki.forEach(([cx, cy], i) => {
      const k = { n: set.has(`${cx},${cy - 1}`), s: set.has(`${cx},${cy + 1}`), e: set.has(`${cx + 1},${cy}`), w: set.has(`${cx - 1},${cy}`) };
      const prosty = k.e && k.w && !k.n && !k.s || k.n && k.s && !k.e && !k.w;
      const h = hash(cx, cy, seed);
      const dod = prosty && h < 0.12 ? "zawor" : prosty && h < 0.2 ? "manometr" : prosty && i % 3 === 0 ? "podpora" : prosty && h > 0.8 ? "kolnierz" : void 0;
      const m = modulRury(k, dod);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const c = m.px[y * 8 + x];
        if (c >>> 24) ustaw(o, cx * 8 + x - ox, cy * 8 + y - oy, c);
      }
    });
  }
  function para(rozmiar, klatka, seed = 0) {
    const o = nowy(rozmiar, rozmiar), t = klatka / 5;
    const kul = [[0.5, 0.8, 0.22], [0.38, 0.62, 0.2], [0.62, 0.6, 0.2], [0.5, 0.45, 0.24]];
    for (let y = 0; y < rozmiar; y++) for (let x = 0; x < rozmiar; x++) {
      let v = 0;
      for (const [kx, ky, kr] of kul) {
        const cx = kx * rozmiar, cy = (ky - t * 0.35) * rozmiar, r2 = kr * rozmiar * (0.55 + t * 0.7);
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r2;
        v = Math.max(v, 1 - d);
      }
      v -= t * 0.35 + (hash(x, y, seed + klatka) - 0.5) * 0.25;
      if (v <= 0) continue;
      const a = v > 0.45 ? 255 : v > 0.22 ? 150 : 75;
      ustaw(o, x, y, rgb(241 - (y > rozmiar * 0.6 ? 18 : 0), 237 - (y > rozmiar * 0.6 ? 18 : 0), 228, a));
    }
    return o;
  }
  function tor(o, pts, ox, oy) {
    const seg = [];
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const dx = pts[i + 2] - pts[i], dy = pts[i + 3] - pts[i + 1], L2 = Math.hypot(dx, dy);
      if (L2 > 0) seg.push({ ax: pts[i], ay: pts[i + 1], ux: dx / L2, uy: dy / L2, L: L2 });
    }
    const put = (x, y, c) => ustaw(o, Math.round(x - ox), Math.round(y - oy), c);
    const podsyp = [hex("#6c6660"), hex("#7c756d"), hex("#8c847a")], drewno = [hex("#5a3e28"), hex("#765436")];
    for (const pass of [0, 1, 2]) {
      let s0 = 0;
      for (const g of seg) {
        for (let t = 0; t < g.L; t += 0.5) {
          const x = g.ax + g.ux * t, y = g.ay + g.uy * t, nx = -g.uy, ny = g.ux, s = s0 + t;
          if (pass === 0) for (let k = -7; k <= 7; k += 0.5) put(x + nx * k, y + ny * k, podsyp[Math.floor(hash(Math.round(x + nx * k), Math.round(y + ny * k), 3) * 3)]);
          if (pass === 1 && Math.floor(s) % 4 === 0) for (let k = -5; k <= 5; k += 0.5) {
            put(x + nx * k, y + ny * k, drewno[1]);
            put(x + nx * k + g.ux, y + ny * k + g.uy, drewno[0]);
          }
          if (pass === 2) {
            put(x + nx * -3, y + ny * -3, ZEL[1]);
            put(x + nx * 3, y + ny * 3, ZEL[1]);
            put(x + nx * -2, y + ny * -2, hex("#aaaab8"));
            put(x + nx * 4, y + ny * 4, ZEL[0]);
          }
        }
        s0 += g.L;
      }
    }
  }

  // demo/demo.ts
  var czasy = {};
  var mierz = (n, f) => {
    const t = performance.now();
    const r2 = f();
    czasy[n] = Math.round((performance.now() - t) * 10) / 10;
    return r2;
  };
  var pokaz = (tytul, o, skala) => {
    const d = document.createElement("div");
    d.innerHTML = `<h3>${tytul}</h3>`;
    const c = doCanvas(o);
    c.style.width = o.w * skala + "px";
    c.style.imageRendering = "pixelated";
    c.style.background = "#4a7433";
    d.appendChild(c);
    document.body.appendChild(d);
  };
  var atlas = mierz("drzewa_wszystkie_gatunki_x3_z_wiatrem", () => {
    const lista = [];
    for (const g of Object.keys(GATUNKI)) for (let v = 0; v < 3; v++) {
      const d = drzewo(g, 1e3 + v * 77 + g.length * 13);
      lista.push({ g, d, w: klatkiWiatru(d.korona, d.koronaGora, d.koronaDol, GATUNKI[g].sztywnosc) });
    }
    return lista;
  });
  {
    const W = 72, H = 80, kol = 9;
    const o = nowy(W * kol, H * Math.ceil(atlas.length / kol));
    atlas.forEach((a, i) => {
      const x = i % kol * W, y = Math.floor(i / kol) * H;
      const ox = x + (W - a.d.korona.w) / 2 | 0, oy = y + H - a.d.korona.h;
      naloz(o, a.d.pien, ox, oy);
      naloz(o, a.d.korona, ox, oy);
      if (a.d.owoce) naloz(o, a.d.owoce, ox, oy);
    });
    pokaz("Drzewa: ka\u017Cdy gatunek w 3 wariantach (skala 0,6)", o, 3);
    const o2 = nowy(60 * 5 + 40, 70 * 2);
    const dab = atlas.find((a) => a.g === "dab");
    [dab.d.pien, dab.d.pienZacios, dab.d.pieniek, dab.d.sadzonka].forEach((p, i) => naloz(o2, p, i * 60, 0));
    naloz(o2, dab.d.pien, 4 * 60, 0);
    naloz(o2, dab.d.korona, 4 * 60, 0);
    dab.w.forEach((f, i) => {
      naloz(o2, dab.d.pien, i * 68 + 6, 70);
      naloz(o2, f, i * 68, 70);
    });
    pokaz("D\u0105b: pie\u0144, pie\u0144 z zaciosem, pieniek, sadzonka, ca\u0142o\u015B\u0107; ni\u017Cej 5 klatek wiatru", o2, 3);
  }
  var N = 1024;
  var droga = [0, 700, 300, 600, 600, 520, 1024, 380];
  var distDroga = (x, y) => {
    let m = 1e9;
    for (let i = 0; i + 3 < droga.length; i += 2) {
      const ax = droga[i], ay = droga[i + 1], bx = droga[i + 2], by = droga[i + 3], dx = bx - ax, dy = by - ay;
      let t = ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy);
      t = Math.max(0, Math.min(1, t));
      m = Math.min(m, Math.hypot(ax + t * dx - x, ay + t * dy - y));
    }
    return m;
  };
  var rodzaj = (x, y) => {
    if (Math.hypot(x - 780, y - 820) < 120 + 10 * Math.sin(Math.atan2(y - 820, x - 780) * 5)) return "woda";
    if (distDroga(x, y) < 11) return "bruk";
    if (distDroga(x, y) < 17) return "chodnik";
    if (x < 360 + 30 * Math.sin(y * 0.02) && y > 40) return y < 500 ? "las_iglasty" : "las_lisciasty";
    if (x > 600 && y < 300 && x < 760) return "plac";
    if (y > 760 && x < 600) return "laka";
    return "trawa";
  };
  var chunk = nowy(N, N);
  var mapa = new Uint8Array(N * N);
  var R = ["trawa", "laka", "park", "las_lisciasty", "las_iglasty", "bruk", "chodnik", "plac", "droga", "piasek", "woda"];
  mierz("mapa_rodzajow_1024 (w grze: wype\u0142nienie obszar\xF3w OSM)", () => {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) mapa[y * N + x] = R.indexOf(rodzaj(x, y));
  });
  var rodzajW = (x, y) => x < 0 || y < 0 || x >= N || y >= N ? null : R[mapa[y * N + x]];
  var budynki = [];
  var r = rng(5);
  for (let i = 0; i < 40 && budynki.length < 24; i++) {
    const cx = 420 + r() * 560, cy = 60 + r() * 400, w = 34 + r() * 46, h = 26 + r() * 26, a = (r() - 0.5) * 1.6;
    if (distDroga(cx, cy) < 60 || cx > 600 && cy < 300 && cx < 760) continue;
    if (budynki.some((b) => Math.hypot(b.p[0] - cx, b.p[1] - cy) < 90)) continue;
    const co = Math.cos(a), si = Math.sin(a);
    const pts = i % 4 === 0 ? [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, 0], [0, 0], [0, h / 2 + 16], [-w / 2, h / 2 + 16]] : [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    const p = [];
    pts.forEach(([u, v]) => p.push(cx + u * co - v * si, cy + u * si + v * co));
    const dachy = ["dachowka_czerwona", "dachowka_brazowa", "lupek", "gont", "miedz_patyna"], sciany = ["tynk_kremowy", "cegla", "tynk_zolty", "kamien", "drewno"];
    budynki.push({ p: przyciagnij(p), h: [8, 12, 16][i % 3], dach: dachy[i % 5], sciana: sciany[i * 3 % 5], seed: i * 31 });
  }
  czasy["budynkow"] = budynki.length;
  var cienie = new Uint8Array(N * N);
  mierz("cienie_budynkow", () => budynki.forEach((b) => cienBudynku(b.p, b.h, cienie, N, N, 0, 0)));
  mierz("podloze_1024_z_cieniami", () => malujPodloze(chunk, 0, 0, rodzajW, cienie));
  mierz("obwodka_drog", () => obwodka(chunk, 0, 0, rodzajW, "trawa", ["chodnik", "bruk"]));
  mierz("tor", () => tor(chunk, [0, 980, 400, 960, 700, 1e3, 1024, 940], 0, 0));
  var trzciny = mierz("woda_glebia_i_brzegi", () => malujWode(chunk, 0, 0, rodzajW));
  mierz("runo_rozsypane", () => {
    const k = posiejRuno(0, 0, N, N, rodzajW);
    k.forEach((q) => runo(chunk, q.x, q.y, q.rodzaj, q.seed));
    czasy["runo_sztuk"] = k.length;
  });
  mierz("trzciny", () => {
    trzciny.sort((a, b) => a[1] - b[1]).forEach(([x, y]) => runo(chunk, x, y, "trzcina", x * 31 + y));
    czasy["trzcin_sztuk"] = trzciny.length;
  });
  mierz("budynki_wszystkie", () => {
    budynki.forEach((b, i) => {
      const g = budynek(b.p, { wysokosc: b.h, dach: b.dach, sciana: b.sciana, seed: b.seed, rura: i % 3 === 0, komin: i % 2 === 0, noc: false });
      naloz(chunk, g.obraz, g.x0, g.y0);
    });
  });
  mierz("rurociag", () => {
    const k = [];
    let x = 50, y = 70;
    for (let i = 0; i < 44; i++) {
      k.push([x, y]);
      if (i < 18) x++;
      else if (i < 28) y++;
      else x++;
    }
    rurociag(chunk, k, 0, 0, 3);
  });
  mierz("drzewa_w_lesie", () => {
    const pos = [];
    const rr = rng(9);
    for (let i = 0; i < 9e3 && pos.length < 420; i++) {
      const x = 20 + rr() * 340, y = 60 + rr() * 900;
      if (!(rodzajW(x | 0, y | 0) || "").startsWith("las")) continue;
      if (pos.some(([a, b]) => Math.hypot(a - x, (b - y) * 1.3) < 24)) continue;
      const g = y < 500 ? rr() < 0.6 ? "sosna" : "swierk" : ["dab", "buk", "brzoza", "olcha"][Math.floor(rr() * 4)];
      pos.push([x, y, g]);
    }
    pos.sort((a, b) => a[1] - b[1]);
    for (const [x, y, g] of pos) {
      const v = atlas.filter((a) => a.g === g)[Math.floor(hash(x | 0, y | 0, 1) * 3)];
      const d = v.d;
      const ox = x - d.kotwica[0] | 0, oy = y - d.kotwica[1] | 0;
      const rx = d.korona.w * 0.45, ry = 6;
      for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) {
        if ((i / rx) ** 2 + (j / ry) ** 2 > 1) continue;
        const xx = x + i + rx * 0.4 | 0, yy = y + j - 2 | 0;
        if (xx >= 0 && yy >= 0 && xx < N && yy < N) chunk.px[yy * N + xx] = ciemniej(chunk.px[yy * N + xx]);
      }
      naloz(chunk, d.pien, ox, oy);
      naloz(chunk, d.korona, ox, oy);
    }
    czasy["drzew_w_lesie"] = pos.length;
  });
  var para_kl = mierz("para_3_rozmiary_x6", () => [16, 24, 32].flatMap((s) => [0, 1, 2, 3, 4, 5].map((k) => para(s, k))));
  pokaz("Kawa\u0142ek mapy 1024\xD71024 (1:1)", chunk, 1);
  var crop = (x, y, w, h) => {
    const o = nowy(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) o.px[j * w + i] = chunk.px[(y + j) * N + x + i];
    return o;
  };
  pokaz("Zbli\u017Cenie: las", crop(100, 360, 320, 200), 3);
  pokaz("Zbli\u017Cenie: miasto", crop(560, 60, 360, 260), 3);
  pokaz("Zbli\u017Cenie: \u0142\u0105ka, staw (g\u0142\u0119bia, pla\u017Ca, szuwary), tor", crop(560, 640, 440, 360), 3);
  pokaz("Zbli\u017Cenie: chodnik i trawa", crop(420, 440, 340, 220), 3);
  {
    const o = nowy(32 * 6, 32 * 3);
    para_kl.forEach((p, i) => naloz(o, p, i % 6 * 32, Math.floor(i / 6) * 32));
    pokaz("Para: 3 rozmiary \xD7 6 klatek", o, 3);
  }
  window.__czasy = czasy;
  var pre = document.createElement("pre");
  pre.textContent = JSON.stringify(czasy, null, 1);
  document.body.prepend(pre);
})();
