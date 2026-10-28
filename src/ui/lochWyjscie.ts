import { tx } from '../i18n';

/** A cleared floor offers a shortcut; treasure can still be collected before leaving. */
export function pasekWyjsciaZLochu(wyjdz: () => void) {
  if (!document.getElementById('loch-wyjscie-css')) {
    const css = document.createElement('style');
    css.id = 'loch-wyjscie-css';
    css.textContent = `
      #loch-wyjscie { position:fixed; z-index:6; top:calc(10px + env(safe-area-inset-top));
        left:50%; transform:translate(-50%,-6px); min-height:32px; max-width:calc(100% - 32px);
        box-sizing:border-box; padding:5px 14px; border:2px solid #1e1a24; border-radius:6px;
        background:#caa052; color:#241b15; box-shadow:0 2px 0 #1e1a24,inset 0 1px 0 #ffe2a0;
        font:800 14px/1.15 'Alegreya Sans',system-ui,sans-serif; white-space:nowrap; cursor:pointer;
        touch-action:manipulation; opacity:0; pointer-events:none;
        transition:opacity .9s ease, transform .9s ease; }
      #loch-wyjscie.on { opacity:1; transform:translate(-50%,0); pointer-events:auto; }
      #loch-wyjscie[hidden] { display:none; }
      #loch-wyjscie:focus-visible { outline:3px solid #fff3ce; outline-offset:3px; }
      #loch-wyjscie:active { background:#e1b968; }
      /* A computer shows the purse centred at the top edge (hud.ts): the button sits just under it. */
      @media (pointer:fine) { #loch-wyjscie { top:calc(58px + env(safe-area-inset-top)); } }
      @media (prefers-reduced-motion:reduce) { #loch-wyjscie { transition:none; } }
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
    // Fades in (owner, 28 Oct 2026: „pojawić się fade-inem, a nie nagle”).
    ustawOczyszczony: (oczyszczony: boolean) => {
      if (!oczyszczony) { button.classList.remove('on'); button.hidden = true; return; }
      if (!button.hidden) return;
      button.hidden = false;
      void button.offsetWidth; // start the transition from the hidden state
      requestAnimationFrame(() => button.classList.add('on'));
    },
    usun: () => button.remove(),
  };
}
