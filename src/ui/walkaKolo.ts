// The turn fight's controls, version 2 (owner, 19 Oct 2026, test server; walka/tryb.ts nowyPanel):
// no bottom panel. A bar at the top says whose turn it is (life, „Uciekaj”, „Zakończ turę”) with
// one hint line; the map does the rest (TuryWalki.tap): ground = walk, an enemy = a small ring of blows around it
// (Cios / Mocny cios; a bow or wand shoots on the second tap), the hero = a ring with Leczenie / Unik.
// Plain HTML outside #game, so its taps never reach the map; the rings' middles are empty, so a tap there goes
// to the map and closes the ring.

import type { StanPanelu, ObslugaPanelu } from './walkaPanel';
import { itemPictureUrl } from './itemIcon';

/** One attack in the ring around an enemy (content/atakiTurowe.ts): label, its own cost and the walk up (boots) as
 * small ambers, greyed when it can't be done now. Only unlocked attacks are listed; many of them page („więcej”). */
export interface PrzyciskAtaku { id: string; tekst: string; koszt: number; podejscie: number; off: boolean; wybrany: boolean; strona?: string }

/** Moves this turn as ambers under the hero (owner, 19 Oct 2026, „czytelność walki” stage 1). */
export interface PodgladRuchow { but: number; cios: number }

export interface StanKola extends StanPanelu {
  /** Which ring is open: around the hero, around an enemy, or none. */
  kolo: 'bohater' | 'wrog' | null;
  /** The enemy ring's attacks for the weapon in hand. */
  ataki: PrzyciskAtaku[] | null;
  /** Ucieczka was tapped once: the next tap runs away. */
  ucieczkaPytanie: boolean;
  /** A dragon has announced an attack: Unik is worth it. */
  zapowiedz: boolean;
  /** Unik is on until the enemies' turn ends. */
  unik: boolean;
  /** The hint is a first-fights tip (drawn brighter). */
  rada: boolean;
  /** Moves beyond the level's own (hotel, luck, later items): the last ones get a bright rim. */
  bonus: number;
  /** What a previewed action would spend: boots = walk up, swords = the blow. */
  podglad: PodgladRuchow | null;
}

export interface ObslugaKola extends ObslugaPanelu {
  potwierdz(): void;
  nastepny(): void;
  kolo(): void;
  unik(): void;
  atak(id: string): void;
}

/** Where the artist's ambers lie (public/walka/bursztynki, pack bursztynki v1). */
const AMBER = (import.meta.env.BASE_URL || '/') + 'walka/bursztynki/';
const CSS = `
body.walka-tur.walka-kolo #hud .hud-plate, body.walka-tur.walka-kolo #hud .hud-quest, body.walka-tur.walka-kolo #hud .hud-money { display: none !important; }
#walka-panel.wn { position: fixed; left: 50%; top: max(6px, env(safe-area-inset-top)); transform: translateX(-50%);
  width: min(440px, calc(100vw - 128px)); min-width: 184px; z-index: 7; font-family: 'Alegreya Sans', 'Trebuchet MS', sans-serif; color: #f3dfb0;
  user-select: none; -webkit-user-select: none; touch-action: manipulation; }
#walka-panel.wn .wn-pas { display: flex; align-items: center; gap: 8px; padding: 5px 6px 5px 10px; border-radius: 12px;
  background: linear-gradient(#3b2a1d, #2a1d14); border: 2px solid #b8893a; box-shadow: 0 4px 12px #0008, inset 0 1px 0 #e6c27a55; transition: background 0.25s, border-color 0.25s; }
#walka-panel.wn.wrog .wn-pas { background: linear-gradient(#5a1f1a, #3a1410); border-color: #ff6a5a; }
#walka-panel.wn .wn-tura { font: 700 15px 'Pixelify Sans', monospace; letter-spacing: 1px; color: #ffd34a; white-space: nowrap; }
#walka-panel.wn.wrog .wn-tura { color: #ffb0a0; }
#walka-panel.wn .wn-zycie { flex: 1; min-width: 40px; }
#walka-panel.wn .wn-tuba { position: relative; height: 8px; border-radius: 5px; background: #1e1a24; border: 1px solid #8a6630; overflow: hidden; }
#walka-panel.wn .wn-tuba i { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(#ff7a64, #c1281e); }
#walka-panel.wn .wn-tuba b { position: absolute; top: 0; bottom: 0; background: linear-gradient(#9fdcff, #3a8fd6); }
#walka-panel.wn .wn-zl { font-size: 11px; line-height: 1; margin-top: 2px; text-align: right; white-space: nowrap; }
#walka-panel.wn.nisko .wn-tuba { border-color: #ff6a5a; box-shadow: 0 0 0 1px #ff6a5a; }
#walka-panel.wn button { font: inherit; color: inherit; cursor: pointer; }
#walka-panel.wn .wn-koniec { flex: none; min-height: 34px; padding: 0 9px; border-radius: 8px; border: 2px solid #7d5a2a; background: linear-gradient(#5a4130, #3a2a1e);
  font-weight: 800; font-size: 13px; line-height: 1.05; }
#walka-panel.wn .wn-koniec:disabled { opacity: 0.4; }
#walka-panel.wn .wn-koniec.teraz { border-color: #ffd34a; box-shadow: 0 0 0 2px #ffd34a55; }
#walka-panel.wn .wn-ucieczka { flex: none; min-height: 34px; padding: 0 7px; border-radius: 8px; border: 2px solid #6a3a2a; background: linear-gradient(#4a2a20, #2e1a14);
  font-weight: 700; font-size: 12px; line-height: 1.05; display: flex; align-items: center; gap: 3px; }
#walka-panel.wn .wn-ucieczka svg { width: 16px; height: 16px; }
#walka-panel.wn .wn-ucieczka.pyta { border-color: #ff6a5a; background: linear-gradient(#7a2a22, #3a1410); }
#walka-panel.wn .wn-ucieczka:disabled { opacity: 0.4; }
#walka-panel.wn .wn-podp { margin: 5px auto 0; width: fit-content; max-width: 100%; font-size: 14px; line-height: 1.2; text-align: center; color: #fff4d0;
  background: #1e1a24d8; border-radius: 9px; padding: 4px 10px; }
#walka-panel.wn .wn-podp:empty { display: none; }
#walka-panel.wn .wn-podp.rada { border: 2px solid #e9c46a; font-weight: 700; }
@media (max-width: 600px) {
  /* Phones: the bar from just right of the ☰ corner to the right edge. */
  #walka-panel.wn { left: 66px; right: 6px; width: auto; min-width: 0; transform: none; }
  #walka-panel.wn .wn-pas { gap: 6px; padding: 4px 4px 4px 8px; }
  #walka-panel.wn .wn-tura { font-size: 12px; letter-spacing: 0.5px; }
  #walka-panel.wn .wn-zl { display: none; }
  #walka-panel.wn .wn-zycie { min-width: 24px; }
  #walka-panel.wn .wn-koniec { font-size: 11px; padding: 0 6px; min-height: 32px; }
  #walka-panel.wn .wn-ucieczka { padding: 0 4px; min-height: 32px; }
  #walka-panel.wn .wn-ucieczka span { display: none; }
  #walka-panel.wn .wn-podp { font-size: 13px; }
}
/* Moves as ambers under the hero: full = bright amber, spent = dark, bonus moves with a light rim. */
#walka-bursztyny { position: fixed; left: 0; top: 0; z-index: 6; pointer-events: none; transform: translate(-9999px, 0); }
#walka-bursztyny .bz-w { position: absolute; left: 0; top: 0; transform: translateX(-50%); display: grid; gap: 3px; justify-items: center;
  padding: 3px 4px; border-radius: 9px; background: #1e1a24a8; }
#walka-bursztyny.ukryj .bz-w { display: none; }
/* The artist's ambers (pack bursztynki v1, 48 px, shown smaller): full, spent, from an item (brass setting),
   walk-up cost (boot), blow cost (sword), missing (dashed). */
.bz { position: relative; display: inline-block; width: 18px; height: 18px; box-sizing: border-box;
  background: url(${AMBER}amber_full.png) center / contain no-repeat; }
.bz.pusty { background-image: url(${AMBER}amber_spent.png); }
.bz.bonus.pelny { background-image: url(${AMBER}amber_item.png); }
.bz.but { background-image: url(${AMBER}amber_cost_move.png); animation: bz-puls 0.8s ease-in-out infinite; }
.bz.cios { background-image: url(${AMBER}amber_cost_strike.png); animation: bz-puls 0.8s ease-in-out infinite; }
.bz.miga { animation: bz-miga 0.5s steps(2, jump-none) infinite; }
.bz.brak { background-image: url(${AMBER}amber_missing.png); animation: bz-miga 0.5s steps(2, jump-none) infinite; }
.bz-wiele { display: flex; align-items: center; gap: 3px; font: 700 13px 'Pixelify Sans', monospace; color: #ffd98a; text-shadow: 0 1px 1px #000; white-space: nowrap; }
.bz-wiele b { color: #ffb08a; font-weight: 700; }
.bz-wiele b.zle { color: #ff6a5a; }
@keyframes bz-puls { 0%, 100% { transform: scale(1); filter: brightness(1); } 50% { transform: scale(1.25); filter: brightness(1.35); } }
@keyframes bz-miga { 0% { opacity: 1; } 50% { opacity: 0.25; } 100% { opacity: 1; } }
/* Small ambers on the ring's buttons, in place of the cost text. */
.bz-mini { display: flex; align-items: center; justify-content: center; gap: 2px; margin-top: 2px; }
.bz-mini .bz { width: 14px; height: 14px; animation: none; }
/* Picked attack: pulses fast – tap it again to attack (owner, 20 Oct 2026). Before a pick the cheapest one pulses slowly. */
#walka-kolo .wk-b.wybrany { border-color: #fff1a8; animation: wk-wybrany 0.42s ease-in-out infinite !important; }
#walka-kolo .wk-b.zacheta { animation: wk-zacheta 1.6s ease-in-out infinite; }
@keyframes wk-wybrany { 0%, 100% { box-shadow: 0 0 0 3px #ffd34a, 0 0 10px 3px #ffd34aaa, 0 3px 8px #000a; transform: scale(1); }
  50% { box-shadow: 0 0 0 5px #fff1a8, 0 0 22px 9px #ffd34add, 0 3px 8px #000a; transform: scale(1.1); } }
@keyframes wk-zacheta { 0%, 100% { box-shadow: 0 0 0 2px #ffd34a66, 0 3px 8px #000a; } 50% { box-shadow: 0 0 0 4px #ffd34acc, 0 0 14px 4px #ffd34a88, 0 3px 8px #000a; } }
@media (prefers-reduced-motion: reduce) { #walka-kolo .wk-b.zacheta { animation: none; } #walka-kolo .wk-b.wybrany { animation: none !important; box-shadow: 0 0 0 4px #fff1a8; } .bz.but, .bz.cios, .bz.miga, .bz.brak { animation: none; } }
#walka-kolo { position: fixed; left: 0; top: 0; width: 0; height: 0; z-index: 7; pointer-events: none; font-family: 'Alegreya Sans', sans-serif; }
#walka-kolo .wk-b { position: absolute; width: 50px; height: 50px; margin: -25px 0 0 -25px; border-radius: 50%; pointer-events: auto; cursor: pointer;
  border: 2px solid #b8893a; background: radial-gradient(circle at 40% 35%, #6a4c32, #2f2017); box-shadow: 0 3px 8px #000a, inset 0 1px 0 #ffffff33;
  display: flex; align-items: center; justify-content: center; color: #f3dfb0; padding: 0;
  transform: translate(var(--ox, 0), var(--oy, 0)) scale(0.15); opacity: 0;
  transition: transform 0.26s cubic-bezier(0.34, 1.45, 0.64, 1), opacity 0.16s ease-out; }
#walka-kolo.on .wk-b { transform: none; opacity: 1; }
#walka-kolo .wk-b svg, #walka-kolo .wk-b img { width: 26px; height: 26px; image-rendering: pixelated; }
/* The enemy ring's blows are bigger (owner, 19 Oct 2026); the strong one glows gold (until the artist's icon). */
#walka-kolo.wrog .wk-b { width: 64px; height: 64px; margin: -32px 0 0 -32px; }
#walka-kolo.wrog .wk-b svg, #walka-kolo.wrog .wk-b img { width: 38px; height: 38px; }
#walka-kolo.wrog .wk-b .n { font-size: 13px; }
#walka-kolo .wk-b.mocny { border: 3px solid #ffd34a; background: radial-gradient(circle at 40% 35%, #a7792c, #5a3a12);
  box-shadow: 0 0 10px 3px #ffc83aaa, 0 0 22px 6px #ffb02066, 0 3px 8px #000a; animation: wk-zloto 1.3s ease-in-out infinite; }
#walka-kolo .wk-b.mocny img { filter: drop-shadow(0 0 2px #fff1a8) drop-shadow(0 0 6px #ffd34a) drop-shadow(0 0 10px #ffb020); }
#walka-kolo .wk-b.mocny .n { color: #ffe08a; }
#walka-kolo .wk-b .n { max-width: 92px; white-space: normal; }
@keyframes wk-zloto { 0%, 100% { box-shadow: 0 0 10px 3px #ffc83aaa, 0 0 22px 6px #ffb02066, 0 3px 8px #000a; }
  50% { box-shadow: 0 0 16px 6px #ffd34acc, 0 0 32px 10px #ffb02088, 0 3px 8px #000a; } }
#walka-kolo .wk-b .n { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); margin-top: 1px; white-space: nowrap;
  font-size: 12px; font-weight: 800; line-height: 1.1; text-align: center; text-shadow: 0 1px 2px #000, 0 0 4px #000; }
#walka-kolo .wk-b .n small { display: block; font-weight: 600; font-size: 10px; opacity: 0.85; }
#walka-kolo .wk-b:disabled { filter: grayscale(0.8); opacity: 0.45; }
#walka-kolo .wk-b.blysk { border-color: #ffd34a; animation: wk-blysk 0.9s ease-in-out infinite; }
#walka-kolo .wk-b.on { border-color: #ffd34a; background: radial-gradient(circle at 40% 35%, #8a6a2a, #4e3818); }
#walka-kolo .wk-b.uwaga { border-color: #ff6a5a; background: radial-gradient(circle at 40% 35%, #7a2a22, #3a1410); }
#walka-panel[data-wskaz="cios"] ~ #walka-kolo .wk-b.cios,
#walka-panel[data-wskaz="lecz"] ~ #walka-kolo .wk-b.lecz { border-color: #ffd34a; animation: wk-blysk 0.9s ease-in-out infinite; }
@keyframes wk-blysk { 0%, 100% { box-shadow: 0 0 0 2px #ffd34a, 0 0 10px 2px #ffd34a99; } 50% { box-shadow: 0 0 0 4px #fff1a8, 0 0 18px 6px #ffd34acc; } }
/* Ambers inside buttons: after the ring's icon sizes, so those don't blow them up. */
@media (prefers-reduced-motion: reduce) { #walka-kolo .wk-b { transition: none; } #walka-kolo .wk-b.mocny { animation: none; } #walka-kolo .wk-b.blysk { animation: none; box-shadow: 0 0 0 3px #ffd34a; } }
`;

/** Small pixel icons from rows of letters. */
function piksele(rows: string[], kolory: Record<string, string>) {
  const h = rows.length, w = rows[0].length;
  let r = '';
  rows.forEach((row, y) => [...row].forEach((c, x) => {
    const k = kolory[c];
    if (k) r += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${k}"/>`;
  }));
  return `<svg viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
const K = { o: '#1e1a24', y: '#ffd34a', Y: '#fff1a8', r: '#e4473b', R: '#ff8a6a', b: '#59c8ff', B: '#c8f0ff', w: '#f3dfb0', s: '#b9b3a8', S: '#e8e4dc', h: '#8a5a2a' };
const IKONY = {
  mocny: piksele([
    '.........oo.',
    '........oSso',
    '.......oSso.',
    '..o...oSso..',
    '.oyo.oSso...',
    '..oyoSso....',
    '...oyso.....',
    '...ohyo.....',
    '..ohooyo....',
    '.ohoy.oyo...',
    'oho....o....',
    '.o..........',
  ], K),
  lecz: piksele([
    '....oooo....',
    '....owwo....',
    '.....oo.....',
    '....oRRo....',
    '...oRrrRo...',
    '..oRrrrrRo..',
    '..orrRRrro..',
    '..orRrrRro..',
    '..orrrrrro..',
    '...orrrro...',
    '....oooo....',
    '............',
  ], K),
  oslona: piksele([
    '............',
    '..oooooooo..',
    '..oBBbbbbo..',
    '..oBbbbbbo..',
    '..obbYYbbo..',
    '..obYYYYbo..',
    '..obbYYbbo..',
    '...obbbbo...',
    '...obbbbo...',
    '....obbo....',
    '.....oo.....',
    '............',
  ], K),
  unik: piksele([
    '.......oo...',
    '......owwo..',
    '.......oo...',
    '.....oowo...',
    'BB..owwwwo..',
    '...o.owwoo..',
    'BBB..owwo...',
    '....owoowo..',
    'BB..ow..owo.',
    '...ow....oo.',
    '....o.......',
    '............',
  ], K),
  zamach: piksele([
    '............',
    '...yyyyyy...',
    '..y......y..',
    '.y...oo...y.',
    'y...oSSo...y',
    'y..oSso....y',
    '..oSso......',
    '.oyso.......',
    'ohyo........',
    'oho.........',
    '.o..........',
    '............',
  ], K),
  ogien: piksele([
    '.....r......',
    '....rR...r..',
    '...rRR..rR..',
    '..rRYRr.rRr.',
    '..rRYYRrRYr.',
    '.rRYYYYRYYr.',
    '.rRYYYYYYRr.',
    '.rRYYwYYYRr.',
    '..rRYwwYRr..',
    '..rrRYYRrr..',
    '...rrrrrr...',
    '............',
  ], { ...K, r: '#c1281e', R: '#ff6a2a', Y: '#ffd34a', w: '#fff6c8' }),
  salwa: piksele([
    '.o......o...',
    'oso....oso..',
    '.s......s...',
    '.s..o...s...',
    '.s.oso..s...',
    '.s..s...s...',
    '.s..s...s...',
    'oho.s..oho..',
    'oho.s..oho..',
    '...oho......',
    '...oho......',
    '............',
  ], { ...K, s: '#c8a46a', h: '#e4473b' }),
  wiecej: piksele([
    '............',
    '............',
    '............',
    '............',
    '.oo..oo..oo.',
    'oYYooYYooYYo',
    'oYYooYYooYYo',
    '.oo..oo..oo.',
    '............',
    '............',
    '............',
    '............',
  ], K),
  ucieczka: piksele([
    '......oo....',
    '.....owwo...',
    '......oo....',
    '....oowoo...',
    '...owwwwwo..',
    '..o.owwo.o..',
    '....owwo....',
    '...owoowo...',
    '..ow...owo..',
    '.ow.....oo..',
    '..o.........',
    '............',
  ], K),
};

/** Amber-mark HTML: the classes pick the artist's picture (CSS above). */
function bz(kl: string) {
  return `<i class="bz ${kl}"></i>`;
}

/** Small ambers for a cost: boots + their dots for the walk up, then the blow's own. */
function koszty(but: number, cios: number) {
  if (!but && !cios) return '';
  return `<span class="bz-mini">${bz('but').repeat(but)}${bz('pelny').repeat(cios)}</span>`;
}

/** Ring radius (CSS px) and the two buttons' places: upper left and upper right of the figure (not on it). */
const PROMIEN = 54;
/** Places of n buttons in an arc above the figure (degrees) and the arc's radius, so neighbours don't touch.
 * A bit farther out than at first (owner, 20 Oct 2026: they covered the enemies); the whole fan then turns
 * towards the side with the fewest figures (`obrot`). */
const LUK: Record<number, { katy: number[]; r: number }> = {
  1: { katy: [-90], r: 72 },
  2: { katy: [-150, -30], r: 72 },
  3: { katy: [-160, -90, -20], r: 84 },
  4: { katy: [-172, -118, -62, -8], r: 96 },
};
/** Turns of the fan tried (degrees from „above”, the first = preferred when nothing is in the way). */
const OBROTY = [0, -25, 25, -50, 50, -80, 80, -110, 110, -140, 140, 180];
const KATY = [-150, -30];

export class WalkaKolo {
  private el: HTMLDivElement;
  private ring: HTMLDivElement;
  private pula!: HTMLDivElement;
  private pulaKlucz = '';
  private klawisze = (e: KeyboardEvent) => this.klawisz(e);
  private stan: StanKola | null = null;

  constructor(private on: ObslugaKola) {
    if (!document.getElementById('walka-kolo-css')) {
      const st = document.createElement('style');
      st.id = 'walka-kolo-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    document.getElementById('walka-panel')?.remove();
    document.getElementById('walka-kolo')?.remove();
    const el = document.createElement('div');
    el.id = 'walka-panel';
    el.className = 'wn';
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', 'Walka');
    el.innerHTML = `
      <div class="wn-pas">
        <span class="wn-tura"></span>
        <div class="wn-zycie"><div class="wn-tuba"><i></i><b></b></div><div class="wn-zl"></div></div>
        <button class="wn-ucieczka" type="button" aria-label="Ucieczka">${IKONY.ucieczka}<span>Uciekaj</span></button>
        <button class="wn-koniec" type="button">Zakończ<br>turę</button>
      </div>
      <div class="wn-podp" aria-live="polite"></div>`;
    document.body.appendChild(el);
    this.el = el;
    const ring = document.createElement('div');
    ring.id = 'walka-kolo';
    document.body.appendChild(ring);
    this.ring = ring;
    document.getElementById('walka-bursztyny')?.remove();
    const pula = document.createElement('div');
    pula.id = 'walka-bursztyny';
    pula.innerHTML = '<div class="bz-w" role="img"></div>';
    document.body.appendChild(pula);
    this.pula = pula;
    for (const n of [el, ring]) for (const ev of ['touchstart', 'touchend', 'mousedown', 'mouseup', 'click'] as const) n.addEventListener(ev, (e) => {
      // Only the buttons swallow taps: the ring's empty middle lets them through to the map (the hero).
      if (n !== ring || (e.target as HTMLElement).closest('.wk-b')) e.stopPropagation();
    });
    el.querySelector<HTMLButtonElement>('.wn-koniec')!.onclick = () => this.on.koniecTury();
    el.querySelector<HTMLButtonElement>('.wn-ucieczka')!.onclick = () => this.on.ucieczka();
    document.body.classList.add('walka-kolo');
    window.addEventListener('keydown', this.klawisze);
  }

  /** Where the demo's tutorial points (set by Demo.pokazRade as data-wskaz on #walka-panel). */
  wskaz(): string | null {
    return this.el.dataset.wskaz ?? null;
  }

  private klawisz(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (!this.stan) return;
    const c = e.code;
    const cyfra = /^Digit([1-9])$/.exec(c);
    if (cyfra) {
      // 1…n = the open ring's buttons; with no ring open 1 = the plain attack on the chosen enemy.
      const b = this.ring.querySelectorAll<HTMLButtonElement>('.wk-b')[+cyfra[1] - 1];
      if (b) b.click();
      else if (cyfra[1] === '1') this.on.cios();
      else return;
    }
    else if (c === 'KeyH') this.on.lecz();
    else if (c === 'KeyU') this.on.ucieczka();
    else if (c === 'KeyE') this.on.koniecTury();
    else if (c === 'Enter' || c === 'Space') this.on.potwierdz();
    else if (c === 'Tab') this.on.nastepny();
    else if (c === 'KeyQ') this.on.kolo();
    else if (c === 'Escape' || c === 'Backspace') this.on.wroc();
    else return;
    e.preventDefault();
  }

  /** Where the ring's middle is and the figures it should keep clear of (CSS px of the viewport). */
  private srodek: { x: number; y: number } | null = null;
  private przeszkody: { x: number; y: number }[] = [];

  /**
   * Follows the hero / the chosen enemy on the screen (CSS px of the viewport). `przeszkody` = points of the other
   * figures (bodies, heads, the ambers) – the fan of buttons is turned away from them when it opens.
   */
  pozycja(x: number, y: number, przeszkody: { x: number; y: number }[] = []) {
    const gora = this.el.getBoundingClientRect().bottom + 30;
    const cx = Math.min(Math.max(x, 44), innerWidth - 44);
    const cy = Math.min(Math.max(y, gora), innerHeight - 44);
    this.srodek = { x: cx, y: cy };
    this.przeszkody = przeszkody;
    this.ring.style.transform = `translate(${Math.round(cx)}px, ${Math.round(cy)}px)`;
  }

  /**
   * The fan's turn (degrees) that covers the fewest figures and keeps every button and its caption on screen
   * (owner, 20 Oct 2026: „ustaw je w wachlarzu po stronie, gdzie jest mniej wrogów”). Chosen once per opening.
   */
  private obrot(katy: number[], r: number, rozm: number) {
    const s = this.srodek;
    if (!s) return 0;
    const gora = this.el.getBoundingClientRect().bottom + 4;
    let best = 0, bw = Infinity;
    for (const rot of OBROTY) {
      let w = Math.abs(rot) * 0.05;
      for (const k of katy) {
        const a = ((k + rot) * Math.PI) / 180;
        const bx = s.x + Math.cos(a) * r, by = s.y + Math.sin(a) * r;
        if (bx - rozm / 2 < 2 || bx + rozm / 2 > innerWidth - 2) w += 1000;
        if (by - rozm / 2 < gora || by + rozm / 2 + 30 > innerHeight - 4) w += 1000;
        for (const o of this.przeszkody) {
          // The button itself and its caption under it.
          for (const [px, py, lim] of [[bx, by, rozm / 2 + 24], [bx, by + rozm / 2 + 14, 30]]) {
            const d = Math.hypot(px - o.x, py - o.y);
            if (d < lim) w += (lim - d) * (lim - d);
          }
        }
      }
      if (w < bw) [bw, best] = [w, rot];
    }
    return best;
  }

  /** The ambers' place: just under the hero's feet (CSS px of the viewport). */
  bursztyny(x: number, y: number) {
    this.pula.style.transform = `translate(${Math.round(x)}px, ${Math.round(Math.min(y, innerHeight - 60))}px)`;
  }

  /**
   * The pool of moves under the hero: up to 5 in a row, from 6 two rows of 4, above 8 one amber with ×N.
   * A preview pulses the ones that would go (boots = walk up, rust with a sword = the blow); short of moves the
   * ones left blink and the missing ones are dashed red rings.
   */
  private rysujPule(s: StanKola) {
    const gracz = s.tura === 'gracz';
    const max = Math.max(s.maxRuchy, s.ruchy);
    const pg = gracz && !s.busy ? s.podglad : null;
    const klucz = JSON.stringify([gracz, s.ruchy, max, s.bonus, pg]);
    if (klucz === this.pulaKlucz) return;
    this.pulaKlucz = klucz;
    this.pula.classList.toggle('ukryj', !gracz);
    const w = this.pula.querySelector<HTMLElement>('.bz-w')!;
    const wyda = pg ? pg.but + pg.cios : 0;
    const brak = Math.max(0, wyda - s.ruchy);
    w.setAttribute('aria-label', `Ruchy: ${s.ruchy} z ${max}${wyda ? `, ta akcja: ${wyda}` : ''}${brak ? `, brakuje ${brak}` : ''}`);
    if (max > 8) {
      // Many moves: one amber and a counter (×N, and what the preview takes or misses).
      const po = s.ruchy - wyda;
      w.style.gridTemplateColumns = '';
      w.innerHTML = `<span class="bz-wiele">${bz(s.ruchy ? (pg ? (brak ? 'miga' : pg.cios ? 'cios' : 'but') : '') : 'pusty')}×${s.ruchy}${wyda ? (brak ? ` <b class="zle">brak ${brak}</b>` : ` <b>→ ×${po}</b>`) : ''}</span>`;
      return;
    }
    const klasy: string[] = [];
    // The first ones are the level's own, the last `bonus` ones came from the hotel / luck (bright rim).
    for (let i = 0; i < max; i++) {
      const k: string[] = [i < s.ruchy ? 'pelny' : 'pusty'];
      if (i >= max - s.bonus) k.push('bonus');
      if (pg && i < s.ruchy) {
        if (brak) k.push('miga');
        else if (i >= s.ruchy - wyda) k.push(i < s.ruchy - pg.cios ? 'but' : 'cios');
      }
      klasy.push(k.join(' '));
    }
    for (let i = 0; i < brak; i++) klasy.push('brak');
    const n = klasy.length;
    w.style.gridTemplateColumns = `repeat(${n >= 6 ? 4 : Math.max(1, n)}, 18px)`;
    w.innerHTML = klasy.map(bz).join('');
  }

  private promien = PROMIEN;
  private katy = KATY;

  /** `koszt` = small ambers' HTML (koszty()) or a short text („1/2”, „gotowy”); `opis` = its words for readers. */
  private przycisk(klasa: string, ikona: string, nazwa: string, koszt: string, onClick: () => void, i: number, opts: { off?: boolean; blysk?: boolean; on?: boolean; uwaga?: boolean; wybrany?: boolean; zacheta?: boolean; opis?: string } = {}) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `wk-b ${klasa}${opts.blysk ? ' blysk' : ''}${opts.on ? ' on' : ''}${opts.uwaga ? ' uwaga' : ''}${opts.wybrany ? ' wybrany' : ''}${opts.zacheta ? ' zacheta' : ''}`;
    b.innerHTML = `${ikona}<span class="n">${nazwa}${koszt.startsWith('<') ? koszt : koszt ? `<small>${koszt}</small>` : ''}</span>`;
    b.setAttribute('aria-label', `${nazwa}${opts.opis ? `, ${opts.opis}` : ''}`);
    if (opts.wybrany) b.setAttribute('aria-pressed', 'true');
    // Disabled ones still answer with why (TuryWalki says it in the hint line).
    if (opts.off) b.setAttribute('aria-disabled', 'true'), b.style.filter = 'grayscale(0.8)', b.style.opacity = opts.wybrany ? '0.8' : '0.5';
    const a = ((this.katy[i] ?? KATY[i] ?? -90) * Math.PI) / 180;
    const dx = Math.round(Math.cos(a) * this.promien), dy = Math.round(Math.sin(a) * this.promien);
    b.style.left = `${dx}px`;
    b.style.top = `${dy}px`;
    // Grows out of the figure: starts at the ring's middle (owner, 19 Oct 2026).
    b.style.setProperty('--ox', `${-dx}px`);
    b.style.setProperty('--oy', `${-dy}px`);
    b.style.transitionDelay = `${i * 60}ms`;
    b.onclick = onClick;
    return b;
  }

  ustaw(s: StanKola) {
    const bylo = this.stan;
    this.stan = s;
    const el = this.el;
    const gracz = s.tura === 'gracz';
    el.classList.toggle('wrog', s.tura === 'wrogowie');
    el.querySelector<HTMLElement>('.wn-tura')!.textContent = gracz ? 'TWOJA TURA' : s.tura === 'wrogowie' ? 'TURA WROGA…' : 'ROZSTAWIENIE…';
    this.rysujPule(s);
    const full = Math.max(s.maxHp, 1);
    el.querySelector<HTMLElement>('.wn-zl')!.textContent = `♥ ${s.hp}/${s.maxHp}${s.extra ? ` +${s.extra}` : ''}`;
    el.querySelector<HTMLElement>('.wn-tuba i')!.style.width = `${(100 * Math.min(s.hp, full)) / full}%`;
    const b = el.querySelector<HTMLElement>('.wn-tuba b')!;
    b.style.left = `${(100 * Math.min(s.hp, full)) / full}%`;
    b.style.width = `${(100 * Math.min(s.extra, full)) / full}%`;
    el.classList.toggle('nisko', s.hp <= s.maxHp / 3);
    const ucieczka = el.querySelector<HTMLButtonElement>('.wn-ucieczka')!;
    ucieczka.disabled = !gracz || s.busy;
    ucieczka.classList.toggle('pyta', s.ucieczkaPytanie);
    ucieczka.querySelector('span')!.textContent = s.ucieczkaPytanie ? 'Na pewno?' : 'Uciekaj';
    const koniec = el.querySelector<HTMLButtonElement>('.wn-koniec')!;
    koniec.disabled = !gracz || s.busy;
    koniec.classList.toggle('teraz', gracz && !s.busy && s.ruchy > 0 && s.ruchy < s.koszt.cios);
    const podp = el.querySelector<HTMLElement>('.wn-podp')!;
    podp.textContent = gracz ? s.podpowiedz : s.tura === 'wrogowie' ? 'Przeciwnicy odpowiadają – poczekaj.' : 'Grupka się rozstawia…';
    podp.classList.toggle('rada', gracz && s.rada);

    // The ring: rebuilt only when what it shows changes (its buttons animate in).
    const otwarte = gracz && !s.busy ? s.kolo : null;
    const klucz = JSON.stringify([otwarte, s.ruchy, s.hp, s.tryb, s.unik, s.zapowiedz, s.bron, s.bronId, s.ataki, this.wskaz()]);
    if (this.ring.dataset.k === klucz) return;
    this.ring.dataset.k = klucz;
    if (!otwarte) {
      this.ring.classList.remove('on');
      this.ring.textContent = '';
      return;
    }
    const ruchyTxt = (n: number) => `${n} ${n === 1 ? 'ruch' : 'ruchy'}`;
    const ruchy = (n: number) => koszty(0, n);
    const wskaz = this.wskaz();
    this.ring.classList.toggle('wrog', otwarte === 'wrog');
    this.promien = PROMIEN;
    this.katy = KATY;
    this.ring.textContent = '';
    if (otwarte === 'wrog' && s.ataki) {
      const bron = `<img src="${itemPictureUrl(s.bronId ?? 'kijek') ?? itemPictureUrl('kijek')}" alt="">`;
      const ikona: Record<string, string> = { zamach: IKONY.zamach, wachlarz: IKONY.ogien, salwa: IKONY.salwa, wiecej: IKONY.wiecej };
      const luk = LUK[Math.min(4, s.ataki.length)] ?? LUK[4];
      this.promien = luk.r;
      const rot = this.obrot(luk.katy, luk.r, 64);
      this.katy = luk.katy.map((k) => k + rot);
      const ktos = s.ataki.some((a) => a.wybrany);
      // Nothing picked yet: the cheapest affordable attack pulses slowly, as a hint where to tap.
      const tani = ktos ? null : s.ataki.filter((a) => !a.off && !a.strona).sort((a, b) => a.koszt + a.podejscie - b.koszt - b.podejscie)[0] ?? null;
      s.ataki.slice(0, 4).forEach((a, i) => this.ring.append(this.przycisk(a.id, ikona[a.id] ?? bron, a.tekst,
        a.strona ?? koszty(a.podejscie, a.koszt), () => this.on.atak(a.id), i, {
          off: a.off, wybrany: a.wybrany, zacheta: a === tani && wskaz !== 'cios', blysk: wskaz === 'cios' && i === 0 && !ktos,
          opis: a.strona ? `strona ${a.strona}` : `${ruchyTxt(a.koszt)}${a.podejscie ? ` i ${ruchyTxt(a.podejscie)} na podejście` : ''}`,
        })));
    } else {
      const rot = this.obrot(KATY, PROMIEN, 50);
      this.katy = KATY.map((k) => k + rot);
      this.ring.append(
        this.przycisk('lecz', IKONY.lecz, 'Leczenie', ruchy(s.koszt.lecz), () => this.on.lecz(), 0, {
          opis: ruchyTxt(s.koszt.lecz),
          off: s.ruchy < s.koszt.lecz || s.hp >= s.maxHp, blysk: wskaz === 'lecz' || (s.hp <= s.maxHp / 2 && s.ruchy >= s.koszt.lecz),
        }),
        this.przycisk('unik', IKONY.unik, s.unik ? 'Unik ✔' : 'Unik', s.unik ? 'gotowy' : ruchy(s.koszt.oslona), () => this.on.unik(), 1, {
          opis: ruchyTxt(s.koszt.oslona),
          off: s.unik || s.ruchy < s.koszt.oslona, blysk: s.zapowiedz && !s.unik, on: s.unik,
        }),
      );
    }
    // Next frame, so the buttons grow out of the figure.
    if (!bylo?.kolo || bylo.kolo !== otwarte || !this.ring.classList.contains('on')) {
      this.ring.classList.remove('on');
      void this.ring.offsetWidth; // the start pose is laid out before the grow begins
      requestAnimationFrame(() => requestAnimationFrame(() => this.ring.classList.add('on')));
    } else this.ring.classList.add('on');
  }

  zamknij() {
    window.removeEventListener('keydown', this.klawisze);
    document.body.classList.remove('walka-kolo');
    this.el.remove();
    this.ring.remove();
    this.pula.remove();
  }
}
