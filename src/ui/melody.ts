// The dragons' melody (main story, the "Brat smoków" path): the dragon hums a
// few notes, shown on a staff; the player repeats them on a pipe with five
// coloured keys. A wrong note: the dragon shakes its head and hums again.
// Resolves when the melody is played right.

import { legacyText } from '../content/questy/text';
import { pipe } from '../sfx';
import { MELODIA } from '../content/historia';

const NUTY = [
  { nazwa: 'Do', hz: 523, kolor: '#e8574d' },
  { nazwa: 'Re', hz: 587, kolor: '#f39a3b' },
  { nazwa: 'Mi', hz: 659, kolor: '#f7c531' },
  { nazwa: 'Fa', hz: 698, kolor: '#6cc070' },
  { nazwa: 'Sol', hz: 784, kolor: '#4fa3e0' },
];

/** A random melody of `length` notes (no note three times in a row). */
function tune(length: number) {
  const out: number[] = [];
  while (out.length < length) {
    const n = Math.floor(Math.random() * NUTY.length);
    if (out.length >= 2 && out[out.length - 1] === n && out[out.length - 2] === n) continue;
    out.push(n);
  }
  return out;
}

/** The notes on a five-line staff (SVG); `lit` = how many are already played. */
function staff(notes: number[], lit = -1, ghost = false) {
  const w = 40 + notes.length * 44;
  const line = (i: number) => 18 + i * 10;
  let s = `<svg viewBox="0 0 ${w} 76" width="100%" style="max-width:${w * 1.4}px;display:block;margin:6px auto">`;
  for (let i = 0; i < 5; i++) s += `<line x1="4" x2="${w - 4}" y1="${line(i)}" y2="${line(i)}" stroke="#b9ae8f" stroke-width="1.2"/>`;
  s += `<text x="6" y="56" font-size="44" fill="#b9ae8f" font-family="serif">𝄞</text>`;
  notes.forEach((n, i) => {
    // Do sits under the staff (with a ledger line), Sol on the second line from the bottom.
    const y = 68 - n * 5;
    const x = 44 + i * 44;
    const c = ghost ? '#4a4452' : NUTY[n].kolor;
    const op = lit >= 0 && i >= lit ? 0.35 : 1;
    s += `<g opacity="${op}">`;
    if (n === 0) s += `<line x1="${x - 11}" x2="${x + 11}" y1="68" y2="68" stroke="#b9ae8f" stroke-width="1.2"/>`;
    s += `<ellipse cx="${x}" cy="${y}" rx="7" ry="5.2" transform="rotate(-20 ${x} ${y})" fill="${c}" stroke="#1e1a24" stroke-width="1.5"/>`;
    s += `<line x1="${x + 6.5}" x2="${x + 6.5}" y1="${y - 2}" y2="${y - 30}" stroke="#e8dcc0" stroke-width="1.8"/></g>`;
  });
  return s + '</svg>';
}

/** Texts and a fixed tune for melodies outside the dragon story (mission stages „melodia”). */
export interface MelodyOptions {
  /** Fixed notes 0–4 (Do…Sol); they stay the same after misses. */
  notes?: number[];
  title?: string;
  intro?: string;
  /** Label over the tune, e.g. „Organy grają:”. */
  hums?: string;
}

export function playMelody(length: number, opts: MelodyOptions = {}): Promise<void> {
  return new Promise((resolve) => {
    const fixed = opts.notes?.filter((n) => n >= 0 && n < NUTY.length);
    if (fixed?.length) length = fixed.length;
    let notes = fixed?.length ? [...fixed] : tune(length);
    let typed: number[] = [];
    let busy = false;
    let wrong = 0;
    const root = document.createElement('div');
    root.className = 'm-screen';
    root.id = 'prompt';
    const box = document.createElement('div');
    box.className = 'm-box';
    const h = document.createElement('h2');
    h.textContent = opts.title ?? legacyText(MELODIA.tytul);
    const p = document.createElement('p');
    p.textContent = opts.intro ?? legacyText(MELODIA.wstep);
    const song = document.createElement('div');
    const mine = document.createElement('div');
    const note = document.createElement('p');
    note.style.cssText = 'min-height:1.3em;margin:4px 0;color:#fff2a8';
    const keys = document.createElement('div');
    keys.style.cssText = 'display:flex;gap:6px;justify-content:center;margin:8px 0';
    const again = Object.assign(document.createElement('button'), { type: 'button', className: 'm-btn', textContent: legacyText(MELODIA.jeszczeRaz) });
    const draw = () => {
      song.innerHTML = staff(notes);
      mine.innerHTML = staff(notes.map((n, i) => typed[i] ?? n), typed.length, false).replace(/<g opacity="0.35">[\s\S]*?<\/g>/g, '');
    };
    const hum = (then?: () => void) => {
      busy = true;
      notes.forEach((n, i) => setTimeout(() => {
        pipe(NUTY[n].hz);
        song.innerHTML = staff(notes, i + 1);
      }, 300 + i * 520));
      setTimeout(() => {
        busy = false;
        draw();
        then?.();
      }, 300 + notes.length * 520);
    };
    NUTY.forEach((n, i) => {
      const b = Object.assign(document.createElement('button'), { type: 'button', textContent: n.nazwa });
      b.style.cssText = `flex:1;max-width:64px;min-height:54px;font:inherit;font-weight:bold;border:2px solid #1e1a24;border-radius:8px;background:${n.kolor};color:#1e1a24`;
      b.onclick = () => {
        if (busy) return;
        pipe(n.hz, 300);
        typed.push(i);
        draw();
        if (typed[typed.length - 1] !== notes[typed.length - 1]) {
          note.textContent = legacyText(MELODIA.zle);
          busy = true;
          // A few wrong tries in a row: the dragon hums a new one.
          setTimeout(() => {
            typed = [];
            if (++wrong % 3 === 0 && !fixed?.length) notes = tune(length);
            hum();
          }, 900);
          return;
        }
        note.textContent = '';
        if (typed.length === notes.length) {
          note.textContent = legacyText(MELODIA.dobrze);
          busy = true;
          setTimeout(() => {
            root.remove();
            resolve();
          }, 1400);
        }
      };
      keys.append(b);
    });
    again.onclick = () => {
      if (busy) return;
      typed = [];
      note.textContent = '';
      hum();
    };
    const label = (t: string) => Object.assign(document.createElement('div'), { textContent: t, style: 'font-size:12px;color:#9aa39a;margin-top:4px' });
    box.append(h, p, label(opts.hums ?? legacyText(MELODIA.smokNuci)), song, label(legacyText(MELODIA.twojaFujarka)), mine, note, keys, again);
    root.append(box);
    document.body.append(root);
    draw();
    hum();
  });
}
