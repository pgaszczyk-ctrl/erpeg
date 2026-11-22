/**
 * Difficulty as poses (owner, 22 Nov 2026: „raczkujący, idący, bieg, paker”): five code-drawn pictogram silhouettes
 * on one axis, used instead of the slider in the new-character form and in the in-game difficulty window.
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
  .tr-os { position: relative; display: grid; grid-template-columns: repeat(5, 1fr); margin: 6px 4px 2px; padding: 10px 0 22px;
    touch-action: none; user-select: none; -webkit-user-select: none; cursor: pointer; }
  .tr-os:focus-visible { outline: 2px solid #f7c531; outline-offset: 1px; }
  .tr-tor { position: absolute; left: 4%; right: 4%; bottom: 10px; height: 4px; background: #a77f3c;
    box-shadow: 0 -2px 0 #1e1a24, 0 2px 0 #1e1a24, inset 0 1px 0 #e8cd8c; }
  .tr-tor::after { content: ''; position: absolute; inset: 0; width: var(--pelne, 0%); background: #f7c531; transition: width .25s; }
  .tr-ludzik { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; color: #c9a25a; opacity: .5;
    transition: opacity .2s, color .2s, transform .25s; transform-origin: 50% 100%; }
  .tr-ludzik svg { width: 100%; max-width: 50px; aspect-ratio: 1; display: block; }
  .tr-ludzik span { font: 700 11px/1.1 'Alegreya Sans', sans-serif; white-space: nowrap; margin-top: 1px; }
  .tr-ludzik.tr-za { opacity: .8; }
  .tr-ludzik.tr-wybrany { opacity: 1; color: #ffd75e; transform: scale(1.18); filter: drop-shadow(0 0 6px rgba(255,200,80,.6)); }
  .tr-ludzik:hover { opacity: .85; }
  .tr-znacznik { position: absolute; bottom: 5px; width: 14px; height: 14px; margin-left: -7px; background: #ffd75e; transform: rotate(45deg);
    box-shadow: -2px 0 0 #1e1a24, 2px 0 0 #1e1a24, 0 -2px 0 #1e1a24, 0 2px 0 #1e1a24; transition: left .25s cubic-bezier(.3,1.4,.6,1); }
  .tr-opis { display: block; min-height: 2.4em; margin-top: 8px; }
  .tr-okno .tr-os { margin: 14px 4px 4px; }
  .tr-okno .m-box { max-width: 460px; }
  @media (prefers-reduced-motion: reduce) { .tr-ludzik, .tr-znacznik, .tr-tor::after { transition: none; } }
  `;
  document.head.appendChild(s);
}

const opisPoziomu = (i: number) => WYBOR_TRUDNOSCI.krotko[i] ?? '';

/**
 * One axis (owner, 22 Nov 2026: „zrób jedną oś i niech te ludziki idą”): the five figures march along one brass
 * rail, crawling → muscleman; the chosen one is lit and bigger, a gold marker slides along the rail. Tap a figure,
 * drag along the rail, or use the arrow keys (it is an ARIA slider).
 */
export function kafelkiTrudnosci(start: number, onChange: (i: number) => void, opisId?: string) {
  dodajStyl();
  const n = TRUDNOSCI.length;
  const box = document.createElement('div');
  box.className = 'tr-os';
  box.tabIndex = 0;
  box.setAttribute('role', 'slider');
  box.setAttribute('aria-label', tx('Poziom trudności', 'Difficulty'));
  box.setAttribute('aria-valuemin', '0');
  box.setAttribute('aria-valuemax', String(n - 1));
  if (opisId) box.setAttribute('aria-describedby', opisId);
  const tor = document.createElement('div');
  tor.className = 'tr-tor';
  const znacznik = document.createElement('div');
  znacznik.className = 'tr-znacznik';
  const ludziki = TRUDNOSCI.map((t, i) => {
    const d = document.createElement('div');
    d.className = 'tr-ludzik';
    d.innerHTML = `${pozaSvg(i)}<span></span>`;
    d.querySelector('span')!.textContent = tx(t.nazwa, t.en);
    box.appendChild(d);
    return d;
  });
  box.append(tor, znacznik);
  let wybrany = -1;
  const srodek = (i: number) => ((i + 0.5) / n) * 100;
  const ustaw = (i: number) => {
    i = Math.max(0, Math.min(n - 1, i));
    if (i === wybrany) return;
    wybrany = i;
    ludziki.forEach((d, k) => {
      d.classList.toggle('tr-wybrany', k === i);
      d.classList.toggle('tr-za', k < i);
    });
    znacznik.style.left = `${srodek(i)}%`;
    box.style.setProperty('--pelne', `${((srodek(i) - 4) / 92) * 100}%`);
    box.setAttribute('aria-valuenow', String(i));
    box.setAttribute('aria-valuetext', tx(TRUDNOSCI[i].nazwa, TRUDNOSCI[i].en));
    onChange(i);
  };
  const zPunktu = (x: number) => {
    const r = box.getBoundingClientRect();
    return Math.floor(((x - r.left) / r.width) * n);
  };
  let ciagnie = false;
  box.onpointerdown = (e) => {
    ciagnie = true;
    box.setPointerCapture?.(e.pointerId);
    ustaw(zPunktu(e.clientX));
    box.focus();
  };
  box.onpointermove = (e) => { if (ciagnie) ustaw(zPunktu(e.clientX)); };
  box.onpointerup = box.onpointercancel = () => { ciagnie = false; };
  box.onkeydown = (e) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    const k = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null;
    if (!d && k === null) return;
    e.preventDefault();
    e.stopPropagation();
    ustaw(k ?? wybrany + d);
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
      if (e.key === 'Enter' && document.activeElement?.classList.contains('tr-os')) { e.preventDefault(); ok.click(); }
    };
    panel.append(h, p, kafle.el, opis, ...przyciski);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    kafle.el.focus();
  });
}
