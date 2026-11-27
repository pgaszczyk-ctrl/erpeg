import { DOMYSLNA_TRUDNOSC, TRUDNOSCI } from '../content/trudnosc';
import { tx } from '../i18n';
import './trybyPrzygody.css';

const PLANSZE = [
  { poziom: 0, obraz: 'rodzinny' },
  { poziom: DOMYSLNA_TRUDNOSC, obraz: 'przygoda' },
  { poziom: 4, obraz: 'hardkor' },
] as const;

export function trybyPrzygody() {
  const el = document.createElement('div');
  el.className = 'm-warianty';
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', tx('Wariant przygody', 'Adventure mode'));
  const rzad = document.createElement('div');
  rzad.className = 'm-warianty-rzad';
  const ostrzezenie = document.createElement('small');
  ostrzezenie.className = 'm-wariant-ostrzezenie';
  ostrzezenie.setAttribute('aria-live', 'polite');
  let poziom = DOMYSLNA_TRUDNOSC;
  const przyciski = PLANSZE.map(({ poziom: id, obraz }) => {
    const trudnosc = TRUDNOSCI[id];
    const opis = tx(trudnosc.nazwa, trudnosc.en);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'm-wariant';
    b.dataset.wariant = obraz;
    const img = document.createElement('img');
    img.alt = '';
    img.width = 288;
    img.height = 202;
    img.src = `${import.meta.env.BASE_URL}ui/warianty/${obraz}.webp`;
    const znaczek = document.createElement('span');
    znaczek.className = 'm-wariant-znaczek';
    znaczek.setAttribute('aria-hidden', 'true');
    znaczek.textContent = '✓';
    b.append(img, znaczek, opis);
    b.onclick = () => ustaw(id);
    return b;
  });
  function ustaw(id: number) {
    poziom = id;
    przyciski.forEach((b, i) => b.setAttribute('aria-pressed', String(PLANSZE[i].poziom === id)));
    ostrzezenie.textContent = id === 4
      ? tx('Wrogowie: +20% życia i obrażeń. Śmierć: −10% całego EXP, także poniżej progu poziomu.',
        'Enemies: +20% health and damage. Death: −10% of total XP, which can cost levels.')
      : '';
  }
  rzad.append(...przyciski);
  el.append(rzad, ostrzezenie);
  ustaw(poziom);
  return { el, wybrany: () => poziom };
}
