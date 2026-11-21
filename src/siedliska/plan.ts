// Planer obozu z palisadą (etap 2 siedlisk) – czysta funkcja: to samo ziarno + ta sama mapa = ten sam obóz,
// niezależnie od postaci, logowania i kolejności wczytywania kafli (wołana dopiero, gdy cała okolica jest wczytana).
// Bez Phasera i DOM-u (testy: scripts/tests/siedliska.mjs).
import { rng } from '../rng';
import { OBOZ, TEREN_SIEDLISK, MIESZKANCY_SIEDLISK, WERSJA_SIEDLISK, SCHRONIENIA, type RozmiarSiedliska, type KsztaltNamiotu } from '../content/siedliska';
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
  // Wąskie ścieżki i polne drogi (OBOZ.przechodnie) mogą przecinać obóz – dostaną bramy; drogi dla aut, tory i rzeki nie.
  if (t.liniaTwarda(x, y, margLin * M)) return false;
  return true;
}

/**
 * Obóz o środku (x, y) albo null, gdy miejsce się nie nadaje. `M` = px mapy na metr. `id` = stały identyfikator
 * (mapa + komórka + wersja generatora) – z niego ziarno.
 */
/** `region` = id stylu regionu świata (content/styleRegionow.ts) – decyduje o kształtach schronień. */
export function planujOboz(id: string, x: number, y: number, t: TerenSiedliska, M: number, region = 'umiarkowany'): Siedlisko | null {
  const seed = hashSiedliska(`${id}:v${WERSJA_SIEDLISK}`);
  const r = rng(seed);
  const T = TEREN_SIEDLISK;
  // Środek: otwarty teren (las, łąka, zarośla, pole) – nie park, nie cmentarz, nie woda.
  const rodz = t.rodzaje(x, y);
  if (!(rodz.length ? rodz : ['']).every((k) => T.dozwolone.includes(k))) return null;
  if (t.zablokowane(x, y) || t.glowna(x, y, T.odGlownejM * M)) return null;
  const malyDobry = dobryPunkt(t, x, y, M, T.odBudynkuM, T.odLiniiM);

  const wylosowany = losujWage(OBOZ.wagiRozmiaru, r());
  const kolejnosc = OBOZ.kolejnosc.slice(OBOZ.kolejnosc.indexOf(wylosowany));
  const fazy = [r() * TAU, r() * TAU, r() * TAU];
  for (const rozmiar of kolejnosc) {
    const P = OBOZ.rozmiary[rozmiar];
    const N = P.wierzcholki;
    const R = P.promienM * M;
    const wielki = !!P.zBudynkami;
    if (!wielki && !malyDobry) continue;
    // Wielkie obozy: palisada omija budynki (odBudynkuWielkiM) i twarde linie (drogi dla aut, tory, rzeki); ścieżki
    // przecinające palisadę dostaną bramy. Zwykłe: z dala od wszystkiego (dobryPunkt).
    const naPalisade = wielki
      ? (px: number, py: number) => !t.zablokowane(px, py) && !t.rodzaje(px, py).some((k) => T.zakazane.includes(k)) && !t.budynek(px, py, OBOZ.odBudynkuWielkiM * M) && !t.liniaTwarda(px, py, T.odLiniiM * M)
      : (px: number, py: number) => dobryPunkt(t, px, py, M, T.odBudynkuM, T.odLiniiM);
    const wSrodkuOk = wielki
      ? (px: number, py: number) => !t.rodzaje(px, py).some((k) => T.zakazane.includes(k)) && !t.liniaTwarda(px, py, T.odLiniiM * 0.5 * M)
      : (px: number, py: number) => dobryPunkt(t, px, py, M, 0, T.odLiniiM * 0.5);
    if (wielki && t.budynki(x - R - OBOZ.wiesM * M, y - R - OBOZ.wiesM * M, x + R + OBOZ.wiesM * M, y + R + OBOZ.wiesM * M).length > OBOZ.wiesBudynkow + P.zBudynkami!) continue;
    // Promień każdego kierunku: nieregularny (dwie fale + szum), skurczony tam, gdzie brakuje miejsca.
    const rho: number[] = [];
    let ok = true;
    for (let i = 0; i < N && ok; i++) {
      const a = (i / N) * TAU;
      const fala = Math.sin(a * 2 + fazy[0]) * 0.55 + Math.sin(a * 3 + fazy[1]) * 0.3 + (r() - 0.5) * 0.5;
      let p = R * (1 + fala * OBOZ.rozrzut);
      // Cały promień od środka do palisady musi być dobry (inaczej obrys przeskoczyłby drogę albo rzekę).
      for (let d = R * 0.1; d < p + T.odLiniiM * M; d += 2 * M)
        if (!wSrodkuOk(x + Math.cos(a) * d, y + Math.sin(a) * d)) { p = Math.min(p, d - T.odLiniiM * M); break; }
      while (p >= R * OBOZ.minUdzial) {
        const zew = p + T.odLiniiM * 0.4 * M;
        const px = x + Math.cos(a) * zew, py = y + Math.sin(a) * zew;
        if (naPalisade(px, py)) break;
        p -= R * 0.06;
      }
      if (p < R * OBOZ.minUdzial) ok = false;
      rho.push(p);
    }
    if (!ok) continue;
    // Wygładzenie (bez ostrych zębów), potem wnętrze: pierścienie próbek.
    const gl = rho.map((p, i) => (rho[(i + N - 1) % N] + p * 2 + rho[(i + 1) % N]) / 4).map((p, i) => Math.min(p, rho[i]));
    for (const f of wielki ? [0.25, 0.5, 0.75] : [0.35, 0.7]) for (let i = 0; i < N && ok; i += 2) {
      const a = (i / N) * TAU;
      if (!wSrodkuOk(x + Math.cos(a) * gl[i] * f, y + Math.sin(a) * gl[i] * f)) ok = false;
    }
    if (!ok) continue;
    // Całe odcinki palisady (nie tylko wierzchołki) muszą omijać budynki i linie: zły odcinek ściąga oba końce do środka.
    for (let it = 0; it < 8 && ok; it++) {
      let zmiana = false;
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N, ai = (i / N) * TAU, aj = (j / N) * TAU;
        const ax = x + Math.cos(ai) * gl[i], ay = y + Math.sin(ai) * gl[i], bx = x + Math.cos(aj) * gl[j], by = y + Math.sin(aj) * gl[j];
        const L = Math.hypot(bx - ax, by - ay), k = Math.max(2, Math.ceil(L / (1.5 * M)));
        let zly = false;
        for (let q = 1; q < k && !zly; q++) if (!naPalisade(ax + ((bx - ax) * q) / k, ay + ((by - ay) * q) / k)) zly = true;
        if (zly) { gl[i] *= 0.94; gl[j] *= 0.94; zmiana = true; }
      }
      if (gl.some((p) => p < R * OBOZ.minUdzial * 0.9)) ok = false;
      if (!zmiana) break;
    }
    if (!ok) continue;
    const obrys: number[] = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU;
      obrys.push(x + Math.cos(a) * gl[i], y + Math.sin(a) * gl[i]);
    }
    // Pojedyncze budynki w środku (zajęte gospodarstwo, stodoła) – najwyżej P.zBudynkami.
    if (wielki && t.budynki(x - R * 1.3, y - R * 1.3, x + R * 1.3, y + R * 1.3).filter((b) => wWielokacie(obrys, (b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2)).length > P.zBudynkami!) continue;
    const s = zbudujOboz(id, seed, rozmiar, x, y, obrys, gl, t, M, r, fazy[2], region);
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

function zbudujOboz(id: string, seed: number, rozmiar: RozmiarSiedliska, x: number, y: number, obrys: number[], gl: number[], t: TerenSiedliska, M: number, r: () => number, faza: number, region: string): Siedlisko | null {
  const SCH = SCHRONIENIA[region] ?? SCHRONIENIA.umiarkowany;
  const P = OBOZ.rozmiary[rozmiar];
  const ile = ([lo, hi]: [number, number]) => lo + Math.floor(r() * (hi - lo + 1));
  const Rsr = gl.reduce((s, p) => s + p, 0) / gl.length;

  // Bramy: pierwsza w stronę najbliższej drogi/ścieżki (jeśli jest), druga mniej więcej naprzeciw.
  const droga = t.droga(x, y, (OBOZ.sciezkaDoDrogiM + Rsr / M) * M);
  const katBram: number[] = [droga ? Math.atan2(droga.y - y, droga.x - x) : faza];
  if (ile(P.bramy) > 1) katBram.push(katBram[0] + Math.PI + (r() - 0.5) * 1.2);
  const szer = OBOZ.bramaM * M;
  const bramy: Brama[] = [];
  // Wielkie obozy: każda ścieżka/polna droga przecinająca palisadę przechodzi przez bramę (nic nie zostaje odcięte).
  for (const c of t.przeciecia(obrys)) {
    const a = Math.atan2(c.y - y, c.x - x);
    const w = Math.max(szer, c.szer + 3 * M);
    const blisko = bramy.find((b) => Math.hypot(b.x - c.x, b.y - c.y) < (b.szer + w) / 2 + 4 * M);
    if (blisko) { blisko.szer = Math.max(blisko.szer, Math.hypot(blisko.x - c.x, blisko.y - c.y) * 2 + w); continue; }
    bramy.push({ x: c.x, y: c.y, nx: Math.cos(a), ny: Math.sin(a), szer: w, sciezka: true });
  }
  if (bramy.length) katBram.splice(0, katBram.length, ...katBram.filter((a) => !bramy.some((b) => katRoznica(a, Math.atan2(b.y - y, b.x - x)) < 0.6)));
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
      if (wOdcinku >= (P.promienM > 70 ? 6 : 4)) { odc++; wOdcinku = 0; }
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
  let ognisko = { x: x + (r() - 0.5) * 3 * M, y: y + (r() - 0.5) * 3 * M };
  // Nie na ścieżce biegnącej przez obóz (ognisko blokuje przejście).
  if (t.linia(ognisko.x, ognisko.y, 2.5 * M)) {
    let znalezione = false;
    for (let k = 0; k < 48 && !znalezione; k++) {
      const a = (k / 24) * TAU * 3, d = (2 + k * 0.8) * M;
      const c = { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d };
      if (wSrodku(c.x, c.y, 3 * M) && !t.linia(c.x, c.y, 2.5 * M) && !t.zablokowane(c.x, c.y)) { ognisko = c; znalezione = true; }
    }
    if (!znalezione) return null;
  }

  // Namioty na pierścieniu wokół ogniska, nie na drodze od bram, z odstępem od palisady i od siebie.
  const namioty: Namiot[] = [];
  const zajete: { x0: number; y0: number; x1: number; y1: number }[] = [];
  const kolizja = (x0: number, y0: number, x1: number, y1: number) => zajete.some((q) => x0 < q.x1 && x1 > q.x0 && y0 < q.y1 && y1 > q.y0);
  // Wielkie obozy: kilka „osiedli” – każde przy swoim ognisku, namioty w kręgu wokół niego.
  const ogniska = [ognisko];
  const ileOgnisk = ({ twierdza: 6, wielki: 4, warownia: 3, duzy: 2 } as Partial<Record<RozmiarSiedliska, number>>)[rozmiar] ?? 1;
  for (let k = 1, proby = 0; k < ileOgnisk && proby < 60; proby++) {
    const a = (k / ileOgnisk) * TAU + faza + (r() - 0.5) * 0.7;
    const p = naObrysie(x, y, gl, a).p * (0.42 + r() * 0.22);
    const fx = x + Math.cos(a) * p, fy = y + Math.sin(a) * p;
    if (!wSrodku(fx, fy, 10 * M) || t.zablokowane(fx, fy) || t.linia(fx, fy, 6 * M)) continue;
    if (ogniska.some((o) => Math.hypot(o.x - fx, o.y - fy) < 22 * M)) continue;
    if (P.zBudynkami && t.budynki(fx - 9 * M, fy - 9 * M, fx + 9 * M, fy + 9 * M).length) continue;
    ogniska.push({ x: fx, y: fy });
    k++;
  }
  const doOgniska = (px: number, py: number) => Math.min(...ogniska.map((o) => Math.hypot(o.x - px, o.y - py)));
  // Budynki w obozie i ścieżki przez obóz: nic na nich nie stawiamy.
  if (P.zBudynkami) for (const b of t.budynki(x - Rsr * 1.3, y - Rsr * 1.3, x + Rsr * 1.3, y + Rsr * 1.3)) zajete.push({ x0: b.x0 - 3 * M, y0: b.y0 - 3 * M, x1: b.x1 + 3 * M, y1: b.y1 + 4 * M });
  const naLinii = (x0: number, y0: number, x1: number, y1: number) => t.linia((x0 + x1) / 2, (y0 + y1) / 2, Math.max(x1 - x0, y1 - y0) / 2 + 1 * M);
  const ileN = ile(P.namioty);
  const katGl = Math.atan2(bramy[0].y - y, bramy[0].x - x);
  // Namiot szefa naprzeciw głównej bramy – chyba że tam też jest brama (ścieżka na wylot): wtedy z boku.
  const katSzefa = [Math.PI, Math.PI / 2, -Math.PI / 2, Math.PI * 0.75, -Math.PI * 0.75].map((d) => katGl + d)
    .find((a) => !bramy.some((b) => katRoznica(a, Math.atan2(b.y - y, b.x - x)) < 0.7)) ?? katGl + Math.PI;
  // Małe obozy: namioty bliżej ogniska, ciaśniej (inaczej nie mieszczą się w palisadzie).
  const ciasny = P.promienM < 25;
  const pierscien = ciasny ? [0.22, 0.42] : P.promienM >= 40 ? [0.28, 0.8] : [0.5, 0.68];
  const luz = (ciasny ? 1.2 : 2.5) * M;
  for (let i = 0, proby = 0; i < ileN && proby < 60 + ileN * 30; proby++) {
    const szef = i === 0;
    const a = szef ? katSzefa + (r() - 0.5) * 0.4 : r() * TAU;
    const wOsiedlu = !szef && ogniska.length > 1;
    if (!szef && !wOsiedlu && bramy.some((b) => katRoznica(a, Math.atan2(b.y - y, b.x - x)) < 0.45)) continue;
    // Szef wielkiego obozu: tuż przy głównym ognisku, po stronie przeciwnej głównej bramie.
    const szefWOsiedlu = szef && ogniska.length > 1;
    const og = wOsiedlu ? ogniska[i % ogniska.length] : szefWOsiedlu ? ognisko : { x, y };
    const pr = wOsiedlu ? (8 + r() * 9) * M : szefWOsiedlu ? (10 + r() * 3 + proby * 0.3) * M : naObrysie(x, y, gl, a).p * (pierscien[0] + r() * (pierscien[1] - pierscien[0]));
    // Kalenica północ–południe, wejście od południa: wolny przedsionek pod spodem.
    const duzySzef = szef && !ciasny;
    const ksztalt: KsztaltNamiotu = szef ? SCH.szef : losujWage(SCH.wagi, r());
    // Wymiary podstawy wg kształtu (okrągłe: w = d); szef większy.
    const [bw, bd] = ({ namiot: [5.4, 4.6], szalas: [5.2, 3.8], kota: [5.2, 5.2], jurta: [6.2, 6.2], chata: [5.4, 5.4], beduin: [8.2, 5] } as Record<KsztaltNamiotu, [number, number]>)[ksztalt];
    const wiecej = duzySzef ? 1.35 : 1 + r() * 0.15;
    const w = bw * wiecej * M, d = bd * wiecej * M;
    const cx = og.x + Math.cos(a) * pr, cy = og.y + Math.sin(a) * pr;
    const x0 = cx - w / 2 - luz, y0 = cy - d / 2 - 1.5 * M, x1 = cx + w / 2 + luz, y1 = cy + d / 2 + (ciasny ? 2 : 3) * M;
    if (![[x0, y0], [x1, y0], [x0, y1], [x1, y1]].every(([px, py]) => wSrodku(px, py, luz))) continue;
    if (doOgniska(cx, cy) < (ciasny ? 3.5 : 6) * M + Math.min(w, d) / 2) continue;
    if (kolizja(x0, y0, x1, y1) || naLinii(x0, y0, x1, y1)) continue;
    zajete.push({ x0, y0, x1, y1 });
    namioty.push({ x: cx, y: cy, w, d, szef, wariant: Math.floor(r() * 3), ksztalt, region });
    i++;
  }
  if (namioty.length < Math.min(2, ileN) || namioty.length < ileN * 0.6) return null;
  for (const o of ogniska) zajete.push({ x0: o.x - 3 * M, y0: o.y - 3 * M, x1: o.x + 3 * M, y1: o.y + 3 * M });

  // Wieża strażnicza: przy palisadzie, z boku od głównej bramy.
  // Wieże strażnicze przy palisadzie, rozłożone wokół (pierwsza z boku od głównej bramy).
  const wieze: { x: number; y: number }[] = [];
  const ileW = Math.floor(P.wieze) + (r() < P.wieze % 1 ? 1 : 0);
  for (let k = 0; k < ileW; k++) for (let proba = 0; proba < 8; proba++) {
    const a = katGl + Math.PI / 2 + (k / Math.max(1, ileW)) * TAU + (proba ? (r() - 0.5) * 1.4 : (r() - 0.5) * 0.4);
    if (bramy.some((b) => katRoznica(a, Math.atan2(b.y - y, b.x - x)) < 0.4)) continue;
    const p = naObrysie(x, y, gl, a);
    const wx = x + Math.cos(a) * (p.p - 5 * M), wy = y + Math.sin(a) * (p.p - 5 * M);
    if (!wSrodku(wx, wy, 3 * M) || kolizja(wx - 3 * M, wy - 3 * M, wx + 3 * M, wy + 3 * M) || naLinii(wx - 3 * M, wy - 3 * M, wx + 3 * M, wy + 3 * M)) continue;
    wieze.push({ x: wx, y: wy });
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
    if (!wSrodku(rx, ry, 2 * M) || kolizja(rx - 2 * M, ry - 2 * M, rx + 2 * M, ry + 2 * M) || naLinii(rx - 2 * M, ry - 2 * M, rx + 2 * M, ry + 2 * M)) continue;
    zajete.push({ x0: rx - 2 * M, y0: ry - 2 * M, x1: rx + 2 * M, y1: ry + 2 * M });
    rekwizyty.push({ x: rx, y: ry, rodzaj: RODZ[Math.floor(r() * 3)], seed: (seed + i * 31337) >>> 0 });
    i++;
  }

  // Duże obozy: skrzynie, beczki i drewno także przy namiotach (inaczej środek warowni jest pusty).
  if (P.promienM >= 40) for (const nm of namioty) for (let k = 0; k < 2; k++) {
    const sx = r() < 0.5 ? -1 : 1;
    const rx = nm.x + sx * (nm.w / 2 + 2.2 * M), ry = nm.y + (r() - 0.5) * nm.d * 0.6;
    if (!wSrodku(rx, ry, 2 * M) || kolizja(rx - 1.6 * M, ry - 1.2 * M, rx + 1.6 * M, ry + 1.2 * M) || naLinii(rx - 1.6 * M, ry - 1.2 * M, rx + 1.6 * M, ry + 1.2 * M)) continue;
    zajete.push({ x0: rx - 1.6 * M, y0: ry - 1.2 * M, x1: rx + 1.6 * M, y1: ry + 1.2 * M });
    rekwizyty.push({ x: rx, y: ry, rodzaj: RODZ[Math.floor(r() * 3)], seed: (seed + rekwizyty.length * 31337) >>> 0 });
  }

  // Życie obozu (właściciel 21.11.2026: „ognisko, gar nad ogniem, pieczeń, ukradzione zwoje miedzi – życie!”):
  // nad każdym ogniskiem gar albo rożen, wokół pieńki do siedzenia, przy namiocie szefa sterta łupów, przy innych czasem.
  const nadOgniem = ogniska.map(() => { const u = r(); return u < 0.45 ? 'gar' as const : u < 0.85 ? 'rozen' as const : null; });
  const przyBramie = (px: number, py: number) => bramy.some((b) => Math.hypot(px - b.x, py - b.y) < b.szer / 2 + 6 * M);
  const dodajRekwizyt = (rx: number, ry: number, rodzaj: Rekwizyt['rodzaj'], polW: number, polH: number) => {
    if (przyBramie(rx, ry) || !wSrodku(rx, ry, 1.5 * M) || kolizja(rx - polW, ry - polH, rx + polW, ry + polH) || naLinii(rx - polW, ry - polH, rx + polW, ry + polH)) return false;
    zajete.push({ x0: rx - polW, y0: ry - polH, x1: rx + polW, y1: ry + polH });
    rekwizyty.push({ x: rx, y: ry, rodzaj, seed: (seed + rekwizyty.length * 31337) >>> 0 });
    return true;
  };
  for (const o of ogniska) {
    const a0 = r() * TAU;
    for (let k = 0, n = 2 + Math.floor(r() * 2); k < n; k++) {
      const a = a0 + (k / n) * TAU + (r() - 0.5) * 0.4;
      // Pieńki stoją na skraju paleniska (zajęte pole ogniska ma ±3 m – sprawdzamy tylko namioty i wieże).
      const px = o.x + Math.cos(a) * 4.2 * M, py = o.y + Math.sin(a) * 3.4 * M;
      if (wSrodku(px, py, 1.5 * M) && !przyBramie(px, py) && !naLinii(px - M, py - M, px + M, py + M) && !namioty.some((n) => Math.abs(px - n.x) < n.w / 2 + 1.5 * M && Math.abs(py - n.y) < n.d / 2 + 2 * M) && !wieze.some((w) => Math.hypot(px - w.x, py - w.y) < 5 * M) && !rekwizyty.some((q) => Math.hypot(px - q.x, py - q.y) < 2.5 * M))
        rekwizyty.push({ x: px, y: py, rodzaj: 'pienek', seed: (seed + rekwizyty.length * 31337) >>> 0 });
    }
  }
  const LUP: Rekwizyt['rodzaj'][] = ['zwoje', 'rury', 'lup'];
  const szefT = namioty[0];
  for (let k = 0, n = 3 + Math.floor(r() * 3), proby = 0; k < n && proby < 30; proby++) {
    const a = r() * TAU, d = Math.max(szefT.w, szefT.d) / 2 + (2.5 + r() * 3) * M;
    if (dodajRekwizyt(szefT.x + Math.cos(a) * d, szefT.y + Math.sin(a) * d * 0.8, LUP[Math.floor(r() * 3)], 1.4 * M, 1 * M)) k++;
  }
  for (const nm of namioty.slice(1)) if (r() < 0.3) {
    const sx = r() < 0.5 ? -1 : 1;
    dodajRekwizyt(nm.x + sx * (nm.w / 2 + 2 * M), nm.y + (r() - 0.5) * nm.d * 0.5, LUP[Math.floor(r() * 3)], 1.4 * M, 1 * M);
  }

  // Zejście do jaskini (src/loch, rodzaj 'jaskinia') za namiotem szefa – skalny otwór, w środku labirynt.
  let jaskinia: { x: number; y: number } | null = null;
  if (r() < P.jaskinia) {
    const sz = namioty[0];
    for (let k = 0; k < 16 && !jaskinia; k++) {
      const a = -Math.PI / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.4;
      const d = Math.max(sz.w, sz.d) / 2 + 7 * M;
      const jx = sz.x + Math.cos(a) * d, jy = sz.y + Math.sin(a) * d;
      const b = { x0: jx - 4 * M, y0: jy - 3 * M, x1: jx + 4 * M, y1: jy + 6 * M };
      if (!wSrodku(jx, jy, 5 * M) || kolizja(b.x0, b.y0, b.x1, b.y1) || naLinii(b.x0, b.y0, b.x1, b.y1)) continue;
      if ([[0, 0], [-6, -4], [6, -4], [-6, 8], [6, 8]].some(([dx, dy]) => t.zablokowane(jx + dx, jy + dy))) continue;
      jaskinia = { x: jx, y: jy };
      zajete.push(b);
    }
  }

  // Ścieżki: od każdej bramy do ogniska (lekki łuk) i od głównej bramy do najbliższej drogi.
  const sciezki: Siedlisko['sciezki'] = [];
  for (const b of bramy) {
    if (b.sciezka) continue; // przez tę bramę i tak biegnie prawdziwa ścieżka
    const sx = b.x + b.nx * 2 * M, sy = b.y + b.ny * 2 * M;
    const mx = (sx + ognisko.x) / 2 + (r() - 0.5) * 4 * M, my = (sy + ognisko.y) / 2 + (r() - 0.5) * 4 * M;
    const pts: number[] = [];
    for (let k = 0; k <= 8; k++) {
      const u = k / 8, a = (1 - u) * (1 - u), bq = 2 * u * (1 - u), c = u * u;
      pts.push(a * sx + bq * mx + c * ognisko.x, a * sy + bq * my + c * ognisko.y);
    }
    sciezki.push({ pts, w: 2.6 * M });
  }
  // Wydeptane przejścia między osiedlami (od głównego ogniska do pozostałych).
  for (const o of ogniska.slice(1)) {
    const mx = (o.x + ognisko.x) / 2 + (r() - 0.5) * 8 * M, my = (o.y + ognisko.y) / 2 + (r() - 0.5) * 8 * M;
    const pts: number[] = [];
    for (let k = 0; k <= 10; k++) {
      const u = k / 10, a = (1 - u) * (1 - u), bq = 2 * u * (1 - u), c = u * u;
      pts.push(a * ognisko.x + bq * mx + c * o.x, a * ognisko.y + bq * my + c * o.y);
    }
    sciezki.push({ pts, w: 2.2 * M });
  }
  if (droga && !bramy[0].sciezka) {
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
  for (const o of ogniska) for (let k = 0; k < (ogniska.length > 1 ? 2 : 3); k++) {
    const a = r() * TAU;
    spawny.push({ x: o.x + Math.cos(a) * 4.5 * M, y: o.y + Math.sin(a) * 4.5 * M, rola: 'czlonek' });
  }
  for (const b of bramy) spawny.push({ x: b.x - b.nx * 4 * M, y: b.y - b.ny * 4 * M, rola: 'czlonek' });
  if (jaskinia) spawny.push({ x: jaskinia.x + 4 * M, y: jaskinia.y + 6 * M, rola: 'czlonek' });
  for (const w of wieze) spawny.push({ x: w.x, y: w.y + 4 * M, rola: 'czlonek' });
  const szefN = namioty[0];
  for (const s of [-1, 1]) spawny.push({ x: szefN.x + s * 3.5 * M, y: szefN.y + szefN.d / 2 + 5 * M, rola: 'obstawa' });
  const spawnyOk = spawny.filter((q) => wSrodku(q.x, q.y, 1.5 * M) && !kolizjaPunktu(zajete, q.x, q.y) && !t.zablokowane(q.x, q.y) && !rekwizyty.some((k) => Math.hypot(k.x - q.x, k.y - q.y) < 2.2 * M));
  // Szef zawsze ma swoje miejsce: gdy przed jego namiotem ciasno – najbliższe wolne miejsce obok.
  if (!spawnyOk.some((q) => q.rola === 'szef') && spawnyOk.length) {
    let best = spawnyOk[0];
    for (const q of spawnyOk) if (Math.hypot(q.x - szefN.x, q.y - szefN.y) < Math.hypot(best.x - szefN.x, best.y - szefN.y)) best = q;
    best.rola = 'szef';
  }
  if (!spawnyOk.some((q) => q.rola === 'szef')) return null;

  const MZ = { ...MIESZKANCY_SIEDLISK.oboz, szef: P.szef };
  const czlonkowie: RodzajWroga[] = [];
  const berserk: boolean[] = [];
  for (let i = ile(P.czlonkowie); i > 0; i--) {
    const k = losujWage(P.sklad, r());
    czlonkowie.push(k);
    berserk.push(k !== 'wilk' && k !== 'warg' && r() < P.berserkow);
  }

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < obrys.length; i += 2) { x0 = Math.min(x0, obrys[i]); y0 = Math.min(y0, obrys[i + 1]); x1 = Math.max(x1, obrys[i]); y1 = Math.max(y1, obrys[i + 1]); }
  for (const s of sciezki) for (let i = 0; i < s.pts.length; i += 2) { x0 = Math.min(x0, s.pts[i]); y0 = Math.min(y0, s.pts[i + 1]); x1 = Math.max(x1, s.pts[i]); y1 = Math.max(y1, s.pts[i + 1]); }
  const zapas = 8 * M;
  // Wielkie obozy: klepisko tylko tam, gdzie się chodzi i mieszka.
  let placki: number[] | undefined;
  if (P.promienM >= 40) {
    placki = [];
    for (const n of namioty) placki.push(n.x, n.y + n.d * 0.3, Math.max(n.w, n.d) / 2 + 6 * M);
    for (const o of ogniska) placki.push(o.x, o.y, 10 * M);
    for (const w of wieze) placki.push(w.x, w.y, 6 * M);
    for (const q of rekwizyty) placki.push(q.x, q.y, 4 * M);
    for (const b of bramy) placki.push(b.x, b.y, b.szer / 2 + 4 * M);
    if (jaskinia) placki.push(jaskinia.x, jaskinia.y + 2 * M, 8 * M);
  }
  return {
    id, typ: 'oboz', wersja: WERSJA_SIEDLISK, seed, rozmiar, x, y, obrys,
    ramka: { x0: x0 - zapas, y0: y0 - zapas * 2, x1: x1 + zapas, y1: y1 + zapas },
    bramy, pale, sciany, namioty, ognisko, ogniska, nadOgniem, placki, wieze, rekwizyty, sciezki, spawny: spawnyOk, jaskinia,
    stwory: { czlonkowie, berserk, moc: P.moc, szef: MZ.szef, obstawa: MZ.obstawa, ileObstawy: P.obstawa },
    trudnosc: MZ.trudnosc + ({ twierdza: 4, wielki: 3, warownia: 2, duzy: 1, sredni: 0, maly: 0, czujka: -1 } as Record<RozmiarSiedliska, number>)[rozmiar],
  };
}

function kolizjaPunktu(z: { x0: number; y0: number; x1: number; y1: number }[], x: number, y: number) {
  return z.some((q) => x > q.x0 + 1 && x < q.x1 - 1 && y > q.y0 + 1 && y < q.y1 - 1);
}
