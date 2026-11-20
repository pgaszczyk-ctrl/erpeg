// Podłoże siedliska w Web Workerze (ziemia09): cienie palisady, namiotów i wieży w tym samym kierunku co cienie
// budynków (cienBudynku: k, k/2 na piksel wysokości), palenisko z kamieni, przypalona ziemia, ślady i drzazgi
// na klepisku. Klepisko i ścieżki są już w mapie rodzajów (Podloze09) – tu tylko szczegóły. Współrzędne świata,
// więc sąsiednie kawałki łączą się bez szwów. Wysokości w px generatora = jak w rysunki.ts.
import { hash, hex, ciemniej, mieszaj, OBRYS, type Obraz } from '../gen/wspolne';
import { kolorPodloza, rodzajPostrzepiony, type Rodzaj } from '../gen/podloze';
import type { Siedlisko } from './typy';
import { WYS } from './rysunki';

const KAMIEN = [hex('#6f6a70'), hex('#858087'), hex('#9a959b'), hex('#55505a')];
const POPIOL = [hex('#3a3430'), hex('#4c4540'), hex('#5e5650')];
const DRZAZGA = [hex('#a07a4a'), hex('#c49a62')];

/** Siedlisko przeskalowane do px generatora (G = GEN_DOTS) – tyle potrzebuje Web Worker. */
export function doGeneratora(s: Siedlisko, G: number): Siedlisko {
  const sk = (a: number[]) => a.map((v) => v * G);
  return {
    ...s,
    x: s.x * G, y: s.y * G, obrys: sk(s.obrys),
    ramka: { x0: s.ramka.x0 * G, y0: s.ramka.y0 * G, x1: s.ramka.x1 * G, y1: s.ramka.y1 * G },
    bramy: s.bramy.map((b) => ({ ...b, x: b.x * G, y: b.y * G, szer: b.szer * G })),
    pale: s.pale.map((p) => ({ ...p, x: p.x * G, y: p.y * G })),
    sciany: sk(s.sciany),
    namioty: s.namioty.map((n) => ({ ...n, x: n.x * G, y: n.y * G, w: n.w * G, d: n.d * G })),
    ognisko: { x: s.ognisko.x * G, y: s.ognisko.y * G },
    wieze: s.wieze.map((w) => ({ x: w.x * G, y: w.y * G })),
    rekwizyty: s.rekwizyty.map((q) => ({ ...q, x: q.x * G, y: q.y * G })),
    sciezki: s.sciezki.map((q) => ({ pts: sk(q.pts), w: q.w * G })),
    spawny: [],
  };
}

/** Maluje szczegóły siedliska (już w px generatora) na obraz kawałka o lewym-górnym rogu (X0, Y0). */
export function malujSiedlisko(o: Obraz, X0: number, Y0: number, s: Siedlisko, rodzajW?: (x: number, y: number) => Rodzaj | null) {
  const N = o.w;
  if (s.ramka.x1 < X0 || s.ramka.x0 > X0 + N || s.ramka.y1 < Y0 - 60 || s.ramka.y0 > Y0 + N + 40) return;
  // Klepisko i wydeptane ścieżki z mapy rodzajów jeszcze raz na wierzchu: pasy pól i inne warstwy malowane po
  // podłożu (pola.ts maluje całe obrysy pól) nie mogą przykryć terenu siedliska.
  if (rodzajW) {
    const R0 = s.ramka;
    for (let j = Math.max(0, Math.floor(R0.y0 - Y0)); j < Math.min(N, Math.ceil(R0.y1 - Y0)); j++)
      for (let i = Math.max(0, Math.floor(R0.x0 - X0)); i < Math.min(N, Math.ceil(R0.x1 - X0)); i++) {
        const r = rodzajPostrzepiony(rodzajW, X0 + i, Y0 + j);
        if (r === 'klepisko' || r === 'droga') o.px[j * N + i] = kolorPodloza(r, X0 + i, Y0 + j);
      }
  }
  const cien = new Uint8Array(N * N);
  const plamka = (x: number, y: number) => {
    const i = Math.round(x) - X0, j = Math.round(y) - Y0;
    if (i >= 0 && j >= 0 && i < N && j < N) cien[j * N + i] = 1;
  };
  // Cień jednego słupa: pas od podstawy w stronę (k, k/2).
  const cienSlupa = (x: number, y: number, h: number, szer: number) => {
    for (let k = 0; k <= h * 0.9; k++) for (let w = -szer; w <= szer; w++) plamka(x + k + w * 0.3, y + k * 0.5 + w * 0.6);
  };
  // Palisada: ciągły cień każdej ściany (równoległobok od podstawy do podstawy przesuniętej o wysokość pala).
  const hp = WYS.pal * 0.7; // pale z prześwitami: cień krótszy i lżejszy niż pełnej ściany
  for (let i = 0; i < s.sciany.length; i += 4) {
    const ax = s.sciany[i], ay = s.sciany[i + 1], bx = s.sciany[i + 2], by = s.sciany[i + 3];
    const L = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
    for (let u = 0; u <= L; u++) {
      const x = ax + ((bx - ax) * u) / L, y = ay + ((by - ay) * u) / L;
      for (let k = 0; k <= hp; k += 0.5) plamka(x + k, y + k * 0.5);
    }
  }
  for (const p of s.pale) if (p.brama) cienSlupa(p.x, p.y, WYS.slupBramy, 2);
  for (const n of s.namioty) {
    const H = n.szef ? WYS.namiotSzefa : WYS.namiot;
    // Cień dachu dwuspadowego (kalenica północ–południe): przekrój zwęża się ku kalenicy przesuniętej w stronę cienia.
    for (let k = 0; k <= H * 0.9; k += 0.5) {
      const hw = (n.w / 2) * (1 - k / (H * 0.9 + 1));
      for (let yy = -n.d / 2; yy <= n.d / 2; yy++) for (let xx = -hw; xx <= hw; xx++) plamka(n.x + xx + k, n.y + yy + k * 0.5);
    }
  }
  for (const w of s.wieze) for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cienSlupa(w.x + dx * 10, w.y + dy * 7, WYS.wieza, 1);
  for (const q of s.rekwizyty) cienSlupa(q.x, q.y, 6, 3);
  // Cień nie pada na samą podstawę konstrukcji (ona przykrywa ziemię).
  for (const n of s.namioty) for (let yy = -n.d / 2; yy <= n.d / 2; yy++) for (let xx = -n.w / 2; xx <= n.w / 2; xx++) {
    const i = Math.round(n.x + xx) - X0, j = Math.round(n.y + yy) - Y0;
    if (i >= 0 && j >= 0 && i < N && j < N) cien[j * N + i] = 0;
  }

  // Klepisko: deptane ślady, drzazgi i kamyki (rzadko, z hasha świata).
  const R = s.ramka;
  for (let j = Math.max(0, Math.floor(R.y0 - Y0)); j < Math.min(N, Math.ceil(R.y1 - Y0)); j++)
    for (let i = Math.max(0, Math.floor(R.x0 - X0)); i < Math.min(N, Math.ceil(R.x1 - X0)); i++) {
      const x = X0 + i, y = Y0 + j;
      const h = hash(x, y, 4401);
      if (h > 0.012) continue;
      if (h < 0.004) o.px[j * N + i] = ciemniej(o.px[j * N + i]);
      else if (h < 0.008) o.px[j * N + i] = DRZAZGA[h < 0.006 ? 0 : 1];
      else o.px[j * N + i] = KAMIEN[Math.floor(hash(x, y, 4402) * 3)];
    }

  for (let k = 0; k < cien.length; k++) if (cien[k]) o.px[k] = ciemniej(o.px[k]);

  // Palenisko: przypalona ziemia, popiół, pierścień kamieni.
  const fx = s.ognisko.x, fy = s.ognisko.y;
  for (let dy = -14; dy <= 14; dy++) for (let dx = -18; dx <= 18; dx++) {
    const i = Math.round(fx + dx) - X0, j = Math.round(fy + dy) - Y0;
    if (i < 0 || j < 0 || i >= N || j >= N) continue;
    const e = Math.hypot(dx / 1.25, dy);
    const x = fx + dx, y = fy + dy;
    const k = j * N + i;
    if (e < 4.5) o.px[k] = POPIOL[Math.floor(hash(x, y, 4403) * 3)];
    else if (e < 7) {
      const kat = Math.atan2(dy, dx / 1.25);
      const kamien = Math.floor(((kat + Math.PI) / (Math.PI * 2)) * 11);
      const brzeg = Math.abs(e - 5.8) > 0.9 || hash(kamien, 0, 4404) < 0.08;
      o.px[k] = brzeg ? OBRYS : KAMIEN[(kamien + (dy < 0 ? 2 : 0) + (dx < 0 ? 1 : 0)) % 3];
    } else if (e < 13 && hash(x, y, 4405) < 1.2 - e / 11) o.px[k] = mieszaj(o.px[k], POPIOL[0], 0.45);
  }
}
