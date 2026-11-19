import { TEST } from '../version';

const search = new URLSearchParams(location.search);
export const makieta = TEST && ['oryginal', 'rysowana'].includes(search.get('makieta') ?? '');
export const PUNKT_MAKIETY = { lat: 51.25091, lon: 22.57249 };
export const rysowanaMakieta = makieta && search.get('makieta') === 'rysowana';

export function pokazPorownanie() {
  const nav = document.createElement('nav');
  nav.id = 'makieta-porownanie';
  nav.setAttribute('aria-label', 'Porównanie oprawy');
  nav.style.cssText = 'position:fixed;z-index:9;left:50%;bottom:10px;transform:translateX(-50%);display:flex;gap:6px;padding:4px;background:#252820;border:1px solid #887c61;font:14px system-ui;border-radius:4px;white-space:nowrap';
  for (const [id, label] of [['oryginal', 'Obecna oprawa'], ['rysowana', 'Próba rysowana']]) {
    const link = document.createElement('a');
    const url = new URL(location.href);
    url.searchParams.set('makieta', id);
    link.href = url.href;
    link.textContent = label;
    const current = search.get('makieta') === id;
    if (current) link.setAttribute('aria-current', 'page');
    link.style.cssText = `color:${current ? '#252820' : '#f5edd9'};background:${current ? '#d0b784' : 'transparent'};padding:8px 10px;text-decoration:none;border-radius:2px`;
    nav.append(link);
  }
  document.body.append(nav);
}

type Facet = [color: string, ...points: number[]];

function drawSprite(w: number, h: number, facets: Facet[]) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  for (const [color, ...pts] of facets) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    ctx.fill();
  }
  return canvas;
}

/** Three low stones, with a shared contact shadow and a muted vein across the broad central face. */
export function rudaMakiety() {
  return drawSprite(44, 30, [
    ['#4a4b36', 2,22, 5,19, 8,20, 9,23, 4,24],
    ['#c59158', 3,21, 6,19, 8,21, 5,22],
    ['#56523c', 36,17, 40,15, 43,18, 41,21, 37,21],
    ['#dbad71', 37,17, 40,16, 42,18, 39,19],
    ['#554c38', 30,25, 33,22, 38,23, 37,27, 32,28],
    ['#ca9b65', 31,25, 34,23, 37,24, 34,26],
    ['#243a2c66', 1,18, 8,14, 27,14, 35,18, 34,21, 24,23, 8,23],
    ['#353a31', 3,17, 5,12, 9,10, 14,11, 18,16, 15,20, 7,21],
    ['#787b62', 4,16, 7,12, 10,11, 14,12, 16,15, 10,16, 7,19],
    ['#515245', 7,19, 10,16, 16,15, 17,17, 14,19],
    ['#333b32', 22,16, 25,10, 29,9, 33,12, 35,16, 32,20, 24,20],
    ['#838577', 24,15, 26,11, 29,10, 32,12, 33,14, 29,16],
    ['#5b6252', 24,15, 29,16, 33,14, 34,16, 31,19, 26,19],
    ['#353831', 9,13, 12,7, 17,4, 23,4, 28,8, 30,14, 27,19, 20,21, 13,19],
    ['#8e8c75', 10,13, 14,8, 18,5, 22,5, 26,7, 28,11, 22,13, 17,16, 12,16],
    ['#676f5d', 12,15, 17,15, 22,12, 28,10, 29,14, 26,18, 20,20, 14,18],
    ['#625347', 18,7, 20,8, 20,10, 23,12, 22,15, 24,17, 21,19, 20,16, 20,13, 17,10],
    ['#ebbb79', 18,7, 20,8, 20,11, 23,12, 22,14, 23,16, 21,17, 20,14, 20,12, 18,11],
    ['#9da087', 12,12, 16,8, 17,8, 16,10, 13,13],
    ['#66864c', 3,21, 3,17, 5,20, 7,17, 7,21, 14,20, 12,22, 6,23],
    ['#65804e', 25,22, 28,19, 29,22, 31,18, 32,21, 35,20, 33,23],
  ]);
}

/** Street noticeboard drawn at the same pixel density as the existing scenery. */
export function tablicaMakiety() {
  return drawSprite(24, 30, [
    ['#30362b66', 2,27, 9,24, 19,25, 23,28, 19,30, 6,30],
    ['#37392e', 5,8, 8,8, 8,28, 5,28],
    ['#37392e', 16,8, 19,8, 19,28, 16,28],
    ['#7b7056', 6,20, 7,20, 7,27, 6,27],
    ['#7b7056', 17,20, 18,20, 18,27, 17,27],
    ['#34382c', 4,7, 20,7, 20,23, 4,23],
    ['#766a53', 6,8, 18,8, 18,21, 6,21],
    ['#d1bf90', 7,9, 13,9, 13,19, 7,18],
    ['#a8ac8d', 14,11, 17,11, 17,20, 14,19],
    ['#827b62', 8,12, 12,12, 12,13, 8,13],
    ['#9c8a69', 8,15, 11,15, 11,16, 8,16],
    ['#32392f', 1,8, 5,3, 17,2, 22,6, 23,8, 5,9],
    ['#6e7860', 3,7, 6,4, 16,3, 20,6, 18,7],
    ['#9e9d78', 6,4, 16,3, 17,4, 7,5],
  ]);
}

/** A shop canopy and a shopping bag silhouette kept readable at map scale. */
export function szyldSklepuMakiety() {
  return drawSprite(28, 25, [
    ['#37372c', 5,1, 23,1, 27,8, 25,11, 24,24, 4,24, 3,11, 1,8],
    ['#77664a', 5,9, 23,9, 22,22, 6,22],
    ['#cbb995', 7,10, 21,10, 20,20, 8,20],
    ['#5b7059', 6,2, 22,2, 25,8, 23,10, 5,10, 3,8],
    ['#dad0a6', 8,2, 11,2, 10,9, 6,9],
    ['#dad0a6', 16,2, 19,2, 22,9, 17,9],
    ['#544737', 9,14, 19,14, 20,20, 8,20],
    ['#544737', 11,15, 11,12, 13,11, 15,11, 17,12, 17,15, 15,15, 15,13, 13,13, 13,15],
  ]);
}
