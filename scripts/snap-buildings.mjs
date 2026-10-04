// Budynki obracane do 8 kątów (docs/paczka-dla-programisty/GENERATOR_SWIATA.md punkt 0.3, G8).
// Kąty dają równe „schodki” pikseli: 0, 26,6, 45, 63,4, 90, 116,6, 135, 153,4 stopnia.
// Liczone raz w build-map; budynek obraca się wokół środka do najbliższego kąta
// (kierunek = najdłuższa ściana). Gdy po obrocie wchodzi na drogę albo na sąsiada,
// zmniejszamy go o 0,5 i 1 m na krawędź, a gdy dalej koliduje – zostaje bez obrotu.
// Ta sama matematyka co `przyciagnij` w src/gen/budynki.ts (bez prostokąta).
const KATY = [0, 26.565, 45, 63.435, 90, 116.565, 135, 153.435];

/** Kąt obrotu (radiany) potrzebny, by najdłuższa ściana pierścienia [x,y,x,y,…] leżała pod jednym z KATY. */
export function deltaDoKata(r) {
  const n = r.length / 2;
  let best = -1, ang = 0;
  for (let i = 0; i < n; i++) {
    const dx = r[(2 * i + 2) % (2 * n)] - r[2 * i], dy = r[(2 * i + 3) % (2 * n)] - r[2 * i + 1];
    const L = dx * dx + dy * dy;
    if (L > best) { best = L; ang = Math.atan2(dy, dx); }
  }
  const deg = (((ang * 180) / Math.PI) % 180 + 180) % 180;
  let cel = KATY[0], bd = 999;
  for (const k of KATY.concat([180])) { const d = Math.abs(deg - k); if (d < bd) { bd = d; cel = k % 180; } }
  return ((cel - deg) * Math.PI) / 180;
}

/**
 * blocks: [{ abs: [outer, ...holes] (płaskie tablice w półmetrach), x0,y0,x1,y1 }]
 * lines:  [{ pts: płaska tablica bezwzględna, half: połowa szerokości narysowanej drogi w półmetrach }]
 * Zmienia blocks[i].abs i zwraca statystykę.
 */
export function przyciagnijBudynki(blocks, lines, { ClipperLib, CS, UNITS_PER_M, CELL }) {
  const stats = { obrocone: 0, zmniejszone: 0, bezObrotu: 0, juzRowne: 0 };
  // --- siatka odcinków dróg
  const G = CELL;
  const segGrid = new Map();
  const segs = [];
  for (const l of lines) {
    const p = l.pts;
    for (let i = 0; i + 3 < p.length; i += 2) {
      const s = { ax: p[i], ay: p[i + 1], bx: p[i + 2], by: p[i + 3], half: l.half };
      const id = segs.push(s) - 1;
      const pad = l.half;
      for (let cx = Math.floor((Math.min(s.ax, s.bx) - pad) / G); cx <= Math.floor((Math.max(s.ax, s.bx) + pad) / G); cx++)
        for (let cy = Math.floor((Math.min(s.ay, s.by) - pad) / G); cy <= Math.floor((Math.max(s.ay, s.by) + pad) / G); cy++) {
          const k = cx + ',' + cy;
          if (!segGrid.has(k)) segGrid.set(k, []);
          segGrid.get(k).push(id);
        }
    }
  }
  const naDrodze = (x, y) => {
    for (const id of segGrid.get(Math.floor(x / G) + ',' + Math.floor(y / G)) || []) {
      const s = segs[id];
      const dx = s.bx - s.ax, dy = s.by - s.ay;
      const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (y - s.ay) * dy) / (dx * dx + dy * dy || 1)));
      if (Math.hypot(s.ax + t * dx - x, s.ay + t * dy - y) < s.half) return true;
    }
    return false;
  };
  // --- siatka budynków (okręgi wokół środka, więc obrót nie zmienia przynależności)
  const info = blocks.map((b) => {
    const r = b.abs[0], n = r.length / 2;
    let cx = 0, cy = 0;
    for (let i = 0; i < r.length; i += 2) { cx += r[i]; cy += r[i + 1]; }
    cx /= n; cy /= n;
    let R = 0;
    for (let i = 0; i < r.length; i += 2) R = Math.max(R, Math.hypot(r[i] - cx, r[i + 1] - cy));
    return { cx, cy, R: R + 2 };
  });
  const bGrid = new Map();
  info.forEach((c, i) => {
    for (let gx = Math.floor((c.cx - c.R) / G); gx <= Math.floor((c.cx + c.R) / G); gx++)
      for (let gy = Math.floor((c.cy - c.R) / G); gy <= Math.floor((c.cy + c.R) / G); gy++) {
        const k = gx + ',' + gy;
        if (!bGrid.has(k)) bGrid.set(k, []);
        bGrid.get(k).push(i);
      }
  });
  const inRing = (r, x, y) => {
    let inside = false;
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2)
      if ((r[i + 1] > y) !== (r[j + 1] > y) && x < ((r[j] - r[i]) * (y - r[i + 1])) / (r[j + 1] - r[i + 1]) + r[i]) inside = !inside;
    return inside;
  };
  const wBloku = (rings, x, y) => {
    let c = 0;
    for (const r of rings) if (inRing(r, x, y)) c++;
    return c % 2 === 1;
  };
  const probki = (r, krok) => {
    const out = [];
    for (let i = 0; i < r.length; i += 2) {
      const ax = r[i], ay = r[i + 1], bx = r[(i + 2) % r.length], by = r[(i + 3) % r.length];
      const L = Math.hypot(bx - ax, by - ay), m = Math.max(1, Math.ceil(L / krok));
      for (let k = 0; k < m; k++) out.push([ax + ((bx - ax) * k) / m, ay + ((by - ay) * k) / m]);
    }
    return out;
  };
  const kolizja = (idx, outer) => {
    const c = info[idx];
    const pts = probki(outer, UNITS_PER_M); // co ~1 m
    for (const [x, y] of pts) if (naDrodze(x, y)) return true;
    // sąsiedzi: nasze punkty w nich albo ich wierzchołki u nas
    const sasiedzi = new Set();
    for (let gx = Math.floor((c.cx - c.R) / G); gx <= Math.floor((c.cx + c.R) / G); gx++)
      for (let gy = Math.floor((c.cy - c.R) / G); gy <= Math.floor((c.cy + c.R) / G); gy++)
        for (const j of bGrid.get(gx + ',' + gy) || []) if (j !== idx) sasiedzi.add(j);
    for (const j of sasiedzi) {
      const o = blocks[j].abs;
      if (Math.hypot(info[j].cx - c.cx, info[j].cy - c.cy) > info[j].R + c.R) continue;
      for (const [x, y] of pts) if (wBloku(o, x, y)) return true;
      const q = o[0];
      for (let i = 0; i < q.length; i += 2) if (inRing(outer, q[i], q[i + 1])) return true;
    }
    return false;
  };
  const obroc = (rings, cx, cy, d) => {
    const co = Math.cos(d), si = Math.sin(d);
    return rings.map((r) => {
      const o = [];
      for (let i = 0; i < r.length; i += 2) { const x = r[i] - cx, y = r[i + 1] - cy; o.push(Math.round(cx + x * co - y * si), Math.round(cy + x * si + y * co)); }
      return o;
    });
  };
  const zmniejsz = (outer, pol) => {
    const p = [];
    for (let i = 0; i < outer.length; i += 2) p.push({ X: outer[i] * CS, Y: outer[i + 1] * CS });
    if (ClipperLib.Clipper.Orientation(p) === false) p.reverse();
    const co = new ClipperLib.ClipperOffset(2, 0.25 * CS);
    co.AddPaths([p], ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);
    const out = new ClipperLib.Paths();
    co.Execute(out, -pol * CS);
    if (out.length !== 1 || out[0].length < 3) return null;
    return out[0].flatMap((q) => [Math.round(q.X / CS), Math.round(q.Y / CS)]);
  };
  blocks.forEach((b, i) => {
    const c = info[i];
    const d = deltaDoKata(b.abs[0]);
    if (Math.abs(d) < 0.004) { stats.juzRowne++; return; }
    const rot = obroc(b.abs, c.cx, c.cy, d);
    if (!kolizja(i, rot[0])) { b.abs = rot; stats.obrocone++; return; }
    for (const pol of [1, 2]) { // 0,5 m i 1 m na krawędź (w półmetrach)
      const mniejszy = zmniejsz(rot[0], pol);
      if (mniejszy && !kolizja(i, mniejszy)) { b.abs = [mniejszy, ...rot.slice(1)]; stats.zmniejszone++; return; }
    }
    stats.bezObrotu++;
  });
  return stats;
}
