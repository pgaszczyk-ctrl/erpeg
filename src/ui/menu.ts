import type { CityMap } from '../map/CityMap';
import { api, type LoginResult } from '../api';
import { startSession } from '../quests';
import { PX_PER_M } from '../map/CityMap';
import { codeCard, codeFromLink } from './codeCard';

// The start screen (an HTML overlay above the game): new character, load
// character, memorial board. Resolves once a character is ready to play.

const DEFAULT_START = 'Plac Zamkowy';

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

export function showMenu(city: CityMap): Promise<void> {
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
    const play = (r: LoginResult) => {
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
      const err = error();
      const go: HTMLButtonElement = button('Stwórz postać', () =>
        busy(go, err, async () => {
          if (name.value.trim().length < 2) throw new Error('Imię musi mieć co najmniej 2 znaki.');
          const place = start.value.trim() || DEFAULT_START;
          const p = city.findStart(place);
          if (!p) throw new Error(`Nie znalazłem na mapie: „${place}”. Podaj ulicę albo ulicę i numer.`);
          const r = await api.createCharacter(name.value.trim(), place, p.x, p.y, PX_PER_M);
          showCode(r, `Witaj, ${r.player.name}!`);
        }), 'm-primary');
      screen(
        el('h2', {}, ['Nowa postać']),
        field('Imię', name, '⚠ Imienia nie można później zmienić.'),
        field('Adres startowy', start, `Ulica albo ulica i numer. Puste = ${DEFAULT_START}. Tu wracasz po każdym wyjściu z gry.`),
        err,
        go,
        button('Wstecz', main),
      );
    };

    /** After creating a character (or when an old one got its new code). */
    const showCode = (r: LoginResult, title: string) =>
      screen(
        el('h2', {}, [title]),
        el('p', {}, ['To Twój kod postaci. Imię i kod wystarczą, żeby wczytać postać na każdym urządzeniu.']),
        codeCard(r.player.name, r.player.idik, r.token ?? null, r.player.email),
        el('p', { className: 'm-warn' }, [
          'Zapisz kod, zrób zdjęcie albo wyślij go sobie na maila! Bez niego nie wczytasz postaci. Kod znajdziesz też w grze w menu ☰.',
        ]),
        button('Mam kod – graj', () => (r.player.dead ? dead(r) : play(r)), 'm-primary'),
      );

    const login = async (name: string, code: string, password?: string) => {
      const r = await api.login(name, code.replace(/[^0-9a-z]/gi, ''), password);
      if (r.new_code) showCode(r, 'Nowy kod postaci');
      else if (r.player.dead) dead(r);
      else play(r);
    };

    const load = (prefill?: { name: string; code: string }, prefillError?: string) => {
      const name = input({ maxLength: 20, value: prefill?.name ?? '' });
      const code = input({ maxLength: 9, placeholder: '8 znaków', className: 'm-upper', value: prefill?.code ?? '' });
      const pass = input({ type: 'password' });
      // Old characters (a 6-character IDIK) still need their password once.
      const passField = field('Hasło', pass, 'Tylko stare postacie z 6-znakowym IDIK-iem, ostatni raz – potem dostaniesz nowy kod.');
      const oldCode = () => code.value.replace(/[^0-9a-z]/gi, '').length === 6;
      const update = () => (passField.style.display = oldCode() ? '' : 'none');
      code.oninput = update;
      update();
      const err = error();
      if (prefillError) err.textContent = prefillError;
      const go: HTMLButtonElement = button('Wczytaj', () =>
        busy(go, err, () => login(name.value.trim(), code.value, oldCode() ? pass.value : undefined)), 'm-primary');
      screen(el('h2', {}, ['Wczytaj postać']), field('Imię', name), field('Kod postaci', code), passField, err, go, button('Wstecz', main));
    };

    const dead = (r: LoginResult) =>
      screen(
        el('h2', {}, [`${r.player.name} nie żyje`]),
        el('p', {}, [
          `Postać zginęła ${formatDate(r.player.died_at)}${r.death_place ? ` (${r.death_place})` : ''}. `,
          `Zdobyte doświadczenie: ${r.player.exp} EXP. Jej imię jest na Tablicy Pamięci.`,
        ]),
        el('button', { type: 'button', className: 'm-btn', disabled: true }, ['Wskrześ za 5 zł (wkrótce)']),
        button('Tablica pamięci', memorial),
        button('Wstecz', main),
      );

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
                  el('small', {}, [`${formatDate(r.died_at)}${r.death_place ? ` · ${r.death_place}` : ''}`]),
                ]))
            : ['Nikt jeszcze nie zginął. Jeszcze…']),
        );
      } catch (e) {
        list.textContent = (e as Error).message;
      }
    };

    // Opened from the QR code / e-mail link: load that character right away.
    const fromLink = codeFromLink();
    if (fromLink) {
      screen(el('p', {}, [`Wczytuję postać ${fromLink.name}…`]));
      login(fromLink.name, fromLink.code).catch((e) => load(fromLink, (e as Error).message));
    } else main();
  });
}
