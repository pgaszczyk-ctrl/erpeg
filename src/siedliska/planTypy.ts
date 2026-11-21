// Planery rumowiska skalnego (etap 3) i bagna (etap 4) – ta sama zasada co obóz (plan.ts): czysta funkcja ziarna
// i mapy, obrys nieregularny kurczony do wolnego miejsca, zmiana podłoża zamiast nakładki, stałe punkty spawnów.
// Wynik ma kształt Siedlisko (pola obozu puste), więc rejestr, kolizje, Worker i Widok obsługują wszystkie typy.
import { rng } from '../rng';
import { RUMOWISKO, BAGNO, TEREN_SIEDLISK, MIESZKANCY_SIEDLISK, WERSJA_SIEDLISK, type TypSiedliska, type RozmiarSiedliska } from '../content/siedliska';
import type { RodzajWroga } from '../content/fabula';
import type { Siedlisko, Spawn, TerenSiedliska } from './typy';
import { wWielokacie, odlegloscOdObrysu } from './kolizje';
import { hashSiedliska } from './plan';

const TAU = Math.PI * 2;

function losujWage<T>(lista: [T, number][], u: number): T {
  const suma = lista.reduce((s, [, w]) => s + w, 0);
  let t = u * suma;
  for (const [k, w] of lista) if ((t -= w) < 0) return k;
  return lista[0][0];
}

/** Nieregularny obrys: promień każdego kierunku skracany, aż cały promień (od środka) i brzeg z marginesem są dobre. */
function obrysWolny(x: number, y: number, R: number, N: number, r: () => number, ok: (px: number, py: number) => boolean, marg: number) {
  const f = [r() * TAU, r() * TAU];
  const rho: number[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    let p = R * (1 + (Math.sin(a * 2 + f[0]) * 0.5 + Math.sin(a * 3 + f[1]) * 0.3 + (r() - 0.5) * 0.5) * 0.22);
    for (let d = R * 0.08; d < p + marg; d += marg / 2)
      if (!ok(x + Math.cos(a) * d, y + Math.sin(a) * d)) { p = Math.min(p, d - marg); break; }
    if (p < R * 0.6) return null;
    rho.push(p);
  }
  const gl = rho.map((p, i) => Math.min(rho[i], (rho[(i + N - 1) % N] + p * 2 + rho[(i + 1) % N]) / 4));
  const obrys: number[] = [];
  for (let i = 0; i < N; i++) obrys.push(x + Math.cos((i / N) * TAU) * gl[i], y + Math.sin((i / N) * TAU) * gl[i]);
  return obrys;
}

function ramkaZ(obrys: number[], zapas: number) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < obrys.length; i += 2) { x0 = Math.min(x0, obrys[i]); y0 = Math.min(y0, obrys[i + 1]); x1 = Math.max(x1, obrys[i]); y1 = Math.max(y1, obrys[i + 1]); }
  return { x0: x0 - zapas, y0: y0 - zapas * 2, x1: x1 + zapas, y1: y1 + zapas };
}

/** Wspólny szkielet wyniku (pola obozu puste). */
function pusty(id: string, typ: TypSiedliska, seed: number, rozmiar: RozmiarSiedliska, x: number, y: number, obrys: number[], M: number): Siedlisko {
  return {
    id, typ, wersja: WERSJA_SIEDLISK, seed, rozmiar, x, y, obrys, ramka: ramkaZ(obrys, 10 * M),
    bramy: [], pale: [], sciany: [], namioty: [], ognisko: { x, y }, ogniska: [], wieze: [], rekwizyty: [], sciezki: [],
    spawny: [], jaskinia: null, stwory: { czlonkowie: [], berserk: [], moc: 1, szef: 'herszt', obstawa: 'bandyta', ileObstawy: 0 }, trudnosc: 3,
  };
}

function mieszkancy(typ: TypSiedliska, ile: number, r: () => number, moc: number) {
  const MZ = MIESZKANCY_SIEDLISK[typ];
  const czlonkowie: RodzajWroga[] = [];
  for (let i = 0; i < ile; i++) czlonkowie.push(losujWage(MZ.czlonkowie, r()));
  return { czlonkowie, berserk: czlonkowie.map(() => false), moc, szef: MZ.szef, obstawa: MZ.obstawa, ileObstawy: MZ.ileObstawy };
}

const zakazane = (t: TerenSiedliska, x: number, y: number) => t.rodzaje(x, y).some((k) => TEREN_SIEDLISK.zakazane.includes(k) && k !== 'rock');

// ============================================================================ rumowisko

export function planujRumowisko(id: string, x: number, y: number, t: TerenSiedliska, M: number): Siedlisko | null {
  const seed = hashSiedliska(`${id}:rumowisko:v${WERSJA_SIEDLISK}`);
  const r = rng(seed);
  const Q = RUMOWISKO, T = TEREN_SIEDLISK;
  const R = (Q.promienM[0] + r() * (Q.promienM[1] - Q.promienM[0])) * M;
  const ok = (px: number, py: number) => !t.zablokowane(px, py) && !zakazane(t, px, py) && !t.budynek(px, py, T.odBudynkuM * M) && !t.linia(px, py, T.odLiniiM * M);
  if (!ok(x, y) || t.glowna(x, y, T.odGlownejM * M)) return null;
  const obrys = obrysWolny(x, y, R, Q.wierzcholki, r, ok, T.odLiniiM * M);
  if (!obrys) return null;
  const s = pusty(id, 'rumowisko', seed, R > 55 * M ? 'duzy' : 'sredni', x, y, obrys, M);
  s.podstawa = 'brak';
  s.drzewa = Q.drzewa;
  const skaly: number[] = [];
  const ile = ([a, b]: [number, number]) => a + Math.floor(r() * (b - a + 1));
  const wSrodku = (px: number, py: number, marg: number) => wWielokacie(obrys, px, py) && odlegloscOdObrysu(obrys, px, py) > marg;
  const glazy: NonNullable<Siedlisko['glazy']> = [];
  const wolny = (px: number, py: number, pr: number, odstep: number) => !glazy.some((g) => Math.hypot(g.x - px, g.y - py) < g.r + pr + odstep);
  // Plac w środku (arena walki z szefem) i kilka mniejszych polan zostaje wolnych.
  const polany: [number, number, number][] = [[x, y, 9 * M]];
  for (let k = 0; k < 3; k++) {
    const a = r() * TAU, d = R * (0.35 + r() * 0.3);
    polany.push([x + Math.cos(a) * d, y + Math.sin(a) * d, (5 + r() * 3) * M]);
  }
  const naPolanie = (px: number, py: number, pr: number) => polany.some(([qx, qy, qr]) => Math.hypot(qx - px, qy - py) < qr + pr);
  // Skupiska: jedna wielka skała otoczona mniejszymi (bryły o zróżnicowanej wysokości).
  for (let k = 0, n = ile(Q.skupiska); k < n; k++) {
    const a = r() * TAU, d = R * (0.2 + r() * 0.65);
    const cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d;
    if (!wSrodku(cx, cy, 6 * M)) continue;
    const pr = (7 + r() * 7) * M;
    skaly.push(cx, cy, Math.min(pr, odlegloscOdObrysu(obrys, cx, cy) - 1 * M), Math.min(pr, odlegloscOdObrysu(obrys, cx, cy) - 1 * M) * (0.6 + r() * 0.3));
    for (let j = 0, m = ile(Q.wSkupisku); j < m; j++) {
      const duzy = j === 0;
      const gr = (duzy ? Q.glaz[1] * (0.7 + r() * 0.3) : Q.glaz[0] + r() * (Q.glaz[1] - Q.glaz[0]) * 0.55) * M;
      const ga = r() * TAU, gd = duzy ? 0 : (3 + r() * 10) * M;
      const gx = cx + Math.cos(ga) * gd, gy = cy + Math.sin(ga) * gd;
      if (!wSrodku(gx, gy, gr + 2 * M) || naPolanie(gx, gy, gr) || !wolny(gx, gy, gr, 0.6 * M)) continue;
      glazy.push({ x: gx, y: gy, r: gr, seed: (seed + glazy.length * 7919) >>> 0 });
    }
  }
  // Murki: łuki głazów przez rumowisko z 1–2 przerwami (przesmyki).
  for (let k = 0, n = ile(Q.murki); k < n; k++) {
    const a0 = r() * TAU, d0 = R * (0.3 + r() * 0.4), len = (0.6 + r() * 0.8);
    const przerwy = [r(), r()].map((u) => u * len);
    for (let u = 0; u < len; u += 0.06) {
      if (przerwy.some((p) => Math.abs(p - u) < 0.08)) continue;
      const gx = x + Math.cos(a0 + u) * d0, gy = y + Math.sin(a0 + u) * d0, gr = (1 + r() * 0.8) * M;
      if (!wSrodku(gx, gy, gr + 2 * M) || naPolanie(gx, gy, gr) || !wolny(gx, gy, gr, 0.2 * M)) continue;
      glazy.push({ x: gx, y: gy, r: gr, seed: (seed + glazy.length * 7919) >>> 0 });
    }
  }
  // Ścieżki: wydeptane od brzegu do środkowego placu (z 2–3 stron).
  for (let k = 0, n = 2 + Math.floor(r() * 2); k < n; k++) {
    const a = (k / n) * TAU + r(), pts: number[] = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10, d = R * (1 - u) + 6 * M * u, w = Math.sin(u * 7 + a) * 2 * M;
      pts.push(x + Math.cos(a) * d - Math.sin(a) * w, y + Math.sin(a) * d + Math.cos(a) * w);
    }
    s.sciezki.push({ pts, w: 2.2 * M });
  }
  // Ścieżki są przejściem: głazy na nich znikają.
  const odSciezki = (px: number, py: number) => Math.min(...s.sciezki.map((sc) => { let d = Infinity; for (let i = 0; i + 3 < sc.pts.length; i += 2) { const ax = sc.pts[i], ay = sc.pts[i + 1], bx = sc.pts[i + 2], by = sc.pts[i + 3], L = (bx - ax) ** 2 + (by - ay) ** 2 || 1, u = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / L)); d = Math.min(d, Math.hypot(px - ax - (bx - ax) * u, py - ay - (by - ay) * u)); } return d; }));
  for (let i = glazy.length - 1; i >= 0; i--) if (odSciezki(glazy[i].x, glazy[i].y) < glazy[i].r + 2.5 * M) glazy.splice(i, 1);
  s.glazy = glazy;
  // Pod każdym głazem skała (drzewa i trawa nie wchodzą w kamień); między skupiskami zostaje teren.
  for (const g of glazy) skaly.push(g.x, g.y, g.r + 2 * M, g.r * 0.7 + 2 * M);
  s.skaly = skaly;
  // Spawny: na polanach i między skupiskami.
  const spawny: Spawn[] = [{ x, y: y + 2 * M, rola: 'szef' }, { x: x - 4 * M, y: y + 4 * M, rola: 'obstawa' }, { x: x + 4 * M, y: y + 4 * M, rola: 'obstawa' }];
  for (const [px, py] of polany.slice(1)) spawny.push({ x: px, y: py, rola: 'czlonek' }, { x: px + 3 * M, y: py + 2 * M, rola: 'czlonek' });
  for (let k = 0; k < 40 && spawny.length < 18; k++) {
    const a = r() * TAU, d = R * (0.25 + r() * 0.6), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
    if (wSrodku(px, py, 3 * M) && wolny(px, py, 1.5 * M, 1 * M) && !t.zablokowane(px, py)) spawny.push({ x: px, y: py, rola: 'czlonek' });
  }
  s.spawny = spawny.filter((q) => wolny(q.x, q.y, 1.2 * M, 0.5 * M) && !t.zablokowane(q.x, q.y));
  if (!s.spawny.some((q) => q.rola === 'szef')) return null;
  // Jaskinia w skale: przy największym głazie (skalna szczelina).
  if (r() < Q.jaskinia) {
    const g = [...glazy].sort((a, b) => b.r - a.r)[0];
    if (g) {
      const jx = g.x, jy = g.y + g.r + 3 * M;
      if (wSrodku(jx, jy, 3 * M) && wolny(jx, jy, 2 * M, 0.5 * M) && !t.zablokowane(jx, jy)) s.jaskinia = { x: jx, y: jy };
    }
  }
  s.stwory = mieszkancy('rumowisko', ile(Q.czlonkowie), r, 1.2);
  s.trudnosc = MIESZKANCY_SIEDLISK.rumowisko.trudnosc;
  s.ramka = ramkaZ([...obrys, ...s.sciezki.flatMap((q) => q.pts)], 10 * M);
  return s;
}

// ============================================================================ bagno

export function planujBagno(id: string, x: number, y: number, t: TerenSiedliska, M: number): Siedlisko | null {
  const seed = hashSiedliska(`${id}:bagno:v${WERSJA_SIEDLISK}`);
  const r = rng(seed);
  const Q = BAGNO, T = TEREN_SIEDLISK;
  const R = (Q.promienM[0] + r() * (Q.promienM[1] - Q.promienM[0])) * M;
  // Bagno może zająć naturalne mokradło (wetland), ale nie prawdziwe jezioro, rzekę ani drogę.
  const zakazaneB = (px: number, py: number) => t.rodzaje(px, py).some((k) => k !== 'wetland' && TEREN_SIEDLISK.zakazane.includes(k));
  // Ścieżki mogą biec przez bagno (to groble) – omijamy tylko twarde linie (drogi dla aut, tory, rzeki).
  const ok = (px: number, py: number) => !t.zablokowane(px, py) && !zakazaneB(px, py) && !t.budynek(px, py, T.odBudynkuM * M) && !t.liniaTwarda(px, py, T.odLiniiM * M);
  if (!ok(x, y) || t.glowna(x, y, T.odGlownejM * M)) return null;
  const obrys = obrysWolny(x, y, R, Q.wierzcholki, r, ok, T.odLiniiM * M);
  if (!obrys) return null;
  const s = pusty(id, 'bagno', seed, R > 60 * M ? 'duzy' : 'sredni', x, y, obrys, M);
  s.podstawa = 'mokradlo';
  const ile = ([a, b]: [number, number]) => a + Math.floor(r() * (b - a + 1));
  const wSrodku = (px: number, py: number, marg: number) => wWielokacie(obrys, px, py) && odlegloscOdObrysu(obrys, px, py) > marg;
  const elipsy = (n: number, rMin: number, rMax: number, marg: number) => {
    const out: number[] = [];
    for (let k = 0, proby = 0; k < n && proby < n * 10; proby++) {
      const a = r() * TAU, d = R * (0.1 + r() * 0.75), ex = x + Math.cos(a) * d, ey = y + Math.sin(a) * d;
      const rx = (rMin + r() * (rMax - rMin)) * M, ry = rx * (0.55 + r() * 0.35);
      if (!wSrodku(ex, ey, rx + marg) || t.linia(ex, ey, rx * 1.25 + 1.5 * M)) continue; // woda i błoto nie na ścieżce
      out.push(ex, ey, rx, ry);
      k++;
    }
    return out;
  };
  s.bloto = elipsy(ile(Q.bloto), 4, 11, 1 * M);
  s.plycizny = elipsy(ile(Q.plycizny), 4, 10, 2 * M);
  s.oczka = elipsy(ile(Q.oczka), 4, 10, 5 * M);
  // Suche wyspy: tu stoją potwory i martwe drzewa (żadna nie wchodzi w głębokie oczko).
  const wOczku = (px: number, py: number, m = 0) => { const o = s.oczka!; for (let i = 0; i < o.length; i += 4) if (((px - o[i]) / (o[i + 2] + m)) ** 2 + ((py - o[i + 1]) / (o[i + 3] + m)) ** 2 < 1) return true; return false; };
  const wyspy: number[] = [x, y, 7 * M, 6 * M];
  for (let k = 0, n = ile(Q.wyspy), proby = 0; k < n && proby < 60; proby++) {
    const a = r() * TAU, d = R * (0.25 + r() * 0.55), ex = x + Math.cos(a) * d, ey = y + Math.sin(a) * d, rx = (3 + r() * 4) * M;
    if (!wSrodku(ex, ey, rx + 2 * M) || wOczku(ex, ey, rx)) continue;
    wyspy.push(ex, ey, rx, rx * 0.75);
    k++;
  }
  s.wyspy = wyspy;
  // Środek zawsze suchy: oczka nie mogą zalać wysp.
  const o = s.oczka;
  const zostaw: number[] = [];
  for (let i = 0; i < o.length; i += 4) {
    let kolizja = false;
    for (let j = 0; j < wyspy.length; j += 4) if (Math.hypot(o[i] - wyspy[j], o[i + 1] - wyspy[j + 1]) < o[i + 2] + wyspy[j + 2] + 2 * M) kolizja = true;
    if (!kolizja) zostaw.push(o[i], o[i + 1], o[i + 2], o[i + 3]);
  }
  s.oczka = zostaw;
  const martwe: NonNullable<Siedlisko['martwe']> = [];
  for (let k = 0, n = ile(Q.martweDrzewa), proby = 0; k < n && proby < n * 8; proby++) {
    const a = r() * TAU, d = R * (0.1 + r() * 0.8), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
    if (!wSrodku(px, py, 3 * M) || wOczku(px, py, 1.5 * M) || t.linia(px, py, 2.5 * M) || martwe.some((q) => Math.hypot(q.x - px, q.y - py) < 6 * M) || Math.hypot(px - x, py - y) < 8 * M) continue;
    martwe.push({ x: px, y: py, seed: (seed + k * 104729) >>> 0 });
    k++;
  }
  s.martwe = martwe;
  // Grobla przez bagno (sucha droga) z dwóch stron do środkowej wyspy.
  for (let k = 0; k < 2; k++) {
    const a = r() * TAU + k * Math.PI, pts: number[] = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12, d = R * (1.05 - u) + 5 * M * u, w = Math.sin(u * 5 + a) * 3 * M;
      pts.push(x + Math.cos(a) * d - Math.sin(a) * w, y + Math.sin(a) * d + Math.cos(a) * w);
    }
    s.sciezki.push({ pts, w: 2.4 * M });
  }
  // Grobla przecina oczko? Takie oczko znika (zawsze da się dojść do środka).
  const naGrobli = (px: number, py: number, m: number) => s.sciezki.some((sc) => { for (let i = 0; i + 3 < sc.pts.length; i += 2) { const ax = sc.pts[i], ay = sc.pts[i + 1], bx = sc.pts[i + 2], by = sc.pts[i + 3], L = (bx - ax) ** 2 + (by - ay) ** 2 || 1, u = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / L)); if (Math.hypot(px - ax - (bx - ax) * u, py - ay - (by - ay) * u) < m) return true; } return false; });
  const o2: number[] = [];
  for (let i = 0; i < s.oczka.length; i += 4) if (!naGrobli(s.oczka[i], s.oczka[i + 1], s.oczka[i + 2] + 3 * M)) o2.push(...s.oczka.slice(i, i + 4));
  s.oczka = o2;
  s.martwe = martwe.filter((q) => !naGrobli(q.x, q.y, 2.5 * M));
  // Spawny na wyspach (szef: wodnik na środkowej).
  const spawny: Spawn[] = [{ x, y, rola: 'szef' }, { x: x - 4 * M, y: y + 3 * M, rola: 'obstawa' }, { x: x + 4 * M, y: y + 3 * M, rola: 'obstawa' }];
  for (let j = 4; j < wyspy.length; j += 4) spawny.push({ x: wyspy[j], y: wyspy[j + 1], rola: 'czlonek' }, { x: wyspy[j] + wyspy[j + 2] * 0.5, y: wyspy[j + 1], rola: 'czlonek' });
  s.spawny = spawny.filter((q) => !wOczku(q.x, q.y, 1.5 * M) && !t.zablokowane(q.x, q.y) && !martwe.some((m) => Math.hypot(m.x - q.x, m.y - q.y) < 2 * M));
  if (!s.spawny.some((q) => q.rola === 'szef')) return null;
  s.stwory = mieszkancy('bagno', ile(Q.czlonkowie), r, 1.2);
  s.trudnosc = MIESZKANCY_SIEDLISK.bagno.trudnosc;
  s.ramka = ramkaZ([...obrys, ...s.sciezki.flatMap((q) => q.pts)], 10 * M);
  return s;
}
