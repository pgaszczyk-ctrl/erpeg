import { MIEJSCA, PLECAK, UMIEJETNOSCI, MAKS_POZIOM, TALIZMANY, type Miejsce } from '../content/przedmioty';
import { LECZENIE_OWOCAMI } from '../content/sklepy';
import { slotCell, slotDrag, slotLabel } from './slots';
import { poziomPostaci, czescPremii, szybkoscPostaci, MAKS_POZIOM_POSTACI, PREMIA_POZIOMU } from '../content/historia';
import {
  gear, item, totalFruit, goodsLabel, availableSkills, skillProgress, cooldown, hitChance, defense, blockChance, equipFromBag, unequip, dropFromBag, moveThing, imbueOf,
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

type Page = 'postac' | 'ekwipunek' | 'zadania';
const PAGES: [Page, string][] = [['postac', '👤 Postać'], ['ekwipunek', '🎒 Ekwipunek'], ['zadania', '📜 Zadania']];
/** Removes the drag listeners of the equipment page. */
let dispose: (() => void) | null = null;
/** The page shown last (the sheet opens there again). */
let page: Page = 'postac';

export function isCharacterOpen() {
  return !!open;
}

export function closeCharacter() {
  dispose?.();
  dispose = null;
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
  /** Where the goal is and how far, e.g. "Jana Pawła II, Lublin (nie tak blisko)"; null = no place. */
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
  /** Opens the "📸 Pochwal się" card (ui/brag.ts). */
  brag?: () => void;
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
    // A square picture with the title (or the level) to share.
    if (host.brag) {
      const bb = el('button', 'c-btn', '📸 Pochwal się') as HTMLButtonElement;
      bb.onclick = () => {
        const b = host.brag!;
        closeCharacter();
        b();
      };
      box.append(bb);
    }
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
        el('div', 'c-skill-info', `${max ? '' : `${pr.into}/${pr.need} do następnego · `}przerwa ${cooldown(k)} ms${k === 'magia' ? '' : ` · trafia ${Math.round(hitChance(k, false, session.level.celnosc) * 100)}%`}`),
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
      ['⛺ Namioty', session.namioty.length ? session.namioty.map((t) => `${t.left}/${t.max}`).join(', ') + ' nocy' : 'brak (sklep budowlany lub sportowy)'],
      ...(session.kamienie ? [['🔮 Kamienie mocy', String(session.kamienie)] as [string, string]] : []),
      ...(session.diamenty ? [['💎 Diamenty', String(session.diamenty)] as [string, string]] : []),
    ]));
  };

  const pageEkwipunek = () => {
    // The owner's drawing: amulet – weapon – second hand on the left, helmet – armour – boots in the middle, three talismans on the right; the backpack below (5 columns × 4 rows).
    const eq = el('div', 'sl-grid sl-eq');
    for (const m of ['amulet', 'helm', 'talizman', 'bron', 'zbroja', 'talizman2', 'dystans', 'buty', 'talizman3'] as Miejsce[]) {
      const id = gear.equip[m];
      eq.append(slotCell(id ? { item: id } : null, { zone: 'eq', m }, TALIZMANY.includes(m) ? 'sl-tal' : ''));
    }
    const bag = el('div', 'sl-grid sl-bag');
    for (let i = 0; i < PLECAK.miejsc; i++) bag.append(slotCell(gear.bag[i] ?? null, { zone: 'bag', i }));
    const note = el('div', 'c-note', `Plecak: ${gear.bag.length}/${PLECAK.miejsc}. Przeciągaj rzeczy, żeby je założyć, zdjąć albo zamienić; esencję przeciągnij na broń.`);
    const wrap = el('div', 'sl-wrap');
    wrap.append(eq, bag);
    // All of it in the middle of the free space: the same gap under the tabs as above the bottom edge.
    const page = el('div', 'c-eqpage');
    page.append(wrap, actions, note);
    box.append(page);
    dispose?.();
    dispose = slotDrag(wrap, {
      drop: (from, to) => {
        const msg = moveThing(from, to);
        onChange();
        render();
        if (msg) actions.replaceChildren(el('div', 'c-actions-title', msg));
      },
      tap: (at) => {
        if (at.zone === 'eq') {
          const it = item(gear.equip[at.m]);
          if (!it) return ask(TALIZMANY.includes(at.m) ? 'Miejsce na talizman: przeciągnij tu talizman z plecaka, wtedy działa.' : `${MIEJSCA[at.m]}: pusto.`, []);
          const imb = imbueOf(it.id);
          const info = `${it.nazwa}${it.opis ? `: ${it.opis}` : ''}${imb ? ` ${imb.e.ikona} ${imb.e.nazwa}: jeszcze ${imb.minutes} min.` : ''}`;
          if (it.id === 'kijek') return ask(info, []);
          return ask(info, [['Zdejmij do plecaka', () => (unequip(at.m) ? undefined : (alertFull(), false))]]);
        }
        if (at.zone !== 'bag') return;
        const i = at.i;
        const sl = gear.bag[i];
        if (!sl) return;
        if ('goods' in sl) return ask(`${goodsLabel(sl)} – sprzedasz w sklepie${sl.goods === 'drewno' ? '' : ', zjesz przyciskiem leczenia'}.`, [['Wyrzuć', () => dropFromBag(i)]]);
        if ('esencja' in sl) return ask(slotLabel(sl), [['Wyrzuć', () => dropFromBag(i)]]);
        ask(slotLabel(sl), [['Załóż', () => equipFromBag(i)], ['Wyrzuć', () => dropFromBag(i)]]);
      },
    });
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
    else pageZadania();
  };

  render();
}
