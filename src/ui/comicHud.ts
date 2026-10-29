// Variant A: small native vector assets, shared by the DOM attack stick and Phaser movement stick.
import { TEST } from '../version';
export const comicHud = TEST;
const outer = '27,3 73,3 97,27 97,73 73,97 27,97 3,73 3,27';
const inner = '28,9 72,9 91,28 91,72 72,91 28,91 9,72 9,28';
export const brassPadSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 104">
<polygon points="${outer}" transform="translate(0 4)" fill="#19171b"/>
<polygon points="${outer}" fill="#b78937" stroke="#19171b" stroke-width="3" stroke-linejoin="round"/>
<path d="M5 28L28 5H73L94 27" fill="none" stroke="#ffe397" stroke-width="2"/>
<path d="M96 72L73 96H27L6 74" fill="none" stroke="#705029" stroke-width="2"/>
<polygon points="${inner}" fill="#343132" stroke="#19171b" stroke-width="2"/>
<path d="M46 23L50 17L54 23ZM77 46L83 50L77 54ZM54 77L50 83L46 77ZM23 54L17 50L23 46Z" fill="#d5ab60" stroke="#19171b" stroke-width="1.5"/>
${[[27,8],[73,8],[92,28],[92,72],[73,92],[27,92],[8,72],[8,28]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.3" fill="#514235" stroke="#19171b" stroke-width="1.2"/>`).join('')}</svg>`;
const frameSvg = brassPadSvg.replace(/<path d="M46 23[^>]+\/>/, '');
const frameUrl = `url("data:image/svg+xml,${encodeURIComponent(frameSvg)}")`;
const url = `url("data:image/svg+xml,${encodeURIComponent(brassPadSvg)}")`;
export function mountComicHud() {
  if (!comicHud) return;
  document.body.classList.add('hud-comic-a');
  if (document.getElementById('hud-comic-a-css')) return;
  const s = document.createElement('style');s.id='hud-comic-a-css';
  s.textContent = `
html body.hud-comic-a #hud-ster .hs{border:0;background:${url} center/94% 94% no-repeat;box-shadow:none;border-radius:0;filter:drop-shadow(0 2px 0 #19171b);color:#fff1c9}
html body.hud-comic-a #hud-ster .hs-atak{width:112px;height:116px}
html body.hud-comic-a #hud-ster .hs .nub{box-sizing:border-box;width:48px;height:48px;margin:-24px 0 0 -24px;border:3px solid #19171b;background:#514d49;box-shadow:inset 0 3px 0 #99938a,0 2px 0 #171519}
html body.hud-comic-a #hud-ster .hs-atak.on{filter:brightness(1.14) drop-shadow(0 2px 0 #19171b)}
html body.hud-comic-a #hud-ster small{font:900 11px/1.05 'Alegreya Sans','Trebuchet MS',sans-serif;letter-spacing:.4px;background:#272224;border:2px solid #171519;padding:2px 5px;bottom:-12px;color:#fff0bf;text-shadow:1px 2px #171519;max-width:112px;text-align:center;white-space:normal}
html body.hud-comic-a #hud-ster .hs-spec,html body.hud-comic-a #hud-ster .hs-lecz{background-image:${frameUrl}}
html body.hud-comic-a #hud-ster .hs-spec{width:76px;height:79px;bottom:calc(57px + env(safe-area-inset-bottom))}
html body.hud-comic-a #hud-ster .hs-spec>span:first-child{font-size:30px;filter:drop-shadow(1px 2px 0 #19171b)}
html body.hud-comic-a #hud-ster .hs-lecz{width:58px;height:61px;bottom:calc(187px + env(safe-area-inset-bottom))}
html body.hud-comic-a #hud-ster .hs-cd{inset:13%;border-radius:25%;background:conic-gradient(#171519b8 var(--cd,0%),transparent 0)}
html body.hud-comic-a #hud-ster .hs-n{border:2px solid #19171b;border-radius:3px;background:#e4b34c;color:#201a17;font-weight:900;top:0;right:0}
html body.hud-comic-a #hud-ster .nie{filter:grayscale(.8) brightness(.72)}
#hud-ster .hs-icon{display:grid;place-items:center;width:65%;height:65%;pointer-events:none}
#hud-ster .hs-icon svg{width:100%;height:100%;overflow:visible}
#hud-ster .hs-picker{position:absolute;right:calc(186px + env(safe-area-inset-right));bottom:calc(5px + env(safe-area-inset-bottom));width:96px;height:44px;pointer-events:auto;display:flex;align-items:center;touch-action:none}
#hud-ster .hs-picker[hidden]{display:none}
#hud-ster .hs-picker input{appearance:none;-webkit-appearance:none;width:100%;height:12px;margin:0;background:#302b28;border:3px solid #171519;border-radius:3px;box-shadow:0 2px 0 #b38436;cursor:pointer;touch-action:none}
#hud-ster .hs-picker input::-webkit-slider-thumb{appearance:none;width:26px;height:26px;background:#e8b84b;border:4px solid #19171b;border-radius:4px;box-shadow:inset 0 3px #ffe49b}
#hud-ster .hs-picker input::-moz-range-thumb{width:20px;height:20px;background:#e8b84b;border:4px solid #19171b;border-radius:4px}
html body.hud-comic-a #hud-tel .tel-poziom{background:#302b28;border:2px solid #19171b;border-radius:3px;box-shadow:0 0 0 1.5px #d5a446,0 2px 0 2px #19171b;color:#fff1c9;font-weight:900}
html body.hud-comic-a #hud-tel .tel-kolo .tlo{visibility:hidden}
html body.hud-comic-a #hud-tel .tel-kolo{background:${frameUrl} center/36px 38px no-repeat}
html body.hud-comic-a #hud-tel .tel-kolo .ik{filter:brightness(0) invert(1) sepia(.5) drop-shadow(1px 1px #19171b)}
html body.hud-comic-a #hud-tel .tel-rura{width:12px;border-radius:2px;background:#252224;box-shadow:0 0 0 1px #19171b,0 0 0 2.5px #c99741,1px 2px 0 3.5px #19171b}
/* The comic frames replace the old tube caps and feed pipes completely. Keep the
   frames apart, including their 3.5px ink shadows, at every telescope scale. */
html body.hud-comic-a #hud-tel .tel-czapka,html body.hud-comic-a #hud-tel .tel-fajka{display:none}
html body.hud-comic-a #hud-tel .tel-rurki{left:64px;top:6px;width:34px;height:52px}
html body.hud-comic-a #hud-tel .tel-rura.hp{left:0!important}
html body.hud-comic-a #hud-tel .tel-rura.st{left:22px!important}
html body.hud-comic-a #hud-tel .tel-rura.hp i.p{background:#de4131;box-shadow:inset 3px 0 #ff8560,inset -3px 0 #9b231d}
html body.hud-comic-a #hud-tel .tel-rura.st i.p{background:#e8ae2c;box-shadow:inset 3px 0 #ffe58b,inset -3px 0 #a36a20}
html body.hud-comic-a #hud-tel .tel-rura.st.mana i.p{background:#398ad6;box-shadow:inset 3px 0 #9bd9ff,inset -3px 0 #245393}
html body.hud-comic-a #hud-tel .tel-rura.hp.zatruty i.p{background:#79ab38;box-shadow:inset 3px 0 #b9e873,inset -3px 0 #3e6922}
html body.hud-comic-a #hud-tel .tel-rura.st.slabo i.p{background:#c15e28}
html body.hud-comic-a.hud-teleskop #hud .hud-plate,html body.hud-comic-a.hud-teleskop #hud .hud-money,html body.hud-comic-a.hud-teleskop #hud .hud-quest{background:#302b28!important;border:2px solid #19171b!important;border-radius:4px!important;box-shadow:0 0 0 2px #be913f,0 2px 0 3px #19171b,inset 0 2px #756047!important}
html body.hud-comic-a.hud-teleskop #hud .hud-compass{border-radius:0!important;background:${frameUrl} center/100% 100% no-repeat!important}
html body.hud-comic-a.hud-teleskop #hud .hud-quest{font-weight:900}
html body.hud-comic-a #hud-ster button:focus-visible,html body.hud-comic-a #hud-ster input:focus-visible{outline:3px solid #fff0ad;outline-offset:4px}
@media(max-height:420px){html body.hud-comic-a #hud-ster .hs-atak{width:96px;height:100px;bottom:calc(30px + env(safe-area-inset-bottom))}html body.hud-comic-a #hud-ster .hs-spec,html body.hud-comic-a #hud-ster .hs-lecz{background-image:${frameUrl}}
html body.hud-comic-a #hud-ster .hs-spec{width:66px;height:69px;bottom:calc(39px + env(safe-area-inset-bottom))}html body.hud-comic-a #hud-ster .hs-lecz{width:52px;height:55px;bottom:calc(149px + env(safe-area-inset-bottom))}#hud-ster .hs-picker{right:calc(177px + env(safe-area-inset-right));bottom:env(safe-area-inset-bottom);width:86px}}
@media(prefers-reduced-motion:reduce){html body.hud-comic-a #hud-tel .tel-rura i{transition:none}}
`;
  document.head.append(s);
}

/** Canvas version of the same forged plate; no image loading or extra WebGL context. */
export function paintBrassPad(c: CanvasRenderingContext2D) {
  const poly = (str: string, fill: string, stroke: string, width: number) => {
    c.beginPath();str.split(' ').forEach((p,i) => { const [x,y]=p.split(',').map(Number);if(i)c.lineTo(x,y);else c.moveTo(x,y); });
    c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle=stroke;c.lineWidth=width;c.lineJoin='round';c.stroke();
  };
  c.save();c.scale(c.canvas.width/100,c.canvas.height/104);
  c.translate(3,3.12);c.scale(.94,.94);
  c.translate(0,3);poly(outer,'#19171b','#19171b',3);c.translate(0,-3);
  poly(outer,'#b78937','#19171b',3);
  c.beginPath();c.moveTo(5,28);c.lineTo(28,5);c.lineTo(73,5);c.lineTo(94,27);c.strokeStyle='#ffe397';c.lineWidth=3;c.stroke();
  c.beginPath();c.moveTo(96,72);c.lineTo(73,96);c.lineTo(27,96);c.lineTo(6,74);c.strokeStyle='#705029';c.stroke();
  poly(inner,'#343132','#19171b',2);
  for(const [x,y] of [[27,8],[73,8],[92,28],[92,72],[73,92],[27,92],[8,72],[8,28]]){c.beginPath();c.arc(x,y,2.3,0,Math.PI*2);c.fillStyle='#514235';c.fill();c.strokeStyle='#19171b';c.lineWidth=1.2;c.stroke();}
  c.restore();
}

/** Drawn icons stay legible on devices without colour emoji fonts. No baked labels. */
export function comicIcon(id: string): string {
 const icons: Record<string,string> = {
  mocny: '<path d="M12 3L17 10L25 7L24 15L31 19L23 24L25 32L16 29L10 36L7 27L0 26L4 18L0 11L9 11Z" fill="#f3b53b" stroke="#19171b" stroke-width="2.5"/><path d="M15 11L10 22H16L13 29L24 18H18L21 11Z" fill="#fff1b5" stroke="#a74c23" stroke-width="1.5"/>',
  zamach: '<path d="M23 13C16 4 3 11 6 22C9 34 30 29 29 16C28 4 10 0 2 11M2 4V12H10" fill="none" stroke="#f5bb49" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
  mocny_strzal: '<circle cx="16" cy="18" r="12" fill="#f6e2b1" stroke="#19171b" stroke-width="2.5"/><circle cx="16" cy="18" r="7" fill="#c54b31"/><circle cx="16" cy="18" r="2" fill="#f6e2b1"/><path d="M17 17L29 4M24 4H30V10" fill="none" stroke="#efbd50" stroke-width="2"/>',
  salwa: '<path d="M5 31L15 5M10 10L15 4L17 13M15 32L24 10M19 14L24 8L26 17M25 33L32 17M27 19L32 14L33 23" fill="none" stroke="#efbd50" stroke-width="3" stroke-linejoin="round"/>',
  mocny_czar: '<path d="M5 32L24 12" stroke="#f5bb49" stroke-width="2"/><path d="M24 1L27 8L35 10L28 14L27 22L22 15L14 15L20 9Z" fill="#b6e6fa" stroke="#19171b" stroke-width="2"/>',
  wachlarz: '<path d="M15 34C-2 30 9 17 8 10L16 16L20 2C23 14 35 20 29 29L22 35L21 22L15 27Z" fill="#f1a331" stroke="#19171b" stroke-width="2.5"/>',
  heal: '<path d="M12 3H23V10L30 22Q34 33 24 35H11Q1 33 5 23L12 11Z" fill="#d4e7da" stroke="#19171b" stroke-width="2.5"/><path d="M7 22H28L30 29L25 33H10L5 29Z" fill="#df4936"/><path d="M11 3H24V8H11Z" fill="#c99a43" stroke="#19171b" stroke-width="2.5"/><path d="M9 24L8 28" stroke="#fff0d5" stroke-width="2"/>',
  fruit: '<path d="M17 12C-2 0 0 30 12 34L18 32L23 34C37 31 35 0 17 12Z" fill="#db4c34" stroke="#19171b" stroke-width="2.5"/><path d="M17 12L20 3M20 5Q28-2 30 4Q24 10 20 5" fill="#8db45b" stroke="#19171b" stroke-width="2.5"/>',
 };
 return `<svg viewBox="-3 -2 42 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${icons[id] ?? icons.mocny}</svg>`;
}
