// Porównanie: budynki z OSM jak są / przyciągnięte do 8 kątów / przyciągnięte i zamienione w prostokątne „klocki”,
// plus drzewa w pełnej skali i mniejsze (0,65) gęściej. Zbuduj: npx esbuild demo/porownanie.ts --bundle --format=iife --outfile=demo/porownanie.js
import { nowy, naloz, doCanvas, rng, hash, ciemniej, drzewo, malujPodloze, Rodzaj, runo, budynek, cienBudynku, przyciagnij, Obraz } from '../index';

const W = 480, H = 360;
const R = rng(11);
// ulica pod kątem 33° przez środek, budynki wzdłuż niej (jak w prawdziwym mieście: lekko krzywe, różne kąty)
const ang = (33 * Math.PI) / 180, ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux;
const sx = 40, sy = 60;
const domy: number[][] = [];
for (let i = 0; i < 9; i++) for (const side of [-1, 1]) {
  const t = 30 + i * 52 + R() * 8, off = side * (44 + R() * 10);
  const cx = sx + ux * t + vx * off, cy = sy + uy * t + vy * off;
  const w = 30 + R() * 22, h = 24 + R() * 14, a = ang + (R() - 0.5) * 0.25;
  const co = Math.cos(a), si = Math.sin(a);
  const L = R() < 0.25;
  const pts = L ? [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, 0], [0, 0], [0, h / 2 + 12], [-w / 2, h / 2 + 12]] : [[-w / 2, -h / 2], [w / 2, -h / 2 + (R() - 0.5) * 4], [w / 2 + (R() - 0.5) * 4, h / 2], [-w / 2, h / 2]];
  domy.push(pts.flatMap(([u, v]) => [cx + u * co - v * si, cy + u * si + v * co]));
}
const distUlica = (x: number, y: number) => Math.abs((x - sx) * vx + (y - sy) * vy);
const rodzajW = (x: number, y: number): Rodzaj | null => (x < 0 || y < 0 || x >= W || y >= H ? null : distUlica(x, y) < 12 ? 'bruk' : distUlica(x, y) < 18 ? 'chodnik' : 'trawa');

function scena(tryb: 0 | 1 | 2, skalaDrzew: number, odstep: number): Obraz {
  const o = nowy(W, H);
  const ringi = domy.map((p) => (tryb === 0 ? p : przyciagnij(p, { prostokat: tryb === 2, siatka: 4 })));
  const cien = new Uint8Array(W * H);
  ringi.forEach((p, i) => cienBudynku(p, [8, 12, 16][i % 3], cien, W, H, 0, 0));
  malujPodloze(o, 0, 0, rodzajW, cien);
  for (let y = 4; y < H; y += 3) for (let x = 2; x < W - 2; x += 3) if (rodzajW(x, y) === 'trawa' && hash(x, y, 9) < 0.03) runo(o, x, y, 'trawa_niska', x * 7 + y);
  // drzewa na trawnikach (z dala od domów i ulicy), od góry do dołu
  const inside = (p: number[], x: number, y: number) => { let c = false; const n = p.length / 2; for (let i = 0, j = n - 1; i < n; j = i++) { const ax = p[2 * i], ay = p[2 * i + 1], bx = p[2 * j], by = p[2 * j + 1]; if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) c = !c; } return c; };
  const pos: [number, number][] = []; const rr = rng(4);
  for (let k = 0; k < 4000; k++) { const x = rr() * W, y = 20 + rr() * (H - 20); if (distUlica(x, y) < 30) continue; if (ringi.some((p) => inside(p, x, y) || inside(p, x, y - 20) || inside(p, x + 14, y) || inside(p, x - 14, y))) continue; if (pos.some(([a, b]) => Math.hypot(a - x, (b - y) * 1.3) < odstep)) continue; pos.push([x, y]); }
  pos.sort((a, b) => a[1] - b[1]);
  const items: { y: number; f: () => void }[] = [];
  ringi.forEach((p, i) => { const g = budynek(p, { wysokosc: [8, 12, 16][i % 3], dach: ['dachowka_czerwona', 'dachowka_brazowa', 'lupek', 'gont'][i % 4], sciana: ['tynk_kremowy', 'cegla', 'tynk_zolty', 'kamien'][(i * 3) % 4], seed: i * 13, komin: i % 2 === 0, rura: i % 3 === 0 }); const maxY = Math.max(...p.filter((_, k) => k % 2 === 1)); items.push({ y: maxY, f: () => naloz(o, g.obraz, g.x0, g.y0) }); });
  pos.forEach(([x, y]) => { const gat = ['dab', 'lipa', 'brzoza', 'jablon'][Math.floor(hash(x | 0, y | 0, 2) * 4)]; const d = drzewo(gat, 1000 + Math.floor(hash(x | 0, y | 0, 3) * 3) * 77, skalaDrzew);
    items.push({ y, f: () => { const rx = d.korona.w * 0.42, ry = 6 * skalaDrzew + 3; for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) { if ((i / rx) ** 2 + (j / ry) ** 2 > 1) continue; const xx = (x + i + rx * 0.4) | 0, yy = (y + j - 1) | 0; if (xx >= 0 && yy >= 0 && xx < W && yy < H) o.px[yy * W + xx] = ciemniej(o.px[yy * W + xx]); }
      const ox = (x - d.kotwica[0]) | 0, oy = (y - d.kotwica[1]) | 0; naloz(o, d.pien, ox, oy); naloz(o, d.korona, ox, oy); } }); });
  items.sort((a, b) => a.y - b.y).forEach((it) => it.f());
  return o;
}
const panele: [string, Obraz][] = [
  ['A. Dziś: budynki z OSM jak są, duże drzewa', scena(0, 1, 60)],
  ['B. Drzewa 0,65× i gęściej, budynki jak z OSM', scena(0, 0.65, 34)],
  ['C. Budynki przyciągnięte do 8 kątów (kształt z OSM)', scena(1, 0.65, 34)],
  ['D. Przyciągnięte + prostokątne „klocki” (siatka 4 px)', scena(2, 0.65, 34)],
];
for (const [t, o] of panele) { const d = document.createElement('div'); d.innerHTML = `<h3>${t}</h3>`; const c = doCanvas(o); c.style.width = W * 2 + 'px'; c.style.imageRendering = 'pixelated'; d.appendChild(c); document.body.appendChild(d); }
(window as any).__gotowe = true;
