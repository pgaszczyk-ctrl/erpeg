import { SKORY_51, WLOSY_51, type Plec } from '../content/wygladPostaci';
import { fryzura, losowyWyglad } from './postacEdytor';

const KLATKI = 10;
const OKRES = 2600;
// Kadrowanie wolnego miejsca z klatki zaprojektowanej dla mapy i wyposażenia.
const GORNY_MARGINES = 18;
const DOLNY_MARGINES = 8;

interface Klatka {
  id: number;
  w: number;
  h: number;
  px: ArrayBuffer;
}

export function podgladRekruta() {
  const el = document.createElement('canvas');
  el.className = 'm-rekrut';
  el.setAttribute('aria-hidden', 'true');
  const ctx = el.getContext('2d')!;
  const wyglady = { k: losowyWyglad('k'), m: losowyWyglad('m') };
  const bezRuchu = matchMedia('(prefers-reduced-motion: reduce)');
  let worker: Worker | undefined;
  let animacja = 0;

  const ustaw = (plec: Plec) => {
    worker?.terminate();
    cancelAnimationFrame(animacja);
    const w = wyglady[plec];
    const o = {
      styl: 'A', plec, fryz: fryzura(plec, w.f).chibi,
      kolory: {
        skora: SKORY_51[w.s].hex, wlosy: WLOSY_51[w.w].hex,
        mundur: '#293552', spodnie: '#554031',
      },
      helm: 1, helmTyp: 'kaszkiet', mankiet: 1, dol: 1, oddechMenu: true,
    };
    const renderer = new Worker(new URL('../chibi/chibi.worker.ts', import.meta.url), { type: 'module' });
    worker = renderer;
    const klatki: ImageData[] = [];
    const rysuj = (klatka: ImageData) => {
      if (el.width !== klatka.width) el.width = klatka.width;
      const wysokosc = klatka.height - GORNY_MARGINES - DOLNY_MARGINES;
      if (el.height !== wysokosc) el.height = wysokosc;
      ctx.putImageData(klatka, 0, -GORNY_MARGINES);
    };
    renderer.onmessage = ({ data }: MessageEvent<Klatka>) => {
      if (worker !== renderer || !el.isConnected) {
        renderer.terminate();
        return;
      }
      const { id, w, h, px } = data;
      klatki[id] = new ImageData(new Uint8ClampedArray(px), w, h);
      if (id === 0) rysuj(klatki[0]);
      if (id < KLATKI - 1) return;
      renderer.terminate();
      worker = undefined;
      let ostatnia = 0;
      const start = performance.now();
      const krok = (teraz: number) => {
        if (!el.isConnected) return;
        const i = bezRuchu.matches ? 0 : Math.floor(((teraz - start) % OKRES) / OKRES * KLATKI);
        if (i !== ostatnia) rysuj(klatki[i]);
        ostatnia = i;
        animacja = requestAnimationFrame(krok);
      };
      animacja = requestAnimationFrame(krok);
    };
    renderer.onerror = () => renderer.terminate();
    for (let id = 0; id < KLATKI; id++) {
      renderer.postMessage({ id, o, yaw: 0.18, faza: id / KLATKI, H: 44 });
    }
  };
  ustaw('k');
  return { el, ustaw, wyglad: (plec: Plec) => wyglady[plec] };
}
