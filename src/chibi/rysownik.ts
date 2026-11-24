// @ts-nocheck – port of the mock-up renderer (claude.ai artifact „Ludziki chibi”); typed wrapper in chibi/typy.ts.
// Rysownik ludzików-chibi: małe bryły 3D (SDF) śledzone promieniem piksel po pikselu,
// tony światła z północnego zachodu, obrys #1e1a24 – jak bryły generatora świata.
const INK = [0x1e, 0x1a, 0x24];
const E = 32 * Math.PI / 180; // kamera 32° z góry
const B = [0, Math.sin(E), Math.cos(E)], U = [0, Math.cos(E), -Math.sin(E)];
const L = nrm([-0.5, 0.62, 0.6]);
function nrm(v) { const d = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / d, v[1] / d, v[2] / d]; }
const hexc = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// ---------- kolory: rampa 4 tonów (cienie chłodniejsze, światła cieplejsze) ----------
function rgb2hsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
function hsl2rgb([h, s, l]) { const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; }
function przesun(h, dh, ds, dl) { const [a, b, c] = rgb2hsl(h); let hh = a + dh; hh -= Math.floor(hh); return hsl2rgb([hh, Math.max(0, Math.min(1, b + ds)), Math.max(0.02, Math.min(0.97, c + dl))]); }
const rampy = {};
function rampa(hex) {
  if (rampy[hex]) return rampy[hex];
  const c = hexc(hex); const [h] = rgb2hsl(c);
  const kuNieb = h > 0.08 && h < 0.6 ? 0.03 : -0.03; // cień w stronę fioletu
  return rampy[hex] = [przesun(c, kuNieb, -0.02, -0.19), przesun(c, kuNieb / 2, -0.01, -0.085), c, przesun(c, -kuNieb / 2, -0.02, 0.09)];
}

// ---------- prymitywy SDF ----------
const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
const sph = (c, r) => p => len3(p[0] - c[0], p[1] - c[1], p[2] - c[2]) - r;
const elip = (c, rr) => p => { const x = (p[0] - c[0]) / rr[0], y = (p[1] - c[1]) / rr[1], z = (p[2] - c[2]) / rr[2]; const k = Math.sqrt(x * x + y * y + z * z); return (k - 1) * Math.min(rr[0], rr[1], rr[2]); };
const kaps = (a, b, r) => p => { const pa = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const h = Math.max(0, Math.min(1, (pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2]) / (ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2]))); return len3(pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h) - r; };
const rbox = (c, hs, r, rotZ = 0) => { const cs = Math.cos(rotZ), sn = Math.sin(rotZ); return p => {
  let x = p[0] - c[0], y = p[1] - c[1]; const z = p[2] - c[2]; if (rotZ) { const xx = cs * x + sn * y; y = -sn * x + cs * y; x = xx; }
  const qx = Math.abs(x) - hs[0] + r, qy = Math.abs(y) - hs[1] + r, qz = Math.abs(z) - hs[2] + r;
  return len3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r; }; };
const cyl = (c, r, h) => p => { const d = Math.hypot(p[0] - c[0], p[2] - c[2]) - r, e = Math.abs(p[1] - c[1]) - h; return Math.min(Math.max(d, e), 0) + Math.hypot(Math.max(d, 0), Math.max(e, 0)); };
const torusX = (c, R, r) => p => { const q = Math.hypot(p[1] - c[1], p[2] - c[2]) - R; return Math.hypot(q, p[0] - c[0]) - r; };


// pozy ataków: kierunek ręki od barku (jednostkowy) i kierunek broni
const n3 = v => { const d = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / d, v[1] / d, v[2] / d]; };
function pozaReki(pz, sx, ty) {
  const bark = [sx * 2.8, ty + 1.6, 0];
  let dir, w;
  if (pz.typ === 'zamach') { if (sx !== 1) return { dlon: [-3.2, ty - 0.6, 0.8] }; dir = n3([Math.cos(pz.a), -0.12, Math.sin(pz.a)]); w = dir; }
  else if (pz.typ === 'cios') { if (sx !== 1) return { dlon: [-3.3, ty - 0.4, 1.0] }; dir = n3([0.9, Math.cos(pz.a), Math.sin(pz.a)]); w = n3([0.45, Math.cos(pz.a), Math.sin(pz.a)]); }
  else if (pz.typ === 'czar') {
    const u = pz.a; // 0 = zamach w górę, 1 = pchnięcie do przodu
    dir = n3([sx * (1.0 - 0.6 * u), 0.9 - 0.75 * u, 0.2 + 0.95 * u]);
    w = n3([0.05, 1 - 0.55 * u, 0.15 + 0.85 * u]);
  } else if (pz.typ === 'gotow') { // postawa bojowa: broń w górę, ręce przed sobą
    dir = sx === 1 ? n3([0.55, -0.25, 0.8]) : n3([-0.6, -0.3, 0.75]);
    w = n3([0.25, 0.85, 0.45]);
  } else if (pz.typ === 'luk') { // lewa trzyma łuk do przodu, prawa naciąga cięciwę
    if (sx === -1) { const b = [sx * 2.8, ty + 1.6, 0], dd = n3([-0.3, -0.12, 1]); return { dlon: [b[0] + dd[0] * 3.8, b[1] + dd[1] * 3.8, b[2] + dd[2] * 3.8], w: [0, 1, 0] }; }
    else { const u = pz.a; return { dlon: [-1.6 + 1.6 * u, ty + 1.2 + 1.4 * u, 5.4 - 4.2 * u], w: [0, 0, 1] }; }
  } else return null;
  return { dlon: [bark[0] + dir[0] * 2.7, bark[1] + dir[1] * 2.7, bark[2] + dir[2] * 2.7], w };
}
function kula(pz, ty = 6.2) { const r = pozaReki(pz, 1, ty); const d = r.dlon, w = r.w; return [d[0] + w[0] * 4.7, d[1] + w[1] * 4.7, d[2] + w[2] * 4.7]; }
function czubek(pz, ty = 6.2) { const r = pozaReki(pz, 1, ty); const d = r.dlon, w = r.w; return [d[0] + w[0] * 7.2, d[1] + w[1] * 7.2, d[2] + w[2] * 7.2]; }
// ---------- model postaci ----------
// jednostki: piksele świata przy wysokości 20; y w górę, z do patrzącego, postać patrzy w +z
function model(o, faza) {
  const A = o.styl === 'A';
  const czesci = [];
  const add = (sdf, mat, ext) => czesci.push(Object.assign({ sdf, mat }, ext || {}));
  const sw = Math.sin(faza * Math.PI * 2), chod = o.chod || o.bieg ? 1 : 0, bieg = o.bieg ? 1 : 0;
  const bob = chod ? Math.abs(Math.cos(faza * Math.PI * 2)) * (bieg ? 1.1 : 0.5) : 0;
  const nogaL = chod ? sw * (bieg ? 2.3 : 1.3) : 0, nogaP = -nogaL;
  const podL = chod ? Math.max(0, sw) * (bieg ? 1.5 : 0.7) : 0, podP = chod ? Math.max(0, -sw) * (bieg ? 1.5 : 0.7) : 0;
  const k = o.kolory;
  const hy = 12.3 + bob, hr = A ? 5.0 : 4.7; // głowa
  const ty = 6.2 + bob;

  // buty i nogi
  for (const [sx, dz, dy] of [[-1.55, nogaL, podL], [1.55, nogaP, podP]]) {
    if (A) {
      add(rbox([sx, 0.95 + dy, 0.35 + dz], [1.25, 0.95, 1.6], 0.75), 'buty');
      add(kaps([sx, 2.0 + dy, dz * 0.6], [sx * 0.9, 4.3 + bob, 0], 1.15), 'spodnie');
    } else {
      add(rbox([sx, 0.95 + dy, 0.3 + dz], [1.35, 0.95, 1.55], 0.3), 'buty');
      add(rbox([sx * 0.92, 3.1 + dy * 0.5 + bob * 0.5, dz * 0.5], [1.25, 1.35, 1.2], 0.3), 'spodnie');
    }
  }
  // tułów (z paskiem i guzikami jako wzór)
  const tulow = A ? elip([0, ty, 0], [2.8, 2.5, 2.1]) : rbox([0, ty, 0], [2.7, 2.3, 1.9], 0.55);
  add(tulow, o.plaszcz ? 'plaszcz' : 'mundur', { wzor: 'tulow', ty });
  if (o.dol) add(A ? elip([0, ty - 1.9, 0], [3.4, 1.4, 2.4]) : rbox([0, ty - 1.9, 0], [3.3, 1.1, 2.2], 0.4), o.plaszcz ? 'plaszcz' : 'mundur', { wzor: 'pola' });
  // ręce
  const rekaL = chod ? -sw * (bieg ? 2.2 : 1.1) : 0, rekaP = -rekaL;
  for (const [sx, dz, bron] of [[-1, rekaL, false], [1, rekaP, true]]) {
    const bark = [sx * 2.8, ty + 1.6, 0];
    let dlon = bron && o.bron ? [sx * 3.6, ty - 1.0, 1.2] : [sx * 3.6, ty - 1.4, dz];
    const pz = o.poza ? pozaReki(o.poza, sx, ty) : null;
    if (pz) { dlon = pz.dlon; if (sx === 1) o._w = pz.w; else o._lewa = pz.dlon; }
    if (A) {
      add(kaps(bark, [(bark[0] + dlon[0]) / 2, (bark[1] + dlon[1]) / 2, (bark[2] + dlon[2]) / 2], 0.95), 'mundur');
      add(kaps([(bark[0] + dlon[0]) / 2, (bark[1] + dlon[1]) / 2, (bark[2] + dlon[2]) / 2], dlon, 0.85), o.mankiet ? 'pas' : 'mundur');
      add(sph(dlon, 0.95), 'skora');
    } else {
      add(rbox([(bark[0] + dlon[0]) / 2, (bark[1] + dlon[1]) / 2 + 0.3, (bark[2] + dlon[2]) / 2], [0.9, 1.6, 0.9], 0.25, sx * 0.12), 'mundur');
      add(rbox(dlon, [0.95, 0.95, 0.95], 0.35), 'skora');
    }
    if (sx === 1) o._dlon = dlon;
  }
  // głowa
  const hc = [0, hy, 0];
  if (A) add(sph(hc, hr), 'skora', { glowa: hc, hr });
  else add(rbox(hc, [hr, hr * 0.92, hr * 0.92], 1.5), 'skora', { glowa: hc, hr });
  if (A) { add(sph([-hr * 0.98, hy - 0.4, 0], 0.8), 'skora'); add(sph([hr * 0.98, hy - 0.4, 0], 0.8), 'skora'); }
  // włosy
  const hairCut = (base, niz) => p => { const q = p[1] - hy, z = p[2]; const linia = (z > 0 ? -0.05 * hr + z * 0.55 : niz * hr + z * 0.15); return Math.max(base(p), (linia - q) * 0.8); };
  if (!o.helm || o.helmTyp === 'kaszkiet') {
    if (A) {
      add(hairCut(sph([0, hy + 0.5, -0.35], hr + 0.5), -0.35), 'wlosy');
      // grzywka – kilka kosmyków
      add(elip([-1.4, hy + hr * 0.62, hr * 0.62], [2.2, 1.1, 1.2]), 'wlosy');
      add(elip([1.6, hy + hr * 0.68, hr * 0.5], [1.8, 1.0, 1.2]), 'wlosy');
      if (o.plec === 'k') {
        add(kaps([-hr * 0.82, hy - 0.5, -0.8], [-hr * 0.9, hy - 4.3, -0.4], 0.95), 'wlosy', { warkocz: 1 });
        add(sph([-hr * 0.9, hy - 4.6, -0.4], 0.75), 'mosiadz');
        add(elip([0, hy - 1.6, -hr * 0.85], [hr * 0.85, 2.2, 1.4]), 'wlosy');
      }
    } else {
      add(rbox([0, hy + hr * 0.7, -0.3], [hr + 0.35, hr * 0.3, hr + 0.15], 0.6), 'wlosy');
      add(rbox([0, hy + 0.2, -hr * 0.62], [hr + 0.35, hr * 0.7, hr * 0.5], 0.6), 'wlosy');
      if (!o.helm) for (const [x, z, r] of [[-2.2, 1.8, -0.5], [0.4, 2.6, 0.2], [2.4, 1.4, 0.55], [-0.5, -1.5, -0.2], [1.8, -1.2, 0.4]])
        add(rbox([x, hy + hr + 0.2, z], [1.2, 0.8, 1.1], 0.2, r), 'wlosy');
      add(rbox([-1.0, hy + hr * 0.45, hr * 0.78], [1.7, 0.9, 0.5], 0.2, -0.35), 'wlosy');
      add(rbox([1.6, hy + hr * 0.5, hr * 0.75], [1.2, 0.8, 0.5], 0.2, 0.3), 'wlosy');
      if (o.plec === 'k') { add(rbox([-hr - 0.2, hy - 2.5, -0.6], [0.9, 2.6, 0.9], 0.35), 'wlosy'); add(rbox([-hr - 0.2, hy - 5.2, -0.6], [0.7, 0.5, 0.7], 0.2), 'mosiadz'); }
    }
  }
  // ---- warstwy ekwipunku ----
  if (o.helm) {
    if (o.helmTyp === 'kaszkiet') { // czapka z daszkiem jak u strażnika (wzór 1)
      if (A) {
        add(elip([0, hy + hr * 0.7, -0.2], [hr * 1.02, hr * 0.5, hr * 1.02]), 'czapka', { wzor: 'czapka', cy: hy + hr * 0.5 });
        add(elip([0, hy + hr * 0.42, hr * 0.85], [hr * 0.75, 0.35, 1.5]), 'czapkaCiemna');
        add(sph([0, hy + hr * 0.85, hr * 0.9], 0.6), 'mosiadz');
      } else {
        add(rbox([0, hy + hr * 0.72, -0.2], [hr + 0.3, hr * 0.3, hr + 0.3], 0.6), 'czapka', { wzor: 'czapka', cy: hy + hr * 0.5 });
        add(rbox([0, hy + hr * 0.38, hr * 0.95], [hr * 0.8, 0.3, 1.3], 0.15), 'czapkaCiemna');
      }
    } else { // hełm-kopuła z mosiężnym pasem (wzór 2)
      if (A) {
        const hc2 = [0, hy + 0.3, -0.2];
        add(p => Math.max(sph(hc2, hr * 1.1)(p), (hy + hr * 0.48 - p[1] - Math.max(0, -p[2]) * 0.5) * 0.9), 'helm', { wzor: 'pasHelmu' });
        add(cyl([0, hy + hr * 0.48, -0.2], hr * 1.13, 0.4), 'helm');
      } else {
        add(rbox([0, hy + hr * 0.78, -0.15], [hr + 0.45, hr * 0.5, hr + 0.4], 1.4), 'helm', { wzor: 'pasHelmu', fasety: true });
        add(rbox([0, hy + hr * 0.36, -0.15], [hr + 0.65, 0.45, hr + 0.6], 0.2), 'helm', { fasety: true });
      }
    }
  }
  if (o.peleryna) add(A ? elip([0, ty + 1.9, -0.1], [3.9, 1.5, 2.9]) : rbox([0, ty + 1.8, -0.1], [3.8, 1.2, 2.7], 0.5), o.peleryna, { wzor: o.peleryna === 'lisc' ? 'liscie' : 'zapinka' });
  if (o.szal) add(A ? elip([0, ty + 2.4, 0.1], [2.8, 0.9, 2.4]) : rbox([0, ty + 2.4, 0.1], [2.7, 0.7, 2.3], 0.35), 'szal');
  if (o.naramiennik) add(A ? elip([3.3, ty + 2.0, 0], [1.6, 1.0, 1.6]) : rbox([3.3, ty + 1.9, 0], [1.5, 0.8, 1.5], 0.3), 'mosiadz', { fasety: !A });
  if (o.kaptur) add(A ? elip([0, hy - 2.2, -hr * 0.8], [hr * 0.9, 2.0, 1.6]) : rbox([0, hy - 2.2, -hr * 0.8], [hr * 0.85, 1.7, 1.4], 0.5), o.kaptur);
  if (o.tarcza) {
    const c = [-4.6, ty - 0.2, 1.3];
    if (A) { add(elip(c, [2.1, 2.5, 0.45]), 'mosiadz'); add(elip([c[0], c[1], c[2] + 0.35], [1.7, 2.1, 0.3]), 'stal', { wzor: 'szachy', cc: c }); }
    else { add(rbox(c, [2.0, 2.4, 0.35], 0.4), 'mosiadz'); add(rbox([c[0], c[1], c[2] + 0.3], [1.6, 2.0, 0.25], 0.3), 'stal', { wzor: 'szachy', cc: c }); }
  }
  const d = o._dlon;
  if (o.poza && o.poza.typ === 'luk' && o._lewa) {
    const h = o._lewa, P = f => [h[0] - Math.sin(f) * 7.0 * 0.6, h[1] + Math.sin(f) * 7.0 * 0.8, h[2] + (Math.cos(f) - 1) * 2.6 + 0.4];
    for (let i = 0; i < 8; i++) { const f0 = -1.2 + i * 0.3, f1 = f0 + 0.3; add(kaps(P(f0), P(f1), 0.42), 'drewno', { cienka: 1 }); }
    const g = P(1.2), dd = P(-1.2), r = d; // cięciwa do prawej dłoni
    add(kaps(g, r, 0.14), 'cieciwa', { cienka: 1 }); add(kaps(dd, r, 0.14), 'cieciwa', { cienka: 1 });
    if (!o.poza.puszczona) { const czub = [h[0], h[1], h[2] + 2.8]; add(kaps(r, czub, 0.24), 'drewno', { cienka: 1 }); add(sph(czub, 0.4), 'stal');
      add(kaps(r, [r[0], r[1], r[2] + 1.0], 0.42), 'biel', { cienka: 1 }); }
  } else if (o._w && (o.bron === 'miecz' || o.bron === 'szabla')) {
    const w = o._w, pt = (k) => [d[0] + w[0] * k, d[1] + w[1] * k, d[2] + w[2] * k];
    let pr = Math.abs(w[1]) < 0.95 ? n3([w[2], 0, -w[0]]) : [1, 0, 0];
    const g = pt(0.6);
    add(kaps(pt(-0.9), pt(0.4), 0.38), 'drewno');
    add(kaps([g[0] - pr[0] * 1.2, g[1] - pr[1] * 1.2, g[2] - pr[2] * 1.2], [g[0] + pr[0] * 1.2, g[1] + pr[1] * 1.2, g[2] + pr[2] * 1.2], 0.36), 'mosiadz');
    add(kaps(pt(0.9), pt(7.2), 0.42), 'stal', { cienka: 1 });
    add(sph(pt(-1.05), 0.45), 'mosiadz');
  } else if (o._w && (o.bron === 'kostur' || o.bron === 'pierscien' || o.bron === 'galaz')) {
    const w = o._w, pt = (k) => [d[0] + w[0] * k, d[1] + w[1] * k, d[2] + w[2] * k];
    add(kaps(pt(-4.5), pt(3.6), 0.48), 'drewno', { cienka: 1 });
    add(sph(pt(4.7), 1.3), 'mosiadz');
  } else if (o.bron === 'miecz') {
    add(rbox([d[0], d[1] + 0.2, d[2]], [0.35, 0.9, 0.35], 0.1), 'drewno');
    add(rbox([d[0], d[1] + 1.25, d[2]], [1.2, 0.3, 0.4], 0.15), 'mosiadz');
    add(rbox([d[0], d[1] + 4.3, d[2]], [0.45, 2.9, 0.18], 0.1), 'stal', { cienka: 1 });
    add(sph([d[0], d[1] - 0.85, d[2]], 0.45), 'mosiadz');
  } else if (o.bron === 'szabla') {
    for (let i = 0; i < 6; i++) { const a = i / 5; add(kaps([d[0] + a * a * 1.6, d[1] + 1 + a * 5.2, d[2]], [d[0] + (a + .2) * (a + .2) * 1.6, d[1] + 1 + (a + .2) * 5.2, d[2]], 0.38 - a * 0.1), 'stal', { cienka: 1 }); }
    add(rbox([d[0], d[1] + 0.9, d[2]], [1.0, 0.3, 0.4], 0.15), 'mosiadz');
  } else if (o.bron === 'luk') {
    const cx = d[0] + 0.6, cy = d[1] + 0.6;
    for (let i = 0; i < 8; i++) { const a0 = -1.25 + i * 2.5 / 8, a1 = a0 + 2.5 / 8;
      add(kaps([cx + Math.cos(a0) * 1.9, cy + Math.sin(a0) * 5.2, d[2]], [cx + Math.cos(a1) * 1.9, cy + Math.sin(a1) * 5.2, d[2]], 0.42), 'drewno', { cienka: 1 }); }
    add(kaps([cx + Math.cos(-1.25) * 1.9, cy - Math.sin(1.25) * 5.2, d[2]], [cx + Math.cos(1.25) * 1.9, cy + Math.sin(1.25) * 5.2, d[2]], 0.13), 'cieciwa', { cienka: 1 });
  } else if (o.bron === 'kostur' || o.bron === 'pierscien' || o.bron === 'galaz') {
    add(kaps([d[0], 0.6, d[2]], [d[0], ty + 6.5, d[2]], 0.48), 'drewno', { cienka: 1 });
    if (o.bron === 'kostur') add(sph([d[0], ty + 7.4, d[2]], 1.25), 'mosiadz', { fasety: !A });
    if (o.bron === 'pierscien') add(torusX([d[0], ty + 7.7, d[2]], 1.2, 0.42), 'mosiadz');
    if (o.bron === 'galaz') { add(kaps([d[0], ty + 4.8, d[2]], [d[0] - 1.6, ty + 6.4, d[2]], 0.35), 'drewno');
      add(elip([d[0] - 2.3, ty + 7.1, d[2]], [1.2, 0.7, 0.5]), 'lisc'); add(elip([d[0] + 0.9, ty + 7.4, d[2]], [1.2, 0.7, 0.5]), 'lisc'); }
  }
  if (o.pas) czesci[czesci.findIndex(c => c.wzor === 'tulow')].skos = 1;
  return { czesci, k, A, hy, hr, ty };
}

const KOLOR_MAT = k => ({
  skora: k.skora, wlosy: k.wlosy, mundur: k.mundur, spodnie: k.spodnie, buty: '#6e4124', pas: '#5b3620', mosiadz: '#d0a548',
  stal: '#a9b1bd', drewno: '#7b4a2b', cieciwa: '#e9dcc0', czapka: k.czapka || '#303868', czapkaCiemna: '#20264a', helm: k.helm || '#3c4a7c',
  plaszcz: k.plaszcz || '#8c3c2a', szal: k.szal || '#2c3566', lisc: '#5f913c', niebieska: '#3a53b5', zielony: '#2f7376',
  oko: '#2b1b16', biel: '#fff6e0', rumieniec: '#e98d78', usta: '#a85a4a', stalCiemna: '#3c4a7c'
});

// ---------- render ----------
// zwraca {w, h, px: Uint8ClampedArray, ox, oy} – stopy w (ox, oy)
function renderuj(o, yaw, faza, H) {
  const s = H / 20;
  const W = Math.ceil(H * 1.7) + 4, HH = Math.ceil(H * 1.4) + 4;
  const ox = W / 2, oy = HH - 3;
  const m = model(Object.assign({}, o), faza);
  const kol = KOLOR_MAT(m.k);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const loc = (w) => [cy * w[0] - sy * w[2], w[1], sy * w[0] + cy * w[2]];
  const sdf = p => { let best = 1e9, idx = -1; for (let i = 0; i < m.czesci.length; i++) { const d = m.czesci[i].sdf(p); if (d < best) { best = d; idx = i; } } return [best, idx]; };
  // całe ciało: uniesienie (skok), spłaszczenie przy lądowaniu, pochylenie w biegu, przechył przy uniku
  const un = o.unos || 0, sy0 = o.sy || 1, pch = o.pochyl || 0, prz = o.przechyl || 0;
  const cp = Math.cos(pch), sp = Math.sin(pch), cr = Math.cos(prz), sr = Math.sin(prz);
  const T = (q) => { let x = q[0], y = (q[1] - un) / sy0, z = q[2];
    if (pch) { const yy = y * cp + z * sp; z = -y * sp + z * cp; y = yy; }
    if (prz) { const xx = x * cr + y * sr; y = -x * sr + y * cr; x = xx; }
    return [x, y, z]; };
  const dist = q => sdf(T(q))[0];
  const N = 3; // próbki na piksel w osi
  const dw = [-B[0], -B[1], -B[2]];
  const promien = (X, Y) => {
    const o0 = [X + Y * U[0] + 40 * B[0], Y * U[1] + 40 * B[1], Y * U[2] + 40 * B[2]];
    let t = 0;
    for (let i = 0; i < 90 && t < 80; i++) {
      const q = loc([o0[0] + dw[0] * t, o0[1] + dw[1] * t, o0[2] + dw[2] * t]);
      const p = T(q);
      const [d, idx] = sdf(p);
      if (d < 0.015) return { p, q, idx, t };
      t += Math.max(d * 0.75, 0.01);
    }
    return null;
  };
  // przebieg zgrubny: jeden promień na piksel; pełne próbkowanie tylko przy sylwetce
  const zgrub = new Uint8Array(W * HH);
  for (let py = 0; py < HH; py++) for (let px = 0; px < W; px++) zgrub[py * W + px] = promien((px + 0.5 - ox) / s, (oy - py - 0.5) / s) ? 1 : 0;
  const buf = new Array(W * HH);
  for (let py = 0; py < HH; py++) for (let px = 0; px < W; px++) {
    let blisko = false;
    for (let dy = -1; dy <= 1 && !blisko; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = px + dx, yy = py + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < HH && zgrub[yy * W + xx]) { blisko = true; break; } }
    if (!blisko) { buf[py * W + px] = null; continue; }
    const probki = [];
    for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
      const hit = promien((px + (a + 0.5) / N - ox) / s, (oy - (py + (b + 0.5) / N)) / s);
      if (hit) probki.push(hit);
    }
    if (probki.length < 4) { buf[py * W + px] = null; continue; }
    // materiał większościowy (oczy i drobiazgi mają pierwszeństwo)
    const ile = {};
    const mats = probki.map(h => material(h, m));
    mats.forEach(x => ile[x] = (ile[x] || 0) + 1);
    let mat = null;
    for (const pr of ['oko', 'biel', 'cieciwa', 'usta']) if ((ile[pr] || 0) >= 2) { mat = pr; break; }
    const cienka = probki.some(h => m.czesci[h.idx].cienka);
    if (!mat) mat = Object.keys(ile).sort((a, b) => ile[b] - ile[a])[0];
    // normalna uśredniona z próbek tego materiału
    let n = [0, 0, 0], tt = 0, cnt = 0, czesc = -1;
    probki.forEach((h, i) => { if (mats[i] !== mat) return; const e = 0.02, p = h.q;
      const g = [dist([p[0] + e, p[1], p[2]]) - dist([p[0] - e, p[1], p[2]]), dist([p[0], p[1] + e, p[2]]) - dist([p[0], p[1] - e, p[2]]), dist([p[0], p[1], p[2] + e]) - dist([p[0], p[1], p[2] - e])];
      const gn = nrm(g); n[0] += gn[0]; n[1] += gn[1]; n[2] += gn[2]; tt += h.t; cnt++; czesc = h.idx; });
    n = nrm(n);
    const cz = m.czesci[czesc] || {};
    if (!m.A || cz.fasety) n = fasetuj(n);
    // normalna w świecie (obrót odwrotny do loc)
    const nw = [cy * n[0] + sy * n[2], n[1], -sy * n[0] + cy * n[2]];
    const ndl = nw[0] * L[0] + nw[1] * L[1] + nw[2] * L[2];
    let ton = ndl < -0.15 ? 0 : ndl < 0.3 ? 1 : ndl < 0.72 ? 2 : 3;
    if (!m.A && ton === 1 && ndl > 0.1) ton = 2; // klocek: mniej tonów
    buf[py * W + px] = { mat, ton, t: tt / cnt, czesc, n: nw };
  }
  // kolory + obrys
  const px = new Uint8ClampedArray(W * HH * 4);
  const put = (i, c, a = 255) => { px[i * 4] = c[0]; px[i * 4 + 1] = c[1]; px[i * 4 + 2] = c[2]; px[i * 4 + 3] = a; };
  for (let i = 0; i < W * HH; i++) {
    const b = buf[i]; if (!b) continue;
    const hex = kol[b.mat] || '#ff00ff';
    let c = rampa(hex)[b.ton];
    if (b.mat === 'oko' || b.mat === 'biel' || b.mat === 'usta') c = hexc(hex);
    put(i, c);
  }
  for (let y = 0; y < HH; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, b = buf[i];
    const sas = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => { const xx = x + dx, yy = y + dy; return xx < 0 || yy < 0 || xx >= W || yy >= HH ? null : buf[yy * W + xx]; });
    if (!b) { if (sas.some(Boolean)) put(i, INK); continue; }
    // linia wewnętrzna: sąsiad wyraźnie bliżej oka
    const skok = sas.some(q => q && q.t < b.t - 2.2 && q.czesc !== b.czesc);
    if (skok) { const c = rampa(kol[b.mat] || '#888')[0]; put(i, [Math.round((c[0] + INK[0] * 2) / 3), Math.round((c[1] + INK[1] * 2) / 3), Math.round((c[2] + INK[2] * 2) / 3)]); }
  }
  // Oczy: dwa czyste piksele 1×2 tam, gdzie oko wypada na twarzy (próbkowanie dawało plamy i nierówne oczy);
  // tylko gdy ta strona twarzy patrzy w oko kamery i piksel należy do głowy (nie zasłania go hełm ani włosy).
  const gi = m.czesci.findIndex(c => c.glowa);
  if (gi >= 0) {
    const hc = m.czesci[gi].glowa, r = m.czesci[gi].hr;
    const odwT = (v, kier) => { let x = v[0], y = v[1], z = v[2];
      if (prz) { const xx = x * cr - y * sr; y = x * sr + y * cr; x = xx; }
      if (pch) { const yy = y * cp - z * sp; z = y * sp + z * cp; y = yy; }
      if (!kier) y = y * sy0 + un; return [x, y, z]; };
    for (const sx of [-1, 1]) {
      const ex = sx * 0.36, ey = -0.02, ez = Math.sqrt(1 - ex * ex - ey * ey);
      const q = odwT([hc[0] + ex * r, hc[1] + ey * r, hc[2] + ez * r]), nq = odwT([ex, ey, ez], true);
      const w0 = cy * q[0] + sy * q[2], w2 = -sy * q[0] + cy * q[2];
      const nw2 = -sy * nq[0] + cy * nq[2];
      if (nq[1] * B[1] + nw2 * B[2] < 0.12) continue;
      const ex0 = Math.floor(ox + w0 * s), ey0 = Math.floor(oy - (q[1] * U[1] + w2 * U[2]) * s);
      for (const yy of [ey0 - 1, ey0]) {
        if (ex0 < 0 || yy < 0 || ex0 >= W || yy >= HH) continue;
        const b = buf[yy * W + ex0];
        if (!b || b.czesc !== gi || (b.mat !== 'skora' && b.mat !== 'rumieniec')) continue;
        put(yy * W + ex0, hexc(kol.oko));
      }
    }
  }
  return { w: W, h: HH, px, ox, oy };
}

// fasety „low-poly”: normalna przyciągnięta do 8 kierunków × 4 pochyleń
function fasetuj(n) {
  const az = Math.atan2(n[0], n[2]), el = Math.asin(Math.max(-1, Math.min(1, n[1])));
  const azq = Math.round(az / (Math.PI / 4)) * (Math.PI / 4);
  const elq = Math.round(el / (Math.PI / 6)) * (Math.PI / 6);
  return [Math.cos(elq) * Math.sin(azq), Math.sin(elq), Math.cos(elq) * Math.cos(azq)];
}

function material(h, m) {
  const cz = m.czesci[h.idx], p = h.p;
  if (cz.glowa) { // twarz: oczy, odblask, rumieńce, usta
    const q = [p[0] - cz.glowa[0], p[1] - cz.glowa[1], p[2] - cz.glowa[2]], r = cz.hr;
    if (q[2] > 0) {
      const ex = q[0] / r, ey = q[1] / r;
      if (m.A && Math.abs(ex) > 0.48 && Math.abs(ex) < 0.72 && ey < -0.22 && ey > -0.42) return 'rumieniec';
    }
  }
  if (cz.wzor === 'tulow') {
    const y = p[1] - cz.ty;
    if (cz.skos && Math.abs(p[0] * 0.8 + y - 0.3) < 0.75 && p[2] > -3) return 'pas';
    if (y > -1.55 && y < -0.65) return Math.abs(p[0]) < 0.7 && p[2] > 0 ? 'mosiadz' : 'pas';
    if (m.A && p[2] > 1.5 && Math.abs(p[0] - 0.9) < 0.35 && (Math.abs(y - 0.6) < 0.35 || Math.abs(y - 1.7) < 0.35)) return 'mosiadz';
    if (p[1] > cz.ty + 2.1 && Math.abs(p[0]) < 1.6 && p[2] > 0.4) return 'mosiadz'; // stójka
  }
  if (cz.wzor === 'czapka' && p[1] < cz.cy + 0.9 && p[1] > cz.cy - 0.1) return 'mosiadz';
  if (cz.wzor === 'pasHelmu' && Math.abs(p[0]) < 0.75 && p[1] > m.hy + 0.3) return 'mosiadz';
  if (cz.wzor === 'zapinka' && Math.abs(p[0]) < 0.6 && p[2] > 1.5) return 'mosiadz';
  if (cz.wzor === 'szachy') { const x = p[0] - cz.cc[0], y = p[1] - cz.cc[1]; if ((x < 0) !== (y > 0)) return 'stalCiemna'; }
  if (cz.wzor === 'liscie') { const a = Math.atan2(p[0], p[2]); if (Math.sin(a * 7) > 0.5 && p[1] < m.ty + 1.6) return 'lisc'; }
  return cz.mat;
}

export { renderuj, rampa, czubek, kula, E };
