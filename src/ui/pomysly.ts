import { rpc } from '../api';
import { session } from '../quests';
import { tx } from '../i18n';

export function przybijPomysl(ramka: HTMLElement) {
  const styl = document.createElement('style');
  styl.textContent = `
#tablica .tb-pomysl { position:relative; align-self:flex-end; margin:12px 28px 4px 0; padding:14px 28px 18px 14px; min-height:68px; background:#f6efda; color:#49331f; border:1px solid #ac926a; box-shadow:3px 4px #21160d88; transform:rotate(2deg); font:700 19px 'Alegreya Sans',sans-serif; cursor:pointer }
#tablica .tb-pomysl::before { content:''; position:absolute; right:-14px; top:0; width:24px; height:32px; border:1px solid #bd9b68; border-left:0; border-bottom:0; border-radius:0 70% 0 0 }
#tablica .tb-pomysl::after { content:'✎'; position:absolute; right:-29px; top:27px; color:#e1a63c; text-shadow:1px 1px #24190e; font-size:43px; transform:rotate(18deg) }
#tablica .tb-pomysl-dialog { z-index:4; }
#tablica .tb-pomysl-dialog .tb-papier { box-sizing:border-box; transform:none; clip-path:none; max-height:90%; }
#tablica .tb-pomysl-dialog textarea { box-sizing:border-box; width:100%; min-height:100px; max-height:25vh; resize:vertical; font:16px 'Alegreya Sans',sans-serif; padding:8px; color:#302315; background:#fffaf0; }
#tablica .tb-pomysl-dialog button:disabled { opacity:.55; cursor:default; }
`;
  ramka.append(styl);
  const kartka = document.createElement('button');
  kartka.type = 'button'; kartka.className = 'tb-pomysl'; kartka.textContent = tx('mam pomysła!', 'i have an idea!');
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
  ramka.append(kartka);
}
