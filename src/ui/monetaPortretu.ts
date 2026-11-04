// The coin (owner, 26 Oct 2026): while the character has no account, every few minutes the HUD portrait turns like a
// coin with three sides – the game's logo, then „nie zalogowano – uważaj, żeby nie zgubić kodu”, the logo again, and
// back to the hero. Drawn as an overlay over whichever portrait is on screen (the telescope's or the boiler's), with
// a readable note beside it; a tap on the note opens the Kufer (the code lives there).

const CO_MS = 3 * 60 * 1000;
const PIERWSZA_MS = 45 * 1000;
const OBROT_MS = 170;

const CSS = `
.moneta-portretu { position: fixed; z-index: 8; border-radius: 50%; overflow: hidden; pointer-events: none; background: #3a2c22;
  transition: transform ${OBROT_MS}ms ease-in; transform: scaleX(1); box-shadow: 0 0 0 1px rgba(30,20,10,0.6); }
.moneta-portretu.krawedz { transform: scaleX(0.03); }
.moneta-portretu canvas, .moneta-portretu img { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated; }
.moneta-portretu img { image-rendering: auto; }
.moneta-portretu .ostrz { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: radial-gradient(circle at 50% 35%, #6a2c1e, #23120d); color: #ffd9a0; text-align: center;
  font: 800 var(--mf, 7px)/1.05 'Alegreya Sans', sans-serif; }
.moneta-portretu .ostrz b { font-size: calc(var(--mf, 7px) * 2); line-height: 1; color: #ffcf5a; }
.moneta-napis { position: fixed; z-index: 8; width: max-content; max-width: min(240px, 70vw); padding: 6px 10px; border-radius: 8px;
  font: 700 14px/1.25 'Alegreya Sans', sans-serif; color: #fff2d0; text-align: left; cursor: pointer; border: 0;
  background: linear-gradient(180deg, #3a2a20, #1d1411); box-shadow: 0 0 0 1px #2a1a0c, 0 0 0 2px #c9953f, 0 2px 6px rgba(0,0,0,0.5);
  opacity: 0; transition: opacity 0.3s; pointer-events: none; }
.moneta-napis.on { opacity: 1; pointer-events: auto; }
@media (prefers-reduced-motion: reduce) { .moneta-portretu { transition: none; } }
`;

export interface MonetaObsluga {
  /** Turn now? (no account, not in the demo, no fight/dialog in the way) */
  pokazuj(): boolean;
  /** The portrait's face on screen and a copy of its picture. */
  twarz(): { rect: DOMRect; twarz: HTMLCanvasElement | null; prawo?: number } | null;
  /** The note was tapped. */
  otworz(): void;
}

let timer = 0;
let kroki: number[] = [];
let raf = 0;
let obsl: MonetaObsluga | null = null;

export function obracajMonete(o: MonetaObsluga) {
  zatrzymajMonete();
  obsl = o;
  if (!document.getElementById('moneta-css')) {
    const st = document.createElement('style');
    st.id = 'moneta-css';
    st.textContent = CSS;
    document.head.append(st);
  }
  const kolejna = (ms: number) => {
    timer = window.setTimeout(() => {
      if (obsl?.pokazuj()) obrocMonete();
      kolejna(CO_MS);
    }, ms);
  };
  kolejna(PIERWSZA_MS);
  (window as unknown as { __moneta?: () => void }).__moneta = obrocMonete;
}

export function zatrzymajMonete() {
  window.clearTimeout(timer);
  timer = 0;
  kroki.forEach((t) => window.clearTimeout(t));
  kroki = [];
  cancelAnimationFrame(raf);
  document.querySelectorAll('.moneta-portretu, .moneta-napis').forEach((e) => e.remove());
}

/** One turn of the coin. */
export function obrocMonete() {
  const t0 = obsl?.twarz();
  if (!obsl || !t0 || document.querySelector('.moneta-portretu')) return;
  const m = document.createElement('div');
  m.className = 'moneta-portretu';
  const twarz = t0.twarz ?? document.createElement('canvas');
  const logo = document.createElement('img');
  logo.src = `${import.meta.env.BASE_URL}logo-256.png`;
  logo.alt = '';
  const ostrz = document.createElement('div');
  ostrz.className = 'ostrz';
  ostrz.innerHTML = '<b>!</b>nie<br>zalogo-<br>wano';
  m.append(twarz);
  const napis = document.createElement('button');
  napis.type = 'button';
  napis.className = 'moneta-napis';
  napis.textContent = 'Nie zalogowano – uważaj, żeby nie zgubić kodu!';
  napis.addEventListener('pointerdown', (e) => e.stopPropagation());
  napis.addEventListener('click', (e) => { e.stopPropagation(); obsl?.otworz(); });
  document.body.append(m, napis);
  // Follow the portrait (the column folds out, the window turns…).
  const ustaw = () => {
    const t = obsl?.twarz();
    if (!t) { m.style.visibility = napis.style.visibility = 'hidden'; }
    else {
      const r = t.rect;
      m.style.visibility = napis.style.visibility = '';
      Object.assign(m.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
      m.style.setProperty('--mf', `${Math.max(5, r.width * 0.2)}px`);
      const nw = napis.offsetWidth, nh = napis.offsetHeight;
      const x = (t.prawo ?? r.right) + 10;
      if (x + nw < innerWidth && r.top < innerHeight / 2) {
        Object.assign(napis.style, { left: `${x}px`, top: `${r.top + r.height / 2 - nh / 2}px` });
      } else {
        Object.assign(napis.style, { left: `${Math.max(8, Math.min(innerWidth - nw - 8, r.left + r.width / 2 - nw / 2))}px`, top: `${r.top - nh - 10}px` });
      }
    }
    raf = requestAnimationFrame(ustaw);
  };
  ustaw();
  const strony: [HTMLElement, number][] = [[logo, 1300], [ostrz, 4200], [logo, 1300], [twarz, 300]];
  let t = 300;
  strony.forEach(([strona, trwa], i) => {
    kroki.push(window.setTimeout(() => m.classList.add('krawedz'), t));
    kroki.push(window.setTimeout(() => {
      m.replaceChildren(strona);
      m.classList.remove('krawedz');
      napis.classList.toggle('on', strona === ostrz);
    }, t + OBROT_MS));
    t += OBROT_MS * 2 + trwa;
    if (i === strony.length - 1) kroki.push(window.setTimeout(() => {
      cancelAnimationFrame(raf);
      m.remove();
      napis.remove();
      kroki = [];
    }, t));
  });
}
