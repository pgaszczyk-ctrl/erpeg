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
// zwężający się walec od a (promień ra) do b (rb): rogi, czubki kapeluszy, kryształy (przybliżone SDF, wystarcza w tej skali)
const stozek = (a, b, ra, rb) => p => { const pa = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const h = Math.max(0, Math.min(1, (pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2]) / (ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2])));
  return (len3(pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h) - (ra + (rb - ra) * h)) * 0.9; };
const lancuch = (add, pts, r0, r1, mat, ext) => { for (let i = 0; i + 1 < pts.length; i++) add(stozek(pts[i], pts[i + 1], r0 + (r1 - r0) * i / (pts.length - 1), r0 + (r1 - r0) * (i + 1) / (pts.length - 1)), mat, ext); };
const ciemniej = (hex, dl = -0.14) => { const c = przesun(hexc(hex), 0, 0, dl); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); };


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
// Hairstyles from the look editor (content/wygladPostaci.ts FryzuraChibi): simple shapes that read at 20 px.
function fryzuraChibi(f, add, hairCut, hy, hr) {
  const czepek = (r = 0.5, niz = -0.35) => add(hairCut(sph([0, hy + 0.5, -0.35], hr + r), niz), 'wlosy');
  const grzywka = () => {
    add(elip([-1.4, hy + hr * 0.62, hr * 0.62], [2.2, 1.1, 1.2]), 'wlosy');
    add(elip([1.6, hy + hr * 0.68, hr * 0.5], [1.8, 1.0, 1.2]), 'wlosy');
  };
  const warkocz = (sx, dl) => {
    add(kaps([sx * hr * 0.82, hy - 0.5, -0.8], [sx * hr * 0.9, hy - dl, -0.4], 0.95), 'wlosy', { warkocz: 1 });
    add(sph([sx * hr * 0.9, hy - dl - 0.3, -0.4], 0.75), 'mosiadz');
  };
  if (f === 'afro') { add(hairCut(sph([0, hy + 1.1, -0.9], hr + 1.6), -0.15), 'wlosy'); return; }
  if (f === 'irokez') {
    add(hairCut(sph([0, hy + 0.3, -0.35], hr + 0.15), -0.1), 'wlosy');
    for (let i = 0; i < 5; i++) { const z = 2.2 - i * 1.3; add(elip([0, hy + hr + 0.4 - Math.abs(i - 1.5) * 0.25, z], [0.9, 1.5, 0.9]), 'wlosy'); }
    return;
  }
  if (f === 'jez') {
    add(hairCut(sph([0, hy + 0.4, -0.35], hr + 0.3), -0.2), 'wlosy');
    for (const [x, z] of [[-2, 1.5], [0, 2.2], [2, 1.5], [-1.2, -0.8], [1.2, -0.8]]) add(elip([x, hy + hr + 0.15, z], [1.0, 0.7, 1.0]), 'wlosy');
    return;
  }
  czepek();
  grzywka();
  if (f === 'dlugie') {
    add(elip([0, hy - 2.4, -hr * 0.8], [hr * 0.95, 3.4, 1.6]), 'wlosy');
    for (const sx of [-1, 1]) add(kaps([sx * hr * 0.85, hy, -0.4], [sx * hr * 0.95, hy - 4.6, -0.6], 1.15), 'wlosy');
  } else if (f === 'bob') {
    add(elip([0, hy - 1.0, -hr * 0.75], [hr * 1.0, 2.4, 1.6]), 'wlosy');
    for (const sx of [-1, 1]) add(kaps([sx * hr * 0.85, hy + 0.5, -0.3], [sx * hr * 0.92, hy - 2.4, 0.1], 1.1), 'wlosy');
  } else if (f === 'warkocz') { warkocz(-1, 4.6); add(elip([0, hy - 1.4, -hr * 0.85], [hr * 0.85, 2.0, 1.4]), 'wlosy'); }
  else if (f === 'warkocze') { warkocz(-1, 4.2); warkocz(1, 4.2); }
  else if (f === 'kucyk') {
    add(sph([0, hy + hr * 0.55, -hr * 0.95], 1.2), 'wlosy');
    add(kaps([0, hy + hr * 0.45, -hr * 1.15], [0, hy - 3.6, -hr * 1.25], 1.05), 'wlosy', { warkocz: 1 });
  } else if (f === 'kok') add(sph([0, hy + hr + 0.6, -hr * 0.35], 1.9), 'wlosy');
  else if (f === 'koczki') for (const sx of [-1, 1]) add(sph([sx * hr * 0.78, hy + hr * 0.98, -0.5], 1.7), 'wlosy');
}

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
  const eq = o.eq || {};
  const kd = Object.assign({}, o.kolDod || {}, koloryEkwipunku(eq));
  const hy = 12.3 + bob, hr = A ? 5.0 : 4.7; // głowa
  const ty = 6.2 + bob;

  // buty i nogi
  for (const [sx, dz, dy] of [[-1.55, nogaL, podL], [1.55, nogaP, podP]]) {
    if (A) {
      add(rbox([sx, 0.95 + dy, 0.35 + dz], [1.25, 0.95, 1.6], 0.75), 'buty');
      add(kaps([sx, 2.0 + dy, dz * 0.6], [sx * 0.9, 4.3 + bob, 0], 1.15), 'spodnie');
      if (eq.buty?.cholewa) add(kaps([sx, 1.6 + dy, dz * 0.7], [sx * 0.95, 3.0 + dy * 0.6 + bob * 0.5, dz * 0.4], 1.3), 'buty', { fasety: true });
      if (eq.buty?.skrzydelka) add(elip([sx * 2.4, 1.9 + dy, dz - 0.3], [0.35, 0.75, 1.1]), 'eqBuz');
    } else {
      add(rbox([sx, 0.95 + dy, 0.3 + dz], [1.35, 0.95, 1.55], 0.3), 'buty');
      add(rbox([sx * 0.92, 3.1 + dy * 0.5 + bob * 0.5, dz * 0.5], [1.25, 1.35, 1.2], 0.3), 'spodnie');
    }
  }
  // tułów (z paskiem i guzikami jako wzór)
  const tulow = A ? elip([0, ty, 0], [2.8, 2.5, 2.1]) : rbox([0, ty, 0], [2.7, 2.3, 1.9], 0.55);
  const zb = eq.zbroja, matTulow = zb ? 'eqZ' : o.plaszcz ? 'plaszcz' : 'mundur';
  add(tulow, matTulow, { wzor: 'tulow', ty, kolczuga: zb?.ksztalt === 'kolczuga' });
  if (zb?.ksztalt === 'szata') add(A ? elip([0, ty - 2.2, 0], [3.3, 1.8, 2.5]) : rbox([0, ty - 2.2, 0], [3.2, 1.4, 2.3], 0.4), 'eqZ', { wzor: 'pola' });
  if (o.dol) add(A ? elip([0, ty - 1.9, 0], [3.4, 1.4, 2.4]) : rbox([0, ty - 1.9, 0], [3.3, 1.1, 2.2], 0.4), o.plaszcz ? 'plaszcz' : 'mundur', { wzor: 'pola' });
  // ręce
  const rekaL = chod ? -sw * (bieg ? 2.2 : 1.1) : 0, rekaP = -rekaL;
  for (const [sx, dz, bron] of [[-1, rekaL, false], [1, rekaP, true]]) {
    const bark = [sx * 2.8, ty + 1.6, 0];
    let dlon = bron && o.bron ? [sx * 3.6, ty - 1.0, 1.2] : [sx * 3.6, ty - 1.4, dz];
    const pz = o.poza ? pozaReki(o.poza, sx, ty) : null;
    if (pz) { dlon = pz.dlon; if (sx === 1) o._w = pz.w; else o._lewa = pz.dlon; }
    if (A) {
      const rekaMat = zb?.ksztalt === 'szata' ? 'eqZ' : 'mundur';
      add(kaps(bark, [(bark[0] + dlon[0]) / 2, (bark[1] + dlon[1]) / 2, (bark[2] + dlon[2]) / 2], 0.95), rekaMat);
      add(kaps([(bark[0] + dlon[0]) / 2, (bark[1] + dlon[1]) / 2, (bark[2] + dlon[2]) / 2], dlon, 0.85), o.mankiet ? 'pas' : o.podwiniete && rekaMat === 'mundur' ? 'skora' : rekaMat);
      add(sph(dlon, 0.95), 'skora');
    } else {
      add(rbox([(bark[0] + dlon[0]) / 2, (bark[1] + dlon[1]) / 2 + 0.3, (bark[2] + dlon[2]) / 2], [0.9, 1.6, 0.9], 0.25, sx * 0.12), 'mundur');
      add(rbox(dlon, [0.95, 0.95, 0.95], 0.35), 'skora');
    }
    if (sx === 1) o._dlon = dlon; else o._dlonL = dlon;
  }
  // głowa
  const hc = [0, hy, 0];
  if (A) add(sph(hc, hr), 'skora', { glowa: hc, hr });
  else add(rbox(hc, [hr, hr * 0.92, hr * 0.92], 1.5), 'skora', { glowa: hc, hr });
  if (A) { add(sph([-hr * 0.98, hy - 0.4, 0], 0.8), 'skora'); add(sph([hr * 0.98, hy - 0.4, 0], 0.8), 'skora'); }
  // włosy
  const hairCut = (base, niz) => p => { const q = p[1] - hy, z = p[2]; const linia = (z > 0 ? -0.05 * hr + z * 0.55 : niz * hr + z * 0.15); return Math.max(base(p), (linia - q) * 0.8); };
  const kryjeWlosy = eq.helm ? (eq.helm.ksztalt === 'kopula' || eq.helm.ksztalt === 'skorzany') : (o.helm && o.helmTyp !== 'kaszkiet');
  if (!kryjeWlosy) {
    if (A && o.fryz) fryzuraChibi(o.fryz, add, hairCut, hy, hr);
    else if (A) {
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
  if (eq.helm) helmEq(add, eq.helm, hy, hr);
  else if (o.helm) {
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
  if (zb?.ksztalt === 'plaszcz') plaszczEq(add, ty, A);
  if (o.naramiennik || zb?.naramiennik) add(A ? elip([3.3, ty + 2.0, 0], [1.6, 1.0, 1.6]) : rbox([3.3, ty + 1.9, 0], [1.5, 0.8, 1.5], 0.3), 'mosiadz', { fasety: !A });
  if (o.kaptur) add(A ? elip([0, hy - 2.2, -hr * 0.8], [hr * 0.9, 2.0, 1.6]) : rbox([0, hy - 2.2, -hr * 0.8], [hr * 0.85, 1.7, 1.4], 0.5), o.kaptur);
  if (eq.druga) drugaEq(add, eq.druga, o, ty);
  else if (o.tarcza) {
    const c = [-4.6, ty - 0.2, 1.3];
    if (A) { add(elip(c, [2.1, 2.5, 0.45]), 'mosiadz'); add(elip([c[0], c[1], c[2] + 0.35], [1.7, 2.1, 0.3]), 'stal', { wzor: 'szachy', cc: c }); }
    else { add(rbox(c, [2.0, 2.4, 0.35], 0.4), 'mosiadz'); add(rbox([c[0], c[1], c[2] + 0.3], [1.6, 2.0, 0.25], 0.3), 'stal', { wzor: 'szachy', cc: c }); }
  }
  const d = o._dlon;
  const eb = eq.bron, ks = eb?.ksztalt;
  if (eb && o.poza && o.poza.typ === 'luk' && o._lewa && ks !== 'luk') bronStrzelecka(add, eb, o._lewa, d);
  else if (eb && !(o.poza && o.poza.typ === 'luk' && o._lewa)) bronEq(add, eb, d, o._w, ty);
  else if (o.poza && o.poza.typ === 'luk' && o._lewa) {
    const dl = eb?.dl || 1, mb = eb ? 'eqB' : 'drewno';
    const h = o._lewa, P = f => [h[0] - Math.sin(f) * 7.0 * 0.6 * dl, h[1] + Math.sin(f) * 7.0 * 0.8 * dl, h[2] + (Math.cos(f) - 1) * 2.6 + 0.4];
    for (let i = 0; i < 8; i++) { const f0 = -1.2 + i * 0.3, f1 = f0 + 0.3; add(kaps(P(f0), P(f1), 0.42), mb, { cienka: 1 }); }
    if (eb?.zdobienie) add(sph(h, 0.55), 'eqBz');
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
  return { czesci, k, A, hy, hr, ty, kolory: kd, kolorOczu: o.kolorOczu, usta: o.ustaD, bezRumiencow: o.bezRumiencow };
}

// ---------- ekwipunek z opisu (content/naPostaci.ts): każdy przedmiot ze swoim kształtem i kolorami ----------
function koloryEkwipunku(eq) {
  const kd = {};
  const h = eq.helm;
  if (h) { kd.eqH = h.kolor; kd.eqH2 = h.kolor2 || ciemniej(h.kolor, -0.16); kd.eqHz = h.zdobienie || ciemniej(h.kolor, -0.22); kd.eqRog = h.rogi || '#ece4d4'; kd.eqPio = h.pioro || '#efe3c8'; }
  const b = eq.bron;
  if (b) { kd.eqB = b.kolor; kd.eqB2 = b.kolor2 || '#7b4a2b'; kd.eqBz = b.zdobienie || kd.eqB2; kd.eqBk = b.krysztal || '#9fd0ff'; }
  const d = eq.druga;
  if (d?.typ === 'bron') { kd.eqL = d.kolor; kd.eqL2 = d.kolor2 || '#7b4a2b'; kd.eqLz = d.zdobienie || kd.eqL2; kd.eqLk = d.krysztal || '#9fd0ff'; }
  else if (d) { kd.eqD = d.kolor; kd.eqD2 = d.kolor2 || ciemniej(d.kolor); kd.eqDz = d.zdobienie || kd.eqD2; kd.eqDc = ciemniej(d.kolor, -0.1); kd.eqStrz = d.strzaly || '#efe3c8'; }
  const z = eq.zbroja;
  if (z) { kd.eqZ = z.ksztalt === 'plaszcz' ? (z.kolor2 || '#3a2a3a') : z.kolor; kd.eqZ2 = z.kolor2 || ciemniej(z.kolor); kd.eqP = z.kolor; kd.eqPz = z.zdobienie || '#d0a548'; }
  const u = eq.buty;
  if (u) { kd.buty = u.kolor; kd.eqBuz = u.skrzydelka || '#efe3c8'; }
  return kd;
}

function helmEq(add, h, hy, hr) {
  const k = h.ksztalt || 'kopula';
  if (k === 'kopula' || k === 'skorzany') {
    const hc2 = [0, hy + 0.3, -0.2];
    add(p => Math.max(sph(hc2, hr * 1.1)(p), (hy + hr * 0.48 - p[1] - Math.max(0, -p[2]) * 0.5) * 0.9), 'eqH', { wzor: k === 'kopula' ? 'pasHelmuEq' : 'szwyEq', fasety: k === 'kopula' });
    add(cyl([0, hy + hr * 0.48, -0.2], hr * 1.13, 0.4), 'eqHz');
    if (h.nosal) add(kaps([0, hy + hr * 0.45, hr * 1.12], [0, hy - 0.4, hr * 1.06], 0.4), 'eqH');
    if (h.rogi) for (const sx of [-1, 1])
      lancuch(add, [[sx * hr * 0.9, hy + hr * 0.62, -0.3], [sx * (hr + 1.4), hy + hr * 0.85, -0.4], [sx * (hr + 2.4), hy + hr + 0.8, -0.5], [sx * (hr + 2.7), hy + hr + 2.9, -0.4]], 1.05, 0.25, 'eqRog');
  } else if (k === 'kaszkiet') {
    add(elip([0, hy + hr * 0.7, -0.2], [hr * 1.02, hr * 0.5, hr * 1.02]), 'eqH', { wzor: 'czapkaEq', cy: hy + hr * 0.5 });
    add(elip([0, hy + hr * 0.42, hr * 0.85], [hr * 0.75, 0.35, 1.5]), 'eqH2');
  } else if (k === 'spiczasta') {
    add(elip([0, hy + hr * 0.52, 0], [hr * 1.5, 0.45, hr * 1.5]), 'eqH');
    add(cyl([0, hy + hr * 0.68, 0], hr * 0.98, 0.4), 'eqHz');
    lancuch(add, [[0, hy + hr * 0.6, 0], [0, hy + hr + 1.8, -0.4], [0, hy + hr + 3.9, -1.3], [0.3, hy + hr + 5.0, -3.0]], hr * 0.97, 0.3, 'eqH');
  } else if (k === 'kapelusz') {
    add(elip([0, hy + hr * 0.5, 0.3], [hr * 1.25, 0.4, hr * 1.35]), 'eqH');
    add(cyl([0, hy + hr * 0.62, 0], hr * 0.92, 0.35), 'eqHz');
    lancuch(add, [[0, hy + hr * 0.6, 0.6], [0, hy + hr + 0.8, -0.4], [0, hy + hr + 1.9, -2.6]], hr * 0.9, 0.4, 'eqH');
    if (h.pioro) lancuch(add, [[hr * 0.8, hy + hr * 0.75, -0.6], [hr * 1.05, hy + hr + 1.6, -1.8], [hr * 0.9, hy + hr + 3.4, -3.4]], 0.6, 0.15, 'eqPio');
  } else if (k === 'korona') {
    const cy = hy + hr * 0.82, R = hr * 0.82;
    add(p => Math.max(Math.abs(Math.hypot(p[0], p[2] + 0.1) - R) - 0.45, Math.abs(p[1] - cy) - 0.8), 'eqH', { wzor: 'klejnotyEq', cy });
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.26, x = Math.sin(a) * R, z = Math.cos(a) * R - 0.1;
      add(stozek([x, cy + 0.6, z], [x, cy + 2.0, z], 0.55, 0.2), 'eqH'); add(sph([x, cy + 2.15, z], 0.35), 'eqH'); }
  } else if (k === 'cylinder') {
    add(elip([0, hy + hr * 0.55, 0], [hr * 1.3, 0.4, hr * 1.3]), 'eqH');
    add(cyl([0, hy + hr + 0.2, -0.1], hr * 0.72, 2.2), 'eqH', { wzor: 'pasCylEq', cy: hy + hr - 2.0 });
    add(cyl([0, hy + hr + 2.45, -0.1], hr * 0.66, 0.3), 'eqH2');
  }
}

function bronEq(add, b, d, w, ty, lewa = false) {
  const M = lewa ? { B: 'eqL', B2: 'eqL2', Bz: 'eqLz', Bk: 'eqLk' } : { B: 'eqB', B2: 'eqB2', Bz: 'eqBz', Bk: 'eqBk' }, sx = lewa ? -1 : 1;
  const ks = b.ksztalt, dl = b.dl || 1, sz = b.szer || 1, sw = b.poswiata ? { swieci: b.poswiata } : {};
  // Spoczynek: wielka głowa chibi zasłania wszystko, co stoi pionowo przy dłoni – broń opuszczona na bok,
  // kostur obok dłoni i wyższy od głowy, różdżka wysunięta skośnie.
  const idle = !w;
  if (!w) {
    if (ks === 'kostur' || ks === 'galaz') { d = [d[0] + 1.5 * sx, d[1], d[2]]; w = [0, 1, 0]; }
    else if (ks === 'rozdzka') w = n3([0.45 * sx, 1, 0.1]);
    else w = n3([0.5 * sx, -0.8, 0.3]);
  }
  const pt = k => [d[0] + w[0] * k, d[1] + w[1] * k, d[2] + w[2] * k];
  const pr = Math.abs(w[1]) < 0.95 ? n3([w[2], 0, -w[0]]) : [1, 0, 0];
  const bok = (q, s) => [q[0] + pr[0] * s, q[1] + pr[1] * s, q[2] + pr[2] * s];
  if (ks === 'miecz' || ks === 'szabla') {
    add(kaps(pt(-0.9), pt(0.4), 0.38), M.B2);
    const g = pt(0.6), j = 1.2 * Math.min(1.25, sz);
    add(kaps(bok(g, -j), bok(g, j), 0.36), M.Bz);
    if (ks === 'miecz') add(kaps(pt(0.9), pt(0.9 + 6.3 * dl), 0.42 * sz), M.B, Object.assign({ cienka: 1 }, sw));
    else for (let i = 0; i < 5; i++) { const a = i / 5, a1 = (i + 1) / 5;
      add(kaps(bok(pt(0.9 + a * 5.6 * dl), a * a * 1.6), bok(pt(0.9 + a1 * 5.6 * dl), a1 * a1 * 1.6), 0.42 - a * 0.12), M.B, Object.assign({ cienka: 1 }, sw)); }
    add(sph(pt(-1.05), 0.45), M.Bz);
  } else if (ks === 'kostur' || ks === 'rozdzka' || ks === 'galaz') {
    const krotka = ks === 'rozdzka';
    const k0 = idle ? (krotka ? -1.3 : -(d[1] - 0.6)) : (krotka ? -1.2 : -4.5);
    const k1 = idle ? (krotka ? 4.4 : ty + 9.0 - d[1]) : (krotka ? 3.2 : 3.6);
    add(kaps(pt(k0), pt(k1), krotka ? 0.4 : 0.48), M.B, { cienka: 1 });
    if (b.kolor2 && !krotka) add(kaps(pt(-1.4), pt(1.0), 0.6), M.B2);
    if (ks === 'galaz') {
      add(kaps(pt(k1 - 1.7), bok(pt(k1 - 0.1), -1.6), 0.35), M.B);
      add(elip(bok(pt(k1 + 0.5), -2.3), [1.2, 0.7, 0.5]), 'lisc'); add(elip(bok(pt(k1 + 0.9), 0.9), [1.2, 0.7, 0.5]), 'lisc');
    } else if (b.krysztal) {
      if (b.zdobienie) add(sph(pt(k1 - 0.2), 0.62), M.Bz);
      if (!krotka) for (const s of [-1, 1]) add(stozek(bok(pt(k1 - 0.2), s * 0.5), bok(pt(k1 + 1.6), s * 1.25), 0.38, 0.2), M.B);
      const r = krotka ? 0.75 : 1.05;
      add(stozek(pt(k1 + 0.1), pt(k1 + 1.4), r * 0.45, r), M.Bk, Object.assign({ fasety: true }, sw));
      add(stozek(pt(k1 + 1.4), pt(k1 + (krotka ? 2.6 : 3.2)), r, 0.15), M.Bk, Object.assign({ fasety: true }, sw));
    } else add(sph(pt(k1 + 1.1), 1.25), M.Bz, Object.assign({ fasety: true }, sw));
  } else if (ks === 'siekiera' || ks === 'kilof') {
    const k1 = 5.5;
    add(kaps(pt(-1.2), pt(k1), 0.36), M.B2, { cienka: 1 });
    if (ks === 'siekiera') add(stozek(bok(pt(k1 - 0.6), 0.3), bok(pt(k1 - 0.9), 2.4), 0.55, 1.35), M.B, { fasety: true });
    else lancuch(add, [bok(pt(k1 - 1.0), -2.8), bok(pt(k1 - 0.1), -1.3), pt(k1 + 0.2), bok(pt(k1 - 0.1), 1.3), bok(pt(k1 - 1.0), 2.8)], 0.5, 0.25, M.B);
  } else if (ks === 'luk') {
    const cx = d[0] + 0.6, cy = d[1] + 0.6, R = 5.2 * dl;
    for (let i = 0; i < 8; i++) { const a0 = -1.25 + i * 2.5 / 8, a1 = a0 + 2.5 / 8;
      add(kaps([cx + Math.cos(a0) * 1.9, cy + Math.sin(a0) * R, d[2]], [cx + Math.cos(a1) * 1.9, cy + Math.sin(a1) * R, d[2]], 0.42), M.B, { cienka: 1 }); }
    add(kaps([cx + Math.cos(-1.25) * 1.9, cy - Math.sin(1.25) * R, d[2]], [cx + Math.cos(1.25) * 1.9, cy + Math.sin(1.25) * R, d[2]], 0.13), 'cieciwa', { cienka: 1 });
    if (b.zdobienie) add(sph([cx + 1.9, cy, d[2]], 0.5), M.Bz);
  } else if (ks === 'kusza' || ks === 'karabin') {
    add(kaps(pt(-1.0), pt(ks === 'kusza' ? 3.8 : 3.0), 0.5), M.B2, { cienka: 1 });
    if (ks === 'karabin') add(kaps(pt(3.0), pt(7.4), 0.32), M.B, { cienka: 1 });
    else { add(kaps(pt(3.8), pt(5.2), 0.35), M.B); add(kaps(bok(pt(4.6), -2.3), bok(pt(4.6), 2.3), 0.33), M.B, { cienka: 1 }); }
  } else if (ks === 'pistolet') {
    add(kaps(pt(-0.5), pt(0.8), 0.45), M.B2); add(kaps(pt(0.6), pt(2.6), 0.42), M.B, { fasety: true });
  }
}

/** Kusza, pistolet, karabin w pozie strzału (lewa ręka z przodu, prawa przy kolbie). */
function bronStrzelecka(add, b, h, r) {
  const ks = b.ksztalt;
  if (ks === 'pistolet') { add(kaps([h[0], h[1] - 0.3, h[2]], [h[0], h[1] + 0.2, h[2] + 2.2], 0.45), 'eqB', { fasety: true }); return; }
  add(kaps(r, h, 0.5), 'eqB2', { cienka: 1 });
  add(kaps(h, [h[0], h[1], h[2] + (ks === 'karabin' ? 3.4 : 1.6)], 0.33), 'eqB', { cienka: 1 });
  if (ks === 'kusza') add(kaps([h[0] - 2.3, h[1], h[2] + 1.2], [h[0] + 2.3, h[1], h[2] + 1.2], 0.33), 'eqB', { cienka: 1 });
}

function drugaEq(add, dd, o, ty) {
  const ks = dd.ksztalt, sw = dd.poswiata ? { swieci: dd.poswiata } : {};
  // druga broń jednoręczna (1.072): w lewej dłoni, odbicie lustrzane pozy prawej
  if (dd.typ === 'bron') { const L = o._lewa || o._dlonL; if (L) bronEq(add, dd, L, undefined, ty, true); return; }
  if (ks === 'tarcza_okragla' || ks === 'tarcza_herbowa') {
    const c = [-4.6, ty - 0.2, 1.3], okr = ks === 'tarcza_okragla';
    const ksz = (cc, rr) => { const e = elip(cc, rr); return okr ? e : p => Math.max(e(p), p[1] - (cc[1] + rr[1] * 0.55)); };
    const R = okr ? [2.1, 2.5, 0.45] : [2.1, 3.0, 0.45];
    add(ksz(c, R), 'eqD2');
    add(ksz([c[0], c[1] + (okr ? 0 : -0.15), c[2] + 0.35], [R[0] - 0.4, R[1] - 0.45, 0.3]), 'eqD', { wzor: 'deskiEq', cc: c });
    add(sph([c[0], c[1] - (okr ? 0 : 0.3), c[2] + 0.75], 0.6), 'eqDz', { fasety: true });
    return;
  }
  if (ks === 'kolczan') {
    const a = [-1.4, ty - 2.0, -2.75], b = [1.5, ty + 3.0, -2.75];
    add(kaps(a, b, 1.05), 'eqD', { wzor: 'kolczanEq', a, b });
    const os = n3([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
    for (const [dx, dz] of [[-0.5, 0.2], [0.3, -0.3], [0.7, 0.4]]) {
      const s0 = [b[0] + dx, b[1] - 0.4, b[2] + dz], s1 = [s0[0] + os[0] * 2.4, s0[1] + os[1] * 2.4, s0[2] + os[2] * 2.4];
      add(kaps(s0, s1, 0.18), 'drewno', { cienka: 1 }); add(elip(s1, [0.45, 0.7, 0.3]), 'eqStrz');
    }
    return;
  }
  const L = o._lewa || o._dlonL;
  if (!L) return;
  if (ks === 'kula') {
    const c = [L[0], L[1] + 1.35, L[2] + 0.3];
    add(sph(c, 1.3), 'eqD', Object.assign({ wzor: 'polyskKuli', cc: c }, sw));
    add(cyl([L[0], L[1] + 0.15, L[2] + 0.3], 0.75, 0.25), 'eqD2');
  } else if (ks === 'ksiega') {
    const c = [L[0] - 0.4, L[1] + 0.9, L[2] + 1.3];
    add(rbox(c, [1.15, 1.5, 0.5], 0.2), 'eqD', { wzor: 'ksiegaEq', cc: c });
  }
}

function plaszczEq(add, ty, A) {
  const top = ty + 3.2, dol = 1.0, box = rbox([0, (top + dol) / 2, -2.55], [3.0, (top - dol) / 2, 0.45], 0.45);
  add(p => { const g = Math.max(0, top - p[1]), hw = 3.0 + g * 0.14; return box([p[0] * 3.0 / hw, p[1], p[2] + g * 0.05]); }, 'eqP', { wzor: 'plaszczEq', dol });
  add(A ? elip([0, ty + 2.5, -0.5], [3.3, 1.0, 2.4]) : rbox([0, ty + 2.4, -0.5], [3.2, 0.8, 2.3], 0.35), 'eqP');
  add(sph([0, ty + 2.6, 1.7], 0.5), 'eqPz');
}

const KOLOR_MAT = k => ({
  skora: k.skora, wlosy: k.wlosy, mundur: k.mundur, spodnie: k.spodnie, buty: '#6e4124', pas: '#5b3620', mosiadz: '#d0a548',
  stal: '#a9b1bd', drewno: '#7b4a2b', cieciwa: '#e9dcc0', czapka: k.czapka || '#303868', czapkaCiemna: '#20264a', helm: k.helm || '#3c4a7c',
  plaszcz: k.plaszcz || '#8c3c2a', szal: k.szal || '#2c3566', lisc: '#5f913c', niebieska: '#3a53b5', zielony: '#2f7376',
  oko: '#2b1b16', biel: '#fff6e0', rumieniec: '#e98d78', usta: '#a85a4a', stalCiemna: '#3c4a7c', liscCiemny: '#3a2a1a', kaptur: '#4a3a30', pletwa: '#2f8a7a'
});

// ---------- render ----------
// zwraca {w, h, px: Uint8ClampedArray, ox, oy} – stopy w (ox, oy)
function renderuj(o, yaw, faza, H) {
  const s = H / 20;
  const W = Math.ceil(H * 1.7) + 4, HH = Math.ceil(H * 1.4) + 4;
  const ox = W / 2, oy = HH - 3;
  const m = o.stwor ? modelStwora(Object.assign({}, o), faza) : model(Object.assign({}, o), faza);
  const kol = Object.assign(KOLOR_MAT(m.k), m.kolory || {});
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const loc = (w) => [cy * w[0] - sy * w[2], w[1], sy * w[0] + cy * w[2]];
  const sdf = p => { let best = 1e9, idx = -1; for (let i = 0; i < m.czesci.length; i++) { const d = m.czesci[i].sdf(p); if (d < best) { best = d; idx = i; } } return [best, idx]; };
  // całe ciało: uniesienie (skok), spłaszczenie przy lądowaniu, pochylenie w biegu, przechył przy uniku
  const un = o.unos || 0, sy0 = o.sy || 1, pch = o.pochyl || 0, prz = o.przechyl || 0;
  const cp = Math.cos(pch), sp = Math.sin(pch), cr = Math.cos(prz), sr = Math.sin(prz);
  const wyp = o.wypad || 0;
  const T = (q) => { let x = q[0], y = (q[1] - un) / sy0, z = q[2] - wyp;
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
    // cienkie rzeczy (ostrza, drzewca, cięciwy) zostają linią 1 px, nawet gdy pokrywają tylko część piksela
    if (probki.length < 4 && !(probki.length >= 2 && probki.some(h => m.czesci[h.idx].cienka))) { buf[py * W + px] = null; continue; }
    // materiał większościowy (oczy i drobiazgi mają pierwszeństwo)
    const ile = {};
    const mats = probki.map(h => material(h, m));
    mats.forEach(x => ile[x] = (ile[x] || 0) + 1);
    let mat = null;
    for (const pr of ['oko', 'biel', 'cieciwa', 'usta', 'eqHz', 'eqBz', 'eqLz', 'eqDz', 'eqPz']) if ((ile[pr] || 0) >= 2) { mat = pr; break; }
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
  // Poświata: przedmioty, które świecą (ostrze, kryształ, kula), dostają jasny obrys i miękką aureolę 2 px.
  const swieci = new Array(W * HH);
  let jestPoswiata = false;
  for (let i = 0; i < W * HH; i++) { const b = buf[i]; const c = b && m.czesci[b.czesc]?.swieci; if (c) { swieci[i] = c; jestPoswiata = true; } }
  if (jestPoswiata) for (let y = 0; y < HH; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (buf[i]) continue;
    let d = 9, c = null;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= HH) continue; const s2 = swieci[yy * W + xx]; if (!s2) continue;
      const dd = Math.max(Math.abs(dx), Math.abs(dy)); if (dd < d) { d = dd; c = s2; } }
    if (!c) continue;
    const g = hexc(c);
    if (px[i * 4 + 3] === 255) { if (d === 1) put(i, [Math.round((INK[0] + g[0]) / 2), Math.round((INK[1] + g[1]) / 2), Math.round((INK[2] + g[2]) / 2)]); }
    else put(i, g, 120);
  }
  // Oczy: dwa czyste piksele 1×2 tam, gdzie oko wypada na twarzy (próbkowanie dawało plamy i nierówne oczy);
  // tylko gdy ta strona twarzy patrzy w oko kamery i piksel należy do głowy (nie zasłania go hełm ani włosy).
  const gi = m.czesci.findIndex(c => c.glowa);
  if (gi >= 0) {
    const hc = m.czesci[gi].glowa, r = m.czesci[gi].hr;
    const odwT = (v, kier) => { let x = v[0], y = v[1], z = v[2];
      if (prz) { const xx = x * cr - y * sr; y = x * sr + y * cr; x = xx; }
      if (pch) { const yy = y * cp - z * sp; z = y * sp + z * cp; y = yy; }
      if (!kier) { y = y * sy0 + un; z += wyp; } return [x, y, z]; };
    for (const sx of [-1, 1]) {
      const ex = sx * (m.oczyX ?? 0.36), ey = m.oczyY ?? -0.02, ez = Math.sqrt(Math.max(0.05, 1 - ex * ex - ey * ey));
      const q = odwT([hc[0] + ex * r, hc[1] + ey * r, hc[2] + ez * r]), nq = odwT([ex, ey, ez], true);
      const w0 = cy * q[0] + sy * q[2], w2 = -sy * q[0] + cy * q[2];
      const nw2 = -sy * nq[0] + cy * nq[2];
      if (nq[1] * B[1] + nw2 * B[2] < 0.12) continue;
      const ex0 = Math.floor(ox + w0 * s), ey0 = Math.floor(oy - (q[1] * U[1] + w2 * U[2]) * s);
      const wys = m.oczyWys ?? 2, szer = m.oczySzer ?? 1, twarz = m.twarz || ['skora', 'rumieniec'];
      for (let dy = 0; dy < wys; dy++) for (let dx = 0; dx < szer; dx++) {
        const xx = ex0 + (sx < 0 ? -dx : dx), yy = ey0 - (wys - 1) + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= HH) continue;
        const b = buf[yy * W + xx];
        if (!b || b.czesc !== gi || !twarz.includes(b.mat)) continue;
        put(yy * W + xx, hexc(m.kolorOczu || kol.oko));
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
      if (m.usta && Math.abs(ex) < m.usta.w && ey < m.usta.y + 0.07 && ey > m.usta.y - 0.07 + Math.abs(ex) * (m.usta.usmiech || 0)) return 'usta';
      if (m.A && !m.bezRumiencow && Math.abs(ex) > 0.48 && Math.abs(ex) < 0.72 && ey < -0.22 && ey > -0.42) return 'rumieniec';
    }
  }
  if (cz.wzor === 'tulow') {
    const y = p[1] - cz.ty;
    if (cz.skos && Math.abs(p[0] * 0.8 + y - 0.3) < 0.75 && p[2] > -3) return 'pas';
    if (y > -1.55 && y < -0.65) return Math.abs(p[0]) < 0.7 && p[2] > 0 ? 'mosiadz' : 'pas';
    if (m.A && p[2] > 1.5 && Math.abs(p[0] - 0.9) < 0.35 && (Math.abs(y - 0.6) < 0.35 || Math.abs(y - 1.7) < 0.35)) return 'mosiadz';
    if (p[1] > cz.ty + 2.1 && Math.abs(p[0]) < 1.6 && p[2] > 0.4) return 'mosiadz'; // stójka
    if (cz.kolczuga && Math.floor((p[1] - cz.ty) * 1.25 + 20) % 2) return 'eqZ2'; // rzędy kółek kolczugi
  }
  if (cz.wzor === 'czapka' && p[1] < cz.cy + 0.9 && p[1] > cz.cy - 0.1) return 'mosiadz';
  if (cz.wzor === 'brzuch' && p[1] < cz.by - 1.2) return 'futroJasne';
  if (cz.wzor === 'brzuchImp' && p[2] > 1.2 && Math.abs(p[0]) < 2.0) return 'brzuch';
  if (cz.wzor === 'zebra' && (Math.abs(p[0]) < 0.45 ? false : Math.abs(Math.sin((p[1] - cz.ty) * 1.9)) < 0.5)) return 'koscCiemna';
  if (cz.wzor === 'korzenie' && Math.abs(Math.sin(Math.atan2(p[0], p[2]) * 6)) < 0.25) return 'liscCiemny';
  if (cz.wzor === 'kwiatki' && Math.abs(Math.sin(p[0] * 3.1) * Math.sin(p[1] * 2.7) * Math.sin(p[2] * 2.3)) > 0.82) return 'kwiat';
  if (cz.wzor === 'szata' && p[1] < cz.ty) return 'szataCiemna';
  if (cz.wzor === 'polysk' && p[1] > cz.glowa[1] + 2.2 && p[0] < -1 && p[0] > -3.2 && p[2] > 0) return 'blysk';
  if (cz.wzor === 'nity' && p[2] > 1.6 && (Math.abs(p[1] - cz.ty - 1.8) < 0.35 || Math.abs(p[1] - cz.ty + 1.8) < 0.35) && Math.abs(((p[0] + 10) % 1.6) - 0.8) < 0.35) return 'zelazo';
  if (cz.wzor === 'pasHelmu' && Math.abs(p[0]) < 0.75 && p[1] > m.hy + 0.3) return 'mosiadz';
  if (cz.wzor === 'pasHelmuEq' && Math.abs(p[0]) < 0.75 && p[1] > m.hy + 0.3) return 'eqHz';
  if (cz.wzor === 'szwyEq' && Math.abs(p[0]) < 0.45 && p[1] > m.hy + 0.3) return 'eqHz';
  if (cz.wzor === 'czapkaEq' && p[1] < cz.cy + 0.9 && p[1] > cz.cy - 0.1) return 'eqHz';
  if (cz.wzor === 'pasCylEq' && p[1] < cz.cy + 0.9) return 'eqHz';
  if (cz.wzor === 'klejnotyEq' && p[2] > 0 && Math.abs(p[1] - cz.cy) < 0.4 && Math.abs(Math.sin(Math.atan2(p[0], p[2]) * 3)) < 0.3) return 'eqHz';
  if (cz.wzor === 'deskiEq' && Math.floor((p[0] - cz.cc[0] + 10) / 1.2) % 2) return 'eqDc';
  if (cz.wzor === 'polyskKuli' && p[0] - cz.cc[0] < -0.35 && p[1] - cz.cc[1] > 0.35) return 'biel';
  if (cz.wzor === 'ksiegaEq') { const x = p[0] - cz.cc[0], y = p[1] - cz.cc[1], z = p[2] - cz.cc[2];
    if (Math.abs(y) > 1.15 && Math.abs(x) > 0.8) return 'eqDz';
    if (x > 0.95 && Math.abs(z) < 0.4) return 'eqD2';
    if (z > 0.3 && Math.abs(y) < 0.45 && Math.abs(x) < 0.45) return 'eqDz'; }
  if (cz.wzor === 'kolczanEq') { const a = cz.a, b = cz.b, ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const t = ((p[0] - a[0]) * ba[0] + (p[1] - a[1]) * ba[1] + (p[2] - a[2]) * ba[2]) / (ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2]);
    if (t > 0.84 || t < 0.1 || Math.abs(t - 0.5) < 0.06) return 'eqD2'; }
  if (cz.wzor === 'plaszczEq' && p[1] < cz.dol + 0.8) return 'eqPz';
  if (cz.wzor === 'zapinka' && Math.abs(p[0]) < 0.6 && p[2] > 1.5) return 'mosiadz';
  if (cz.wzor === 'szachy') { const x = p[0] - cz.cc[0], y = p[1] - cz.cc[1]; if ((x < 0) !== (y > 0)) return 'stalCiemna'; }
  if (cz.wzor === 'liscie') { const a = Math.atan2(p[0], p[2]); if (Math.sin(a * 7) > 0.5 && p[1] < m.ty + 1.6) return 'lisc'; }
  return cz.mat;
}


// ---------- stwory (te same bryły, ten sam aparat co bohater) ----------
// jednostki jak u bohatera: ~20 = wysokość „nominalna” postaci; render skaluje przez H.
function modelStwora(o, faza) {
  const czesci = [];
  const add = (sdf, mat, ext) => czesci.push(Object.assign({ sdf, mat }, ext || {}));
  const chod = o.chod ? 1 : 0, sw = Math.sin(faza * Math.PI * 2), cw = Math.cos(faza * Math.PI * 2);
  const zam = o.poza === 'zamach', cios = o.poza === 'cios';
  const g = o.stwor;
  let hy = 12, hr = 4.5, ty = 6, extra = {};
  if (g === 'wilk' || g === 'warg') {
    const w = g === 'warg';
    const bob = chod ? Math.abs(cw) * 0.5 : 0;
    const by = 7.2 + bob;
    add(elip([0, by, -0.5], [w ? 3.6 : 3.1, w ? 3.3 : 2.9, 6.4]), 'futro', { wzor: 'brzuch', by });
    add(elip([0, by + 1.6, 4.4], [w ? 3.3 : 2.8, w ? 3.4 : 3.1, 3.2]), 'futro');
    const hz = 8.3 + (cios ? 1.2 : 0), hyy = by + 4.0 - (zam ? 1.2 : 0);
    hy = hyy; hr = w ? 3.8 : 3.3;
    const hc = [0, hyy, hz];
    add(sph(hc, hr), 'futro', { glowa: hc, hr });
    add(elip([0, hyy - 1.0, hz + 3.0], [1.7, 1.4, 2.6]), 'pysk');
    add(sph([0, hyy - 0.3, hz + 5.3], 0.75), 'nos');
    if (cios || w) add(elip([0, hyy - 2.4, hz + 2.6], [1.4, 0.6, 2.2]), 'pysk');  // dolna szczęka (otwarta przy ciosie)
    for (const sx of [-1, 1]) add(elip([sx * 1.9, hyy + hr * 0.95, hz - 0.6], [0.9, 1.8, 0.6]), 'futroCiemne');
    if (w) for (let i = 0; i < 5; i++) add(elip([0, by + 3.0 - i * 0.2, 3 - i * 2.2], [0.5, 1.4 - i * 0.12, 0.8]), 'futroCiemne');
    for (const [sx, sz, f] of [[-1, 4, 0], [1, 4, 0.5], [-1, -4.5, 0.5], [1, -4.5, 0]]) {
      const s2 = chod ? Math.sin((faza + f) * Math.PI * 2) : 0, lift = chod ? Math.max(0, s2) * 1.2 : 0;
      const kroki = cios ? (sz > 0 ? 2.5 : -2.5) : zam ? (sz > 0 ? -0.8 : 0.8) : s2 * 2.2;
      add(kaps([sx * 1.9, by - 1.5, sz], [sx * 1.9, 1.0 + lift, sz + kroki], w ? 1.15 : 0.95), 'futro');
      add(sph([sx * 1.9, 0.9 + lift, sz + kroki + 0.4], w ? 1.15 : 1.0), 'futroJasne');
    }
    const wag = chod ? sw * 1.2 : zam ? 2 : 0;
    add(kaps([0, by + 1.2, -6.2], [wag, by + 3.2, -10], 1.1), 'futro');
    add(sph([wag, by + 3.4, -10.4], 1.1), 'futroJasne');
    extra = { kolory: w ? { futro: '#5a4234', futroCiemne: '#2e2420', futroJasne: '#8a7058', pysk: '#7a604a', nos: '#1e1a24' } : { futro: '#8b8d96', futroCiemne: '#53525c', futroJasne: '#d4cfc6', pysk: '#c9c2b6', nos: '#2a2430' },
      kolorOczu: w ? '#ff4a3a' : '#ffd34a', oczyX: 0.42, oczyY: 0.18, twarz: ['futro'], oczyWys: 1, oczySzer: w ? 2 : 1 };
  } else if (g === 'chochlik') {
    const bob = chod ? Math.abs(cw) * 0.7 : 0;
    ty = 5.5 + bob; hy = 11.8 + bob - (zam ? 0.6 : 0); hr = 4.7;
    add(elip([0, ty, 0], [3.3, 3.5, 2.9]), 'skora', { wzor: 'brzuchImp', ty });
    const hc = [0, hy, 0.5 + (cios ? 0.8 : 0)];
    add(sph(hc, hr), 'skora', { glowa: hc, hr });
    for (const sx of [-1, 1]) {
      add(kaps([sx * 2.3, hy + 3.4, 0.2], [sx * 3.6, hy + 6.4, -0.8], 0.75), 'rog');
      add(elip([sx * 5.2, hy + 0.6, 0], [1.9, 0.75, 0.55]), 'skora');
      const krok = chod ? sw * sx * 1.4 : 0;
      add(kaps([sx * 1.6, ty - 2.5, 0], [sx * 1.7, 1.0 + Math.max(0, sw * sx) * 0.8, krok], 0.95), 'skoraCiemna');
      add(elip([sx * 1.7, 0.8, krok + 0.6], [1.0, 0.8, 1.4]), 'skoraCiemna');
      const rp = zam ? [sx * 3.4, ty + 4.5, -0.5] : cios ? [sx * 2.4, ty + 0.8, 4.2] : [sx * 3.8, ty - 1.2, chod ? -sw * sx * 1.2 : 0.6];
      add(kaps([sx * 2.8, ty + 1.6, 0], rp, 0.7), 'skora');
      add(sph(rp, 0.85), 'skoraCiemna');
    }
    const t = chod ? sw : 0;
    add(kaps([0, ty - 1.6, -2.6], [t * 1.5, ty - 0.6, -5.2], 0.45), 'skoraCiemna');
    add(kaps([t * 1.5, ty - 0.6, -5.2], [t * 2.2, ty + 1.6, -6.0], 0.4), 'skoraCiemna');
    add(elip([t * 2.3, ty + 2.2, -6.1], [0.9, 0.9, 0.4]), 'skoraCiemna');
    extra = { kolory: { skora: '#d9643c', skoraCiemna: '#9c3a2a', brzuch: '#f2a46c', rog: '#efe3c8' }, kolorOczu: '#ffe04a', oczyX: 0.34, oczyY: 0.02, oczySzer: 2,
      usta: { y: -0.42, w: 0.3, usmiech: -0.35 }, twarz: ['skora'] };
  } else if (g === 'szkielet') {
    const bob = chod ? Math.abs(cw) * 0.4 : 0;
    ty = 6.6 + bob; hy = 12.6 + bob; hr = 4.2;
    const nl = chod ? sw * 1.4 : 0;
    for (const [sx, dz] of [[-1, nl], [1, -nl]]) {
      add(kaps([sx * 1.4, ty - 2.4, 0], [sx * 1.5, 1.0 + Math.max(0, sx * sw) * 0.7, dz], 0.8), 'kosc');
      add(elip([sx * 1.5, 0.7, dz + 0.5], [0.9, 0.6, 1.3]), 'kosc');
      const rp = zam ? [sx * 2.6, ty + 5.5, -0.6] : cios ? [sx * 1.8, ty + 0.5, 4.4] : [sx * 3.2, ty - 2.2, chod ? -dz : 0.5];
      add(kaps([sx * 2.5, ty + 2, 0], rp, 0.72), 'kosc');
      add(sph(rp, 0.85), 'kosc');
    }
    add(kaps([0, ty - 2.6, -0.3], [0, ty + 2.6, -0.3], 0.55), 'kosc');
    add(elip([0, ty + 0.9, 0.2], [2.5, 2.2, 1.7]), 'kosc', { wzor: 'zebra', ty });
    add(elip([0, ty - 2.6, 0], [2.0, 0.9, 1.2]), 'kosc');
    const hc = [0, hy, 0.3 + (cios ? 0.6 : 0)];
    add(sph(hc, hr), 'kosc', { glowa: hc, hr });
    add(elip([0, hy - hr * 0.85, 1.2], [hr * 0.6, 1.0, hr * 0.55]), 'kosc');
    if (o.bron) { const d = zam ? [2.6, ty + 5.5, -0.6] : cios ? [1.8, ty + 0.5, 4.4] : [3.2, ty - 2.2, 0.5];
      add(kaps(d, [d[0] + 0.4, d[1] + 5.5, d[2] + (cios ? 2.5 : 0)], 0.38), 'rdza', { cienka: 1 }); add(kaps([d[0] - 1, d[1] + 0.6, d[2]], [d[0] + 1, d[1] + 0.6, d[2]], 0.3), 'rdza'); }
    extra = { kolory: { kosc: '#e6dfc8', koscCiemna: '#5e5648', rdza: '#8a5a3a' }, kolorOczu: '#1e1a24', oczyX: 0.34, oczyY: 0.0, oczySzer: 2, oczyWys: 2, twarz: ['kosc'],
      usta: { y: -0.5, w: 0.22 }, bezRumiencow: true };
  } else if (g === 'driada') {
    const bob = chod ? Math.abs(cw) * 0.4 : 0;
    ty = 6.6 + bob; hy = 12.6 + bob; hr = 4.3;
    add(elip([0, 2.6 + bob * 0.5, 0], [3.3, 2.9, 3.0]), 'kora', { wzor: 'korzenie' });
    add(elip([0, ty, 0], [2.4, 2.8, 2.0]), 'kora');
    for (const sx of [-1, 1]) {
      const rp = zam ? [sx * 3.0, ty + 5.5, 0.4] : cios ? [sx * 1.8, ty + 1.6, 4.8] : [sx * 3.8, ty - 1.6, chod ? -sw * sx * 1.2 : 0.8];
      add(kaps([sx * 2.1, ty + 1.8, 0], rp, 0.5), 'kora');
      add(kaps(rp, [rp[0] + sx * 0.8, rp[1] + 1.4, rp[2] + 0.6], 0.3), 'kora');
      add(elip([rp[0] + sx, rp[1] + 1.9, rp[2]], [0.8, 0.5, 0.4]), 'lisc');
    }
    const hc = [0, hy, 0.3];
    add(sph(hc, hr), 'skora', { glowa: hc, hr });
    for (const [x, y, z, r] of [[0, 2.8, -0.6, 3.6], [-3.0, 1.6, -0.8, 2.7], [3.0, 1.8, -0.6, 2.7], [-2.2, 3.6, 1.3, 2.2], [2.0, 3.8, 1.0, 2.3], [0, 0.8, -3.2, 3.2], [-3.4, -1.4, -1.8, 2.2], [3.4, -1.2, -1.8, 2.2]])
      add(sph([x, hy + y, z], r), 'lisc', { wzor: 'kwiatki' });
    extra = { kolory: { skora: '#b6cc7a', kora: '#7a5230', lisc: '#5f913c', kwiat: '#f08ab8' }, kolorOczu: '#2a3a1a', oczyX: 0.33, oczyY: -0.1, twarz: ['skora'] };
  } else if (g === 'upior') {
    // duszek z prześcieradła: biała kopułka, falisty dół w „językach”, czarne owalne oczy i „o” zamiast ust
    const fl = 2.0 + Math.sin(faza * Math.PI * 2) * 0.6 + (zam ? 0.8 : 0);
    hy = 12.5 + fl; hr = 5.2; ty = hy - 4;
    const hc = [0, hy, cios ? 1.2 : 0];
    const cialo = p => Math.min(sph(hc, hr)(p), rbox([0, hy - 5.8, hc[2] - 0.1], [hr * 1.05, 6.4, hr * 0.98], 3.2)(p), elip([0, fl + 1.2, hc[2] - 0.1], [hr * 1.18, 1.6, hr * 1.08])(p));
    const fala = p => { const a = Math.atan2(p[0], p[2] - hc[2]); return fl + 2.2 - 2.6 * Math.abs(Math.cos(a * 2.5)); };
    add(p => Math.max(cialo(p), (fala(p) - p[1]) * 0.8), 'szata', { glowa: hc, hr, wzor: 'szata', ty: fl + 2.2 });
    for (const sx of [-1, 1]) {
      const rp = zam ? [sx * 5.6, hy - 1.2, 0.2] : cios ? [sx * 3.4, hy - 3.6, 4.2] : [sx * 5.6, hy - 4.6 + (sx * Math.sin(faza * Math.PI * 2)) * 0.6, 0.4];
      add(elip(rp, [1.5, 1.1, 1.1]), 'szata');
    }
    extra = { kolory: { szata: '#f2f0f8', szataCiemna: '#c9c4dc', usta: '#1e1a24' }, kolorOczu: '#1e1a24', oczyX: 0.32, oczyY: 0.06, oczySzer: 2, oczyWys: 4,
      twarz: ['szata'], usta: { y: -0.4, w: 0.13 } };
  } else if (g === 'blob') {
    const sq = chod ? Math.abs(sw) : 0;
    const sy = 1 - sq * 0.18 + (zam ? -0.15 : cios ? 0.2 : 0), sx = 1 + sq * 0.15 + (zam ? 0.12 : 0);
    hy = 5.5 * sy; hr = 5;
    const hc = [0, 4.8 * sy, cios ? 1.2 : 0];
    add(elip(hc, [5.2 * sx, 4.8 * sy, 5.0 * sx]), 'woda', { glowa: hc, hr: 5, wzor: 'polysk' });
    add(sph([0, 9.4 * sy, -0.5], 1.6 * sx), 'woda');
    extra = { kolory: { woda: '#4ea4ea', blysk: '#e6f8ff' }, kolorOczu: '#1e2a40', oczyX: 0.3, oczyY: 0.18, twarz: ['woda'] };
  } else if (g === 'koziol') {
    const bob = chod ? Math.abs(cw) * 0.5 : 0;
    ty = 7 + bob; hy = 13.5 + bob - (zam ? 0.8 : 0); hr = 3.6;
    const nl = chod ? sw * 1.5 : 0;
    for (const [sx, dz] of [[-1, nl], [1, -nl]]) {
      add(kaps([sx * 1.8, ty - 2.6, 0], [sx * 2.0, 3.0, dz - 0.8], 1.2), 'mosiadz');
      add(kaps([sx * 2.0, 3.0, dz - 0.8], [sx * 2.0, 0.9 + Math.max(0, sx * sw) * 0.7, dz + 0.4], 0.95), 'zelazo');
      add(rbox([sx * 2.0, 0.6, dz + 0.6], [1.0, 0.6, 1.2], 0.3), 'kopyto');
      const rp = zam ? [sx * 3.6, ty + 5.5, -0.5] : cios ? [sx * 2.4, ty + 1, 5] : [sx * 4.4, ty - 1.4, chod ? -dz : 0.6];
      add(kaps([sx * 3.4, ty + 2.3, 0], rp, 1.15), 'mosiadz');
      add(sph(rp, 1.25), 'zelazo');
    }
    add(rbox([0, ty, 0], [3.4, 3.0, 2.4], 1.2), 'mosiadz', { wzor: 'nity', ty });
    add(cyl([0, ty + 0.3, -2.8], 1.0, 2.2), 'miedz');
    add(kaps([0, ty + 2.6, -3.0], [0, ty + 5.4, -3.2], 0.5), 'miedz');
    const hc = [0, hy, 1.4 + (cios ? 1.2 : 0)];
    add(elip(hc, [hr, hr * 1.05, hr * 1.25]), 'mosiadz', { glowa: hc, hr });
    add(elip([0, hy - 1.6, hc[2] + 3.4], [1.9, 1.7, 2.4]), 'mosiadz');
    add(elip([0, hy - 3.8, hc[2] + 3.2], [0.9, 1.6, 0.8]), 'zelazo');
    for (const sx of [-1, 1]) {
      let prev = [sx * 2.0, hy + 2.4, hc[2] - 0.6];
      for (let i = 1; i <= 6; i++) { const a = i * 0.75; const pt = [sx * (2.0 + Math.sin(a) * 2.6 + i * 0.35), hy + 2.4 + Math.cos(a) * 1.8 - i * 0.3, hc[2] - 0.6 - Math.sin(a * 0.5) * 3.4];
        add(kaps(prev, pt, 0.95 - i * 0.08), 'rog'); prev = pt; }
      add(elip([sx * 4.2, hy + 0.4, hc[2] - 0.6], [1.6, 0.6, 0.9]), 'mosiadz');
    }
    extra = { kolory: { mosiadz: '#c9993a', zelazo: '#5a5a66', kopyto: '#2e2a30', miedz: '#b8643a', rog: '#e8dcc0' }, kolorOczu: '#ff3a2a', oczyX: 0.46, oczyY: 0.05, oczySzer: 2, oczyWys: 1, twarz: ['mosiadz'] };
  }
  return Object.assign({ czesci, k: {}, A: true, hy, hr, ty, bezRumiencow: g !== 'driada' && g !== 'chochlik' }, extra);
}

export { renderuj, rampa, czubek, kula, E };
