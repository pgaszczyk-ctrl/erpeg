import { MIEJSCA, PLECAK, UMIEJETNOSCI, MAKS_POZIOM, type Miejsce } from '../content/przedmioty';
import { OWOCE, LECZENIE_OWOCAMI } from '../content/sklepy';
import {
  gear, item, totalFruit, availableSkills, skillProgress, cooldown, defense, blockChance, equipFromBag, unequip, dropFromBag,
} from '../inventory';
import { session } from '../quests';

// The character sheet (an HTML overlay): money, equipment, a 5-slot backpack
// and the skills the character can use. Opened with 👤 or C.

const FRUIT_ICON = { jablko: '🍎', sliwka: '🟣', winogrono: '🍇' } as const;
let open: HTMLDivElement | null = null;

export function isCharacterOpen() {
  return !!open;
}

export function closeCharacter() {
  open?.remove();
  open = null;
}

export function toggleCharacter(hp: number, maxHp: number, onChange: () => void, eat: () => number | null) {
  if (open) closeCharacter();
  else show(hp, maxHp, onChange, eat);
}

function el(tag: string, cls = '', text = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function show(hp: number, maxHp: number, onChange: () => void, eat: () => number | null) {
  const root = el('div') as HTMLDivElement;
  root.id = 'character';
  root.onclick = (e) => {
    if (e.target === root) closeCharacter();
  };
  const box = el('div', 'c-box');
  root.append(box);
  document.body.append(root);
  open = root;

  // The action menu for one thing (under the section that was tapped).
  const actions = el('div', 'c-actions');
  const ask = (title: string, choices: [string, () => boolean | void][]) => {
    actions.replaceChildren(el('div', 'c-actions-title', title));
    for (const [label, fn] of choices) {
      const b = el('button', 'c-btn', label) as HTMLButtonElement;
      b.onclick = () => {
        if (fn() !== false) {
          onChange();
          render();
        }
      };
      actions.append(b);
    }
    const cancel = el('button', 'c-btn c-muted', 'Anuluj') as HTMLButtonElement;
    cancel.onclick = () => actions.replaceChildren();
    actions.append(cancel);
  };

  const render = () => {
    box.replaceChildren();
    actions.replaceChildren();
    const head = el('div', 'c-head');
    head.append(el('h2', '', session.name), el('div', 'c-sub', gear.magic ? 'Wojownik · Mag' : 'Wojownik'));
    const close = el('button', 'c-close', '✕') as HTMLButtonElement;
    close.onclick = closeCharacter;
    head.append(close);
    box.append(head);
    box.append(el('div', 'c-stats', `💰 ${session.coins} monet   ⭐ ${session.exp} EXP   ❤ ${hp / 2}/${maxHp / 2}   🛡 ${defense()} (${Math.round(blockChance() * 100)}% bloku)`));
    // Eating fruit heals.
    const n = LECZENIE_OWOCAMI.owocow;
    const canEat = totalFruit() >= n && hp < maxHp;
    const eatBtn = el('button', `c-btn c-eat${canEat ? '' : ' c-muted'}`, `🍎 Zjedz ${n} owoców → +1 ❤`) as HTMLButtonElement;
    eatBtn.disabled = !canEat;
    eatBtn.title = hp >= maxHp ? 'Masz pełne zdrowie' : `Masz ${totalFruit()} owoców`;
    eatBtn.onclick = () => {
      const now = eat();
      if (now != null) hp = now;
      render();
    };
    box.append(eatBtn);

    // Equipment
    box.append(el('h3', '', 'Założone'));
    const eq = el('div', 'c-eq');
    for (const m of Object.keys(MIEJSCA) as Miejsce[]) {
      const it = item(gear.equip[m]);
      const row = el('button', 'c-row') as HTMLButtonElement;
      row.append(el('span', 'c-slot', MIEJSCA[m]), el('span', '', it ? `${it.efekt ? '✨ ' : ''}${it.nazwa} (${m === 'bron' || m === 'dystans' ? 'obr.' : 'obrona'} ${it.moc})${it.opis ? ` – ${it.opis}` : ''}` : '—'));
      row.onclick = () => {
        if (!it || it.id === 'kijek') return;
        ask(it.nazwa, [['Zdejmij do plecaka', () => (unequip(m) ? undefined : (alertFull(), false))]]);
      };
      eq.append(row);
    }
    box.append(eq);

    // Backpack
    box.append(el('h3', '', `Plecak (${gear.bag.length}/${PLECAK.miejsc})`));
    const bag = el('div', 'c-bag');
    for (let i = 0; i < PLECAK.miejsc; i++) {
      const s = gear.bag[i];
      const cell = el('button', 'c-cell') as HTMLButtonElement;
      if (!s) cell.classList.add('c-empty');
      else if ('fruit' in s) {
        cell.append(el('span', 'c-icon', FRUIT_ICON[s.fruit]), el('span', 'c-n', `×${s.n}`));
        cell.onclick = () => ask(`${OWOCE[s.fruit].mnoga} ×${s.n} (sprzedasz w sklepie)`, [['Wyrzuć', () => dropFromBag(i)]]);
      } else {
        const it = item(s.item)!;
        cell.append(el('span', 'c-name', `${it.efekt ? '✨ ' : ''}${it.nazwa}`));
        cell.onclick = () => ask(it.opis ? `${it.nazwa}: ${it.opis}` : it.nazwa, [['Załóż', () => equipFromBag(i)], ['Wyrzuć', () => dropFromBag(i)]]);
      }
      bag.append(cell);
    }
    box.append(bag, actions);

    // Skills (only the ones the character can use)
    box.append(el('h3', '', 'Umiejętności'));
    for (const k of availableSkills()) {
      const pr = skillProgress(k);
      const row = el('div', 'c-skill');
      const max = pr.level >= MAKS_POZIOM;
      row.append(
        el('div', 'c-skill-name', `${UMIEJETNOSCI[k].nazwa} – poziom ${pr.level}${max ? ' (maks.)' : ''}`),
        el('div', 'c-skill-info', max ? `przerwa ${cooldown(k)} ms` : `${pr.into}/${pr.need} do następnego · przerwa ${cooldown(k)} ms`),
      );
      const bar = el('div', 'c-bar');
      const fill = el('div', 'c-fill');
      fill.style.width = `${Math.round((pr.into / pr.need) * 100)}%`;
      bar.append(fill);
      row.append(bar);
      box.append(row);
    }
  };

  const alertFull = () => {
    actions.replaceChildren(el('div', 'c-actions-title', 'Plecak pełny – najpierw coś wyrzuć.'));
  };

  render();
}
