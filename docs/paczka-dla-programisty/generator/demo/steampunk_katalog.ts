import { nowy, naloz, doCanvas, malujPodloze, budynek, para, OZDOBY_STEAMPUNK } from '/home/claude/erpeg/docs/paczka-dla-programisty/generator/index';
const kol = 5, cw = 118, ch = 104, Wd = kol * cw, Hd = Math.ceil(OZDOBY_STEAMPUNK.length / kol) * ch;
const o = nowy(Wd, Hd); malujPodloze(o, 0, 0, (x, y) => (x < 0 || y < 0 || x >= Wd || y >= Hd ? null : 'plac'));
const kl = [16, 24, 32].map((r) => para(r, 1));
OZDOBY_STEAMPUNK.forEach((n, i) => {
  const ox = (i % kol) * cw + 26, oy = Math.floor(i / kol) * ch + 34;
  const r = [0, 0, 60, 0, 60, 34, 0, 34].map((v, q) => v + (q % 2 ? oy : ox));
  const b = budynek(r, { wysokosc: 12, dach: 'lupek', sciana: 'tynk_kremowy', seed: 50 + i * 7, ozdoby: [n] });
  naloz(o, b.obraz, b.x0, b.y0);
  b.para.forEach(([x, y, rr]) => naloz(o, kl[rr === 16 ? 0 : rr === 24 ? 1 : 2], Math.round(x - rr / 2), Math.round(y - rr)));
});
const k = 3, c = doCanvas(o), big = document.createElement('canvas'); big.width = Wd * k; big.height = Hd * k; const g = big.getContext('2d')!; g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, big.width, big.height);
g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.lineWidth = 6;
OZDOBY_STEAMPUNK.forEach((n, i) => { const x = ((i % kol) * cw + cw / 2) * k, y = (Math.floor(i / kol) * ch + ch - 6) * k; const t = n.replace(/_/g, ' '); g.strokeStyle = '#1e1a24'; g.strokeText(t, x, y); g.fillStyle = '#fff3c8'; g.fillText(t, x, y); });
document.body.appendChild(big); (window as any).__ok = true;
