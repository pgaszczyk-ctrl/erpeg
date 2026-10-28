import type { CityMap } from '../map/CityMap';
import { api, type LoginResult } from '../api';
import { startSession, loadContent, saveNow, session } from '../quests';
import { PX_PER_M } from '../map/CityMap';
import { codeCard, codeFromLink } from './codeCard';
import { lang, tx } from '../i18n';
import { LADOWANIE } from '../content/ladowanie';
import { googleSignOut, googleToken, googleUser } from '../google';
import { askAccount } from './account';
import { logoTekst } from './logo';
import { wersjaNapis, TEST, TEST_POSTACIE } from '../version';
import { TRUDNOSCI, DOMYSLNA_TRUDNOSC } from '../content/trudnosc';
import { BOHATEROWIE } from '../content/wyglad';
import { randomLook, type Look } from '../look';
import { zapamietanaPostac, zapomnijPostac } from '../pamiecPostaci';
import { zainstaluj, jakoAplikacja } from '../instalacja';
import { loadSettings } from '../settings';
import { PO_DEMO_START, PO_DEMO_KLUCZ } from '../content/demo';
import { showLoginMap, beginMapIntro } from './loadingMap';
import { przedWejsciem, anulujWejscie } from './poziomo';
import { sciezkaGry } from '../sciezka';
import { randomModul } from './modulPostac';

// The start screen (an HTML overlay above the game): new character, load
// character. Resolves once a character is ready to play.

const DEFAULT_START = 'Plac Zamkowy';
/** Living characters per account (the server checks it too). */

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
  showLoginMap();
  void loadSettings(); // the resurrection price etc. (also awaited by loadContent)
  const contentReady = loadContent(); // Read-only content while the player fills in the form.
  return new Promise((resolve) => {
    root?.remove();
    root = el('div', { id: 'menu' });
    document.body.append(root);
    const box = el('div', { className: 'm-box' });
    root.append(box);

    const screen = (...children: (Node | string)[]) => {
      box.replaceChildren(el('h1', {}, [logoTekst()]), el('p', { className: 'm-sub' }, [tx('Przygoda palcem po mapie', 'Finger-on-the-map adventure')]), ...children, el('p', { className: 'm-ver' }, [wersjaNapis()]), el('p', { className: 'm-ver' }, ['Mapy: © OpenStreetMap · Pogoda: MET Norway']));
      const languages = el('select', { 'ariaLabel': 'Language / Język' }, [el('option', {value:'pl'}, ['Polski']), el('option', {value:'en'}, ['English'])]);
      languages.value = lang;
      languages.onchange = () => {
        try { localStorage.setItem('exp-language', languages.value); } catch { /* URL still works */ }
        const url = new URL(location.href); url.searchParams.set('lang', languages.value); location.href = url.href;
      };
      box.append(languages);
      box.querySelector('input')?.focus();
    };
    const error = () => el('p', { className: 'm-error' });
    const busy = async (btn: HTMLButtonElement, err: HTMLElement, fn: () => Promise<void>, waiting?: string) => {
      if (btn.disabled) return;
      err.textContent = '';
      const label = [...btn.childNodes];
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      if (waiting) btn.replaceChildren(waiting);
      // Entering the game: a phone turns sideways right now, in this tap (ui/poziomo.ts).
      const wejscie = waiting === tx('Wchodzisz do gry…', 'Entering the game…');
      if (wejscie) przedWejsciem();
      try {
        await fn();
      } catch (e) {
        if (wejscie) anulujWejscie();
        err.textContent = (e as Error).message;
      } finally {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        if (waiting) btn.replaceChildren(...label);
      }
    };
    const play = async (r: LoginResult) => {
      przedWejsciem(); // a code link logs in without a tap: the page still turns before the loading cover
      if (root) beginMapIntro(root);
      // Show the response before session/scene preparation can occupy the thread.
      await Promise.all([contentReady, new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())))]);
      startSession(r);
      if (r.newCharacter) await saveNow(session.hp);
      root = null;
      resolve();
    };

    // The character played last on this device (a cookie: owner, 26 Oct 2026 – „temporary account”):
    // one tap carries on. Without the code or an account it's at the player's own risk.
    const kontynuuj = () => {
      const z = zapamietanaPostac();
      if (!z) return [];
      const err = error();
      const b: HTMLButtonElement = button(`▶ Kontynuuj: ${z.name}`, () =>
        busy(b, err, async () => {
          try {
            await login(z.name, z.code, undefined, undefined, true);
          } catch (e) {
            if (/Nie ma takiej postaci/i.test((e as Error).message)) zapomnijPostac();
            throw e;
          }
        }, tx('Wchodzisz do gry…', 'Entering the game…')), 'm-primary');
      const forget = el('button', { type: 'button', className: 'm-link', onclick: () => { zapomnijPostac(); main(); } }, ['Zapomnij tę postać na tym urządzeniu']);
      return [b, err, forget];
    };

    // „📲 Zainstaluj grę” under the start buttons (owner, 26 Oct 2026: an icon on the phone/computer like an app).
    const instaluj = () => {
      if (jakoAplikacja()) return [];
      const info = el('small', { className: 'm-geo' });
      const b = el('button', { type: 'button', className: 'm-link', onclick: () => void zainstaluj().then((r) => { info.textContent = r.ok ? '✅ Zainstalowana – szukaj ikony Exp-lore.' : r.jak ?? ''; }) }, ['📲 Zainstaluj grę jako aplikację']);
      return [b, info];
    };

    // The test server: only loading the test characters (and the one played last on this device).
    const main = () =>
      TEST ? load() : screen(
        ...kontynuuj(),
        button('Nowa postać', newCharacter, zapamietanaPostac() ? '' : 'm-primary'),
        button('Wczytaj postać', load),
        ...instaluj(),
      );

    const newCharacter = () => {
      let poDemo = false;
      try { poDemo = localStorage.getItem(PO_DEMO_KLUCZ) === '1'; } catch { /* no storage: the normal form */ }
      const name = input({ maxLength: 20, placeholder: 'np. Zbyszko' });
      const start = input({ placeholder: 'np. Krakowskie Przedmieście albo Zamkowa 9' });
      // "📍": the phone's location as the start, if the game has a map of it.
      let geoStart: { x: number; y: number } | null = null;
      const geoInfo = el('small', { className: 'm-geo' });
      start.addEventListener('input', () => {
        geoStart = null;
        geoInfo.textContent = '';
      });
      const geoBtn = el('button', { type: 'button', className: 'm-eye', title: 'Użyj mojej lokalizacji' }, ['📍']) as HTMLButtonElement;
      geoBtn.onclick = () => {
        if (!navigator.geolocation) {
          geoInfo.textContent = 'Ten telefon nie podaje lokalizacji.';
          return;
        }
        geoBtn.disabled = true;
        geoInfo.textContent = 'Szukam, gdzie jesteś…';
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            geoBtn.disabled = false;
            const { latitude: lat, longitude: lon } = pos.coords;
            if (!city.hasLatLon(lat, lon)) {
              geoStart = null;
              start.value = '';
              geoInfo.textContent = `Niestety nie znamy jeszcze tej lokalizacji. Zaczniesz na placu Zamkowym w Lublinie.`;
              return;
            }
            const p = city.fromLatLon(lat, lon);
            geoStart = city.freeNear(p.x, p.y);
            const here = city.describe(geoStart.x, geoStart.y);
            start.value = city.nearestAddress(geoStart.x, geoStart.y) ?? (here === 'bezdroża Lublina' ? city.streetNear(geoStart.x, geoStart.y, 1500) ?? 'okolice Lublina' : here);
            geoInfo.textContent = `✅ Twój domek stanie tutaj: ${start.value}`;
          },
          (e) => {
            geoBtn.disabled = false;
            geoInfo.textContent = e.code === e.PERMISSION_DENIED ? 'Nie pozwoliłeś sprawdzić lokalizacji – wpisz adres.' : 'Nie udało się ustalić lokalizacji – spróbuj jeszcze raz albo wpisz adres.';
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        );
      };
      // Difficulty: a slider from "Kids" to "Hardcore" (kept on the server as an age).
      let level = DOMYSLNA_TRUDNOSC;
      const levelRange = el('input', { type: 'range', min: 0, max: TRUDNOSCI.length - 1, step: 1, value: String(level), className: 'm-range' });
      const levelName = el('span', { className: 'm-val' });
      const showLevel = () => {
        const t = TRUDNOSCI[level];
        levelName.textContent = tx(t.nazwa, t.en);
      };
      levelRange.oninput = () => {
        level = Number(levelRange.value);
        showLevel();
      };
      showLevel();
      const err = error();
      // Optionally assigned to the player's account (then loaded from a list, no code needed).
      const linkBox = el('div', { className: 'm-field' });
      const linkCheck = el('input', { type: 'checkbox', checked: true });
      const showLink = () => {
        const u = googleUser();
        linkBox.replaceChildren(u
          ? el('label', { className: 'm-check' }, [linkCheck, ` Przypisz do konta (${u.email || 'zalogowano'})`])
          : button('👤 Zaloguj się, żeby przypisać postać do konta', () => signInThen(err, showLink)));
      };
      showLink();
      const go: HTMLButtonElement = button('Stwórz postać', () =>
        busy(go, err, async () => {
          if (name.value.trim().length < 2) throw new Error('Imię musi mieć co najmniej 2 znaki.');
          const place = poDemo ? PO_DEMO_START.nazwa : start.value.trim() || DEFAULT_START;
          const p = poDemo ? city.fromLatLon(PO_DEMO_START.lat, PO_DEMO_START.lon) : geoStart ?? city.findAnyStart(place, DEFAULT_START);
          if (!p) throw new Error(`Nie znalazłem na mapie: „${place}”. Podaj ulicę, ulicę i numer albo miejscowość, np. „Kościelna 5, Garbów”.`);
          const token = googleUser() && linkCheck.checked ? await googleToken() : null;
          const r = await api.createCharacter(name.value.trim(), place, p.x, p.y, PX_PER_M, TRUDNOSCI[level].wiek, look);
          if (!poDemo) r.newCharacter = true;
          if (token) await api.linkGoogle(r.player.name, r.player.idik, token).catch(() => {});
          if (poDemo) try { localStorage.removeItem(PO_DEMO_KLUCZ); } catch { /* nothing to clear */ }
          // Straight into the game (owner, 26 Oct 2026: no code screen first – the code waits in the Kufer,
          // the HUD portrait reminds about it, the device remembers the character).
          await play(r);
        }), 'm-primary');
      // Every hero starts as a young guard (owner, 27 Oct 2026: „usuń wybór ludzików, obecnie jest tylko strażnik”;
      // the story of the hero's growth comes later): the look is drawn at random, nothing to choose here.
      const look: Look = { ...randomLook(), postac: Math.floor(Math.random() * BOHATEROWIE.length), modul: randomModul(Math.random() < 0.5 ? 'k' : 'm') };
      screen(
        el('h2', {}, ['Nowa postać']),
        field('Imię', name, '⚠ Imienia nie można później zmienić.'),
        // After the demo the adventure starts in front of Targi Lublin: no address to choose (owner 7.10.2026).
        poDemo
          ? el('div', { className: 'm-field' }, [el('span', {}, ['Start przygody']), el('small', {}, [`🏛 ${PO_DEMO_START.nazwa}`])])
          : el('label', { className: 'm-field' }, [
              el('span', {}, ['Adres startowy']),
              el('div', { className: 'm-pass' }, [start, geoBtn]),
              geoInfo,
            ]),
        el('div', { className: 'm-field' }, [
          el('span', {}, [tx('Poziom trudności', 'Difficulty')]),
          el('label', { className: 'm-slide m-level' }, [levelRange, levelName]),
        ]),
        linkBox,
        err,
        go,
        button('Wstecz', main),
      );
    };

    /** Signs in to the player account (e-mail or Google), then runs `then`. */
    const signInThen = async (err: HTMLElement, then: () => void) => {
      err.textContent = '';
      if (await askAccount()) then();
    };

    /**
     * The account's characters: the last played on top, then "new
     * character", then the others.
     */
    const account = async () => {
      const err = error();
      const list = el('div', { className: 'm-list m-chars' }, ['Wczytuję…']);
      const u = googleUser();
      screen(
        el('h2', {}, ['Twoje postacie']),
        el('p', { className: 'm-sub' }, [u?.email ?? '']),
        list, err,
        button('Wyloguj z konta', () => {
          googleSignOut();
          load();
        }),
        button('Wstecz', load),
      );
      try {
        const token = await googleToken();
        if (!token) return load(undefined, 'Sesja wygasła – zaloguj się ponownie.');
        const chars = await api.myCharacters(token);
        const row = (c: (typeof chars)[number], first = false) => {
          const lvl = TRUDNOSCI.find((t) => t.wiek === c.age)?.nazwa ?? '';
          const b = el('button', { type: 'button', className: `m-btn m-char${first ? ' m-primary' : ''}` }, [
            el('b', {}, [c.name]),
            el('small', {}, [`${c.exp} EXP${lvl ? ` · ${lvl}` : ''}${c.last_seen ? ` · grano ${formatDate(c.last_seen)}` : ''}`]),
          ]);
          b.onclick = () => busy(b, err, () => login(c.name, c.idik), tx('Wchodzisz do gry…', 'Entering the game…'));
          return b;
        };
        const newBtn = el('button', { type: 'button', className: 'm-btn' }, ['➕ Nowa postać']);
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
    const showCode = (r: LoginResult, title: string) => {
      const err = error();
      const go: HTMLButtonElement = button('Mam kod – graj', () => busy(go, err, async () => {
        remember(r.player.name, r.player.idik, box.querySelector<HTMLFormElement>('.m-remember'));
        await play(r.player.dead ? await api.szpitalPowrot(r.player.name, r.player.idik) : r);
      }, tx('Wchodzisz do gry…', 'Entering the game…')), 'm-primary');
      screen(
        el('h2', {}, [title]),
        el('p', {}, ['Tym kodem zalogujesz się do postaci. Możesz też połączyć ją z kontem e-mail.']),
        codeCard(r.player.name, r.player.idik),
        rememberForm(r.player.name, r.player.idik),
        err, go,
      );
    };

    const login = async (name: string, code: string, password?: string, form?: HTMLFormElement, zUrzadzenia = false) => {
      if (TEST && !zUrzadzenia && !TEST_POSTACIE.some((n) => n.toLowerCase() === name.toLowerCase())) {
        throw new Error('Na serwerze testowym grają tylko postacie testowe.');
      }
      const r = await api.login(name, code.replace(/[^0-9a-z]/gi, ''), password);
      if (r.new_code) return showCode(r, 'Nowy kod postaci');
      remember(r.player.name, r.player.idik, form);
      // Death isn't final any more (owner, 26 Oct 2026): a character that died in the old game wakes up in hospital.
      await play(r.player.dead ? await api.szpitalPowrot(r.player.name, r.player.idik) : r);
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
        busy(go, err, () => login(name.value.trim(), code.value, oldCode() ? pass.value : undefined, form), tx('Wchodzisz do gry…', 'Entering the game…'));
      };
      const gErr = error();
      const gBtn: HTMLButtonElement = button('👤 Wczytaj z konta (e-mail lub Google)', () =>
        busy(gBtn, gErr, async () => {
          if (googleUser() && (await googleToken())) return account();
          await signInThen(gErr, account);
        }), 'm-google');
      // (the test characters' names are not shown: they are only for the owner)
      if (TEST) return screen(...kontynuuj(), el('h2', {}, ['Wczytaj postać testową']), form);
      screen(el('h2', {}, ['Wczytaj postać']), gBtn, gErr, el('p', { className: 'm-or' }, ['albo imieniem i kodem:']), form, button('Wstecz', main));
    };

    // Opened from the QR code / shared link: load that character right away.
    const fromLink = codeFromLink() ?? reopen;
    if (fromLink) {
      screen(el('p', {}, [LADOWANIE[Math.floor(Math.random() * LADOWANIE.length)]]));
      login(fromLink.name, fromLink.code).catch((e) => load(fromLink, (e as Error).message));
      return;
    }
    // Links from the landing page (/news): #nowa, #wczytaj, #konto open that screen.
    const goTo = location.hash.slice(1);
    if (['nowa', 'wczytaj', 'konto'].includes(goTo)) history.replaceState(null, '', sciezkaGry() + location.search);
    if (goTo === 'nowa' && !TEST) newCharacter();
    else if (goTo === 'wczytaj') load();
    else if (goTo === 'konto' && !TEST) {
      main();
      void (async () => {
        if (googleUser() && (await googleToken())) return account();
        if (await askAccount()) account();
      })();
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
