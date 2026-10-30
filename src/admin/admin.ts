import { itemIcon } from '../ui/itemIcon';
import { pancerze, kluczPancerza, ustawPancerze } from '../content/pancerz';
import { bronie, kluczBroni, kluczTrwalosci, kodujZakres, ustawBronie } from '../content/bron';
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
import { etapyEditor } from './etapyEditor';
import { lamiglowkaDnia, rodzajDnia, dzienLamiglowki, POZIOMY_LAMIGLOWEK, type Lamiglowka } from '../lamiglowki';
import { LAMIGLOWKA } from '../content/gazeta';
import { STWORY, lupOpcje, type WierszLupu } from '../content/stwory';

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

const WROGOWIE: Record<RodzajWroga, string> = { glut: 'Chochlik (10 życia)', wielki_glut: 'Wielki chochlik (60 życia)', bandyta: 'Bandyta (20 życia, szybki)', driada: 'Driada (10 życia)', zombie: 'Zombiak (13 życia)', szkielet: 'Szkielet (10 życia)', smok: 'Smok', wojownik: 'Wojownik (pojedynek)', herszt: 'Herszt gangu (45 życia)', wielki_herszt: 'Wielki herszt (120 życia)', blob: 'Wodny blob (5 życia)', wodnik: 'Wodnik (30 życia, przywołuje bloby)', koziol: 'Mosiężny Kozioł – boss (240 życia)', wilk: 'Wilk (10 życia, test łowisk)', warg: 'Warg (32 życia, test łowisk)', upior: 'Upiór krypty – boss lochu (90 życia)', elzet: 'Elzet 10 (robot z questa, życie wg bohatera)' };
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
  for (const [k, v] of Object.entries(props)) if (k.startsWith('aria-') || k.startsWith('data-')) e.setAttribute(k, String(v));
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
  const tabs: [string, string][] = [['summary', '📊 Podsumowanie'], ['players', '🧍 Postacie'], ['missions', '📜 Misje'], ['codes', '🤫 Tajne hasła'], ['bugs', '🪲 Zgłoszenia'], ['kurier', '📰 Gazeta'], ['letters', '✉ Listy'], ['porty', '⚓ Porty'], ['errors', '🐞 Błędy'], ['quizzes', '🧠 Quizy'], ['puzzles', '🧩 Łamigłówki'], ['bron', '⚔ Repozytorium broni'], ['pancerze', '🛡 Repozytorium pancerzy'], ['stwory', '🐺 Stworki'], ['settings', '⚙ Ustawienia']];
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
  else if (tab === 'letters') void lettersTab(main);
  else if (tab === 'porty') void portyTab(main);
  else if (tab === 'kurier') void kurierTab(main);
  else if (tab === 'quizzes') quizzesTab(main);
  else if (tab === 'puzzles') void puzzlesTab(main);
  else if (tab === 'bron') void bronTab(main);
  else if (tab === 'pancerze') void pancerzTab(main);
  else if (tab === 'stwory') void stworyTab(main);
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
    el('div', { className: 'row' }, [
      btn('+ Nowa misja / nowe miejsce', () => editor.replaceChildren(missionEditor(null)), 'b p'),
      btn('🧙 Kreator historii (misja z etapami)', () => editor.replaceChildren(missionEditor(null, true)), 'b p'),
    ]),
    editor,
    el('div', { className: 'scroll', style: 'margin-top: 12px' }, [el('table', {}, [
      el('thead', {}, [el('tr', {}, ['Tytuł', 'Adres (✓ = jest na mapie)', 'Rodzaj', 'Przyjęło', 'Ukończyło', 'Hasła'].map((h, i) => el('th', { className: i >= 3 ? 'num' : '' }, [h])))]),
      el('tbody', {}, rows),
    ])]),
    el('p', { className: 'muted' }, ['Misje „w kodzie gry” są w pliku fabula.ts (zmienia je Claude). Resztę możesz tu dodawać i zmieniać – gracze zobaczą je po następnym wczytaniu postaci.']),
  );
}

function missionEditor(id: string | null, kreator = false) {
  const existing = id ? data!.missions.find((d) => d.id === id) : undefined;
  const m: Misja = existing ? { ...existing.data } : {
    id: '', adres: '', tytul: '', opis: '', zakonczenie: '', nagroda: 50,
    zadanie: { typ: 'pokonaj', miejsce: '', ile: 3, wrog: 'glut', cel: '' },
  };
  const z = m.zadanie;
  const inp = (value: string | number, props: Record<string, unknown> = {}) => el('input', { value: String(value ?? ''), ...props });
  const f = {
    tytul: inp(m.tytul, { placeholder: 'np. Klocki w opałach' }),
    adres: inp(m.adres, { placeholder: 'np. Narutowicza 5 (Enter = pokaż na mapie)' }),
    typ: el('select', {}, Object.entries(TYPY).map(([k, v]) => el('option', { value: k, selected: z.typ === k }, [v]))),
    miejsce: inp(typeof z.miejsce === 'string' ? z.miejsce : '', { placeholder: 'np. Bramowa 1 albo kliknij na mapie (Enter = pokaż)' }),
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
    wiele: el('input', { type: 'checkbox', checked: !!m.etapy?.length || kreator }),
    przedmioty: el('select', { multiple: true, size: 5 }, PRZEDMIOTY.filter((p) => p.id !== 'kijek').map((p) => el('option', { value: p.id, selected: !!m.przedmioty?.includes(p.id) }, [p.nazwa]))),
    tytulB: inp(m.tytul_bohatera ?? '', { placeholder: 'np. Strażnik Serca Miasta (puste = bez tytułu)' }),
    // People standing in the world (owner 7.10.2026: „w queście musi być ktoś”): the giver at the door, someone at the goal.
    gImie: inp(m.postac?.imie ?? '', { placeholder: 'np. Hela Trybik (puste = nikt nie stoi)' }),
    gKobieta: el('input', { type: 'checkbox', checked: !!m.postac?.kobieta }),
    zImie: inp(z.postac?.imie ?? '', { placeholder: 'np. Maszynista Bolek (puste = nikt)' }),
    zKobieta: el('input', { type: 'checkbox', checked: !!z.postac?.kobieta }),
    klik: el('select', {}),
    flaga: el('select', {}, [['', '— bez —'], ['znizka_woznica', 'Zniżka u woźniców'], ['schemat_pistoletu', 'Schemat pistoletu (½ ceny)'], ['receptura_alchemika', 'Receptura alchemika (30 owoców)']].map(([v, t]) => el('option', { value: v, selected: (m.flaga ?? '') === v }, [t]))),
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
  // The stage cards report changes before `update` exists (while they're built): wire it up below.
  let refresh = () => {};
  const stages = etapyEditor(m.etapy ?? [], WROGOWIE, () => refresh());
  const singleTask = el('div', {}, [
    field('Miejsce zadania (adres)', f.miejsce, 'Gdzie są wrogowie albo dokąd trzeba dojść.'),
    el('div', { className: 'row' }, [field('Ilu wrogów', f.ile), field('Jaki wróg', f.wrog)]),
    field('Cel (pokazywany na ekranie)', f.cel),
    el('label', { className: 'row' }, [f.szukaj, 'Trzeba szukać (strzałka pokazuje tylko okolicę)']),
    el('div', { className: 'row' }, [field('Postać na miejscu celu (to ona mówi „Co mówi po wykonaniu”, gdy kończy się na miejscu)', f.zImie), el('label', {}, [f.zKobieta, ' kobieta'])]),
    riddleFields,
    el('label', { className: 'row' }, [f.naMiejscu, 'Zakończ na miejscu (nagroda od razu po wykonaniu, bez powrotu)']),
  ]);
  const stagesBox = el('div', {}, [
    el('p', { className: 'muted' }, ['Etapy idą po kolei; misja kończy się (z nagrodą) po ostatnim etapie, tam gdzie on się dzieje – zwykle ostatni etap to rozmowa ze zleceniodawcą.']),
    stages.box,
  ]);
  const taskFields = el('div', {}, [
    singleTask,
    stagesBox,
    field('Co mówi po wykonaniu', f.zakonczenie),
    el('div', { className: 'row' }, [field('Nagroda (monety)', f.nagroda), field('EXP', f.exp), field('Diamenty', f.diamenty), field('Przedmiot w nagrodę', f.przedmiot)]),
    el('div', { className: 'row' }, [field('Więcej przedmiotów (Ctrl/⌘)', f.przedmioty), field('Tytuł bohatera w nagrodę', f.tytulB), field('Trwała nagroda', f.flaga)]),
  ]);
  const preview = el('div');
  const msg = el('p', { className: 'msg' });

  const read = (): Misja => {
    const typ = (f.wiele.checked ? 'idz' : f.typ.value) as Misja['zadanie']['typ'];
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
    if (f.wiele.checked && typ !== 'brak') {
      const etapy = stages.read();
      if (etapy.length) {
        out.etapy = etapy;
        // `zadanie` = the first stage, so everything that reads one task still finds one.
        out.zadanie = { ...etapy[0] };
      }
    }
    const more = [...f.przedmioty.selectedOptions].map((o) => o.value);
    if (more.length && typ !== 'brak') out.przedmioty = more;
    if (f.tytulB.value.trim() && typ !== 'brak') out.tytul_bohatera = f.tytulB.value.trim();
    if (f.flaga.value && typ !== 'brak') out.flaga = f.flaga.value as NonNullable<Misja['flaga']>;
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
    if (f.gImie.value.trim()) out.postac = { imie: f.gImie.value.trim(), ...(f.gKobieta.checked ? { kobieta: true } : {}) };
    if (!out.etapy && typ !== 'brak' && f.zImie.value.trim()) out.zadanie.postac = { imie: f.zImie.value.trim(), ...(f.zKobieta.checked ? { kobieta: true } : {}) };
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
    const wiele = f.wiele.checked;
    singleTask.style.display = wiele ? 'none' : '';
    stagesBox.style.display = wiele ? '' : 'none';
    f.typ.parentElement!.style.display = wiele ? 'none' : '';
    f.szukaj.parentElement!.style.display = typ === 'pokonaj' ? '' : 'none';
    // What a click on the map sets: the goal / the door, or a stage's place.
    const was = f.klik.value;
    const opts: [string, string][] = [['wejscie', 'wejście (zleceniodawca)']];
    if (wiele) for (let i = 0; i < stages.count(); i++) opts.push([`etap:${i}`, `miejsce etapu ${i + 1}`]);
    else if (typ !== 'brak') opts.unshift(['cel', 'cel zadania (postać na miejscu)']);
    f.klik.replaceChildren(...opts.map(([v, t]) => el('option', { value: v, selected: v === was }, [t])));
    preview.replaceChildren(missionPreview(read(), (lat, lon) => {
      const v = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      const k = f.klik.value;
      if (k === 'wejscie') f.adres.value = v;
      else if (k === 'cel') f.miejsce.value = v;
      else if (k.startsWith('etap:')) return stages.setPlace(Number(k.slice(5)), v);
      update();
    }, f.klik));
  };
  // Addresses: the map moves only on Enter or leaving the field (owner 7.10.2026: not at every letter).
  f.adres.dataset.adres = f.miejsce.dataset.adres = '1';
  for (const e of Object.values(f)) {
    if (e === f.klik) continue;
    e.addEventListener('input', () => { if (!e.dataset.adres) update(); });
    e.addEventListener('change', update);
  }
  refresh = update;

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
    el('h3', {}, [existing ? `Edycja: ${m.tytul}` : kreator ? '🧙 Kreator historii' : 'Nowa misja / miejsce']),
    kreator ? el('ol', { className: 'muted' }, [
      el('li', {}, ['Wpisz tytuł i adres budynku, gdzie zaczyna się historia (Enter pokaże go na mapie), i kto tam stoi (zleceniodawca).']),
      el('li', {}, ['Napisz, co mówi zleceniodawca – kilka zdań, z klimatem.']),
      el('li', {}, ['Dodawaj etapy (+ Dodaj etap): rodzaj, miejsce (adres albo kliknij na mapie, wybierając „miejsce etapu N”), postać na miejscu i jej słowa.']),
      el('li', {}, ['Ustaw nagrodę i zapisz. Seria łączy kolejne misje w jedną opowieść (Wymagania → ukończone misje).']),
    ]) : '',
    el('div', { className: 'grid2' }, [
      el('div', {}, [
        field('Tytuł', f.tytul),
        field('Adres budynku (tu się ją dostaje)', f.adres, 'Jak na tabliczce: „Ulica numer”. Znaczek ✓/✗ w podglądzie mówi, czy jest na mapie.'),
        field('Główna nazwa questa (seria)', f.seria, 'Misje z tą samą nazwą tworzą jedną historię; w dzienniku: „⚙ Seria – część N: tytuł”.'),
        needs,
        el('label', { className: 'row' }, [f.wiele, 'Misja wieloetapowa (etapy po kolei)']),
        field('Rodzaj', f.typ),
        el('div', { className: 'row' }, [field('Zleceniodawca stojący przy drzwiach (imię)', f.gImie), el('label', {}, [f.gKobieta, ' kobieta'])]),
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
function missionPreview(m: Misja, pick?: (lat: number, lon: number) => void, klik?: HTMLElement) {
  const door = spotOf(m.adres);
  const target = m.zadanie.typ === 'brak' ? null : spotOf(m.zadanie.miejsce);
  // Every stage's place (empty = the giver's door), numbered on the map, with the person standing there.
  const stagesAt = (m.etapy ?? []).map((e, i) => ({ i, p: e.miejsce === '' || e.miejsce === undefined ? door : spotOf(e.miejsce), who: e.postac?.imie }));
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
    const pts = [door, ...(stagesAt.length ? stagesAt.map((q) => q.p) : [target])].filter((q): q is { x: number; y: number } => !!q);
    const xs = pts.map((q) => q.x), ys = pts.map((q) => q.y);
    const a = door;
    const b = target ?? a;
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const R = Math.max(80 * PX_PER_M, Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2 + 40 * PX_PER_M);
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
    const name = (p: { x: number; y: number }, text: string | undefined) => {
      if (!text) return;
      const x = (p.x - (cx - R)) * s, y = (p.y - (cy - R)) * s - 20;
      ctx.font = 'bold 13px sans-serif';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#1e1a24';
      ctx.strokeText(`🧍 ${text}`, x, y);
      ctx.fillStyle = '#fff8e0';
      ctx.fillText(`🧍 ${text}`, x, y);
    };
    if (stagesAt.length) {
      for (const q of stagesAt) if (q.p) { dot(q.p, '#ff4b4b', String(q.i + 1)); name(q.p, q.who); }
    } else if (target) {
      dot(b, '#ff4b4b', m.zadanie.typ === 'idz' ? '⚑' : '⚔');
      name(b, m.zadanie.postac?.imie);
    }
    dot(a, '#f7c531', '!');
    name(a, m.postac?.imie);
    };
    if (pick) {
      canvas.style.cursor = 'crosshair';
      canvas.onclick = (ev) => {
        const r = canvas.getBoundingClientRect();
        const x = cx - R + ((ev.clientX - r.left) / r.width) * 2 * R, y = cy - R + ((ev.clientY - r.top) / r.height) * 2 * R;
        const ll = map.toLatLon(x, y);
        pick(ll.lat, ll.lon);
      };
    }
    // The map is loaded in tiles: draw now and again once that part is in.
    paint();
    if (!map.ready({ x0: cx - R, y0: cy - R, x1: cx + R, y1: cy + R })) map.ensure(cx, cy, R).then(paint, () => {});
    out.append(
      klik ? el('label', { className: 'row' }, ['Kliknięcie w mapę ustawia: ', klik]) : '',
      canvas,
      el('div', { className: 'legend' }, ['🟡 wejście (tu się dostaje misję)', stagesAt.length ? '  🔴 miejsca etapów (numery)' : target ? '  🔴 cel zadania' : '', '  🧍 postacie']),
    );
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
      el('td', {}, [el('span', { className: e.kind === 'freeze' ? 'badge bad' : e.kind === 'fps' ? 'badge warn' : 'badge' }, [e.kind])]),
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

/** Letters to the editors from the newsboys (gazeciarze): players' quest ideas – read as ideas only. */
/**
 * „Kurier Parowy” front page (owner, 11 Oct 2026): news the newsboys sell – new quests, special
 * tasks, other news – in Polish and English (table kurier_wiesci). Nothing is ever deleted: „Ukryj” hides.
 */
async function kurierTab(main: HTMLElement) {
  type W = { id?: number; rodzaj: string; tytul: { pl?: string; en?: string }; tresc: { pl?: string; en?: string }; miejsce: string | null;
    od: string; do: string | null; kraj: string | null; miasto: string | null; test: boolean; aktywna: boolean };
  main.append(el('h2', {}, ['Gazeta – pierwsza strona']), el('p', { className: 'muted' }, [
    'Wieści, które gracze czytają u gazeciarzy: nowe zadania, zadania specjalne i inne ogłoszenia. Najnowsza jest na górze strony, dużymi literami. ',
    'Pusty angielski tekst = gracze z angielskim widzą polski. „Tylko test” = widać tylko na serwerze testowym. Kraj/miasto puste = wszędzie.',
  ]));
  let list: W[];
  try {
    list = await call<W[]>('admin_kurier_wiesci', {});
  } catch (e) {
    main.append(el('p', { className: 'bad' }, [(e as Error).message]));
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const RODZAJE: [string, string][] = [['zadanie', '📜 Nowe zadanie'], ['specjalne', '★ Zadanie specjalne'], ['wiesc', '📰 Wieści']];
  const form = (w: W) => {
    const inp = (v: string | null, ph = '', type = 'text') => el('input', { type, value: v ?? '', placeholder: ph, style: 'width:100%' }) as HTMLInputElement;
    const area = (v: string | undefined, ph: string) => el('textarea', { value: v ?? '', placeholder: ph, rows: 5, style: 'width:100%' }) as HTMLTextAreaElement;
    const rodzaj = el('select', {}, RODZAJE.map(([v, t]) => el('option', { value: v, selected: w.rodzaj === v }, [t]))) as HTMLSelectElement;
    const tPl = inp(w.tytul.pl ?? '', 'Tytuł po polsku'), tEn = inp(w.tytul.en ?? '', 'Title in English');
    const bPl = area(w.tresc.pl, 'Treść po polsku (pusta linia = nowy akapit)'), bEn = area(w.tresc.en, 'Text in English');
    const miejsce = inp(w.miejsce, 'Gdzie (np. Brama Krakowska) – pokazuje się pod tytułem');
    const od = inp(w.od ?? today, '', 'date'), doo = inp(w.do, '', 'date');
    const kraj = inp(w.kraj, 'np. PL'), miasto = inp(w.miasto, 'np. Lublin');
    const test = el('input', { type: 'checkbox', checked: w.test }) as HTMLInputElement;
    const aktywna = el('input', { type: 'checkbox', checked: w.aktywna }) as HTMLInputElement;
    const msg = el('span', { className: 'muted' });
    const save = btn(w.id ? '💾 Zapisz zmiany' : '➕ Opublikuj', async () => {
      if (!tPl.value.trim() || !bPl.value.trim()) { msg.textContent = 'Wpisz przynajmniej polski tytuł i treść.'; return; }
      msg.textContent = 'Zapisuję…';
      try {
        await call('admin_kurier_zapisz', { p_w: { id: w.id ?? null, rodzaj: rodzaj.value, tytul: { pl: tPl.value.trim(), en: tEn.value.trim() },
          tresc: { pl: bPl.value.trim(), en: bEn.value.trim() }, miejsce: miejsce.value.trim(), od: od.value, do: doo.value,
          kraj: kraj.value.trim(), miasto: miasto.value.trim(), test: test.checked, aktywna: aktywna.checked } });
        main.replaceChildren();
        void kurierTab(main);
      } catch (e) { msg.textContent = (e as Error).message; }
    });
    const row = (label: string, ...c: Node[]) => el('label', { style: 'display:block;margin:6px 0' }, [el('b', {}, [label]), el('br'), ...c]);
    return el('div', { className: 'card', style: 'max-width:760px' }, [
      row('Rodzaj', rodzaj),
      el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:10px' }, [row('🇵🇱 Tytuł', tPl), row('🇬🇧 Title', tEn), row('🇵🇱 Treść', bPl), row('🇬🇧 Text', bEn)]),
      row('Gdzie', miejsce),
      el('div', { style: 'display:grid;grid-template-columns:repeat(4,1fr);gap:10px' }, [row('Od dnia', od), row('Do dnia (puste = bez końca)', doo), row('Kraj', kraj), row('Miasto', miasto)]),
      el('label', {}, [test, ' Tylko test ']), ' ', el('label', {}, [aktywna, ' Widoczna']), el('br'), save, ' ', msg,
    ]);
  };
  main.append(el('h3', {}, ['Nowa wieść']), form({ rodzaj: 'zadanie', tytul: {}, tresc: {}, miejsce: null, od: today, do: null, kraj: null, miasto: null, test: false, aktywna: true }));
  if (!list.length) return;
  main.append(el('h3', {}, ['Opublikowane']));
  for (const w of list) {
    const box = el('div');
    const show = () => box.replaceChildren(el('div', { className: 'card', style: `max-width:760px;opacity:${w.aktywna ? 1 : 0.5}` }, [
      el('b', {}, [`${RODZAJE.find((r) => r[0] === w.rodzaj)?.[1] ?? w.rodzaj}: ${w.tytul.pl ?? ''}`]),
      el('div', { className: 'muted' }, [`${w.od}${w.do ? ' → ' + w.do : ''}${w.miasto ? ' · ' + w.miasto : ''}${w.kraj ? ' · ' + w.kraj : ''}${w.test ? ' · tylko test' : ''}${w.aktywna ? '' : ' · ukryta'}${w.tytul.en ? '' : ' · brak EN'}`]),
      el('p', { style: 'white-space:pre-wrap' }, [w.tresc.pl ?? '']),
      btn('✏ Edytuj', () => box.replaceChildren(form(w))),
    ]));
    show();
    main.append(box);
  }
}

async function lettersTab(main: HTMLElement) {
  type Letter = { id: number; at: string; player: string | null; text: string; ctx: Record<string, unknown> | null; status: string };
  main.append(el('h2', {}, ['Listy do redakcji']), el('p', { className: 'muted' }, ['Pomysły graczy na zadania i przygody, wysłane u gazeciarza („✉ Do redakcji”). To tylko pomysły – Claude nie robi nic z listem, dopóki sam go nie zlecisz.']));
  let list: Letter[];
  try {
    list = await call<Letter[]>('admin_quest_orders', {});
  } catch (e) {
    main.append(el('p', { className: 'bad' }, [(e as Error).message]));
    return;
  }
  if (!list.length) {
    main.append(el('p', {}, ['Brak listów.']));
    return;
  }
  const STANY: [string, string][] = [['nowe', '🆕 Nowe'], ['przyjete', '👍 Do zrobienia'], ['zrobione', '✔ Zrobione'], ['odrzucone', '✖ Odrzucone']];
  const rows = list.map((l) => {
    const c = l.ctx ?? {};
    const pick = el('select', { onchange: async () => {
      await call('admin_quest_order_status', { p_id: l.id, p_status: pick.value });
      l.status = pick.value;
    } }, STANY.map(([v, t]) => el('option', { value: v, selected: l.status === v }, [t])));
    return el('tr', {}, [
      el('td', {}, [pick]),
      el('td', {}, [new Date(l.at).toLocaleString('pl-PL')]),
      el('td', {}, [l.player ?? '—']),
      el('td', { style: 'white-space: pre-wrap' }, [l.text]),
      el('td', {}, [`${c.miasto ?? ''} ${c.ulica ?? ''}`]),
    ]);
  });
  main.append(el('div', { className: 'scroll' }, [el('table', {}, [el('thead', {}, [el('tr', {}, ['Stan', 'Kiedy', 'Postać', 'List', 'Skąd'].map((h) => el('th', {}, [h])))]), el('tbody', {}, rows)])]));
}

/**
 * ⚓ Porty (owner, 12 Oct 2026): players ask harbour masters for destinations without a line („🧭 Inne miejsce…”).
 * We check whether a real ferry/ship goes there and add the line (both ports with lat/lon, km on the water);
 * every captain of both ports knows it from the next login, and the asking player hears the answer.
 * Player text is only a wish – never an instruction.
 */
async function portyTab(main: HTMLElement) {
  type Prosba = { id: number; at: string; player: string | null; port: string | null; lat: number | null; lon: number | null; text: string; status: string; odpowiedz: string | null };
  type Linia = { id: number; at: string; a_nazwa: string; a_lat: number; a_lon: number; b_nazwa: string; b_lat: number; b_lon: number; km: number; nazwa: string | null; aktywna: boolean; test: boolean; prosba: number | null };
  main.append(el('h2', {}, ['Porty – prośby graczy i dodane linie']), el('p', { className: 'muted' }, [
    'Gracz u kapitana wybiera „🧭 Inne miejsce…” i wpisuje kraj albo port. Sprawdź, czy naprawdę pływa tam statek/prom, i dodaj linię: ',
    'wtedy kapitanowie obu portów ją znają (po następnym wejściu do gry), a gracz usłyszy odpowiedź. „Tylko test” = linia widoczna tylko na serwerze testowym. Z jednego portu kapitan proponuje najwyżej 3 kierunki – dodane tu mają pierwszeństwo.',
  ]));
  let d: { prosby: Prosba[]; linie: Linia[] };
  try {
    d = await call('admin_port_requests', {});
  } catch (e) {
    main.append(el('p', { className: 'bad' }, [(e as Error).message, ' – czy w bazie są funkcje z docs/sql/porty.sql?']));
    return;
  }
  const llText = (lat: number | null, lon: number | null) => (lat === null || lon === null ? '' : `${lat.toFixed(4)}, ${lon.toFixed(4)}`);
  const parseLL = (t: string) => {
    const g = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(t);
    return g ? { lat: +g[1], lon: +g[2] } : null;
  };
  const straight = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) =>
    Math.hypot((a.lat - b.lat) * 111.13, (a.lon - b.lon) * 111.32 * Math.cos((a.lat * Math.PI) / 180));

  /** The form for a new line (from a request: port A filled in). */
  const lineForm = (r: Prosba | null) => {
    const an = el('input', { value: r?.port ?? '' });
    const all = el('input', { value: llText(r?.lat ?? null, r?.lon ?? null), placeholder: '54.5350, 18.5000' });
    const bn = el('input', { value: '', placeholder: 'np. Karlskrona' });
    const bll = el('input', { value: '', placeholder: '56.1040, 15.6350' });
    const kmIn = el('input', { type: 'number', placeholder: 'puste = prosta × 1,2' });
    const nazwa = el('input', { value: '', placeholder: 'np. Gdynia – Karlskrona (Stena Line)' });
    const test = el('input', { type: 'checkbox', checked: true });
    const msg = el('p', { className: 'msg' });
    const box = el('div', { className: 'card', style: 'max-width: 560px' }, [
      el('h3', {}, [r ? `Nowa linia z prośby #${r.id} („${r.text}”)` : 'Nowa linia']),
      el('label', { className: 'f' }, [el('span', {}, ['Port A – nazwa']), an]),
      el('label', { className: 'f' }, [el('span', {}, ['Port A – szer., dł. (przystań, na lądzie)']), all]),
      el('label', { className: 'f' }, [el('span', {}, ['Port B – nazwa']), bn]),
      el('label', { className: 'f' }, [el('span', {}, ['Port B – szer., dł.']), bll]),
      el('label', { className: 'f' }, [el('span', {}, ['km po wodzie']), kmIn]),
      el('label', { className: 'f' }, [el('span', {}, ['Nazwa linii (opcjonalnie)']), nazwa]),
      el('label', {}, [test, ' Tylko test']),
      msg,
      btn('➕ Dodaj linię', async () => {
        msg.className = 'msg bad';
        const a = parseLL(all.value), b = parseLL(bll.value);
        if (!an.value.trim() || !bn.value.trim() || !a || !b) return void (msg.textContent = 'Podaj nazwy i współrzędne obu portów (szer., dł.).');
        const k = kmIn.value ? Math.round(+kmIn.value) : Math.round(straight(a, b) * 1.2);
        try {
          await call('admin_port_line', { p_id: null, p_line: { a_nazwa: an.value.trim(), a_lat: a.lat, a_lon: a.lon, b_nazwa: bn.value.trim(), b_lat: b.lat, b_lon: b.lon, km: k, nazwa: nazwa.value.trim(), test: test.checked, prosba: r?.id ?? null } });
          msg.className = 'msg ok';
          msg.textContent = `Dodana (${k} km).`;
          setTimeout(() => render(), 600);
        } catch (e) {
          msg.textContent = (e as Error).message;
        }
      }, 'b p'),
    ]);
    return box;
  };

  const formSlot = el('div');
  const STANY: [string, string][] = [['nowe', '🆕 Nowa'], ['dodana', '✔ Linia dodana'], ['odrzucona', '✖ Nikt tam nie pływa']];
  const rows = d.prosby.map((r) => {
    const pick = el('select', {}, STANY.map(([v, t]) => el('option', { value: v, selected: r.status === v }, [t])));
    const odp = el('input', { value: r.odpowiedz ?? '', placeholder: 'co kapitan powie graczowi (opcjonalnie)', style: 'width: 18em' });
    const save = btn('💾', async () => {
      await call('admin_port_request', { p_id: r.id, p_status: pick.value, p_odpowiedz: odp.value });
      save.textContent = '✔';
    });
    return el('tr', {}, [
      el('td', {}, [pick, ' ', odp, ' ', save]),
      el('td', {}, [date(r.at)]),
      el('td', {}, [r.player ?? '—']),
      el('td', {}, [`${r.port ?? ''} `, el('small', { className: 'muted' }, [llText(r.lat, r.lon)])]),
      el('td', { style: 'white-space: pre-wrap' }, [r.text]),
      el('td', {}, [btn('➕ Linia', () => formSlot.replaceChildren(lineForm(r)))]),
    ]);
  });
  main.append(el('h3', {}, [`Prośby graczy (${d.prosby.filter((r) => r.status === 'nowe').length} nowych)`]),
    d.prosby.length
      ? el('div', { className: 'scroll' }, [el('table', {}, [el('thead', {}, [el('tr', {}, ['Stan i odpowiedź', 'Kiedy', 'Postać', 'Port', 'Dokąd', ''].map((h) => el('th', {}, [h])))]), el('tbody', {}, rows)])])
      : el('p', {}, ['Brak próśb.']),
    btn('➕ Nowa linia bez prośby', () => formSlot.replaceChildren(lineForm(null))),
    formSlot,
    el('h3', {}, ['Dodane linie']),
  );
  if (!d.linie.length) return void main.append(el('p', {}, ['Jeszcze żadnej.']));
  main.append(el('div', { className: 'scroll' }, [el('table', {}, [
    el('thead', {}, [el('tr', {}, ['Widoczna', 'Tylko test', 'Linia', 'km', 'Porty'].map((h) => el('th', {}, [h])))]),
    el('tbody', {}, d.linie.map((l) => {
      const on = el('input', { type: 'checkbox', checked: l.aktywna, onchange: () => void call('admin_port_line', { p_id: l.id, p_line: { aktywna: on.checked } }) });
      const t = el('input', { type: 'checkbox', checked: l.test, onchange: () => void call('admin_port_line', { p_id: l.id, p_line: { test: t.checked } }) });
      return el('tr', {}, [el('td', {}, [on]), el('td', {}, [t]), el('td', {}, [l.nazwa ?? `${l.a_nazwa} – ${l.b_nazwa}`]), el('td', {}, [String(l.km)]),
        el('td', {}, [el('small', {}, [`${l.a_nazwa} (${llText(l.a_lat, l.a_lon)}) ↔ ${l.b_nazwa} (${llText(l.b_lat, l.b_lon)})`])])]);
    })),
  ])]));
}

/**
 * Creatures: EXP and loot per kind (owner, 26 Oct 2026). Every loot row is rolled on its own: item, amount, chance %.
 * Table `stwory_lup` (docs/sql/stwory-lup.sql); the game reads it at the start (content/stwory.ts), new-fight test only.
 */
async function stworyTab(main: HTMLElement) {
  type U = { exp: number | null; lup: WierszLupu[] };
  main.append(el('h2', {}, ['🐺 Stworki – łup i EXP']), el('p', { className: 'muted' }, [
    'Każdy wiersz łupu losowany osobno: „Złoto 2 – 50 %” i „Złoto 1 – 30 %” razem dają 0, 1, 2 albo 3 złota. Szansa w procentach, można ułamki (0,05 = raz na 2000). ',
    'Puste EXP = domyślne z gry. Bez wierszy łupu stworek daje to, co dawał dotąd. Działa w nowej walce (serwer testowy) od następnego wejścia gracza do gry.',
  ]));
  const box = el('div');
  main.append(box);
  let dane: Record<string, U>;
  try {
    dane = (await call<{ stwory: Record<string, U> }>('admin_stwory', {})).stwory ?? {};
  } catch (e) {
    box.append(el('p', { className: 'msg bad' }, [`Nie udało się wczytać: ${(e as Error).message}`]));
    return;
  }
  try { const v = (await call<{ values: Record<string, number> }>('admin_settings', {})).values; ustawBronie(v); ustawPancerze(v); }
  catch { box.append(el('p', { className: 'msg bad' }, ['Nie udało się odświeżyć zakresów broni; lista pokazuje wartości domyślne.'])); }
  const opcje = lupOpcje();
  const grupy = [...new Set(opcje.map((o) => o.grupa))];
  const wybor = (co: string) => {
    const sel = el('select', { style: 'min-width: 0; max-width: 100%; width: 300px', 'aria-label': 'Przedmiot łupu' });
    if (!opcje.some(o => o.id === co)) sel.append(el('option', { value: co, selected: true }, [`Nieznany przedmiot (${co})`]));
    for (const g of grupy) {
      const og = el('optgroup', { label: g });
      for (const o of opcje.filter((q) => q.grupa === g)) og.append(el('option', { value: o.id, selected: o.id === co }, [o.nazwa]));
      sel.append(og);
    }
    return sel;
  };
  for (const st of STWORY) {
    const u: U = dane[st.id] ?? { exp: null, lup: [] };
    const exp = el('input', { type: 'number', min: '0', max: '100000', step: '1', value: u.exp === null ? '' : String(u.exp), placeholder: String(st.exp), style: 'width: 90px' });
    const wiersze = el('div');
    const msg = el('small', { className: 'muted' }, [u.lup.length || u.exp !== null ? 'ustawione' : 'domyślne z gry']);
    const dodaj = (w: WierszLupu) => {
      const sel = wybor(w.co);
      const ile = el('input', { type: 'number', min: '1', max: '100000', step: '1', value: String(w.ile), style: 'width: 70px', title: 'Ilość' });
      const szansa = el('input', { type: 'number', min: '0', max: '100', step: 'any', value: String(w.szansa), style: 'width: 80px', title: 'Szansa %' });
      const row = el('div', { className: 'lup-wiersz', style: 'display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin: 3px 0' }, [
        sel, el('span', {}, ['×']), ile, el('span', {}, ['szansa']), szansa, el('span', {}, ['%']),
      ]);
      row.append(btn('🗑', () => row.remove()));
      (row as HTMLElement & { odczyt?: () => WierszLupu }).odczyt = () => ({ co: sel.value, ile: Number(ile.value), szansa: Number(String(szansa.value).replace(',', '.')) });
      wiersze.append(row);
    };
    u.lup.forEach(dodaj);
    const zapisz = async () => {
      const lup = [...wiersze.children].map((r) => (r as HTMLElement & { odczyt: () => WierszLupu }).odczyt());
      const zle = lup.find((w) => !(w.ile >= 1 && w.ile <= 100000) || !(w.szansa >= 0 && w.szansa <= 100));
      if (zle) return void ((msg.className = 'msg bad'), (msg.textContent = 'Ilość od 1, szansa od 0 do 100 %.'));
      const e = exp.value.trim() === '' ? null : Math.round(Number(exp.value));
      try {
        await call('admin_stwory_zapisz', { p_rodzaj: st.id, p_exp: e, p_lup: lup });
        msg.className = 'msg ok';
        msg.textContent = 'Zapisane.';
      } catch (err) {
        msg.className = 'msg bad';
        msg.textContent = (err as Error).message;
      }
    };
    box.append(el('div', { className: 'card', style: 'max-width: 720px' }, [
      el('h3', { style: 'margin: 0 0 4px' }, [st.nazwa, el('small', { className: 'muted' }, [`  (${st.id})`])]),
      el('p', { className: 'muted', style: 'margin: 0 0 8px' }, [st.gdzie]),
      el('label', { style: 'display: flex; gap: 8px; align-items: center; margin-bottom: 8px' }, [el('span', {}, ['EXP za pokonanie']), exp, el('small', { className: 'muted' }, [`domyślnie ${st.exp}`])]),
      el('b', {}, ['Łup']),
      wiersze,
      el('div', { style: 'display: flex; gap: 8px; align-items: center; margin-top: 6px; flex-wrap: wrap' }, [
        btn('＋ Dodaj przedmiot', () => dodaj({ co: 'zloto', ile: 1, szansa: 50 })),
        btn('Zapisz', () => void zapisz(), 'b p'),
        msg,
      ]),
    ]));
  }
}

async function bronTab(main: HTMLElement) {
  const field = (label: string, input: HTMLElement) => el('label', { className: 'f' }, [el('span', {}, [label]), input]);
  main.append(el('h2', {}, ['⚔ Repozytorium broni']), el('p', { className: 'muted' }, [
    'Wspólny katalog broni do łupów i nagród. Kijek, miecz treningowy i stalowy mają po pięć jakości ze wspólną grafiką. ',
    'Pozostałe bronie zachowują dotychczasową moc, dopóki nie nadasz im zakresu. Bonus: +2% za poziom postaci ponad pierwszy i +6% za poziom wyszkolenia ponad początkowy. Zmiany od następnego wejścia do gry.',
  ]));
  let values: Record<string, number>;
  try { values = (await call<{ values: Record<string, number> }>('admin_settings', {})).values; ustawBronie(values); }
  catch (e) { main.append(el('p', { className: 'msg bad' }, [`Nie udało się wczytać: ${(e as Error).message}`])); return; }
  const search = el('input', { type: 'search', placeholder: 'Szukaj broni lub jakości', 'aria-label': 'Szukaj broni', style: 'width: 100%; max-width: 500px' });
  const list = el('div'); main.append(search, list);
  for (const p of bronie()) {
    const range = p.obrazenia;
    const min = el('input', { type: 'number', min: '1', max: '10000', step: '1', value: range ? String(range[0]) : '', 'aria-label': 'Minimum obrażeń', style: 'width: 90px' });
    const max = el('input', { type: 'number', min: '1', max: '10000', step: '1', value: range ? String(range[1]) : '', 'aria-label': 'Maksimum obrażeń', style: 'width: 90px' });
    const msg = el('small', { className: 'muted' }, [range ? `Obrażenia ${range.join('–')}` : `Dotychczasowa moc: ${p.moc}`]);
    const save = btn('Zapisz zakres', async () => {
      try {
        const n = kodujZakres(Number(min.value), Number(max.value)); save.disabled = true;
        await call('admin_set_setting', { p_k: kluczBroni(p.id), p_v: n });
        values[kluczBroni(p.id)] = n; ustawBronie(values); msg.className = 'msg ok'; msg.textContent = `Zapisane: ${min.value}–${max.value}.`;
      } catch (e) { msg.className = 'msg bad'; msg.textContent = (e as Error).message; }
      finally { save.disabled = false; }
    }, 'b p');
    const reset = btn('Przywróć domyślne', async () => {
      reset.disabled = true;
      try { await call('admin_set_setting', { p_k: kluczBroni(p.id), p_v: null }); delete values[kluczBroni(p.id)]; ustawBronie(values);
        min.value = p.obrazenia ? String(p.obrazenia[0]) : ''; max.value = p.obrazenia ? String(p.obrazenia[1]) : '';
        msg.className = 'msg ok'; msg.textContent = 'Przywrócono domyślne.';
      } catch (e) { msg.className = 'msg bad'; msg.textContent = (e as Error).message; }
      finally { reset.disabled = false; }
    });
    const life = el('input', { type: 'number', min: '1', max: '1000000', step: '1', value: p.wytrzymalosc ? String(p.wytrzymalosc) : '', 'aria-label': 'Wytrzymałość broni', style: 'width: 110px', placeholder: 'bez zużycia' });
    const saveLife = btn('Zapisz wytrzymałość', async () => {
      try {
        const n = life.value.trim() === '' ? null : Number(life.value);
        if (n !== null && (!Number.isInteger(n) || n < 1 || n > 1000000)) throw new Error('Wytrzymałość: od 1 do 1000000.');
        saveLife.disabled = true;
        await call('admin_set_setting', { p_k: kluczTrwalosci(p.id), p_v: n });
        if (n === null) delete values[kluczTrwalosci(p.id)]; else values[kluczTrwalosci(p.id)] = n;
        ustawBronie(values); life.value = p.wytrzymalosc ? String(p.wytrzymalosc) : '';
        msg.className = 'msg ok'; msg.textContent = `Wytrzymałość zapisana: ${p.wytrzymalosc ?? 'bez zużycia'}.`;
      } catch (e) { msg.className = 'msg bad'; msg.textContent = (e as Error).message; }
      finally { saveLife.disabled = false; }
    });
    const icon = itemIcon(p.id);
    if (icon) { icon.width = 40; icon.height = 40; icon.style.imageRendering = 'pixelated'; }
    const card = el('div', { className: 'card', 'data-weapon': p.id }, [el('h3', { className: 'row' }, [icon, p.nazwa]),
      el('p', { className: 'muted' }, [`${UMIEJETNOSCI[p.rodzaj === 'magia' ? 'magia' : p.rodzaj === 'luk' ? 'luk' : 'miecz'].nazwa} · Wytrzymałość: ${p.wytrzymalosc ?? 'nie zużywa się'} · ID: ${p.id}`]),
      el('div', { className: 'row' }, [field('Minimum obrażeń', min), field('Maksimum obrażeń', max), save, reset]),
      el('div', { className: 'row' }, [field('Wytrzymałość (puste = domyślna)', life), saveLife]), msg,
    ]);
    list.append(card);
  }
  search.oninput = () => { const q = search.value.toLocaleLowerCase('pl'); for (const card of list.children) (card as HTMLElement).hidden = !card.textContent?.toLocaleLowerCase('pl').includes(q); };
}

async function pancerzTab(main: HTMLElement) {
  main.append(el('h2', {}, ['🛡 Repozytorium pancerzy']), el('p', { className: 'muted' }, [
    'Zbroje, hełmy i buty. Pancerz założonych elementów sumuje się i osłabia ciosy fizyczne. Magia i trucizny go pomijają. ',
    'Pięć jakości dzieli grafikę. Łup i losową jakość ustawisz w zakładce Stworki. Zmiany od następnego wejścia do gry.',
  ]));
  let values: Record<string, number>;
  try { values = (await call<{ values: Record<string, number> }>('admin_settings', {})).values; ustawPancerze(values); }
  catch (e) { main.append(el('p', { className: 'msg bad' }, [(e as Error).message])); return; }
  const search = el('input', { type: 'search', placeholder: 'Szukaj pancerza lub jakości', 'aria-label': 'Szukaj pancerza' });
  const list = el('div'); main.append(search, list);
  for (const p of pancerze()) {
    const value = el('input', { type: 'number', min: '0', max: '10000', step: '1', value: String(p.moc), 'aria-label': 'Pancerz', style: 'width: 110px' });
    const msg = el('small', { className: 'muted' });
    const set = async (n: number | null) => {
      try {
        if (n !== null && (!Number.isInteger(n) || n < 0 || n > 10000)) throw new Error('Pancerz: liczba całkowita od 0 do 10000.');
        save.disabled = reset.disabled = true;
        await call('admin_set_setting', { p_k: kluczPancerza(p.id), p_v: n });
        if (n === null) delete values[kluczPancerza(p.id)]; else values[kluczPancerza(p.id)] = n;
        ustawPancerze(values); value.value = String(p.moc);
        msg.className = 'msg ok'; msg.textContent = `Zapisane. Pancerz: ${p.moc}.`;
      } catch (e) { msg.className = 'msg bad'; msg.textContent = (e as Error).message; }
      finally { save.disabled = reset.disabled = false; }
    };
    const save = btn('Zapisz pancerz', () => { if (value.value.trim() === '') { msg.textContent = 'Wpisz wartość pancerza.'; return; } void set(Number(value.value)); }, 'b p');
    const reset = btn('Przywróć domyślne', () => void set(null));
    const icon = itemIcon(p.id); if (icon) { icon.width = 64; icon.height = 64; }
    list.append(el('div', { className: 'card', 'data-armour': p.id }, [
      el('h3', { className: 'row' }, [icon, p.nazwa]), el('p', { className: 'muted' }, [`ID: ${p.id}`]),
      el('div', { className: 'row' }, [el('label', { className: 'f' }, [el('span', {}, ['Pancerz']), value]), save, reset]), msg,
    ]));
  }
  search.oninput = () => { const q = search.value.toLocaleLowerCase('pl'); for (const card of list.children) (card as HTMLElement).hidden = !card.textContent?.toLocaleLowerCase('pl').includes(q); };
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

/**
 * 🧩 Łamigłówki (owner, 12 Oct 2026): the newspaper's puzzle of the day. The game makes the puzzles itself from
 * the date (the same for everyone on one difficulty level), so this tab shows any day's five puzzles with their
 * solutions, and how many players solved them (RPC admin_lamiglowki; test characters counted apart).
 */
async function puzzlesTab(main: HTMLElement) {
  main.append(el('h2', {}, ['Łamigłówka dnia (Kurier Parowy)']), el('p', { className: 'muted' }, [
    `Codziennie jeden rodzaj dla wszystkich (sudoku 6×6, kakuro, matematyczna krzyżówka, najkrótsza trasa, królowe – od 15.10.2026), a łamigłówka według poziomu trudności postaci. Za rozwiązanie ${LAMIGLOWKA.nagrodaExp} EXP raz dziennie. Losowanie nagród jeszcze nie działa.`,
  ]));
  const stats = el('div');
  main.append(stats);
  try {
    type Dzien = { dzien: string; rodzaj: string; ile: number; graczy: number; poziomy: number[]; mediana: number | null };
    type Ost = { name: string; dzien: string; poziom: number; sekundy: number | null; at: string; test: boolean };
    const r = await call<{ dni: Dzien[]; ostatni: Ost[] }>('admin_lamiglowki', {});
    const czas = (s: number | null) => (s == null ? '—' : s < 120 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`);
    stats.append(el('h3', {}, ['Rozwiązania (30 dni)']), r.dni.length ? el('div', { className: 'scroll' }, [el('table', {}, [
      el('thead', {}, [el('tr', {}, ['Dzień', 'Rodzaj', 'Graczy', 'Razem z testowymi', ...TRUDNOSCI.map((t) => t.nazwa), 'Mediana czasu'].map((h) => el('th', {}, [h])))]),
      el('tbody', {}, r.dni.map((d) => el('tr', {}, [d.dzien, LAMIGLOWKA.nazwy[d.rodzaj]?.pl ?? d.rodzaj, String(d.graczy), String(d.ile), ...d.poziomy.map(String), czas(d.mediana)].map((t) => el('td', {}, [t]))))),
    ])]) : el('p', {}, ['Nikt jeszcze nie rozwiązał łamigłówki.']));
    if (r.ostatni.length) stats.append(el('h3', {}, ['Ostatnio rozwiązali']), el('div', { className: 'scroll' }, [el('table', {}, [
      el('thead', {}, [el('tr', {}, ['Kiedy', 'Postać', 'Poziom', 'Czas'].map((h) => el('th', {}, [h])))]),
      el('tbody', {}, r.ostatni.map((o) => el('tr', {}, [date(o.at), `${o.name ?? '—'}${o.test ? ' (testowa)' : ''}`, TRUDNOSCI[o.poziom]?.nazwa ?? String(o.poziom), czas(o.sekundy)].map((t) => el('td', {}, [t]))))),
    ])]));
  } catch (e) {
    stats.append(el('p', { className: 'bad' }, [(e as Error).message]));
  }
  const pick = el('input', { type: 'date', value: dzienLamiglowki() });
  const out = el('div');
  const show = () => {
    const d = pick.value;
    out.replaceChildren(el('p', {}, [`${d}: ${LAMIGLOWKA.nazwy[rodzajDnia(d)].pl}`]));
    for (let p = 0; p < 5; p++) {
      out.append(el('h3', {}, [`${TRUDNOSCI[p].nazwa} – ${POZIOMY_LAMIGLOWEK[p].pl}`]), el('div', { style: 'display:flex;gap:24px;flex-wrap:wrap' }, [
        el('div', {}, [el('p', { className: 'muted' }, ['Łamigłówka']), el('pre', { className: 'dialog' }, [puzzleText(lamiglowkaDnia(d, p), false)])]),
        el('div', {}, [el('p', { className: 'muted' }, ['Rozwiązanie']), el('pre', { className: 'dialog' }, [puzzleText(lamiglowkaDnia(d, p), true)])]),
      ]));
    }
  };
  pick.onchange = show;
  main.append(el('h3', {}, ['Podgląd łamigłówek']), el('p', {}, ['Dzień: ', pick]), out);
  show();
}

/** A puzzle as monospaced text (· = empty, ▓ = black, kakuro clues as down\right). */
function puzzleText(z: Lamiglowka, rozw: boolean): string {
  const pad = (s: string, n: number) => s.padStart(n);
  if (z.rodzaj === 'sudoku') return (rozw ? z.rozw : z.dane).map((w, r) => w.map((v, c) => `${v || '·'}${c === 2 ? ' |' : ''}`).join(' ') + (r % 2 === 1 && r < 5 ? '\n------+------' : '')).join('\n');
  if (z.rodzaj === 'kakuro') return z.siatka.map((w, r) => w.map((k, c) => pad(k === 'b' ? String(rozw || z.dane[r][c] ? z.rozw[r][c] : '·') : k ? `${k.d || ''}\\${k.p || ''}` : '▓', 6)).join('')).join('\n');
  if (z.rodzaj === 'krzyzowka') {
    const L = rozw ? z.rozw.liczby : z.liczby, W = rozw ? z.rozw.wiersze : z.wiersze, K = rozw ? z.rozw.kolumny : z.kolumny;
    const lines: string[] = [];
    for (let r = 0; r < z.n; r++) {
      lines.push(L[r].map((v, c) => pad(v == null ? '·' : String(v), 4) + (c < z.n - 1 ? ` ${W[r][c] ?? '·'}` : '')).join('') + ` = ${z.wynikiW[r]}`);
      if (r < z.n - 1) lines.push(K[r].map((o) => pad(o ?? '·', 4) + '  ').join(''));
    }
    lines.push(z.wynikiK.map(() => pad('=', 4) + '  ').join(''), z.wynikiK.map((v) => pad(String(v), 4) + '  ').join(''));
    return lines.join('\n');
  }
  if (z.rodzaj === 'krolowe') {
    // Areas as letters; the solution's queens as ♛.
    return z.obszary.map((w, r) => w.map((o, c) => (rozw && z.rozw[r] === c ? '♛' : String.fromCharCode(65 + o))).join(' ')).join('\n');
  }
  const on = new Set(z.przyklad.map(([r, c]) => r * 100 + c));
  return z.pola.map((w, r) => w.map((v, c) => (rozw && on.has(r * 100 + c) ? `[${v}]` : ` ${v} `)).join('')).join('\n') + (rozw ? `\nNajkrótsza: ${z.najkrotsza} m` : '');
}
