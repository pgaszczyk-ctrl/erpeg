import type { CityMap } from '../map/CityMap';
import { api, type LoginResult } from '../api';
import { startSession } from '../quests';

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
      const pass = input({ type: 'password', placeholder: 'co najmniej 4 znaki' });
      const start = input({ placeholder: 'np. Krakowskie Przedmieście albo Zamkowa 9' });
      const err = error();
      const go: HTMLButtonElement = button('Stwórz postać', () =>
        busy(go, err, async () => {
          if (name.value.trim().length < 2) throw new Error('Imię musi mieć co najmniej 2 znaki.');
          if (pass.value.length < 4) throw new Error('Hasło musi mieć co najmniej 4 znaki.');
          const place = start.value.trim() || DEFAULT_START;
          const p = city.findStart(place);
          if (!p) throw new Error(`Nie znalazłem na mapie: „${place}”. Podaj ulicę albo ulicę i numer.`);
          const r = await api.createCharacter(name.value.trim(), pass.value, place, p.x, p.y);
          showIdik(r);
        }), 'm-primary');
      screen(
        el('h2', {}, ['Nowa postać']),
        field('Imię', name, '⚠ Imienia nie można później zmienić.'),
        field('Hasło', pass),
        field('Adres startowy', start, `Ulica albo ulica i numer. Puste = ${DEFAULT_START}. Tu wracasz po każdym wyjściu z gry.`),
        err,
        go,
        button('Wstecz', main),
      );
    };

    const showIdik = (r: LoginResult) =>
      screen(
        el('h2', {}, [`Witaj, ${r.player.name}!`]),
        el('p', {}, ['Twój IDIK to:']),
        el('div', { className: 'm-idik' }, [r.player.idik]),
        el('p', { className: 'm-warn' }, [
          'Zapisz go! Imię, hasło i IDIK to jedyny sposób, żeby wczytać tę postać. Nie da się go odzyskać.',
        ]),
        button('Zapisałem – graj', () => play(r), 'm-primary'),
      );

    const load = () => {
      const name = input({ maxLength: 20 });
      const idik = input({ maxLength: 6, placeholder: '6 znaków', className: 'm-upper' });
      const pass = input({ type: 'password' });
      const err = error();
      const go: HTMLButtonElement = button('Wczytaj', () =>
        busy(go, err, async () => {
          const r = await api.login(name.value.trim(), idik.value.trim(), pass.value);
          if (r.player.dead) dead(r);
          else play(r);
        }), 'm-primary');
      screen(el('h2', {}, ['Wczytaj postać']), field('Imię', name), field('IDIK', idik), field('Hasło', pass), err, go, button('Wstecz', main));
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

    main();
  });
}
