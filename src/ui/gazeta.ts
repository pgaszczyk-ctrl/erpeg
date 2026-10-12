import './gazeta.css';
import { GAZETA, LAMIGLOWKA, NOWOSCI, PLANY, RANKINGI, STRONY, type Wiesc } from '../content/gazeta';
import { odznaka } from '../content/osiagniecia';
import { lang, tr, type Txt } from '../i18n';
import { dzienLamiglowki, rodzajDnia } from '../lamiglowki';
import { stronaLamiglowki, type LamiglowkaHost } from './lamiglowka';

// The newsboy's paper (owner, 11 Oct 2026): a printed newspaper sheet lying over the game – deckled,
// yellowed paper, newspaper type (Playfair Display headlines, Old Standard TT body), sections named
// in the nav strip under the masthead like a real paper, no window frame. Pages: front page (news the
// owner writes in the admin panel: new quests, special tasks – RPC kurier_wiesci), people (daily
// rankings – RPC kurier_wydanie), workshop (what's new / plans), a reporter's assignment and a letter
// to the editors. Polish and English. The game stands still while it is open (GameScene pauses).

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

/** A piece of front-page news written in the admin panel (table kurier_wiesci). */
export interface WiescSerwera {
  id: number;
  rodzaj: 'zadanie' | 'specjalne' | 'wiesc';
  tytul: Partial<Txt>;
  tresc: Partial<Txt>;
  miejsce: string | null;
  od: string;
}

export interface GazetaHost {
  /** Who sells the paper (shown in the corner). */
  sprzedawca: string;
  /** The town for the page header. */
  miasto: string;
  zlecenie: { tytul: string; opis: string; stan: StanZlecenia };
  /** Front-page news; null when offline. */
  wiesci?: () => Promise<WiescSerwera[] | null>;
  /** Fetches the daily edition (rankings); null when offline. */
  wydanie?: () => Promise<Wydanie | null>;
  /** Country code, for the rankings' headings. */
  kraj?: string | null;
  /** Sends a letter to the editors; resolves 'ok', 'limit' (too many) or 'blad' (no connection). */
  wyslij: (text: string) => Promise<'ok' | 'limit' | 'blad'>;
  /** The puzzle of the day (none in the demo). */
  lamiglowka?: LamiglowkaHost;
  /** The page to open on (default: the front page). */
  strona?: Strona;
}

export type Strona = 'wiesci' | 'ludzie' | 'warsztat' | 'zlecenie' | 'lamiglowka' | 'list';

/** A server text in the reader's language (falls back to the other one). */
const txt = (t: Partial<Txt> | undefined) => (t ? t[lang] || t.pl || t.en || '' : '');
const locale = () => (lang === 'pl' ? 'pl-PL' : 'en-GB');

/** A deckled paper edge: a clip-path polygon with small irregular teeth (fixed, so it doesn't flicker). */
function deckle() {
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pts: string[] = [];
  const side = (n: number, f: (t: number, j: number) => string) => { for (let i = 0; i < n; i++) pts.push(f(i / n, r() * 0.55)); };
  side(60, (t, j) => `${(t * 100).toFixed(2)}% ${j.toFixed(2)}%`);
  side(60, (t, j) => `${(100 - j * 0.6).toFixed(2)}% ${(t * 100).toFixed(2)}%`);
  side(60, (t, j) => `${(100 - t * 100).toFixed(2)}% ${(100 - j).toFixed(2)}%`);
  side(60, (t, j) => `${(j * 0.6).toFixed(2)}% ${(100 - t * 100).toFixed(2)}%`);
  return `polygon(${pts.join(',')})`;
}
const DECKLE = deckle();

/** Resolves with true when the player took the assignment (GameScene then shows the mission dialog). */
export function showGazeta(h: GazetaHost): Promise<boolean> {
  return new Promise((resolve) => {
    const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => {
      const e = document.createElement(tag);
      e.className = cls;
      if (text) e.textContent = text;
      return e;
    };
    let strona: Strona = h.strona ?? 'wiesci';
    let draft = '';
    // The puzzle page is built once (its state lives while the paper is open) and re-attached on every render.
    let puzzle: ReturnType<typeof stronaLamiglowki> | null = null;
    const pagePuzzle = (): HTMLElement[] => {
      if (!h.lamiglowka) return [];
      puzzle ??= stronaLamiglowki(h.lamiglowka);
      return [puzzle.node];
    };
    const root = el('div', 'gz-screen');
    root.id = 'gazeta';
    root.lang = lang;
    const sheet = el('section', 'gz-sheet');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', tr(GAZETA.tytul));
    sheet.style.clipPath = DECKLE;
    // The deckled edge clips the sheet, so its shadow comes from a wrapper (drop-shadow follows the clip).
    const wrap = el('div', 'gz-wrap');
    wrap.append(sheet);
    root.append(wrap);
    root.onclick = (e) => { if (e.target === root) close(); };
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
      else if (strona === 'lamiglowka' && puzzle && !(e.target instanceof HTMLTextAreaElement) && puzzle.klawisz(e)) { e.preventDefault(); e.stopPropagation(); }
      // Typing a letter must never reach the game.
      else e.stopPropagation();
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey, true);

    // Server data, fetched once each (front page at once, rankings when first opened).
    const fetched = <T,>(f: (() => Promise<T | null>) | undefined) => {
      const s = { v: undefined as T | null | undefined, busy: false };
      const get = (page: Strona) => {
        if (s.busy || s.v !== undefined) return;
        if (!f) { s.v = null; return; }
        s.busy = true;
        f().then((v) => { s.v = v; }, () => { s.v = null; }).finally(() => {
          s.busy = false;
          if (!done && strona === page) render();
        });
      };
      return { s, get };
    };
    const news = fetched(h.wiesci);
    const edition = fetched(h.wydanie);

    const fmt = (t: Txt, vars: Record<string, string>) => Object.entries(vars).reduce((a, [k, v]) => a.replaceAll(`{${k}}`, v), tr(t));
    const dzis = new Date().toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const nr = Math.floor((Date.now() - Date.UTC(2026, 9, 11)) / 864e5) + 1;

    // ------------------------------------------------------------------ pieces
    const kicker = (t: string, cls = '') => el('p', `gz-kicker ${cls}`, t);
    const story = (w: Wiesc, small = false) => {
      const a = el('article', `gz-story${small ? ' gz-small' : ''}`);
      a.append(el('h3', '', tr(w.tytul)), el('p', 'gz-dateline', w.data), el('p', 'gz-text', tr(w.tresc)));
      return a;
    };
    const cols = (items: HTMLElement[], cls = '') => {
      const c = el('div', `gz-cols ${cls}`);
      c.append(...items);
      return c;
    };
    const head = (t: string) => el('h2', 'gz-head', t);
    const note = (t: string) => el('p', 'gz-note', t);

    // ------------------------------------------------------------------ front page
    const pageWiesci = (): HTMLElement[] => {
      news.get('wiesci');
      if (news.s.v === undefined) return [note(tr(STRONY.wczytuje))];
      const list = news.s.v ?? [];
      const out: HTMLElement[] = [];
      const fromServer = (w: WiescSerwera, lead: boolean) => {
        const a = el('article', `gz-story${lead ? ' gz-lead' : ''} gz-r-${w.rodzaj}`);
        a.append(kicker(tr(STRONY.rodzaj[w.rodzaj] ?? STRONY.rodzaj.wiesc), `gz-k-${w.rodzaj}`), el(lead ? 'h2' : 'h3', '', txt(w.tytul)));
        const dateline = new Date(`${w.od}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'long' });
        a.append(el('p', 'gz-dateline', w.miejsce ? `${dateline} · ${fmt(STRONY.gdzie, { miejsce: w.miejsce })}` : dateline));
        for (const par of txt(w.tresc).split(/\n{2,}/)) if (par.trim()) a.append(el('p', 'gz-text', par.trim()));
        return a;
      };
      if (list.length) {
        out.push(fromServer(list[0], true));
        if (list.length > 1) out.push(cols(list.slice(1).map((w) => fromServer(w, false))));
      } else out.push(note(tr(STRONY.wiesciPusto)));
      // Teasers: the reporter's assignment and the latest from the workshop.
      const side: HTMLElement[] = [];
      if (h.zlecenie.stan === 'nowe') {
        const t = el('article', 'gz-story gz-box');
        const go = el('button', 'gz-link', `${tr(STRONY.zlecenieTytul)} →`);
        go.type = 'button';
        go.onclick = () => { strona = 'zlecenie'; render(); };
        t.append(kicker(tr(STRONY.zlecenie)), el('h3', '', h.zlecenie.tytul), go);
        side.push(t);
      }
      if (h.lamiglowka) {
        const t = el('article', 'gz-story gz-box');
        const go = el('button', 'gz-link', `${tr(LAMIGLOWKA.tytul)} →`);
        go.type = 'button';
        go.onclick = () => { strona = 'lamiglowka'; render(); };
        t.append(kicker(`🧩 ${tr(STRONY.lamiglowka)}`), el('h3', '', tr(LAMIGLOWKA.nazwy[rodzajDnia(dzienLamiglowki())])), go);
        side.push(t);
      }
      for (const w of NOWOSCI.slice(0, list.length ? 2 : 3)) {
        const s = story(w, true);
        s.prepend(kicker(tr(STRONY.warsztat)));
        side.push(s);
      }
      out.push(el('hr', 'gz-rule'), cols(side, 'gz-cols3'));
      return out;
    };

    // ------------------------------------------------------------------ people (rankings)
    const nazwaKraju = (k: string) => {
      try {
        return new Intl.DisplayNames([lang], { type: 'region' }).of(k) ?? k;
      } catch {
        return k;
      }
    };
    const badge = (id: string) => {
      const o = odznaka(id);
      return o ? `${o.ikona} ${o.nazwa}` : null;
    };
    const kolumna = (tytul: string, z: Zakres | null) => {
      const a = el('article', 'gz-story gz-rank');
      a.append(el('h3', 'gz-rank-h', tytul));
      if (!z || (!z.km.length && !z.wybitne.length)) {
        a.append(el('p', 'gz-dateline', tr(RANKINGI.pusto)));
        return a;
      }
      if (z.km.length) {
        a.append(kicker(tr(RANKINGI.km)));
        const ol = el('ol', 'gz-list');
        for (const r of z.km) {
          const li = el('li');
          const row = el('div', 'gz-li');
          row.append(el('span', 'gz-who', r.n), el('span', 'gz-dots'), el('span', 'gz-val', `${r.km.toLocaleString(locale())} km`));
          li.append(row);
          ol.append(li);
        }
        a.append(ol);
      }
      const wyb = z.wybitne.map((r) => ({ n: r.n, o: r.o.map(badge).filter(Boolean) as string[] })).filter((r) => r.o.length);
      if (wyb.length) {
        a.append(kicker(tr(RANKINGI.wybitne)));
        const ul = el('ul', 'gz-list gz-feats');
        for (const r of wyb) {
          const li = el('li');
          li.append(el('span', 'gz-who', r.n), el('span', 'gz-val', r.o.join(', ')));
          ul.append(li);
        }
        a.append(ul);
      }
      return a;
    };
    const pageLudzie = (): HTMLElement[] => {
      edition.get('ludzie');
      const top = head(tr(RANKINGI.tytul));
      const w = edition.s.v;
      if (w === undefined) return [top, note(tr(STRONY.wczytuje))];
      if (!w) return [top, note(tr(RANKINGI.brak))];
      const dzien = new Date(`${w.dzien}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'long' });
      const out: HTMLElement[] = [top, note(w.dzis ? tr(RANKINGI.dzis) : fmt(RANKINGI.wczoraj, { dzien }))];
      // The player's own summary: only when a badge came that day (owner's wish), with the km walked.
      const moje = (w.ja?.o ?? []).map(badge).filter(Boolean) as string[];
      if (moje.length) {
        const box = el('article', 'gz-story gz-box gz-me');
        box.append(kicker(tr(RANKINGI.gratulacje)), el('p', 'gz-text', fmt(w.dzis ? RANKINGI.mojeDzis : RANKINGI.moje, { odznaki: moje.join(', ') })));
        if (w.ja && w.ja.km >= 0.1) box.append(el('p', 'gz-dateline', fmt(RANKINGI.mojeKm, { km: w.ja.km.toLocaleString(locale()) })));
        out.push(box);
      }
      const c = [kolumna(tr(RANKINGI.swiat), w.swiat)];
      if (h.kraj) c.push(kolumna(nazwaKraju(h.kraj), w.kraj));
      if (h.miasto && w.miasto) c.push(kolumna(h.miasto, w.miasto));
      out.push(cols(c, 'gz-cols3'), note(tr(RANKINGI.stopka)));
      return out;
    };

    // ------------------------------------------------------------------ workshop, assignment, letter
    const pageWarsztat = (): HTMLElement[] => [
      head(tr(STRONY.warsztatNowe)), cols(NOWOSCI.map((w) => story(w))),
      el('hr', 'gz-rule'), head(tr(STRONY.warsztatPlany)), cols(PLANY.map((w) => story(w, true))), note(tr(STRONY.planyUwaga)),
    ];
    const pageZlecenie = (): HTMLElement[] => {
      const z = h.zlecenie;
      const out: HTMLElement[] = [head(tr(STRONY.zlecenieTytul))];
      if (z.stan === 'brak') return [...out, note(tr(STRONY.zlecenieBrak))];
      const a = el('article', 'gz-story gz-lead gz-box');
      a.append(el('h2', '', z.tytul), el('p', 'gz-text', z.opis));
      out.push(a);
      if (z.stan === 'nowe') {
        const b = el('button', 'gz-stamp', tr(STRONY.wez));
        b.type = 'button';
        b.onclick = () => close(true);
        out.push(b);
      } else out.push(note(tr(z.stan === 'wziete' ? STRONY.wziete : z.stan === 'pelno' ? STRONY.pelno : STRONY.zrobione)));
      return out;
    };
    const pageList = (): HTMLElement[] => {
      const area = el('textarea', 'gz-area');
      area.maxLength = GAZETA.maksListu;
      area.rows = 6;
      area.placeholder = tr(STRONY.listPoczatek);
      area.value = draft;
      const count = el('span', 'gz-count', `${draft.length}/${GAZETA.maksListu}`);
      area.oninput = () => { draft = area.value; count.textContent = `${draft.length}/${GAZETA.maksListu}`; };
      const msg = el('p', 'gz-note');
      msg.setAttribute('role', 'status');
      const send = el('button', 'gz-stamp', tr(STRONY.wyslij));
      send.type = 'button';
      send.onclick = async () => {
        const t = area.value.trim();
        if (t.length < 5) { msg.textContent = tr(STRONY.zaKrotki); return; }
        send.disabled = true;
        msg.textContent = tr(STRONY.wysylam);
        const r = await h.wyslij(t);
        if (r === 'ok') {
          draft = '';
          area.value = '';
          count.textContent = `0/${GAZETA.maksListu}`;
          msg.textContent = tr(STRONY.wyslany);
        } else msg.textContent = tr(r === 'limit' ? STRONY.limit : STRONY.blad);
        send.disabled = false;
      };
      const row = el('div', 'gz-row');
      row.append(count, send);
      return [head(tr(STRONY.listTytul)), el('p', 'gz-text', tr(STRONY.listOpis)), area, row, msg];
    };

    // ------------------------------------------------------------------ the sheet
    const render = () => {
      sheet.replaceChildren();
      const fold = el('button', 'gz-fold');
      fold.type = 'button';
      fold.setAttribute('aria-label', tr(STRONY.zamknij));
      fold.append(el('span', 'gz-fold-x', '✕'), el('span', 'gz-fold-t', tr(STRONY.zamknij)));
      fold.onclick = () => close();
      const mast = el('header', 'gz-mast');
      const ears = el('div', 'gz-ears');
      ears.append(el('span', '', `Nr ${nr}`), el('span', 'gz-ears-mid', dzis), el('span', '', h.miasto));
      const pic = GAZETA.winieta[lang];
      const title = el('h1', pic ? 'gz-sr' : 'gz-title', tr(GAZETA.tytul));
      mast.append(ears);
      if (pic) {
        const win = el('img', 'gz-winieta');
        win.src = pic;
        win.alt = '';
        mast.append(win);
      }
      mast.append(title, el('p', 'gz-sub', tr(GAZETA.podtytul)));
      const nav = el('nav', 'gz-nav');
      const pages: [Strona, string, Txt][] = [['wiesci', '📰', STRONY.wiesci], ['ludzie', '🏆', STRONY.ludzie], ['warsztat', '⚙', STRONY.warsztat], ['zlecenie', '✒', STRONY.zlecenie], ['lamiglowka', '🧩', STRONY.lamiglowka], ['list', '✉', STRONY.list]];
      for (const [id, ic, name] of pages) {
        if (id === 'lamiglowka' && !h.lamiglowka) continue;
        const b = el('button', `gz-tab${strona === id ? ' on' : ''}`);
        b.type = 'button';
        b.append(el('span', 'gz-ic', ic), el('span', 'gz-tl', tr(name)));
        b.setAttribute('aria-pressed', String(strona === id));
        b.onclick = () => { strona = id; render(); };
        nav.append(b);
      }
      const body = el('div', 'gz-body');
      body.append(...(strona === 'wiesci' ? pageWiesci() : strona === 'ludzie' ? pageLudzie() : strona === 'warsztat' ? pageWarsztat() : strona === 'zlecenie' ? pageZlecenie() : strona === 'lamiglowka' ? pagePuzzle() : pageList()));
      const foot = el('footer', 'gz-foot');
      foot.append(el('span', '', fmt(STRONY.sprzedaje, { kto: h.sprzedawca })), el('span', '', `exp-lore.app`));
      sheet.append(fold, mast, nav, body, foot);
      (strona === 'list' ? sheet.querySelector<HTMLTextAreaElement>('textarea') : sheet.querySelector<HTMLButtonElement>('.gz-tab.on'))?.focus({ preventScroll: true });
    };
    render();
  });
}
