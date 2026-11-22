/**
 * Difficulty as poses (owner, 22 Nov 2026: „raczkujący, idący, bieg, paker”): five code-drawn pictogram silhouettes
 * on brass plates, used instead of the slider in the new-character form and in the in-game difficulty window.
 * Placeholders like road-sign pictograms until the artist draws them.
 */
import { TRUDNOSCI, WYBOR_TRUDNOSCI } from '../content/trudnosc';
import { tx } from '../i18n';

const S = (d: string, w = 5) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const G = (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor"/>`;

/** 48×48 pictograms, ground at y 44, facing right. */
const POZY: string[] = [
  // Raczkujący maluch: big head, on hands and knees.
  G(35, 23, 5.5) + S('M13 29 L28 28', 8) + S('M27 30 L29 43', 4.5) + S('M14 30 L15 42 L6 42', 5),
  // Pierwsze kroki: chubby toddler, arms up for balance, legs wide.
  G(24, 12, 5.5) + S('M24 19 L24 30', 8) + S('M23 22 L16 15 M25 22 L32 15', 4.5) + S('M23 30 L18 43 M25 30 L30 43', 5),
  // Idzie spokojnie.
  G(24, 8, 4.5) + S('M24 14 L23 28', 6) + S('M24 17 L29 22 L31 27 M24 17 L19 23 L18 28', 3.5) + S('M23 28 L27 35 L30 43 M23 28 L20 36 L17 43', 5),
  // Biegnie: leaning forward, long stride.
  G(30, 8, 4.5) + S('M28 14 L21 26', 6) + S('M27 17 L33 22 L37 17 M27 17 L20 20 L16 25', 4) + S('M21 26 L30 30 L31 39 M21 26 L15 34 L6 34', 5),
  // Paker: wide shoulders, double biceps.
  G(24, 8, 4.5) +
    '<path d="M13 15 L35 15 L29 31 L19 31 Z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
    S('M14 16 L7 17 L8 7 M34 16 L41 17 L40 7', 5) + G(10, 13, 3.6) + G(38, 13, 3.6) +
    S('M21 31 L17 43 M27 31 L31 43', 6),
];

export function pozaSvg(i: number) {
  return `<svg viewBox="0 0 48 48" aria-hidden="true">${POZY[i] ?? ''}</svg>`;
}

let styl = false;
function dodajStyl() {
  if (styl) return;
  styl = true;
  const s = document.createElement('style');
  s.textContent = `
  .tr-kafle { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin: 4px 0 2px; }
  .tr-kafel { all: unset; box-sizing: border-box; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 2px;
    padding: 4px 2px 3px; color: #2a1d10; background: linear-gradient(#c9a25a, #a77f3c); opacity: .55;
    box-shadow: -2px 0 0 #1e1a24, 2px 0 0 #1e1a24, 0 -2px 0 #1e1a24, 0 2px 0 #1e1a24, inset 2px 2px 0 #e8cd8c, inset -2px -2px 0 #6e4e22; }
  .tr-kafel svg { width: 100%; max-width: 56px; aspect-ratio: 1; display: block; }
  .tr-kafel span { font: 700 11px/1.1 'Alegreya Sans', sans-serif; text-align: center; white-space: nowrap; }
  .tr-kafel:hover { opacity: .8; }
  .tr-kafel:focus-visible { outline: 2px solid #f7c531; outline-offset: 3px; }
  .tr-kafel[aria-checked="true"] { opacity: 1; color: #1e1a24; background: linear-gradient(#ffe08a, #e0ac3e);
    box-shadow: -2px 0 0 #1e1a24, 2px 0 0 #1e1a24, 0 -2px 0 #1e1a24, 0 2px 0 #1e1a24, inset 2px 2px 0 #fff3c4, inset -2px -2px 0 #9a6b1c, 0 0 12px 2px rgba(255, 200, 80, .7); }
  .tr-opis { display: block; min-height: 2.4em; margin-top: 4px; }
  .tr-okno .tr-kafle { margin: 10px 0 4px; }
  .tr-okno .m-box { max-width: 460px; }
  `;
  document.head.appendChild(s);
}

const opisPoziomu = (i: number) => WYBOR_TRUDNOSCI.krotko[i] ?? '';

/** Five plates as a radio group; `onChange` gets the index. Arrow keys move the choice. */
export function kafelkiTrudnosci(start: number, onChange: (i: number) => void, opisId?: string) {
  dodajStyl();
  const box = document.createElement('div');
  box.className = 'tr-kafle';
  box.setAttribute('role', 'radiogroup');
  box.setAttribute('aria-label', tx('Poziom trudności', 'Difficulty'));
  if (opisId) box.setAttribute('aria-describedby', opisId);
  let wybrany = start;
  const kafle = TRUDNOSCI.map((t, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tr-kafel';
    b.setAttribute('role', 'radio');
    b.innerHTML = `${pozaSvg(i)}<span></span>`;
    b.querySelector('span')!.textContent = tx(t.nazwa, t.en);
    b.title = `${tx(t.nazwa, t.en)} – ${opisPoziomu(i)}`;
    b.onclick = () => ustaw(i, true);
    box.appendChild(b);
    return b;
  });
  const ustaw = (i: number, fokus = false) => {
    wybrany = Math.max(0, Math.min(TRUDNOSCI.length - 1, i));
    kafle.forEach((b, k) => {
      b.setAttribute('aria-checked', String(k === wybrany));
      b.tabIndex = k === wybrany ? 0 : -1;
    });
    if (fokus) kafle[wybrany].focus();
    onChange(wybrany);
  };
  box.onkeydown = (e) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    e.stopPropagation();
    ustaw(wybrany + d, true);
  };
  ustaw(start);
  return { el: box, wybrany: () => wybrany };
}

/** One short line under the plates. */
export function opisKafla(i: number) {
  return opisPoziomu(i);
}

/**
 * The in-game window (after the demo's wake-up, and in the game menu). Resolves with the chosen index, or -1 when
 * cancelled. `.m-screen` keeps game keys away and stops UIScene's unstick from resuming the world under it.
 */
export function oknoTrudnosci(o: { tekst: string; teraz: number; pierwszy: boolean }): Promise<number> {
  dodajStyl();
  return new Promise((done) => {
    const W = WYBOR_TRUDNOSCI;
    const overlay = document.createElement('div');
    overlay.className = 'm-screen tr-okno';
    const panel = document.createElement('div');
    panel.className = 'm-box';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    const h = document.createElement('h2');
    h.textContent = W.tytul;
    const p = document.createElement('p');
    p.textContent = o.tekst;
    const opis = document.createElement('small');
    opis.className = 'tr-opis';
    opis.id = 'tr-okno-opis';
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'm-btn m-primary';
    const kafle = kafelkiTrudnosci(o.teraz, (i) => {
      opis.textContent = `${TRUDNOSCI[i].nazwa}: ${opisKafla(i)}`;
      ok.textContent = i === o.teraz ? (o.pierwszy ? `Zostaję przy: ${TRUDNOSCI[i].nazwa}` : 'Bez zmian') : `Wybieram: ${TRUDNOSCI[i].nazwa}`;
    }, opis.id);
    const koniec = (i: number) => {
      overlay.remove();
      done(i);
    };
    ok.onclick = () => koniec(kafle.wybrany());
    const przyciski = [ok];
    if (!o.pierwszy) {
      const anuluj = document.createElement('button');
      anuluj.type = 'button';
      anuluj.className = 'm-btn';
      anuluj.textContent = 'Anuluj';
      anuluj.onclick = () => koniec(-1);
      przyciski.push(anuluj);
    }
    overlay.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); koniec(o.pierwszy ? o.teraz : -1); }
      if (e.key === 'Enter' && document.activeElement?.classList.contains('tr-kafel')) { e.preventDefault(); ok.click(); }
    };
    panel.append(h, p, kafle.el, opis, ...przyciski);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    (panel.querySelector<HTMLElement>('.tr-kafel[aria-checked="true"]') ?? ok).focus();
  });
}
