// Tutorial spotlight (owner, 11 Oct 2026: in the demo the apples „ate themselves" – the eating
// dialog popped up while the player was still tapping the tree, and the tap pressed its button).
// The rest of the screen goes dark, a pulsing ring and a pointing hand show the one control to use,
// and only a tap on that control does anything; taps elsewhere are swallowed.

const CSS = `
#samouczek { position: fixed; inset: 0; z-index: 60; touch-action: none; }
#samouczek .sm-dziura { position: fixed; border-radius: 50%; box-shadow: 0 0 0 200vmax rgba(10, 8, 16, 0.72); pointer-events: none; transition: opacity 0.4s; }
#samouczek .sm-ring { position: fixed; border-radius: 50%; border: 3px solid #ffd76a; pointer-events: none; animation: sm-puls 1.1s ease-in-out infinite; }
#samouczek .sm-reka { position: fixed; font-size: 40px; line-height: 1; pointer-events: none; animation: sm-stuk 1.1s ease-in-out infinite; filter: drop-shadow(0 2px 2px #000); }
#samouczek .sm-tekst { position: fixed; left: 50%; transform: translateX(-50%); max-width: min(86vw, 440px); padding: 12px 16px; border-radius: 10px;
  background: #2a2230; border: 2px solid #c9a24a; color: #fff2d0; font: 18px/1.35 'Alegreya Sans', system-ui, sans-serif; text-align: center; pointer-events: none; }
@keyframes sm-puls { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.18); opacity: 0.35; } }
@keyframes sm-stuk { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-6px, -8px); } }
@media (prefers-reduced-motion: reduce) { #samouczek .sm-ring, #samouczek .sm-reka { animation: none; } }
`;

/**
 * Shows where to tap: everything but the element `selector` is dimmed, `text` explains why.
 * A tap inside the element calls `onTap`; the spotlight stays until the returned `close` is called.
 */
export function pokazGdzieKliknac(selector: string, text: string, onTap: () => void): () => void {
  if (!document.getElementById('samouczek-css')) {
    const st = document.createElement('style');
    st.id = 'samouczek-css';
    st.textContent = CSS;
    document.head.append(st);
  }
  document.getElementById('samouczek')?.remove();
  const root = document.createElement('div');
  root.id = 'samouczek';
  const dziura = document.createElement('div');
  dziura.className = 'sm-dziura';
  const ring = document.createElement('div');
  ring.className = 'sm-ring';
  const reka = document.createElement('div');
  reka.className = 'sm-reka';
  reka.textContent = '👆';
  const tekst = document.createElement('div');
  tekst.className = 'sm-tekst';
  tekst.textContent = text;
  root.append(dziura, ring, reka, tekst);
  document.body.append(root);

  let rect: DOMRect | null = null;
  let frame = 0;
  // Follow the control (rotation, resize, the HUD redrawing itself).
  const place = () => {
    const el = document.querySelector(selector) as HTMLElement | null;
    rect = el?.getBoundingClientRect() ?? null;
    const show = !!rect && rect.width > 0;
    root.style.visibility = show ? 'visible' : 'hidden';
    if (rect && show) {
      const r = Math.max(rect.width, rect.height) / 2 + 10;
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      for (const e of [dziura, ring]) Object.assign(e.style, { left: `${cx - r}px`, top: `${cy - r}px`, width: `${r * 2}px`, height: `${r * 2}px` });
      // The hand points from below-right, unless that is off the screen.
      const right = cx + r + 34 < innerWidth;
      Object.assign(reka.style, { left: `${right ? cx + r * 0.4 : cx - r * 0.4 - 40}px`, top: `${Math.min(cy + r * 0.3, innerHeight - 44)}px`, transform: right ? '' : 'scaleX(-1)' });
      // The text above the control when it sits in the lower half, else below it.
      if (cy > innerHeight / 2) Object.assign(tekst.style, { top: '', bottom: `${innerHeight - (cy - r) + 18}px` });
      else Object.assign(tekst.style, { bottom: '', top: `${cy + r + 18}px` });
    }
    frame = requestAnimationFrame(place);
  };
  place();
  const tap = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!rect) return;
    const pad = 8;
    if (e.clientX >= rect.left - pad && e.clientX <= rect.right + pad && e.clientY >= rect.top - pad && e.clientY <= rect.bottom + pad) onTap();
  };
  const swallow = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
  root.addEventListener('pointerdown', tap);
  for (const ev of ['pointerup', 'click', 'touchstart', 'touchend', 'mousedown', 'mouseup']) root.addEventListener(ev, swallow, { passive: false });
  return () => {
    cancelAnimationFrame(frame);
    root.remove();
  };
}
