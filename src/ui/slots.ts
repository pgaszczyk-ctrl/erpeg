import { itemIcon, goodsPicture } from './itemIcon';
import { item, goodsN, goodsLabel, imbueOf, type Slot, type Place } from '../inventory';
import { MIEJSCA, type Miejsce } from '../content/przedmioty';
import { GRUPY } from '../content/sklepy';
import { esencja } from '../content/esencje';

// Item grids shared by the character sheet (equipment + backpack) and the
// chest (chest + backpack): one look for a slot, and dragging things between
// slots with pointer events (mouse and fingers alike). A short tap without
// dragging is a tap.

export const SLOT_ICON: Record<Miejsce, string> = { bron: '🗡', dystans: '🛡', zbroja: '🦺', helm: '⛑', buty: '🥾', amulet: '📿', talizman: '🧿', talizman2: '🧿', talizman3: '🧿' };
/** Greyed pictures in empty equipment places (what goes there). */
const EMPTY_PIC: Partial<Record<Miejsce, string>> = { bron: 'zelazny', dystans: 'tarcza_drewniana', zbroja: 'skorzana_zbroja', helm: 'skorzany_helm', buty: 'skorzane_buty', talizman: 'podkowa_szczescia', talizman2: 'podkowa_szczescia', talizman3: 'podkowa_szczescia' };

function el(tag: string, cls = '', text = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

export function slotIcon(s: Slot): Node | string {
  if ('goods' in s) {
    const pic = goodsPicture(s.goods);
    if (!pic) return GRUPY[s.goods].ikona;
    const img = document.createElement('img');
    img.src = pic;
    img.className = 'item-ico sl-ico';
    img.alt = '';
    img.draggable = false;
    return img;
  }
  if ('esencja' in s) return esencja(s.esencja)?.ikona ?? '🧪';
  const p = item(s.item);
  if (!p) return '?';
  return itemIcon(p.id, 'item-ico sl-ico') ?? (p.efekt ? '✨' : p.rodzaj === 'magia' ? '🪄' : SLOT_ICON[p.miejsce]);
}

export function slotLabel(s: Slot) {
  if ('goods' in s) return goodsLabel(s);
  if ('esencja' in s) {
    const e = esencja(s.esencja);
    return e ? `${e.nazwa} (${e.minut} min): ${e.opis} Przeciągnij ją na broń.` : s.esencja;
  }
  const p = item(s.item);
  const imb = imbueOf(s.item);
  return p ? `${p.nazwa}${p.opis ? ` – ${p.opis}` : ''}${imb ? ` ${imb.e.ikona} ${imb.e.nazwa}: jeszcze ${imb.minutes} min.` : ''}` : s.item;
}

const key = (p: Place) => (p.zone === 'eq' ? p.m : String(p.i));

/** One slot. `m` = an equipment place (an empty one shows a greyed picture of what goes there). */
export function slotCell(s: Slot | null, place: Place, extra = '') {
  const c = el('div', `sl-cell${s ? '' : ' sl-empty'}${extra ? ` ${extra}` : ''}`);
  c.dataset.zone = place.zone;
  c.dataset.key = key(place);
  if (s) {
    c.dataset.full = '1';
    const pic = el('span', 'sl-pic');
    pic.append(slotIcon(s));
    c.append(pic);
    if ('goods' in s) c.append(el('span', 'sl-n', String(goodsN(s))));
    if ('esencja' in s) c.append(el('span', 'sl-flask', '🧪'));
    if ('item' in s) {
      const imb = imbueOf(s.item);
      if (imb) {
        const b = el('span', 'sl-imb', `${imb.e.ikona}${imb.minutes}′`);
        b.style.borderColor = imb.e.kolor;
        c.append(b);
      }
    }
    c.title = slotLabel(s);
  } else if (place.zone === 'eq') {
    const ghost = EMPTY_PIC[place.m] ? itemIcon(EMPTY_PIC[place.m]!, 'item-ico sl-ico item-ghost') : null;
    const pic = el('span', 'sl-pic sl-ghost');
    pic.append(ghost ?? SLOT_ICON[place.m]);
    c.append(pic);
    c.title = MIEJSCA[place.m];
  }
  if (place.zone === 'eq') c.append(el('span', 'sl-tag', MIEJSCA[place.m]));
  return c;
}

function placeOf(c: HTMLElement): Place | null {
  const z = c.dataset.zone;
  if (!z || c.dataset.key == null) return null;
  return z === 'eq' ? { zone: 'eq', m: c.dataset.key as Miejsce } : { zone: z as 'bag' | 'chest', i: Number(c.dataset.key) };
}

/**
 * Dragging between the slots inside `root`. `drop` moves a thing, `tap` is a
 * tap without dragging. Returns a function that removes the listeners.
 */
export function slotDrag(root: HTMLElement, h: { drop: (from: Place, to: Place) => void; tap: (at: Place) => void }) {
  let drag: { from: Place; cell: HTMLElement; ghost: HTMLElement | null; x: number; y: number; id: number } | null = null;
  const down = (e: PointerEvent) => {
    const c = (e.target as HTMLElement).closest<HTMLElement>('.sl-cell');
    const from = c && placeOf(c);
    if (!c || !from) return;
    e.preventDefault();
    drag = { from, cell: c, ghost: null, x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const move = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.ghost && drag.cell.dataset.full && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) {
      const g = el('div', 'sl-drag');
      const pic = drag.cell.querySelector('.sl-pic');
      if (pic) g.append(pic.cloneNode(true));
      document.body.append(g);
      drag.ghost = g;
      drag.cell.classList.add('sl-lifted');
    }
    if (drag.ghost) {
      drag.ghost.style.left = `${e.clientX}px`;
      drag.ghost.style.top = `${e.clientY}px`;
    }
  };
  const up = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    d.cell.classList.remove('sl-lifted');
    if (d.ghost) {
      d.ghost.remove();
      const t = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>('.sl-cell');
      const to = t && root.contains(t) ? placeOf(t) : null;
      if (to) h.drop(d.from, to);
    } else if (e.type === 'pointerup') h.tap(d.from);
  };
  root.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  return () => {
    root.removeEventListener('pointerdown', down);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
  };
}
