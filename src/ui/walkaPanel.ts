// The turn fight's panel (MVP 1, test server): one compact strip at the bottom –
// portrait, life, moves, and exactly three main buttons (Cios / Ruch / Specjalne),
// "Specjalne" swaps the row for Mocny / Lecz / Ucieczka with „Wróć". Targets are
// chosen on the map itself (TuryWalki.tap), never from a list of buttons.
// Plain HTML outside #game, so its taps never reach the map.

import { itemPictureUrl } from './itemIcon';

export interface StanPanelu {
  hp: number;
  maxHp: number;
  extra: number;
  ruchy: number;
  maxRuchy: number;
  tura: 'gracz' | 'wrogowie' | 'rozstaw';
  tryb: 'cios' | 'mocny' | 'ruch' | null;
  podmenu: boolean;
  podpowiedz: string;
  /** Weapon kind in hand: null = melee, 'luk' / 'magia' = shots. */
  bron: string | null;
  bronId: string | null;
  celOk: boolean;
  punkt: boolean;
  busy: boolean;
  koszt: { cios: number; ruch: number; mocny: number; lecz: number; ucieczka: number };
}

export interface ObslugaPanelu {
  cios(): void;
  ruch(): void;
  specjalne(): void;
  mocny(): void;
  lecz(): void;
  ucieczka(): void;
  wroc(): void;
  koniecTury(): void;
}

const CSS = `
body.walka-tur #hud .hud-m, body.walka-tur #hud .hud-picks { display: none !important; }
#walka-panel { position: fixed; left: 50%; bottom: max(6px, env(safe-area-inset-bottom)); transform: translateX(-50%);
  width: min(420px, calc(100vw - 12px)); z-index: 7; font-family: 'Alegreya Sans', 'Trebuchet MS', sans-serif; color: #f3dfb0;
  user-select: none; -webkit-user-select: none; touch-action: manipulation; }
#walka-panel .wp-stan { display: flex; align-items: center; gap: 8px; padding: 4px 10px 4px 5px; margin: 0 4px -2px;
  background: linear-gradient(#3b2a1d, #2a1d14); border: 2px solid #b8893a; border-bottom: none; border-radius: 10px 10px 0 0;
  box-shadow: inset 0 1px 0 #e6c27a55; }
#walka-panel .wp-portret { width: 30px; height: 30px; flex: none; border-radius: 50%; border: 2px solid #d6a84c; background: #1e1a24;
  image-rendering: pixelated; box-shadow: 0 0 0 1px #5a3d1c; }
#walka-panel .wp-zycie { flex: 1; min-width: 0; }
#walka-panel .wp-lbl { font-size: 13px; line-height: 1; display: flex; justify-content: space-between; gap: 6px; white-space: nowrap; }
#walka-panel .wp-tuba { position: relative; height: 9px; margin-top: 3px; border-radius: 5px; background: #1e1a24; border: 1px solid #8a6630; overflow: hidden; }
#walka-panel .wp-tuba i { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(#ff7a64, #c1281e); }
#walka-panel .wp-tuba b { position: absolute; top: 0; bottom: 0; background: linear-gradient(#9fdcff, #3a8fd6); }
#walka-panel.nisko .wp-tuba { border-color: #ff6a5a; box-shadow: 0 0 0 1px #ff6a5a; }
#walka-panel.nisko .wp-lbl .z::before { content: '⚠ '; color: #ff8a7a; }
#walka-panel .wp-ruchy { flex: none; text-align: center; font-size: 12px; line-height: 1; }
#walka-panel .wp-ruchy span { display: block; font: 700 19px 'Pixelify Sans', monospace; color: #ffcf6a; text-shadow: 0 0 6px #ff9a2a88; margin-top: 2px; }
#walka-panel .wp-skrzynia { background: linear-gradient(#4a3424, #2f2017); border: 2px solid #b8893a; border-radius: 12px; padding: 5px 6px 6px; box-shadow: 0 6px 16px #0008, inset 0 1px 0 #e6c27a55; }
#walka-panel .wp-podp { min-height: 16px; font-size: 13px; text-align: center; color: #f6e7c2; margin-bottom: 4px; line-height: 1.15; }
#walka-panel .wp-podp b { font: 700 11px 'Pixelify Sans', monospace; letter-spacing: 1px; color: #e9c46a; margin-right: 6px; }
#walka-panel .wp-rzad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
#walka-panel button { font: inherit; color: inherit; cursor: pointer; }
#walka-panel .wp-b { position: relative; min-height: 52px; border-radius: 9px; border: 2px solid #7d5a2a; background: linear-gradient(#5a4130, #3a2a1e);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: 4px 2px; box-shadow: inset 0 1px 0 #ffffff22, 0 2px 0 #1e1a24; }
#walka-panel .wp-b img, #walka-panel .wp-b svg { width: 24px; height: 24px; image-rendering: pixelated; }
#walka-panel .wp-b .n { font-weight: 800; font-size: 15px; line-height: 1; letter-spacing: 0.5px; text-transform: uppercase; }
#walka-panel .wp-b .k { font-size: 11px; opacity: 0.8; line-height: 1; }
#walka-panel .wp-b.on { border-color: #ffd34a; background: linear-gradient(#7a5826, #4e3818); box-shadow: 0 0 0 2px #ffd34a55, inset 0 1px 0 #fff3; }
#walka-panel .wp-b.on.ruch { border-color: #7fe0ff; background: linear-gradient(#2d5470, #1c3448); box-shadow: 0 0 0 2px #7fe0ff55; }
#walka-panel .wp-b.gotowy::after { content: '✔'; position: absolute; top: 3px; right: 6px; font-size: 13px; color: #9dff9a; }
#walka-panel .wp-b:disabled { opacity: 0.42; cursor: default; }
#walka-panel .wp-dol { display: flex; gap: 6px; margin-top: 5px; }
#walka-panel .wp-koniec { flex: 1; min-height: 34px; border-radius: 8px; border: 2px solid #7d5a2a; background: linear-gradient(#3a2a1e, #2a1d14); font-weight: 700; font-size: 15px; }
#walka-panel .wp-koniec:disabled { opacity: 0.45; }
#walka-panel.czekaj .wp-rzad, #walka-panel.czekaj .wp-dol { opacity: 0.5; pointer-events: none; }
@media (max-height: 560px) { #walka-panel .wp-b { min-height: 50px; } #walka-panel .wp-b img, #walka-panel .wp-b svg { width: 22px; height: 22px; } }
`;

/** A small pixel icon from rows of letters (palette below). */
function piksele(rows: string[], kolory: Record<string, string>) {
  const h = rows.length, w = rows[0].length;
  let r = '';
  rows.forEach((row, y) => [...row].forEach((c, x) => {
    const k = kolory[c];
    if (k) r += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${k}"/>`;
  }));
  return `<svg viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
const K = { o: '#1e1a24', y: '#ffd34a', Y: '#fff1a8', r: '#e4473b', R: '#ff8a6a', b: '#59c8ff', B: '#c8f0ff', g: '#7ad36a', w: '#f3dfb0', s: '#9a7448' };
const IKONY = {
  specjalne: piksele([
    '....o....o..',
    '...oyo..oyo.',
    '....oyooyo..',
    '.oo.oYYYo...',
    'oyyoYYYYYoo.',
    '.ooyYYYYYyyo',
    '...oYYYYYoo.',
    '..oyoYYYo...',
    '.oyo.oyo....',
    '..o...oyo...',
    '.......o....',
    '............',
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
  wroc: piksele([
    '............',
    '....o.......',
    '...oyo......',
    '..oyyyoooo..',
    '.oyyyyyyyyo.',
    '..oyyyoooyo.',
    '...oyo...yo.',
    '....o....yo.',
    '.....oooyyo.',
    '.....oyyyo..',
    '......ooo...',
    '............',
  ], K),
};

export class WalkaPanel {
  private el: HTMLDivElement;
  private klawisze = (e: KeyboardEvent) => this.klawisz(e);
  private stan: StanPanelu | null = null;

  constructor(private on: ObslugaPanelu) {
    if (!document.getElementById('walka-css')) {
      const st = document.createElement('style');
      st.id = 'walka-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    document.getElementById('walka-panel')?.remove();
    const el = document.createElement('div');
    el.id = 'walka-panel';
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', 'Walka');
    el.innerHTML = `
      <div class="wp-stan">
        <canvas class="wp-portret" width="30" height="30"></canvas>
        <div class="wp-zycie"><div class="wp-lbl"><span class="z">Życie</span><span class="zl"></span></div><div class="wp-tuba"><i></i><b></b></div></div>
        <div class="wp-ruchy">Ruchy<span class="rl"></span></div>
      </div>
      <div class="wp-skrzynia">
        <div class="wp-podp" aria-live="polite"></div>
        <div class="wp-rzad"></div>
        <div class="wp-dol"><button class="wp-koniec" type="button">Zakończ turę</button></div>
      </div>`;
    document.body.appendChild(el);
    this.el = el;
    // Stop taps on the panel from reaching the map or the joystick.
    for (const ev of ['touchstart', 'touchend', 'mousedown', 'mouseup', 'click'] as const) el.addEventListener(ev, (e) => e.stopPropagation());
    el.querySelector<HTMLButtonElement>('.wp-koniec')!.onclick = () => this.on.koniecTury();
    this.portret();
    window.addEventListener('keydown', this.klawisze);
  }

  /** The hero's head from the HUD's avatar picture. */
  private portret() {
    const src = document.querySelector<HTMLCanvasElement>('#hud .hud-avpic');
    const c = this.el.querySelector<HTMLCanvasElement>('.wp-portret')!;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    if (src && src.width) ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, 30, 30);
  }

  private klawisz(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    const s = this.stan;
    if (!s) return;
    if (e.code === 'Digit1') s.podmenu ? this.on.mocny() : this.on.cios();
    else if (e.code === 'Digit2') s.podmenu ? this.on.lecz() : this.on.ruch();
    else if (e.code === 'Digit3') s.podmenu ? this.on.ucieczka() : this.on.specjalne();
    else if (e.code === 'KeyE') this.on.koniecTury();
    else if (e.code === 'Backspace') this.on.wroc();
    else return;
    e.preventDefault();
  }

  private przycisk(klasa: string, ikona: string, nazwa: string, koszt: string, onClick: () => void, opts: { on?: boolean; gotowy?: boolean; off?: boolean } = {}) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `wp-b ${klasa}${opts.on ? ' on' : ''}${opts.gotowy ? ' gotowy' : ''}`;
    b.innerHTML = `${ikona}<span class="n">${nazwa}</span><span class="k">${koszt}</span>`;
    b.disabled = !!opts.off;
    b.setAttribute('aria-pressed', String(!!opts.on));
    b.onclick = onClick;
    return b;
  }

  ustaw(s: StanPanelu) {
    this.stan = s;
    const el = this.el;
    const full = Math.max(s.maxHp, 1);
    el.querySelector<HTMLElement>('.zl')!.textContent = `${s.hp}/${s.maxHp}${s.extra ? ` +${s.extra}` : ''}`;
    el.querySelector<HTMLElement>('.wp-tuba i')!.style.width = `${(100 * Math.min(s.hp, full)) / full}%`;
    const b = el.querySelector<HTMLElement>('.wp-tuba b')!;
    b.style.left = `${(100 * Math.min(s.hp, full)) / full}%`;
    b.style.width = `${(100 * Math.min(s.extra, full)) / full}%`;
    el.classList.toggle('nisko', s.hp <= s.maxHp / 3);
    el.querySelector<HTMLElement>('.rl')!.textContent = `${s.ruchy}/${s.maxRuchy}`;
    const podp = el.querySelector<HTMLElement>('.wp-podp')!;
    podp.textContent = '';
    const tura = document.createElement('b');
    tura.textContent = s.tura === 'gracz' ? 'TWOJA TURA' : s.tura === 'wrogowie' ? 'TURA PRZECIWNIKÓW' : 'ROZSTAWIENIE';
    podp.append(tura, s.tura === 'gracz' ? s.podpowiedz : s.tura === 'wrogowie' ? 'Odpowiadają…' : 'Grupka się rozstawia…');
    el.classList.toggle('czekaj', s.tura !== 'gracz' || s.busy);
    el.querySelector<HTMLButtonElement>('.wp-koniec')!.disabled = s.tura !== 'gracz' || s.busy;
    const rzad = el.querySelector<HTMLElement>('.wp-rzad')!;
    rzad.textContent = '';
    const ruchyTxt = (n: number) => `${n} ${n === 1 ? 'ruch' : 'ruchy'}`;
    const bronUrl = itemPictureUrl(s.bronId ?? 'kijek') ?? itemPictureUrl('kijek');
    const bronImg = `<img src="${bronUrl}" alt="">`;
    if (!s.podmenu) {
      const atak = s.bron === 'magia' ? 'Czar' : s.bron ? 'Strzał' : 'Cios';
      rzad.append(
        this.przycisk('cios', bronImg, atak, ruchyTxt(s.koszt.cios), () => this.on.cios(), { on: s.tryb === 'cios', gotowy: s.tryb === 'cios' && s.celOk, off: s.ruchy < s.koszt.cios }),
        this.przycisk('ruch', `<img src="${itemPictureUrl('skorzane_buty')}" alt="">`, 'Ruch', ruchyTxt(s.koszt.ruch), () => this.on.ruch(), { on: s.tryb === 'ruch', gotowy: s.tryb === 'ruch' && s.punkt, off: s.ruchy < s.koszt.ruch }),
        this.przycisk('spec', IKONY.specjalne, 'Specjalne', '', () => this.on.specjalne()),
      );
    } else {
      rzad.append(
        this.przycisk('mocny', bronImg.replace('<img', '<img style="filter: drop-shadow(0 0 3px #ffd34a)"'), 'Mocny', ruchyTxt(s.koszt.mocny), () => this.on.mocny(), { on: s.tryb === 'mocny', gotowy: s.tryb === 'mocny' && s.celOk, off: s.ruchy < s.koszt.mocny }),
        this.przycisk('lecz', IKONY.lecz, 'Lecz', ruchyTxt(s.koszt.lecz), () => this.on.lecz(), { off: s.ruchy < s.koszt.lecz || s.hp >= s.maxHp }),
        this.przycisk('uciekaj', IKONY.ucieczka, 'Ucieczka', `−1 ♥`, () => this.on.ucieczka()),
      );
    }
    // In the sub-menu the bottom bar gets „Wróć" next to ending the turn.
    const dol = el.querySelector<HTMLElement>('.wp-dol')!;
    dol.querySelector('.wp-wroc')?.remove();
    if (s.podmenu || s.tryb) {
      const w = document.createElement('button');
      w.type = 'button';
      w.className = 'wp-koniec wp-wroc';
      w.innerHTML = `<span style="display:inline-flex;width:16px;height:16px;vertical-align:-3px;margin-right:4px">${IKONY.wroc}</span>Wróć`;
      w.onclick = () => this.on.wroc();
      dol.prepend(w);
    }
  }

  zamknij() {
    window.removeEventListener('keydown', this.klawisze);
    this.el.remove();
  }
}
