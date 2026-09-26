import { gear, item, type Slot } from '../inventory';
import { PLECAK } from '../content/przedmioty';
import { OWOCE } from '../content/sklepy';
import { session, CHEST_SLOTS } from '../quests';

// The chest at home: 10×10 slots and money. Things are moved between the chest
// and the backpack by dragging (mouse or finger) or by a tap (goes to the
// other side). Fruit stacks up to 99 per slot, like in the backpack.

const FRUIT_ICON = { jablko: '🍎', sliwka: '🟣', winogrono: '🍇', grzyb: '🍄', drewno: '🪵' } as const;
const SLOT_ICON = { bron: '⚔️', dystans: '🏹', zbroja: '🦺', helm: '⛑️', buty: '🥾' } as const;

type Side = 'chest' | 'bag';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, children: (Node | string)[] = []) {
  const e = Object.assign(document.createElement(tag), props);
  for (const c of children) e.append(c);
  return e;
}

function icon(s: Slot) {
  if ('fruit' in s) return FRUIT_ICON[s.fruit];
  const p = item(s.item);
  if (!p) return '?';
  return p.efekt ? '✨' : p.rodzaj === 'magia' ? '🪄' : SLOT_ICON[p.miejsce];
}

function label(s: Slot) {
  if ('fruit' in s) return `${OWOCE[s.fruit].mnoga} ×${s.n}`;
  const p = item(s.item);
  return p ? `${p.nazwa}${p.opis ? ` – ${p.opis}` : ''}` : s.item;
}

export function showChest(onClose: () => void) {
  // The backpack as 5 fixed slots while the chest is open.
  const bag: (Slot | null)[] = Array.from({ length: PLECAK.miejsc }, (_, i) => gear.bag[i] ?? null);
  const chest = session.chest.slots;
  const sides: Record<Side, (Slot | null)[]> = { chest, bag };

  const root = el('div', { id: 'chest', className: 'm-screen' });
  const box = el('div', { className: 'm-box ch-box' });
  root.append(box);
  document.body.append(root);

  const close = () => {
    gear.bag = bag.filter((s): s is Slot => !!s);
    root.remove();
    onClose();
  };
  root.onclick = (e) => {
    if (e.target === root) close();
  };

  /** Moves one slot's content onto another: fills, merges fruit or swaps. */
  const move = (from: Side, i: number, to: Side, j: number) => {
    const a = sides[from][i];
    if (!a || (from === to && i === j)) return;
    const b = sides[to][j];
    if (!b) {
      sides[to][j] = a;
      sides[from][i] = null;
    } else if ('fruit' in a && 'fruit' in b && a.fruit === b.fruit) {
      const take = Math.min(a.n, PLECAK.owocowNaMiejsce - b.n);
      b.n += take;
      a.n -= take;
      if (!a.n) sides[from][i] = null;
    } else {
      sides[to][j] = a;
      sides[from][i] = b;
    }
  };
  /** A tap: to the other side, onto a matching fruit stack or the first free slot. */
  const send = (from: Side, i: number) => {
    const a = sides[from][i];
    if (!a) return;
    const to: Side = from === 'chest' ? 'bag' : 'chest';
    const list = sides[to];
    if ('fruit' in a) {
      for (let j = 0; j < list.length && sides[from][i]; j++) {
        const b = list[j];
        if (b && 'fruit' in b && b.fruit === a.fruit && b.n < PLECAK.owocowNaMiejsce) move(from, i, to, j);
      }
      if (!sides[from][i]) return;
    }
    const free = list.findIndex((s) => !s);
    if (free < 0) {
      info.textContent = to === 'bag' ? 'Plecak pełny.' : 'Skrzynia pełna.';
      return;
    }
    move(from, i, to, free);
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
  const chestGrid = el('div', { className: 'ch-grid' });
  const bagGrid = el('div', { className: 'ch-grid ch-bag' });

  const cell = (side: Side, i: number) => {
    const s = sides[side][i];
    const c = el('div', { className: `ch-cell${s ? '' : ' ch-empty'}` });
    c.dataset.side = side;
    c.dataset.i = String(i);
    if (s) {
      c.append(el('span', { className: 'ch-icon' }, [icon(s)]));
      if ('fruit' in s) c.append(el('span', { className: 'ch-n' }, [String(s.n)]));
      c.title = label(s);
      c.onpointerdown = (e) => startDrag(e, side, i, c);
    }
    return c;
  };

  // Dragging with pointer events (works for mouse and fingers alike).
  let drag: { side: Side; i: number; ghost: HTMLElement | null; x: number; y: number; id: number } | null = null;
  const startDrag = (e: PointerEvent, side: Side, i: number, c: HTMLElement) => {
    e.preventDefault();
    drag = { side, i, ghost: null, x: e.clientX, y: e.clientY, id: e.pointerId };
    info.textContent = label(sides[side][i]!);
    c.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.ghost && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) {
      drag.ghost = el('div', { className: 'ch-ghost' }, [icon(sides[drag.side][drag.i]!)]);
      document.body.append(drag.ghost);
    }
    if (drag.ghost) {
      drag.ghost.style.left = `${e.clientX}px`;
      drag.ghost.style.top = `${e.clientY}px`;
    }
  };
  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (d.ghost) {
      d.ghost.remove();
      const target = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>('.ch-cell');
      if (target?.dataset.side) move(d.side, d.i, target.dataset.side as Side, Number(target.dataset.i));
    } else send(d.side, d.i);
    render();
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  const cleanup = new MutationObserver(() => {
    if (root.isConnected) return;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    cleanup.disconnect();
  });
  cleanup.observe(document.body, { childList: true });

  const render = () => {
    coinsLine.textContent = `💰 W skrzyni: ${session.chest.coins}   Przy sobie: ${session.coins}`;
    chestGrid.replaceChildren(...Array.from({ length: CHEST_SLOTS }, (_, i) => cell('chest', i)));
    bagGrid.replaceChildren(...Array.from({ length: PLECAK.miejsc }, (_, i) => cell('bag', i)));
  };

  box.append(
    el('div', { className: 'c-head' }, [el('h2', {}, ['📦 Skrzynia']), el('div', { className: 'c-sub' }, ['w twoim domku']), btn('✕', close, 'c-close')]),
    coinsLine,
    el('div', { className: 'ch-money' }, [amount, btn('Włóż', () => money(1)), btn('Wyjmij', () => money(-1)), btn('Włóż wszystko', () => money(1, true), 'c-btn c-muted')]),
    moneyMsg,
    chestGrid,
    el('h3', {}, ['Plecak']),
    bagGrid,
    info,
    btn('Zamknij skrzynię', close, 'm-btn m-primary'),
  );
  render();
}
