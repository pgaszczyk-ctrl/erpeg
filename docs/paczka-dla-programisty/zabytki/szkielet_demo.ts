import { nowy, naloz, doCanvas, Obraz, malujPodloze, posiejRuno, runo, budynek, cienBudynku, obrysuj, hex, ciemniej, jasniej, Rodzaj } from '/home/claude/erpeg/docs/paczka-dla-programisty/generator/index';
const S = (window as any).SCENA as { W: number; H: number; bud: any[]; areas: any[]; lines: any[]; zab: Record<string, number[][][]> };
const { W, H } = S;
const ZAB = ['Zamek w Lublinie', 'Kaplica pw. Świętej Trójcy', 'Wieża Zamkowa Donżon', 'Wystawy okresowe'];
// 1. mapa rodzajów z OSM (płótno z kolorami-identyfikatorami)
const RODZ: Rodzaj[] = ['trawa', 'plac', 'parking', 'bruk', 'chodnik', 'droga'];
const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d')!;
g.fillStyle = 'rgb(1,0,0)'; g.fillRect(0, 0, W, H); // domyślnie plac (stare miasto)
const kol = (k: string) => `rgb(${RODZ.indexOf(k as Rodzaj)},0,0)`;
for (const a of S.areas) { g.fillStyle = kol(a.k); g.beginPath(); a.r.forEach((p: number[], i: number) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.fill(); }
for (const l of S.lines) { const k = ['primary', 'secondary', 'residential', 'construction', 'living_street', 'service'].includes(l.k) ? 'bruk' : ['footway', 'pedestrian', 'steps', 'cycleway'].includes(l.k) ? 'chodnik' : 'droga';
  g.strokeStyle = kol(k); g.lineWidth = l.w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); l.p.forEach((p: number[], i: number) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); }
const id = g.getImageData(0, 0, W, H).data; const M = new Uint8Array(W * H); for (let k = 0; k < W * H; k++) M[k] = Math.min(RODZ.length - 1, id[k * 4]);
const rodzajW = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? null : RODZ[M[(y | 0) * W + (x | 0)]]);
function teren(): Obraz { const o = nowy(W, H); malujPodloze(o, 0, 0, rodzajW); for (const q of posiejRuno(0, 0, W, H, rodzajW)) runo(o, q.x, q.y, q.rodzaj, q.seed); return o; }
const wys = (b: any) => (b.n === 'Wieża Zamkowa Donżon' ? 16 : +(b.lv || 2) >= 3 ? 16 : +(b.lv || 2) >= 2 ? 12 : 8);
function budynkiZwykle(o: Obraz, pomin: boolean) {
  const lista = S.bud.filter((b) => !(pomin && ZAB.includes(b.n))).map((b) => ({ ...b, maxY: Math.max(...b.r.map((p: number[]) => p[1])) })).sort((a, b) => a.maxY - b.maxY);
  const cien = new Uint8Array(W * H); lista.forEach((b) => cienBudynku(b.r.flat(), wys(b), cien, W, H, 0, 0));
  for (let k = 0; k < W * H; k++) if (cien[k]) o.px[k] = ciemniej(o.px[k]);
  lista.forEach((b, i) => { const dach = b.rc === 'green' ? 'miedz_patyna' : b.rc === 'silver' ? 'blacha_zielona' : ['dachowka_czerwona', 'dachowka_brazowa', 'lupek'][i % 3];
    const sc = b.b === 'castle' || b.b === 'chapel' ? 'kamien' : ['tynk_kremowy', 'tynk_zolty', 'tynk_szary'][i % 3];
    const r = budynek(b.r.flat(), { wysokosc: wys(b), dach, sciana: sc, seed: i * 13 }); naloz(o, r.obraz, r.x0, r.y0); });
}
// 2. szkielet: bryły w rzucie gry, każda część innym kolorem, piętra liniami
const CZESCI: Record<string, { H: number; sc: string; dach: string; nr: number; opis: string }> = {
  'Zamek w Lublinie': { H: 16, sc: '#d9c7a0', dach: '#9aa4ae', nr: 1, opis: 'zamek (3 piętra, dach jednospadowy, srebrny)' },
  'Kaplica pw. Świętej Trójcy': { H: 22, sc: '#efe4cc', dach: '#4f8a5e', nr: 2, opis: 'kaplica Świętej Trójcy (wysoka, dach dwuspadowy, zielony)' },
  'Wieża Zamkowa Donżon': { H: 44, sc: '#c9ad80', dach: '#b89c70', nr: 3, opis: 'donżon (25 m – wyjątek: wysoki, ściśnięty)' },
  'Wystawy okresowe': { H: 8, sc: '#cfc4b4', dach: '#8a8f96', nr: 4, opis: 'mały budynek wystaw' },
};
const pip = (r: number[][], x: number, y: number) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [ax, ay] = r[i], [bx, by] = r[j]; if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) c = !c; } return c; };
function szkielet(o: Obraz, sk = 0.35) {
  const glab = new Float32Array(o.w * o.h).fill(-1e9); // bufor głębokości: przód = dalej na południe (podstawa ściany niżej)
  for (const [n, rings] of Object.entries(S.zab)) {
    const r = rings[0], c = CZESCI[n];
    const xs = r.map((p) => p[0]), ys = r.map((p) => p[1]), x0 = Math.floor(Math.min(...xs)), x1 = Math.ceil(Math.max(...xs)), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys)), cx = (x0 + x1) / 2, pol = (x1 - x0) / 2;
    const sc = hex(c.sc), dach = hex(c.dach);
    for (let t = c.H; t >= 0; t--) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (!pip(r, x + 0.5, y + 0.5)) continue;
      const X = Math.round(x + sk * t), Y = y + t; if (X < 0 || Y < 0 || X >= o.w || Y >= o.h) continue;
      const k = Y * o.w + X, key = y + c.H; if (key < glab[k]) continue; glab[k] = key;
      let col = t === 0 ? dach : t % 8 === 0 ? ciemniej(sc) : sc;
      if (t > 0 && n === 'Wieża Zamkowa Donżon') { const f = (x - cx) / pol; col = f > 0.35 ? ciemniej(sc) : f < -0.35 ? jasniej(sc) : sc; if (t % 8 === 0) col = ciemniej(col); }
      o.px[k] = col; }
  }
}
function wyciete(o: Obraz, x: number, y: number, w: number, h: number) { const c = nowy(w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) c.px[j * w + i] = o.px[(y + j) * o.w + x + i]; return c; }
const hero = document.getElementById('hero') as HTMLImageElement;
function pokaz(t: string, o: Obraz, k: number, opisy = false, cx = 0, cy = 0) {
  const c = doCanvas(o), b = document.createElement('canvas'); b.width = o.w * k; b.height = o.h * k; const x = b.getContext('2d')!; x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, b.width, b.height);
  if (opisy) { x.font = `bold ${12 * k}px sans-serif`; x.textAlign = 'center'; x.lineWidth = 6; for (const [n, rings] of Object.entries(S.zab)) { const r = rings[0], mx = r.reduce((a, p) => a + p[0], 0) / r.length - cx, my = r.reduce((a, p) => a + p[1], 0) / r.length - cy; x.strokeStyle = '#fff'; x.fillStyle = '#1e1a24'; x.strokeText(String(CZESCI[n].nr), mx * k, my * k); x.fillText(String(CZESCI[n].nr), mx * k, my * k); } }
  x.drawImage(hero, 32, 0, 32, 32, (o.w * 0.18 - 24) * k, (o.h * 0.86 - 46) * k, 48 * k, 48 * k);
  const d = document.createElement('div'); d.innerHTML = `<h3>${t}</h3>`; d.appendChild(b); document.body.appendChild(d);
}
const start = () => {
  const cx = 470, cy = 400, cw = 620, ch = 470;
  const a = teren(); budynkiZwykle(a, false); pokaz('Dziś: generator rysuje zamek jak zwykły blok', wyciete(a, cx, cy, cw, ch), 2);
  const b = teren(); budynkiZwykle(b, true); szkielet(b); pokaz('Szkielet z OSM w scenie (to dostaje grafik)', wyciete(b, cx, cy, cw, ch), 2, true, cx, cy);
  const m = nowy(cw, ch); m.px.fill(0xffff00ff); const tmp = nowy(W, H); tmp.px.fill(0xffff00ff); szkielet(tmp); (window as any).__szk = doCanvas(wyciete(tmp, cx, cy, cw, ch)).toDataURL(); pokaz('Szkielet na magencie – wejście dla generatora obrazów', wyciete(tmp, cx, cy, cw, ch), 2);
  (window as any).__ok = true;
};
if (hero.complete) start(); else hero.onload = start;
