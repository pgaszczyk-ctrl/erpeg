import { musicVolume, setMusicVolume, musicEnabled, setMusicEnabled } from '../music';
import { tx } from '../i18n';
import { resetKeys, resetTouch } from '../controls';
/** Native controls remain usable on the rotated phone; no game attack leaks through. */
export function openMusic(): Promise<void> {
  return new Promise(resolve => {
    const focusBefore = document.activeElement as HTMLElement | null;
    resetKeys(); resetTouch();
    const root = document.createElement('div'); root.className = 'm-screen'; root.id = 'music-settings';
    const box = document.createElement('div'); box.className = 'm-box';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'music-title');
    box.style.maxWidth = '360px';
    const title = document.createElement('h2'); title.id = 'music-title'; title.textContent = tx('♫ Muzyka', '♫ Music');
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'm-btn';
    const label = document.createElement('label'); label.htmlFor = 'music-volume';
    const slider = document.createElement('input'); slider.type = 'range'; slider.id = 'music-volume';
    slider.min = '0'; slider.max = '100'; slider.step = '1'; slider.value = String(Math.round(musicVolume() * 100));
    slider.style.width = '100%'; slider.style.minHeight = '36px';
    const refresh = () => {
      toggle.textContent = musicEnabled() ? tx('Muzyka: włączona', 'Music: on') : tx('Muzyka: wyłączona', 'Music: off');
      toggle.setAttribute('aria-pressed', String(musicEnabled()));
      label.textContent = `${tx('Głośność muzyki', 'Music volume')}: ${slider.value}%`;
    };
    toggle.onclick = () => { setMusicEnabled(!musicEnabled()); refresh(); };
    slider.oninput = () => { setMusicVolume(Number(slider.value) / 100); refresh(); }; refresh();
    const back = document.createElement('button'); back.type = 'button'; back.className = 'm-btn'; back.textContent = tx('⬅ Wstecz', '⬅ Back');
    const done = () => { document.removeEventListener('keydown', key, true); root.remove(); resetKeys(); resetTouch(); focusBefore?.focus(); resolve(); };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); done(); }
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === toggle) { e.preventDefault(); back.focus(); }
        else if (!e.shiftKey && document.activeElement === back) { e.preventDefault(); toggle.focus(); }
      }
    };
    back.onclick = done;
    document.addEventListener('keydown', key, true);
    box.append(title, toggle, label, slider, back); root.append(box); document.body.append(root); toggle.focus();
  });
}
