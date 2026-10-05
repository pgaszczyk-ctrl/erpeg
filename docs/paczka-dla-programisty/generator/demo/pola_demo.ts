import { nowy, doCanvas, Obraz, malujPodloze, posiejRuno, runo, pasyPola, malujPas, Uprawa, DoZebrania } from '/home/claude/erpeg/docs/paczka-dla-programisty/generator/index';
const W = 1200, H = 760;
const kolejnosc: Uprawa[] = ['marchewka', 'zboze', 'kapusta', 'ziemniak', 'kukurydza', 'brokul', 'rzepak', 'dynia', 'burak', 'salata', 'chmiel', 'slonecznik'];
function scena(m: number): [Obraz, DoZebrania[]] {
  const o = nowy(W, H);
  malujPodloze(o, 0, 0, (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? null : 'trawa'));
  for (const q of posiejRuno(0, 0, W, H, () => 'trawa')) runo(o, q.x, q.y, q.rodzaj, q.seed);
  const zb: DoZebrania[] = []; let i = 0;
  for (const [pole, seed] of [[[20, 20, 600, 10, 610, 740, 30, 750], 4242], [[640, 60, 1180, 20, 1190, 300, 650, 340], 77], [[650, 380, 1190, 340, 1180, 740, 660, 750], 991]] as [number[], number][])
    for (const p of pasyPola(pole, seed)) zb.push(...malujPas(o, p, kolejnosc[i++ % kolejnosc.length], m, 0, 0, 1));
  return [o, zb];
}
const sprite = document.getElementById('hero') as HTMLImageElement;
function pokaz(t: string, m: number, k: number, oznacz: boolean, crop?: [number, number, number, number]) {
  const [o, zb] = scena(m);
  const c = doCanvas(o); const x = c.getContext('2d')!;
  let out = c;
  if (crop) { const cc = document.createElement('canvas'); cc.width = crop[2]; cc.height = crop[3]; cc.getContext('2d')!.drawImage(c, -crop[0], -crop[1]); out = cc; }
  const big = document.createElement('canvas'); big.width = out.width * k; big.height = out.height * k; const g = big.getContext('2d')!; g.imageSmoothingEnabled = false; g.drawImage(out, 0, 0, big.width, big.height);
  const ox = crop ? crop[0] : 0, oy = crop ? crop[1] : 0;
  if (oznacz) { g.strokeStyle = '#ffe14a'; g.lineWidth = 2; for (const z of zb) { g.beginPath(); g.arc((z.x - ox + 0.5) * k, (z.y - oy) * k, 5 * k, 0, 6.283); g.stroke(); } }
  // bohater dla skali (siatka 32 → 48 px świata)
  const hx = crop ? crop[2] * 0.5 : 250, hy = crop ? crop[3] * 0.55 : 230; g.drawImage(sprite, 32, 0, 32, 32, (hx - 24) * k, (hy - 46) * k, 48 * k, 48 * k);
  const d = document.createElement('div'); d.innerHTML = `<h3>${t} – do zebrania: ${zb.length}</h3>`; d.appendChild(big); document.body.appendChild(d);
}
const start = () => {
  pokaz('Październik', 9, 1, false);
  pokaz('Lipiec', 6, 1, false);
  pokaz('Maj', 4, 1, false);
  pokaz('Październik, zbliżenie, dojrzałe do zebrania zaznaczone', 9, 3, true, [440, 40, 330, 200]);
  (window as any).__ok = true;
};
if (sprite.complete) start(); else sprite.onload = start;
