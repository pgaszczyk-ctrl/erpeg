// Upright phone in landscape-only play (owner, 27 Oct 2026: „zamiast kazać obrócić telefon po prostu odpalaj grę
// horyzontalnie, gracz zauważy że nie może grać w pionie”): the whole page is turned −90° and laid out as if the
// screen were wide, so the player sees the game sideways and turns the phone (top to the left – the usual landscape).
// While turned, window.innerWidth/innerHeight answer the turned size (layout code keeps working) and `naEkranie`
// maps a touch's clientX/Y back into the turned page. CSS media queries (orientation, max-width) still see the
// upright screen – a small price, the player turns the phone anyway.

let obrocone = false;

function getter(name: 'innerWidth' | 'innerHeight'): () => number {
  let o: object | null = window;
  while (o) {
    const d = Object.getOwnPropertyDescriptor(o, name);
    if (d?.get) return () => d.get!.call(window) as number;
    if (d && 'value' in d) break;
    o = Object.getPrototypeOf(o);
  }
  return () => (name === 'innerWidth' ? document.documentElement.clientWidth : document.documentElement.clientHeight);
}
const prawdziweW = getter('innerWidth');
const prawdziweH = getter('innerHeight');

let podmienione = false;
function podmien() {
  if (podmienione) return;
  podmienione = true;
  try {
    Object.defineProperty(window, 'innerWidth', { configurable: true, get: () => (obrocone ? prawdziweH() : prawdziweW()) });
    Object.defineProperty(window, 'innerHeight', { configurable: true, get: () => (obrocone ? prawdziweW() : prawdziweH()) });
  } catch {
    /* the browser won't let us – layout code reads the upright size then */
  }
}

const CSS = `
html.exp-obrot{overflow:hidden}
html.exp-obrot body{position:fixed;left:0;top:0;margin:0;width:var(--obr-w);height:var(--obr-h);transform-origin:0 0;transform:translateY(var(--obr-w)) rotate(-90deg)}
html.exp-obrot #game{width:100%;height:100%}
`;

export const jestObrocone = () => obrocone;

/** Turns the page (true) or puts it back (false); fires a resize so the game and HUD lay themselves out again. */
export function ustawObrot(tak: boolean) {
  podmien();
  if (!document.getElementById('obrot-css')) {
    const s = document.createElement('style');
    s.id = 'obrot-css';
    s.textContent = CSS;
    document.head.append(s);
  }
  const root = document.documentElement;
  if (tak) {
    root.style.setProperty('--obr-w', `${prawdziweH()}px`);
    root.style.setProperty('--obr-h', `${prawdziweW()}px`);
  }
  if (tak === obrocone) return;
  obrocone = tak;
  root.classList.toggle('exp-obrot', tak);
  window.dispatchEvent(new Event('resize'));
}

/** Upright screen size (not the turned one). */
export const ekranPionowo = () => prawdziweH() > prawdziweW();

/** A touch/mouse point (clientX/Y) in the page's own coordinates – turned back while the page is turned. */
export function naEkranie(x: number, y: number): { x: number; y: number } {
  if (!obrocone) return { x, y };
  return { x: prawdziweH() - y, y: x };
}
