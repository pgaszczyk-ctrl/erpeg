import { rpc } from '../api';
import { CityMap } from '../map/CityMap';
import { drawCity } from '../map/drawCity';
import { MISJE, type Misja, type RodzajWroga } from '../content/fabula';
import { PRZEDMIOTY, UMIEJETNOSCI, kosztPoziomu, MAKS_POZIOM, type Umiejetnosc } from '../content/przedmioty';
import { normalizeSlot, goodsLabel } from '../inventory';
import { TRUDNOSCI, trudnoscZWieku } from '../content/trudnosc';
import { PX_PER_M } from '../map/CityMap';
import { POLECENIE_GEMINI, SCHEMAT_QUIZOW, sprawdzQuizy, krajPytania } from '../content/quizyGemini';
import { POKRETLA } from '../content/ustawienia';

// The admin panel (admin.html): characters and their statistics, missions
// (with a preview on the map) and secret codes for real places. Every call
// carries the admin password; the server checks it.

interface Player {
  name: string; exp: number; dead: boolean; age?: number;
  chest?: { slots: unknown[]; coins: number } | null; died_at: string | null; death_place: string | null; resurrections: number;
  created_at: string; last_seen: string | null; online: boolean; start_place: string | null; old: boolean;
  coins: number | null; missions: Record<string, string> | null; magic: boolean | null;
  stats: { m?: number; kills?: Record<string, number>; earned?: number; spent?: number; fruit?: number; missions?: number; codes?: number; riddles?: number } | null;
  equip: Record<string, string | null> | null; bag: unknown[] | null; skills: Record<string, number> | null;
}
interface DbMission { id: string; data: Misja; active: boolean; created_at: string; updated_at: string }
interface Code {
  id: number; code: string; mission_id: string; reward: string; max_uses: number | null; uses: number; active: boolean;
  note: string | null; created_at: string; who: { name: string; at: string }[];
}
interface Overview { players: Player[]; missions: DbMission[]; codes: Code[]; deaths: number }

const WROGOWIE: Record<RodzajWroga, string> = { glut: 'Chochlik (10 życia)', wielki_glut: 'Wielki chochlik (60 życia)', bandyta: 'Bandyta (20 życia, szybki)', driada: 'Driada (10 życia)', zombie: 'Zombiak (13 życia)', szkielet: 'Szkielet (10 życia)', smok: 'Smok', wojownik: 'Wojownik (pojedynek)', herszt: 'Herszt gangu (45 życia)', wielki_herszt: 'Wielki herszt (120 życia)', blob: 'Wodny blob (5 życia)', wodnik: 'Wodnik (30 życia, przywołuje bloby)' };
const TYPY = { pokonaj: 'Pokonaj wrogów', idz: 'Dojdź do miejsca', zagadka: 'Zagadka (pytanie na miejscu)', brak: 'Samo miejsce (np. partner z tajnym hasłem)' } as const;

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
/** Where an address is on the map: a building's door, or a spot typed as "51.2468, 22.5684" (e.g. a platform). */
function spotOf(addr: unknown): { x: number; y: number } | null {
  if (!city || typeof addr !== 'string') return null;
  const g = /^\s*(-?\d{1,2}\.\d+)\s*[,;]\s*(-?\d{1,3}\.\d+)\s*$/.exec(addr);
  if (g) return city.fromLatLon(+g[1], +g[2]);
  const b = city.findBuilding(addr);
  return b ? city.entranceOf(b) : null;
}

const allMissions = (): { id: string; m: Misja; fromCode: boolean; active: boolean }[] => [
  ...MISJE.map((m) => ({ id: m.id, m, fromCode: true, active: true })),
  ...(data?.missions ?? []).map((d) => ({ id: d.id, m: { ...d.data, id: d.id }, fromCode: false, active: d.active })),
];

function skillLevel(points: number) {
  let l = 1;
  let need = 0;
  while (l < MAKS_POZIOM) {
    need += kosztPoziomu(l + 1);
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
    el('h2', {}, ['🔐 Panel admina Exp-lore']),
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
  const tabs: [string, string][] = [['summary', '📊 Podsumowanie'], ['players', '🧍 Postacie'], ['missions', '📜 Misje'], ['codes', '🤫 Tajne hasła'], ['bugs', '🪲 Zgłoszenia'], ['errors', '🐞 Błędy'], ['quizzes', '🧠 Quizy'], ['settings', '⚙ Ustawienia']];
  const header = el('header', {}, [
    el('h1', {}, ['EXP-LORE admin']),
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
  else if (tab === 'bugs') void bugsTab(main);
  else if (tab === 'quizzes') quizzesTab(main);
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
  const slotText = (raw: unknown) => {
    const s = normalizeSlot(raw);
    return !s ? '' : 'item' in s ? itemName(s.item) : 'esencja' in s ? `esencja ${s.esencja}` : goodsLabel(s);
  };
  const bag = (p.bag ?? []).map(slotText).filter(Boolean).join(', ') || 'pusty';
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
    ['Skrzynia w domku', `${p.chest?.coins ?? 0} monet · ${(p.chest?.slots ?? []).filter(Boolean).map(slotText).filter(Boolean).join(', ') || 'pusta'}`],
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
    const found = spotOf(m.adres);
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
    cel: inp(z.cel ?? '', { placeholder: 'krótko, np. Pokonaj chochliki przy Bramie' }),
    szukaj: el('input', { type: 'checkbox', checked: !!z.szukaj }),
    opis: el('textarea', { value: m.opis, placeholder: 'Co mówi zleceniodawca po wejściu' }),
    zakonczenie: el('textarea', { value: m.zakonczenie, placeholder: 'Co mówi po wykonaniu zadania' }),
    nagroda: inp(m.nagroda, { type: 'number', min: 0 }),
    exp: inp(m.doswiadczenie ?? '', { type: 'number', min: 0, placeholder: 'puste = tyle co monet' }),
    przedmiot: el('select', {}, [el('option', { value: '' }, ['— bez przedmiotu —']), ...PRZEDMIOTY.filter((p) => p.id !== 'kijek').map((p) => el('option', { value: p.id, selected: m.przedmiot === p.id }, [`${p.efekt ? '✨ ' : ''}${p.nazwa}`]))]),
    active: el('input', { type: 'checkbox', checked: existing ? existing.active : true }),
    // Mission chains (owner's „Serce Zębatka”, 6 Oct 2026).
    seria: inp(m.seria ?? '', { placeholder: 'np. Serce Zębatka (puste = zwykła misja)' }),
    naMiejscu: el('input', { type: 'checkbox', checked: !!m.naMiejscu }),
    diamenty: inp(m.diamenty ?? 0, { type: 'number', min: 0, max: 10 }),
    tylkoTest: el('input', { type: 'checkbox', checked: !!m.tylkoTest }),
    wPoziom: el('input', { type: 'checkbox', checked: !!m.wymaga?.poziom }),
    poziom: inp(m.wymaga?.poziom ?? 2, { type: 'number', min: 1, max: 20 }),
    wMisje: el('input', { type: 'checkbox', checked: !!m.wymaga?.misje?.length }),
    misje: el('select', { multiple: true, size: 6 }, allMissions().filter((x) => x.id !== id).map((x) => el('option', { value: x.id, selected: !!m.wymaga?.misje?.includes(x.id) }, [`${x.m.seria ? `⚙ ${x.m.seria}: ` : ''}${x.m.tytul} (${x.m.adres})`]))),
    wPrzedmiot: el('input', { type: 'checkbox', checked: !!m.wymaga?.przedmiot }),
    wymagany: el('select', {}, PRZEDMIOTY.filter((p) => p.id !== 'kijek').map((p) => el('option', { value: p.id, selected: m.wymaga?.przedmiot === p.id }, [p.nazwa]))),
    zabierz: el('input', { type: 'checkbox', checked: !!m.wymaga?.zabierz }),
    pytanie: el('textarea', { value: z.pytanie ?? '', placeholder: 'np. Co powstaje z wody i ognia w kotle?' }),
    odp0: inp(z.odpowiedzi?.[0] ?? '', { placeholder: 'odpowiedź 1' }),
    odp1: inp(z.odpowiedzi?.[1] ?? '', { placeholder: 'odpowiedź 2' }),
    odp2: inp(z.odpowiedzi?.[2] ?? '', { placeholder: 'odpowiedź 3' }),
    dobra: el('select', {}, [0, 1, 2].map((i) => el('option', { value: String(i), selected: (z.dobra ?? 0) === i }, [`dobra jest odpowiedź ${i + 1}`]))),
    podpowiedz: inp(z.podpowiedz ?? '', { placeholder: 'co powie po złej odpowiedzi' }),
  };
  const field = (label: string, input: HTMLElement, note?: string) => el('label', { className: 'f' }, [el('span', {}, [label]), input, note ? el('small', { className: 'muted' }, [note]) : null]);
  const riddleFields = el('div', { className: 'card' }, [
    field('Pytanie (pada po dojściu na miejsce zadania)', f.pytanie),
    el('div', { className: 'row' }, [f.odp0, f.odp1, f.odp2]),
    el('div', { className: 'row' }, [f.dobra, f.podpowiedz]),
  ]);
  const needs = el('div', { className: 'card' }, [
    el('b', {}, ['Wymagania (misja widoczna dopiero, gdy wszystkie zaznaczone są spełnione)']),
    el('label', { className: 'row' }, [f.wPoziom, 'Poziom postaci od', f.poziom]),
    el('label', { className: 'row' }, [f.wMisje, 'Ukończone misje (Ctrl/⌘ = kilka):']),
    f.misje,
    el('label', { className: 'row' }, [f.wPrzedmiot, 'Przedmiot w plecaku:', f.wymagany, f.zabierz, 'zabierz po przyjęciu']),
  ]);
  const taskFields = el('div', {}, [
    field('Miejsce zadania (adres)', f.miejsce, 'Gdzie są wrogowie albo dokąd trzeba dojść.'),
    el('div', { className: 'row' }, [field('Ilu wrogów', f.ile), field('Jaki wróg', f.wrog)]),
    field('Cel (pokazywany na ekranie)', f.cel),
    el('label', { className: 'row' }, [f.szukaj, 'Trzeba szukać (strzałka pokazuje tylko okolicę)']),
    riddleFields,
    el('label', { className: 'row' }, [f.naMiejscu, 'Zakończ na miejscu (nagroda od razu po wykonaniu, bez powrotu)']),
    field('Co mówi po wykonaniu', f.zakonczenie),
    el('div', { className: 'row' }, [field('Nagroda (monety)', f.nagroda), field('EXP', f.exp), field('Diamenty', f.diamenty), field('Przedmiot w nagrodę', f.przedmiot)]),
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
            ...(typ === 'zagadka' ? {
              pytanie: f.pytanie.value.trim(),
              odpowiedzi: [f.odp0.value.trim(), f.odp1.value.trim(), f.odp2.value.trim()].filter(Boolean),
              dobra: Number(f.dobra.value) || 0,
              ...(f.podpowiedz.value.trim() ? { podpowiedz: f.podpowiedz.value.trim() } : {}),
            } : {}),
            ...(f.szukaj.checked ? { szukaj: true } : {}),
          },
    };
    if (f.seria.value.trim()) out.seria = f.seria.value.trim();
    if (f.tylkoTest.checked) out.tylkoTest = true;
    const wymaga: NonNullable<Misja['wymaga']> = {};
    if (f.wPoziom.checked) wymaga.poziom = Math.max(1, Number(f.poziom.value) || 1);
    const chosen = [...f.misje.selectedOptions].map((o) => o.value);
    if (f.wMisje.checked && chosen.length) wymaga.misje = chosen;
    if (f.wPrzedmiot.checked && f.wymagany.value) {
      wymaga.przedmiot = f.wymagany.value;
      if (f.zabierz.checked) wymaga.zabierz = true;
    }
    if (Object.keys(wymaga).length) out.wymaga = wymaga;
    if (typ !== 'brak') {
      if (f.exp.value !== '') out.doswiadczenie = Math.max(0, Number(f.exp.value) || 0);
      if (f.przedmiot.value) out.przedmiot = f.przedmiot.value;
      if (Number(f.diamenty.value) > 0) out.diamenty = Math.min(10, Math.floor(Number(f.diamenty.value)));
      if (f.naMiejscu.checked) out.naMiejscu = true;
    } else out.nagroda = 0;
    return out;
  };
  const update = () => {
    const typ = f.typ.value;
    taskFields.style.display = typ === 'brak' ? 'none' : '';
    f.ile.parentElement!.style.display = f.wrog.parentElement!.style.display = typ === 'pokonaj' ? '' : 'none';
    riddleFields.style.display = typ === 'zagadka' ? '' : 'none';
    f.szukaj.parentElement!.style.display = typ === 'pokonaj' ? '' : 'none';
    preview.replaceChildren(missionPreview(read()));
  };
  for (const e of Object.values(f)) {
    e.addEventListener('input', update);
    e.addEventListener('change', update);
  }

  const save = btn('💾 Zapisz', async () => {
    const mm = read();
    if (!mm.tytul || !mm.adres) {
      msg.className = 'msg bad';
      msg.textContent = 'Podaj tytuł i adres.';
      return;
    }
    if (city && !spotOf(mm.adres) && !confirm(`Nie znalazłem na mapie adresu „${mm.adres}”. Zapisać mimo to?`)) return;
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
        field('Główna nazwa questa (seria)', f.seria, 'Misje z tą samą nazwą tworzą jedną historię; w dzienniku: „⚙ Seria – część N: tytuł”.'),
        needs,
        field('Rodzaj', f.typ),
        field('Co mówi zleceniodawca', f.opis),
        taskFields,
        el('label', { className: 'row' }, [f.active, 'Włączona (widoczna w grze)']),
        el('label', { className: 'row' }, [f.tylkoTest, 'Tylko serwer testowy (produkcja jej nie widzi)']),
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
  const door = spotOf(m.adres);
  const target = m.zadanie.typ === 'brak' ? null : spotOf(m.zadanie.miejsce);
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
    const a = door;
    const b = target ?? a;
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const R = Math.max(80 * PX_PER_M, Math.hypot(a.x - b.x, a.y - b.y) / 2 + 40 * PX_PER_M);
    const canvas = el('canvas', { className: 'map', width: 600, height: 600 });
    const map = city;
    const paint = () => {
    drawCity(canvas, map, { x0: cx - R, y0: cy - R, x1: cx + R, y1: cy + R });
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
    };
    // The map is loaded in tiles: draw now and again once that part is in.
    paint();
    if (!map.ready({ x0: cx - R, y0: cy - R, x1: cx + R, y1: cy + R })) map.ensure(cx, cy, R).then(paint, () => {});
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
  const shotBox = el('div', { className: 'card', style: 'max-width: 560px' });
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
  main.append(shotBox, detail, el('div', { className: 'scroll' }, [table]));
}

interface BugReport { id: number; at: string; player: string | null; text: string; ctx: Record<string, unknown> | null; log: string[] | null; done: boolean; has_shot?: boolean; decision?: 'nowe' | 'do_poprawki' | 'odrzucone' }

/** The owner's decision on a report: only 'do_poprawki' may be fixed (reports are untrusted player input). */
const DECYZJE: [NonNullable<BugReport['decision']>, string][] = [['nowe', '❔ Nowe'], ['do_poprawki', '✅ Do poprawki'], ['odrzucone', '❌ Odrzucone']];

/** Bugs described by players (game menu → "🐞 Znalazłem buga", src/ui/bug.ts), with where they were and their recent log. */
async function bugsTab(main: HTMLElement) {
  main.append(el('h2', {}, ['Zgłoszenia graczy']), el('p', { className: 'muted' }, ['„Znalazłem buga” z menu gry: opis gracza, miejsce i ostatni log postaci. Kliknij wiersz, żeby zobaczyć szczegóły i zrzut ekranu. W kolumnie „Decyzja” wybierz „✅ Do poprawki” – Claude poprawia tylko takie zgłoszenia (rano przy przeglądzie); ✔ oznacza zgłoszenie jako załatwione.']));
  let list: BugReport[];
  try {
    list = await call<BugReport[]>('admin_bugs', {});
  } catch (e) {
    main.append(el('p', { className: 'bad' }, [(e as Error).message]));
    return;
  }
  if (!list.length) {
    main.append(el('p', {}, ['Brak zgłoszeń. 🎉']));
    return;
  }
  const detail = el('pre', { className: 'card', style: 'white-space: pre-wrap; display: none' });
  const shotBox = el('div', { className: 'card', style: 'max-width: 560px' });
  const rows = list.map((b) => {
    const c = b.ctx ?? {};
    const done = btn(b.done ? '✔' : '○', async () => {
      await call('admin_bug_done', { p_id: b.id, p_done: !b.done });
      b.done = !b.done;
      done.textContent = b.done ? '✔' : '○';
      row.style.opacity = b.done ? '0.5' : '1';
    });
    const decide = el('select', { onchange: async () => {
      const v = decide.value as NonNullable<BugReport['decision']>;
      await call('admin_bug_decision', { p_id: b.id, p_decision: v });
      b.decision = v;
    } }, DECYZJE.map(([v, t]) => el('option', { value: v, selected: (b.decision ?? 'nowe') === v }, [t])));
    const row = el('tr', { className: 'click', style: `opacity: ${b.done ? 0.5 : 1}`, onclick: (e: Event) => {
      if (e.target === done || e.target === decide || decide.contains(e.target as Node)) return;
      detail.style.display = 'block';
      detail.textContent = `${b.at}\n${b.player ?? '(bez postaci)'}\n\n${b.text}\n\n${JSON.stringify(c, null, 1)}\n\nLog:\n${(b.log ?? []).join('\n')}`;
      shotBox.replaceChildren();
      if (b.has_shot) {
        shotBox.append(el('p', {}, ['Wczytuję zrzut ekranu…']));
        call<string | null>('admin_bug_shot', { p_id: b.id }).then((src) => {
          shotBox.replaceChildren(...(src && src.startsWith('data:image/jpeg;base64,') ? [el('img', { src, alt: 'zrzut ekranu', style: 'max-width: 100%; border: 2px solid #4a4a55; border-radius: 4px' })] : [el('p', {}, ['Brak zrzutu.'])]));
        });
      }
      detail.scrollIntoView({ behavior: 'smooth' });
    } }, [
      el('td', {}, [done]),
      el('td', {}, [decide]),
      el('td', {}, [new Date(b.at).toLocaleString('pl-PL'), el('br'), el('small', { style: 'opacity: 0.7' }, [`wersja ${c.wersja ?? '?'}`])]),
      el('td', {}, [b.player ?? '—']),
      el('td', {}, [b.text.slice(0, 140)]),
      el('td', {}, [`${c.map ?? ''} ${c.street ?? ''}`]),
    ]);
    return row;
  });
  const table = el('table', {}, [el('thead', {}, [el('tr', {}, ['', 'Decyzja', 'Kiedy', 'Postać', 'Opis', 'Gdzie'].map((h) => el('th', {}, [h])))]), el('tbody', {}, rows)]);
  main.append(detail, el('div', { className: 'scroll' }, [table]));
}

function settings(main: HTMLElement) {
  const a = el('input', { type: 'password', autocomplete: 'new-password' });
  const b = el('input', { type: 'password', autocomplete: 'new-password' });
  const msg = el('p', { className: 'msg' });
  const knobs = el('div', { className: 'card', style: 'max-width: 640px' }, [el('p', { className: 'muted' }, ['Wczytuję pokrętła…'])]);
  void knobsCard(knobs);
  main.append(el('h2', {}, ['Ustawienia']), knobs, el('div', { className: 'card', style: 'max-width: 420px' }, [
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

/** The game's knobs (content/ustawienia.ts) and the gold in the game. */
async function knobsCard(box: HTMLElement) {
  type S = { values: Record<string, number>; gold: { alive: number; coins: number; chest: number; diamonds: number } };
  let s: S;
  try {
    s = await call<S>('admin_settings', {});
  } catch (e) {
    box.replaceChildren(el('p', { className: 'msg bad' }, [`Nie udało się wczytać pokrętł: ${(e as Error).message}`]));
    return;
  }
  const fmt = (n: number) => Math.round(n).toLocaleString('pl-PL');
  const g = s.gold;
  const rows: (HTMLElement | string)[] = [];
  let group = '';
  for (const p of POKRETLA) {
    if (p.grupa !== group) rows.push(el('h4', { style: 'margin: 12px 0 4px' }, [(group = p.grupa)]));
    const changed = p.k in s.values;
    const input = el('input', { type: 'number', min: String(p.min), max: String(p.max), step: String(p.krok ?? 1), value: String(changed ? s.values[p.k] : p.domyslnie), style: 'width: 120px' });
    const note = el('small', { className: 'muted' }, [changed ? `zmienione (domyślnie ${p.domyslnie})` : 'domyślne']);
    const save = async (v: number | null) => {
      if (v !== null && !(v >= p.min && v <= p.max)) return void (note.textContent = `Dozwolone od ${p.min} do ${p.max}.`);
      try {
        await call('admin_set_setting', { p_k: p.k, p_v: v });
        await knobsCard(box);
      } catch (e) {
        note.textContent = (e as Error).message;
      }
    };
    rows.push(el('div', { style: 'display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin: 4px 0' }, [
      el('span', { style: 'flex: 1 1 240px' }, [p.nazwa]),
      input,
      btn('Zapisz', () => void save(Number(input.value))),
      changed && btn('Przywróć', () => void save(null)),
      note,
    ]));
  }
  box.replaceChildren(
    el('h3', {}, ['💰 Złoto w grze']),
    el('p', {}, [`Żywe postacie: ${g.alive}. Monety przy sobie: ${fmt(g.coins)}, w skrzyniach: ${fmt(g.chest)}, razem ${fmt(g.coins + g.chest)}. Diamenty: ${fmt(g.diamonds)} 💎.`]),
    el('h3', {}, ['🎛 Pokrętła gry']),
    el('p', { className: 'muted' }, ['Zmiana działa od następnego wejścia gracza do gry (tylko serwer testowy – produkcja ma jeszcze stare liczby).']),
    ...rows,
  );
}

/** School quizzes (🧠 Quizy): numbers, Gemini's instructions and schema, pasting its answer, the list with deleting, the key. */
function quizzesTab(main: HTMLElement) {
  type Q = { today: number; tomorrow: number; in5?: number; byLevel: Record<string, number>; reserve?: Record<string, number>; answered?: number; total?: number; history?: number; hasKey: boolean; last: string | null };
  type Row = { id: number; level: number; category: string; country?: string | null; question: string; answers: string[]; from: string; to: string; answered: number };
  const kraj = (k: string | null | undefined) => (k ? k : '🌍 ogólne');
  const LEVELS = ['maluch', 'uczeń', 'odkrywca', 'mędrzec'];
  const missing = (e: Error) => /function|funkcj|not find|does not exist|schema cache/i.test(e.message) ? 'Ta funkcja nie jest jeszcze włączona na serwerze (docs/sql/quizy-admin.sql).' : e.message;

  // Numbers.
  const info = el('div', {}, ['Wczytuję…']);
  const loadInfo = () =>
    call<Q>('admin_quizzes', {}).then((q) => {
      const lv = (o: Record<string, number> | undefined) => LEVELS.map((l, i) => `${l} ${o?.[i] ?? 0}`).join(' · ');
      info.replaceChildren(...[
        el('p', {}, [`Dziś w szkołach: ${q.today} pytań (${lv(q.byLevel)}). Jutro: ${q.tomorrow}${q.in5 !== undefined ? `, za 5 dni: ${q.in5}` : ''}.`]),
        q.reserve ? el('p', {}, [`Zapas bez odpowiedzi (wraca, gdy brak nowych): ${lv(q.reserve)}.`]) : null,
        q.total !== undefined ? el('p', {}, [`W bazie ${q.total} pytań, ${q.answered} już z odpowiedzią; pamięć powtórek: ${q.history}.`]) : null,
        el('p', {}, [q.last ? `Ostatnia paczka: ${new Date(q.last).toLocaleString('pl-PL')}` : 'Jeszcze nic nie wgrano.']),
        el('p', { className: 'msg' }, ['Każda paczka jest ważna 5 dni. Gdy na poziomie jest dziś mniej niż 150 pytań, gra dobiera stare z zapasu, a gdy i zapasu brak – więcej rachunków.']),
      ].filter((x): x is HTMLParagraphElement & Record<string, unknown> => !!x));
    }).catch((e: Error) => info.replaceChildren(e.message));
  loadInfo();

  // Instructions for Gemini.
  const copy = (text: string, b: HTMLButtonElement) => {
    navigator.clipboard?.writeText(text).then(() => {
      const t = b.textContent;
      b.textContent = '✓ Skopiowano';
      setTimeout(() => (b.textContent = t), 1500);
    }).catch(() => {});
  };
  const prompt = el('pre', { className: 'card', style: 'white-space: pre-wrap; max-height: 220px; overflow: auto; font-size: 12px' }, [POLECENIE_GEMINI]);
  const schema = el('pre', { className: 'card', style: 'white-space: pre-wrap; max-height: 220px; overflow: auto; font-size: 12px; display: none' }, [JSON.stringify(SCHEMAT_QUIZOW, null, 2)]);
  const copyPrompt: HTMLButtonElement = btn('📋 Kopiuj polecenie', () => copy(POLECENIE_GEMINI, copyPrompt));
  const copySchema: HTMLButtonElement = btn('📋 Kopiuj schemat', () => copy(JSON.stringify(SCHEMAT_QUIZOW, null, 2), copySchema));
  const showSchema = btn('Pokaż schemat JSON', () => (schema.style.display = schema.style.display === 'none' ? 'block' : 'none'));

  // Pasting Gemini's answer.
  const box = el('textarea', { rows: 8, placeholder: '{"quizzes": [ … ]}  ← wklej tu odpowiedź Gemini', style: 'width: 100%; font-family: monospace; font-size: 12px' });
  const days = el('select', {}, [5, 6, 7].map((d) => el('option', { value: String(d) }, [`ważne ${d} dni`])));
  const out = el('div', { className: 'msg' });
  const check = () => {
    const r = sprawdzQuizy(box.value);
    const per = LEVELS.map((l, i) => `${l} ${r.ok.filter((q) => q.level === i).length}`).join(' · ');
    out.replaceChildren(
      el('p', { className: r.ok.length ? 'msg ok' : 'msg bad' }, [`Dobrych pytań: ${r.ok.length} (${per}).${r.bledy.length ? ` Odrzucone: ${r.bledy.length}.` : ''}`]),
      ...r.bledy.slice(0, 12).map((b) => el('p', { className: 'msg bad' }, [b])),
      ...r.ok.slice(0, 5).map((q) => el('p', { className: 'msg' }, [`[${LEVELS[q.level]}, ${q.category}, ${kraj(q.country)}] ${q.question} → ✔ ${q.answers[0]}`])),
    );
    return r;
  };
  const upload = btn('⬆ Wgraj do gry', async () => {
    const r = check();
    if (!r.ok.length) return;
    if (!confirm(`Wgrać ${r.ok.length} pytań? Uczniowie zobaczą je od dziś.`)) return;
    try {
      const res = await call<{ added?: number; repeated?: number; skipped?: number; error?: string }>('admin_add_quizzes', { p_quizzes: r.ok, p_days: Number(days.value) });
      if (res.error) throw new Error(res.error);
      out.prepend(el('p', { className: 'msg ok' }, [`Wgrano: ${res.added}. Powtórki odrzucone: ${res.repeated}. Złe: ${res.skipped}.`]));
      box.value = '';
      loadInfo();
      loadList();
    } catch (e) {
      out.prepend(el('p', { className: 'msg bad' }, [missing(e as Error)]));
    }
  }, 'b p');

  // The list (latest first), filter and delete.
  const lvl = el('select', {}, [el('option', { value: '' }, ['wszystkie poziomy']), ...LEVELS.map((l, i) => el('option', { value: String(i) }, [l]))]);
  const land = el('select', {}, [el('option', { value: '' }, ['każdy kraj']), el('option', { value: '-' }, ['🌍 tylko ogólne']), el('option', { value: '*' }, ['tylko z krajem']), el('option', { value: 'PL' }, ['PL'])]);
  const q = el('input', { type: 'search', placeholder: 'szukaj w pytaniach…' });
  const list = el('div', { className: 'scroll' });
  const loadList = () =>
    call<Row[]>('admin_quiz_list', { p_level: lvl.value === '' ? null : Number(lvl.value), p_q: q.value || null, p_limit: 150, p_country: land.value || null }).then((rows) => {
      const today = new Date().toISOString().slice(0, 10);
      list.replaceChildren(el('table', { className: 'qz' }, [
        el('thead', {}, [el('tr', {}, ['Poziom', 'Kategoria', 'Kraj', 'Pytanie', 'Dobra / złe', 'Ważne', 'Odp.', ''].map((h) => el('th', {}, [h])))]),
        el('tbody', {}, rows.map((r) => {
          const del = btn('🗑', async () => {
            if (!confirm(`Usunąć pytanie?\n\n${r.question}`)) return;
            try {
              await call('admin_quiz_delete', { p_id: r.id });
              row.remove();
              loadInfo();
            } catch (e) {
              alert(missing(e as Error));
            }
          });
          // The country can be fixed by hand (older questions came without one).
          const landBtn: HTMLButtonElement = btn(kraj(r.country), async () => {
            const v = window.prompt('Kraj pytania: zostaw puste = ogólne (wszędzie), albo dwie litery kodu kraju, np. PL, JP.', r.country ?? '');
            if (v === null) return;
            const k = krajPytania(v);
            if (k === null) return alert('Wpisz pusty albo dwie litery kodu kraju (np. PL).');
            try {
              await call('admin_quiz_country', { p_id: r.id, p_country: k });
              r.country = k || null;
              landBtn.textContent = kraj(r.country);
            } catch (e) {
              alert(missing(e as Error));
            }
          }, 'b land');
          const row = el('tr', {}, [
            el('td', { className: 'lv' }, [LEVELS[r.level] ?? String(r.level)]),
            el('td', { className: 'cat' }, [r.category]),
            el('td', { className: 'land' }, [landBtn]),
            el('td', { className: 'q' }, [r.question]),
            el('td', { className: 'a' }, [el('b', {}, [`✔ ${r.answers[0]}`]), ` · ${r.answers.slice(1).join(' · ')}`]),
            el('td', { className: 'when' }, [`${r.from.slice(5)}–${r.to.slice(5)}${r.from <= today && today <= r.to ? ' ●' : ''}`]),
            el('td', { className: 'num' }, [String(r.answered)]),
            el('td', { className: 'del' }, [del]),
          ]);
          return row;
        })),
      ]));
    }).catch((e: Error) => list.replaceChildren(el('p', { className: 'msg' }, [missing(e)])));
  lvl.onchange = () => loadList();
  land.onchange = () => loadList();
  q.oninput = () => {
    clearTimeout((q as unknown as { t?: number }).t);
    (q as unknown as { t?: number }).t = window.setTimeout(loadList, 400);
  };
  loadList();

  // The key for a program that uploads by itself (add_quizzes).
  const keyOut = el('pre', { className: 'card', style: 'white-space: pre-wrap; display: none' });
  const keyBtn = btn('Wygeneruj nowy klucz', async () => {
    if (!confirm('Stary klucz przestanie działać. Wygenerować nowy?')) return;
    try {
      const r = await call<{ key: string }>('admin_new_quiz_key', {});
      keyOut.style.display = 'block';
      keyOut.textContent = `Nowy klucz (pokazany tylko raz – skopiuj go do programu):\n${r.key}`;
      loadInfo();
    } catch (e) {
      keyOut.style.display = 'block';
      keyOut.textContent = (e as Error).message;
    }
  });

  main.append(
    el('h2', {}, ['🧠 Quizy w szkołach']),
    el('div', { className: 'card' }, [info]),
    el('div', { className: 'card' }, [
      el('h3', {}, ['1. Polecenie dla Gemini']),
      el('p', {}, ['Skopiuj polecenie do Gemini (czat albo program). Najlepiej z włączoną odpowiedzią w formacie JSON i schematem poniżej – wtedy Gemini zawsze odda dobry układ.']),
      el('div', {}, [copyPrompt, copySchema, showSchema]),
      prompt,
      schema,
    ]),
    el('div', { className: 'card' }, [
      el('h3', {}, ['2. Wklej odpowiedź Gemini']),
      box,
      el('div', {}, [btn('Sprawdź', () => void check()), upload, days]),
      out,
    ]),
    el('div', { className: 'card' }, [
      el('h3', {}, ['3. Pytania w grze']),
      el('p', { className: 'msg' }, ['Złe pytanie możesz usunąć – nie wróci, bo gra pamięta wszystkie wgrane pytania. ● = zadawane dziś. Kraj: 🌍 ogólne = zadawane wszędzie, kod (np. PL) = tylko w szkołach w tym kraju; dotknij, żeby zmienić.']),
      el('div', { className: 'qzf' }, [lvl, land, q]),
      list,
    ]),
    el('div', { className: 'card' }, [
      el('h3', {}, ['Klucz dla programu, który wgrywa sam']),
      el('p', {}, ['Program (np. Gemini na harmonogramie) może wysyłać pytania funkcją add_quizzes z tym kluczem – opis w docs/quizy-gemini.md.']),
      keyBtn,
      keyOut,
    ]),
  );
}

// ------------------------------------------------------------------ start

CityMap.load('map/lublin.json').then((c) => {
  city = c;
  if (data && tab === 'missions') render();
}).catch(() => {});

if (key) {
  reload().then(render).catch((e: Error) => loginScreen(e.message));
} else loginScreen();
