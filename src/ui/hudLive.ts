// The controls of the new-controls test (walka/live.ts, owner 26 Oct 2026), laid out like the new exp-lore:
//  - bottom right an ATTACK stick: a tap attacks (the nearest enemy), dragging aims (a bow/wand shows the aim line),
//    letting go attacks that way; held still long enough it is the strong blow;
//  - left of it the SKILL chosen at a training place (costs stamina/mana, own cooldown), above it HEAL;
//  - life and stamina/mana are two tubes beside the production telescope HUD's portrait (hudTeleskop.ts
//    teleskopRurki/ustawRurki – owner: „użyj tego HUD-u, tylko dodaj 2 rurki”, no life flask);
//  - the movement joystick stays a Phaser drawing bottom-left (UIScene), fixed in place.
// Plain HTML outside #game, so taps on it never reach the joystick or the map.
import { pressAttack, dragAttack, releaseAttack, requestStrong, requestHeal } from '../controls';
import { naEkranie } from '../obrot';
import { ustawRurki } from './hudTeleskop';

export interface LiveHudView {
  hp: number;
  maxHp: number;
  extra: number;
  zatruty?: boolean;
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

/** How far the fixed joystick and the attack buttons stand in from the screen's edges (owner, 26 Oct 2026: they sat
 * right at the edge – too far for the thumbs). */
export const ODSTEP_OD_KRAWEDZI = 40;

const CSS = `
#hud-ster{position:fixed;inset:0;z-index:6;pointer-events:none;font-family:'Alegreya Sans',system-ui,sans-serif}
#hud-ster.off{display:none}#hud-ster.dim{opacity:.4}#hud-ster.dim *{pointer-events:none!important}
#hud-ster .hs{position:absolute;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;
  border-radius:50%;display:grid;place-items:center;cursor:pointer;padding:0;color:#fff3ce}
#hud-ster .hs-atak{right:calc(${40 + ODSTEP_OD_KRAWEDZI}px + env(safe-area-inset-right));bottom:calc(48px + env(safe-area-inset-bottom));width:100px;height:100px;
  border:2px solid #eac280;background:radial-gradient(circle at 50% 40%,rgba(217,156,62,.32),rgba(60,36,14,.45));
  box-shadow:inset 0 0 0 7px rgba(239,192,107,.22),0 4px 14px rgba(0,0,0,.35)}
#hud-ster .hs-atak .nub{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;
  background:radial-gradient(circle at 40% 35%,#b98a4c,#5e3f1c);border:2px solid #efcf93;box-shadow:0 4px 10px rgba(0,0,0,.4);pointer-events:none;
  display:grid;place-items:center}
#hud-ster .hs-atak .nub img{width:32px;height:32px;image-rendering:pixelated}
#hud-ster .hs-atak .nub b{font-size:22px;line-height:1}
#hud-ster .hs-atak.on{border-color:#ffe2a0;box-shadow:inset 0 0 0 7px rgba(255,214,120,.4),0 0 18px rgba(255,190,80,.45)}
#hud-ster small{position:absolute;left:50%;transform:translateX(-50%);bottom:-17px;font:800 10px/1 'Alegreya Sans',sans-serif;letter-spacing:1px;
  color:#fff3ce;text-shadow:0 1px 0 #000,0 0 3px #000;white-space:nowrap;pointer-events:none}
#hud-ster .hs-spec{right:calc(${154 + ODSTEP_OD_KRAWEDZI}px + env(safe-area-inset-right));bottom:calc(50px + env(safe-area-inset-bottom));width:70px;height:70px;font-size:26px;
  border:2px solid #f0ca87;background:radial-gradient(circle at 40% 35%,#3a5c55,#1d3833);box-shadow:0 4px 14px rgba(0,0,0,.4)}
#hud-ster .hs-lecz{right:calc(${62 + ODSTEP_OD_KRAWEDZI}px + env(safe-area-inset-right));bottom:calc(166px + env(safe-area-inset-bottom));width:56px;height:56px;font-size:22px;
  border:2px solid #e8a3a0;background:radial-gradient(circle at 40% 35%,#7d2a26,#3d1210);box-shadow:0 4px 14px rgba(0,0,0,.4)}
#hud-ster .nie{filter:grayscale(.85) brightness(.7)}
#hud-ster .hs-n{position:absolute;right:-4px;top:-4px;min-width:18px;height:18px;border-radius:9px;background:#24170b;border:1px solid #c9973f;
  font:700 11px/16px sans-serif;color:#fff;text-align:center;pointer-events:none}
#hud-ster .hs-cd{position:absolute;inset:0;border-radius:50%;pointer-events:none;background:conic-gradient(rgba(0,0,0,.55) var(--cd,0%),transparent 0)}
@media (max-height:420px){#hud-ster .hs-atak{bottom:calc(30px + env(safe-area-inset-bottom));width:90px;height:90px}
  #hud-ster .hs-spec{bottom:calc(32px + env(safe-area-inset-bottom));right:calc(${142 + ODSTEP_OD_KRAWEDZI}px + env(safe-area-inset-right));width:62px;height:62px}
  #hud-ster .hs-lecz{bottom:calc(140px + env(safe-area-inset-bottom));right:calc(${58 + ODSTEP_OD_KRAWEDZI}px + env(safe-area-inset-right));width:50px;height:50px}}
@media (pointer:fine){#hud-ster .hs{transform:scale(.85);transform-origin:right bottom}}
`;

let ster: HTMLDivElement | null = null;
let el: {
  atak: HTMLButtonElement; nub: HTMLElement; atakImg: HTMLImageElement; atakTxt: HTMLElement;
  spec: HTMLButtonElement; specIk: HTMLElement; specSmall: HTMLElement; specCd: HTMLElement;
  lecz: HTMLButtonElement; leczIk: HTMLElement; leczN: HTMLElement;
} | null = null;

function style() {
  if (document.getElementById('hud-live-css')) return;
  const s = document.createElement('style');
  s.id = 'hud-live-css';
  s.textContent = CSS;
  document.head.append(s);
}

export function zamontujHudLive() {
  odmontujHudLive();
  style();
  ster = document.createElement('div');
  ster.id = 'hud-ster';
  const mk = (cls: string, label: string) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `hs ${cls}`;
    b.title = b.ariaLabel = label;
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    return b;
  };

  // The attack stick (exp-lore): tap = attack, drag = aim, let go = attack that way.
  const atak = mk('hs-atak', 'Atak (Spacja): dotknij, albo przeciągnij, żeby wycelować, i puść');
  const nub = document.createElement('span');
  nub.className = 'nub';
  const atakImg = document.createElement('img');
  atakImg.alt = '';
  const atakTxt = document.createElement('b');
  atakTxt.textContent = '⚔';
  nub.append(atakImg, atakTxt);
  const atakSmall = document.createElement('small');
  atakSmall.textContent = 'ATAK';
  atak.append(nub, atakSmall);
  let start: { x: number; y: number; id: number } | null = null;
  atak.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    atak.setPointerCapture(e.pointerId);
    const p0 = naEkranie(e.clientX, e.clientY);
    start = { x: p0.x, y: p0.y, id: e.pointerId };
    atak.classList.add('on');
    pressAttack();
  });
  atak.addEventListener('pointermove', (e) => {
    if (start?.id !== e.pointerId) return;
    const p = naEkranie(e.clientX, e.clientY);
    const dx = p.x - start.x, dy = p.y - start.y, len = Math.hypot(dx, dy), r = atak.clientWidth * 0.34, k = Math.min(1, r / (len || 1));
    nub.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    dragAttack(dx, dy);
  });
  const up = (e: PointerEvent) => {
    if (start?.id !== e.pointerId) return;
    start = null;
    nub.style.transform = '';
    atak.classList.remove('on');
    releaseAttack();
  };
  atak.addEventListener('pointerup', up);
  atak.addEventListener('pointercancel', up);

  const spec = mk('hs-spec', 'Umiejętność (Q)');
  const specIk = document.createElement('span');
  const specCd = document.createElement('span');
  specCd.className = 'hs-cd';
  const specSmall = document.createElement('small');
  spec.append(specIk, specCd, specSmall);
  spec.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    requestStrong();
  });

  const lecz = mk('hs-lecz', 'Lecz (H)');
  const leczIk = document.createElement('span');
  const leczN = document.createElement('span');
  leczN.className = 'hs-n';
  const leczSmall = document.createElement('small');
  leczSmall.textContent = 'LECZ';
  lecz.append(leczIk, leczN, leczSmall);
  lecz.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    requestHeal();
  });

  ster.append(spec, lecz, atak);
  document.body.append(ster);
  el = { atak, nub, atakImg, atakTxt, spec, specIk, specSmall, specCd, lecz, leczIk, leczN };
}

export function odmontujHudLive() {
  ster?.remove();
  ster = null;
  el = null;
}

export function hudLiveWidoczny(tryb: 'on' | 'dim' | 'off') {
  ster?.classList.toggle('off', tryb === 'off');
  ster?.classList.toggle('dim', tryb === 'dim');
}

export function ustawHudLive(v: LiveHudView) {
  ustawRurki({ hp: v.hp, hpMax: v.maxHp, extra: v.extra, zatruty: v.zatruty });
  if (!el) return;
  // The stick's knob shows the weapon in hand.
  if (v.bron.pic) {
    if (el.atakImg.getAttribute('src') !== v.bron.pic) el.atakImg.src = v.bron.pic;
    el.atakImg.hidden = false;
    el.atakTxt.hidden = true;
  } else {
    el.atakImg.hidden = true;
    el.atakTxt.hidden = false;
  }
  el.leczIk.textContent = v.potions > 0 ? '🧪' : '🍎';
  el.leczN.textContent = `${v.potions > 0 ? v.potions : v.fruit}`;
  el.lecz.classList.toggle('nie', v.noHeal || v.hp >= v.maxHp);
}

export function ustawZasobyHud(z: LiveZasoby) {
  ustawRurki({ s: z.magia ? z.m : z.s, sMax: z.magia ? z.mMax : z.sMax, mana: z.magia, slabo: z.wyczerpany });
  if (!el) return;
  el.specIk.textContent = z.umiej.ikona;
  el.specSmall.textContent = z.umiej.nazwa.toUpperCase();
  el.spec.title = el.spec.ariaLabel = `${z.umiej.nazwa} (Q) – zmienisz ją w ośrodku treningowym`;
  el.spec.classList.toggle('nie', !z.stac);
  el.specCd.style.setProperty('--cd', z.gotowy ? '0%' : '100%');
}
