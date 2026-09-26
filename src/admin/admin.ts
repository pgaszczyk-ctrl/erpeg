import { rpc } from '../api';
import { CityMap } from '../map/CityMap';
import { drawCity } from '../map/drawCity';
import { MISJE, type Misja, type RodzajWroga } from '../content/fabula';
import { PRZEDMIOTY, UMIEJETNOSCI, PIERWSZY_POZIOM, MNOZNIK_POZIOMU, MAKS_POZIOM, type Umiejetnosc } from '../content/przedmioty';
import { OWOCE, type Owoc } from '../content/sklepy';
import { TRUDNOSCI, trudnoscZWieku } from '../content/trudnosc';
import { PX_PER_M } from '../map/CityMap';

// The admin panel (admin.html): characters and their statistics, missions
// (with a preview on the map) and secret codes for real places. Every call
// carries the admin password; the server checks it.

interface Player {
  name: string; exp: number; dead: boolean; age?: number;
  chest?: { slots: ({ item: string } | { fruit: Owoc; n: number } | null)[]; coins: number } | null; died_at: string | null; death_place: string | null; resurrections: number;
  created_at: string; last_seen: string | null; online: boolean; start_place: string | null; old: boolean;
  coins: number | null; missions: Record<string, string> | null; magic: boolean | null;
  stats: { m?: number; kills?: Record<string, number>; earned?: number; spent?: number; fruit?: number; missions?: number; codes?: number; riddles?: number } | null;
  equip: Record<string, string | null> | null; bag: ({ item: string } | { fruit: Owoc; n: number })[] | null; skills: Record<string, number> | null;
}
interface DbMission { id: string; data: Misja; active: boolean; created_at: string; updated_at: string }
interface Code {
  id: number; code: string; mission_id: string; reward: string; max_uses: number | null; uses: number; active: boolean;
  note: string | null; created_at: string; who: { name: string; at: string }[];
}
interface Overview { players: Player[]; missions: DbMission[]; codes: Code[]; deaths: number }

const WROGOWIE: Record<RodzajWroga, string> = { glut: 'Glut (3 życia)', wielki_glut: 'Wielki glut (18 życia)', bandyta: 'Bandyta (6 życia, szybki)', smok: 'Smok' };
const TYPY = { pokonaj: 'Pokonaj wrogów', idz: 'Dojdź do miejsca', brak: 'Samo miejsce (np. partner z tajnym hasłem)' } as const;

let key = '';
try {
  key = sessionStorage.getItem('erpeg-admin') ?? '';
} catch {
  // private mode
}
let data: Overview | null = null;
let city: CityMap | null = null;
let tab = 'summary';
const app = document.getElementById('app')!;

// ------------------------------------------------------------------ helpers

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, children: (Node | string | null | false)[] = []) {
  const e = Object.assign(document.createElement(tag), props);
  for (const c of children) if (c) e.append(c);
  return e;
}
const btn = (text: string, onclick: () => void, cls = 'b') => el('button', { type: 'button', className: cls, onclick }, [text]);
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const km = (m: number | undefined) => ((m ?? 0) / 1000).toFixed(2);
const sum = (o: Record<string, number> | undefined) => Object.values(o ?? {}).reduce((a, b) => a + b, 0);
const itemName = (id: string | null | undefined) => (id ? PRZEDMIOTY.find((p) => p.id === id)?.nazwa ?? id : '—');
const allMissions = (): { id: string; m: Misja; fromCode: boolean; active: boolean }[] => [
  ...MISJE.map((m) => ({ id: m.id, m, fromCode: true, active: true })),
  ...(data?.missions ?? []).map((d) => ({ id: d.id, m: { ...d.data, id: d.id }, fromCode: false, active: d.active })),
];

function skillLevel(points: number) {
  let l = 1;
  let need = 0;
  while (l < MAKS_POZIOM) {
    need += Math.round(PIERWSZY_POZIOM * MNOZNIK_POZIOMU ** (l - 1));
    if (points < need) break;
    l++;
  }
  return l;
}

async function call<T>(fn: string, args: Record<string, unknown>) {
  return rpc<T>(fn, { p_key: key, ...args });
}

async function reload() {
  data = await call<Overview>('admin_overview', {});
}

// ------------------------------------------------------------------ screens

function loginScreen(error = '') {
  const pass = el('input', { type: 'password', placeholder: 'hasło admina', autocomplete: 'current-password', name: 'password' });
  const msg = el('p', { className: 'msg bad' }, [error]);
  const form = el('form', { className: 'card', id: 'login' }, [
    el('h2', {}, ['🔐 Panel admina Erpeg']),
    el('input', { type: 'text', name: 'username', value: 'admin', autocomplete: 'username', hidden: true }),
    el('label', { className: 'f' }, [el('span', {}, ['Hasło']), pass]),
    msg,
    el('button', { type: 'submit', className: 'b p' }, ['Wejdź']),
  ]);
  form.onsubmit = async (e) => {
    e.preventDefault();
    key = pass.value;
    msg.textContent = 'Sprawdzam…';
    try {
      await reload();
      try {
        sessionStorage.setItem('erpeg-admin', key);
      } catch {
        // private mode
      }
      render();
    } catch (err) {
      msg.textContent = (err as Error).message;
    }
  };
  app.replaceChildren(form);
  pass.focus();
}

function render() {
  const tabs: [string, string][] = [['summary', '📊 Podsumowanie'], ['players', '🧍 Postacie'], ['missions', '📜 Misje'], ['codes', '🤫 Tajne hasła'], ['errors', '🐞 Błędy'], ['settings', '⚙ Ustawienia']];
  const header = el('header', {}, [
    el('h1', {}, ['ERPEG admin']),
    ...tabs.map(([id, label]) => btn(label, () => {
      tab = id;
      render();
    }, `tab${tab === id ? ' on' : ''}`)),
    btn('↻ Odśwież', async () => {
      await reload();
      render();
    }),
  ]);
  const main = el('main');
  app.replaceChildren(header, main);
  if (!data) return;
  if (tab === 'summary') summary(main);
  else if (tab === 'players') players(main);
  else if (tab === 'missions') missions(main);
  else if (tab === 'codes') codes(main);
  else if (tab === 'errors') void errorsTab(main);
  else settings(main);
}

function summary(main: HTMLElement) {
  const ps = data!.players;
  const st = (f: (p: Player) => number) => ps.reduce((a, p) => a + f(p), 0);
  const tiles: [string, string | number][] = [
    ['postaci', ps.length],
    ['żyje', ps.filter((p) => !p.dead).length],
    ['gra teraz', ps.filter((p) => p.online).length],
    ['zgonów razem', data!.deaths],
    ['km przebytych', km(st((p) => p.stats?.m ?? 0))],
    ['pokonanych wrogów', st((p) => sum(p.stats?.kills))],
    ['monet zarobionych', st((p) => p.stats?.earned ?? 0)],
    ['monet wydanych', st((p) => p.stats?.spent ?? 0)],
    ['owoców zebranych', st((p) => p.stats?.fruit ?? 0)],
    ['misji wykonanych', st((p) => p.stats?.missions ?? 0)],
    ['zagadek rozwiązanych', st((p) => p.stats?.riddles ?? 0)],
    ['tajnych haseł użytych', data!.codes.reduce((a, c) => a + c.uses, 0)],
    ['nowych w 7 dni', ps.filter((p) => Date.now() - Date.parse(p.created_at) < 7 * 864e5).length],
  ];
  main.append(
    el('h2', {}, ['Podsumowanie']),
    el('div', { className: 'tiles' }, tiles.map(([label, v]) => el('div', { className: 'tile' }, [el('b', {}, [String(v)]), el('span', {}, [label])]))),
    el('p', { className: 'muted' }, ['Statystyki (km, wrogowie, monety) liczą się od tej wersji gry i zapisują przy każdym zapisie gry i przy śmierci.']),
  );
}

let sortKey = 'created';
let sortDir = -1;
function players(main: HTMLElement) {
  const cols: [string, string, (p: Player) => string | number, boolean?][] = [
    ['name', 'Imię', (p) => p.name],
    ['state', 'Stan', (p) => (p.dead ? 0 : p.online ? 2 : 1)],
    ['exp', 'EXP', (p) => p.exp, true],
    ['coins', 'Monety', (p) => p.coins ?? 0, true],
    ['km', 'km', (p) => p.stats?.m ?? 0, true],
    ['kills', 'Pokonani', (p) => sum(p.stats?.kills), true],
    ['earned', 'Zarobił', (p) => p.stats?.earned ?? 0, true],
    ['spent', 'Wydał', (p) => p.stats?.spent ?? 0, true],
    ['missions', 'Misje', (p) => p.stats?.missions ?? 0, true],
    ['created', 'Utworzona', (p) => p.created_at],
    ['seen', 'Ostatnio', (p) => p.last_seen ?? ''],
  ];
  const col = cols.find((c) => c[0] === sortKey) ?? cols[0];
  const list = [...data!.players].sort((a, b) => {
    const x = col[2](a);
    const y = col[2](b);
    return (x < y ? -1 : x > y ? 1 : 0) * sortDir;
  });
  const detail = el('div');
  const shown = (p: Player, k: string) => {
    if (k === 'state') return p.dead ? '💀 nie żyje' : p.online ? '🟢 gra' : 'żyje';
    if (k === 'km') return km(p.stats?.m);
    if (k === 'created') return date(p.created_at);
    if (k === 'seen') return date(p.last_seen);
    return String(cols.find((c) => c[0] === k)![2](p));
  };
  const table = el('table', {}, [
    el('thead', {}, [el('tr', {}, cols.map(([k, label, , num]) => el('th', {
      className: num ? 'num' : '',
      onclick: () => {
        sortDir = sortKey === k ? -sortDir : num ? -1 : 1;
        sortKey = k;
        render();
      },
    }, [label + (sortKey === k ? (sortDir > 0 ? ' ▲' : ' ▼') : '')])))]),
    el('tbody', {}, list.map((p) => el('tr', { className: 'click', onclick: () => detail.replaceChildren(playerCard(p)) },
      cols.map(([k, , , num]) => el('td', { className: num ? 'num' : '' }, [shown(p, k)]))))),
  ]);
  main.append(el('h2', {}, [`Postacie (${list.length})`]), el('p', { className: 'muted' }, ['Kliknij postać, żeby zobaczyć szczegóły. Kliknij nagłówek, żeby sortować.']), detail, el('div', { className: 'scroll' }, [table]));
}

function playerCard(p: Player) {
  const kills = Object.entries(p.stats?.kills ?? {}).map(([k, n]) => `${WROGOWIE[k as RodzajWroga]?.split(' (')[0] ?? k}: ${n}`).join(', ') || '—';
  const skills = Object.entries(p.skills ?? {}).map(([k, v]) => `${UMIEJETNOSCI[k as Umiejetnosc]?.nazwa ?? k}: poz. ${skillLevel(v)} (${v} pkt)`).join(', ') || '—';
  const bag = (p.bag ?? []).map((s) => ('item' in s ? itemName(s.item) : `${OWOCE[s.fruit]?.mnoga ?? s.fruit} ×${s.n}`)).join(', ') || 'pusty';
  const done = Object.entries(p.missions ?? {}).filter(([, v]) => v === 'done').length;
  const rows: [string, string][] = [
    ['Stan', p.dead ? `💀 zginął ${date(p.died_at)} (${p.death_place ?? '?'})` : p.online ? '🟢 gra teraz' : 'żyje'],
    ['Wskrzeszenia', String(p.resurrections)],
    ['Poziom trudności', p.age != null ? `${TRUDNOSCI[trudnoscZWieku(p.age)].nazwa} (zagadki jak dla ${p.age} lat)` : '—'],
    ['Punkt startowy (domek)', p.start_place ?? '—'],
    ['EXP / monety', `${p.exp} EXP · ${p.coins ?? 0} monet`],
    ['Przebył', `${km(p.stats?.m)} km`],
    ['Pokonał', kills],
    ['Monety', `zarobił ${p.stats?.earned ?? 0}, wydał ${p.stats?.spent ?? 0}`],
    ['Owoce / hasła', `${p.stats?.fruit ?? 0} owoców · ${p.stats?.codes ?? 0} tajnych haseł`],
    ['Misje', `${done} ukończonych (${p.stats?.missions ?? 0} nagród)`],
    ['Założone', Object.entries(p.equip ?? {}).filter(([, v]) => v).map(([, v]) => itemName(v)).join(', ') || '—'],
    ['Plecak', bag],
    ['Skrzynia w domku', `${p.chest?.coins ?? 0} monet · ${(p.chest?.slots ?? []).filter(Boolean).map((s) => ('item' in s! ? itemName(s!.item) : `${OWOCE[s!.fruit]?.mnoga ?? s!.fruit} ×${s!.n}`)).join(', ') || 'pusta'}`],
    ['Zagadki', `${p.stats?.riddles ?? 0} rozwiązanych`],
    ['Umiejętności', skills + (p.magic ? ' · zna magię' : '')],
    ['Utworzona', date(p.created_at) + (p.old ? ' (stary IDIK – jeszcze nie przeszła na nowy kod)' : '')],
  ];
  return el('div', { className: 'card' }, [
    el('h3', {}, [p.name]),
    el('table', {}, rows.map(([a, b]) => el('tr', {}, [el('td', { className: 'muted' }, [a]), el('td', { style: 'white-space: normal' }, [b])]))),
  ]);
}

function missionCounts(id: string) {
  let taken = 0;
  let done = 0;
  for (const p of data!.players) {
    const st = p.missions?.[id];
    if (st && st !== 'new') taken++;
    if (st === 'done') done++;
  }
  return { taken, done };
}

function missions(main: HTMLElement) {
  const editor = el('div');
  const rows = allMissions().map(({ id, m, fromCode, active }) => {
    const c = missionCounts(id);
    const found = city?.findBuilding(m.adres);
    const nCodes = data!.codes.filter((k) => k.mission_id === id).length;
    return el('tr', { className: fromCode ? '' : 'click', onclick: fromCode ? undefined : () => editor.replaceChildren(missionEditor(id)) }, [
      el('td', {}, [m.tytul, ' ', fromCode ? el('span', { className: 'badge' }, ['w kodzie gry']) : null, !active ? el('span', { className: 'badge bad' }, ['wyłączona']) : null]),
      el('td', {}, [el('span', { className: found ? 'ok' : 'bad' }, [found ? '✓ ' : '✗ ']), m.adres]),
      el('td', {}, [(TYPY as Record<string, string>)[m.zadanie.typ] ?? (m.zadanie.typ === 'zbierz' ? 'Przynieś rzeczy' : m.zadanie.typ)]),
      el('td', { className: 'num' }, [m.zadanie.typ === 'brak' ? '—' : String(c.taken)]),
      el('td', { className: 'num' }, [m.zadanie.typ === 'brak' ? '—' : String(c.done)]),
      el('td', { className: 'num' }, [String(nCodes)]),
    ]);
  });
  main.append(
    el('h2', {}, ['Misje']),
    el('div', { className: 'row' }, [btn('+ Nowa misja / nowe miejsce', () => editor.replaceChildren(missionEditor(null)), 'b p')]),
    editor,
    el('div', { className: 'scroll', style: 'margin-top: 12px' }, [el('table', {}, [
      el('thead', {}, [el('tr', {}, ['Tytuł', 'Adres (✓ = jest na mapie)', 'Rodzaj', 'Przyjęło', 'Ukończyło', 'Hasła'].map((h, i) => el('th', { className: i >= 3 ? 'num' : '' }, [h])))]),
      el('tbody', {}, rows),
    ])]),
    el('p', { className: 'muted' }, ['Misje „w kodzie gry” są w pliku fabula.ts (zmienia je Claude). Resztę możesz tu dodawać i zmieniać – gracze zobaczą je po następnym wczytaniu postaci.']),
  );
}

function missionEditor(id: string | null) {
  const existing = id ? data!.missions.find((d) => d.id === id) : undefined;
  const m: Misja = existing ? { ...existing.data } : {
    id: '', adres: '', tytul: '', opis: '', zakonczenie: '', nagroda: 50,
    zadanie: { typ: 'pokonaj', miejsce: '', ile: 3, wrog: 'glut', cel: '' },
  };
  const z = m.zadanie;
  const inp = (value: string | number, props: Record<string, unknown> = {}) => el('input', { value: String(value ?? ''), ...props });
  const f = {
    tytul: inp(m.tytul, { placeholder: 'np. Klocki w opałach' }),
    adres: inp(m.adres, { placeholder: 'np. Narutowicza 5' }),
    typ: el('select', {}, Object.entries(TYPY).map(([k, v]) => el('option', { value: k, selected: z.typ === k }, [v]))),
    miejsce: inp(typeof z.miejsce === 'string' ? z.miejsce : '', { placeholder: 'np. Bramowa 1' }),
    ile: inp(z.ile ?? 3, { type: 'number', min: 1, max: 30 }),
    wrog: el('select', {}, Object.entries(WROGOWIE).map(([k, v]) => el('option', { value: k, selected: z.wrog === k }, [v]))),
    cel: inp(z.cel ?? '', { placeholder: 'krótko, np. Pokonaj gluty przy Bramie' }),
    szukaj: el('input', { type: 'checkbox', checked: !!z.szukaj }),
    opis: el('textarea', { value: m.opis, placeholder: 'Co mówi zleceniodawca po wejściu' }),
    zakonczenie: el('textarea', { value: m.zakonczenie, placeholder: 'Co mówi po wykonaniu zadania' }),
    nagroda: inp(m.nagroda, { type: 'number', min: 0 }),
    exp: inp(m.doswiadczenie ?? '', { type: 'number', min: 0, placeholder: 'puste = tyle co monet' }),
    przedmiot: el('select', {}, [el('option', { value: '' }, ['— bez przedmiotu —']), ...PRZEDMIOTY.filter((p) => p.id !== 'kijek').map((p) => el('option', { value: p.id, selected: m.przedmiot === p.id }, [`${p.efekt ? '✨ ' : ''}${p.nazwa}`]))]),
    active: el('input', { type: 'checkbox', checked: existing ? existing.active : true }),
  };
  const field = (label: string, input: HTMLElement, note?: string) => el('label', { className: 'f' }, [el('span', {}, [label]), input, note ? el('small', { className: 'muted' }, [note]) : null]);
  const taskFields = el('div', {}, [
    field('Miejsce zadania (adres)', f.miejsce, 'Gdzie są wrogowie albo dokąd trzeba dojść.'),
    el('div', { className: 'row' }, [field('Ilu wrogów', f.ile), field('Jaki wróg', f.wrog)]),
    field('Cel (pokazywany na ekranie)', f.cel),
    el('label', { className: 'row' }, [f.szukaj, 'Trzeba szukać (strzałka pokazuje tylko okolicę)']),
    field('Co mówi po wykonaniu', f.zakonczenie),
    el('div', { className: 'row' }, [field('Nagroda (monety)', f.nagroda), field('EXP', f.exp), field('Przedmiot w nagrodę', f.przedmiot)]),
  ]);
  const preview = el('div');
  const msg = el('p', { className: 'msg' });

  const read = (): Misja => {
    const typ = f.typ.value as Misja['zadanie']['typ'];
    const out: Misja = {
      id: id ?? '', tytul: f.tytul.value.trim(), adres: f.adres.value.trim(), opis: f.opis.value.trim(),
      zakonczenie: f.zakonczenie.value.trim(), nagroda: Math.max(0, Number(f.nagroda.value) || 0),
      zadanie: typ === 'brak'
        ? { typ, miejsce: f.adres.value.trim(), cel: '' }
        : {
            typ, miejsce: f.miejsce.value.trim(), cel: f.cel.value.trim() || (typ === 'idz' ? `Idź pod ${f.miejsce.value.trim()}` : `Pokonaj wrogów przy ${f.miejsce.value.trim()}`),
            ...(typ === 'pokonaj' ? { ile: Math.max(1, Number(f.ile.value) || 1), wrog: f.wrog.value as RodzajWroga } : {}),
            ...(f.szukaj.checked ? { szukaj: true } : {}),
          },
    };
    if (typ !== 'brak') {
      if (f.exp.value !== '') out.doswiadczenie = Math.max(0, Number(f.exp.value) || 0);
      if (f.przedmiot.value) out.przedmiot = f.przedmiot.value;
    } else out.nagroda = 0;
    return out;
  };
  const update = () => {
    const typ = f.typ.value;
    taskFields.style.display = typ === 'brak' ? 'none' : '';
    f.ile.parentElement!.style.display = f.wrog.parentElement!.style.display = typ === 'pokonaj' ? '' : 'none';
    preview.replaceChildren(missionPreview(read()));
  };
  for (const e of Object.values(f)) e.addEventListener('input', update);
  f.typ.addEventListener('change', update);

  const save = btn('💾 Zapisz', async () => {
    const mm = read();
    if (!mm.tytul || !mm.adres) {
      msg.className = 'msg bad';
      msg.textContent = 'Podaj tytuł i adres.';
      return;
    }
    if (city && !city.findBuilding(mm.adres) && !confirm(`Nie znalazłem na mapie adresu „${mm.adres}”. Zapisać mimo to?`)) return;
    save.disabled = true;
    try {
      const { id: _id, ...body } = mm;
      void _id;
      const r = await call<{ id: string }>('admin_save_mission', { p_id: id, p_data: body, p_active: f.active.checked });
      await reload();
      render();
      tab = 'missions';
      document.querySelector('main')!.prepend(el('p', { className: 'ok' }, [`Zapisano misję (${r.id}). Gracze zobaczą ją po wczytaniu postaci.`]));
    } catch (e) {
      msg.className = 'msg bad';
      msg.textContent = (e as Error).message;
      save.disabled = false;
    }
  }, 'b p');

  const card = el('div', { className: 'card' }, [
    el('h3', {}, [existing ? `Edycja: ${m.tytul}` : 'Nowa misja / miejsce']),
    el('div', { className: 'grid2' }, [
      el('div', {}, [
        field('Tytuł', f.tytul),
        field('Adres budynku (tu się ją dostaje)', f.adres, 'Jak na tabliczce: „Ulica numer”. Znaczek ✓/✗ w podglądzie mówi, czy jest na mapie.'),
        field('Rodzaj', f.typ),
        field('Co mówi zleceniodawca', f.opis),
        taskFields,
        el('label', { className: 'row' }, [f.active, 'Włączona (widoczna w grze)']),
        msg,
        el('div', { className: 'row' }, [save, btn('Anuluj', () => card.remove())]),
      ]),
      el('div', {}, [el('h3', {}, ['Podgląd']), preview]),
    ]),
  ]);
  update();
  return card;
}

/** What the player will see: the dialog and where things are on the map. */
function missionPreview(m: Misja) {
  const door = city?.findBuilding(m.adres);
  const target = m.zadanie.typ === 'brak' || typeof m.zadanie.miejsce !== 'string' ? undefined : city?.findBuilding(m.zadanie.miejsce);
  const reward = `Nagroda: ${m.nagroda} monet${m.przedmiot ? ` + ${itemName(m.przedmiot)}` : ''}.`;
  const dialog = el('div', { className: 'dialog' }, [
    el('div', { className: 't' }, [m.tytul || '(tytuł)']),
    m.zadanie.typ === 'brak' ? (m.opis || '(opis)') : `${m.opis || '(opis)'}\n\n${reward}`,
    el('div', { className: 'btns' }, m.zadanie.typ === 'brak' ? [el('div', {}, ['🤫 Psst, mam tajemne hasło']), el('div', {}, ['Do widzenia'])] : [el('div', {}, ['Przyjmuję']), el('div', {}, ['Nie teraz'])]),
  ]);
  const out = el('div', {}, [
    dialog,
    el('p', {}, [
      el('span', { className: door ? 'ok' : 'bad' }, [door ? `✓ ${m.adres} jest na mapie` : `✗ nie ma na mapie: ${m.adres || '(adres)'}`]),
      m.zadanie.typ !== 'brak' ? el('br') : null,
      m.zadanie.typ !== 'brak' ? el('span', { className: target ? 'ok' : 'bad' }, [target ? `✓ cel: ${m.zadanie.miejsce}` : `✗ nie ma na mapie celu: ${m.zadanie.miejsce || '(miejsce)'}`]) : null,
    ]),
  ]);
  if (city && door) {
    const a = city.entranceOf(door);
    const b = target ? city.entranceOf(target) : a;
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const R = Math.max(80 * PX_PER_M, Math.hypot(a.x - b.x, a.y - b.y) / 2 + 40 * PX_PER_M);
    const canvas = el('canvas', { className: 'map', width: 600, height: 600 });
    drawCity(canvas, city, { x0: cx - R, y0: cy - R, x1: cx + R, y1: cy + R });
    const ctx = canvas.getContext('2d')!;
    const s = canvas.width / (2 * R);
    const dot = (p: { x: number; y: number }, color: string, glyph: string) => {
      const x = (p.x - (cx - R)) * s;
      const y = (p.y - (cy - R)) * s;
      ctx.fillStyle = '#1e1a24';
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e1a24';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(glyph, x, y + 1);
    };
    if (target) dot(b, '#ff4b4b', m.zadanie.typ === 'idz' ? '⚑' : '⚔');
    dot(a, '#f7c531', '!');
    out.append(canvas, el('div', { className: 'legend' }, ['🟡 wejście (tu się dostaje misję)', target ? '  🔴 cel zadania' : '']));
  } else if (!city) out.append(el('p', { className: 'muted' }, ['Wczytuję mapę…']));
  return out;
}

function randomCode() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const v = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(v, (x) => a[x % a.length]).join('');
}

function codes(main: HTMLElement) {
  const places = allMissions();
  const placeName = (id: string) => places.find((p) => p.id === id)?.m.tytul ?? id;
  const editor = el('div');
  const rows = data!.codes.map((c) => el('tr', { className: 'click', onclick: () => editor.replaceChildren(codeEditor(c)) }, [
    el('td', {}, [el('b', {}, [c.code]), c.active ? null : el('span', { className: 'badge bad' }, [' wyłączone'])]),
    el('td', {}, [placeName(c.mission_id)]),
    el('td', {}, [itemName(c.reward)]),
    el('td', { className: 'num' }, [`${c.uses}${c.max_uses != null ? ` / ${c.max_uses}` : ''}`]),
    el('td', {}, [c.who.map((w) => w.name).join(', ') || '—']),
    el('td', { className: 'muted' }, [c.note ?? '']),
  ]));
  main.append(
    el('h2', {}, ['Tajne hasła']),
    el('p', { className: 'muted' }, ['Hasło działa tylko w przypisanym miejscu (misji): gracz wchodzi tam i wybiera „🤫 Psst, mam tajemne hasło”. Każda postać może użyć danego hasła raz. Najpierw dodaj miejsce w zakładce Misje (rodzaj „Samo miejsce”), potem tu hasło.']),
    el('div', { className: 'row' }, [btn('+ Nowe hasło', () => editor.replaceChildren(codeEditor(null)), 'b p')]),
    editor,
    el('div', { className: 'scroll', style: 'margin-top: 12px' }, [el('table', {}, [
      el('thead', {}, [el('tr', {}, ['Hasło', 'Miejsce', 'Nagroda', 'Użyte', 'Kto', 'Notatka'].map((h, i) => el('th', { className: i === 3 ? 'num' : '' }, [h])))]),
      el('tbody', {}, rows.length ? rows : [el('tr', {}, [el('td', { colSpan: 6, className: 'muted' }, ['Jeszcze nie ma haseł.'])])]),
    ])]),
  );
}

function codeEditor(c: Code | null) {
  const code = el('input', { value: c?.code ?? randomCode(), className: 'upper', style: 'text-transform: uppercase; letter-spacing: 2px' });
  const place = el('select', {}, allMissions().map((p) => el('option', { value: p.id, selected: c?.mission_id === p.id }, [`${p.m.tytul} – ${p.m.adres}`])));
  const reward = el('select', {}, PRZEDMIOTY.filter((p) => p.id !== 'kijek').map((p) =>
    el('option', { value: p.id, selected: c ? c.reward === p.id : p.id === 'swietlisty' }, [`${p.efekt ? '✨ ' : ''}${p.nazwa}${p.opis ? ` – ${p.opis}` : ''}`])));
  const max = el('input', { type: 'number', min: 1, value: c?.max_uses ?? '', placeholder: 'bez limitu' });
  const note = el('input', { value: c?.note ?? '', placeholder: 'np. ulotki w Bricks 4 Kidz, 100 szt.' });
  const active = el('input', { type: 'checkbox', checked: c ? c.active : true });
  const msg = el('p', { className: 'msg bad' });
  const field = (label: string, input: HTMLElement) => el('label', { className: 'f' }, [el('span', {}, [label]), input]);
  const save = btn('💾 Zapisz', async () => {
    save.disabled = true;
    try {
      await call('admin_save_code', {
        p_id: c?.id ?? null, p_code: code.value, p_mission_id: place.value, p_reward: reward.value,
        p_max_uses: max.value ? Number(max.value) : null, p_active: active.checked, p_note: note.value.trim() || null,
      });
      await reload();
      render();
    } catch (e) {
      msg.textContent = (e as Error).message;
      save.disabled = false;
    }
  }, 'b p');
  const card = el('div', { className: 'card' }, [
    el('h3', {}, [c ? `Hasło ${c.code}` : 'Nowe hasło']),
    el('div', { className: 'grid2' }, [
      el('div', {}, [
        field('Hasło (to, co na ulotce)', el('div', { className: 'row' }, [code, btn('🎲 Losuj', () => (code.value = randomCode()))])),
        field('Miejsce (gdzie trzeba je powiedzieć)', place),
        field('Nagroda', reward),
      ]),
      el('div', {}, [
        field('Ile razy można użyć (wszyscy gracze razem)', max),
        field('Notatka dla ciebie', note),
        el('label', { className: 'row' }, [active, 'Aktywne']),
        c ? el('p', { className: 'muted' }, [`Użyte ${c.uses} razy${c.who.length ? `: ${c.who.map((w) => `${w.name} (${date(w.at)})`).join(', ')}` : ''}.`]) : null,
      ]),
    ]),
    msg,
    el('div', { className: 'row' }, [save, btn('Anuluj', () => card.remove())]),
  ]);
  return card;
}

interface ClientError { id: number; at: string; player: string | null; kind: string; message: string; stack: string | null; ctx: Record<string, unknown> | null }

/** Errors and freezes reported by players' devices (src/errlog.ts). */
async function errorsTab(main: HTMLElement) {
  main.append(el('h2', {}, ['Błędy z urządzeń graczy']), el('p', { className: 'muted' }, ['Ostatnie 200 zgłoszeń: błędy w grze i zawieszenia („freeze”). Kliknij wiersz, żeby zobaczyć szczegóły.']));
  let list: ClientError[];
  try {
    list = await call<ClientError[]>('admin_errors', {});
  } catch (e) {
    main.append(el('p', { className: 'bad' }, [(e as Error).message]));
    return;
  }
  if (!list.length) {
    main.append(el('p', {}, ['Brak zgłoszeń. 🎉']));
    return;
  }
  const detail = el('pre', { className: 'card', style: 'white-space: pre-wrap; display: none' });
  const rows = list.map((e) => {
    const c = e.ctx ?? {};
    return el('tr', { className: 'click', onclick: () => {
      detail.style.display = 'block';
      detail.textContent = `${e.at}\n${e.player ?? '(bez postaci)'} – ${e.kind}\n${e.message}\n\n${JSON.stringify(c, null, 1)}\n\n${e.stack ?? ''}`;
      detail.scrollIntoView({ behavior: 'smooth' });
    } }, [
      el('td', {}, [new Date(e.at).toLocaleString('pl-PL')]),
      el('td', {}, [e.player ?? '—']),
      el('td', {}, [el('span', { className: e.kind === 'freeze' ? 'badge bad' : 'badge' }, [e.kind])]),
      el('td', {}, [e.message.slice(0, 120)]),
      el('td', {}, [`${c.map ?? ''} ${c.x ?? ''},${c.y ?? ''}`]),
    ]);
  });
  const table = el('table', {}, [el('thead', {}, [el('tr', {}, ['Kiedy', 'Postać', 'Rodzaj', 'Opis', 'Mapa, miejsce'].map((h) => el('th', {}, [h])))]), el('tbody', {}, rows)]);
  main.append(detail, el('div', { className: 'scroll' }, [table]));
}

function settings(main: HTMLElement) {
  const a = el('input', { type: 'password', autocomplete: 'new-password' });
  const b = el('input', { type: 'password', autocomplete: 'new-password' });
  const msg = el('p', { className: 'msg' });
  main.append(el('h2', {}, ['Ustawienia']), el('div', { className: 'card', style: 'max-width: 420px' }, [
    el('h3', {}, ['Zmień hasło admina']),
    el('label', { className: 'f' }, [el('span', {}, ['Nowe hasło (co najmniej 10 znaków)']), a]),
    el('label', { className: 'f' }, [el('span', {}, ['Powtórz']), b]),
    msg,
    btn('Zmień', async () => {
      msg.className = 'msg bad';
      if (a.value !== b.value) return void (msg.textContent = 'Hasła się różnią.');
      try {
        await call('admin_set_key', { p_new: a.value });
        key = a.value;
        try {
          sessionStorage.setItem('erpeg-admin', key);
        } catch {
          // private mode
        }
        msg.className = 'msg ok';
        msg.textContent = 'Hasło zmienione.';
      } catch (e) {
        msg.textContent = (e as Error).message;
      }
    }, 'b p'),
  ]), btn('Wyloguj', () => {
    key = '';
    try {
      sessionStorage.removeItem('erpeg-admin');
    } catch {
      // private mode
    }
    loginScreen();
  }));
}

// ------------------------------------------------------------------ start

CityMap.load('map/lublin.json').then((c) => {
  city = c;
  if (data && tab === 'missions') render();
}).catch(() => {});

if (key) {
  reload().then(render).catch((e: Error) => loginScreen(e.message));
} else loginScreen();
