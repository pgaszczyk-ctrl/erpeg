// Gender at character creation (owner, 22 Nov 2026: „przy wyborze imienia musi być opcja wyboru płci; potem strażnik,
// łucznik czy mag to już jego sprawa, ale płeć musi zostać”). Two buttons, none picked at first – the player must choose;
// the choice is saved in the look (modul.p + guard3d) and nothing in the game changes it later.
import { tx } from '../i18n';
import { losoweImie } from '../content/imiona';

export type Plec = 'k' | 'm';

export interface WyborPlci {
  el: HTMLElement;
  /** The chosen gender, or null while nothing is picked. */
  plec(): Plec | null;
}

/** `imie`: the name field – while it still holds the ready-made name, it changes to one of the chosen gender. */
export function wyborPlci(imie?: HTMLInputElement): WyborPlci {
  styl();
  let wybrana: Plec | null = null;
  let gotowe = imie?.value ?? '';
  const box = document.createElement('div');
  box.className = 'm-field m-plec';
  const napis = document.createElement('span');
  napis.textContent = tx('Płeć', 'Gender');
  const rzad = document.createElement('div');
  rzad.className = 'm-plec-rzad';
  rzad.setAttribute('role', 'radiogroup');
  rzad.setAttribute('aria-label', napis.textContent);
  const uwaga = document.createElement('small');
  uwaga.textContent = tx('⚠ Płci nie można później zmienić.', '⚠ Gender can’t be changed later.');
  const przyciski: Record<Plec, HTMLButtonElement> = {} as Record<Plec, HTMLButtonElement>;
  for (const [p, znak, pl, en] of [['m', '♂', 'Mężczyzna', 'Man'], ['k', '♀', 'Kobieta', 'Woman']] as const) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'm-btn m-plec-btn';
    b.dataset.plec = p;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', 'false');
    b.textContent = `${znak} ${tx(pl, en)}`;
    b.onclick = () => {
      wybrana = p;
      for (const q of ['k', 'm'] as const) {
        przyciski[q].classList.toggle('on', q === p);
        przyciski[q].setAttribute('aria-checked', String(q === p));
      }
      box.classList.remove('m-plec-brak');
      // An untouched ready-made name follows the gender (a woman isn't offered „Zbyszko”).
      if (imie && imie.value === gotowe) { gotowe = losoweImie(p); imie.value = gotowe; }
    };
    przyciski[p] = b;
    rzad.append(b);
  }
  box.append(napis, rzad, uwaga);
  return { el: box, plec: () => { if (!wybrana) box.classList.add('m-plec-brak'); return wybrana; } };
}

export const BRAK_PLCI = () => tx('Wybierz płeć postaci.', 'Choose your hero’s gender.');

function styl() {
  if (document.getElementById('m-plec-css')) return;
  const st = document.createElement('style');
  st.id = 'm-plec-css';
  st.textContent = `
    .m-plec-rzad { display: flex; gap: 8px; }
    .m-plec-rzad .m-plec-btn { flex: 1; margin: 0; font-size: 17px; padding: 10px 6px; opacity: .75; }
    .m-plec-rzad .m-plec-btn.on { opacity: 1; outline: 3px solid #f2c75c; outline-offset: -3px; filter: brightness(1.15); }
    .m-plec.m-plec-brak .m-plec-rzad { animation: m-plec-drg .35s; }
    .m-plec.m-plec-brak span { color: #ff8a7a; }
    @keyframes m-plec-drg { 25% { transform: translateX(-5px) } 75% { transform: translateX(5px) } }
  `;
  document.head.append(st);
}
