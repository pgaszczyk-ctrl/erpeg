// Planer obozu z palisadą (etap 2 siedlisk) – czysta funkcja: to samo ziarno + ta sama mapa = ten sam obóz,
// niezależnie od postaci, logowania i kolejności wczytywania kafli (wołana dopiero, gdy cała okolica jest wczytana).
// Bez Phasera i DOM-u (testy: scripts/tests/siedliska.mjs).
import { rng } from '../rng';
import { OBOZ, TEREN_SIEDLISK, MIESZKANCY_SIEDLISK, WERSJA_SIEDLISK, type RozmiarSiedliska } from '../content/siedliska';
import type { RodzajWroga } from '../content/fabula';
import type { Brama, Namiot, Pal, Rekwizyt, Siedlisko, Spawn, TerenSiedliska } from './typy';
import { wWielokacie, odlegloscOdObrysu } from './kolizje';

export function hashSiedliska(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const TAU = Math.PI * 2;

function losujWage<T>(lista: [T, number][], u: number): T {
  const suma = lista.reduce((s, [, w]) => s + w, 0);
  let t = u * suma;
  for (const [k, w] of lista) if ((t -= w) < 0) return k;
  return lista[0][0];
}

/** Czy punkt nadaje się na wnętrze/okolicę obozu (żadnych zakazanych obszarów, budynków, linii). */
function dobryPunkt(t: TerenSiedliska, x: number, y: number, M: number, margBud: number, margLin: number) {
  if (t.zablokowane(x, y)) return false;
  const r = t.rodzaje(x, y);
  if (r.some((k) => TEREN_SIEDLISK.zakazane.includes(k))) return false;
  if (t.budynek(x, y, margBud * M)) return false;
  if (t.linia(x, y, margLin * M)) return false;
  return true;
}

/**
 * Obóz o środku (x, y) albo null, gdy miejsce się nie nadaje. `M` = px mapy na metr. `id` = stały identyfikator
 * (mapa + komórka + wersja generatora) – z niego ziarno.
 */
export function planujOboz(id: string, x: number, y: number, t: TerenSiedliska, M: number): Siedlisko | null {
  const seed = hashSiedliska(`${id}:v${WERSJA_SIEDLISK}`);
  const r = rng(seed);
  const T = TEREN_SIEDLISK;
  // Środek: otwarty teren (las, łąka, zarośla, pole) – nie park, nie cmentarz, nie woda.
  const rodz = t.rodzaje(x, y);
  if (!(rodz.length ? rodz : ['']).every((k) => T.dozwolone.includes(k))) return null;
  if (!dobryPunkt(t, x, y, M, T.odBudynkuM, T.odLiniiM)) return null;
  if (t.glowna(x, y, T.odGlownejM * M)) return null;

  const wylosowany = losujWage(OBOZ.wagiRozmiaru, r());
  const kolejnosc: RozmiarSiedliska[] = (['duzy', 'sredni', 'maly'] as RozmiarSiedliska[]).filter((k, _, a) => a.indexOf(k) >= a.indexOf(wylosowany));
  const N = OBOZ.wierzcholki;
  const fazy = [r() * TAU, r() * TAU, r() * TAU];
  for (const rozmiar of kolejnosc) {
    const P = OBOZ.rozmiary[rozmiar];
    const R = P.promienM * M;
    // Promień każdego kierunku: nieregularny (dwie fale + szum), skurczony tam, gdzie brakuje miejsca.
    const rho: number[] = [];
    let ok = true;
    for (let i = 0; i < N && ok; i++) {
      const a = (i / N) * TAU;
      const fala = Math.sin(a * 2 + fazy[0]) * 0.55 + Math.sin(a * 3 + fazy[1]) * 0.3 + (r() - 0.5) * 0.5;
      let p = R * (1 + fala * OBOZ.rozrzut);
      while (p >= R * OBOZ.minUdzial) {
        const zew = p + T.odLiniiM * 0.4 * M;
        const px = x + Math.cos(a) * zew, py = y + Math.sin(a) * zew;
        if (dobryPunkt(t, px, py, M, T.odBudynkuM, T.odLiniiM)) break;
        p -= R * 0.06;
      }
      if (p < R * OBOZ.minUdzial) ok = false;
      rho.push(p);
    }
    if (!ok) continue;
    // Wygładzenie (bez ostrych zębów), potem wnętrze: pierścienie próbek.
    const gl = rho.map((p, i) => (rho[(i + N - 1) % N] + p * 2 + rho[(i + 1) % N]) / 4).map((p, i) => Math.min(p, rho[i]));
    for (const f of [0.35, 0.7]) for (let i = 0; i < N && ok; i += 2) {
      const a = (i / N) * TAU;
      if (!dobryPunkt(t, x + Math.cos(a) * gl[i] * f, y + Math.sin(a) * gl[i] * f, M, 0, T.odLiniiM * 0.5)) ok = false;
    }
    if (!ok) continue;
    const obrys: number[] = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU;
      obrys.push(x + Math.cos(a) * gl[i], y + Math.sin(a) * gl[i]);
    }
    const s = zbudujOboz(id, seed, rozmiar, x, y, obrys, gl, t, M, r, fazy[2]);
    if (s) return s;
  }
  return null;
}

/** Punkt na obrysie w kierunku `a` od środka (promień interpolowany między wierzchołkami). */
function naObrysie(x: number, y: number, gl: number[], a: number) {
  const N = gl.length;
  const f = ((((a / TAU) % 1) + 1) % 1) * N, i = Math.floor(f) % N, u = f - Math.floor(f);
  const p = gl[i] * (1 - u) + gl[(i + 1) % N] * u;
  return { x: x + Math.cos(a) * p, y: y + Math.sin(a) * p, p };
}

function katRoznica(a: number, b: number) {
  const d = Math.abs((((a - b) % TAU) + TAU) % TAU);
  return Math.min(d, TAU - d);
}

function zbudujOboz(id: string, seed: number, rozmiar: RozmiarSiedliska, x: number, y: number, obrys: number[], gl: number[], t: TerenSiedliska, M: number, r: () => number, faza: number): Siedlisko | null {
  const P = OBOZ.rozmiary[rozmiar];
  const ile = ([lo, hi]: [number, number]) => lo + Math.floor(r() * (hi - lo + 1));
  const Rsr = gl.reduce((s, p) => s + p, 0) / gl.length;

  // Bramy: pierwsza w stronę najbliższej drogi/ścieżki (jeśli jest), druga mniej więcej naprzeciw.
  const droga = t.droga(x, y, (OBOZ.sciezkaDoDrogiM + Rsr / M) * M);
  const katBram: number[] = [droga ? Math.atan2(droga.y - y, droga.x - x) : faza];
  if (ile(P.bramy) > 1) katBram.push(katBram[0] + Math.PI + (r() - 0.5) * 1.2);
  const szer = OBOZ.bramaM * M;
  const bramy: Brama[] = [];
  for (const a of katBram) {
    const p = naObrysie(x, y, gl, a);
    const g: Brama = { x: p.x, y: p.y, nx: Math.cos(a), ny: Math.sin(a), szer };
    // Przejście z obu stron wolne (ani budynku, ani wody tuż za bramą).
    const zew = { x: g.x + g.nx * 6 * M, y: g.y + g.ny * 6 * M }, wew = { x: g.x - g.nx * 5 * M, y: g.y - g.ny * 5 * M };
    if (t.zablokowane(zew.x, zew.y) || t.zablokowane(wew.x, wew.y)) continue;
    bramy.push(g);
  }
  if (!bramy.length) return null;

  // Pale co OBOZ.palCoM wzdłuż obrysu, bez przejść w bramach; kolizja = odcinki między kolejnymi palami.
  const pale: Pal[] = [];
  const sciany: number[] = [];
  const krok = OBOZ.palCoM * M;
  const n = obrys.length / 2;
  let odc = 0, wOdcinku = 0, prev: Pal | null = null;
  const wBramie = (px: number, py: number) => bramy.some((b) => Math.hypot(px - b.x, py - b.y) < b.szer / 2);
  for (let i = 0; i < n; i++) {
    const ax = obrys[i * 2], ay = obrys[i * 2 + 1], bx = obrys[((i + 1) % n) * 2], by = obrys[((i + 1) % n) * 2 + 1];
    const L = Math.hypot(bx - ax, by - ay), k = Math.max(1, Math.round(L / krok));
    for (let j = 0; j < k; j++) {
      const u = j / k, px = ax + (bx - ax) * u, py = ay + (by - ay) * u;
      if (wBramie(px, py)) {
        if (prev) { odc++; wOdcinku = 0; }
        prev = null;
        continue;
      }
      if (wOdcinku >= 4) { odc++; wOdcinku = 0; }
      const pal: Pal = { x: px, y: py, odc, seed: (seed + pale.length * 7919) >>> 0 };
      if (prev) sciany.push(prev.x, prev.y, px, py);
      pale.push(pal);
      wOdcinku++;
      prev = pal;
    }
  }
  // Zamknięcie: ostatni pal z pierwszym (gdy żadna brama nie przecina zamknięcia).
  if (prev && pale.length && !wBramie((prev.x + pale[0].x) / 2, (prev.y + pale[0].y) / 2) && Math.hypot(prev.x - pale[0].x, prev.y - pale[0].y) < krok * 1.6)
    sciany.push(prev.x, prev.y, pale[0].x, pale[0].y);
  // Słupy bram: po obu stronach przejścia.
  for (const b of bramy) for (const s of [-1, 1]) {
    const tx = -b.ny, ty = b.nx;
    pale.push({ x: b.x + tx * s * (b.szer / 2 + 0.3 * M), y: b.y + ty * s * (b.szer / 2 + 0.3 * M), odc: ++odc, seed: (seed + odc * 104729) >>> 0, brama: true });
  }

  const wSrodku = (px: number, py: number, marg: number) => wWielokacie(obrys, px, py) && odlegloscOdObrysu(obrys, px, py) > marg;
  const ognisko = { x: x + (r() - 0.5) * 3 * M, y: y + (r() - 0.5) * 3 * M };

  // Namioty na pierścieniu wokół ogniska, nie na drodze od bram, z odstępem od palisady i od siebie.
  const namioty: Namiot[] = [];
  const zajete: { x0: number; y0: number; x1: number; y1: number }[] = [];
  const kolizja = (x0: number, y0: number, x1: number, y1: number) => zajete.some((q) => x0 < q.x1 && x1 > q.x0 && y0 < q.y1 && y1 > q.y0);
  const ileN = ile(P.namioty);
  const katGl = Math.atan2(bramy[0].y - y, bramy[0].x - x);
  for (let i = 0, proby = 0; i < ileN && proby < 80; proby++) {
    const szef = i === 0;
    const a = szef ? katGl + Math.PI + (r() - 0.5) * 0.4 : r() * TAU;
    if (!szef && bramy.some((b) => katRoznica(a, Math.atan2(b.y - y, b.x - x)) < 0.45)) continue;
    const pr = naObrysie(x, y, gl, a).p * (0.5 + r() * 0.18);
    // Kalenica północ–południe, wejście od południa: wolny przedsionek pod spodem.
    const w = (szef ? 7.4 : 5.4 + r() * 0.8) * M, d = (szef ? 6.4 : 4.6 + r() * 0.8) * M;
    const cx = x + Math.cos(a) * pr, cy = y + Math.sin(a) * pr;
    const x0 = cx - w / 2 - 2.5 * M, y0 = cy - d / 2 - 1.5 * M, x1 = cx + w / 2 + 2.5 * M, y1 = cy + d / 2 + 3 * M;
    if (![[x0, y0], [x1, y0], [x0, y1], [x1, y1]].every(([px, py]) => wSrodku(px, py, 2.5 * M))) continue;
    if (Math.hypot(cx - ognisko.x, cy - ognisko.y) < 6 * M + w / 2) continue;
    if (kolizja(x0, y0, x1, y1)) continue;
    zajete.push({ x0, y0, x1, y1 });
    namioty.push({ x: cx, y: cy, w, d, szef, wariant: Math.floor(r() * 3) });
    i++;
  }
  if (namioty.length < Math.min(2, ileN)) return null;
  zajete.push({ x0: ognisko.x - 3 * M, y0: ognisko.y - 3 * M, x1: ognisko.x + 3 * M, y1: ognisko.y + 3 * M });

  // Wieża strażnicza: przy palisadzie, z boku od głównej bramy.
  let wieza: { x: number; y: number } | null = null;
  if (r() < P.wieza) for (const s of [1, -1]) {
    const a = katGl + s * (Math.PI / 2 + (r() - 0.5) * 0.5);
    const p = naObrysie(x, y, gl, a);
    const wx = x + Math.cos(a) * (p.p - 5 * M), wy = y + Math.sin(a) * (p.p - 5 * M);
    if (!wSrodku(wx, wy, 3 * M) || kolizja(wx - 3 * M, wy - 3 * M, wx + 3 * M, wy + 3 * M)) continue;
    wieza = { x: wx, y: wy };
    zajete.push({ x0: wx - 3.5 * M, y0: wy - 3.5 * M, x1: wx + 3.5 * M, y1: wy + 3.5 * M });
    break;
  }

  // Rekwizyty pod palisadą (skrzynie, beczki, stosy drewna).
  const rekwizyty: Rekwizyt[] = [];
  const RODZ: Rekwizyt['rodzaj'][] = ['skrzynia', 'beczka', 'drewno'];
  for (let i = 0, ileR = ile(P.rekwizyty), proby = 0; i < ileR && proby < 60; proby++) {
    const a = r() * TAU;
    if (bramy.some((b) => katRoznica(a, Math.atan2(b.y - y, b.x - x)) < 0.5)) continue;
    const p = naObrysie(x, y, gl, a);
    const rx = x + Math.cos(a) * (p.p - 3.2 * M), ry = y + Math.sin(a) * (p.p - 3.2 * M);
    if (!wSrodku(rx, ry, 2 * M) || kolizja(rx - 2 * M, ry - 2 * M, rx + 2 * M, ry + 2 * M)) continue;
    zajete.push({ x0: rx - 2 * M, y0: ry - 2 * M, x1: rx + 2 * M, y1: ry + 2 * M });
    rekwizyty.push({ x: rx, y: ry, rodzaj: RODZ[Math.floor(r() * 3)], seed: (seed + i * 31337) >>> 0 });
    i++;
  }

  // Ścieżki: od każdej bramy do ogniska (lekki łuk) i od głównej bramy do najbliższej drogi.
  const sciezki: Siedlisko['sciezki'] = [];
  for (const b of bramy) {
    const sx = b.x + b.nx * 2 * M, sy = b.y + b.ny * 2 * M;
    const mx = (sx + ognisko.x) / 2 + (r() - 0.5) * 4 * M, my = (sy + ognisko.y) / 2 + (r() - 0.5) * 4 * M;
    const pts: number[] = [];
    for (let k = 0; k <= 8; k++) {
      const u = k / 8, a = (1 - u) * (1 - u), bq = 2 * u * (1 - u), c = u * u;
      pts.push(a * sx + bq * mx + c * ognisko.x, a * sy + bq * my + c * ognisko.y);
    }
    sciezki.push({ pts, w: 2.6 * M });
  }
  if (droga) {
    const b = bramy[0];
    const sx = b.x + b.nx * 1 * M, sy = b.y + b.ny * 1 * M;
    const L = Math.hypot(droga.x - sx, droga.y - sy), k = Math.max(2, Math.ceil(L / (4 * M)));
    const pts: number[] = [];
    let ok = true;
    for (let i = 0; i <= k; i++) {
      const u = i / k, w = Math.sin(u * Math.PI) * 2.5 * M * (r() - 0.5);
      const px = sx + (droga.x - sx) * u + -b.ny * w, py = sy + (droga.y - sy) * u + b.nx * w;
      if (i > 0 && i < k && t.zablokowane(px, py)) { ok = false; break; }
      pts.push(px, py);
    }
    if (ok) sciezki.push({ pts, w: 2.2 * M });
  }

  // Punkty spawnów: przed wejściem każdego namiotu, przy ognisku, przy bramach i na wieży; szef przed swoim namiotem.
  const spawny: Spawn[] = [];
  for (const nm of namioty) spawny.push({ x: nm.x, y: nm.y + nm.d / 2 + 4.5 * M, rola: nm.szef ? 'szef' : 'czlonek' });
  for (let k = 0; k < 3; k++) {
    const a = r() * TAU;
    spawny.push({ x: ognisko.x + Math.cos(a) * 4.5 * M, y: ognisko.y + Math.sin(a) * 4.5 * M, rola: 'czlonek' });
  }
  for (const b of bramy) spawny.push({ x: b.x - b.nx * 4 * M, y: b.y - b.ny * 4 * M, rola: 'czlonek' });
  if (wieza) spawny.push({ x: wieza.x, y: wieza.y + 4 * M, rola: 'czlonek' });
  const szefN = namioty[0];
  for (const s of [-1, 1]) spawny.push({ x: szefN.x + s * 3.5 * M, y: szefN.y + szefN.d / 2 + 5 * M, rola: 'obstawa' });
  const spawnyOk = spawny.filter((q) => wSrodku(q.x, q.y, 1.5 * M) && !kolizjaPunktu(zajete, q.x, q.y));
  // Szef zawsze ma swoje miejsce: gdy przed jego namiotem ciasno – najbliższe wolne miejsce obok.
  if (!spawnyOk.some((q) => q.rola === 'szef') && spawnyOk.length) {
    let best = spawnyOk[0];
    for (const q of spawnyOk) if (Math.hypot(q.x - szefN.x, q.y - szefN.y) < Math.hypot(best.x - szefN.x, best.y - szefN.y)) best = q;
    best.rola = 'szef';
  }
  if (!spawnyOk.some((q) => q.rola === 'szef')) return null;

  const MZ = MIESZKANCY_SIEDLISK.oboz;
  const czlonkowie: RodzajWroga[] = [];
  for (let i = ile(P.czlonkowie); i > 0; i--) czlonkowie.push(losujWage(MZ.czlonkowie, r()));

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < obrys.length; i += 2) { x0 = Math.min(x0, obrys[i]); y0 = Math.min(y0, obrys[i + 1]); x1 = Math.max(x1, obrys[i]); y1 = Math.max(y1, obrys[i + 1]); }
  for (const s of sciezki) for (let i = 0; i < s.pts.length; i += 2) { x0 = Math.min(x0, s.pts[i]); y0 = Math.min(y0, s.pts[i + 1]); x1 = Math.max(x1, s.pts[i]); y1 = Math.max(y1, s.pts[i + 1]); }
  const zapas = 8 * M;
  return {
    id, typ: 'oboz', wersja: WERSJA_SIEDLISK, seed, rozmiar, x, y, obrys,
    ramka: { x0: x0 - zapas, y0: y0 - zapas * 2, x1: x1 + zapas, y1: y1 + zapas },
    bramy, pale, sciany, namioty, ognisko, wieza, rekwizyty, sciezki, spawny: spawnyOk,
    stwory: { czlonkowie, szef: MZ.szef, obstawa: MZ.obstawa }, trudnosc: MZ.trudnosc,
  };
}

function kolizjaPunktu(z: { x0: number; y0: number; x1: number; y1: number }[], x: number, y: number) {
  return z.some((q) => x > q.x0 + 1 && x < q.x1 - 1 && y > q.y0 + 1 && y < q.y1 - 1);
}
