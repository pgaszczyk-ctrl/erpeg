import { nowy, naloz, doCanvas, Obraz, malujPodloze, posiejRuno, runo, budynek, cienBudynku, ciemniej, Rodzaj, poleM2, poziomSteampunku, bayer, przeswitWyciecie } from '../../index';
const S = (window as any).SCENA as { W: number; H: number; bud: any[]; areas: any[]; lines: any[] };
const { W, H } = S;
const RODZ: Rodzaj[] = ['trawa', 'plac', 'parking', 'bruk', 'chodnik', 'droga'];
const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d')!;
g.fillStyle = 'rgb(1,0,0)'; g.fillRect(0, 0, W, H);
const kol = (k: string) => `rgb(${RODZ.indexOf(k as Rodzaj)},0,0)`;
for (const a of S.areas) { g.fillStyle = kol(a.k); g.beginPath(); a.r.forEach((p: number[], i: number) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.fill(); }
for (const l of S.lines) { const k = l.k === 'primary' || l.k === 'residential' ? 'bruk' : 'chodnik';
  g.strokeStyle = kol(k); g.lineWidth = l.w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); l.p.forEach((p: number[], i: number) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); }
const id = g.getImageData(0, 0, W, H).data; const M = new Uint8Array(W * H); for (let k = 0; k < W * H; k++) M[k] = Math.min(RODZ.length - 1, id[k * 4]);
const rodzajW = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? null : RODZ[M[(y | 0) * W + (x | 0)]]);
const pieter = (b: any) => (b.h ? Math.max(1, Math.round(b.h / 3.3)) : poleM2(b.r.flat()) > 400 ? 5 : 3);
const regula = (n: number) => (n <= 8 ? 8 + 4 * (n - 1) : Math.min(52, 36 + 2 * (n - 8)));
const dzis = (n: number) => (n <= 1 ? 8 : n === 2 ? 12 : 16);
const wszystkie = S.bud.filter((b) => !b.mh && b.r.length > 3 && !(b.h > 200)).map((b, i) => ({ ...b, i, maxY: Math.max(...b.r.map((p: number[]) => p[1])) }));
const ramka = (b: any) => { const xs = b.r.map((p: number[]) => p[0]), ys = b.r.map((p: number[]) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
// OSM ma ten sam obrys kilka razy (budynek + jego części) – zostaw najwyższy
const budynki = wszystkie.filter((b) => !wszystkie.some((c) => c !== b && ramka(c).every((v, k) => Math.abs(v - ramka(b)[k]) < 3) && ((c.h || 0) > (b.h || 0) || ((c.h || 0) === (b.h || 0) && c.i < b.i))));
const hero = document.getElementById('hero') as HTMLImageElement;
const poziomaKrawedz = (b: any) => Math.max(...b.r.map((a: number[], i: number) => { const c = b.r[(i + 1) % b.r.length]; const d = Math.hypot(c[0] - a[0], c[1] - a[1]); return d && Math.abs(c[1] - a[1]) / d < 0.35 ? d : 0; }));
const wnetrze = (r: number[][], x: number, y: number) => { let w = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) w = !w; } return w; };
const bb = (b: any) => { const xs = b.r.map((p: number[]) => p[0]), ys = b.r.map((p: number[]) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
const tenSam = (a: any, b: any) => bb(a).every((v, i) => Math.abs(v - bb(b)[i]) < 3);
// bohater na ulicy w pasie południowej ściany wysokiego budynku: punkt (x−0,35t, y−t) leży w obrysie, sam (x, y) – na ziemi
let naj: any = null, HX = 0, HY = -1, sciana = 0;
for (const kand of budynki.filter((b) => b.h >= 20 && poziomaKrawedz(b) > 30 && bb(b)[2] < W + 100 && bb(b)[3] < H - 40).sort((a, b) => b.h - a.h)) {
  const sc = regula(pieter(kand)), t = Math.round(sc * 0.55); let ek = [0, -1e9, 0, -1e9];
  kand.r.forEach((p: number[], i: number) => { const c = kand.r[(i + 1) % kand.r.length]; const d = Math.hypot(c[0] - p[0], c[1] - p[1]);
    if (d > 30 && Math.abs(c[1] - p[1]) / d < 0.35 && (p[1] + c[1]) / 2 > (ek[1] + ek[3]) / 2) ek = [p[0], p[1], c[0], c[1]]; });
  const x = Math.round((ek[0] + ek[2]) / 2 + 0.35 * t); let yy = -1;
  for (let y = Math.min(ek[1], ek[3]) - 5; y < Math.max(ek[1], ek[3]) + sc; y++) if (wnetrze(kand.r, x - 0.35 * t, y - t) && !budynki.some((b) => wnetrze(b.r, x, y) && !tenSam(b, kand))) yy = y;
  if (yy > 0) { naj = kand; HX = x; HY = yy; sciana = sc; break; }
}
console.log('bohater', HX, HY, sciana, naj && naj.h);
function scena(war: 'dzis' | 'nowa', przeswit: number | boolean): HTMLCanvasElement {
  const tryb = przeswit === true ? 1 : przeswit === false ? 0 : przeswit;
  const wys = (b: any) => (war === 'dzis' ? dzis : regula)(pieter(b));
  const o = nowy(W, H); malujPodloze(o, 0, 0, rodzajW); for (const q of posiejRuno(0, 0, W, H, rodzajW)) runo(o, q.x, q.y, q.rodzaj, q.seed);
  const cien = new Uint8Array(W * H); budynki.forEach((b) => cienBudynku(b.r.flat(), wys(b), cien, W, H, 0, 0)); for (let k = 0; k < W * H; k++) if (cien[k]) o.px[k] = ciemniej(o.px[k]);
  const lista = budynki.slice().sort((a, b) => a.maxY + wys(a) - b.maxY - wys(b));
  const wysokie: { im: Obraz; x: number; y: number; baza: number }[] = [];
  lista.forEach((b) => { const r = budynek(b.r.flat(), { wysokosc: wys(b), dach: ['papa', 'blacha_zielona', 'lupek', 'dachowka_brazowa'][b.i % 4], sciana: ['tynk_szary', 'tynk_kremowy', 'kamien', 'cegla', 'tynk_zolty'][b.i % 5], seed: b.i * 13, steampunk: poziomSteampunku('duze', poleM2(b.r.flat()), b.i * 97), komin: true });
    if (war === 'nowa' && wys(b) >= 24) wysokie.push({ im: r.obraz, x: r.x0, y: r.y0, baza: b.maxY + wys(b) }); else naloz(o, r.obraz, r.x0, r.y0); });
  const c = doCanvas(o), x = c.getContext('2d')!;
  // bohater (siatka 32 → 48 px), potem wysokie budynki; za budynkiem → prześwit w kole wokół bohatera
  const rysujBohatera = () => x.drawImage(hero, 32, 0, 32, 32, HX - 24, HY - 46, 48, 48);
  rysujBohatera();
  for (const w of wysokie) {
    const za = HY < w.baza && HX + 20 > w.x && HX - 20 < w.x + w.im.w && HY > w.y && HY - 46 < w.y + w.im.h;
    const im = tryb === 4 && za ? przeswitWyciecie(w.im, w.x, w.y, HX, HY) : { ...w.im, px: w.im.px.slice() };
    if (tryb && tryb !== 4 && za) for (let j = 0; j < im.h; j++) for (let i = 0; i < im.w; i++) { const k = j * im.w + i; if (!(im.px[k] >>> 24)) continue;
      const dx = w.x + i - HX, dy = w.y + j - (HY - 22);
      if (tryb === 1) { const d = Math.hypot(dx, dy * 0.85); if (d < 26 || (d < 31 && bayer(w.x + i, w.y + j) < (31 - d) / 5)) im.px[k] = (im.px[k] & 0x00ffffff) | (0x66 << 24) >>> 0; }
      else if (tryb === 2) { const d = Math.hypot(dx / 1.25, dy); const R = 58, B = 14; // duża elipsa: cała postać i kawał ulicy wokół
        if (d < R || (d < R + B && bayer(w.x + i, w.y + j) < (R + B - d) / B)) im.px[k] = (im.px[k] & 0x00ffffff) | (0x50 << 24) >>> 0; }
      else if (tryb === 4) { const d = Math.hypot(dx / 1.25, dy); const R = 58, B = 10;
        const brzeg = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const ii = i + a, jj = j + b; return ii < 0 || jj < 0 || ii >= im.w || jj >= im.h || !(w.im.px[jj * im.w + ii] >>> 24) || ((w.im.px[jj * im.w + ii] & 0xffffff) === 0x241a1e) !== ((w.im.px[k] & 0xffffff) === 0x241a1e); });
        const wew = d < R || (d < R + B && bayer(w.x + i, w.y + j) < (R + B - d) / B);
        if (wew) im.px[k] = brzeg ? (im.px[k] & 0x00ffffff) | (0xb0 << 24) >>> 0 : (im.px[k] & 0x00ffffff) | (0x18 << 24) >>> 0; }
      else if (tryb === 3) im.px[k] = (im.px[k] & 0x00ffffff) | ((bayer(w.x + i, w.y + j) < 0.5 ? 0x90 : 0x40) << 24) >>> 0; // cały budynek przygaszony
    }
    x.drawImage(doCanvas(im), w.x, w.y);
  }
  return c;
}
function pokaz(t: string, c: HTMLCanvasElement, k: number, kadr: [number, number, number, number]) {
  const b = document.createElement('canvas'); b.width = kadr[2] * k; b.height = kadr[3] * k; const x = b.getContext('2d')!; x.imageSmoothingEnabled = false;
  x.drawImage(c, kadr[0], kadr[1], kadr[2], kadr[3], 0, 0, b.width, b.height);
  const d = document.createElement('div'); d.innerHTML = `<h3>${t}</h3>`; d.appendChild(b); document.body.appendChild(d);
}
const start = () => {
  const kadr: [number, number, number, number] = (window as any).KADR ?? [0, 0, W, H];
  const z: [number, number, number, number] = [HX - 130, HY - 120, 260, 200];
  pokaz('A: bez prześwitu', scena('nowa', 0), 3, z);
  pokaz('B: małe koło (było) – widać tylko głowę', scena('nowa', 1), 3, z);
  pokaz('C: duża elipsa – cała postać i ulica wokół', scena('nowa', 2), 3, z);
  pokaz('D: cały budynek przygaszony', scena('nowa', 3), 3, z);
  pokaz('E: duże wycięcie – zostaje tylko kontur budynku', scena('nowa', 4), 3, z);
  (window as any).__ok = true;
};
if (hero.complete) start(); else hero.onload = start;
