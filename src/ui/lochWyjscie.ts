import { tx } from '../i18n';

/** A cleared floor offers a shortcut; treasure can still be collected before leaving. */
export function pasekWyjsciaZLochu(wyjdz: () => void) {
  if (!document.getElementById('loch-wyjscie-css')) {
    const css = document.createElement('style');
    css.id = 'loch-wyjscie-css';
    css.textContent = `
      #loch-wyjscie { position:fixed; z-index:6; top:calc(84px + env(safe-area-inset-top));
        left:50%; transform:translateX(-50%); width:min(340px,calc(100% - 32px)); min-height:46px;
        box-sizing:border-box; padding:10px 18px; border:2px solid #1e1a24; border-radius:8px;
        background:#caa052; color:#241b15; box-shadow:0 3px 0 #1e1a24,inset 0 1px 0 #ffe2a0;
        font:800 18px/1.15 'Alegreya Sans',system-ui,sans-serif; cursor:pointer; touch-action:manipulation; }
      #loch-wyjscie[hidden] { display:none; }
      #loch-wyjscie:focus-visible { outline:3px solid #fff3ce; outline-offset:3px; }
      #loch-wyjscie:active { background:#e1b968; }
      @media (max-width:900px) { #loch-wyjscie { top:calc(120px + env(safe-area-inset-top)); } }
    `;
    document.head.append(css);
  }
  const button = document.createElement('button');
  button.id = 'loch-wyjscie';
  button.type = 'button';
  button.hidden = true;
  button.textContent = tx('Ucieknij z lochu', 'Leave the dungeon');
  button.title = tx('Wróć na powierzchnię', 'Return to the surface');
  button.addEventListener('pointerdown', e => e.stopPropagation());
  button.addEventListener('keydown', e => e.stopPropagation());
  button.addEventListener('click', e => { e.stopPropagation(); wyjdz(); });
  document.body.append(button);
  return {
    ustawOczyszczony: (oczyszczony: boolean) => { button.hidden = !oczyszczony; },
    usun: () => button.remove(),
  };
}
