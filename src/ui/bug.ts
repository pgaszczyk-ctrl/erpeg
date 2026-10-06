// "🐞 Znalazłem buga" (game menu): the player describes a bug in their own words
// (up to MAX characters); the report goes to the server (RPC report_bug →
// table bug_reports, admin panel "🐞 Zgłoszenia") with where the hero is, the
// game's state, the character's recent log (log.ts) and, if the player keeps
// it ticked, a small screenshot of the game (ui/snapshot.ts).

import { rpc, offline } from '../api';
import { session } from '../quests';
import { recentLog } from '../log';
import { WERSJA, WERSJA_TEST, BUILD, TEST, wersjaNapis } from '../version';

export const MAX_ZNAKOW = 300;

/** Asks for the description and sends it. Resolves true when sent. */
/** `shot`: a small screenshot of the game (data URL) the player may attach. */
export function askBug(context: Record<string, unknown>, shot: string | null = null): Promise<boolean> {
  return new Promise((resolve) => {
    const root = document.createElement('div');
    root.className = 'm-screen';
    root.id = 'prompt';
    const box = document.createElement('form');
    box.className = 'm-box';
    const h = document.createElement('h2');
    h.textContent = '🐞 Znalazłem buga';
    // The version in sight, so it's clear whether a bug was already fixed in a newer one (owner, 6 Oct 2026).
    const ver = document.createElement('div');
    ver.textContent = wersjaNapis();
    ver.style.cssText = 'font-size:13px;color:#c9b27a;margin:-4px 0 8px';
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
    // The screenshot (taken just before this window opened), attached unless the player unticks it.
    const attach = Object.assign(document.createElement('input'), { type: 'checkbox', checked: !!shot });
    const shotRow = document.createElement('label');
    shotRow.style.cssText = 'display:flex;gap:8px;align-items:center;margin:0 0 8px;font-size:14px';
    if (shot) {
      const img = Object.assign(document.createElement('img'), { src: shot, alt: 'zrzut ekranu' });
      img.style.cssText = 'width:84px;border:2px solid #4a4a55;border-radius:4px';
      shotRow.append(attach, img, document.createTextNode('Dołącz zrzut ekranu'));
    }
    box.append(h, ver, p, area, count, ...(shot ? [shotRow] : []), note, ok, cancel);
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
        const sent = await rpc<boolean>('report_bug', { p_player: session.name || null, p_text: text.slice(0, MAX_ZNAKOW), p_ctx: ctx, p_log: recentLog(), p_shot: shot && attach.checked ? shot : null });
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
