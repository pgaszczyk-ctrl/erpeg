import { rpc } from '../api';
import { session } from '../quests';
import { tx } from '../i18n';

export function przybijPomysl(ramka: HTMLElement, miejsce: HTMLElement = ramka) {
  const styl = document.createElement('style');
  styl.textContent = `
#tablica .tb-pomysl {
  position: relative;
  align-self: flex-start;
  flex: 0 0 auto;
  box-sizing: border-box;
  width: 104px;
  margin: 0;
  padding: 54px 7px 20px;
  border: 1px solid #a67c45;
  border-radius: 3px 2px 12px 2px / 2px 3px 6px 3px;
  background:
    radial-gradient(ellipse at 18% 92%, #a36b352b, transparent 46%),
    linear-gradient(142deg, #f8edce 10%, #ecdbab 67%, #d3ac6c);
  box-shadow: 3px 5px 0 #21160d88, inset 0 0 0 3px #8e5e2624;
  color: #483019;
  transform: rotate(2deg);
  font: 700 17px/1.05 'Alegreya Sans', sans-serif;
  cursor: pointer;
}
#tablica .tb-pomysl::before {
  content: '';
  position: absolute;
  top: -5px;
  left: calc(50% - 6px);
  width: 12px;
  height: 12px;
  border: 1px solid #5f3a18;
  border-radius: 50%;
  background:
    linear-gradient(138deg, transparent 42%, #63401f 44% 55%, transparent 57%),
    radial-gradient(circle at 32% 25%, #fff1af, #bc8a39 57%, #72471d 90%);
  box-shadow: 1px 2px 2px #34210e80;
}
#tablica .tb-pomysl::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 38'%3E%3Ccircle cx='24' cy='19' r='17' fill='%23e6cf9a' stroke='%23936b38' stroke-width='1.5' stroke-dasharray='3 2'/%3E%3Cpath d='M17 13c0-8 15-9 15-1 0 6-8 6-8 12' fill='none' stroke='%23543820' stroke-width='4' stroke-linecap='round'/%3E%3Ccircle cx='24' cy='30' r='2.3' fill='%23543820'/%3E%3C/svg%3E") center 12px / 48px 38px no-repeat;
}
#tablica .tb-pomysl:focus-visible { outline: 2px solid #ffe198; outline-offset: 3px; }
@media (hover: hover) {
  #tablica .tb-pomysl:hover { filter: brightness(1.08); }
}
#tablica .tb-pomysl-hint {
  position: absolute;
  left: 4px;
  right: 4px;
  bottom: 5px;
  color: #66451e;
  font-size: 11px;
}
#tablica .tb-pomysl-hint::before { content: attr(data-label); }
#tablica .tb-pomysl-dialog { z-index:4; }
#tablica .tb-pomysl-dialog .tb-papier { box-sizing:border-box; transform:none; clip-path:none; max-height:90%; }
#tablica .tb-pomysl-dialog textarea { box-sizing:border-box; width:100%; min-height:100px; max-height:25vh; resize:vertical; font:16px 'Alegreya Sans',sans-serif; padding:8px; color:#302315; background:#fffaf0; }
#tablica .tb-pomysl-dialog button:disabled { opacity:.55; cursor:default; }
`;
  ramka.append(styl);
  const kartka = document.createElement('button');
  kartka.type = 'button'; kartka.className = 'tb-pomysl'; kartka.textContent = tx('mam pomysła!', 'i have an idea!');
  kartka.setAttribute('aria-description', tx('Otwiera formularz pomysłu', 'Opens the idea form'));
  const podpowiedz = document.createElement('span');
  podpowiedz.className = 'tb-pomysl-hint';
  podpowiedz.setAttribute('aria-hidden', 'true');
  podpowiedz.dataset.label = tx('Napisz pomysł', 'Write an idea');
  kartka.append(podpowiedz);
  kartka.onclick = () => {
    ramka.querySelectorAll('.tb-karta, .tb-kartka-duza').forEach(e => e.remove());
    const overlay = document.createElement('div'); overlay.className = 'tb-kartka-duza tb-pomysl-dialog';
    const papier = document.createElement('form'); papier.className = 'tb-papier';
    papier.setAttribute('aria-label', tx('mam pomysła!', 'i have an idea!'));
    const h = document.createElement('h3'); h.textContent = tx('mam pomysła!', 'i have an idea!');
    const select = document.createElement('select'); select.required = true; select.style.cssText = 'width:100%;min-height:44px;font:inherit;margin-bottom:10px';
    for (const [value, text] of [['rozwoj', tx('Pomysł na rozwój gry', 'Game development idea')], ['quest', tx('Pomysł na questa', 'Quest idea')]]) {
      const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option);
    }
    select.setAttribute('aria-label', tx('Rodzaj pomysłu', 'Idea category'));
    const text = document.createElement('textarea'); text.required = true; text.maxLength = 2000;
    text.setAttribute('aria-label', tx('Opisz swój pomysł', 'Describe your idea')); text.placeholder = tx('Opisz swój pomysł…', 'Describe your idea…');
    const msg = document.createElement('p'); msg.setAttribute('role', 'status');
    msg.textContent = tx('3 pomysły dziennie na postać, łącznie w obu kategoriach. Dzień według czasu polskiego. Pomysły przeglądamy cyklicznie.', '3 ideas per character per day across both categories (Polish time). We review ideas regularly.');
    const row = document.createElement('div');
    const send = document.createElement('button'); send.type = 'submit'; send.textContent = tx('Wyślij pomysł', 'Send idea');
    const close = document.createElement('button'); close.type = 'button'; close.className = 'tb-cicho'; close.textContent = tx('Zamknij', 'Close');
    close.onclick = () => { overlay.remove(); kartka.focus(); };
    row.append(send, close); papier.append(h, select, text, msg, row); overlay.append(papier); ramka.append(overlay); select.focus();
    let busy = false;
    papier.onsubmit = async e => {
      e.preventDefault(); if (busy) return;
      if (!text.value.trim()) { text.focus(); return; }
      busy = true; send.disabled = true; select.disabled = true; text.disabled = true;
      try {
        const result = await rpc<{ ok: boolean; remaining?: number; blad?: string }>('submit_player_idea', { p_token: session.token, p_kind: select.value, p_text: text.value.trim() });
        if (result.ok) {
          msg.textContent = tx(`Dziękujemy! Pomysł zapisany. Pozostało dziś: ${result.remaining}.`, `Thank you! Idea saved. Remaining today: ${result.remaining}.`);
          text.value = '';
          send.disabled = result.remaining === 0;
        } else {
          msg.textContent = result.blad === 'limit' ? tx('Wykorzystano dzisiejszy limit 3 pomysłów. Wróć jutro!', 'All 3 ideas used today. Come back tomorrow!') : tx('Nie udało się zapisać. Sprawdź sesję postaci i spróbuj ponownie.', 'Could not save. Check your character session and try again.');
          send.disabled = result.blad === 'limit';
        }
      } catch {
        msg.textContent = tx('Nie udało się wysłać. Tekst pozostał w polu — spróbuj ponownie.', 'Sending failed. Your text is still here — try again.'); send.disabled = false;
      } finally { busy = false; select.disabled = false; text.disabled = false; }
    };
  };
  miejsce.append(kartka);
}
