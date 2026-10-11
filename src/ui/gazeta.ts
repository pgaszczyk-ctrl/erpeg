import './gazeta.css';
import { GAZETA, NOWOSCI, PLANY, RANKINGI, type Wiesc } from '../content/gazeta';
import { odznaka } from '../content/osiagniecia';

// The newsboy's paper (owner, 11 Oct 2026): a window in the style of the new shop windows – a wooden,
// brass-fitted frame around a newspaper page. Pages: what's new, plans, a reporter's errand and a letter
// to the editors. The game stands still while it is open (GameScene pauses itself).

export type StanZlecenia = 'nowe' | 'wziete' | 'zrobione' | 'brak' | 'pelno';

/** One scope of the daily edition (RPC kurier_wydanie). */
export interface Zakres {
  km: { n: string; km: number }[];
  wybitne: { n: string; o: string[] }[];
  graczy: number;
}

export interface Wydanie {
  dzien: string;
  /** True while yesterday has no records yet (the first day): today's edition so far. */
  dzis: boolean;
  swiat: Zakres;
  kraj: Zakres | null;
  miasto: Zakres | null;
  /** The player's own day: km walked and badge ids earned. */
  ja: { km: number; o: string[] } | null;
}

export interface GazetaHost {
  /** Who sells the paper (shown in the corner). */
  sprzedawca: string;
  /** The town for the page header. */
  miasto: string;
  zlecenie: { tytul: string; opis: string; stan: StanZlecenia };
  /** Fetches the daily edition (rankings); null when offline. */
  wydanie?: () => Promise<Wydanie | null>;
  /** Country code and town, for the rankings' headings. */
  kraj?: string | null;
  /** Sends a letter to the editors; resolves 'ok', 'limit' (too many) or 'blad' (no connection). */
  wyslij: (text: string) => Promise<'ok' | 'limit' | 'blad'>;
  /** The page to open on (default: news). */
  strona?: Strona;
}

type Strona = 'nowosci' | 'ludzie' | 'plany' | 'zlecenie' | 'list';

/** Resolves with true when the player took the errand (GameScene then shows the mission dialog). */
export function showGazeta(h: GazetaHost): Promise<boolean> {
  return new Promise((resolve) => {
    const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => {
      const e = document.createElement(tag);
      e.className = cls;
      if (text) e.textContent = text;
      return e;
    };
    let strona: Strona = h.strona ?? 'nowosci';
    let draft = '';
    // The edition is fetched once, when the page is first opened (or at once when it opens on it).
    let wydanie: Wydanie | null | undefined;
    let pobieram = false;
    const pobierz = () => {
      if (pobieram || wydanie !== undefined || !h.wydanie) return;
      pobieram = true;
      h.wydanie().then((w) => { wydanie = w; }, () => { wydanie = null; }).finally(() => {
        pobieram = false;
        if (!done && strona === 'ludzie') render();
      });
    };
    const root = el('div', 'gz-screen');
    root.id = 'gazeta';
    const box = el('section', 'gz-box');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', GAZETA.tytul);
    root.append(box);
    document.body.append(root);
    history.pushState({ ...history.state, expGazeta: true }, '');
    let done = false;
    let viaHistory = false;
    const close = (took = false) => {
      if (done) return;
      done = true;
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey, true);
      root.remove();
      if (!viaHistory) history.back();
      resolve(took);
    };
    const onPop = () => { viaHistory = true; close(); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      // Typing a letter must never reach the game.
      else e.stopPropagation();
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey, true);

    const dzis = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const wiesci = (lista: Wiesc[]) => {
      const col = el('div', 'gz-cols');
      for (const w of lista) {
        const a = el('article', 'gz-art');
        a.append(el('h3', '', w.tytul), el('p', 'gz-date', w.data), el('p', '', w.tresc));
        col.append(a);
      }
      return col;
    };
    const nazwaKraju = (k: string) => {
      try {
        return new Intl.DisplayNames(['pl'], { type: 'region' }).of(k) ?? k;
      } catch {
        return k;
      }
    };
    const badge = (id: string) => {
      const o = odznaka(id);
      return o ? `${o.ikona} ${o.nazwa}` : null;
    };
    const kolumna = (tytul: string, z: Zakres | null) => {
      const a = el('article', 'gz-art gz-rank');
      a.append(el('h3', '', tytul));
      if (!z || (!z.km.length && !z.wybitne.length)) {
        a.append(el('p', 'gz-date', RANKINGI.pusto));
        return a;
      }
      if (z.km.length) {
        a.append(el('p', 'gz-sub2', RANKINGI.km));
        const ol = el('ol', 'gz-list');
        for (const r of z.km) {
          const li = el('li');
          const row = el('div', 'gz-li');
          row.append(el('span', 'gz-who', r.n), el('span', 'gz-val', `${r.km.toLocaleString('pl-PL')} km`));
          li.append(row);
          ol.append(li);
        }
        a.append(ol);
      }
      const wyb = z.wybitne.map((r) => ({ n: r.n, o: r.o.map(badge).filter(Boolean) as string[] })).filter((r) => r.o.length);
      if (wyb.length) {
        a.append(el('p', 'gz-sub2', RANKINGI.wybitne));
        const ul = el('ul', 'gz-list gz-feats');
        for (const r of wyb) {
          const li = el('li');
          const row = el('div', 'gz-li');
          row.append(el('span', 'gz-who', r.n), el('span', 'gz-val', r.o.join(', ')));
          li.append(row);
          ul.append(li);
        }
        a.append(ul);
      }
      return a;
    };
    const ludzie = (): HTMLElement[] => {
      pobierz();
      const head = el('h3', 'gz-head', RANKINGI.tytul);
      if (wydanie === undefined) return [head, el('p', 'gz-note', RANKINGI.czekam)];
      if (!wydanie) return [head, el('p', 'gz-note', RANKINGI.brak)];
      const w = wydanie;
      const dzien = new Date(`${w.dzien}T12:00:00`).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
      const out: HTMLElement[] = [head, el('p', 'gz-note', w.dzis ? RANKINGI.dzis : RANKINGI.wczoraj.replace('{dzien}', dzien))];
      // The player's own summary: only when a badge came that day (owner's wish), with the km walked.
      const moje = (w.ja?.o ?? []).map(badge).filter(Boolean) as string[];
      if (moje.length) {
        const box = el('article', 'gz-art gz-big gz-me');
        box.append(el('h3', '', RANKINGI.gratulacje), el('p', '', (w.dzis ? RANKINGI.mojeDzis : RANKINGI.moje).replace('{odznaki}', moje.join(', '))));
        if (w.ja && w.ja.km >= 0.1) box.append(el('p', 'gz-date', RANKINGI.mojeKm.replace('{km}', w.ja.km.toLocaleString('pl-PL'))));
        out.push(box);
      }
      const cols = el('div', 'gz-cols gz-cols3');
      cols.append(kolumna(RANKINGI.swiat, w.swiat));
      if (h.kraj) cols.append(kolumna(nazwaKraju(h.kraj), w.kraj));
      if (h.miasto && w.miasto) cols.append(kolumna(h.miasto, w.miasto));
      out.push(cols, el('p', 'gz-note', RANKINGI.stopka));
      return out;
    };
    const render = () => {
      box.replaceChildren();
      const x = el('button', 'gz-close', '×');
      x.type = 'button';
      x.setAttribute('aria-label', 'Zamknij gazetę');
      x.onclick = () => close();
      const paper = el('div', 'gz-paper');
      const mast = el('header', 'gz-mast');
      // The artist's masthead (32-G003) carries the title itself; the h2 stays for screen readers only.
      const win = el('img', 'gz-winieta');
      win.src = GAZETA.winieta;
      win.alt = '';
      const title = el('h2', 'gz-sr', GAZETA.tytul);
      mast.append(el('div', 'gz-ears', `${dzis} · ${h.miasto}`), win, title, el('p', 'gz-sub', GAZETA.podtytul));
      const tabs = el('nav', 'gz-tabs');
      const pages: [Strona, string, string][] = [['nowosci', '📰', 'Nowości'], ['ludzie', '🏆', 'Ludzie'], ['plany', '🔭', 'Plany'], ['zlecenie', '✒', 'Zlecenie'], ['list', '✉', 'Do redakcji']];
      for (const [id, ic, name] of pages) {
        const b = el('button', `gz-tab${strona === id ? ' on' : ''}`);
        b.type = 'button';
        b.append(el('span', 'gz-ic', ic), el('span', 'gz-tl', name));
        b.setAttribute('aria-pressed', String(strona === id));
        b.onclick = () => { strona = id; render(); };
        tabs.append(b);
      }
      const body = el('div', 'gz-body');
      if (strona === 'nowosci') body.append(el('h3', 'gz-head', 'Co nowego w świecie gry'), wiesci(NOWOSCI));
      else if (strona === 'ludzie') body.append(...ludzie());
      else if (strona === 'plany') body.append(el('h3', 'gz-head', 'Redakcja zdradza plany'), wiesci(PLANY), el('p', 'gz-note', 'Plany mogą się zmienić – piszcie do redakcji, co chcielibyście zobaczyć!'));
      else if (strona === 'zlecenie') {
        const z = h.zlecenie;
        body.append(el('h3', 'gz-head', 'Zlecenie dla reportera'));
        if (z.stan === 'brak') body.append(el('p', '', 'Dziś redakcja nie ma dla ciebie zlecenia w tej okolicy. Zajrzyj do innego gazeciarza.'));
        else {
          const a = el('article', 'gz-art gz-big');
          a.append(el('h3', '', z.tytul), el('p', '', z.opis));
          body.append(a);
          if (z.stan === 'nowe') {
            const b = el('button', 'gz-action', 'WEŹ ZLECENIE');
            b.type = 'button';
            b.onclick = () => close(true);
            body.append(b);
          } else body.append(el('p', 'gz-note', z.stan === 'wziete' ? 'To zlecenie już masz – strzałka pokaże ci drogę.' : z.stan === 'pelno' ? 'Masz już komplet zadań. Skończ któreś i wróć po to zlecenie.' : 'To zlecenie już wykonane. Dziękujemy!'));
        }
      } else {
        body.append(el('h3', 'gz-head', 'List do redakcji'));
        body.append(el('p', '', 'Opisz przygodę, którą chcesz przeżyć, miejsce, które warto pokazać w grze, albo pomysł na zadanie. Redakcja czyta każdy list – najlepsze trafią do gry!'));
        const area = el('textarea', 'gz-area');
        area.maxLength = GAZETA.maksListu;
        area.rows = 6;
        area.placeholder = 'Szanowna Redakcjo…';
        area.value = draft;
        const count = el('span', 'gz-count', `${draft.length}/${GAZETA.maksListu}`);
        area.oninput = () => { draft = area.value; count.textContent = `${draft.length}/${GAZETA.maksListu}`; };
        const note = el('p', 'gz-note');
        note.setAttribute('role', 'status');
        const send = el('button', 'gz-action', 'WYŚLIJ LIST');
        send.type = 'button';
        send.onclick = async () => {
          const t = area.value.trim();
          if (t.length < 5) { note.textContent = 'Napisz choć kilka słów.'; return; }
          send.disabled = true;
          note.textContent = 'Gazeciarz zanosi list do redakcji…';
          const r = await h.wyslij(t);
          if (r === 'ok') {
            draft = '';
            area.value = '';
            count.textContent = `0/${GAZETA.maksListu}`;
            note.textContent = 'Dziękujemy! List trafił do redakcji.';
          } else note.textContent = r === 'limit' ? 'Redakcja ma dziś od ciebie dość listów – spróbuj za godzinę.' : 'Nie udało się wysłać (brak internetu?). Spróbuj jeszcze raz.';
          send.disabled = false;
        };
        const row = el('div', 'gz-row');
        row.append(count, send);
        body.append(area, row, note);
      }
      const foot = el('footer', 'gz-foot', `Sprzedaje: ${h.sprzedawca}`);
      paper.append(mast, tabs, body, foot);
      box.append(x, paper);
      (strona === 'list' ? box.querySelector<HTMLTextAreaElement>('textarea') : box.querySelector<HTMLButtonElement>('.gz-tab.on'))?.focus({ preventScroll: true });
    };
    render();
  });
}
