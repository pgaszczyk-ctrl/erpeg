import './shop.css';
import { session } from '../quests';
import { gear, goodsN, ownedAmmo } from '../inventory';
import { PLECAK } from '../content/przedmioty';
import { AMUNICJA, STRZALY } from '../content/zuzycie';
import { slotIcon, slotLabel } from './slots';
import type { DialogRequest } from '../scenes/GameScene';
import type { ShopCategory, ShopEntry } from './shopData';

const categories: [ShopCategory, string, string][] = [
  ['all', 'Wszystko', 'miecz_mosiezny'], ['weapons', 'Broń', 'zelazny'],
  ['armour', 'Ochrona', 'tarcza_okuta'], ['supplies', 'Wyposażenie', 'siekiera'],
  ['ammo', 'Amunicja', 'strzaly'], ['magic', 'Magia', 'ksiega'], ['services', 'Usługi', 'ogniwo'],
];
const number = (n: number) => n.toLocaleString('pl-PL');
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') {
  const e = document.createElement(tag); e.className = cls; e.textContent = text; return e;
}
function image(url: string, cls = '') {
  const img = el('img', cls); img.src = url; img.alt = ''; img.draggable = false; return img;
}
function button(text: string, cls: string, fn: () => void) {
  const b = el('button', cls, text); b.type = 'button'; b.onclick = fn; return b;
}
/** A small geometric tent for goods whose commissioned art has not arrived yet. */
function fallback(entry: ShopEntry) {
  if (entry.id.startsWith('tent:')) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 32 32'); svg.setAttribute('aria-hidden', 'true');
    // Code-drawn placeholder, matching the existing brass/cloth colours.
    svg.innerHTML = '<path d="M3 27 16 5 29 27Z" fill="#bc8750" stroke="#251b16" stroke-width="2"/><path d="M16 5 16 27 24 27Z" fill="#67402b"/><path d="M9 27 16 15 21 27Z" fill="#30221c"/><path d="M1 28H31M16 3V6" stroke="#d7b66b" stroke-width="2"/>';
    return svg;
  }
  return image(`items/${entry.category === 'magic' ? 'ksiega' : 'ogniwo'}.png`);
}

export interface ShopHandle {
  revision: number;
  lastIndex: number;
  update: (d: DialogRequest) => void;
  message: (text: string) => void;
  destroy: () => void;
}

export function showShop(initial: DialogRequest, choose: (i: number) => void): ShopHandle {
  let request = initial;
  let selected = request.shop!.entries[0]?.id;
  let category: ShopCategory = 'all';
  let viewingBag: number | null = null;
  let message = '';
  let historyEntry = true;
  let lastAction = 0;
  const previouslyFocused = document.activeElement as HTMLElement | null;
  const root = el('div', 'm-screen s26-screen'); root.id = 'shop';
  const box = el('section', 's26-box'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', 's26-title'); root.append(box); document.body.append(root);
  history.pushState({ ...history.state, expShop: true }, '');
  const back = () => { historyEntry = false; choose(handle.lastIndex); };
  window.addEventListener('popstate', back);

  const render = () => {
    const data = request.shop!;
    const focusKey = (document.activeElement as HTMLElement)?.dataset.focus;
    const scroll = box.querySelector('.s26-stock')?.scrollTop ?? 0;
    const bagOpen = box.querySelector<HTMLDetailsElement>('.s26-backpack')?.open;
    box.replaceChildren();
    const head = el('header', 's26-head');
    const title = el('h2', '', request.title.replace(/^[^\p{L}\p{N}]+/u, '')); title.id = 's26-title';
    const close = button('×', 's26-close', () => choose(handle.lastIndex)); close.setAttribute('aria-label', 'Zamknij sklep'); close.dataset.focus = 'close';
    head.append(title, close);
    const bar = el('div', 's26-bar');
    const tabs = el('div', 's26-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Kupowanie i sprzedaż');
    const selling = request.tabs?.active === 1;
    ['KUPUJ', 'SPRZEDAJ'].forEach((name, i) => {
      const b = button(name, `s26-tab${Number(selling) === i ? ' on' : ''}`, () => { if (Number(selling) !== i) choose(-1 - i); });
      b.dataset.focus = `tab:${i}`; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(Number(selling) === i));
      b.disabled = i === 1 && !request.tabs; if (b.disabled) b.title = 'To miejsce nie prowadzi skupu';
      tabs.append(b);
    });
    const money = el('div', 's26-money');
    const gold = el('span'); gold.append(image('hud/zloto_16.png'), el('span', 's26-digits', number(session.coins)));
    const diamonds = el('span'); diamonds.append(image('items/diament.png'), el('span', 's26-digits', number(session.diamenty)));
    money.append(gold, diamonds); money.setAttribute('aria-label', `${session.coins} monet, ${session.diamenty} diamentów`);
    bar.append(tabs, money);
    const subtitle = el('p', 's26-subtitle', data.subtitle);
    const body = el('div', 's26-body');
    const left = el('div', 's26-left');
    const banner = el('picture', 's26-banner');
    const mobile = el('source'); mobile.media = '(max-width: 700px)'; mobile.srcset = `sklepy/${data.banner}_telefon.png`;
    const bannerImg = image(`sklepy/${data.banner}_poziomy.png`); bannerImg.alt = data.banner === 'decathlon' ? 'Decathlon wypalony w drewnianym szyldzie' : 'Kupiec przy swoim towarze';
    banner.append(mobile, bannerImg); left.append(banner);
    const assortment = el('section', 's26-assortment');
    assortment.append(el('h3', '', selling ? 'Skup' : 'Asortyment'));
    const row = el('div', 's26-stock-row');
    const filters = el('nav', 's26-categories'); filters.setAttribute('aria-label', 'Kategorie towarów');
    const available = categories.filter(([c]) => c === 'all' || data.entries.some(e => e.category === c));
    if (!available.some(([c]) => c === category)) category = 'all';
    const entries = data.entries.filter(e => category === 'all' || e.category === category);
    if (!entries.some(e => e.id === selected)) selected = entries[0]?.id;
    available.forEach(([id, name, pic]) => {
      const b = button('', `s26-category${category === id ? ' on' : ''}`, () => { category = id; viewingBag = null; render(); });
      b.dataset.focus = `category:${id}`; b.setAttribute('aria-label', name); b.setAttribute('aria-pressed', String(category === id)); b.title = name;
      b.append(image(`items/${pic}.png`)); filters.append(b);
    });
    const stock = el('div', 's26-stock');
    entries.forEach(entry => {
      const b = button('', `s26-cell${entry.id === selected && viewingBag === null ? ' selected' : ''}`, () => {
        selected = entry.id; viewingBag = null; render();
      });
      b.dataset.entry = entry.id; b.dataset.focus = entry.id; b.setAttribute('aria-label', entry.name); b.setAttribute('aria-pressed', String(entry.id === selected && viewingBag === null)); b.title = entry.name;
      b.append(entry.picture ? image(entry.picture) : fallback(entry));
      if (entry.badge) b.append(el('span', 's26-badge', entry.badge));
      stock.append(b);
    });
    // Empty brass slots complete the grid without inventing additional merchandise.
    for (let i = entries.length; i < Math.max(12, Math.ceil(entries.length / 6) * 6); i++) {
      const empty = el('span', 's26-cell empty'); empty.setAttribute('aria-hidden', 'true'); stock.append(empty);
    }
    if (!entries.length) assortment.append(el('p', 's26-empty', selling ? 'Nie masz zbiorów na sprzedaż.' : 'Brak towarów w tej kategorii.'));
    row.append(filters, stock); assortment.append(row); left.append(assortment);
    const bag = el('details', 's26-backpack'); bag.open = bagOpen ?? window.matchMedia('(min-width: 701px)').matches;
    const summary = el('summary', '', `PLECAK ${gear.bag.length}/${PLECAK.miejsc}`); bag.append(summary);
    const bagGrid = el('div', 's26-bag-grid');
    for (let i = 0; i < PLECAK.miejsc; i++) {
      const slot = gear.bag[i];
      const b = button('', `s26-bag-cell${viewingBag === i ? ' selected' : ''}`, () => { viewingBag = i; render(); });
      b.disabled = !slot; b.dataset.focus = `bag:${i}`;
      if (slot) {
        b.setAttribute('aria-label', slotLabel(slot)); b.append(slotIcon(slot));
        if ('goods' in slot) b.append(el('span', 's26-badge', String(goodsN(slot))));
      } else b.setAttribute('aria-label', 'Puste miejsce');
      bagGrid.append(b);
    }
    bag.append(bagGrid); left.append(bag);
    const right = el('div', 's26-right');
    const detail = el('section', 's26-detail'); detail.setAttribute('aria-label', 'Szczegóły przedmiotu');
    const entry = entries.find(e => e.id === selected);
    const bagSlot = viewingBag === null ? undefined : gear.bag[viewingBag];
    if (bagSlot) {
      const hero = el('div', 's26-hero-image'); hero.append(slotIcon(bagSlot)); detail.append(hero, el('h3', '', slotLabel(bagSlot).split(' – ')[0]), el('p', 's26-description', slotLabel(bagSlot)), el('p', '', 'Przedmiot z twojego plecaka.'));
      const returnButton = button('WRÓĆ DO TOWARU', 's26-action', () => { viewingBag = null; render(); }); returnButton.dataset.focus = 'return'; detail.append(returnButton);
    } else if (entry) {
      const hero = el('div', 's26-hero-image'); hero.append(entry.picture ? image(entry.picture) : fallback(entry));
      detail.append(hero, el('h3', '', entry.name));
      const stats = el('dl', 's26-stats');
      for (const [label, value] of entry.stats ?? []) stats.append(el('dt', '', label), el('dd', '', value));
      detail.append(stats, el('p', 's26-description', entry.description));
      const pay = entry.price === undefined ? '' : `${number(entry.price)} ${entry.diamonds ? entry.price === 1 ? 'DIAMENT' : 'DIAMENTÓW' : 'MONET'}`;
      const action = button('', 's26-action', () => {
        if (performance.now() - lastAction < 350) return;
        lastAction = performance.now(); choose(entry.index);
      }); action.dataset.focus = 'action'; action.dataset.action = entry.id;
      action.append(el('strong', '', entry.action ?? (selling ? 'SPRZEDAJ' : 'KUP')), el('span', '', pay));
      detail.append(action);
    } else {
      detail.append(el('h3', '', selling ? 'Pusty plecak' : 'Brak towaru'), el('p', '', selling ? 'Zbieraj owoce, warzywa, grzyby i drewno. Kupiec je odkupi.' : 'Masz już najlepsze rzeczy dostępne w tym sklepie.'));
    }
    const ammo = el('div', 's26-ammo', ownedAmmo().map(k => `${AMUNICJA[k].nazwa}: ${gear.ammo[k]}/${STRZALY.kolczan}`).join(' · '));
    const notice = el('p', 's26-message', message); notice.setAttribute('role', 'status');
    const exit = button('WYJDŹ', 's26-exit', () => choose(handle.lastIndex)); exit.dataset.focus = 'exit';
    right.append(detail, ammo, notice, exit); body.append(left, right); box.append(head, bar, subtitle, body);
    stock.scrollTop = scroll;
    const focused = [...box.querySelectorAll<HTMLElement>('[data-focus]')].find(e => e.dataset.focus === focusKey);
    focused?.focus({ preventScroll: true });
  };
  // Keep keyboard focus in this window; normal arrow/Tab/Enter button navigation stays native.
  const key = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const focusable = [...box.querySelectorAll<HTMLElement>('button:not(:disabled), summary')];
    const first = focusable[0], last = focusable.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  };
  root.addEventListener('keydown', key);
  const handle: ShopHandle = {
    revision: 0, lastIndex: request.buttons.length - 1,
    update(d) {
      const oldTab = request.tabs?.active; request = d; handle.lastIndex = d.buttons.length - 1; handle.revision++;
      if (oldTab !== d.tabs?.active) { category = 'all'; selected = d.shop!.entries[0]?.id; viewingBag = null; }
      render();
    },
    message(text) { message = text; const p = box.querySelector('.s26-message'); if (p) p.textContent = text; },
    destroy() {
      window.removeEventListener('popstate', back); root.remove();
      if (historyEntry) { historyEntry = false; history.back(); }
      previouslyFocused?.focus({ preventScroll: true });
    },
  };
  render(); box.querySelector<HTMLButtonElement>('.s26-close')?.focus({ preventScroll: true });
  return handle;
}
