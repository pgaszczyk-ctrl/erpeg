import { itemIcon } from './itemIcon';
import { MIEJSCA, PLECAK, UMIEJETNOSCI, MAKS_POZIOM, TALIZMANY, type Miejsce } from '../content/przedmioty';
import { GRUPY, LECZENIE_OWOCAMI, ESENCJA } from '../content/sklepy';
import { poziomPostaci, czescPremii, szybkoscPostaci, MAKS_POZIOM_POSTACI, PREMIA_POZIOMU } from '../content/historia';
import {
  gear, item, totalFruit, goodsN, goodsLabel, availableSkills, skillProgress, cooldown, defense, blockChance, equipFromBag, unequip, dropFromBag,
} from '../inventory';
import { session } from '../quests';
import { BOHATEROWIE, NOWE_POSTACIE } from '../content/wyglad';
import { heroSkin } from '../sprites';

/** Choosing which of the new heroes to be (saved with the look at the next save). */
function skinPicker(changed: () => void) {
  const now = heroSkin(session.look.postac, session.name);
  const i = BOHATEROWIE.indexOf(now);
  const row = el('div', 'c-skin');
  const pic = el('div', 'c-skin-pic');
  pic.style.backgroundImage = `url(postacie/${now.plik}.png)`;
  const go = (d: number) => {
    session.look = { ...session.look, postac: (i + d + BOHATEROWIE.length) % BOHATEROWIE.length };
    changed();
  };
  const prev = el('button', 'c-btn', '◀') as HTMLButtonElement;
  prev.onclick = () => go(-1);
  const next = el('button', 'c-btn', '▶') as HTMLButtonElement;
  next.onclick = () => go(1);
  row.append(prev, pic, el('div', 'c-skin-name', `🎭 ${now.nazwa}`), next);
  return row;
}

// The character sheet (an HTML overlay) in four pages: the character (name,
// level, life, skills, then the lesser statistics), equipment (with the
// weapon's imbuement square and three talismans), the 4×4 backpack and the
// quest log (where each began, what now, how far, its guiding arrow).
// Opened with 👤 or C.

let open: HTMLDivElement | null = null;

type Page = 'postac' | 'ekwipunek' | 'plecak' | 'zadania';
const PAGES: [Page, string][] = [['postac', '👤 Postać'], ['ekwipunek', '🛡 Ekwipunek'], ['plecak', '🎒 Plecak'], ['zadania', '📜 Zadania']];
/** The page shown last (the sheet opens there again). */
let page: Page = 'postac';

export function isCharacterOpen() {
  return !!open;
}

export function closeCharacter() {
  open?.remove();
  open = null;
}

/** An active quest for the quest log. */
export interface QuestLine {
  id: string;
  title: string;
  text: string;
  color: string;
  main: boolean;
  /** Where it was taken. */
  start?: string;
  /** How far the goal is, in words (content/fabula.ts ODLEGLOSCI); null = no place. */
  far: string | null;
  /** Its guiding arrow is on. */
  arrow: boolean;
}

/** The own tent: can it go up here (why not), and pitching it. */
export interface TentAction {
  ok: boolean;
  why: string;
  pitch: () => void;
}

export interface CharacterHost {
  hp: number;
  maxHp: number;
  onChange: () => void;
  eat: () => number | null;
  quests: () => QuestLine[];
  toggleArrow: (id: string) => void;
  imbue: () => boolean;
  tent?: TentAction;
}

export function toggleCharacter(host: CharacterHost) {
  if (open) closeCharacter();
  else show(host);
}

function el(tag: string, cls = '', text = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

const EMPTY_PIC: Record<Miejsce, string> = { bron: 'zelazny', dystans: 'luk', zbroja: 'skorzana_zbroja', helm: 'skorzany_helm', buty: 'skorzane_buty', talizman: 'podkowa_szczescia', talizman2: 'podkowa_szczescia', talizman3: 'podkowa_szczescia' };
const ICON: Record<Miejsce, string> = { bron: '🗡', dystans: '🏹', zbroja: '🦺', helm: '⛑', buty: '🥾', talizman: '🧿', talizman2: '🧿', talizman3: '🧿' };

function show(host: CharacterHost) {
  let hp = host.hp;
  const { maxHp, onChange, eat, tent } = host;
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
    const cancel = el('button', 'c-btn c-muted', choices.length ? 'Anuluj' : 'OK') as HTMLButtonElement;
    cancel.onclick = () => actions.replaceChildren();
    actions.append(cancel);
  };
  const alertFull = () => {
    actions.replaceChildren(el('div', 'c-actions-title', 'Plecak pełny – najpierw coś wyrzuć.'));
  };
  const rows = (list: [string, string][]) => {
    const out = el('div', 'c-statlist');
    for (const [k, v] of list) {
      const row = el('div', 'c-stat');
      row.append(el('span', 'c-stat-k', k), el('span', 'c-stat-v', v));
      out.append(row);
    }
    return out;
  };

  const pagePostac = () => {
    if (NOWE_POSTACIE) box.append(skinPicker(() => {
      onChange();
      render();
    }));
    const lvl = poziomPostaci(session.exp);
    box.append(rows([
      ['⭐ Poziom postaci', `${lvl}${lvl >= MAKS_POZIOM_POSTACI ? ' (max)' : ''}`],
      ['✨ Doświadczenie', `${session.exp} EXP`],
      ['❤ Zdrowie', `${hp / 2} / ${maxHp / 2}`],
      ['📈 Premia za poziom', `+${Math.round(czescPremii(lvl) * PREMIA_POZIOMU.zycie * 100)}% życia, +${Math.round((szybkoscPostaci(session.exp) - 1) * 100)}% szybkości`],
      ['🛡 Obrona', `${defense()} (${Math.round(blockChance() * 100)}% bloku)`],
    ]));
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
    // The own tent (bought in a DIY or sports shop): sleep here, in a forest or a field.
    if (session.namioty.length && tent) {
      const tb = el('button', `c-btn${tent.ok ? '' : ' c-muted'}`, '⛺ Rozbij namiot i śpij (zapis)') as HTMLButtonElement;
      tb.disabled = !tent.ok;
      tb.onclick = () => {
        closeCharacter();
        tent.pitch();
      };
      box.append(tb);
      if (!tent.ok && tent.why) box.append(el('div', 'c-note', tent.why));
    }
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
    // The lesser statistics.
    box.append(el('h3', '', 'Statystyki'));
    box.append(rows([
      ['💰 Monety', String(session.coins)],
      ['🚶 Przebyte', `${(session.stats.m / 1000).toFixed(1).replace('.', ',')} km`],
      ['⚔ Pokonani wojownicy', String(session.stats.duels ?? 0)],
      ['🏆 Rozbite gangi', String(session.stats.gangs ?? 0)],
      ['🧪 Mikstury lecznicze', String(session.mikstury)],
      [`${ESENCJA.ikona} Esencje ogłuszające`, String(session.esencje)],
      ['⛺ Namioty', session.namioty.length ? session.namioty.map((t) => `${t.left}/${t.max}`).join(', ') + ' nocy' : 'brak (sklep budowlany lub sportowy)'],
      ...(session.kamienie ? [['🔮 Kamienie mocy', String(session.kamienie)] as [string, string]] : []),
      ...(session.diamenty ? [['💎 Diamenty', String(session.diamenty)] as [string, string]] : []),
    ]));
  };

  const slotCell = (m: Miejsce) => {
    const it = item(gear.equip[m]);
    const cell = el('button', `c-xcell c-x-${m}${it ? '' : ' c-empty'}`) as HTMLButtonElement;
    // Empty slot: a greyed picture of what goes there.
    cell.append((it ? itemIcon(it.id) : itemIcon(EMPTY_PIC[m], 'item-ico item-ghost')) || el('span', 'c-xicon', ICON[m]), el('span', 'c-xname', it ? `${it.efekt ? '✨ ' : ''}${it.nazwa}` : MIEJSCA[m]));
    if (it && !TALIZMANY.includes(m)) cell.append(el('span', 'c-xpow', `${m === 'bron' || m === 'dystans' ? 'atak' : 'obrona'} ${it.moc}`));
    cell.title = it?.opis ?? MIEJSCA[m];
    cell.onclick = () => {
      if (!it) return ask(TALIZMANY.includes(m) ? 'Miejsce na talizman. Talizmany zdobywa się w zadaniach i za tajne hasła.' : `${MIEJSCA[m]}: pusto.`, []);
      const info = it.opis ? `${it.nazwa}: ${it.opis}` : it.nazwa;
      if (it.id === 'kijek') return ask(info, []);
      ask(info, [['Zdejmij do plecaka', () => (unequip(m) ? undefined : (alertFull(), false))]]);
    };
    return cell;
  };

  const pageEkwipunek = () => {
    // A cross of slots: helmet on top, weapon – armour – second weapon, boots below; the imbuement square left of the weapon.
    const eq = el('div', 'c-cross');
    for (const m of ['helm', 'bron', 'zbroja', 'dystans', 'buty'] as Miejsce[]) eq.append(slotCell(m));
    const imb = session.nasycenie;
    const nas = el('button', `c-xcell c-x-nas${imb ? '' : ' c-empty'}`) as HTMLButtonElement;
    nas.append(el('span', 'c-xicon', imb ? ESENCJA.ikona : '💧'), el('span', 'c-xname', imb ? `${ESENCJA.nazwa}` : 'Nasycenie broni'));
    if (imb) nas.append(el('span', 'c-xpow', `${imb.left} ciosów`));
    nas.onclick = () => {
      const about = `Wetrzyj w broń esencję ogłuszającą: przez ${ESENCJA.ciosow} trafnych ciosów każdy trafiony potwór stoi ogłuszony i nie może uderzyć.`;
      if (session.esencje > 0) ask(`${about} Masz ${session.esencje} ${session.esencje === 1 ? 'flakonik' : 'flakoniki'}.${imb ? ` Teraz na broni: ${imb.left} ciosów (dojdzie ${ESENCJA.ciosow}).` : ''}`, [[`${ESENCJA.ikona} Wetrzyj esencję`, () => host.imbue()]]);
      else ask(`${imb ? `Na broni: ${ESENCJA.nazwa}, jeszcze ${imb.left} ciosów. ` : ''}${about} Flakonik uwarzy alchemik na stacji benzynowej z ${ESENCJA.grzybow} grzybów i ${ESENCJA.drewna} drewna.`, []);
    };
    eq.append(nas);
    box.append(eq);
    box.append(el('h3', '', 'Talizmany'));
    const tal = el('div', 'c-talismans');
    for (const m of TALIZMANY) tal.append(slotCell(m));
    box.append(tal, actions);
  };

  const pagePlecak = () => {
    box.append(el('div', 'c-note', `Zajęte ${gear.bag.length} z ${PLECAK.miejsc} miejsc. Stuknij rzecz, żeby ją założyć albo wyrzucić.`));
    const bag = el('div', 'c-bag');
    for (let i = 0; i < PLECAK.miejsc; i++) {
      const s = gear.bag[i];
      const cell = el('button', 'c-cell') as HTMLButtonElement;
      if (!s) cell.classList.add('c-empty');
      else if ('goods' in s) {
        cell.append(el('span', 'c-icon', GRUPY[s.goods].ikona), el('span', 'c-n', `×${goodsN(s)}`));
        cell.onclick = () => ask(`${goodsLabel(s)} – sprzedasz w sklepie${s.goods === 'drewno' ? '' : ', zjesz przyciskiem leczenia'}.`, [['Wyrzuć', () => dropFromBag(i)]]);
      } else {
        const it = item(s.item)!;
        const pic = itemIcon(it.id);
        if (pic) cell.append(pic);
        else cell.append(el('span', 'c-name', `${it.efekt ? '✨ ' : ''}${it.nazwa}`));
        cell.title = it.nazwa;
        cell.onclick = () => ask(it.opis ? `${it.nazwa}: ${it.opis}` : it.nazwa, [['Załóż', () => equipFromBag(i)], ['Wyrzuć', () => dropFromBag(i)]]);
      }
      bag.append(cell);
    }
    box.append(bag, actions);
  };

  const pageZadania = () => {
    const quests = host.quests();
    const log = el('div', 'c-quests');
    if (!quests.length) log.append(el('div', 'c-quest', 'Brak aktywnych zadań.'));
    for (const q of quests) {
      const row = el('div', 'c-quest');
      const dot = el('span', 'c-qdot', q.main ? '⭐' : '');
      dot.style.background = q.main ? 'transparent' : q.color;
      const txt = el('div', 'c-qtext');
      const name = el('b', '', q.title);
      name.style.color = q.color;
      txt.append(name);
      if (q.start) txt.append(el('small', '', `📍 Start: ${q.start}`));
      txt.append(el('small', '', `👉 Teraz: ${q.text}`));
      if (q.far) txt.append(el('small', '', `🧭 Cel: ${q.far}`));
      if (q.far) {
        const b = el('button', `c-btn c-arrow${q.arrow ? '' : ' c-muted'}`, q.arrow ? '➤ Strzałka włączona' : '➤ Włącz strzałkę') as HTMLButtonElement;
        b.onclick = () => {
          host.toggleArrow(q.id);
          render();
        };
        txt.append(b);
      }
      row.append(dot, txt);
      log.append(row);
    }
    box.append(log);
  };

  const render = () => {
    box.replaceChildren();
    actions.replaceChildren();
    const head = el('div', 'c-head');
    head.append(el('h2', '', session.story.title ? `${session.name}, ${session.story.title}` : session.name), el('div', 'c-sub', `${gear.magic ? 'Wojownik · Mag' : 'Wojownik'} · poziom ${poziomPostaci(session.exp)}`));
    const close = el('button', 'c-close', '✕') as HTMLButtonElement;
    close.onclick = closeCharacter;
    head.append(close);
    box.append(head);
    const tabs = el('div', 'c-tabs');
    for (const [id, label] of PAGES) {
      const t = el('button', `c-tab${id === page ? ' c-tab-on' : ''}`, label) as HTMLButtonElement;
      t.onclick = () => {
        page = id;
        render();
      };
      tabs.append(t);
    }
    box.append(tabs);
    if (page === 'postac') pagePostac();
    else if (page === 'ekwipunek') pageEkwipunek();
    else if (page === 'plecak') pagePlecak();
    else pageZadania();
  };

  render();
}
