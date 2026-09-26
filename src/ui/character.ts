import { itemIcon } from './itemIcon';
import { MIEJSCA, PLECAK, UMIEJETNOSCI, MAKS_POZIOM, type Miejsce } from '../content/przedmioty';
import { OWOCE, LECZENIE_OWOCAMI } from '../content/sklepy';
import { poziomPostaci } from '../content/historia';
import {
  gear, item, totalFruit, availableSkills, skillProgress, cooldown, defense, blockChance, equipFromBag, unequip, dropFromBag,
} from '../inventory';
import { session } from '../quests';

// The character sheet (an HTML overlay): money, equipment, a 5-slot backpack
// and the skills the character can use. Opened with 👤 or C.

const FRUIT_ICON = { jablko: '🍎', sliwka: '🟣', winogrono: '🍇', grzyb: '🍄', drewno: '🪵' } as const;
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
    head.append(el('h2', '', session.story.title ? `${session.name}, ${session.story.title}` : session.name), el('div', 'c-sub', gear.magic ? 'Wojownik · Mag' : 'Wojownik'));
    const close = el('button', 'c-close', '✕') as HTMLButtonElement;
    close.onclick = closeCharacter;
    head.append(close);
    box.append(head);
    // Statistics, one per line.
    const stats: [string, string][] = [
      ['⭐ Poziom postaci', String(poziomPostaci(session.exp))],
      ['✨ Doświadczenie', `${session.exp} EXP`],
      ['❤ Zdrowie', `${hp / 2} / ${maxHp / 2}`],
      ['🛡 Obrona', `${defense()} (${Math.round(blockChance() * 100)}% bloku)`],
      ['💰 Monety', String(session.coins)],
      ['🚶 Przebyte', `${(session.stats.m / 1000).toFixed(1).replace('.', ',')} km`],
      ['⚔ Pokonani wojownicy', String(session.stats.duels ?? 0)],
      ...(session.kamienie ? [['💎 Kamienie mocy', String(session.kamienie)] as [string, string]] : []),
    ];
    const list = el('div', 'c-statlist');
    for (const [k, v] of stats) {
      const row = el('div', 'c-stat');
      row.append(el('span', 'c-stat-k', k), el('span', 'c-stat-v', v));
      list.append(row);
    }
    box.append(list);
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
    // A cross of slots: helmet on top, weapon – armour – second weapon, boots below.
    const eq = el('div', 'c-cross');
    const EMPTY_PIC: Record<Miejsce, string> = { bron: 'zelazny', dystans: 'luk', zbroja: 'skorzana_zbroja', helm: 'skorzany_helm', buty: 'skorzane_buty' };
    const ICON: Record<Miejsce, string> = { bron: '🗡', dystans: '🏹', zbroja: '🦺', helm: '⛑', buty: '🥾' };
    for (const m of ['helm', 'bron', 'zbroja', 'dystans', 'buty'] as Miejsce[]) {
      const it = item(gear.equip[m]);
      const cell = el('button', `c-xcell c-x-${m}${it ? '' : ' c-empty'}`) as HTMLButtonElement;
      // Empty slot: a greyed picture of what goes there.
      cell.append((it ? itemIcon(it.id) : itemIcon(EMPTY_PIC[m], 'item-ico item-ghost')) || el('span', 'c-xicon', ICON[m]), el('span', 'c-xname', it ? `${it.efekt ? '✨ ' : ''}${it.nazwa}` : MIEJSCA[m]));
      if (it) cell.append(el('span', 'c-xpow', `${m === 'bron' || m === 'dystans' ? 'atak' : 'obrona'} ${it.moc}`));
      cell.title = it?.opis ?? MIEJSCA[m];
      cell.onclick = () => {
        if (!it) return;
        const info = it.opis ? `${it.nazwa}: ${it.opis}` : it.nazwa;
        if (it.id === 'kijek') return ask(info, []);
        ask(info, [['Zdejmij do plecaka', () => (unequip(m) ? undefined : (alertFull(), false))]]);
      };
      eq.append(cell);
    }
    box.append(eq, actions);

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
        const pic = itemIcon(it.id);
        if (pic) cell.append(pic);
        cell.append(el('span', 'c-name', `${it.efekt ? '✨ ' : ''}${it.nazwa}`));
        cell.onclick = () => ask(it.opis ? `${it.nazwa}: ${it.opis}` : it.nazwa, [['Załóż', () => equipFromBag(i)], ['Wyrzuć', () => dropFromBag(i)]]);
      }
      bag.append(cell);
    }
    box.append(bag);
    if (!actions.parentElement) box.append(actions);

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
