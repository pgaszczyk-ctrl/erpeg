// The HUD of the new-controls test (walka/live.ts, owner 26 Oct 2026):
//  - top left (right of the ☰ button): the leading LIFE FLASK (red liquid; a potion's bonus blue on top),
//    under it the STAMINA bar (sword/bow; "zmęczenie") – or MANA (blue) with a magic weapon in hand –, and under
//    that EXPERIENCE as the column of a THERMOMETER (bulb with the level number);
//    small buttons beside the flask: Kufer (backpack/character), camera;
//  - bottom right: the controls – ATTACK (big; hold to aim a bow/wand, hold long for a strong blow), the SKILL
//    chosen at a training place (costs stamina/mana, own cooldown) and HEAL (potion, then food);
//  - the joystick stays a Phaser drawing bottom-left (UIScene), fixed in place.
// Plain HTML outside #game, so taps on it never reach the joystick or the map.
import { pressAttack, dragAttack, releaseAttack, requestStrong, requestHeal } from '../controls';

export interface LiveHudView {
  hp: number;
  maxHp: number;
  extra: number;
  zatruty?: boolean;
  expShare: number;
  poziom: number;
  potions: number;
  fruit: number;
  noHeal: boolean;
  bron: { pic: string | null; label: string; warn: boolean; title: string };
}

export interface LiveZasoby {
  s: number;
  sMax: number;
  m: number;
  mMax: number;
  magia: boolean;
  wyczerpany: boolean;
  bezpiecznie: boolean;
  umiej: { nazwa: string; ikona: string };
  gotowy: boolean;
  stac: boolean;
}

export interface LiveHandlers {
  character: () => void;
  camera: () => void;
}

const CSS = `
#hud-live{position:fixed;left:calc(6px + env(safe-area-inset-left));top:calc(72px + env(safe-area-inset-top));z-index:6;display:flex;gap:6px;align-items:flex-start;pointer-events:none;font:600 11px/1.1 'Alegreya Sans',system-ui,sans-serif;color:#f6ead2;text-shadow:0 1px 0 #000}
#hud-live.dim{opacity:.45}#hud-live.off{display:none}
#hud-live .hl-col{display:flex;flex-direction:column;gap:5px;align-items:flex-start}
#hud-live .hl-flask{position:relative;width:62px;height:70px;pointer-events:auto;cursor:pointer;border:0;background:none;padding:0}
#hud-live .hl-flask svg{width:100%;height:100%;filter:drop-shadow(0 2px 2px rgba(0,0,0,.55))}
#hud-live .hl-flask b{position:absolute;left:0;right:0;bottom:12px;text-align:center;font-size:12px}
#hud-live .hl-bar{position:relative;width:112px;height:13px;border-radius:7px;background:#1d140c;border:2px solid #b8893b;box-shadow:inset 0 1px 3px #000,0 1px 2px rgba(0,0,0,.5);overflow:hidden}
#hud-live .hl-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:5px;transition:width .12s linear}
#hud-live .hl-bar.s i{background:linear-gradient(#ffe48a,#e0a923 55%,#a8700f)}
#hud-live .hl-bar.s.low i{background:linear-gradient(#ffb08a,#d2552a 55%,#8e2c10)}
#hud-live .hl-bar.m i{background:linear-gradient(#bfe6ff,#3d8fe0 55%,#1d4f9c)}
#hud-live .hl-bar span{position:absolute;inset:0;text-align:center;font-size:10px;line-height:11px}
#hud-live .hl-th{position:relative;width:122px;height:20px}
#hud-live .hl-th svg{width:100%;height:100%;filter:drop-shadow(0 1px 1px rgba(0,0,0,.55))}
#hud-live .hl-th b{position:absolute;left:0;top:0;width:20px;line-height:20px;text-align:center;font-size:11px;color:#fff}
#hud-live .hl-safe{font-size:10px;color:#bfe9a8;opacity:0;transition:opacity .4s}
#hud-live .hl-safe.on{opacity:1}
#hud-live .hl-mini{display:flex;flex-direction:column;gap:5px;margin-top:4px}
#hud-live .hl-mini button{pointer-events:auto;width:30px;height:30px;border-radius:50%;border:2px solid #b8893b;background:radial-gradient(circle at 40% 35%,#5a3f22,#24170b);color:#fff;font-size:15px;padding:0;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.6)}
#hud-ster{position:fixed;right:calc(14px + env(safe-area-inset-right));bottom:calc(18px + env(safe-area-inset-bottom));width:178px;height:178px;z-index:6;pointer-events:none}
#hud-ster.off{display:none}#hud-ster.dim{opacity:.4}#hud-ster.dim button{pointer-events:none}
#hud-ster button{position:absolute;pointer-events:auto;border-radius:50%;border:3px solid #c9973f;color:#fff;padding:0;touch-action:none;user-select:none;-webkit-user-select:none;box-shadow:0 2px 6px rgba(0,0,0,.6),inset 0 2px 4px rgba(255,255,255,.25);cursor:pointer}
#hud-ster .hs-atak{right:0;bottom:0;width:84px;height:84px;font-size:34px;background:radial-gradient(circle at 40% 35%,#e0574a,#7d1b14)}
#hud-ster .hs-atak.on{filter:brightness(1.35)}
#hud-ster .hs-atak img{width:46px;height:46px;image-rendering:pixelated;pointer-events:none}
#hud-ster .hs-spec{right:88px;bottom:6px;width:58px;height:58px;font-size:24px;background:radial-gradient(circle at 40% 35%,#d8a53a,#6a4310)}
#hud-ster .hs-lecz{right:12px;bottom:92px;width:58px;height:58px;font-size:24px;background:radial-gradient(circle at 40% 35%,#64c46a,#1e5a22)}
#hud-ster .hs-spec.nie,#hud-ster .hs-lecz.nie{filter:grayscale(.85) brightness(.7)}
#hud-ster small{position:absolute;left:0;right:0;bottom:-15px;text-align:center;font:600 10px/1 'Alegreya Sans',sans-serif;color:#f6ead2;text-shadow:0 1px 0 #000;pointer-events:none;white-space:nowrap}
#hud-ster .hs-n{position:absolute;right:-4px;top:-4px;min-width:18px;height:18px;border-radius:9px;background:#24170b;border:1px solid #c9973f;font:700 11px/16px sans-serif;color:#fff;pointer-events:none}
@media (pointer:fine){#hud-ster{transform:scale(.82);transform-origin:right bottom}}
`;

let root: HTMLDivElement | null = null;
let ster: HTMLDivElement | null = null;
let el: {
  flaskFill: SVGRectElement; flaskExtra: SVGRectElement; flaskTxt: HTMLElement; liquid: SVGStopElement;
  bar: HTMLDivElement; barFill: HTMLElement; barTxt: HTMLElement; thFill: SVGRectElement; thLvl: HTMLElement; safe: HTMLElement;
  atak: HTMLButtonElement; atakImg: HTMLImageElement; spec: HTMLButtonElement; specSmall: HTMLElement; lecz: HTMLButtonElement; leczN: HTMLElement; leczSmall: HTMLElement;
} | null = null;

const FLASK = `<svg viewBox="0 0 62 70" aria-hidden="true"><defs>
<clipPath id="hl-fc"><path d="M24 4h14v15c11 4 19 14 19 26 0 14-11.5 22-26 22S5 59 5 45c0-12 8-22 19-26z"/></clipPath>
<linearGradient id="hl-liq" x1="0" x2="1"><stop offset="0" stop-color="#ff5a4e"/><stop offset=".55" stop-color="#c8231b"/><stop offset="1" stop-color="#7d0e0a"/></linearGradient>
<radialGradient id="hl-glass" cx="35%" cy="40%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#9ccfe0" stop-opacity=".08"/></radialGradient></defs>
<g clip-path="url(#hl-fc)"><rect x="0" y="0" width="62" height="70" fill="#2a120e" opacity=".85"/>
<rect class="lf" x="0" y="70" width="62" height="0" fill="url(#hl-liq)"/><rect class="le" x="0" y="70" width="62" height="0" fill="#4aa3ff" opacity=".9"/>
<rect x="0" y="0" width="62" height="70" fill="url(#hl-glass)"/></g>
<path d="M24 4h14v15c11 4 19 14 19 26 0 14-11.5 22-26 22S5 59 5 45c0-12 8-22 19-26z" fill="none" stroke="#c9973f" stroke-width="3"/>
<rect x="21" y="1" width="20" height="6" rx="2" fill="#7a4a1c" stroke="#c9973f" stroke-width="1.5"/>
<path d="M13 34c2-5 6-8 10-9" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/></svg>`;

const THERMO = `<svg viewBox="0 0 122 20" aria-hidden="true">
<rect x="14" y="5" width="105" height="10" rx="5" fill="#1d140c" stroke="#c9973f" stroke-width="2"/>
<rect class="tf" x="16" y="7" width="0" height="6" rx="3" fill="#e8892a"/>
${[30, 50, 70, 90, 110].map((x) => `<path d="M${x} 5v3" stroke="#c9973f" stroke-width="1"/>`).join('')}
<circle cx="10" cy="10" r="9" fill="#c8551b" stroke="#c9973f" stroke-width="2"/>
<path d="M6 7a4 4 0 0 1 3-2.5" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.4" stroke-linecap="round"/></svg>`;

const ICON_ATAK = '⚔';

function style() {
  if (document.getElementById('hud-live-css')) return;
  const s = document.createElement('style');
  s.id = 'hud-live-css';
  s.textContent = CSS;
  document.head.append(s);
}

export function zamontujHudLive(on: LiveHandlers) {
  odmontujHudLive();
  style();
  root = document.createElement('div');
  root.id = 'hud-live';
  const col = document.createElement('div');
  col.className = 'hl-col';
  const flask = document.createElement('button');
  flask.className = 'hl-flask';
  flask.setAttribute('aria-label', 'Życie – dotknij, żeby się uleczyć');
  flask.innerHTML = `${FLASK}<b></b>`;
  flask.addEventListener('click', () => requestHeal());
  const bar = document.createElement('div');
  bar.className = 'hl-bar s';
  bar.innerHTML = '<i></i><span></span>';
  const th = document.createElement('div');
  th.className = 'hl-th';
  th.title = 'Doświadczenie do następnego poziomu';
  th.innerHTML = `${THERMO}<b></b>`;
  const safe = document.createElement('div');
  safe.className = 'hl-safe';
  safe.textContent = '🌿 bezpiecznie – odpoczywasz';
  col.append(flask, bar, th, safe);
  const mini = document.createElement('div');
  mini.className = 'hl-mini';
  const b = (t: string, label: string, fn: () => void) => {
    const x = document.createElement('button');
    x.textContent = t;
    x.title = x.ariaLabel = label;
    x.addEventListener('click', fn);
    return x;
  };
  mini.append(b('🎒', 'Kufer (C)', on.character), b('📷', 'Zdjęcie', on.camera));
  root.append(col, mini);
  document.body.append(root);

  ster = document.createElement('div');
  ster.id = 'hud-ster';
  const atak = document.createElement('button');
  atak.className = 'hs-atak';
  atak.title = atak.ariaLabel = 'Atak (Spacja) – przytrzymaj, żeby celować lub zadać mocny cios';
  const atakImg = document.createElement('img');
  atakImg.alt = '';
  atak.append(atakImg);
  let start: { x: number; y: number; id: number } | null = null;
  atak.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    atak.setPointerCapture(e.pointerId);
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    atak.classList.add('on');
    pressAttack();
  });
  atak.addEventListener('pointermove', (e) => {
    if (start?.id === e.pointerId) dragAttack(e.clientX - start.x, e.clientY - start.y);
  });
  const up = (e: PointerEvent) => {
    if (start?.id !== e.pointerId) return;
    start = null;
    atak.classList.remove('on');
    releaseAttack();
  };
  atak.addEventListener('pointerup', up);
  atak.addEventListener('pointercancel', up);
  atak.addEventListener('contextmenu', (e) => e.preventDefault());
  const spec = document.createElement('button');
  spec.className = 'hs-spec';
  const specSmall = document.createElement('small');
  spec.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    requestStrong();
  });
  const lecz = document.createElement('button');
  lecz.className = 'hs-lecz';
  lecz.title = lecz.ariaLabel = 'Lecz (H)';
  const leczN = document.createElement('span');
  leczN.className = 'hs-n';
  const leczSmall = document.createElement('small');
  lecz.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    requestHeal();
  });
  ster.append(atak, spec, lecz);
  document.body.append(ster);
  el = {
    flaskFill: flask.querySelector('.lf')!, flaskExtra: flask.querySelector('.le')!, flaskTxt: flask.querySelector('b')!, liquid: flask.querySelector('#hl-liq stop')!,
    bar, barFill: bar.querySelector('i')!, barTxt: bar.querySelector('span')!, thFill: th.querySelector('.tf')!, thLvl: th.querySelector('b')!, safe,
    atak, atakImg, spec, specSmall, lecz, leczN, leczSmall,
  };
  atak.prepend(document.createTextNode(''));
}

export function odmontujHudLive() {
  root?.remove();
  ster?.remove();
  root = ster = null;
  el = null;
}

export function hudLiveWidoczny(tryb: 'on' | 'dim' | 'off') {
  for (const r of [root, ster]) {
    r?.classList.toggle('off', tryb === 'off');
    r?.classList.toggle('dim', tryb === 'dim');
  }
}

const pol = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1).replace('.', ','));

export function ustawHudLive(v: LiveHudView) {
  if (!el) return;
  // Life in hearts (half-hearts inside the game).
  const max = Math.max(1, v.maxHp);
  const share = Math.max(0, Math.min(1, v.hp / max));
  const extra = Math.max(0, Math.min(1 - share, v.extra / max));
  const top = 14, bottom = 67, h = bottom - top;
  el.flaskFill.setAttribute('y', `${bottom - h * share}`);
  el.flaskFill.setAttribute('height', `${h * share}`);
  el.flaskExtra.setAttribute('y', `${bottom - h * (share + extra)}`);
  el.flaskExtra.setAttribute('height', `${h * extra}`);
  el.liquid.setAttribute('stop-color', v.zatruty ? '#8bd35a' : '#ff5a4e');
  el.flaskTxt.textContent = `${pol(v.hp / 2)}/${pol(max / 2)}`;
  el.thFill.setAttribute('width', `${Math.max(0, Math.min(1, v.expShare)) * 101}`);
  el.thLvl.textContent = `${v.poziom}`;
  // The attack button shows the weapon in hand.
  if (v.bron.pic) {
    if (el.atakImg.src !== v.bron.pic) el.atakImg.src = v.bron.pic;
    el.atakImg.hidden = false;
    (el.atak.firstChild as Text).textContent = '';
  } else {
    el.atakImg.hidden = true;
    (el.atak.firstChild as Text).textContent = ICON_ATAK;
  }
  el.lecz.textContent = v.potions > 0 ? '🧪' : '🍎';
  el.leczN.textContent = `${v.potions > 0 ? v.potions : v.fruit}`;
  el.leczSmall.textContent = 'Lecz';
  el.lecz.append(el.leczN, el.leczSmall);
  el.lecz.classList.toggle('nie', v.noHeal || v.hp >= v.maxHp);
}

export function ustawZasobyHud(z: LiveZasoby) {
  if (!el) return;
  const mana = z.magia;
  el.bar.classList.toggle('m', mana);
  el.bar.classList.toggle('s', !mana);
  el.bar.classList.toggle('low', !mana && z.wyczerpany);
  const v = mana ? z.m : z.s, max = mana ? z.mMax : z.sMax;
  el.barFill.style.width = `${Math.max(0, Math.min(1, v / max)) * 100}%`;
  el.barTxt.textContent = `${mana ? 'Mana' : z.wyczerpany ? 'Wyczerpanie!' : 'Siły'} ${Math.round(v)}/${Math.round(max)}`;
  el.bar.title = mana ? 'Mana: czary ją zużywają, sama wraca' : 'Siły: ciosy, strzały i bieg w czerwonej mgle męczą; szybko wracają';
  el.safe.classList.toggle('on', z.bezpiecznie);
  el.spec.textContent = z.umiej.ikona;
  el.specSmall.textContent = z.umiej.nazwa;
  el.spec.append(el.specSmall);
  el.spec.title = el.spec.ariaLabel = `${z.umiej.nazwa} (Q) – zmienisz ją w ośrodku treningowym`;
  el.spec.classList.toggle('nie', !z.stac || !z.gotowy);
}
