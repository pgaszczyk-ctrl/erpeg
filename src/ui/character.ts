import { MIEJSCA, PLECAK, UMIEJETNOSCI, MAKS_POZIOM, TALIZMANY, type Miejsce, type Umiejetnosc } from '../content/przedmioty';
import { LECZENIE_OWOCAMI, OWOCE, GRUPY, type Owoc, type Grupa } from '../content/sklepy';

/** Goods groups opened in Kufer → Zasoby (kept while the game runs). */
const openGroups = new Set<Grupa>();
import { slotCell, slotDrag, slotLabel } from './slots';
import { poziomPostaci, czescPremii, szybkoscPostaci, expNaPoziom, MAKS_POZIOM_POSTACI, PREMIA_POZIOMU } from '../content/historia';
import {
  gear, item, totalFruit, goodsLabel, availableSkills, skillProgress, skillLevel, cooldown, hitChance, defense, blockChance, equipFromBag, unequip, dropFromBag, moveThing, imbueOf, condition, goodsByKind, ownedAmmo,
} from '../inventory';
import { session } from '../quests';
import { AMUNICJA } from '../content/zuzycie';
import { BOHATEROWIE, NOWE_POSTACIE } from '../content/wyglad';
import { heroSkin } from '../sprites';
import { heroPreviewBackground } from './heroPreview';
import { ENEMY_KINDS } from '../objects/Slime';
import { OSIAGNIECIA, type StanDoOsiagniec } from '../content/osiagniecia';
import { MISJE } from '../content/fabula';
import { TEST } from '../version';
import { rememberTestLook } from '../testAppearance';

/** Choosing which of the new heroes to be (saved with the look at the next save). */
function skinPicker(changed: () => void) {
  const now = heroSkin(session.look.postac, session.name);
  const i = BOHATEROWIE.indexOf(now);
  const row = el('div', 'c-skin');
  const pic = el('div', 'c-skin-pic');
  heroPreviewBackground(pic, now.plik);
  const go = (d: number) => {
    session.look = { ...session.look, postac: (i + d + BOHATEROWIE.length) % BOHATEROWIE.length };
    if (TEST) rememberTestLook(session.look, session.name);
    changed();
  };
  const prev = el('button', 'c-btn', '◀') as HTMLButtonElement;
  prev.type = 'button';
  prev.setAttribute('aria-label', 'Poprzednia postać');
  prev.onclick = () => go(-1);
  const next = el('button', 'c-btn', '▶') as HTMLButtonElement;
  next.type = 'button';
  next.setAttribute('aria-label', 'Następna postać');
  next.onclick = () => go(1);
  row.append(prev, pic, el('div', 'c-skin-name', `🎭 ${now.nazwa}`), next);
  return row;
}

// The "Kufer" (owner's spec from the 🎨 Grafika chat, 5 Oct 2026): a steampunk trunk of dark
// wood and brass over the paused, blurred world. On a computer three tabs – Kufer (three columns:
// Postać – the 9 equipment places and the backpack; Stan – level on nixie tubes, EXP and life tubes
// like the HUD's, skills; Zasoby – drum counters), Dziennik zadań (the quest log) and Księga
// osiągnięć (seals from content/osiagniecia.ts + statistics). On a phone the three columns are
// tabs of their own (owner, 6 Oct 2026: scrolling down the trunk was a pain), and what still
// doesn't fit scrolls with a brass slider on the right (`brassScroll`). The camera is only the
// HUD's button (ui/brag.ts showPhoto). Closed with the red valve, Escape or the phone's back button.

let open: HTMLDivElement | null = null;

type Page = 'kufer' | 'postac' | 'stan' | 'zasoby' | 'zadania' | 'ksiega';
/** Narrow screens (the trunk's three columns would stack): each column gets a tab of its own. */
const narrow = () => window.matchMedia('(max-width: 960px)').matches;
const pages = (): [Page, string, string][] =>
  narrow()
    ? [['postac', '🎒', 'Postać'], ['stan', '⚙️', 'Stan'], ['zasoby', '🪙', 'Zasoby'], ['zadania', '📜', 'Dziennik'], ['ksiega', '📖', 'Księga']]
    : [['kufer', '🧳', 'Kufer'], ['zadania', '📜', 'Dziennik zadań'], ['ksiega', '📖', 'Księga osiągnięć']];
/** The same page on the current screen width (Kufer ↔ Postać/Stan/Zasoby). */
const fitPage = (p: Page): Page => (narrow() ? (p === 'kufer' ? 'postac' : p) : p === 'postac' || p === 'stan' || p === 'zasoby' ? 'kufer' : p);
/** Removes the drag listeners of the equipment. */
let dispose: (() => void) | null = null;
/** The page shown last (the trunk opens there again). */
let page: Page = 'kufer';
/** Called once when the trunk closes (the world goes on). */
let closed: (() => void) | null = null;
/** Our entry in the browser history (the phone's back button closes the trunk). */
let historyEntry = false;

export function isCharacterOpen() {
  return !!open;
}

const onBack = () => {
  historyEntry = false;
  closeCharacter();
};

export function closeCharacter() {
  if (!open) return;
  dispose?.();
  dispose = null;
  open.remove();
  open = null;
  window.removeEventListener('popstate', onBack);
  if (historyEntry) {
    historyEntry = false;
    history.back();
  }
  const c = closed;
  closed = null;
  c?.();
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
  fruitPerHeal?: number;
  quests: () => QuestLine[];
  toggleArrow: (id: string) => void;
  tent?: TentAction;
  /** Open here (HUD: the character button, gold → Zasoby, the quest line → the quest log). */
  page?: 'eq' | 'gold' | 'quests';
  /** A goods kind's picture (the game's own textures), for the drum counters. */
  goodsIcon?: (f: Owoc | Grupa) => string | undefined;
  /** When the trunk closes. */
  onClose?: () => void;
}

export function toggleCharacter(host: CharacterHost) {
  if (open) closeCharacter();
  else {
    if (host.page) page = host.page === 'quests' ? 'zadania' : host.page === 'gold' ? 'zasoby' : 'postac';
    show(host);
  }
}

function el(tag: string, cls = '', text = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/** Digits on drums like an old till; leading zeros dimmed. */
function drums(n: number, width: number) {
  const s = String(Math.max(0, Math.floor(n)));
  const pad = s.padStart(width, '0');
  const box = el('span', 'k-odo');
  [...pad].forEach((d, i) => box.append(el('span', `k-dg${i < pad.length - s.length ? ' k-dim' : ''}`, d)));
  box.setAttribute('aria-label', s);
  return box;
}

/** A glass tube lying down (the HUD's tubes, bigger, with 5 marks). */
function tube(share: number, kind: 'hp' | 'xp', label: string) {
  const t = el('div', `k-tube k-tube-${kind}`);
  const fill = el('div', 'k-tube-fill');
  fill.style.width = `${Math.round(Math.max(0, Math.min(1, share)) * 100)}%`;
  t.append(fill, el('div', 'k-tube-marks'));
  t.setAttribute('role', 'meter');
  t.setAttribute('aria-label', label);
  return t;
}

/** The skill an item in the main or second hand trains (its level shows on a nixie badge). */
function skillOfItem(id: string | null): Umiejetnosc | null {
  const it = item(id);
  if (!it) return null;
  if (it.rodzaj === 'luk') return 'luk';
  if (it.rodzaj === 'magia') return 'magia';
  return it.miejsce === 'bron' ? 'miecz' : null;
}

function show(host: CharacterHost) {
  let hp = host.hp;
  const { maxHp, onChange, eat, tent } = host;
  const scrollTo = !narrow() && host.page === 'gold' ? 'k-zasoby' : null;
  closed = host.onClose ?? null;
  const root = el('div') as HTMLDivElement;
  root.id = 'character';
  root.onclick = (e) => {
    if (e.target === root) closeCharacter();
  };
  const box = el('div', 'k-box');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'Kufer');
  for (const c of ['lt', 'rt', 'lb', 'rb']) box.append(el('span', `k-rivet k-${c}`));
  const top = el('div', 'k-top');
  const tabs = el('div', 'k-tabs');
  const valve = el('button', 'k-valve') as HTMLButtonElement;
  valve.type = 'button';
  valve.setAttribute('aria-label', 'Zamknij kufer');
  valve.title = 'Zamknij (Esc)';
  valve.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.2"/><path d="M12 3v7M12 14v7M3 12h7M14 12h7"/></svg>';
  valve.onclick = closeCharacter;
  top.append(tabs, valve);
  const body = el('div', 'k-body');
  box.append(top, el('div', 'k-pipe'), body);
  root.append(box);
  document.body.append(root);
  open = root;
  // The phone's back button closes the trunk instead of leaving the game.
  try {
    history.pushState({ kufer: true }, '');
    historyEntry = true;
    window.addEventListener('popstate', onBack);
  } catch {
    historyEntry = false;
  }

  // The card of the thing tapped (cream paper), always the same height so nothing jumps.
  const actions = el('div', 'c-actions k-card');
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
  const section = (title: string, id?: string) => {
    const s = el('section', 'k-well');
    if (id) s.id = id;
    s.append(el('div', 'k-plate', title));
    return s;
  };

  // ---------------------------------------------------------------- Kufer: Postać
  const sectionPostac = () => {
    const s = section('Postać', 'k-postac');
    if (NOWE_POSTACIE) s.append(skinPicker(() => {
      onChange();
      render();
    }));
    const wrap = el('div', 'sl-wrap k-wrap');
    const cell = (m: Miejsce) => {
      const id = gear.equip[m];
      const c = slotCell(id ? { item: id } : null, { zone: 'eq', m }, TALIZMANY.includes(m) ? 'sl-tal' : '');
      const k = skillOfItem(id);
      if (k && (m === 'bron' || m === 'dystans')) c.append(el('span', 'k-nixbadge', String(skillLevel(k))));
      if (id) c.classList.add('k-on');
      return c;
    };
    const doll = el('div', 'k-doll');
    const left = el('div', 'k-col');
    for (const m of ['amulet', 'bron', 'dystans'] as Miejsce[]) left.append(cell(m));
    const right = el('div', 'k-col');
    for (const m of ['helm', 'zbroja', 'buty'] as Miejsce[]) right.append(cell(m));
    // The hero as a sepia daguerreotype in an arched brass frame.
    const frame = el('div', 'k-dag');
    const pic = el('div', 'k-dag-pic');
    if (NOWE_POSTACIE) {
      // The standing frame facing us (column 2, row 1 of the artist's 3×3 sheet).
      const hero = el('div', 'k-dag-hero');
      heroPreviewBackground(hero, heroSkin(session.look.postac, session.name).plik);
      pic.append(hero);
    }
    pic.setAttribute('role', 'img');
    pic.setAttribute('aria-label', 'Twoja postać');
    frame.append(pic);
    doll.append(left, frame, right);
    const tal = el('div', 'k-tal');
    for (const m of ['talizman', 'talizman2', 'talizman3'] as Miejsce[]) tal.append(cell(m));
    const bag = el('div', 'sl-grid sl-bag');
    for (let i = 0; i < PLECAK.miejsc; i++) bag.append(slotCell(gear.bag[i] ?? null, { zone: 'bag', i }));
    wrap.append(doll, tal, actions, el('div', 'k-sub', `Plecak ${gear.bag.length}/${PLECAK.miejsc}`), bag);
    s.append(wrap, el('div', 'c-note', 'Przeciągaj rzeczy, żeby je założyć, zdjąć albo zamienić; esencję przeciągnij na broń.'));
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
          const k = skillOfItem(it.id);
          const info = `${it.nazwa}${k ? ` · ${UMIEJETNOSCI[k].nazwa.toLowerCase()} poz. ${skillLevel(k)}` : ''}${it.opis ? `: ${it.opis}` : ''}${imb ? ` ${imb.e.ikona} ${imb.e.nazwa}: jeszcze ${imb.minutes} min.` : ''}${statText(it.id)}${wearText(it.id)}`;
          if (it.id === 'kijek') return ask(info, []);
          return ask(info, [['Zdejmij do plecaka', () => (unequip(at.m) ? undefined : (alertFull(), false))]]);
        }
        if (at.zone !== 'bag') return;
        const i = at.i;
        const sl = gear.bag[i];
        if (!sl) return;
        if ('goods' in sl) return ask(`${goodsLabel(sl)} – sprzedasz w sklepie${sl.goods === 'drewno' ? '' : ', zjesz przyciskiem leczenia'}.`, [['Wyrzuć', () => dropFromBag(i)]]);
        if ('esencja' in sl) return ask(slotLabel(sl), [['Wyrzuć', () => dropFromBag(i)]]);
        ask(slotLabel(sl) + statText(sl.item) + wearText(sl.item), item(sl.item)?.pojazd || item(sl.item)?.leczenie
          ? [['Wyrzuć', () => dropFromBag(i)]]
          : [['Załóż', () => equipFromBag(i)], ['Wyrzuć', () => dropFromBag(i)]]);
      },
    });
    return s;
  };

  // ---------------------------------------------------------------- Kufer: Stan
  const sectionStan = () => {
    const s = section('Stan');
    const lvl = poziomPostaci(session.exp);
    const max = lvl >= MAKS_POZIOM_POSTACI;
    const lv = el('div', 'k-level');
    const nix = el('div', 'k-nixies');
    for (const d of String(lvl).padStart(2, '0')) nix.append(el('span', 'k-nix', d));
    nix.setAttribute('aria-label', `Poziom ${lvl}`);
    const lvInfo = el('div', 'k-level-info');
    lvInfo.append(el('span', 'k-big', 'Poziom'));
    if (max) lvInfo.append(el('span', 'k-plate k-small', 'Maksymalny'));
    if (session.story.title) lvInfo.append(el('span', 'k-titleline', `🏅 ${session.story.title}`));
    lv.append(nix, lvInfo);
    s.append(lv);
    const from = expNaPoziom(lvl);
    const share = max ? 1 : (session.exp - from) / (expNaPoziom(lvl + 1) - from);
    const exp = el('div', 'k-row');
    exp.append(el('span', 'k-lbl', 'Doświadczenie'), drums(session.exp, 6), el('span', 'k-unit', 'EXP'));
    s.append(exp, tube(share, 'xp', `Doświadczenie: ${Math.round(share * 100)}% do następnego poziomu`));
    if (!max) s.append(el('div', 'k-sub', `do poziomu ${lvl + 1}: ${expNaPoziom(lvl + 1) - session.exp} EXP`));
    const life = el('div', 'k-row');
    life.append(el('span', 'k-lbl', 'Zdrowie'), el('span', 'k-val', `${hp / 2} / ${maxHp / 2} ❤`));
    s.append(life, tube(hp / maxHp, 'hp', `Zdrowie ${hp / 2} z ${maxHp / 2}`));
    s.append(rows([
      ['📈 Premia za poziom', `+${Math.round(czescPremii(lvl) * PREMIA_POZIOMU.zycie * 100)}% życia, +${Math.round((szybkoscPostaci(session.exp) - 1) * 100)}% szybkości`],
      ['🛡 Obrona', `${defense()} (${Math.round(blockChance() * 100)}% bloku)`],
    ]));
    const n = host.fruitPerHeal ?? LECZENIE_OWOCAMI.owocow;
    const canEat = totalFruit() >= n && hp < maxHp;
    const eatBtn = el('button', `c-btn${canEat ? '' : ' c-muted'}`, `🍎 Zjedz ${n} owoców → +1 ❤`) as HTMLButtonElement;
    eatBtn.disabled = !canEat;
    eatBtn.title = hp >= maxHp ? 'Masz pełne zdrowie' : `Masz ${totalFruit()} owoców`;
    eatBtn.onclick = () => {
      const now = eat();
      if (now != null) hp = now;
      render();
    };
    s.append(eatBtn);
    if (session.namioty.length && tent) {
      const tb = el('button', `c-btn${tent.ok ? '' : ' c-muted'}`, '⛺ Rozbij namiot i śpij (zapis)') as HTMLButtonElement;
      tb.disabled = !tent.ok;
      tb.onclick = () => {
        closeCharacter();
        tent.pitch();
      };
      s.append(tb);
      if (!tent.ok && tent.why) s.append(el('div', 'c-note', tent.why));
    }
    s.append(el('div', 'k-sub k-head', 'Umiejętności'));
    for (const k of availableSkills()) {
      const pr = skillProgress(k);
      const top = pr.level >= MAKS_POZIOM;
      const row = el('div', 'k-skill');
      row.append(
        el('div', 'k-skill-name', `${UMIEJETNOSCI[k].nazwa} – poziom ${pr.level}${top ? ' (maks.)' : ''}`),
        el('div', 'k-skill-info', `${top ? '' : `${pr.into}/${pr.need} do następnego · `}przerwa ${cooldown(k)} ms${k === 'magia' ? '' : ` · trafia ${Math.round(hitChance(k, false, session.level.celnosc) * 100)}%`}`),
        tube(pr.into / pr.need, 'xp', `${UMIEJETNOSCI[k].nazwa}: ${Math.round((pr.into / pr.need) * 100)}%`),
      );
      s.append(row);
    }
    return s;
  };

  // ---------------------------------------------------------------- Kufer: Zasoby
  const sectionZasoby = () => {
    const s = section('Zasoby', 'k-zasoby');
    const line = (icon: Node | string, name: string, n: number, width: number) => {
      const r = el('div', 'k-res');
      const ic = el('span', 'k-res-ic');
      ic.append(icon);
      r.append(ic, el('span', 'k-res-name', name), drums(n, width));
      return r;
    };
    const gold = line('🪙', 'Złoto', session.coins, 7);
    gold.classList.add('k-gold');
    s.append(gold);
    if (session.diamenty) {
      const pic = document.createElement('img');
      pic.src = `${import.meta.env.BASE_URL}items/diament.png`;
      s.append(line(pic, 'Diamenty', session.diamenty, 4));
    }
    s.append(line('🧪', 'Mikstury', session.mikstury, 4));
    for (const k of ownedAmmo()) {
      const pic = document.createElement('img');
      pic.src = `${import.meta.env.BASE_URL}items/${k}.png`;
      pic.className = 'k-res-pic';
      s.append(line(pic, AMUNICJA[k].nazwa, gear.ammo[k], 3));
    }
    // By group like the backpack (owner 7.10.2026: the backpack showed 24 under a carrot – all vegetables – and here
    // only 3 carrots); a tap on a group opens its kinds.
    const goods = goodsByKind();
    const pic = (url: string | undefined, alt: string) => (url ? Object.assign(document.createElement('img'), { src: url, alt: '' }) : alt);
    for (const g of Object.keys(GRUPY) as Grupa[]) {
      const kinds = (Object.keys(OWOCE) as Owoc[]).filter((f) => OWOCE[f].grupa === g && (goods[f] ?? 0) > 0);
      if (!kinds.length) continue;
      const total = kinds.reduce((a, f) => a + (goods[f] ?? 0), 0);
      const head = line(pic(host.goodsIcon?.(g) ?? host.goodsIcon?.(kinds[0]), '•'), `${GRUPY[g].nazwa}${kinds.length > 1 ? ' ▸' : ''}`, total, 4);
      s.append(head);
      if (kinds.length < 2) continue;
      head.classList.add('k-res-group');
      const list = el('div', 'k-res-kinds');
      list.hidden = !openGroups.has(g);
      if (!list.hidden) head.querySelector('.k-res-name')!.textContent = `${GRUPY[g].nazwa} ▾`;
      for (const f of kinds) {
        const name = OWOCE[f].mnoga;
        list.append(line(pic(host.goodsIcon?.(f), '•'), name[0].toUpperCase() + name.slice(1), goods[f] ?? 0, 4));
      }
      head.onclick = () => {
        list.hidden = !list.hidden;
        if (list.hidden) openGroups.delete(g);
        else openGroups.add(g);
        head.querySelector('.k-res-name')!.textContent = `${GRUPY[g].nazwa} ${list.hidden ? '▸' : '▾'}`;
      };
      s.append(list);
    }
    if (session.namioty.length) s.append(line('⛺', 'Noce w namiotach', session.namioty.reduce((a, t) => a + t.left, 0), 4));
    if (!Object.values(goods).some(Boolean)) s.append(el('div', 'k-sub', 'Plecak bez zbiorów: owoce, warzywa, grzyby i drewno pojawią się tu, gdy je zbierzesz.'));
    return s;
  };

  // ---------------------------------------------------------------- Dziennik zadań
  const pageZadania = () => {
    const s = section('Dziennik zadań');
    const quests = host.quests();
    const log = el('div', 'c-quests');
    if (!quests.length) log.append(el('div', 'c-quest', 'Brak aktywnych zadań. Zapytaj w świątyni, urzędzie, na policji albo porozmawiaj z mieszkańcami.'));
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
    s.append(log);
    body.append(s);
  };

  // ---------------------------------------------------------------- Księga osiągnięć
  const pageKsiega = () => {
    const st = session.stats;
    const zabite = Object.values(st.kills).reduce((a, b) => a + b, 0);
    const stan: StanDoOsiagniec = {
      km: st.m / 1000, zabite, gangi: st.gangs ?? 0, pojedynki: st.duels ?? 0, misje: st.missions, owoce: st.fruit,
      zarobione: st.earned, poziom: poziomPostaci(session.exp), tytul: session.story.title ?? null, hasla: st.codes,
    };
    const s = section('Księga osiągnięć');
    const seals = el('div', 'k-seals');
    let got = 0;
    for (const o of OSIAGNIECIA) {
      const ile = o.ile(stan);
      const ok = ile >= o.cel;
      if (ok) got++;
      const c = el('div', `k-seal${ok ? ' k-seal-on' : ''}`);
      c.append(el('div', 'k-seal-ic', o.ikona), el('div', 'k-seal-name', o.nazwa), el('div', 'k-seal-desc', o.opis));
      if (!ok) {
        const pr = el('div', 'k-seal-pr', `${Math.floor(Math.min(ile, o.cel)).toLocaleString('pl-PL')} / ${o.cel.toLocaleString('pl-PL')}`);
        c.append(pr);
      }
      seals.append(c);
    }
    // One seal per quest series (admin panel „Główna nazwa questa”): all its missions done.
    const series = new Map<string, { all: number; done: number }>();
    for (const m of [...MISJE, ...session.extra]) {
      if (!m.seria) continue;
      const v = series.get(m.seria) ?? { all: 0, done: 0 };
      v.all++;
      if (session.missions[m.id] === 'done') v.done++;
      series.set(m.seria, v);
    }
    for (const [name, v] of series) {
      const ok = v.done >= v.all;
      if (ok) got++;
      const c = el('div', `k-seal${ok ? ' k-seal-on' : ''}`);
      c.append(el('div', 'k-seal-ic', '⚙'), el('div', 'k-seal-name', name), el('div', 'k-seal-desc', 'Ukończ całą historię.'));
      if (!ok) c.append(el('div', 'k-seal-pr', `${v.done} / ${v.all}`));
      seals.append(c);
    }
    s.append(el('div', 'k-sub', `Zdobyte pieczęcie: ${got} z ${OSIAGNIECIA.length + series.size}`), seals);
    body.append(s);
    const t = section('Kronika');
    const kills = (Object.entries(st.kills) as [string, number][]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    t.append(rows([
      ['🚶 Przebyte', `${(st.m / 1000).toFixed(1).replace('.', ',')} km`],
      ['👹 Pokonane potwory', String(zabite)],
      ...kills.map(([k, n]) => [`   ${ENEMY_KINDS[k as keyof typeof ENEMY_KINDS]?.name ?? k}`, String(n)] as [string, string]),
      ['🏆 Rozbite gangi', String(st.gangs ?? 0)],
      ['⚔ Wygrane pojedynki', String(st.duels ?? 0)],
      ['📜 Wykonane zlecenia', String(st.missions)],
      ['🧩 Rozwiązane zagadki', String(st.riddles ?? 0)],
      ['🍎 Zebrane plony', String(st.fruit)],
      ['💰 Zarobione', `${st.earned} złota`],
      ['🛒 Wydane', `${st.spent} złota`],
    ]));
    body.append(t);
  };

  const render = () => {
    const keep = body.scrollTop;
    body.replaceChildren();
    tabs.replaceChildren();
    actions.replaceChildren();
    page = fitPage(page);
    for (const [id, icon, label] of pages()) {
      const t = el('button', `k-tab${id === page ? ' k-tab-on' : ''}`) as HTMLButtonElement;
      t.type = 'button';
      t.append(el('span', 'k-tab-ic', icon), el('span', 'k-tab-l', label));
      t.setAttribute('aria-pressed', String(id === page));
      t.onclick = () => {
        page = id;
        render();
        body.scrollTop = 0;
      };
      tabs.append(t);
    }
    if (page === 'kufer') {
      const cols = el('div', 'k-cols');
      cols.append(sectionPostac(), sectionStan(), sectionZasoby());
      body.append(cols);
    } else if (page === 'postac') body.append(sectionPostac());
    else {
      dispose?.();
      dispose = null;
      if (page === 'stan') body.append(sectionStan());
      else if (page === 'zasoby') body.append(sectionZasoby());
      else if (page === 'zadania') pageZadania();
      else pageKsiega();
    }
    body.scrollTop = keep;
    slider.update();
  };
  const slider = brassScroll(box, body);

  render();
  if (scrollTo) document.getElementById(scrollTo)?.scrollIntoView({ block: 'start' });
}

/**
 * " Atak +7 (w ręce: +4, ▲ +3)." – what the item adds, so two swords can be told apart (owner, 6 Oct 2026),
 * compared with what is worn in that place now.
 */
function statText(id: string) {
  const it = item(id);
  if (!it || !it.moc || it.miejsce === 'talizman' || it.miejsce === 'amulet') return '';
  const what = it.miejsce === 'bron'
    ? (it.rodzaj === 'magia' ? 'Moc czarów' : it.rodzaj ? 'Atak strzałem' : it.narzedzie ? 'Atak (narzędzie)' : 'Atak')
    : it.miejsce === 'dystans' ? (it.rodzaj === 'magia' ? 'Moc czarów' : 'Obrona') : 'Obrona';
  let out = ` ${what} +${it.moc}`;
  const worn = item(gear.equip[it.miejsce]);
  if (worn && worn.id !== id && (worn.rodzaj ?? '') === (it.rodzaj ?? '')) {
    const d = it.moc - worn.moc;
    out += ` (założone: +${worn.moc}${d ? `, ${d > 0 ? '▲ +' : '▼ '}${d}` : ', tyle samo'})`;
  }
  return out + '.';
}

/** " Wytrzymałość: 312/600." for things that wear out (worn, broken, glass). */
function wearText(id: string) {
  const c = condition(id);
  if (!c) return '';
  const it = item(id);
  const wears = session.level.zuzycie || it?.szklany;
  if (!wears) return ' Na tym poziomie trudności się nie zużywa.';
  return c.left <= 0 ? ' 🔧 Zepsuty – napraw go w sklepie (do tego czasu bije jak kijek).' : ` Wytrzymałość: ${c.left}/${c.max}${it?.szklany ? ' (potem pęknie)' : ''}.`;
}

/**
 * A brass slider along the trunk's right edge (owner, 6 Oct 2026: on a phone, swiping the trunk
 * fought with dragging things): a rail with a valve-wheel knob, shown only when the page doesn't fit.
 * Drag the knob or tap the rail; the page also still scrolls the usual way.
 */
function brassScroll(box: HTMLElement, body: HTMLElement) {
  const rail = el('div', 'k-rail');
  const knob = el('div', 'k-knob');
  rail.append(knob);
  box.append(rail);
  const update = () => {
    const max = body.scrollHeight - body.clientHeight;
    rail.style.display = max > 4 ? '' : 'none';
    if (max <= 4) return;
    const r = body.getBoundingClientRect(), b = box.getBoundingClientRect();
    rail.style.top = `${r.top - b.top + 6}px`;
    rail.style.height = `${r.height - 12}px`;
    const free = rail.clientHeight - knob.offsetHeight;
    knob.style.transform = `translateY(${(free * body.scrollTop) / max}px) rotate(${body.scrollTop / 2}deg)`;
  };
  const scrollToY = (clientY: number) => {
    const rr = rail.getBoundingClientRect();
    const t = (clientY - rr.top - knob.offsetHeight / 2) / Math.max(1, rr.height - knob.offsetHeight);
    body.scrollTop = Math.max(0, Math.min(1, t)) * (body.scrollHeight - body.clientHeight);
  };
  rail.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    rail.setPointerCapture(e.pointerId);
    scrollToY(e.clientY);
    const move = (ev: PointerEvent) => scrollToY(ev.clientY);
    const up = () => {
      rail.removeEventListener('pointermove', move);
      rail.removeEventListener('pointerup', up);
      rail.removeEventListener('pointercancel', up);
    };
    rail.addEventListener('pointermove', move);
    rail.addEventListener('pointerup', up);
    rail.addEventListener('pointercancel', up);
  });
  body.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  // Pictures arriving later change the height.
  new ResizeObserver(update).observe(body);
  requestAnimationFrame(update);
  return { update };
}
