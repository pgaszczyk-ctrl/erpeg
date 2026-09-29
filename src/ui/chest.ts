import { gear, goodsN, moveThing, type Slot, type Place } from '../inventory';
import { PLECAK } from '../content/przedmioty';
import { session } from '../quests';
import { slotCell, slotDrag, slotLabel } from './slots';

// The chest (at home, or at the hotel where the hero sleeps): the same grids as
// the equipment page – the chest's 4×5 on top, the 4×5 backpack below – plus
// money. Things move by dragging, or a tap sends one to the other side. Old
// chests held 100 things: pages appear only when something lies beyond the
// first 20 slots.

/** Chest slots shown at once (one page). */
export const SKRZYNIA_NA_STRONE = 20;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, children: (Node | string)[] = []) {
  const e = Object.assign(document.createElement(tag), props);
  for (const c of children) e.append(c);
  return e;
}

export function showChest(onClose: () => void, where = 'w twoim domku') {
  const chest = session.chest.slots;
  let page = 0;

  const root = el('div', { id: 'chest', className: 'm-screen' });
  const box = el('div', { className: 'm-box ch-box' });
  root.append(box);
  document.body.append(root);

  let dispose = () => {};
  const close = () => {
    dispose();
    root.remove();
    onClose();
  };
  root.onclick = (e) => {
    if (e.target === root) close();
  };

  /** A tap: to the other side, onto a matching goods stack or the first free slot. */
  const send = (at: Place) => {
    if (at.zone === 'eq') return;
    const from = at.zone;
    const a = from === 'bag' ? gear.bag[at.i] : chest[at.i];
    if (!a) return;
    const to: 'bag' | 'chest' = from === 'chest' ? 'bag' : 'chest';
    const n = to === 'bag' ? PLECAK.miejsc : chest.length;
    const at2 = (j: number): Slot | null => (to === 'bag' ? gear.bag[j] ?? null : chest[j]);
    if ('goods' in a) {
      for (let j = 0; j < n; j++) {
        const b = at2(j);
        if (b && 'goods' in b && b.goods === a.goods && goodsN(b) < PLECAK.owocowNaMiejsce) moveThing(at, { zone: to, i: j }, chest);
        const still = from === 'bag' ? gear.bag[at.i] : chest[at.i];
        if (!still || still !== a) return;
      }
    }
    let free = -1;
    for (let j = 0; j < n && free < 0; j++) if (!at2(j)) free = j;
    if (free < 0) return void (info.textContent = to === 'bag' ? 'Plecak pełny.' : 'Skrzynia pełna.');
    moveThing(at, { zone: to, i: free }, chest);
  };

  const info = el('p', { className: 'ch-info' }, ['Przeciągnij albo stuknij rzecz, żeby ją przełożyć.']);
  const coinsLine = el('div', { className: 'ch-coins' });
  const amount = el('input', { type: 'number', min: 1, placeholder: 'ile', className: 'm-input ch-amount', inputMode: 'numeric' });
  const moneyMsg = el('span', { className: 'ch-msg' });
  const money = (dir: 1 | -1, all = false) => {
    const have = dir > 0 ? session.coins : session.chest.coins;
    const n = all ? have : Math.floor(Number(amount.value));
    if (!(n > 0)) return void (moneyMsg.textContent = 'Wpisz, ile monet.');
    if (n > have) return void (moneyMsg.textContent = dir > 0 ? 'Nie masz tyle przy sobie.' : 'Nie ma tyle w skrzyni.');
    session.coins -= dir * n;
    session.chest.coins += dir * n;
    moneyMsg.textContent = '';
    amount.value = '';
    render();
  };
  const btn = (text: string, fn: () => void, cls = 'c-btn') => el('button', { type: 'button', className: cls, onclick: fn }, [text]);
  const tabs = el('div', { className: 'c-tabs ch-pages' });
  const chestGrid = el('div', { className: 'sl-grid sl-bag' });
  const bagGrid = el('div', { className: 'sl-grid sl-bag' });
  const wrap = el('div', { className: 'sl-wrap' }, [tabs, chestGrid, el('h3', {}, ['🎒 Plecak']), bagGrid]);

  const render = () => {
    coinsLine.textContent = `💰 W skrzyni: ${session.chest.coins}   Przy sobie: ${session.coins}`;
    // Pages only when an old, bigger chest has things further on.
    const pages = Math.max(1, Math.ceil((chest.reduce((last, s, i) => (s ? i : last), -1) + 1) / SKRZYNIA_NA_STRONE));
    tabs.replaceChildren(...(pages > 1 ? Array.from({ length: pages }, (_, p) => btn(`Strona ${p + 1}`, () => {
      page = p;
      render();
    }, `c-tab${p === page ? ' c-tab-on' : ''}`)) : []));
    tabs.style.gridTemplateColumns = `repeat(${Math.min(pages, 5)}, 1fr)`;
    const first = page * SKRZYNIA_NA_STRONE;
    chestGrid.replaceChildren(...Array.from({ length: SKRZYNIA_NA_STRONE }, (_, k) => slotCell(chest[first + k] ?? null, { zone: 'chest', i: first + k })));
    bagGrid.replaceChildren(...Array.from({ length: PLECAK.miejsc }, (_, i) => slotCell(gear.bag[i] ?? null, { zone: 'bag', i })));
  };
  dispose = slotDrag(wrap, {
    drop: (from, to) => {
      const msg = moveThing(from, to, chest);
      info.textContent = msg || 'Przeciągnij albo stuknij rzecz, żeby ją przełożyć.';
      render();
    },
    tap: (at) => {
      const s = at.zone === 'bag' ? gear.bag[at.i] : at.zone === 'chest' ? chest[at.i] : null;
      if (s) info.textContent = slotLabel(s);
      send(at);
      render();
    },
  });

  box.append(
    el('div', { className: 'c-head' }, [el('h2', {}, ['📦 Skrzynia']), el('div', { className: 'c-sub' }, [where]), btn('✕', close, 'c-close')]),
    coinsLine,
    el('div', { className: 'ch-money' }, [amount, btn('Włóż', () => money(1)), btn('Wyjmij', () => money(-1)), btn('Wszystko', () => money(1, true), 'c-btn c-muted')]),
    moneyMsg,
    wrap,
    info,
  );
  render();
}
