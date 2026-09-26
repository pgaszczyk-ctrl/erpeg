import type { CityMap } from '../map/CityMap';
import { api, type LoginResult } from '../api';
import { startSession, loadContent } from '../quests';
import { drawCity } from './minimap';
import { PX_PER_M } from '../map/CityMap';
import { codeCard, codeFromLink } from './codeCard';
import { tx } from '../i18n';
import { googleSignOut, googleToken, googleUser } from '../google';
import { signInDialog } from './signin';
import { TRUDNOSCI, DOMYSLNA_TRUDNOSC } from '../content/trudnosc';
import { drawLook, DEFAULT_LOOK, HEADS, BUILDS, OUTFITS, HAIRS, SKINS, HAIR_COLORS, CLOTHES, lookLimits, randomLook, LOOK_H, LOOK_TOP, type Look } from '../look';

// The start screen (an HTML overlay above the game): new character, load
// character, memorial board. Resolves once a character is ready to play.

const DEFAULT_START = 'Plac Zamkowy';
/** Living characters per account (the server checks it too). */
const GOOGLE_LIMIT = 3;

let root: HTMLDivElement | null = null;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, children: (Node | string)[] = []): HTMLElementTagNameMap[K] {
  const e = Object.assign(document.createElement(tag), props);
  for (const c of children) e.append(c);
  return e;
}

function field(label: string, input: HTMLInputElement, note?: string) {
  return el('label', { className: 'm-field' }, [el('span', {}, [label]), input, ...(note ? [el('small', {}, [note])] : [])]);
}

function input(props: Record<string, unknown>) {
  return el('input', { autocomplete: 'off', spellcheck: false, ...props });
}

function button(text: string, onClick: () => void, cls = '') {
  return el('button', { type: 'button', className: `m-btn ${cls}`, onclick: onClick }, [text]);
}

function formatDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** `reopen`: go straight to this character (e.g. after dying in the game). */
export function showMenu(city: CityMap, reopen?: { name: string; code: string }): Promise<void> {
  return new Promise((resolve) => {
    root?.remove();
    root = el('div', { id: 'menu' });
    document.body.append(root);
    const box = el('div', { className: 'm-box' });
    root.append(box);

    const screen = (...children: (Node | string)[]) => {
      box.replaceChildren(el('h1', {}, ['ERPEG']), el('p', { className: 'm-sub' }, ['Przygoda w Lublinie']), ...children);
      box.querySelector('input')?.focus();
    };
    const error = () => el('p', { className: 'm-error' });
    const busy = async (btn: HTMLButtonElement, err: HTMLElement, fn: () => Promise<void>) => {
      err.textContent = '';
      btn.disabled = true;
      try {
        await fn();
      } catch (e) {
        err.textContent = (e as Error).message;
      } finally {
        btn.disabled = false;
      }
    };
    const play = async (r: LoginResult) => {
      await loadContent();
      startSession(r);
      root?.remove();
      root = null;
      resolve();
    };

    const main = () =>
      screen(
        button('Nowa postać', newCharacter, 'm-primary'),
        button('Wczytaj postać', load),
        button('Tablica pamięci', memorial),
      );

    const newCharacter = () => {
      const name = input({ maxLength: 20, placeholder: 'np. Zbyszko' });
      const start = input({ placeholder: 'np. Krakowskie Przedmieście albo Zamkowa 9' });
      // Difficulty: a slider from "Kids" to "Hardcore" (kept on the server as an age).
      let level = DOMYSLNA_TRUDNOSC;
      const levelRange = el('input', { type: 'range', min: 0, max: TRUDNOSCI.length - 1, step: 1, value: String(level), className: 'm-range' });
      const levelName = el('span', { className: 'm-val' });
      const levelInfo = el('small', {});
      const showLevel = () => {
        const t = TRUDNOSCI[level];
        levelName.textContent = tx(t.nazwa, t.en);
        levelInfo.textContent = t.opis;
      };
      levelRange.oninput = () => {
        level = Number(levelRange.value);
        showLevel();
      };
      showLevel();
      const err = error();
      // Optionally assigned to an account (Google / Magicownia) (then loaded from a list, no code needed).
      const linkBox = el('div', { className: 'm-field' });
      const linkCheck = el('input', { type: 'checkbox', checked: true });
      const showLink = () => {
        const u = googleUser();
        linkBox.replaceChildren(u
          ? el('label', { className: 'm-check' }, [linkCheck, ` Przypisz do konta (${u.email || 'zalogowano'})`])
          : button('🔵 Zaloguj się (Google / Magicownia), żeby przypisać postać', () => signInThen(err, showLink)));
      };
      showLink();
      const go: HTMLButtonElement = button('Stwórz postać', () =>
        busy(go, err, async () => {
          if (name.value.trim().length < 2) throw new Error('Imię musi mieć co najmniej 2 znaki.');
          const place = start.value.trim() || DEFAULT_START;
          const p = city.findStart(place);
          if (!p) throw new Error(`Nie znalazłem na mapie: „${place}”. Podaj ulicę albo ulicę i numer.`);
          const token = googleUser() && linkCheck.checked ? await googleToken() : null;
          if (token && (await api.myCharacters(token)).filter((c) => !c.dead).length >= GOOGLE_LIMIT) {
            throw new Error(`Na jednym koncie mogą być najwyżej ${GOOGLE_LIMIT} żywe postacie. Odznacz przypisanie albo użyj innego konta.`);
          }
          const r = await api.createCharacter(name.value.trim(), place, p.x, p.y, PX_PER_M, TRUDNOSCI[level].wiek, look);
          if (token) await api.linkGoogle(r.player.name, r.player.idik, token).catch(() => {});
          showCode(r, `Witaj, ${r.player.name}!`);
        }), 'm-primary');
      // How the hero looks: a live preview next to the name, sliders below.
      const look: Look = { ...DEFAULT_LOOK };
      const preview = el('canvas', { className: 'm-hero', width: 48, height: LOOK_H });
      let frame = 0;
      const paint = () => {
        const ctx = preview.getContext('2d')!;
        ctx.clearRect(0, 0, 48, LOOK_H);
        (['down', 'side', 'up'] as const).forEach((dir, i) => drawLook(ctx, i * 16, LOOK_TOP, dir, frame, look));
      };
      const timer = setInterval(() => {
        if (!preview.isConnected) return clearInterval(timer);
        frame = [1, 0, 2, 0][Math.floor(Date.now() / 220) % 4];
        paint();
      }, 110);
      const sliders: (() => void)[] = [];
      const slider = (label: string, key: keyof Look, names?: () => string[], colors?: string[]) => {
        const max = lookLimits()[key] - 1;
        const range = el('input', { type: 'range', min: 0, max, step: 1, value: String(look[key]), className: 'm-range' });
        const value = el('span', { className: 'm-val' });
        const show = () => {
          range.value = String(look[key]);
          if (names) value.textContent = names()[look[key]];
          else {
            value.textContent = '';
            value.style.background = colors![look[key]];
            value.className = 'm-val m-swatch';
          }
        };
        range.oninput = () => {
          look[key] = Number(range.value);
          show();
          paint();
        };
        sliders.push(show);
        show();
        return el('label', { className: 'm-slide' }, [el('span', {}, [label]), range, value]);
      };
      const lookBox = el('div', { className: 'm-look' }, [
        slider(tx('Głowa', 'Head'), 'head', HEADS),
        slider(tx('Sylwetka', 'Build'), 'build', BUILDS),
        slider(tx('Strój', 'Outfit'), 'outfit', OUTFITS),
        slider(tx('Fryzura', 'Hair'), 'hair', HAIRS),
        slider(tx('Kolor skóry', 'Skin'), 'skin', undefined, SKINS),
        slider(tx('Kolor włosów', 'Hair colour'), 'hairColor', undefined, HAIR_COLORS),
        slider(tx('Kolor góry', 'Top colour'), 'top', undefined, CLOTHES),
        slider(tx('Kolor dołu', 'Bottom colour'), 'bottom', undefined, CLOTHES),
        button(tx('🎲 Losuj wygląd', '🎲 Random look'), () => {
          Object.assign(look, randomLook());
          sliders.forEach((f) => f());
          paint();
        }),
      ]);
      paint();
      screen(
        el('h2', {}, ['Nowa postać']),
        el('div', { className: 'm-namerow' }, [preview, field('Imię', name, '⚠ Imienia nie można później zmienić.')]),
        lookBox,
        field('Adres startowy', start, `Ulica albo ulica i numer. Puste = ${DEFAULT_START}. Tu stoi twój domek i tu wracasz po każdym wyjściu z gry.`),
        el('div', { className: 'm-field' }, [
          el('span', {}, [tx('Poziom trudności', 'Difficulty')]),
          el('label', { className: 'm-slide m-level' }, [levelRange, levelName]),
          levelInfo,
        ]),
        linkBox,
        err,
        go,
        button('Wstecz', main),
      );
    };

    /** Signs in (Google or a Magicownia account), then runs `then`. */
    const signInThen = async (err: HTMLElement, then: () => void) => {
      err.textContent = '';
      try {
        await signInDialog();
      } catch {
        return; // cancelled
      }
      then();
    };

    /**
     * The account's characters: the last played on top, then "new
     * character", then the others (the dead ones as ghosts).
     */
    const account = async () => {
      const err = error();
      const list = el('div', { className: 'm-list m-chars' }, ['Wczytuję…']);
      const u = googleUser();
      screen(
        el('h2', {}, ['Twoje postacie']),
        el('p', { className: 'm-sub' }, [u?.email ?? '']),
        list, err,
        button('Wyloguj się', () => {
          googleSignOut();
          load();
        }),
        button('Wstecz', load),
      );
      try {
        const token = await googleToken();
        if (!token) return load(undefined, 'Sesja wygasła – zaloguj się ponownie.');
        const chars = await api.myCharacters(token);
        const alive = chars.filter((c) => !c.dead).length;
        const row = (c: (typeof chars)[number], first = false) => {
          const lvl = TRUDNOSCI.find((t) => t.wiek === c.age)?.nazwa ?? '';
          const b = el('button', { type: 'button', className: `m-btn m-char${first ? ' m-primary' : ''}` }, [
            el('b', {}, [`${c.dead ? '👻 ' : ''}${c.name}`]),
            el('small', {}, [`${c.exp} EXP${lvl ? ` · ${lvl}` : ''}${c.last_seen ? ` · grano ${formatDate(c.last_seen)}` : ''}`]),
          ]);
          b.onclick = () => busy(b, err, () => login(c.name, c.idik));
          return b;
        };
        const newBtn = el('button', { type: 'button', className: 'm-btn', disabled: alive >= GOOGLE_LIMIT }, [
          alive >= GOOGLE_LIMIT ? `➕ Nowa postać (limit ${GOOGLE_LIMIT} żywych na konto)` : '➕ Nowa postać',
        ]);
        newBtn.onclick = newCharacter;
        const [lastOne, ...rest] = chars;
        list.replaceChildren(...(lastOne ? [row(lastOne, true)] : []), newBtn, ...rest.map((c) => row(c)));
        if (!chars.length) list.append(el('p', {}, ['Na tym koncie nie ma jeszcze postaci. Stwórz nową albo przypisz istniejącą przyciskiem przy kodzie postaci.']));
      } catch (e) {
        list.replaceChildren();
        err.textContent = (e as Error).message;
      }
    };

    /** After creating a character (or when an old one got its new code). */
    const showCode = (r: LoginResult, title: string) =>
      screen(
        el('h2', {}, [title]),
        el('p', {}, ['To Twój kod postaci. Imię i kod wystarczą, żeby wczytać postać na każdym urządzeniu.']),
        codeCard(r.player.name, r.player.idik),
        el('p', { className: 'm-warn' }, [
          'Zapisz kod, zrób zdjęcie albo wyślij go sobie (np. na WhatsAppie)! Bez niego nie wczytasz postaci. Kod znajdziesz też w grze w menu ☰.',
        ]),
        rememberForm(r.player.name, r.player.idik),
        button('Mam kod – graj', () => {
          remember(r.player.name, r.player.idik, box.querySelector<HTMLFormElement>('.m-remember'));
          if (r.player.dead) dead(r);
          else play(r);
        }, 'm-primary'),
      );

    const login = async (name: string, code: string, password?: string, form?: HTMLFormElement) => {
      const r = await api.login(name, code.replace(/[^0-9a-z]/gi, ''), password);
      if (r.new_code) return showCode(r, 'Nowy kod postaci');
      remember(r.player.name, r.player.idik, form);
      if (r.player.dead) dead(r);
      else await play(r);
    };

    const load = (prefill?: { name: string; code: string }, prefillError?: string) => {
      // A real form with username/password fields, so the browser offers to remember them.
      const name = input({ maxLength: 20, value: prefill?.name ?? '', name: 'username', autocomplete: 'username' });
      const code = input({
        maxLength: 9, placeholder: '8 znaków', className: 'm-upper', value: prefill?.code ?? '',
        type: 'password', name: 'password', autocomplete: 'current-password',
      });
      const eye = el('button', {
        type: 'button', className: 'm-eye', title: 'Pokaż kod',
        onclick: () => (code.type = code.type === 'password' ? 'text' : 'password'),
      }, ['👁']);
      const pass = input({ type: 'password', autocomplete: 'off' });
      // Old characters (a 6-character IDIK) still need their password once.
      const passField = field('Hasło', pass, 'Tylko stare postacie z 6-znakowym IDIK-iem, ostatni raz – potem dostaniesz nowy kod.');
      const oldCode = () => code.value.replace(/[^0-9a-z]/gi, '').length === 6;
      const update = () => (passField.style.display = oldCode() ? '' : 'none');
      code.oninput = update;
      update();
      const err = error();
      if (prefillError) err.textContent = prefillError;
      const go = el('button', { type: 'submit', className: 'm-btn m-primary' }, ['Wczytaj']);
      const form = el('form', { className: 'm-card', action: '#', method: 'post' }, [
        field('Imię', name),
        el('label', { className: 'm-field' }, [el('span', {}, ['Kod postaci']), el('div', { className: 'm-pass' }, [code, eye])]),
        passField, err, go,
      ]);
      form.onsubmit = (e) => {
        e.preventDefault();
        busy(go, err, () => login(name.value.trim(), code.value, oldCode() ? pass.value : undefined, form));
      };
      const gErr = error();
      const gBtn: HTMLButtonElement = button('🔵 Wczytaj z konta (Google / Magicownia)', () =>
        busy(gBtn, gErr, async () => {
          if (googleUser() && (await googleToken())) return account();
          await signInThen(gErr, account);
        }), 'm-google');
      screen(el('h2', {}, ['Wczytaj postać']), gBtn, gErr, el('p', { className: 'm-or' }, ['albo imieniem i kodem:']), form, button('Wstecz', main));
    };

    /** A dead character: its ghost where it died, and the way back to life. */
    const dead = (r: LoginResult) => {
      const p = r.player;
      const err = error();
      const free = (p.resurrections ?? 0) < 1;
      const rise: HTMLButtonElement = free
        ? button('✨ Wskrześ – pierwszy raz za darmo', () =>
            busy(rise, err, async () => {
              const back = await api.resurrect(p.name, p.idik);
              await play(back);
            }), 'm-primary')
        : el('button', { type: 'button', className: 'm-btn', disabled: true }, ['Wskrześ za 1 € (płatności wkrótce)']);
      screen(
        el('h2', {}, [`👻 ${p.name} nie żyje`]),
        ghostMap(city, p),
        el('p', {}, [
          `Postać zginęła ${formatDate(p.died_at)}${r.death_place ? ` (${r.death_place})` : ''}. `,
          `Zdobyte doświadczenie: ${p.exp} EXP. Jej imię jest na Tablicy Pamięci.`,
        ]),
        el('p', { className: 'm-warn' }, [
          free
            ? 'Duch wciąż błąka się po mieście… Możesz go wskrzesić: postać wróci do punktu startowego z rzeczami i doświadczeniem z ostatniego zapisu.'
            : 'Ta postać była już raz wskrzeszona. Kolejne wskrzeszenie będzie kosztować 1 €.',
        ]),
        err,
        rise,
        button('Tablica pamięci', memorial),
        button('Wstecz', main),
      );
    };

    const memorial = async () => {
      const list = el('div', { className: 'm-list' }, ['Wczytuję…']);
      screen(el('h2', {}, ['🕯 Tablica pamięci']), list, button('Wstecz', main));
      try {
        const rows = await api.memorial();
        list.replaceChildren(
          ...(rows.length
            ? rows.map((r) =>
                el('div', { className: 'm-row' }, [
                  el('b', {}, [r.name]),
                  el('span', {}, [`${r.exp} EXP`]),
                  el('small', {}, [`${formatDate(r.died_at)}${r.death_place ? ` · ${r.death_place}` : ''}${r.resurrected ? ' · ✨ wskrzeszony' : ''}`]),
                ]))
            : ['Nikt jeszcze nie zginął. Jeszcze…']),
        );
      } catch (e) {
        list.textContent = (e as Error).message;
      }
    };

    // Opened from the QR code / shared link: load that character right away.
    const fromLink = codeFromLink() ?? reopen;
    if (fromLink) {
      screen(el('p', {}, [`Wczytuję postać ${fromLink.name}…`]));
      login(fromLink.name, fromLink.code).catch((e) => load(fromLink, (e as Error).message));
    } else main();
  });
}

/** Lets the browser (password manager) remember name + code. */
function remember(name: string, code: string, form?: HTMLFormElement | null) {
  try {
    const PC = (window as unknown as { PasswordCredential?: new (d: { id: string; password: string; name: string }) => Credential }).PasswordCredential;
    if (PC) navigator.credentials.store(new PC({ id: name, password: code, name })).catch(() => {});
    // Other browsers notice a submitted form with a password field.
    else if (form && form.classList.contains('m-remember')) form.requestSubmit();
  } catch {
    // Not supported: nothing to do.
  }
}

/** A hidden form with name + code, submitted so browsers offer to save them. */
function rememberForm(name: string, code: string) {
  const f = el('form', { className: 'm-remember', action: '#', method: 'post' }, [
    el('input', { name: 'username', autocomplete: 'username', value: name, readOnly: true }),
    el('input', { type: 'password', name: 'password', autocomplete: 'new-password', value: code, readOnly: true }),
  ]);
  f.onsubmit = (e) => e.preventDefault();
  return f;
}

/** A still map of where the character died, with its ghost. */
function ghostMap(city: CityMap, p: LoginResult['player']) {
  if (p.death_x == null || p.death_y == null) return el('div');
  const k = PX_PER_M / (p.death_scale ?? 4);
  const x = p.death_x * k;
  const y = p.death_y * k;
  const R = 110 * PX_PER_M;
  const size = 300;
  const canvas = el('canvas', { className: 'm-deathmap' });
  canvas.width = canvas.height = size * Math.min(2, window.devicePixelRatio || 1);
  drawCity(canvas, city, { x0: x - R, y0: y - R, x1: x + R, y1: y + R });
  const ctx = canvas.getContext('2d')!;
  // A soft grey mist over the place.
  const g = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width * 0.12, canvas.width / 2, canvas.height / 2, canvas.width * 0.7);
  g.addColorStop(0, 'rgba(30,26,36,0)');
  g.addColorStop(1, 'rgba(30,26,36,0.75)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return el('div', { className: 'm-ghostwrap' }, [canvas, el('div', { className: 'm-ghost' }, [ghostSvg()])]);
}

function ghostSvg() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 40 48');
  svg.setAttribute('width', '46');
  svg.setAttribute('height', '55');
  svg.innerHTML =
    '<path d="M4 22a16 16 0 0 1 32 0v22l-5.3-4-5.4 4-5.3-4-5.3 4-5.4-4L4 44z" fill="#f4f1ff" fill-opacity="0.9" stroke="#1e1a24" stroke-width="2"/>' +
    '<ellipse cx="14.5" cy="21" rx="3" ry="4" fill="#1e1a24"/><ellipse cx="25.5" cy="21" rx="3" ry="4" fill="#1e1a24"/>' +
    '<ellipse cx="20" cy="31" rx="3" ry="2.2" fill="#1e1a24"/>';
  return svg;
}
