// Testy siedlisk (etap 1–2): deterministyczność planera, kolizje palisady i bram, obejście przez bramę,
// szwy między kawałkami mapy (podłoże obozu malowane w częściach = w całości) i podgląd PNG z góry.
// Uruchamianie: node scripts/tests/siedliska.mjs   (PODGLAD=ścieżka.rgba zapisuje surowy obraz podglądu)
import { writeFileSync } from 'node:fs';
import { planujOboz } from '../../src/siedliska/plan';
import { zablokowaneW, obejscie, wWielokacie, ustawGruboscPalisady } from '../../src/siedliska/kolizje';
import { malujSiedlisko, doGeneratora } from '../../src/siedliska/ziemia';
import { rysujOdcinek, rysujNamiot, rysujWieze, rysujRekwizyt, rysujOgien, type Rysunek } from '../../src/siedliska/rysunki';
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
    for (let d = 0; d < 80 * M; d += 0.5) {
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
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) obraz.px[j * S + i] = kolorPodloza(wWielokacie(q0.obrys, ox + i, oy + j) ? 'klepisko' : 'las_lisciasty', ox + i, oy + j);
  malujSiedlisko(obraz, ox, oy, q0);
  const obr: { y: number; r: Rysunek; x: number; yy: number }[] = [];
  const odc = new Map<number, typeof q0.pale>();
  for (const p of q0.pale) { const l = odc.get(p.odc) ?? []; l.push(p); odc.set(p.odc, l); }
  for (const l of odc.values()) obr.push({ y: Math.max(...l.map((p) => p.y)), r: rysujOdcinek(l), x: 0, yy: 0 });
  for (const n of q0.namioty) obr.push({ y: n.y + n.d / 2, r: rysujNamiot(n), x: n.x, yy: n.y });
  for (const w of q0.wieze) obr.push({ y: w.y + 7, r: rysujWieze(), x: w.x, yy: w.y });
  for (const q of q0.rekwizyty) obr.push({ y: q.y, r: rysujRekwizyt(q.rodzaj, q.seed), x: q.x, yy: q.y });
  obr.push({ y: q0.ognisko.y, r: rysujOgien(1), x: q0.ognisko.x, yy: q0.ognisko.y });
  obr.sort((a, b) => a.y - b.y);
  for (const q of obr) naloz(obraz, q.r.o, Math.round(q.x - q.r.kx - ox), Math.round(q.yy - q.r.ky - oy));
  void W;
  writeFileSync(`${process.env.PODGLAD}-${nazwa}.rgba`, Buffer.from(obraz.px.buffer));
  writeFileSync(`${process.env.PODGLAD}-${nazwa}.json`, JSON.stringify({ w: S, h: S }));
}

if (bledy) { console.error(`siedliska: ${bledy} błędów`); process.exit(1); }
console.log('siedliska: OK');
