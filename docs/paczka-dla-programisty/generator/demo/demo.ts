// Galeria + pomiar czasu generowania. Zbuduj: npx esbuild demo/demo.ts --bundle --format=iife --outfile=demo/demo.js
import { nowy, naloz, doCanvas, Obraz, hash, rng, ciemniej, GATUNKI, drzewo, klatkiWiatru, malujPodloze, obwodka, Rodzaj, runo, budynek, cienBudynku, para, tor, przyciagnij, malujWode, posiejRuno, rurociagWzdluz, trasaPrzyDrodze, dlugosc } from '../index';

const czasy: Record<string, number> = {};
const mierz = <T>(n: string, f: () => T): T => { const t = performance.now(); const r = f(); czasy[n] = Math.round((performance.now() - t) * 10) / 10; return r; };
const pokaz = (tytul: string, o: Obraz, skala: number) => {
  const d = document.createElement('div'); d.innerHTML = `<h3>${tytul}</h3>`;
  const c = doCanvas(o); c.style.width = o.w * skala + 'px'; c.style.imageRendering = 'pixelated'; c.style.background = '#4a7433';
  d.appendChild(c); document.body.appendChild(d);
};

// 1. drzewa: wszystkie gatunki × 3 warianty + 5 klatek wiatru
const atlas = mierz('drzewa_wszystkie_gatunki_x3_z_wiatrem', () => {
  const lista: { g: string; d: ReturnType<typeof drzewo>; w: Obraz[] }[] = [];
  for (const g of Object.keys(GATUNKI)) for (let v = 0; v < 3; v++) { const d = drzewo(g, 1000 + v * 77 + g.length * 13); lista.push({ g, d, w: klatkiWiatru(d.korona, d.koronaGora, d.koronaDol, GATUNKI[g].sztywnosc) }); }
  return lista;
});
{
  const W = 72, H = 80, kol = 9;
  const o = nowy(W * kol, H * Math.ceil(atlas.length / kol));
  atlas.forEach((a, i) => { const x = (i % kol) * W, y = Math.floor(i / kol) * H; const ox = (x + (W - a.d.korona.w) / 2) | 0, oy = y + H - a.d.korona.h; naloz(o, a.d.pien, ox, oy); naloz(o, a.d.korona, ox, oy); if (a.d.owoce) naloz(o, a.d.owoce, ox, oy); });
  pokaz('Drzewa: każdy gatunek w 3 wariantach (skala 0,6)', o, 3);
  const o2 = nowy(60 * 5 + 40, 70 * 2);
  const dab = atlas.find((a) => a.g === 'dab')!;
  [dab.d.pien, dab.d.pienZacios!, dab.d.pieniek, dab.d.sadzonka].forEach((p, i) => naloz(o2, p, i * 60, 0));
  naloz(o2, dab.d.pien, 4 * 60, 0); naloz(o2, dab.d.korona, 4 * 60, 0);
  dab.w.forEach((f, i) => { naloz(o2, dab.d.pien, i * 68 + 6, 70); naloz(o2, f, i * 68, 70); });
  pokaz('Dąb: pień, pień z zaciosem, pieniek, sadzonka, całość; niżej 5 klatek wiatru', o2, 3);
}

// 2. kawałek mapy 1024×1024 (jak DOTS 2): podłoże, runo, drzewa, budynki, rury, tor
const N = 1024;
const droga = [0, 700, 300, 600, 600, 520, 1024, 380];
const distDroga = (x: number, y: number) => { let m = 1e9; for (let i = 0; i + 3 < droga.length; i += 2) { const ax = droga[i], ay = droga[i + 1], bx = droga[i + 2], by = droga[i + 3], dx = bx - ax, dy = by - ay; let t = ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy); t = Math.max(0, Math.min(1, t)); m = Math.min(m, Math.hypot(ax + t * dx - x, ay + t * dy - y)); } return m; };
const rodzaj = (x: number, y: number): Rodzaj => {
  if (Math.hypot(x - 780, y - 820) < 120 + 10 * Math.sin(Math.atan2(y - 820, x - 780) * 5)) return 'woda';
  if (distDroga(x, y) < 11) return 'bruk';
  if (distDroga(x, y) < 17) return 'chodnik';
  if (x < 360 + 30 * Math.sin(y * 0.02) && y > 40) return y < 500 ? 'las_iglasty' : 'las_lisciasty';
  if (x > 600 && y < 300 && x < 760) return 'plac';
  if (y > 760 && x < 600) return 'laka';
  return 'trawa';
};
const chunk = nowy(N, N);
const mapa = new Uint8Array(N * N); const R: Rodzaj[] = ['trawa', 'laka', 'park', 'las_lisciasty', 'las_iglasty', 'bruk', 'chodnik', 'plac', 'droga', 'piasek', 'woda'];
mierz('mapa_rodzajow_1024 (w grze: wypełnienie obszarów OSM)', () => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) mapa[y * N + x] = R.indexOf(rodzaj(x, y)); });
const rodzajW = (x: number, y: number) => (x < 0 || y < 0 || x >= N || y >= N ? null : R[mapa[y * N + x]]);
const budynki: { p: number[]; h: number; dach: string; sciana: string; seed: number }[] = [];
const r = rng(5);
for (let i = 0; i < 40 && budynki.length < 24; i++) {
  const cx = 420 + r() * 560, cy = 60 + r() * 400, w = 34 + r() * 46, h = 26 + r() * 26, a = (r() - 0.5) * 1.6;
  if (distDroga(cx, cy) < 60 || (cx > 600 && cy < 300 && cx < 760)) continue;
  if (budynki.some((b) => Math.hypot(b.p[0] - cx, b.p[1] - cy) < 90)) continue;
  const co = Math.cos(a), si = Math.sin(a);
  const pts = i % 4 === 0 ? [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, 0], [0, 0], [0, h / 2 + 16], [-w / 2, h / 2 + 16]] : [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
  const p: number[] = []; pts.forEach(([u, v]) => p.push(cx + u * co - v * si, cy + u * si + v * co));
  const dachy = ['dachowka_czerwona', 'dachowka_brazowa', 'lupek', 'gont', 'miedz_patyna'], sciany = ['tynk_kremowy', 'cegla', 'tynk_zolty', 'kamien', 'drewno'];
  budynki.push({ p: przyciagnij(p), h: [8, 12, 16][i % 3], dach: dachy[i % 5], sciana: sciany[(i * 3) % 5], seed: i * 31 });
}
czasy['budynkow'] = budynki.length;
const cienie = new Uint8Array(N * N);
mierz('cienie_budynkow', () => budynki.forEach((b) => cienBudynku(b.p, b.h, cienie, N, N, 0, 0)));
mierz('podloze_1024_z_cieniami', () => malujPodloze(chunk, 0, 0, rodzajW, cienie));
mierz('obwodka_drog', () => obwodka(chunk, 0, 0, rodzajW, 'trawa', ['chodnik', 'bruk']));
mierz('tor', () => tor(chunk, [0, 980, 400, 960, 700, 1000, 1024, 940], 0, 0));
const trzciny = mierz('woda_glebia_i_brzegi', () => malujWode(chunk, 0, 0, rodzajW));
mierz('runo_rozsypane', () => { const k = posiejRuno(0, 0, N, N, rodzajW); k.forEach((q) => runo(chunk, q.x, q.y, q.rodzaj, q.seed)); czasy['runo_sztuk'] = k.length; });
mierz('trzciny', () => { trzciny.sort((a, b) => a[1] - b[1]).forEach(([x, y]) => runo(chunk, x, y, 'trzcina', x * 31 + y)); czasy['trzcin_sztuk'] = trzciny.length; });
mierz('rurociag_wzdluz_drogi', () => {
  // rura po północnej stronie drogi: 8 px za chodnikiem, tym samym łukiem; start pod ziemią, koniec w najbliższym domu
  const odcinek = (ax: number, ay: number, bx: number, by: number, px: number, py: number): [number, number] => { const dx = bx - ax, dy = by - ay; let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy); t = Math.max(0, Math.min(1, t)); return [ax + t * dx, ay + t * dy]; };
  const naScianie = (ex: number, ey: number): [number, number] | undefined => { let best: [number, number] | undefined, bd = 160;
    for (const b of budynki) { const p = b.p, n = p.length / 2; for (let i = 0; i < n; i++) { const j = (i + 1) % n; const q = odcinek(p[2 * i], p[2 * i + 1], p[2 * j], p[2 * j + 1], ex, ey); const d = Math.hypot(q[0] - ex, q[1] - ey); if (d < bd) { bd = d; best = q; } } } return best; };
  const L = dlugosc(droga);
  // koniec rury: miejsce przy drodze (s), z którego najbliżej do ściany domu po północnej stronie
  let najS = 760, najDom: [number, number] | undefined, najD = 1e9;
  for (let s1 = 560; s1 < 900; s1 += 8) { const t = trasaPrzyDrodze(droga, 420, s1, -27); const n = t.pts.length; const d = naScianie(t.pts[n - 2], t.pts[n - 1]); if (d) { const dd = Math.hypot(d[0] - t.pts[n - 2], d[1] - t.pts[n - 1]); if (dd < najD) { najD = dd; najS = s1; najDom = d; } } }
  const t1b = trasaPrzyDrodze(droga, 420, najS, -27, najDom);
  rurociagWzdluz(chunk, t1b.pts, 0, 0, 3, 'ziemia', t1b.koniec);
  const t2 = trasaPrzyDrodze(droga, 820, L - 20, 27);
  rurociagWzdluz(chunk, t2.pts, 0, 0, 4, 'ziemia', 'ziemia');
});
mierz('budynki_wszystkie', () => { budynki.forEach((b, i) => { const g = budynek(b.p, { wysokosc: b.h, dach: b.dach, sciana: b.sciana, seed: b.seed, rura: i % 3 === 0, komin: i % 2 === 0, noc: false }); naloz(chunk, g.obraz, g.x0, g.y0); }); });
mierz('drzewa_w_lesie', () => {
  const pos: [number, number, string][] = []; const rr = rng(9);
  for (let i = 0; i < 9000 && pos.length < 420; i++) { const x = 20 + rr() * 340, y = 60 + rr() * 900; if (!(rodzajW(x | 0, y | 0) || '').startsWith('las')) continue; if (pos.some(([a, b]) => Math.hypot(a - x, (b - y) * 1.3) < 24)) continue;
    const g = y < 500 ? (rr() < 0.6 ? 'sosna' : 'swierk') : (['dab', 'buk', 'brzoza', 'olcha'][Math.floor(rr() * 4)]); pos.push([x, y, g]); }
  pos.sort((a, b) => a[1] - b[1]);
  for (const [x, y, g] of pos) { const v = atlas.filter((a) => a.g === g)[Math.floor(hash(x | 0, y | 0, 1) * 3)]; const d = v.d;
    const ox = (x - d.kotwica[0]) | 0, oy = (y - d.kotwica[1]) | 0;
    const rx = d.korona.w * 0.45, ry = 6;
    for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) { if ((i / rx) ** 2 + (j / ry) ** 2 > 1) continue; const xx = (x + i + rx * 0.4) | 0, yy = (y + j - 2) | 0; if (xx >= 0 && yy >= 0 && xx < N && yy < N) chunk.px[yy * N + xx] = ciemniej(chunk.px[yy * N + xx]); }
    naloz(chunk, d.pien, ox, oy); naloz(chunk, d.korona, ox, oy); }
  czasy['drzew_w_lesie'] = pos.length;
});
const para_kl = mierz('para_3_rozmiary_x6', () => [16, 24, 32].flatMap((s) => [0, 1, 2, 3, 4, 5].map((k) => para(s, k))));
pokaz('Kawałek mapy 1024×1024 (1:1)', chunk, 1);
const crop = (x: number, y: number, w: number, h: number) => { const o = nowy(w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) o.px[j * w + i] = chunk.px[(y + j) * N + x + i]; return o; };
pokaz('Zbliżenie: las', crop(100, 360, 320, 200), 3);
pokaz('Zbliżenie: miasto', crop(560, 60, 360, 260), 3);
pokaz('Zbliżenie: łąka, staw (głębia, plaża, szuwary), tor', crop(560, 640, 440, 360), 3);
pokaz('Zbliżenie: chodnik, trawa i rurociąg wzdłuż drogi', crop(560, 300, 440, 300), 3);
{ const o = nowy(32 * 6, 32 * 3); para_kl.forEach((p, i) => naloz(o, p, (i % 6) * 32, Math.floor(i / 6) * 32)); pokaz('Para: 3 rozmiary × 6 klatek', o, 3); }
(window as any).__czasy = czasy;
const pre = document.createElement('pre'); pre.textContent = JSON.stringify(czasy, null, 1); document.body.prepend(pre);
