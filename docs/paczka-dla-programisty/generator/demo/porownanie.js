"use strict";
(() => {
  // ../../../../../../home/claude/erpeg/docs/paczka-dla-programisty/generator/wspolne.ts
  var nowy = (w, h) => ({ w, h, px: new Uint32Array(w * h) });
  var cl = (v) => v < 0 ? 0 : v > 255 ? 255 : v | 0;
  var rgb = (r, g, b, a = 255) => (cl(a) << 24 | cl(b) << 16 | cl(g) << 8 | cl(r)) >>> 0;
  var hex = (h) => rgb(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16));
  var skladowe = (c) => [c & 255, c >>> 8 & 255, c >>> 16 & 255];
  var alfa = (c) => c >>> 24;
  var ciemniej = (c) => {
    const [r, g, b] = skladowe(c);
    return rgb(r * 0.6 + 6, g * 0.64 + 8, b * 0.76 + 24, alfa(c));
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
    const r = rng(7);
    for (let i = 0; i < NT.length; i++) NT[i] = r();
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

  // ../../../../../../home/claude/erpeg/docs/paczka-dla-programisty/generator/drzewa.ts
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
  function korona(g, w, h, cx, cy, r, seed) {
    const R2 = rng(seed);
    const o = nowy(w, h);
    const own = new Int16Array(w * h).fill(-1);
    const val = new Float32Array(w * h);
    const P2 = g.paleta.map(hex);
    let ks = [];
    if (g.ksztalt === "pietra") {
      const n = g.kepy, ry = Math.max(4, r * 0.32), krok = r * 2.6 / n;
      for (let i = n - 1; i >= 0; i--) ks.push({ x: cx, y: cy + r * 0.9 - i * krok, rx: Math.max(3, r * (1 - i / (n + 0.4))), ry, tier: i });
    } else if (g.ksztalt === "kolumna") {
      for (let i = 0; i < 5; i++) ks.push({ x: cx + (R2() - 0.5) * 2, y: cy - r * 1.4 + i * r * 0.7, rx: r * (0.75 + 0.15 * Math.sin(i)), ry: r * 0.75 });
    } else {
      const fy = g.fy;
      ks.push({ x: cx, y: cy, rx: r * 0.62, ry: r * 0.62 * fy });
      for (let i = 0; i < g.kepy; i++) {
        const a = i / g.kepy * Math.PI * 2 + R2() * 0.5, rr = r * (0.3 + R2() * 0.16), d = r - rr;
        ks.push({ x: cx + Math.cos(a) * d * 0.96, y: cy + Math.sin(a) * d * fy, rx: rr, ry: rr * Math.max(0.75, Math.min(1.15, fy)) });
      }
      for (let i = 0; i < Math.round(g.kepy / 2); i++) {
        const a = R2() * Math.PI * 2, rr = r * (0.26 + R2() * 0.12), d = r * 0.4 * R2();
        ks.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * fy - r * 0.15, rx: rr, ry: rr * Math.min(1.1, fy) });
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
        if (c.tier === void 0) v -= (py - cy) / r * 0.32 + 0.12;
        val[k] = v;
      }
    }
    if (g.ksztalt === "zwisajaca") {
      for (let x = Math.floor(cx - r * 0.95); x < cx + r * 0.95; x += 2) {
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
      o.px[k] = P2[t];
    }
    if (g.kwiaty) {
      const K = hex(g.kwiaty);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (own[y * w + x] >= 0 && hash(x, y, seed + 21) < 0.05 && val[y * w + x] > -0.3) o.px[y * w + x] = K;
    }
    obrysuj(o, OBRYS, () => P2[0]);
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
      const W2 = DREWNO.map(hex), y0 = dol - 11;
      for (let j = 0; j < 6; j++) {
        const szer = Math.max(1, Math.round(Math.min(j + 1, 6 - j) * 0.8 * Math.min(1, tw / 6)) + 1);
        for (let i = 0; i < szer; i++) ustaw(o, x0 + i, y0 + j, j === 0 ? W2[3] : j === 5 ? W2[0] : i === szer - 1 ? W2[1] : W2[2]);
      }
    }
    obrysuj(o, OBRYS, (c) => c);
    return o;
  }
  function pieniek(g, w, h, cx, seed) {
    const o = nowy(w, h);
    if (!g.kora) return o;
    const K = KORA[g.kora].map(hex), W2 = DREWNO.map(hex), tw = g.pienW + 2, x0 = Math.round(cx - tw / 2), dol = h - 1;
    for (let y = dol - 4; y <= dol; y++) for (let i = 0; i < tw; i++) ustaw(o, x0 + i, y, K[i === 0 ? 3 : i === tw - 1 ? 0 : 2]);
    for (let i = 0; i < tw; i++) for (let j = 0; j < 3; j++) {
      const dx = (i - (tw - 1) / 2) / (tw / 2), dy = (j - 1) / 1.6, d = Math.sqrt(dx * dx + dy * dy);
      if (d <= 1.05) ustaw(o, x0 + i, dol - 7 + j, d < 0.35 ? W2[0] : d < 0.7 ? W2[2] : W2[1]);
    }
    obrysuj(o, OBRYS, (c) => c);
    return o;
  }
  var SKALA_DRZEW = 0.6;
  function drzewo(nazwa, seed, skala = SKALA_DRZEW) {
    const g0 = GATUNKI[nazwa];
    const g = skala === 1 ? g0 : { ...g0, plotno: [Math.round(g0.plotno[0] * skala), Math.round(g0.plotno[1] * skala)], r: g0.r * skala, pienH: Math.round(g0.pienH * skala), pienW: Math.max(g0.pienW ? 2 : 0, Math.round(g0.pienW * skala)), kepy: Math.max(g0.ksztalt === "pietra" ? 4 : 6, Math.round(g0.kepy * (0.5 + skala / 2))) };
    const [w, h] = g.plotno, R2 = rng(seed);
    const r = g.r * (0.92 + R2() * 0.12);
    const cx = w / 2;
    const kepy = g.ksztalt === "pietra";
    const cy = kepy ? h - g.pienH - r * 1.25 : g.ksztalt === "kolumna" ? h - r * 2.3 : h - g.pienH - r * g.fy * 0.85;
    const k = korona(g, w, h, cx, cy, r, seed);
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

  // ../../../../../../home/claude/erpeg/docs/paczka-dla-programisty/generator/podloze.ts
  var P = (a) => a.map(hex);
  var T = {
    trawa: P(["#4a7433", "#558039", "#628d40", "#70994a"]),
    laka: P(["#5a8238", "#6a9441", "#7ba54b", "#93b75a"]),
    park: P(["#456f33", "#507b38", "#5c873e", "#678f44"]),
    liscie: P(["#3b4f2a", "#46592d", "#566233", "#6b5a34", "#7d6538"]),
    igly: P(["#3d3d26", "#4a4529", "#5a4c2c", "#6b5530", "#45552e"]),
    bruk: P(["#5b5560", "#6e6872", "#807a83", "#938d94", "#3a3540"]),
    chodnik: P(["#8d8679", "#9c9587", "#aaa394", "#6e675c"]),
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
  function kolorPodloza(r, x, y) {
    const n1 = szum(x / 9, y / 9), n2 = szum(x / 3.3 + 20, y / 3.3 + 7), h = hash(x, y, 1);
    const mix = n1 * 0.55 + n2 * 0.35 + h * 0.25 - 0.08;
    switch (r) {
      case "trawa":
        return pick(T.trawa, mix);
      case "park":
        return pick(T.park, mix * 0.9 + 0.05);
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
      case "chodnik": {
        if ((x & 15) === 15 || (y & 15) === 15) return T.chodnik[3];
        return pick(T.chodnik.slice(0, 3), hash(x >> 4, y >> 4, 4) * 0.6 + n2 * 0.4);
      }
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
      const jx = Math.round((hash(x, y, 31) - 0.5) * 3), jy = Math.round((hash(x, y, 32) - 0.5) * 3);
      const r = rodzajW2(x + jx, y + jy) ?? rodzajW2(x, y);
      if (!r) continue;
      let c = kolorPodloza(r, x, y);
      if (cien && cien[j * o.w + i]) c = ciemniej(c);
      o.px[j * o.w + i] = c;
    }
  }

  // ../../../../../../home/claude/erpeg/docs/paczka-dla-programisty/generator/runo.ts
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
  function runo(o, x, y, rodzaj, seed, wiatr = 0) {
    const r = (k) => hash(seed, k, 77);
    switch (rodzaj) {
      case "trawa_niska": {
        const n = 3 + Math.floor(r(0) * 3);
        for (let b = 0; b < n; b++) zdzblo(o, x - 2 + b + Math.floor(r(b + 1) * 2), y, 3 + Math.floor(r(b + 5) * 4), (r(b + 9) - 0.5) * 3, wiatr * 0.6, C.trawa.slice(0, 3), C.trawa[3]);
        break;
      }
      case "trawa_wysoka": {
        const n = 4 + Math.floor(r(0) * 4);
        for (let b = 0; b < n; b++) zdzblo(o, x - 3 + b + Math.floor(r(b + 1) * 2), y, 8 + Math.floor(r(b + 5) * 8), (r(b + 9) - 0.5) * 4, wiatr, C.wysoka.slice(0, 3), r(b + 13) < 0.35 ? C.wysoka[4] : C.wysoka[3]);
        break;
      }
      case "trzcina": {
        const n = 3 + Math.floor(r(0) * 3);
        for (let b = 0; b < n; b++) {
          const h = 14 + Math.floor(r(b + 5) * 9), lean = (r(b + 9) - 0.5) * 3, bx = x - 2 + b * 2;
          zdzblo(o, bx, y, h, lean, wiatr * 1.2, C.trzcina.slice(0, 3), C.trzcina[2]);
          if (r(b + 20) < 0.6) {
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
        const k = C.kwiaty[Math.floor(r(0) * C.kwiaty.length)];
        for (let b = 0; b < 3; b++) {
          const bx = x - 2 + b * 2, h = 3 + Math.floor(r(b + 1) * 3);
          zdzblo(o, bx, y, h, (r(b + 4) - 0.5) * 2, wiatr * 0.6, [C.trawa[0], C.trawa[1]], k);
          ustaw(o, bx + Math.round((r(b + 4) - 0.5) * 2 + wiatr * 0.6) + 1, y - h + 1, mieszaj(k, hex("#ffffff"), 0.3));
        }
        break;
      }
      case "kamyk":
      case "glaz": {
        const w = rodzaj === "kamyk" ? 2 + Math.floor(r(0) * 3) : 8 + Math.floor(r(0) * 8), h = Math.max(2, Math.round(w * 0.65));
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
          const dx = (i + 0.5 - w / 2) / (w / 2), dy = (j + 0.5 - h / 2) / (h / 2);
          if (dx * dx + dy * dy > 1.05) continue;
          const v = -(dx * 0.6 + dy * 0.8) + (hash(i, j, seed) - 0.5) * 0.4;
          const edge = dx * dx + dy * dy > 0.7 && (dy > 0 || dx > 0);
          ustaw(o, x - (w >> 1) + i, y - h + 1 + j, edge && rodzaj === "glaz" ? OBRYS : C.kamien[v > 0.4 ? 3 : v > 0 ? 2 : v > -0.4 ? 1 : 0]);
        }
        break;
      }
      case "grzyb": {
        const czerw = r(0) < 0.3;
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

  // ../../../../../../home/claude/erpeg/docs/paczka-dla-programisty/generator/budynki.ts
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
    const H2 = op.wysokosc, sk = op.skos ?? 0.35;
    const n = pierscien.length / 2;
    const P2 = [];
    for (let i = 0; i < n; i++) P2.push([pierscien[2 * i], pierscien[2 * i + 1]]);
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const [x, y] of P2) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    const x0 = Math.floor(minX) - 2, y0 = Math.floor(minY) - 2, W2 = Math.ceil(maxX + H2 * sk) - x0 + 3, Hh = Math.ceil(maxY + H2) - y0 + 3;
    const mask = new Uint8Array(W2 * Hh);
    for (let j = 0; j < Hh; j++) {
      const py = y0 + j + 0.5, xs = [];
      for (let i = 0; i < n; i++) {
        const [ax, ay] = P2[i], [bx, by] = P2[(i + 1) % n];
        if (ay > py !== by > py) xs.push(ax + (py - ay) * (bx - ax) / (by - ay));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x < xs[k + 1] - 0.5; x++) {
        const i = x - x0;
        if (i >= 0 && i < W2) mask[j * W2 + i] = 1;
      }
    }
    const inFP = (x, y) => {
      const i = x - x0, j = y - y0;
      return i >= 0 && j >= 0 && i < W2 && j < Hh && mask[j * W2 + i] === 1;
    };
    let area = 0;
    for (let i = 0; i < n; i++) {
      const [ax, ay] = P2[i], [bx, by] = P2[(i + 1) % n];
      area += ax * by - bx * ay;
    }
    const E = P2.map(([ax, ay], i) => {
      const [bx, by] = P2[(i + 1) % n];
      const L2 = Math.hypot(bx - ax, by - ay) || 1;
      const ux2 = (bx - ax) / L2, uy2 = (by - ay) / L2;
      const s = area > 0 ? 1 : -1;
      return { ax, ay, ux: ux2, uy: uy2, L: L2, nx: uy2 * s, ny: -ux2 * s };
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
    const o = nowy(W2, Hh);
    const kind = new Uint8Array(W2 * Hh);
    const sOf = new Int16Array(W2 * Hh);
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W2; i++) {
      const x = x0 + i, y = y0 + j;
      if (mask[j * W2 + i]) {
        kind[j * W2 + i] = 1;
        continue;
      }
      for (let s = 1; s <= H2; s++) if (inFP(Math.round(x - s * sk), y - s)) {
        kind[j * W2 + i] = 2;
        sOf[j * W2 + i] = s;
        break;
      }
    }
    const K = (i, j) => i < 0 || j < 0 || i >= W2 || j >= Hh ? 0 : kind[j * W2 + i];
    let maxD = 0;
    const dd = new Float32Array(W2 * Hh);
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W2; i++) if (kind[j * W2 + i] === 1) {
      const d = najblizsze(x0 + i + 0.5, y0 + j + 0.5).d1;
      dd[j * W2 + i] = d;
      maxD = Math.max(maxD, d);
    }
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W2; i++) {
      const k = kind[j * W2 + i];
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
        const s = sOf[j * W2 + i], hh = H2 - s, px = x - s * sk, py = y - s;
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
        const pietra = H2 >= 14 ? 2 : 1;
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
      o.px[j * W2 + i] = c;
    }
    if (op.komin && maxD > 6) {
      let best = -1, bx = 0, by = 0;
      for (let j = 0; j < Hh; j++) for (let i = 0; i < W2; i++) if (kind[j * W2 + i] === 1 && dd[j * W2 + i] > 3 && dd[j * W2 + i] < maxD - 1.5) {
        const sc = -Math.abs(i - W2 * 0.4) - Math.abs(j - Hh * 0.3) + hash(i, j, op.seed) * 6;
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
        if (yy >= 0 && xx < W2) o.px[yy * W2 + xx] = (i === 0 || i === 3) && j > -5 ? mieszaj(c, OBRYS, i === 3 ? 0.5 : 0) : c;
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
    const x0 = Math.floor(minX), y0 = Math.floor(minY), W2 = Math.ceil(maxX) - x0 + 1, H2 = Math.ceil(maxY) - y0 + 1;
    const fp = new Uint8Array(W2 * H2);
    for (let j = 0; j < H2; j++) {
      const py = y0 + j + 0.5, xs = [];
      for (let i = 0; i < n; i++) {
        const ax = pierscien[2 * i], ay = pierscien[2 * i + 1], bx = pierscien[(2 * i + 2) % (2 * n)], by = pierscien[(2 * i + 3) % (2 * n)];
        if (ay > py !== by > py) xs.push(ax + (py - ay) * (bx - ax) / (by - ay));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x < xs[k + 1] - 0.5; x++) {
        const i = x - x0;
        if (i >= 0 && i < W2) fp[j * W2 + i] = 1;
      }
    }
    const Hs = Math.round(wysokosc * 0.9);
    for (let k = 1; k <= Hs; k++) {
      const dx = k, dy = Math.round(k * 0.5);
      for (let j = 0; j < H2; j++) {
        const yy = y0 + j + dy - my;
        if (yy < 0 || yy >= mh) continue;
        for (let i = 0; i < W2; i++) {
          if (!fp[j * W2 + i]) continue;
          const xx = x0 + i + dx - mx;
          if (xx >= 0 && xx < mw) maska[yy * mw + xx] = 1;
        }
      }
    }
    for (let j = 0; j < H2; j++) for (let i = 0; i < W2; i++) if (fp[j * W2 + i]) {
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
    let best = -1, ang2 = 0;
    for (let i = 0; i < n; i++) {
      const dx = pierscien[(2 * i + 2) % (2 * n)] - pierscien[2 * i], dy = pierscien[(2 * i + 3) % (2 * n)] - pierscien[2 * i + 1];
      const L2 = dx * dx + dy * dy;
      if (L2 > best) {
        best = L2;
        ang2 = Math.atan2(dy, dx);
      }
    }
    let deg = (ang2 * 180 / Math.PI % 180 + 180) % 180, cel = katy[0], bd = 999;
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
    const a = cel * Math.PI / 180, ux2 = Math.cos(a), uy2 = Math.sin(a), vx2 = -uy2, vy2 = ux2;
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (let i = 0; i < n; i++) {
      const x = out[2 * i] - cx, y = out[2 * i + 1] - cy, u = x * ux2 + y * uy2, v = x * vx2 + y * vy2;
      u0 = Math.min(u0, u);
      u1 = Math.max(u1, u);
      v0 = Math.min(v0, v);
      v1 = Math.max(v1, v);
    }
    const W2 = Math.max(siatka * 2, Math.round((u1 - u0) / siatka) * siatka), H2 = Math.max(siatka * 2, Math.round((v1 - v0) / siatka) * siatka);
    const mu = (u0 + u1) / 2, mv = (v0 + v1) / 2;
    const P2 = [[-W2 / 2, -H2 / 2], [W2 / 2, -H2 / 2], [W2 / 2, H2 / 2], [-W2 / 2, H2 / 2]];
    return P2.flatMap(([u, v]) => [cx + (mu + u) * ux2 + (mv + v) * vx2, cy + (mu + u) * uy2 + (mv + v) * vy2]);
  }

  // ../../../../../../home/claude/erpeg/docs/paczka-dla-programisty/generator/steampunk.ts
  var MOS = ["#4a3216", "#6b4a22", "#9a6420", "#c8963e", "#e9c56a"].map(hex);
  var ZEL = ["#2a2630", "#3a3440", "#55505c"].map(hex);
  var CZERW = hex("#b2453a");
  var BIEL = hex("#ece6d6");

  // ../../../../../../home/claude/erpeg/docs/paczka-dla-programisty/generator/demo/porownanie.ts
  var W = 480;
  var H = 360;
  var R = rng(11);
  var ang = 33 * Math.PI / 180;
  var ux = Math.cos(ang);
  var uy = Math.sin(ang);
  var vx = -uy;
  var vy = ux;
  var sx = 40;
  var sy = 60;
  var domy = [];
  for (let i = 0; i < 9; i++) for (const side of [-1, 1]) {
    const t = 30 + i * 52 + R() * 8, off = side * (44 + R() * 10);
    const cx = sx + ux * t + vx * off, cy = sy + uy * t + vy * off;
    const w = 30 + R() * 22, h = 24 + R() * 14, a = ang + (R() - 0.5) * 0.25;
    const co = Math.cos(a), si = Math.sin(a);
    const L2 = R() < 0.25;
    const pts = L2 ? [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, 0], [0, 0], [0, h / 2 + 12], [-w / 2, h / 2 + 12]] : [[-w / 2, -h / 2], [w / 2, -h / 2 + (R() - 0.5) * 4], [w / 2 + (R() - 0.5) * 4, h / 2], [-w / 2, h / 2]];
    domy.push(pts.flatMap(([u, v]) => [cx + u * co - v * si, cy + u * si + v * co]));
  }
  var distUlica = (x, y) => Math.abs((x - sx) * vx + (y - sy) * vy);
  var rodzajW = (x, y) => x < 0 || y < 0 || x >= W || y >= H ? null : distUlica(x, y) < 12 ? "bruk" : distUlica(x, y) < 18 ? "chodnik" : "trawa";
  function scena(tryb, skalaDrzew, odstep) {
    const o = nowy(W, H);
    const ringi = domy.map((p) => tryb === 0 ? p : przyciagnij(p, { prostokat: tryb === 2, siatka: 4 }));
    const cien = new Uint8Array(W * H);
    ringi.forEach((p, i) => cienBudynku(p, [8, 12, 16][i % 3], cien, W, H, 0, 0));
    malujPodloze(o, 0, 0, rodzajW, cien);
    for (let y = 4; y < H; y += 3) for (let x = 2; x < W - 2; x += 3) if (rodzajW(x, y) === "trawa" && hash(x, y, 9) < 0.03) runo(o, x, y, "trawa_niska", x * 7 + y);
    const inside = (p, x, y) => {
      let c = false;
      const n = p.length / 2;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const ax = p[2 * i], ay = p[2 * i + 1], bx = p[2 * j], by = p[2 * j + 1];
        if (ay > y !== by > y && x < (bx - ax) * (y - ay) / (by - ay) + ax) c = !c;
      }
      return c;
    };
    const pos = [];
    const rr = rng(4);
    for (let k = 0; k < 4e3; k++) {
      const x = rr() * W, y = 20 + rr() * (H - 20);
      if (distUlica(x, y) < 30) continue;
      if (ringi.some((p) => inside(p, x, y) || inside(p, x, y - 20) || inside(p, x + 14, y) || inside(p, x - 14, y))) continue;
      if (pos.some(([a, b]) => Math.hypot(a - x, (b - y) * 1.3) < odstep)) continue;
      pos.push([x, y]);
    }
    pos.sort((a, b) => a[1] - b[1]);
    const items = [];
    ringi.forEach((p, i) => {
      const g = budynek(p, { wysokosc: [8, 12, 16][i % 3], dach: ["dachowka_czerwona", "dachowka_brazowa", "lupek", "gont"][i % 4], sciana: ["tynk_kremowy", "cegla", "tynk_zolty", "kamien"][i * 3 % 4], seed: i * 13, komin: i % 2 === 0, rura: i % 3 === 0 });
      const maxY = Math.max(...p.filter((_, k) => k % 2 === 1));
      items.push({ y: maxY, f: () => naloz(o, g.obraz, g.x0, g.y0) });
    });
    pos.forEach(([x, y]) => {
      const gat = ["dab", "lipa", "brzoza", "jablon"][Math.floor(hash(x | 0, y | 0, 2) * 4)];
      const d = drzewo(gat, 1e3 + Math.floor(hash(x | 0, y | 0, 3) * 3) * 77, skalaDrzew);
      items.push({ y, f: () => {
        const rx = d.korona.w * 0.42, ry = 6 * skalaDrzew + 3;
        for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) {
          if ((i / rx) ** 2 + (j / ry) ** 2 > 1) continue;
          const xx = x + i + rx * 0.4 | 0, yy = y + j - 1 | 0;
          if (xx >= 0 && yy >= 0 && xx < W && yy < H) o.px[yy * W + xx] = ciemniej(o.px[yy * W + xx]);
        }
        const ox = x - d.kotwica[0] | 0, oy = y - d.kotwica[1] | 0;
        naloz(o, d.pien, ox, oy);
        naloz(o, d.korona, ox, oy);
      } });
    });
    items.sort((a, b) => a.y - b.y).forEach((it) => it.f());
    return o;
  }
  var panele = [
    ["A. Dzi\u015B: budynki z OSM jak s\u0105, du\u017Ce drzewa", scena(0, 1, 60)],
    ["B. Drzewa 0,65\xD7 i g\u0119\u015Bciej, budynki jak z OSM", scena(0, 0.65, 34)],
    ["C. Budynki przyci\u0105gni\u0119te do 8 k\u0105t\xF3w (kszta\u0142t z OSM)", scena(1, 0.65, 34)],
    ["D. Przyci\u0105gni\u0119te + prostok\u0105tne \u201Eklocki\u201D (siatka 4 px)", scena(2, 0.65, 34)]
  ];
  for (const [t, o] of panele) {
    const d = document.createElement("div");
    d.innerHTML = `<h3>${t}</h3>`;
    const c = doCanvas(o);
    c.style.width = W * 2 + "px";
    c.style.imageRendering = "pixelated";
    d.appendChild(c);
    document.body.appendChild(d);
  }
  window.__gotowe = true;
})();
