import { MIEJSCA, PLECAK, UMIEJETNOSCI, MAKS_POZIOM, TALIZMANY, type Miejsce, type Umiejetnosc } from '../content/przedmioty';
import { LECZENIE_OWOCAMI, OWOCE, type Owoc } from '../content/sklepy';
import { slotCell, slotDrag, slotLabel } from './slots';
import { poziomPostaci, czescPremii, szybkoscPostaci, expNaPoziom, MAKS_POZIOM_POSTACI, PREMIA_POZIOMU } from '../content/historia';
import {
  gear, item, totalFruit, goodsLabel, availableSkills, skillProgress, skillLevel, cooldown, hitChance, defense, blockChance, equipFromBag, unequip, dropFromBag, moveThing, imbueOf, condition, goodsByKind, ownedAmmo,
} from '../inventory';
import { session } from '../quests';
import { AMUNICJA } from '../content/zuzycie';
import { BOHATEROWIE, NOWE_POSTACIE } from '../content/wyglad';
import { heroSkin } from '../sprites';
import { ENEMY_KINDS } from '../objects/Slime';
import { OSIAGNIECIA, type StanDoOsiagniec } from '../content/osiagniecia';
import { zdjecia, usunZdjecie, wyslijZdjecie } from './zdjecia';

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

// The "Kufer" (owner's spec from the 🎨 Grafika chat, 5 Oct 2026): a steampunk trunk of dark
// wood and brass over the paused, blurred world, with four tabs – Kufer (the character with
// the 9 equipment places and the backpack, Stan: level on nixie tubes, EXP and life tubes like
// the HUD's, skills; Zasoby: drum counters), Dziennik zadań (the quest log), Księga osiągnięć
// (seals from content/osiagniecia.ts + statistics) and Aparat (take a photo, the gallery kept on
// this device, ui/zdjecia.ts). Closed with the red valve, Escape or the phone's back button.

let open: HTMLDivElement | null = null;

type Page = 'kufer' | 'zadania' | 'ksiega' | 'aparat';
const PAGES: [Page, string, string][] = [
  ['kufer', '🧳', 'Kufer'],
  ['zadania', '📜', 'Dziennik zadań'],
  ['ksiega', '📖', 'Księga osiągnięć'],
  ['aparat', '📷', 'Aparat'],
];
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
  quests: () => QuestLine[];
  toggleArrow: (id: string) => void;
  /** Takes a photo ("📸 Pochwal się" card, ui/brag.ts; it lands in the Aparat gallery). */
  brag?: () => void;
  tent?: TentAction;
  /** Open here (HUD: the character button, gold → Zasoby, the quest line → the quest log). */
  page?: 'eq' | 'gold' | 'quests';
  /** A goods kind's picture (the game's own textures), for the drum counters. */
  goodsIcon?: (f: Owoc) => string | undefined;
  /** When the trunk closes. */
  onClose?: () => void;
}

export function toggleCharacter(host: CharacterHost) {
  if (open) closeCharacter();
  else {
    if (host.page) page = host.page === 'quests' ? 'zadania' : 'kufer';
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
  const scrollTo = host.page === 'gold' ? 'k-zasoby' : host.page === 'eq' ? 'k-postac' : null;
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
      hero.style.backgroundImage = `url(postacie/${heroSkin(session.look.postac, session.name).plik}.png)`;
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
          const info = `${it.nazwa}${k ? ` · ${UMIEJETNOSCI[k].nazwa.toLowerCase()} poz. ${skillLevel(k)}` : ''}${it.opis ? `: ${it.opis}` : ''}${imb ? ` ${imb.e.ikona} ${imb.e.nazwa}: jeszcze ${imb.minutes} min.` : ''}${wearText(it.id)}`;
          if (it.id === 'kijek') return ask(info, []);
          return ask(info, [['Zdejmij do plecaka', () => (unequip(at.m) ? undefined : (alertFull(), false))]]);
        }
        if (at.zone !== 'bag') return;
        const i = at.i;
        const sl = gear.bag[i];
        if (!sl) return;
        if ('goods' in sl) return ask(`${goodsLabel(sl)} – sprzedasz w sklepie${sl.goods === 'drewno' ? '' : ', zjesz przyciskiem leczenia'}.`, [['Wyrzuć', () => dropFromBag(i)]]);
        if ('esencja' in sl) return ask(slotLabel(sl), [['Wyrzuć', () => dropFromBag(i)]]);
        ask(slotLabel(sl) + wearText(sl.item), [['Załóż', () => equipFromBag(i)], ['Wyrzuć', () => dropFromBag(i)]]);
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
    const n = LECZENIE_OWOCAMI.owocow;
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
    const goods = goodsByKind();
    for (const f of Object.keys(OWOCE) as Owoc[]) {
      const n = goods[f] ?? 0;
      if (!n) continue;
      const url = host.goodsIcon?.(f);
      const icon = url ? Object.assign(document.createElement('img'), { src: url, alt: '' }) : '•';
      const name = OWOCE[f].mnoga;
      s.append(line(icon, name[0].toUpperCase() + name.slice(1), n, 4));
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
    if (!quests.length) log.append(el('div', 'c-quest', 'Brak aktywnych zadań. Zapytaj w kościele, urzędzie, na policji albo porozmawiaj z mieszkańcami.'));
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
    s.append(el('div', 'k-sub', `Zdobyte pieczęcie: ${got} z ${OSIAGNIECIA.length}`), seals);
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

  // ---------------------------------------------------------------- Aparat
  const pageAparat = () => {
    const s = section('Aparat');
    if (host.brag) {
      const b = el('button', 'c-btn k-snap', '📸 Zrób zdjęcie') as HTMLButtonElement;
      b.onclick = () => {
        const take = host.brag!;
        closeCharacter();
        take();
      };
      s.append(b);
    }
    const list = zdjecia();
    s.append(el('div', 'k-sub', list.length ? 'Twoje zdjęcia (zostają na tym urządzeniu):' : 'Nie masz jeszcze zdjęć. Zrób pierwsze – pokaże świat wokół twojej postaci, twój poziom i tytuł.'));
    const grid = el('div', 'k-photos');
    const msg = el('div', 'c-note');
    for (const z of list) {
      const f = el('figure', 'k-photo');
      const img = Object.assign(document.createElement('img'), { src: z.url, alt: z.title });
      const cap = el('figcaption', '', `${z.title} · ${new Date(z.at).toLocaleDateString('pl-PL')}`);
      const send = el('button', 'c-btn', '📤 Wyślij') as HTMLButtonElement;
      send.onclick = async () => {
        const how = await wyslijZdjecie(z);
        if (how === 'saved') msg.textContent = 'Zdjęcie zapisane – wyślij je, komu chcesz.';
      };
      const del = el('button', 'c-btn c-muted', '🗑') as HTMLButtonElement;
      del.setAttribute('aria-label', 'Usuń zdjęcie');
      del.onclick = () => {
        usunZdjecie(z.at);
        render();
      };
      const btns = el('div', 'k-photo-btns');
      btns.append(send, del);
      f.append(img, cap, btns);
      grid.append(f);
    }
    s.append(grid, msg);
    body.append(s);
  };

  const render = () => {
    const keep = body.scrollTop;
    body.replaceChildren();
    tabs.replaceChildren();
    actions.replaceChildren();
    for (const [id, icon, label] of PAGES) {
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
    } else {
      dispose?.();
      dispose = null;
      if (page === 'zadania') pageZadania();
      else if (page === 'ksiega') pageKsiega();
      else pageAparat();
    }
    body.scrollTop = keep;
  };

  render();
  if (scrollTo) document.getElementById(scrollTo)?.scrollIntoView({ block: 'start' });
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
