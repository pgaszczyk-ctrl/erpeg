/**
 * Difficulty as poses (owner, 22 Nov 2026: „raczkujący, idący, bieg, paker”): five silhouettes
 * on one axis, used instead of the slider in the new-character form and in the in-game difficulty window.
 * The silhouettes are cut from the owner's mock-up by scripts/trudnosc-pozy.py; colour comes from CSS masks.
 */
import { TRUDNOSCI, WYBOR_TRUDNOSCI } from '../content/trudnosc';
import { tx } from '../i18n';
import { naEkranie } from '../obrot';

/** Width/height of the cut masks public/ui/trudnosc/poza_<n>.png (scripts/trudnosc-pozy.py). */
const PROPORCJE = [99 / 160, 104 / 160, 121 / 160, 138 / 160, 117 / 160];

let styl = false;
function dodajStyl() {
  if (styl) return;
  styl = true;
  const s = document.createElement('style');
  const url = (i: number) => `url("${import.meta.env.BASE_URL}ui/trudnosc/poza_${i}.png")`;
  s.textContent = `
  .tr-os { position: relative; margin: 6px 0 2px; touch-action: none; user-select: none; -webkit-user-select: none; cursor: pointer;
    background: #0f0c08; border: 2px solid #b8893c; border-radius: 6px;
    box-shadow: 0 0 0 2px #1e1a24, inset 0 0 0 1px #5a3b14; }
  .tr-os:focus-visible { outline: 2px solid #f7c531; outline-offset: 3px; }
  .tr-scena { position: relative; display: grid; grid-template-columns: repeat(5, 1fr); align-items: end; height: 0; padding-bottom: 27%;
    background: radial-gradient(ellipse at 50% 100%, #46230c, #2a1408 70%); border-radius: 4px 4px 0 0; border-bottom: 2px solid #d9a441; }
  .tr-ludzik { position: absolute; bottom: 0; height: 82%; aspect-ratio: var(--ar); transform: translateX(-50%); transform-origin: 50% 100%;
    background: #a8803f; -webkit-mask: var(--m) no-repeat bottom / contain; mask: var(--m) no-repeat bottom / contain;
    transition: background-color .2s, filter .2s, transform .25s; }
  .tr-ludzik.tr-za { background: #b88d45; }
  .tr-ludzik.tr-wybrany { background: #ffcf4a; filter: drop-shadow(0 0 7px rgba(255, 196, 60, .85)); transform: translateX(-50%) scale(1.06); }
  .tr-blask { position: absolute; bottom: 0; width: 22%; height: 100%; transform: translateX(-50%); pointer-events: none;
    background: radial-gradient(ellipse at 50% 60%, rgba(255, 170, 40, .28), transparent 65%); transition: left .25s; }
  .tr-dol { position: relative; height: 34px; }
  .tr-tor { position: absolute; left: 8%; right: 8%; top: 15px; height: 3px; background: #6b4a1c; border-radius: 2px; }
  .tr-tor::before, .tr-tor::after { content: ''; position: absolute; top: -3px; width: 7px; height: 7px; background: #c9953e; transform: rotate(45deg); }
  .tr-tor::before { left: -9px; } .tr-tor::after { right: -9px; }
  .tr-pelne { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(#ffe08a, #d9a030); border-radius: 2px;
    box-shadow: 0 0 6px rgba(255, 190, 60, .6); transition: width .25s; }
  .tr-znacznik { position: absolute; top: 7px; width: 16px; height: 16px; margin-left: -8px; transform: rotate(45deg);
    background: linear-gradient(135deg, #fff1b8, #f2b632 55%, #b77a17); border: 1px solid #6b4a12;
    box-shadow: 0 0 10px 2px rgba(255, 200, 70, .7); transition: left .25s cubic-bezier(.3, 1.4, .6, 1); }
  .tr-opis { display: block; min-height: 2.4em; margin-top: 8px; }
  .tr-okno .tr-os { margin: 14px 0 4px; width: 100%; box-sizing: border-box; }
  .tr-okno .m-box { max-width: 480px; }
  .tr-okno.tr-niskie .m-box { max-width: 560px; padding-top: 10px; padding-bottom: 10px; overflow-y: auto; }
  .tr-okno.tr-niskie h2 { margin: 0 0 2px; font-size: 18px; }
  .tr-okno.tr-niskie p { margin: 0; font-size: 13px; }
  .tr-okno.tr-niskie .tr-os { margin: 8px auto 2px; width: 100%; max-width: 360px; align-self: center; }
  .tr-okno.tr-niskie .tr-opis { min-height: 0; margin-top: 4px; }
  .tr-okno.tr-niskie .tr-przyciski { display: flex; gap: 8px; margin-top: 6px; }
  .tr-okno.tr-niskie .tr-przyciski .m-btn { flex: 1; margin: 0; padding-top: 8px; padding-bottom: 8px; }
  @media (prefers-reduced-motion: reduce) { .tr-ludzik, .tr-znacznik, .tr-pelne, .tr-blask { transition: none; } }
  ${[0, 1, 2, 3, 4].map((i) => `.tr-ludzik.tr-p${i} { --m: ${url(i)}; --ar: ${PROPORCJE[i]}; }`).join('\n  ')}
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
  const warianty = [0, 2, 4];
  const n = warianty.length;
  const box = document.createElement('div');
  box.className = 'tr-os';
  box.tabIndex = 0;
  box.setAttribute('role', 'slider');
  box.setAttribute('aria-label', tx('Poziom trudności', 'Difficulty'));
  box.setAttribute('aria-valuemin', '0');
  box.setAttribute('aria-valuemax', String(n - 1));
  if (opisId) box.setAttribute('aria-describedby', opisId);
  const scena = document.createElement('div');
  scena.className = 'tr-scena';
  const blask = document.createElement('div');
  blask.className = 'tr-blask';
  scena.appendChild(blask);
  const ludziki = warianty.map((id, i) => {
    const t = TRUDNOSCI[id];
    const d = document.createElement('div');
    d.className = `tr-ludzik tr-p${id}`;
    d.style.left = `${((i + 0.5) / n) * 100}%`;
    d.title = tx(t.nazwa, t.en);
    scena.appendChild(d);
    return d;
  });
  const dol = document.createElement('div');
  dol.className = 'tr-dol';
  const tor = document.createElement('div');
  tor.className = 'tr-tor';
  const pelne = document.createElement('div');
  pelne.className = 'tr-pelne';
  tor.appendChild(pelne);
  const znacznik = document.createElement('div');
  znacznik.className = 'tr-znacznik';
  dol.append(tor, znacznik);
  box.append(scena, dol);
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
    // the rail spans 8 %…92 % of the width; the marker sits under the figure
    znacznik.style.left = `${srodek(i)}%`;
    blask.style.left = `${srodek(i)}%`;
    pelne.style.width = `${Math.max(0, ((srodek(i) - 8) / 84) * 100)}%`;
    box.setAttribute('aria-valuenow', String(i));
    box.setAttribute('aria-valuetext', tx(TRUDNOSCI[warianty[i]].nazwa, TRUDNOSCI[warianty[i]].en));
    onChange(warianty[i]);
  };
  // On an upright phone in live mode the whole page is turned (obrot.ts): map the touch and the box's corners back.
  const zPunktu = (cx: number, cy: number) => {
    const r = box.getBoundingClientRect();
    const p = naEkranie(cx, cy), a = naEkranie(r.left, r.top), b = naEkranie(r.right, r.bottom);
    const lewo = Math.min(a.x, b.x), szer = Math.abs(b.x - a.x) || 1;
    return Math.floor(((p.x - lewo) / szer) * n);
  };
  let ciagnie = false;
  box.onpointerdown = (e) => {
    ciagnie = true;
    box.setPointerCapture?.(e.pointerId);
    ustaw(zPunktu(e.clientX, e.clientY));
  };
  box.onpointermove = (e) => { if (ciagnie) ustaw(zPunktu(e.clientX, e.clientY)); };
  box.onpointerup = box.onpointercancel = () => { ciagnie = false; };
  box.onkeydown = (e) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    const k = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null;
    if (!d && k === null) return;
    e.preventDefault();
    e.stopPropagation();
    ustaw(k ?? wybrany + d);
  };
  ustaw(warianty.indexOf(start));
  return { el: box, wybrany: () => warianty[wybrany] };
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
      window.removeEventListener('resize', dopasuj);
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
    const rzad = document.createElement('div');
    rzad.className = 'tr-przyciski';
    rzad.append(...przyciski);
    panel.append(h, p, kafle.el, opis, rzad);
    // Low screens (a phone sideways, also the turned page – CSS media queries see the upright screen): compact.
    const dopasuj = () => {
      overlay.classList.toggle('tr-niskie', window.innerHeight < 560);
      panel.style.maxHeight = `${window.innerHeight - 12}px`;
    };
    dopasuj();
    window.addEventListener('resize', dopasuj);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    kafle.el.focus();
  });
}
