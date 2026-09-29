// "🐞 Znalazłem buga" (game menu): the player describes a bug in their own words
// (up to MAX characters); the report goes to the server (RPC report_bug →
// table bug_reports, admin panel "🐞 Zgłoszenia") with where the hero is, the
// game's state and the character's recent log (log.ts).

import { rpc, offline } from '../api';
import { session } from '../quests';
import { recentLog } from '../log';
import { WERSJA, WERSJA_TEST, BUILD, TEST } from '../version';

export const MAX_ZNAKOW = 300;

/** Asks for the description and sends it. Resolves true when sent. */
export function askBug(context: Record<string, unknown>): Promise<boolean> {
  return new Promise((resolve) => {
    const root = document.createElement('div');
    root.className = 'm-screen';
    root.id = 'prompt';
    const box = document.createElement('form');
    box.className = 'm-box';
    const h = document.createElement('h2');
    h.textContent = '🐞 Znalazłem buga';
    const p = document.createElement('p');
    p.textContent = 'Opisz, co się stało i co robiłeś tuż przedtem. Razem z opisem wyślemy, gdzie jesteś i co ostatnio działo się w grze.';
    const area = Object.assign(document.createElement('textarea'), { maxLength: MAX_ZNAKOW, rows: 5, className: 'm-input', placeholder: 'np. Po rozmowie z woźnicą zniknął mój ludzik…' });
    area.style.cssText = 'width:100%;box-sizing:border-box;resize:vertical;font-size:16px';
    const count = document.createElement('div');
    count.style.cssText = 'text-align:right;font-size:12px;color:#9aa39a;margin:2px 0 8px';
    const upd = () => (count.textContent = `${area.value.length} / ${MAX_ZNAKOW}`);
    area.oninput = upd;
    upd();
    const note = document.createElement('p');
    note.style.cssText = 'min-height:1.2em;color:#fff2a8;margin:4px 0';
    const ok = Object.assign(document.createElement('button'), { type: 'submit', className: 'm-btn m-primary', textContent: 'Wyślij' });
    const cancel = Object.assign(document.createElement('button'), { type: 'button', className: 'm-btn', textContent: 'Anuluj' });
    box.append(h, p, area, count, note, ok, cancel);
    root.append(box);
    document.body.append(root);
    area.focus();
    const done = (v: boolean) => {
      root.remove();
      resolve(v);
    };
    cancel.onclick = () => done(false);
    box.onsubmit = async (e) => {
      e.preventDefault();
      const text = area.value.trim();
      if (!text) {
        note.textContent = 'Napisz choć kilka słów.';
        return;
      }
      ok.disabled = true;
      note.textContent = 'Wysyłam…';
      const ctx = {
        ...context,
        wersja: TEST ? `${WERSJA_TEST}-test` : WERSJA, build: BUILD, ua: navigator.userAgent.slice(0, 160),
        screen: `${innerWidth}x${innerHeight}@${devicePixelRatio}`, time: new Date().toISOString(),
      };
      if (offline.demo) return done(true);
      try {
        const sent = await rpc<boolean>('report_bug', { p_player: session.name || null, p_text: text.slice(0, MAX_ZNAKOW), p_ctx: ctx, p_log: recentLog() });
        if (!sent) {
          note.textContent = 'Za dużo zgłoszeń naraz – spróbuj za godzinę.';
          ok.disabled = false;
          return;
        }
        done(true);
      } catch {
        note.textContent = 'Nie udało się wysłać (brak internetu?). Spróbuj jeszcze raz.';
        ok.disabled = false;
      }
    };
  });
}
