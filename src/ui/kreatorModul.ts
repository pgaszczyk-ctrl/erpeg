// The modular hero's creator (owner, 20 Oct 2026): the composed figure and three buttons – gender,
// skin tone and „Losuj” (a head and body of that gender, hair and clothes colours; the skin is kept).
// Used by the new-character form and the QR demo's name form on the test server.
import { tx } from '../i18n';
import { SKORY_MODUL, PLEC_NAPIS } from '../content/modul';
import { modulCanvas, randomModul, MODUL_W, MODUL_H, type ModulLook } from './modulPostac';

export function kreatorModul(onChange: (l: ModulLook) => void, start?: ModulLook) {
  let look = start ?? randomModul(Math.random() < 0.5 ? 'k' : 'm');
  let pierwszy = !!start;
  const preview = Object.assign(document.createElement('canvas'), { className: 'm-hero m-hero-modul', width: MODUL_W, height: MODUL_H });
  let req = 0;
  const paint = () => {
    // The starting look is only shown, not reported as a change.
    if (pierwszy) pierwszy = false;
    else onChange(look);
    const r = ++req;
    void modulCanvas(look).then((c) => {
      if (r !== req) return;
      const ctx = preview.getContext('2d')!;
      ctx.clearRect(0, 0, MODUL_W, MODUL_H);
      ctx.drawImage(c, 0, 0);
    });
  };
  const btn = (text: string, fn: () => void) => {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'm-btn', textContent: text });
    b.onclick = fn;
    return b;
  };
  const plec = btn(PLEC_NAPIS[look.p](), () => {
    look = randomModul(look.p === 'k' ? 'm' : 'k', look.s);
    plec.textContent = PLEC_NAPIS[look.p]();
    paint();
  });
  const row = Object.assign(document.createElement('div'), { className: 'm-skinrow' });
  row.append(
    plec,
    btn(tx('🎨 Kolor skóry', '🎨 Skin tone'), () => {
      look = { ...look, s: (look.s + 1) % SKORY_MODUL.length };
      paint();
    }),
    btn(tx('🎲 Losuj', '🎲 Random'), () => {
      look = randomModul(look.p, look.s);
      paint();
    }),
  );
  const box = Object.assign(document.createElement('div'), { className: 'm-look' });
  box.append(row);
  paint();
  return { preview, box };
}
