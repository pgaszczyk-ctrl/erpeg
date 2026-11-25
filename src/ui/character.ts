import { PROFESJE, PROFESJA, profesja } from '../content/profesje';
import { specjalnyZEkwipunku, umiejetnoscOId } from '../content/umiejetnosci';
import { ZYWIOLY } from '../content/zywioly';
import { przewijanieDotykiem } from './przewijanie';
import { naEkranie } from '../obrot';
import { collectStoryItems } from '../prolog/rewards';
import { tx, tr } from '../i18n';
import { MIEJSCA, PLECAK, UMIEJETNOSCI, MAKS_POZIOM, TALIZMANY, type Miejsce, type Umiejetnosc } from '../content/przedmioty';
import { LECZENIE_OWOCAMI, OWOCE, GRUPY, type Owoc, type Grupa } from '../content/sklepy';

/** Goods groups opened in Kufer → Zasoby (kept while the game runs). */
const openGroups = new Set<Grupa>();
import { slotCell, slotDrag, slotLabel, slotIcon, qualityDots } from './slots';
import { itemLargeUrl, rzeczUrl, itemAssetUrl } from './itemIcon';
import { poziomPostaci, czescPremii, szybkoscPostaci, expNaPoziom, MAKS_POZIOM_POSTACI, PREMIA_POZIOMU } from '../content/historia';
import {
  gear, item, weaponRequirement, powerRequirement, powerSkill, specjalnyBroni, zywiolBroni, lancuchWymaga, poziomTeraz, totalFruit, goodsLabel, availableSkills, skillProgress, skillLevel, cooldown, hitChance, defense, equipFromBag, unequip, dropFromBag, moveThing, imbueOf, condition, goodsByKind, ownedAmmo,
} from '../inventory';
import { session, stanOsiagniec, saveNow, poczatekSesji } from '../quests';
import { AMUNICJA } from '../content/zuzycie';
import { NOWE_POSTACIE } from '../content/wyglad';
import { heroSkin, BOHATER_MODUL } from '../sprites';
import { modulGracza, modulArkuszUrl } from './modulPostac';
import { heroPreviewBackground } from './heroPreview';
import { ENEMY_KINDS } from '../objects/Slime';
import { OSIAGNIECIA } from '../content/osiagniecia';
import { MISJE } from '../content/fabula';
import { prettyCode, shareCode, linkToAccount } from './codeCard';
import { pokazGdzieKliknac } from './samouczek';
import { wygladGracza, zlozPostac, losowyWyglad, fryzura as fryzuraWyg, type Wyglad } from './postacEdytor';
import { FRYZURY, SKORY_51, WLOSY_51 } from '../content/wygladPostaci';

/**
 * The character's code and, until it is done, linking it to an account (owner, 18 Oct 2026: the HUD portrait opens
 * this, so a new player finds the code there instead of a screen before the game).
 */
function kodPostaci() {
  // Owner, 18 Oct 2026: smaller, narrower, quieter; one icon on the right opens the choice (send / link an account).
  const box = el('div', 'k-kod');
  if (!session.idik) return box;
  const msg = el('div', 'k-kod-msg');
  const menu = el('div', 'k-kod-menu');
  menu.hidden = true;
  const btn = el('button', 'k-kod-btn', '📤') as HTMLButtonElement;
  btn.type = 'button';
  btn.title = 'Wyślij kod albo połącz postać z kontem';
  btn.setAttribute('aria-label', btn.title);
  const pozycja = (tekst: string, fn: () => void) => {
    const b = el('button', 'k-kod-opcja', tekst) as HTMLButtonElement;
    b.type = 'button';
    b.onclick = () => { menu.hidden = true; fn(); };
    return b;
  };
  const pokazMenu = () => {
    menu.replaceChildren(pozycja('📤 Wyślij sobie kod', () => void shareCode(session.name, session.idik)));
    if (!session.konto) menu.append(pozycja('👤 Połącz z kontem e-mail', async () => {
      msg.textContent = '';
      try {
        const email = await linkToAccount(session.name, session.idik);
        if (email === null) return;
        session.konto = true;
        msg.textContent = `✅ Połączona z kontem${email ? ' ' + email : ''}.`;
      } catch (e) {
        msg.textContent = `❌ ${(e as Error).message}`;
      }
    }));
    menu.append(pozycja('Anuluj', () => {}));
    menu.hidden = false;
  };
  btn.onclick = () => (menu.hidden ? pokazMenu() : (menu.hidden = true));
  const tekst = el('div', 'k-kod-tekst');
  // Hidden until tapped (owner, 26 Oct 2026): nobody reads it over the player's shoulder or from a screenshot.
  const kod = el('button', 'k-kod-code k-kod-ukryty', '•••• ••••') as HTMLButtonElement;
  kod.type = 'button';
  kod.title = 'Pokaż kod';
  kod.setAttribute('aria-label', 'Pokaż kod postaci');
  let widac = false;
  kod.onclick = () => {
    widac = !widac;
    kod.textContent = widac ? prettyCode(session.idik) : '•••• ••••';
    kod.classList.toggle('k-kod-ukryty', !widac);
    kod.title = widac ? 'Ukryj kod' : 'Pokaż kod';
    kod.setAttribute('aria-label', kod.title);
  };
  tekst.append(el('span', 'k-kod-title', '🔑 Kod postaci · dotknij, by pokazać'), kod);
  const row = el('div', 'k-kod-row');
  row.append(tekst, btn);
  box.append(row, menu, msg);
  return box;
}

// The "Kufer" (owner's spec from the 🎨 Grafika chat, 5 Oct 2026): a steampunk trunk of dark
// wood and brass over the paused, blurred world. On a computer three tabs – Kufer (three columns:
// Postać – the 9 equipment places and the backpack; Stan – level on nixie tubes, EXP and life tubes
// like the HUD's, skills; Zasoby – drum counters), Dziennik zadań (the quest log) and Księga
// osiągnięć (seals from content/osiagniecia.ts + statistics). On a phone the three columns are
// tabs of their own (owner, 6 Oct 2026: scrolling down the trunk was a pain), and what still
// doesn't fit scrolls with a brass slider on the right (`brassScroll`). The camera is only the
// HUD's button (ui/brag.ts showPhoto). Closed with the brass ✕ button, Escape or the phone's back button.

let open: HTMLDivElement | null = null;

type Page = 'kufer' | 'postac' | 'wyglad' | 'stan' | 'zasoby' | 'zadania' | 'ksiega';
/** Narrow screens (the trunk's three columns would stack): each column gets a tab of its own. */
const narrow = () => window.matchMedia('(max-width: 960px)').matches;
const pages = (): [Page, string, string][] =>
  narrow()
    ? [['postac', '🎒', 'Postać'], ['wyglad', '✂️', 'Wygląd'], ['stan', '⚙️', 'Statystyki'], ['zadania', '📜', 'Dziennik'], ['ksiega', '📖', 'Księga']]
    : [['kufer', '🧳', 'Kufer'], ['wyglad', '✂️', 'Wygląd'], ['zadania', '📜', 'Dziennik zadań'], ['ksiega', '📖', 'Księga osiągnięć']];
/** The same page on the current screen width (Kufer ↔ Postać/Stan/Zasoby). */
// Owner, 27 Oct 2026: Statystyki and Zasoby left too much empty room as separate tabs – on narrow
// screens they share one tab, side by side when there is room (`.k-cols2`), else one under the other.
const fitPage = (p: Page): Page => (narrow() ? (p === 'kufer' ? 'postac' : p === 'zasoby' ? 'stan' : p) : p === 'postac' || p === 'stan' || p === 'zasoby' ? 'kufer' : p);
/** Removes the drag listeners of the equipment. */
let dispose: (() => void) | null = null;
/** Removes the finger scrolling of the trunk's page (ui/przewijanie.ts). */
let odepnijPrzewijanie: (() => void) | null = null;
/** The page shown last (the trunk opens there again). */
let page: Page = 'kufer';
/** Called once when the trunk closes (the world goes on). */
let closed: (() => void) | null = null;
/** Our entry in the browser history (the phone's back button closes the trunk). */
let historyEntry = false;
/** Closes the spotlight on the code (first visit without an account). */
let zamknijPokaz: (() => void) | null = null;
const POKAZANY_KOD = 'exp-kod-pokazany:';

export function isCharacterOpen() {
  return !!open;
}

const onBack = () => {
  historyEntry = false;
  closeCharacter();
};

export function closeCharacter() {
  if (!open) return;
  zamknijPokaz?.();
  zamknijPokaz = null;
  dispose?.();
  dispose = null;
  odepnijPrzewijanie?.();
  odepnijPrzewijanie = null;
  open.remove();
  open = null;
  window.removeEventListener('popstate', onBack);
  if (historyEntry) {
    historyEntry = false;
    history.back();
  }
  if (wygladZmieniony) {
    wygladZmieniony = false;
    void saveNow(hpPrzyZamknieciu()).catch(() => { /* saved with the next save point */ });
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
  showQuestOnMap?: (id: string) => void;
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

// ---------------------------------------------------------------- the editor figure (pack 51)
/** The look was changed in this opening of the trunk (saved quietly when it closes). */
let wygladZmieniony = false;
let hpPrzyZamknieciu = () => session.hp;

/** The hero's big figure (recoloured artist's layers) drawn into a canvas inside `box`. */
function wstawPostac(box: HTMLElement, w: Wyglad = wygladGracza(session.look, session.name)) {
  const c = document.createElement('canvas');
  c.className = 'k-wyg-plotno';
  c.width = 384;
  c.height = 576;
  c.setAttribute('role', 'img');
  c.setAttribute('aria-label', tx('Twoja postać', 'Your character'));
  box.classList.add('k-dag-modul');
  box.append(c);
  void zlozPostac(w).then((cala) => {
    if (!cala || !c.isConnected) return;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(cala, 0, 0, c.width, c.height);
  });
  return true;
}

/** Saves the editor's choice in the look (also the copy the test server keeps for saving) and redraws the hero. */
function ustawWyglad(w: Wyglad) {
  const wyg = { f: w.f, w: w.w, s: w.s };
  session.look = { ...session.look, wyg };
  session.productionLook = { ...session.productionLook, wyg };
  wygladZmieniony = true;
  (window as unknown as { __game?: { events: { emit: (e: string) => void } } }).__game?.events.emit('hero-look');
}

/** The „Wygląd” tab: the big figure and three choices (hairstyle, hair colour, skin) plus a random draw. */
function stronaWygladu(render: () => void) {
  const s = el('section', 'k-well k-wyg');
  s.append(el('div', 'k-plate', tx('Wygląd', 'Look')));
  const w = wygladGracza(session.look, session.name);
  const row = el('div', 'k-wyg-row');
  const ramka = el('div', 'k-wyg-ramka');
  wstawPostac(ramka, w);
  const ster = el('div', 'k-wyg-ster');
  const fr = FRYZURY[w.p];
  const wybor = (nazwa: string, wartosc: string, probka: string | null, krok: (d: number) => Wyglad, cls: string) => {
    const r = el('div', `k-wyg-wybor ${cls}`);
    const lewo = el('button', 'c-btn k-wyg-strz', '◀') as HTMLButtonElement;
    const prawo = el('button', 'c-btn k-wyg-strz', '▶') as HTMLButtonElement;
    lewo.type = prawo.type = 'button';
    lewo.setAttribute('aria-label', `${nazwa}: ${tx('poprzedni', 'previous')}`);
    prawo.setAttribute('aria-label', `${nazwa}: ${tx('następny', 'next')}`);
    lewo.onclick = () => { ustawWyglad(krok(-1)); render(); };
    prawo.onclick = () => { ustawWyglad(krok(1)); render(); };
    const srodek = el('div', 'k-wyg-opis');
    srodek.append(el('div', 'k-wyg-nazwa', nazwa));
    const v = el('div', 'k-wyg-wart');
    if (probka) { const p = el('span', 'k-wyg-probka'); p.style.background = probka; v.append(p); }
    v.append(document.createTextNode(wartosc));
    srodek.append(v);
    r.append(lewo, srodek, prawo);
    return r;
  };
  const kolo = (i: number, d: number, n: number) => (i + d + n) % n;
  const fi = Math.max(0, fr.findIndex((x) => x.id === w.f));
  ster.append(
    wybor(tx('Fryzura', 'Hairstyle'), fryzuraWyg(w.p, w.f).nazwa(), null, (d) => ({ ...w, f: fr[kolo(fi, d, fr.length)].id }), 'k-wyg-fryzura'),
    wybor(tx('Kolor włosów', 'Hair colour'), WLOSY_51[w.w].nazwa(), WLOSY_51[w.w].hex, (d) => ({ ...w, w: kolo(w.w, d, WLOSY_51.length) }), 'k-wyg-wlosy'),
    wybor(tx('Kolor skóry', 'Skin colour'), SKORY_51[w.s].nazwa(), SKORY_51[w.s].hex, (d) => ({ ...w, s: kolo(w.s, d, SKORY_51.length) }), 'k-wyg-skora'),
  );
  const los = el('button', 'c-btn k-wyg-los', tx('🎲 Losuj', '🎲 Random')) as HTMLButtonElement;
  los.type = 'button';
  los.onclick = () => { ustawWyglad({ p: w.p, ...losowyWyglad(w.p) }); render(); };
  ster.append(los, el('div', 'k-sub k-wyg-uwaga', tx('Zbroja i hełm zakryją strój i włosy w świecie gry.', 'Armour and helmets cover the clothes and hair in the world.')));
  row.append(ramka, ster);
  s.append(row);
  return s;
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
  wygladZmieniony = false;
  hpPrzyZamknieciu = () => hp;
  const { maxHp, onChange, eat, tent } = host;
  const scrollTo = host.page === 'gold' ? 'k-zasoby' : null;
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
  // A plain ✕ on brass (owner, 18 Oct 2026: the red valve wasn't understood as „close”).
  valve.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  valve.onclick = closeCharacter;
  top.append(tabs, valve);
  const body = el('div', 'k-body');
  box.append(top, el('div', 'k-pipe'), body);
  odepnijPrzewijanie?.();
  odepnijPrzewijanie = przewijanieDotykiem(body);
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

  // The card of the thing tapped (cream paper), always the same height so nothing jumps. The title can be plain
  // text or a built-up card (itemCard: icon + name, then stat rows, then the description) – owner, 26 Oct 2026:
  // one packed sentence ("Nazwa · umiejętność: opis Atak +N (założone: ...). Wytrzymałość: ...") was unreadable.
  const actions = el('div', 'c-actions k-card');
  const ask = (title: string | Node, choices: [string, () => boolean | void][]) => {
    actions.replaceChildren(typeof title === 'string' ? el('div', 'c-actions-title', title) : title);
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
  const section = (title: string, id?: string) => {
    const s = el('section', 'k-well');
    if (id) s.id = id;
    s.append(el('div', 'k-plate', title));
    return s;
  };

  // ---------------------------------------------------------------- Kufer: Postać
  /** The hero as a sepia daguerreotype in an arched brass frame (equipment page, bigger on the look page). */
  const dagerotyp = () => {
    const frame = el('div', 'k-dag');
    const pic = el('div', 'k-dag-pic');
    if (NOWE_POSTACIE && wstawPostac(pic)) {
      // the editor figure (pack 51) – drawn in wstawPostac
    } else if (NOWE_POSTACIE) {
      // The standing frame facing us (column 2, row 1 of the artist's 3×3 sheet).
      const hero = el('div', 'k-dag-hero');
      // Modular heroes show their real colours: no sepia (41-G003 – it changed the skin/hair the player picked).
      if (BOHATER_MODUL && session.look.modul) pic.classList.add('k-dag-modul');
      if (BOHATER_MODUL && session.look.modul) void modulArkuszUrl(modulGracza(session.look, session.name)).then((u) => { if (hero.isConnected) hero.style.backgroundImage = `url(${u})`; });
      else heroPreviewBackground(hero, heroSkin(session.look.postac, session.name).plik);
      pic.append(hero);
    }
    pic.setAttribute('role', 'img');
    pic.setAttribute('aria-label', 'Twoja postać');
    frame.append(pic);
    return frame;
  };


  const sectionPostac = () => {
    const s = section('Postać', 'k-postac');
    // Phones held sideways (owner, 26 Oct 2026): the hero on the left, the backpack on the right – one column only
    // on tall screens. The look controls go above the hero, the item card under the backpack.
    const lewa = el('div', 'k-lewa');
    const prawa = el('div', 'k-prawa');
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
    const frame = dagerotyp();
    doll.append(left, frame, right);
    const tal = el('div', 'k-tal');
    for (const m of ['talizman', 'talizman2', 'talizman3'] as Miejsce[]) tal.append(cell(m));
    const bag = el('div', 'sl-grid sl-bag');
    for (let i = 0; i < PLECAK.miejsc; i++) bag.append(slotCell(gear.bag[i] ?? null, { zone: 'bag', i }));
    lewa.append(doll, tal);
    const glowkaPlecaka = el('div', 'k-bag-head');
    glowkaPlecaka.append(el('div', 'k-sub', `Plecak ${gear.bag.length}/${PLECAK.miejsc}`));
    const pending = session.story.prolog?.pendingRewards;
    if (pending?.length) {
      const odbierz = el('button', 'c-btn', tx(`Odbierz depozyt (${pending.length})`, `Collect stored items (${pending.length})`)) as HTMLButtonElement;
      odbierz.onclick = async () => {
        odbierz.disabled = true;
        collectStoryItems(session.story.prolog!,gear,PLECAK.miejsc);
        host.onChange();
        try { await saveNow(session.hp); render(); }
        catch { odbierz.disabled = false; odbierz.textContent = tx('Ponów zapis depozytu', 'Retry saving stored items'); }
      };
      glowkaPlecaka.append(odbierz);
    }
    prawa.append(glowkaPlecaka, bag);
    wrap.append(lewa, prawa, actions);
    s.append(wrap, el('div', 'c-note k-podpowiedz', 'Przeciągaj rzeczy, żeby je założyć, zdjąć albo zamienić; esencję przeciągnij na broń.'));
    // Gear you use rather than wear (owner, 18 Oct 2026: moved here from Statystyki).
    // The own tent: a small button by the backpack's label (owner, 26 Oct 2026: the page mustn't scroll); when it
    // can't go up here, a tap says why on the item card.
    if (session.namioty.length && tent) {
      const tb = el('button', `c-btn k-namiot${tent.ok ? '' : ' c-muted'}`, '⛺ Śpij w namiocie') as HTMLButtonElement;
      tb.type = 'button';
      tb.title = 'Rozbij namiot i śpij (zapis)';
      tb.onclick = () => {
        if (!tent.ok) return ask(tent.why || 'Tu nie rozbijesz namiotu.', []);
        closeCharacter();
        tent.pitch();
      };
      glowkaPlecaka.append(tb);
    }

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
          if (it.id === 'kijek') return ask(itemCard(it.id), []);
          return ask(itemCard(it.id), [['Zdejmij do plecaka', () => (unequip(at.m) ? undefined : (alertFull(), false))]]);
        }
        if (at.zone !== 'bag') return;
        const i = at.i;
        const sl = gear.bag[i];
        if (!sl) return;
        if ('goods' in sl) return ask(`${goodsLabel(sl)} – sprzedasz w sklepie${sl.goods === 'drewno' || sl.goods === 'surowce' ? '' : ', zjesz przyciskiem leczenia'}.`, [['Wyrzuć', () => dropFromBag(i)]]);
        if ('esencja' in sl) return ask(slotLabel(sl), [['Wyrzuć', () => dropFromBag(i)]]);
        ask(itemCard(sl.item), item(sl.item)?.pojazd || item(sl.item)?.leczenie
          ? [['Wyrzuć', () => dropFromBag(i)]]
          : [...(weaponRequirement(sl.item) ? [] : [['Załóż', () => equipFromBag(i)] as [string, () => void]]), ['Wyrzuć', () => dropFromBag(i)]]);
      },
    });
    if (gear.equip.bron) ask(itemCard(gear.equip.bron), []);
    return s;
  };

  // ---------------------------------------------------------------- Kufer: Stan
  const sectionStan = () => {
    const s = section('Statystyki');
    // The character's code lives here (owner, 18 Oct 2026), not on the equipment page.
    s.append(kodPostaci());
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
    // Profession (report #25): chosen at the guard chief from level PROFESJA.odPoziomu.
    lvInfo.append(el('span', 'k-titleline', profesja.id ? `${PROFESJE[profesja.id].ikona} ${tr(PROFESJE[profesja.id].nazwa)}` : lvl >= PROFESJA.odPoziomu ? ((session.flagi.sluzby ?? 0) >= PROFESJA.sluzb ? tx('🛡 Profesja: wybierz u szefa straży', '🛡 Profession: choose at the guard chief') : tx(`🛡 Profesja: najpierw ${PROFESJA.sluzb - (session.flagi.sluzby ?? 0)} zlecenia straży (posterunek)`, `🛡 Profession: first ${PROFESJA.sluzb - (session.flagi.sluzby ?? 0)} guard assignments (guard post)`)) : tx(`🛡 Profesja od ${PROFESJA.odPoziomu}. poziomu`, `🛡 Profession from level ${PROFESJA.odPoziomu}`)));
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
      ['🛡 Pancerz', String(defense())],
    ]));
    // Hunt analyser: this play session's gains (EXP per hour, gold earned, creatures beaten).
    if (poczatekSesji.t) {
      const h = Math.max(1 / 60, (Date.now() - poczatekSesji.t) / 3_600_000);
      const e = session.exp - poczatekSesji.exp, g = session.stats.earned - poczatekSesji.earned;
      const k = Object.values(session.stats.kills).reduce((a, b) => a + b, 0) - poczatekSesji.kills;
      s.append(el('div', 'k-sub', tx('Ta sesja', 'This session')), rows([
        [tx('⏱ Czas gry', '⏱ Play time'), `${Math.floor(h)} h ${Math.round((h % 1) * 60)} min`],
        [tx('✨ Doświadczenie', '✨ Experience'), `+${e} EXP (${Math.round(e / h)}/h)`],
        [tx('💰 Zarobione złoto', '💰 Gold earned'), `+${g} (${Math.round(g / h)}/h)`],
        [tx('⚔ Pokonane stwory', '⚔ Creatures beaten'), String(k)],
      ]));
    }
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
      pic.src = `${import.meta.env.BASE_URL}${itemAssetUrl('diament')}`;
      s.append(line(pic, 'Diamenty', session.diamenty, 4));
    }
    const obrazek = (url: string | null, zast: string) => (url ? Object.assign(document.createElement('img'), { src: url, alt: '' }) : zast);
    s.append(line(obrazek(rzeczUrl('mikstura'), '🧪'), 'Mikstury', session.mikstury, 4));
    for (const k of ownedAmmo()) {
      const pic = document.createElement('img');
      pic.src = `${import.meta.env.BASE_URL}${itemAssetUrl(k)}`;
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
    if (session.namioty.length) s.append(line(obrazek(rzeczUrl('namiot'), '⛺'), 'Noce w namiotach', session.namioty.reduce((a, t) => a + t.left, 0), 4));
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
        if (host.showQuestOnMap) {
          const mapButton = el('button', 'c-btn', tx('Pokaż na mapie', 'Show on map'));
          mapButton.onclick = () => host.showQuestOnMap?.(q.id);
          txt.append(mapButton);
        }
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
    const stan = stanOsiagniec();
    const zabite = stan.zabite;
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
      t.dataset.strona = id;
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
    else if (page === 'wyglad') { dispose?.(); dispose = null; body.append(stronaWygladu(render)); }
    else {
      dispose?.();
      dispose = null;
      if (page === 'stan') {
        const cols = el('div', 'k-cols2');
        cols.append(sectionStan(), sectionZasoby());
        body.append(cols);
      }
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
  if (!pokazKodRaz(render)) pokazWygladRaz();
}

/**
 * Owner, 25 Nov 2026: a new character's look is random; the first time the trunk opens, the „Wygląd” tab lights
 * up so the player learns where to change the hairstyle and colours.
 */
function pokazWygladRaz() {
  if (session.immortal || page === 'wyglad') return;
  const klucz = 'exp-wyglad-pokazany:' + session.name.toLowerCase();
  try {
    if (localStorage.getItem(klucz)) return;
    localStorage.setItem(klucz, '1');
  } catch { return; }
  window.setTimeout(() => {
    const tab = open?.querySelector<HTMLButtonElement>('.k-tab[data-strona="wyglad"]');
    if (!open || !tab) return;
    const zamknij = pokazGdzieKliknac('#character .k-tab[data-strona="wyglad"]',
      tx('Tu zmienisz wygląd postaci: fryzurę, kolor włosów i kolor skóry.', 'Change your character\'s look here: hairstyle, hair colour and skin colour.'),
      () => { zamknij(); zamknijPokaz = null; tab.click(); },
      () => { zamknij(); zamknijPokaz = null; });
    zamknijPokaz = zamknij;
  }, 350);
}

/**
 * Owner, 26 Oct 2026: the first time a character without an account opens the trunk, everything goes dark but the
 * button that shows and sends the code – one may play without signing in, but must keep the code somewhere.
 */
function pokazKodRaz(render: () => void): boolean {
  if (session.konto || !session.idik || session.immortal) return false;
  const klucz = POKAZANY_KOD + session.name.toLowerCase();
  try {
    if (localStorage.getItem(klucz)) return false;
    localStorage.setItem(klucz, '1');
  } catch { /* no storage: show it every time is worse than never – skip */ return false; }
  if (narrow() && page !== 'stan') {
    page = 'stan';
    render();
  }
  const btn = () => open?.querySelector<HTMLButtonElement>('.k-kod-btn') ?? null;
  btn()?.scrollIntoView({ block: 'center' });
  window.setTimeout(() => {
    if (!open || !btn()) return;
    const zamknij = pokazGdzieKliknac('#character .k-kod-btn',
      'Grasz bez konta – zapisz sobie kod postaci! Tu go zobaczysz, wyślesz sobie albo połączysz postać z e-mailem lub Google.',
      () => { zamknij(); zamknijPokaz = null; btn()?.click(); },
      () => { zamknij(); zamknijPokaz = null; });
    zamknijPokaz = zamknij;
  }, 350);
  return true;
}

/** A label/value list, one stat per row (the shop's item card uses the same pattern: `dl.s26-stats`). */
function rows(list: ([string, string] | [string, string, string])[]) {
  const out = el('div', 'c-statlist');
  for (const [k, v, cls] of list) {
    const row = el('div', cls ? `c-stat ${cls}` : 'c-stat');
    row.append(el('span', 'c-stat-k', k), el('span', 'c-stat-v', v));
    out.append(row);
  }
  return out;
}

/**
 * "Atak" +7, compared with what is worn in that place now – its own row, so two swords can be told apart
 * (owner, 6 Oct 2026) without reading one packed sentence (owner, 26 Oct 2026: "bardzo nieczytelne").
 */
function statRows(id: string): [string, string][] {
  const it = item(id);
  if (!it || it.miejsce === 'talizman' || it.miejsce === 'amulet') return [];
  if (it.obrazenia) {
    const rows: [string, string][] = [['Obrażenia broni', it.obrazenia.join('–')]];
    const worn = item(gear.equip[it.miejsce]);
    if (worn?.obrazenia && worn.id !== it.id) rows.push(['Masz założone', worn.obrazenia.join('–')]);
    return rows;
  }
  const what = it.miejsce === 'bron'
    ? (it.rodzaj === 'magia' ? 'Moc czarów' : it.rodzaj ? 'Atak strzałem' : it.narzedzie ? 'Atak (narzędzie)' : 'Atak')
    : it.miejsce === 'dystans' ? (it.rodzaj === 'magia' ? 'Moc czarów' : 'Pancerz') : 'Pancerz';
  const out: [string, string][] = [[what, what === 'Pancerz' ? String(it.moc) : `+${it.moc}`]];
  const worn = item(gear.equip[it.miejsce]);
  if (worn && worn.id !== id && (worn.rodzaj ?? '') === (it.rodzaj ?? '')) {
    const d = it.moc - worn.moc;
    out.push(['Masz założone', `${what === 'Pancerz' ? '' : '+'}${worn.moc}${d ? ` (${d > 0 ? '▲ +' : '▼ '}${d})` : ', tyle samo'}`]);
  }
  return out;
}

/** "Wytrzymałość" 312/600 – its own row, for things that wear out (worn, broken, glass). */
function wearRow(id: string): [string, string] | null {
  const c = condition(id);
  if (!c) return null;
  const it = item(id);
  const wears = session.level.zuzycie || it?.szklany;
  if (!wears) return ['Wytrzymałość', 'nie zużywa się na tym poziomie'];
  return c.left <= 0
    ? ['Wytrzymałość', '🔧 zepsuty – napraw w sklepie (do tego czasu bije jak kijek)']
    : ['Wytrzymałość', `${c.left} / ${c.max}${it?.szklany ? ' (potem pęknie)' : ''}`];
}

/**
 * The item's card: icon + name up top, then every stat on its own row (attack/defence vs. what's worn, the
 * skill it trains, durability, an imbued essence), the description last as plain text (owner, 26 Oct 2026:
 * the old single packed sentence – name, comma, a stat +1, a value – was unreadable; this is the same
 * icon/name/stats/description layout the HTML shop already uses for its item card).
 */
function itemCard(id: string) {
  const it = item(id);
  const card = el('div', `c-card-body${it && ['bron', 'zbroja', 'helm', 'buty'].includes(it.miejsce) ? ' weapon-card' : ''}`);
  const head = el('div', 'c-card-head');
  const icon = el('span', 'c-card-icon');
  icon.append(slotIcon({ item: id }));
  // Big item card: the artist's 256 px picture instead of enlarging the 64 px icon (order 45).
  const big = card.classList.contains('weapon-card') ? itemLargeUrl(id) : null;
  const pic = icon.querySelector('img');
  if (big && pic && big !== pic.getAttribute('src')) { pic.src = big; pic.classList.add('item-hd'); }
  if (it?.jakosc !== undefined) { const dots = qualityDots(id); if (dots) icon.append(dots); }
  head.append(icon, el('div', 'c-card-name', it?.nazwa ?? id));
  card.append(head);
  const list: ([string, string] | [string, string, string])[] = statRows(id);
  const k = skillOfItem(id);
  // Unmet requirement = the row itself in red (owner, 3 Nov 2026: no "za niski poziom" sentence).
  if (it?.wymaganyPoziom) list.push(['Wymaga poziomu:', String(it.wymaganyPoziom), ...(poziomTeraz() < it.wymaganyPoziom ? ['brak'] : [])] as [string, string] | [string, string, string]);
  if (k && it?.miejsce === 'bron') {
    const n = it.wymaganySkill ?? 1;
    list.push([`Wymaga ${UMIEJETNOSCI[k].dopelniacz}:`, String(n), ...(skillLevel(k) < n ? ['brak'] : [])] as [string, string] | [string, string, string]);
  }
  // The special attack comes from the equipment (owner, 24 Nov 2026): what this item gives, or – for the weapon in
  // hand – what the hand + second hand give together right now.
  if (it?.miejsce === 'bron' && k) {
    const druga = gear.equip.bron === id ? gear.equip.dystans : null;
    list.push(['Atak specjalny', umiejetnoscOId(specjalnyBroni(id) ?? specjalnyZEkwipunku(k, druga)).nazwa]);
  } else if (it?.miejsce === 'dystans') {
    const reka = gear.equip.bron ? skillOfItem(gear.equip.bron) : null;
    const z = it.rodzaj === 'magia' ? 'magia' : 'miecz';
    if (z === 'miecz' || !reka || reka === z) list.push(['Atak specjalny', umiejetnoscOId(specjalnyZEkwipunku(z, id)).nazwa]);
  }
  // The item's own power (glow, lightning, the blows' element, its own special): from skill N (red until then).
  const moce = [
    ...(it?.efekt && MOCE[it.efekt] ? [MOCE[it.efekt]] : []),
    ...(it?.zywiol ? [`ciosy: ${ZYWIOLY[it.zywiol].ikona} ${ZYWIOLY[it.zywiol].nazwa.toLowerCase()}`] : []),
    ...(it?.specjalny ? [umiejetnoscOId(it.specjalny).nazwa] : []),
  ];
  if (it && moce.length && it.miejsce !== 'talizman' && (it.mocWymaga || it.zywiol || it.efekt === 'pioruny' || it.efekt === 'swiatlo')) {
    const ps = powerSkill(id);
    list.push([it.mocWymaga ? `Moc od ${UMIEJETNOSCI[ps].dopelniacz} ${it.mocWymaga}` : 'Moc', moce.join(' · '), ...(powerRequirement(id) ? ['brak'] : [])] as [string, string, string] | [string, string]);
  }
  if (it?.lancuch) list.push([`Łańcuch piorunów od ${UMIEJETNOSCI.magia.dopelniacz} ${it.lancuch.magia}`, `${Math.round(it.lancuch.szansa * 100)}% ciosów`, ...(lancuchWymaga(id) ? ['brak'] : [])] as [string, string, string] | [string, string]);
  const w = wearRow(id);
  if (w) list.push(w);
  const imb = imbueOf(id);
  if (imb) list.push([`${imb.e.ikona} ${imb.e.nazwa}`, `jeszcze ${imb.minutes} min`]);
  // What the blows carry right now (essence, else the weapon's own power), for the weapon in hand.
  if (it?.miejsce === 'bron' && gear.equip.bron === id) { const z = zywiolBroni(id) ?? (it.rodzaj === 'magia' ? 'magia' : 'fizyczny'); list.push(['Żywioł ciosów', `${ZYWIOLY[z].ikona} ${ZYWIOLY[z].nazwa}`]); }
  if (list.length) card.append(rows(list));
  if (it?.opis) card.append(el('div', 'c-card-desc', it.opis));
  if (it?.leczenie) card.append(el('div', 'c-card-desc', `Leczy: +${it.leczenie} ${it.leczenie === 1 ? 'serce' : it.leczenie < 5 ? 'serca' : 'serc'}. Zużywane po miksturach i jadalnych zbiorach.`));
  return card;
}

/** Names of item powers on the item card. */
const MOCE: Record<string, string> = { swiatlo: 'świeci (widać dalej)', pioruny: 'pioruny', szczescie: 'szczęście', szybkosc: 'szybkość', zycie: 'życie', celnosc: 'celność', obrona: 'obrona' };

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
  // In the page's own coordinates (obrot.ts: an upright phone shows the page turned, screen Y isn't the rail's axis).
  const scrollToY = (y: number) => {
    const free = Math.max(1, rail.clientHeight - knob.offsetHeight);
    let top = 0;
    for (let n: HTMLElement | null = rail; n; n = n.offsetParent as HTMLElement | null) top += n.offsetTop;
    const t = (y - top - knob.offsetHeight / 2) / free;
    body.scrollTop = Math.max(0, Math.min(1, t)) * (body.scrollHeight - body.clientHeight);
  };
  rail.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    rail.setPointerCapture(e.pointerId);
    scrollToY(naEkranie(e.clientX, e.clientY).y);
    const move = (ev: PointerEvent) => scrollToY(naEkranie(ev.clientX, ev.clientY).y);
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
