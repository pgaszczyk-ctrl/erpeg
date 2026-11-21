// Testy siedlisk (etap 1–2): deterministyczność planera, kolizje palisady i bram, obejście przez bramę,
// szwy między kawałkami mapy (podłoże obozu malowane w częściach = w całości) i podgląd PNG z góry.
// Uruchamianie: node scripts/tests/siedliska.mjs   (PODGLAD=ścieżka.rgba zapisuje surowy obraz podglądu)
import { writeFileSync } from 'node:fs';
import { planujOboz } from '../../src/siedliska/plan';
import { planujRumowisko, planujBagno } from '../../src/siedliska/planTypy';
import { wElipsach } from '../../src/siedliska/kolizje';
import { zablokowaneW, obejscie, wWielokacie, odlegloscOdObrysu, ustawGruboscPalisady } from '../../src/siedliska/kolizje';
import { malujSiedlisko, doGeneratora } from '../../src/siedliska/ziemia';
import { rysujOdcinek, rysujNamiot, rysujWieze, rysujRekwizyt, rysujOgien, rysujGlaz, rysujMartwe, rysujNadOgniem, type Rysunek } from '../../src/siedliska/rysunki';
import { kolorPodloza } from '../../src/gen/podloze';
import { nowy, naloz } from '../../src/gen/wspolne';
import { OBOZ } from '../../src/content/siedliska';
import type { TerenSiedliska, Siedlisko } from '../../src/siedliska/typy';

const M = 1.92;
ustawGruboscPalisady(OBOZ.grubosc);
let bledy = 0;
const sprawdz = (ok: boolean, co: string) => { if (!ok) { bledy++; console.error('✗', co); } };

// Sztuczna mapa: las, droga na wschodzie (pionowa linia x = 260), budynek na północnym zachodzie, staw na południu.
const DROGA_X = 260;
const teren: TerenSiedliska = {
  rodzaje: (x, y) => (Math.hypot(x - 60, y - 330) < 40 ? ['water'] : ['forest']),
  zablokowane: (x, y) => Math.hypot(x - 60, y - 330) < 40 || (x > -120 && x < -80 && y > -140 && y < -100),
  budynek: (x, y, r) => x > -120 - r && x < -80 + r && y > -140 - r && y < -100 + r,
  linia: (x, _y, r) => Math.abs(x - DROGA_X) < r + 4,
  glowna: () => false,
  droga: (x, y, r) => (Math.abs(x - DROGA_X) < r ? { x: DROGA_X - 4, y } : null),
  liniaTwarda: (x, _y, r) => Math.abs(x - DROGA_X) < r + 4,
  przeciecia: () => [],
  budynki: (x0, y0, x1, y1) => (x1 > -120 && x0 < -80 && y1 > -140 && y0 < -100 ? [{ x0: -120, y0: -140, x1: -80, y1: -100 }] : []),
};

// 1. Determinizm i poprawność na wielu ziarnach.
let zbudowane = 0;
const rozmiary: Record<string, number> = {};
let pierwszy: Siedlisko | null = null;
const wzory: Record<string, Siedlisko> = {};
for (let k = 0; k < 300; k++) {
  const id = `test:oboz:${k}`;
  const a = planujOboz(id, 60, 60, teren, M), b = planujOboz(id, 60, 60, teren, M);
  sprawdz(JSON.stringify(a) === JSON.stringify(b), `determinizm ${id}`);
  if (!a) continue;
  zbudowane++;
  if (process.env.PODGLAD_K ? k === Number(process.env.PODGLAD_K) : !pierwszy) pierwszy = a;
  rozmiary[a.rozmiar] = (rozmiary[a.rozmiar] ?? 0) + 1;
  wzory[a.rozmiar] ??= a;
  // Bramy przechodnie: środek bramy i punkty po obu stronach wolne.
  for (const g of a.bramy) for (const t of [-4, 0, 4]) {
    const x = g.x + g.nx * t * M, y = g.y + g.ny * t * M;
    sprawdz(!zablokowaneW(a, x, y, M), `${id}: brama zablokowana (${t})`);
    sprawdz(!zablokowaneW(a, x - g.ny * 1.5 * M, y + g.nx * 1.5 * M, M), `${id}: brama za wąska`);
  }
  // Palisada zamknięta poza bramami: idąc po okręgu tuż za obrysem, każdy promień ze środka trafia w ścianę albo w bramę.
  for (let i = 0; i < 72; i++) {
    const kat = (i / 72) * Math.PI * 2;
    let trafil = false, wBramie = false;
    for (let d = 0; d < 200 * M; d += 0.5) {
      const x = a.x + Math.cos(kat) * d, y = a.y + Math.sin(kat) * d;
      if (a.bramy.some((g) => Math.hypot(x - g.x, y - g.y) < g.szer / 2 + 1.5)) wBramie = true;
      if (zablokowaneW(a, x, y, M)) { trafil = true; break; }
      if (!wWielokacie(a.obrys, x, y)) break;
    }
    sprawdz(trafil || wBramie, `${id}: dziura w palisadzie (kąt ${i * 5}°)`);
  }
  // Namioty w środku, spawny wolne i w środku.
  for (const n of a.namioty) sprawdz(wWielokacie(a.obrys, n.x, n.y), `${id}: namiot poza obozem`);
  for (const s of a.spawny) sprawdz(!zablokowaneW(a, s.x, s.y, M) && wWielokacie(a.obrys, s.x, s.y), `${id}: spawn zablokowany`);
  sprawdz(a.spawny.some((s) => s.rola === 'szef'), `${id}: brak miejsca szefa`);
  // Nic nie stoi na drodze, w budynku ani w stawie.
  for (let i = 0; i < a.obrys.length; i += 2) {
    sprawdz(Math.abs(a.obrys[i] - DROGA_X) > 8 * M, `${id}: palisada przy drodze`);
    sprawdz(!teren.zablokowane(a.obrys[i], a.obrys[i + 1]), `${id}: palisada w przeszkodzie`);
  }
  // Obejście: z wnętrza do punktu za ścianą (nie przez bramę) wskazuje bramę.
  const g = a.bramy[0];
  const za = { x: a.x - g.nx * 90 * M, y: a.y - g.ny * 90 * M };
  const w = obejscie([a], a.x, a.y, za.x, za.y, M);
  if (w) sprawdz(Math.hypot(w.x - g.x, w.y - g.y) < 6 * M || a.bramy.some((q) => Math.hypot(w.x - q.x, w.y - q.y) < 6 * M), `${id}: obejście nie prowadzi do bramy`);
}
// 1b. Wielkie obozy: las bez dróg, przez środek biegnie ścieżka (y = 0), w środku stoi gospodarstwo.
const SC = 6 * M / 2; // pół szerokości ścieżki
const DOM = { x0: 60, y0: -150, x1: 80, y1: -130 };
const wDomu = (x: number, y: number, r = 0) => x > DOM.x0 - r && x < DOM.x1 + r && y > DOM.y0 - r && y < DOM.y1 + r;
const teren2: TerenSiedliska = {
  rodzaje: () => ['forest'],
  zablokowane: (x, y) => wDomu(x, y),
  budynek: (x, y, r) => wDomu(x, y, r),
  linia: (_x, y, r) => Math.abs(y) < r + SC,
  liniaTwarda: () => false,
  glowna: () => false,
  droga: () => null,
  budynki: (x0, y0, x1, y1) => (x1 > DOM.x0 && x0 < DOM.x1 && y1 > DOM.y0 && y0 < DOM.y1 ? [DOM] : []),
  przeciecia: (o) => {
    const out: { x: number; y: number; szer: number }[] = [];
    const n = o.length / 2;
    for (let i = 0; i < n; i++) {
      const ay = o[i * 2 + 1], by = o[((i + 1) % n) * 2 + 1];
      if ((ay > 0) === (by > 0)) continue;
      const u = ay / (ay - by), ax = o[i * 2], bx = o[((i + 1) % n) * 2];
      out.push({ x: ax + (bx - ax) * u, y: 0, szer: SC * 2 });
    }
    return out;
  },
};
const wielkie: Record<string, number> = {};
for (let k = 0; k < 120; k++) {
  const a = planujOboz(`test:wielki:${k}`, 0, 0, teren2, M);
  if (!a) continue;
  wielkie[a.rozmiar] = (wielkie[a.rozmiar] ?? 0) + 1;
  if (a.rozmiar === 'twierdza' || a.rozmiar === 'wielki') wzory[a.rozmiar] ??= a;
  // Ścieżka przechodzi przez cały obóz: żaden punkt na niej nie jest zablokowany przez konstrukcje.
  for (let x = -400; x <= 400; x += 1) sprawdz(!zablokowaneW(a, x, 0, M), `test:wielki:${k} (${a.rozmiar}): ścieżka zablokowana przy x=${x}`);
  // Palisada nie przecina gospodarstwa.
  for (let i = 0; i < a.sciany.length; i += 2) sprawdz(!wDomu(a.sciany[i], a.sciany[i + 1], 4), `test:wielki:${k}: palisada w budynku`);
}
console.log('wielkie obozy (las ze ścieżką i domem):', wielkie);
sprawdz((wielkie.twierdza ?? 0) > 3 && (wielkie.wielki ?? 0) > 3, 'za mało wielkich obozów');
sprawdz(!!wzory.twierdza?.jaskinia, 'twierdza bez jaskini');

// 1c. Rumowisko i bagno: determinizm, droga do środka wolna, spawny wolne.
const dzicz = (rodz: string): TerenSiedliska => ({ ...teren2, rodzaje: () => [rodz], linia: () => false, przeciecia: () => [], budynki: () => [], zablokowane: () => false, budynek: () => false });
const typy: Record<string, number> = {};
for (const [nazwa, plan, rodz] of [['rumowisko', planujRumowisko, 'scrub'], ['bagno', planujBagno, 'wetland']] as const) {
  for (let k = 0; k < 80; k++) {
    const id = `test:${nazwa}:${k}`;
    const a = plan(id, 0, 0, dzicz(rodz), M), b = plan(id, 0, 0, dzicz(rodz), M);
    sprawdz(JSON.stringify(a) === JSON.stringify(b), `determinizm ${id}`);
    if (!a) continue;
    typy[nazwa] = (typy[nazwa] ?? 0) + 1;
    wzory[nazwa] ??= a;
    for (const q of a.spawny) sprawdz(!zablokowaneW(a, q.x, q.y, M), `${id}: spawn zablokowany`);
    // Ścieżki/grobla do środka przejezdne (bagno: żadna nie przez głębokie oczko).
    for (const sc of a.sciezki) for (let i = 0; i < sc.pts.length; i += 2) sprawdz(!zablokowaneW(a, sc.pts[i], sc.pts[i + 1], M), `${id}: ścieżka zablokowana`);
    if (nazwa === 'bagno') sprawdz(!wElipsach(a.oczka!, a.x, a.y), `${id}: środek w wodzie`);
    if (nazwa === 'rumowisko') sprawdz((a.glazy?.length ?? 0) > 8, `${id}: mało głazów`);
  }
}
console.log('rumowiska/bagna:', typy);
sprawdz((typy.rumowisko ?? 0) > 40 && (typy.bagno ?? 0) > 40, 'za mało rumowisk/bagien');

sprawdz(zbudowane > 100, `za mało obozów (${zbudowane}/300)`);
console.log('obozy:', zbudowane, rozmiary);
for (const r of ['czujka', 'maly', 'sredni', 'duzy', 'warownia']) sprawdz(!!wzory[r], `brak obozu rozmiaru ${r}`);
// Rozmiary naprawdę różne: pole obrysu rośnie z rozmiarem.
const pole = (o: number[]) => { let a = 0; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) a += (o[j] - o[i]) * (o[j + 1] + o[i + 1]); return Math.abs(a / 2) / (M * M); };
const pola = ['czujka', 'maly', 'sredni', 'duzy', 'warownia'].map((r) => (wzory[r] ? Math.round(pole(wzory[r].obrys)) : 0));
console.log('pole obrysu (m²):', pola.join(' < '));
for (let i = 1; i < pola.length; i++) sprawdz(pola[i] > pola[i - 1] * 1.5, `rozmiar ${i} niewiele większy od poprzedniego`);

// 2. Szwy: podłoże obozu malowane w 4 kawałkach = jeden duży obraz.
const s = doGeneratora(pierwszy!, 2);
const X0 = Math.floor(s.ramka.x0) - 20, Y0 = Math.floor(s.ramka.y0) - 20;
const DUZY = 2 * Math.ceil(Math.max(s.ramka.x1 - s.ramka.x0, s.ramka.y1 - s.ramka.y0) / 2) + 40;
const tlo = (o: { w: number; h: number; px: Uint32Array }, x0: number, y0: number) => {
  for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) {
    const x = x0 + i, y = y0 + j;
    o.px[j * o.w + i] = kolorPodloza(wWielokacie(s.obrys, x, y) ? 'klepisko' : 'las_lisciasty', x, y);
  }
};
const caly = nowy(DUZY, DUZY);
tlo(caly, X0, Y0);
malujSiedlisko(caly, X0, Y0, s);
const H = DUZY / 2;
for (const [dx, dy] of [[0, 0], [H, 0], [0, H], [H, H]]) {
  const cz = nowy(H, H);
  tlo(cz, X0 + dx, Y0 + dy);
  malujSiedlisko(cz, X0 + dx, Y0 + dy, s);
  let rozne = 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < H; i++) if (cz.px[j * H + i] !== caly.px[(j + dy) * DUZY + i + dx]) rozne++;
  sprawdz(rozne === 0, `szew kawałka (${dx},${dy}): ${rozne} różnych pikseli`);
}

// 3. Podgląd: każdy rozmiar osobno – ziemia + konstrukcje ułożone wg podstawy (jak w grze, głębia = y).
if (process.env.PODGLAD) for (const [nazwa, wz] of Object.entries(wzory)) {
  const q0 = doGeneratora(wz, 2);
  const W = Math.ceil(Math.max(q0.ramka.x1 - q0.ramka.x0, q0.ramka.y1 - q0.ramka.y0) / 2) * 2;
  const R = Math.max(...q0.obrys.map((v, i) => Math.abs(v - (i % 2 ? q0.y : q0.x)))) + 70;
  const ox = Math.round(q0.x - R), oy = Math.round(q0.y - R - 30), S = Math.round(2 * R + 40);
  const obraz = nowy(S, S);
  const zeSciezka = nazwa === 'twierdza' || nazwa === 'wielki';
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const X = ox + i, Y = oy + j;
    const dom = zeSciezka && X >= DOM.x0 * 2 && X <= DOM.x1 * 2 && Y >= DOM.y0 * 2 && Y <= DOM.y1 * 2;
    const pl = q0.placki;
    let klep = wWielokacie(q0.obrys, X, Y);
    if (pl) {
      klep = odlegloscOdObrysu(q0.obrys, X, Y) < 7.5;
      for (let k = 0; k < pl.length && !klep; k += 3) if (Math.hypot(pl[k] - X, pl[k + 1] - Y) < pl[k + 2]) klep = true;
    }
    const wObr = wWielokacie(q0.obrys, X, Y);
    let rz: string = zeSciezka && Math.abs(Y) < SC * 2 ? 'droga' : klep ? (q0.podstawa ?? 'klepisko') : 'las_lisciasty';
    if (wObr && q0.podstawa) {
      rz = q0.podstawa === 'brak' ? 'las_lisciasty' : q0.podstawa;
      for (const [l, k] of [[q0.skaly, 'skala'], [q0.bloto, 'bloto'], [q0.plycizny, 'plycizna'], [q0.oczka, 'woda'], [q0.wyspy, 'zarosla']] as [number[] | undefined, string][]) if (l && wElipsach(l, X, Y)) rz = k;
      for (const sc of q0.sciezki) for (let k = 0; k + 3 < sc.pts.length; k += 2) { const ax = sc.pts[k], ay = sc.pts[k + 1], bx = sc.pts[k + 2], by = sc.pts[k + 3]; const L = (bx - ax) ** 2 + (by - ay) ** 2 || 1, u = Math.max(0, Math.min(1, ((X - ax) * (bx - ax) + (Y - ay) * (by - ay)) / L)); if (Math.hypot(X - ax - (bx - ax) * u, Y - ay - (by - ay) * u) < sc.w / 2) rz = 'droga'; }
    }
    obraz.px[j * S + i] = dom ? 0xff3a4a8a : kolorPodloza(rz as never, X, Y);
  }
  malujSiedlisko(obraz, ox, oy, q0);
  const obr: { y: number; r: Rysunek; x: number; yy: number }[] = [];
  const odc = new Map<number, typeof q0.pale>();
  for (const p of q0.pale) { const l = odc.get(p.odc) ?? []; l.push(p); odc.set(p.odc, l); }
  for (const l of odc.values()) obr.push({ y: Math.max(...l.map((p) => p.y)), r: rysujOdcinek(l), x: 0, yy: 0 });
  for (const n of q0.namioty) obr.push({ y: n.y + n.d / 2, r: rysujNamiot(n), x: n.x, yy: n.y });
  for (const w of q0.wieze) obr.push({ y: w.y + 7, r: rysujWieze(), x: w.x, yy: w.y });
  for (const q of q0.rekwizyty) obr.push({ y: q.y, r: rysujRekwizyt(q.rodzaj, q.seed), x: q.x, yy: q.y });
  for (const [i, o] of q0.ogniska.entries()) {
    obr.push({ y: o.y, r: rysujOgien(1), x: o.x, yy: o.y });
    const w = q0.nadOgniem?.[i];
    if (w) obr.push({ y: o.y + 1, r: rysujNadOgniem(w, 1), x: o.x, yy: o.y });
  }
  for (const g of q0.glazy ?? []) obr.push({ y: g.y + g.r * 0.5, r: rysujGlaz(g.r, g.seed), x: g.x, yy: g.y });
  for (const m of q0.martwe ?? []) obr.push({ y: m.y, r: rysujMartwe(m.seed % 5), x: m.x, yy: m.y });
  obr.sort((a, b) => a.y - b.y);
  for (const q of obr) naloz(obraz, q.r.o, Math.round(q.x - q.r.kx - ox), Math.round(q.yy - q.r.ky - oy));
  void W;
  writeFileSync(`${process.env.PODGLAD}-${nazwa}.rgba`, Buffer.from(obraz.px.buffer));
  writeFileSync(`${process.env.PODGLAD}-${nazwa}.json`, JSON.stringify({ w: S, h: S }));
}

if (bledy) { console.error(`siedliska: ${bledy} błędów`); process.exit(1); }
console.log('siedliska: OK');
