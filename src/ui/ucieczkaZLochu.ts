// Ucieczka z lochu (właściciel, 24.11.2026: „po kliknięciu pytanie czy na pewno, jeśli tak – krótka animacja
// biegnącego ludzika i po 5 sekundach wychodzi na powierzchnię; w tym czasie wczytaj mapę”).
// Zasłona HTML nad grą (przetrwa restart sceny): ciemny korytarz z pochodniami przesuwa się w lewo, pikselowy ludzik
// biegnie, na końcu z prawej rośnie światło dnia. Rysowane kodem, bez obrazków.
import { LOCH_TEKSTY } from '../content/lochy';

const INK = '#1e1a24';

/** Pikselowy ludzik 10×16 w jednej z 4 faz biegu (bok, w prawo). */
function ludzik(c: CanvasRenderingContext2D, x: number, y: number, P: number, faza: number) {
  const px = (ix: number, iy: number, w: number, h: number, kolor: string) => { c.fillStyle = kolor; c.fillRect(x + ix * P, y + iy * P, w * P, h * P); };
  const bob = faza % 2 ? 1 : 0;
  const yy = (v: number) => v - bob;
  // Nogi i ręce według fazy (przód / tył).
  const nogi = [[[6, 2], [2, -1]], [[4, 1], [4, 1]], [[2, -1], [6, 2]], [[4, 1], [4, 1]]][faza];
  const rece = [[[1, 0], [7, 0]], [[4, 1], [4, 1]], [[7, 0], [1, 0]], [[4, 1], [4, 1]]][faza];
  // Tylna noga i ręka (ciemniejsze).
  px(nogi[1][0], yy(11), 2, 4 - Math.max(0, nogi[1][1] - 1), '#24324f');
  px(nogi[1][0] + (nogi[1][1] < 0 ? -1 : 0), yy(15 - Math.max(0, nogi[1][1] - 1)), 3, 1, '#3a2617');
  px(rece[1][0], yy(7), 2, 3, '#2c3c61');
  // Tułów.
  px(3, yy(6), 4, 6, INK);
  px(3, yy(6), 4, 5, '#3f5a92');
  px(3, yy(10), 4, 1, '#c9a14a');
  // Przednia noga.
  px(nogi[0][0], yy(11), 2, 4 - Math.max(0, nogi[0][1] - 1), '#34497a');
  px(nogi[0][0] + (nogi[0][1] > 1 ? 1 : 0), yy(15 - Math.max(0, nogi[0][1] - 1)), 3, 1, '#4a311d');
  // Głowa.
  px(3, yy(1), 5, 5, INK);
  px(3, yy(2), 4, 4, '#e8b88f');
  px(3, yy(1), 5, 2, '#4a2f1d');
  px(6, yy(3), 1, 1, INK);
  // Przednia ręka.
  px(rece[0][0], yy(7), 2, 3, '#4d6aa6');
  px(rece[0][0], yy(10), 2, 1, '#e8b88f');
}

export function animacjaUcieczki(ms: number): { zamknij: () => void } {
  const el = document.createElement('div');
  el.id = 'loch-ucieczka';
  el.style.cssText = 'position:fixed;inset:0;z-index:40;background:#07060a;opacity:0;transition:opacity .35s ease;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;touch-action:none';
  const cv = document.createElement('canvas');
  cv.style.cssText = 'image-rendering:pixelated;display:block;max-width:100%';
  const napis = document.createElement('div');
  napis.textContent = LOCH_TEKSTY.uciekaszNapis;
  napis.style.cssText = "margin-top:14px;color:#f3e2b8;font:700 17px/1.2 'Alegreya Sans',system-ui,sans-serif;text-shadow:0 2px 0 #000;letter-spacing:.02em";
  el.append(cv, napis);
  for (const t of ['pointerdown', 'pointerup', 'click', 'touchstart', 'keydown']) el.addEventListener(t, (e) => e.stopPropagation());
  document.body.append(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; });

  const W = Math.min(window.innerWidth - 24, 640);
  const P = Math.max(2, Math.floor(W / 160));
  const cw = Math.floor(W / P) * P, ch = 60 * P;
  cv.width = cw;
  cv.height = ch;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  const ruch = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();
  let raf = 0;

  const klatka = (teraz: number) => {
    const now = Math.max(t0, teraz); // the first frame's timestamp can be earlier than t0
    const t = Math.min(1, (now - t0) / ms);
    const przes = ruch ? (now - t0) * 0.12 * P : 0;
    // Ściana z kamieni (przewija się), sklepienie, podłoga.
    c.fillStyle = '#0d0b10'; c.fillRect(0, 0, cw, ch);
    const cegla = 12 * P;
    for (let rz = 0; rz < 5; rz++) {
      const y = 6 * P + rz * 7 * P;
      const off = ((rz % 2) * cegla) / 2 - (przes % cegla);
      for (let x = off - cegla; x < cw + cegla; x += cegla) {
        c.fillStyle = rz % 2 ? '#3b3d44' : '#45474f';
        c.fillRect(Math.round(x), y, cegla - P, 6 * P);
        c.fillStyle = 'rgba(255,255,255,0.06)';
        c.fillRect(Math.round(x), y, cegla - P, P);
      }
    }
    c.fillStyle = '#24252b'; c.fillRect(0, 41 * P, cw, P);
    for (let x = -(przes * 1.4) % (8 * P); x < cw; x += 8 * P) {
      c.fillStyle = '#2f3036'; c.fillRect(Math.round(x), 42 * P, 7 * P, 18 * P);
      c.fillStyle = '#25262b'; c.fillRect(Math.round(x), 42 * P, 7 * P, P);
    }
    // Pochodnie co kawałek, z ciepłą poświatą.
    const coP = 90 * P;
    for (let x = -(przes % coP) + 40 * P; x < cw + 20 * P; x += coP) {
      const g = c.createRadialGradient(x, 16 * P, 0, x, 16 * P, 30 * P);
      g.addColorStop(0, 'rgba(255,170,80,0.45)');
      g.addColorStop(1, 'rgba(255,120,40,0)');
      c.fillStyle = g; c.fillRect(x - 30 * P, 0, 60 * P, ch);
      c.fillStyle = INK; c.fillRect(x - P, 15 * P, 2 * P, 6 * P);
      c.fillStyle = '#6b4a2a'; c.fillRect(x - P, 16 * P, 2 * P, 5 * P);
      const m = ruch && Math.sin(now / 60 + x) > 0 ? P : 0;
      c.fillStyle = '#ff9a2e'; c.fillRect(x - P, 11 * P - m, 2 * P, 4 * P + m);
      c.fillStyle = '#ffe08a'; c.fillRect(x - P / 2, 12 * P, P, 2 * P);
    }
    // Światło dnia z prawej – rośnie pod koniec.
    const dzien = Math.max(0, (t - 0.45) / 0.55);
    if (dzien > 0) {
      const g = c.createLinearGradient(cw, 0, cw - cw * (0.25 + 0.6 * dzien), 0);
      g.addColorStop(0, `rgba(255,248,220,${0.85 * dzien})`);
      g.addColorStop(1, 'rgba(255,248,220,0)');
      c.fillStyle = g; c.fillRect(0, 0, cw, ch);
    }
    // Ludzik i kurz spod butów.
    const faza = ruch ? Math.floor((now - t0) / 95) % 4 : 0;
    const lx = Math.round(cw * 0.32 / P) * P, ly = 26 * P;
    if (ruch) for (let i = 0; i < 3; i++) {
      const a = ((now - t0) / 300 + i / 3) % 1;
      c.fillStyle = `rgba(150,140,125,${0.5 * (1 - a)})`;
      c.fillRect(lx - Math.round(a * 14) * P, ly + 15 * P - Math.round(a * 3) * P, 2 * P, 2 * P);
    }
    ludzik(c, lx, ly, P, faza);
    if (ruch) raf = requestAnimationFrame(klatka);
  };
  raf = requestAnimationFrame(klatka);

  return {
    zamknij: () => {
      cancelAnimationFrame(raf);
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 400);
    },
  };
}
