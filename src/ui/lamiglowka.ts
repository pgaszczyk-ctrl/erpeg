import { LAMIGLOWKA as L } from '../content/gazeta';
import { tr, type Txt } from '../i18n';
import {
  lamiglowkaDnia, dzienLamiglowki, POZIOMY_LAMIGLOWEK, OPY, sprawdzSudoku, sprawdzKakuro, sprawdzKrzyzowke, sprawdzTrase, sumaTrasy,
  type Lamiglowka, type Op, type RodzajLamiglowki,
} from '../lamiglowki';

// The newspaper's puzzle page (owner, 12 Oct 2026): the day's puzzle drawn like the book's – printed on the
// paper, the player's digits in blue ink. Tap a cell, then a key on the pad under it (or a key on the keyboard).
// Entries are kept on the device for the day (localStorage, a convenience only); the reward is given once a
// day by the host (GameScene: EXP, save, RPC lamiglowka_rozwiazana).

export interface LamiglowkaHost {
  /** The character's difficulty level 0–4 (TRUDNOSCI index). */
  poziom: number;
  /** Whether today's puzzle was already solved (session.daily). */
  rozwiazana: (dzien: string) => boolean;
  /** Called once when solved: gives the reward. */
  rozwiaz: (dzien: string, rodzaj: RodzajLamiglowki, sekundy: number) => void;
}

type Wpis = { w: (number | string | null)[][]; t0: number; trasa?: [number, number][] };
const KLUCZ = 'exp-lamiglowka';

function wczytaj(k: string): Wpis | null {
  try {
    const j = JSON.parse(localStorage.getItem(KLUCZ) ?? 'null');
    return j && j.k === k ? j.v : null;
  } catch {
    return null;
  }
}
function zapisz(k: string, v: Wpis) {
  try {
    localStorage.setItem(KLUCZ, JSON.stringify({ k, v }));
  } catch {
    // private mode
  }
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  return e;
};
/** Operators as printed (a real minus sign, not a hyphen). */
const znak = (o: unknown) => (o === '-' ? '−' : o == null ? '' : String(o));
const fmt = (t: Txt, vars: Record<string, string | number>) => Object.entries(vars).reduce((a, [k, v]) => a.replaceAll(`{${k}}`, String(v)), tr(t));

/** Builds the page once per opened paper; `node` is re-attached on every re-render of the sheet, `klawisz` takes keys. */
export function stronaLamiglowki(h: LamiglowkaHost) {
  const dzien = dzienLamiglowki();
  const z: Lamiglowka = lamiglowkaDnia(dzien, h.poziom);
  const klucz = `${dzien}:${h.poziom}:${z.rodzaj}`;
  let gotowa = h.rozwiazana(dzien);
  const stan: Wpis = wczytaj(klucz) ?? { w: [], t0: Date.now() };
  const node = el('div', 'gz-puz');
  const msg = el('p', 'gz-puz-msg');
  msg.setAttribute('aria-live', 'polite');
  let wybrane: [number, number] | null = null;
  let odswiez = () => {};
  const komorka = (r: number, c: number) => stan.w[r]?.[c] ?? null;
  const ustaw = (r: number, c: number, v: number | string | null) => {
    (stan.w[r] ??= [])[c] = v;
    zapisz(klucz, stan);
  };

  const sukces = () => {
    if (gotowa) return;
    gotowa = true;
    wybrane = null;
    h.rozwiaz(dzien, z.rodzaj, Math.round((Date.now() - stan.t0) / 1000));
    msg.className = 'gz-puz-msg ok';
    msg.textContent = fmt(L.brawo, { exp: L.nagrodaExp });
    odswiez();
  };
  const powiedz = (t: Txt, vars: Record<string, string | number> = {}) => {
    msg.className = 'gz-puz-msg';
    msg.textContent = fmt(t, vars);
  };

  // ---------------------------------------------------------------- the pad
  let klawisze: string[] = [];
  const pad = el('div', 'gz-pad');
  const naKlawisz = (k: string) => {
    if (gotowa || !wybrane) return;
    const [r, c] = wybrane;
    const teraz = komorka(r, c);
    if (k === '⌫') {
      if (z.rodzaj === 'krzyzowka' && typeof teraz === 'number' && teraz >= 10) ustaw(r, c, Math.floor(teraz / 10));
      else ustaw(r, c, null);
    } else if ((OPY as string[]).includes(k)) ustaw(r, c, k);
    else {
      const d = Number(k);
      // Crossword numbers can have several digits: typing appends (at most 3 digits).
      if (z.rodzaj === 'krzyzowka' && typeof teraz === 'number' && teraz < 100 && teraz > 0) ustaw(r, c, teraz * 10 + d);
      else ustaw(r, c, d);
    }
    msg.textContent = '';
    odswiez();
  };
  const rysujPad = () => {
    pad.replaceChildren();
    for (const k of klawisze) {
      const b = el('button', 'gz-key', znak(k));
      b.type = 'button';
      b.onclick = () => naKlawisz(k);
      pad.append(b);
    }
    pad.style.display = gotowa || !klawisze.length ? 'none' : '';
  };

  // ---------------------------------------------------------------- one grid cell button
  const pole = (r: number, c: number, tekst: string, cls: string, edytowalne: boolean) => {
    const b = el(edytowalne ? 'button' : 'div', `gz-cell ${cls}`, tekst);
    if (edytowalne) {
      (b as HTMLButtonElement).type = 'button';
      if (wybrane && wybrane[0] === r && wybrane[1] === c) b.classList.add('sel');
      b.onclick = () => {
        if (gotowa) return;
        wybrane = [r, c];
        odswiez();
      };
    }
    return b;
  };

  // ---------------------------------------------------------------- the kinds
  const plansza = el('div', 'gz-board');
  const rysuj = () => {
    plansza.replaceChildren();
    plansza.className = `gz-board gz-${z.rodzaj}`;
    if (z.rodzaj === 'sudoku') {
      klawisze = ['1', '2', '3', '4', '5', '6', '⌫'];
      plansza.style.setProperty('--n', '6');
      for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
        const dana = z.dane[r][c];
        const v = gotowa ? z.rozw[r][c] : dana || komorka(r, c);
        const cls = `${dana ? 'given' : 'ink'}${c === 2 ? ' br' : ''}${r % 2 === 1 && r < 5 ? ' bb' : ''}`;
        plansza.append(pole(r, c, v ? String(v) : '', cls, !dana));
      }
    } else if (z.rodzaj === 'kakuro') {
      klawisze = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫'];
      plansza.style.setProperty('--n', String(z.siatka[0].length));
      z.siatka.forEach((w, r) => w.forEach((k, c) => {
        if (k === 'b') {
          const dana = z.dane[r][c];
          const v = gotowa ? z.rozw[r][c] : dana || komorka(r, c);
          plansza.append(pole(r, c, v ? String(v) : '', dana ? 'given' : 'ink', !dana));
        } else {
          const d = el('div', `gz-cell gz-black${k ? ' gz-clue' : ''}`);
          if (k) {
            if (k.p) d.append(el('span', 'gz-cp', String(k.p)));
            if (k.d) d.append(el('span', 'gz-cd', String(k.d)));
          }
          plansza.append(d);
        }
      }));
    } else if (z.rodzaj === 'krzyzowka') {
      const n = z.n, size = 2 * n + 1;
      const wybraneOp = wybrane && (wybrane[0] % 2 === 1 || wybrane[1] % 2 === 1);
      klawisze = wybrane ? (wybraneOp ? [...OPY, '⌫'] : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫']) : [];
      plansza.style.setProperty('--n', String(size));
      for (let R = 0; R < size; R++) for (let C = 0; C < size; C++) {
        const nr = R % 2 === 0 && R < 2 * n, nc = C % 2 === 0 && C < 2 * n;
        const r = R / 2, c = C / 2;
        if (nr && nc) {
          const dana = z.liczby[r][c];
          const v = gotowa ? z.rozw.liczby[r][c] : dana ?? komorka(R, C);
          plansza.append(pole(R, C, v != null ? String(v) : '', dana != null ? 'given' : 'ink', dana == null));
        } else if (nr && C % 2 === 1 && C < 2 * n - 1) {
          const cc = (C - 1) / 2;
          const dana = z.wiersze[r][cc];
          const v = gotowa ? z.rozw.wiersze[r][cc] : dana ?? komorka(R, C);
          plansza.append(pole(R, C, znak(v), `${dana ? 'given' : 'ink'} gz-op`, !dana));
        } else if (nc && R % 2 === 1 && R < 2 * n - 1) {
          const rr = (R - 1) / 2;
          const dana = z.kolumny[rr][c];
          const v = gotowa ? z.rozw.kolumny[rr][c] : dana ?? komorka(R, C);
          plansza.append(pole(R, C, znak(v), `${dana ? 'given' : 'ink'} gz-op`, !dana));
        } else if (nr && C === 2 * n - 1) plansza.append(el('div', 'gz-cell given gz-op', '='));
        else if (nr && C === 2 * n) plansza.append(el('div', 'gz-cell given gz-res', String(z.wynikiW[r])));
        else if (nc && R === 2 * n - 1) plansza.append(el('div', 'gz-cell given gz-op', '='));
        else if (nc && R === 2 * n) plansza.append(el('div', 'gz-cell given gz-res', String(z.wynikiK[c])));
        else plansza.append(el('div', 'gz-cell gz-none'));
      }
    } else {
      klawisze = [];
      const H = z.pola.length, W = z.pola[0].length;
      plansza.style.setProperty('--n', String(W));
      const sciezka: [number, number][] = gotowa ? z.przyklad : (stan.trasa ??= [[H - 1, 0]]);
      const na = new Map(sciezka.map(([r, c], i) => [r * W + c, i]));
      z.pola.forEach((w, r) => w.forEach((v, c) => {
        const b = el('button', `gz-cell gz-dot${na.has(r * W + c) ? ' on' : ''}${r === H - 1 && c === 0 ? ' gz-start' : ''}${r === 0 && c === W - 1 ? ' gz-meta' : ''}`, String(v));
        b.type = 'button';
        b.onclick = () => {
          if (gotowa) return;
          const i = na.get(r * W + c);
          const [lr, lc] = sciezka[sciezka.length - 1];
          if (i !== undefined) sciezka.splice(i + 1);
          else if (Math.abs(lr - r) + Math.abs(lc - c) === 1) sciezka.push([r, c]);
          else return;
          zapisz(klucz, stan);
          const [er, ec] = sciezka[sciezka.length - 1];
          if (er === 0 && ec === W - 1) {
            if (sprawdzTrase(z, sciezka)) sukces();
            else powiedz(L.krotsza, { m: sumaTrasy(z, sciezka) });
          } else powiedz(L.dlugosc, { m: sumaTrasy(z, sciezka) });
          odswiez();
        };
        plansza.append(b);
      }));
      // The route as an ink line over the dots.
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'gz-route');
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('preserveAspectRatio', 'none');
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      line.setAttribute('points', sciezka.map(([r, c]) => `${c + 0.5},${r + 0.5}`).join(' '));
      svg.append(line);
      plansza.append(svg);
    }
    rysujPad();
  };

  // ---------------------------------------------------------------- check
  const sprawdz = () => {
    if (gotowa) return;
    const num = (r: number, c: number) => { const v = komorka(r, c); return typeof v === 'number' ? v : 0; };
    let pelne = true, dobrze = false;
    if (z.rodzaj === 'sudoku') {
      const g = z.dane.map((w, r) => w.map((d, c) => d || num(r, c)));
      pelne = g.flat().every((v) => v > 0);
      dobrze = pelne && sprawdzSudoku(z, g);
    } else if (z.rodzaj === 'kakuro') {
      const g = z.siatka.map((w, r) => w.map((k, c) => (k === 'b' ? z.dane[r][c] || num(r, c) : 0)));
      pelne = z.siatka.every((w, r) => w.every((k, c) => k !== 'b' || g[r][c] > 0));
      dobrze = pelne && sprawdzKakuro(z, g);
    } else if (z.rodzaj === 'krzyzowka') {
      const n = z.n;
      const liczby = z.liczby.map((w, r) => w.map((d, c) => d ?? (komorka(2 * r, 2 * c) as number | null)));
      const wiersze = z.wiersze.map((w, r) => w.map((d, c) => d ?? (komorka(2 * r, 2 * c + 1) as Op | null)));
      const kolumny = z.kolumny.map((w, r) => w.map((d, c) => d ?? (komorka(2 * r + 1, 2 * c) as Op | null)));
      pelne = liczby.flat().every((v) => v != null) && wiersze.flat().every(Boolean) && kolumny.flat().every(Boolean);
      dobrze = pelne && n > 0 && sprawdzKrzyzowke(z, liczby, wiersze, kolumny);
    }
    if (!pelne) powiedz(L.niePelne);
    else if (dobrze) sukces();
    else powiedz(L.zle);
  };

  const przyciski = el('div', 'gz-row gz-puz-btns');
  const bCheck = el('button', 'gz-stamp', tr(L.sprawdz));
  bCheck.type = 'button';
  bCheck.onclick = sprawdz;
  const bClear = el('button', 'gz-link', tr(L.wyczysc));
  bClear.type = 'button';
  bClear.onclick = () => {
    if (gotowa) return;
    stan.w = [];
    delete stan.trasa;
    zapisz(klucz, stan);
    wybrane = null;
    msg.textContent = '';
    odswiez();
  };
  przyciski.append(bClear, ...(z.rodzaj === 'trasa' ? [] : [bCheck]));

  const naglowek = el('div', 'gz-puz-head');
  naglowek.append(
    el('h2', 'gz-head', `${tr(L.tytul)}: ${tr(L.nazwy[z.rodzaj])}`),
    el('p', 'gz-dateline gz-center', fmt(L.poziom, { poziom: tr(POZIOMY_LAMIGLOWEK[h.poziom] ?? POZIOMY_LAMIGLOWEK[0]) })),
    el('p', 'gz-text', tr(L.zasady[z.rodzaj])),
  );
  const tablica = el('div', 'gz-board-wrap');
  tablica.append(plansza);
  node.append(naglowek, tablica, pad, msg, przyciski, el('p', 'gz-note', tr(L.stopka)));

  odswiez = () => {
    rysuj();
    przyciski.style.display = gotowa ? 'none' : '';
    if (gotowa && !msg.textContent) { msg.className = 'gz-puz-msg ok'; msg.textContent = tr(L.juz); }
  };
  odswiez();

  /** Keyboard: digits, + - * / x, Backspace/Delete, arrows move the selection. True when the key was used. */
  const klawisz = (e: KeyboardEvent) => {
    if (gotowa) return false;
    const k = e.key;
    if (/^[0-9]$/.test(k) && klawisze.includes(k)) { naKlawisz(k); return true; }
    const op = k === '+' ? '+' : k === '-' ? '-' : k === '*' || k === 'x' ? '×' : k === '/' || k === ':' ? '÷' : null;
    if (op && klawisze.includes(op)) { naKlawisz(op); return true; }
    if ((k === 'Backspace' || k === 'Delete') && klawisze.includes('⌫')) { naKlawisz('⌫'); return true; }
    const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
    if (d && wybrane) {
      // Jump to the next editable cell in that direction.
      const all = [...plansza.querySelectorAll<HTMLButtonElement>('button.gz-cell')];
      const n = Number(getComputedStyle(plansza).getPropertyValue('--n')) || 1;
      let [r, c] = wybrane;
      const idx = (rr: number, cc: number) => rr * n + cc;
      const kids = [...plansza.children];
      for (let i = 0; i < 2 * n; i++) {
        r += d[0];
        c += d[1];
        if (r < 0 || c < 0 || r >= n || c >= n) break;
        const k2 = kids[idx(r, c)];
        if (k2 instanceof HTMLButtonElement && all.includes(k2)) { wybrane = [r, c]; odswiez(); break; }
      }
      return true;
    }
    return false;
  };
  return { node, klawisz };
}
