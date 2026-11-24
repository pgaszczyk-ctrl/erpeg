// Panel admina: własne przedmioty (zakładka „🎒 Przedmioty”) i repozytorium umiejętności („✨ Umiejętności”).
// Właściciel, 24.11.2026: „w drugiej zakładce tworzyć przedmioty (ładować zdjęcie od grafika, ustalać statystyki);
// unikalne lub epickie, lub magiczne mogą mieć swoją nazwę; osobna zakładka na skille – jako repozytorium dostępnych”.
// Obrazek od grafika przerabia sama przeglądarka przy wgrywaniu (przerobObrazek): przycina puste brzegi, robi
// kwadrat, duży 256 px (karta przedmiotu, sklep) i mały 64 px (plecak, przedmiot leżący na ziemi w grze).
import { PRZEDMIOTY, MIEJSCA, UMIEJETNOSCI as BRONIE, type Miejsce } from '../content/przedmioty';
import { UMIEJETNOSCI } from '../content/umiejetnosci';
import { RZADKOSCI, type Rzadkosc } from '../content/rzadkosc';
import { AMUNICJA, type Amunicja } from '../content/zuzycie';
import { ATAKI } from '../content/atakiTurowe';
import { ustawWlasne, type DanePrzedmiotu, type WpisPrzedmiotu } from '../content/przedmiotyWlasne';

type El = <K extends keyof HTMLElementTagNameMap>(tag: K, props?: Record<string, unknown>, children?: (Node | string | null | false)[]) => HTMLElementTagNameMap[K];
export interface Narzedzia {
  el: El;
  btn: (text: string, onclick: () => void, cls?: string) => HTMLButtonElement;
  call: <T>(fn: string, args: Record<string, unknown>) => Promise<T>;
}

type Wpis = WpisPrzedmiotu & { updated_at?: string };

const MIEJSCA_WLASNE: [DanePrzedmiotu['miejsce'], string][] = [
  ['bron', 'Broń (ręka główna)'], ['dystans', 'Druga ręka (tarcza, kula, księga)'], ['zbroja', 'Zbroja'], ['helm', 'Hełm / nakrycie głowy'],
  ['buty', 'Buty'], ['amulet', 'Amulet'], ['talizman', 'Talizman'],
];
const RZADKOSCI_WLASNE: Rzadkosc[] = ['zwykly', 'niepospolity', 'rzadki', 'epicki', 'unikat'];
const EFEKTY: [string, string][] = [
  ['', '— bez mocy specjalnej —'],
  ['swiatlo', 'Światło: świeci, widać o połowę dalej (broń)'],
  ['pioruny', 'Pioruny: sam razi wrogów w pobliżu (broń)'],
  ['szczescie', 'Szczęście: +10% monet z potworów i band (talizman)'],
  ['szybkosc', 'Szybkość: +4% chodu (talizman)'],
  ['zycie', 'Życie: +1 serce (dowolne miejsce)'],
  ['celnosc', 'Celność: +10% trafień (dowolne miejsce)'],
  ['obrona', 'Obrona: talizman liczony do pancerza (jego „Pancerz”)'],
];

/** Kawałek nazwy na id: „Ognisty Miecz Smoka” → w_ognisty_miecz_smoka. */
export function idZNazwy(nazwa: string) {
  const s = nazwa.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 36);
  return `w_${s || 'przedmiot'}`;
}

// ------------------------------------------------------------------ obrazek

function zaladuj(file: Blob): Promise<HTMLImageElement> {
  return new Promise((ok, no) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(url); no(new Error('To nie jest obrazek, który przeglądarka umie otworzyć (PNG, WebP, JPG).')); };
    img.src = url;
  });
}

function plotno(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/** Zmniejsza po połowie aż do celu – jednym skokiem z 1254 px na 64 px wychodzi kasza. */
function zmniejsz(src: HTMLCanvasElement, size: number, piksel: boolean): HTMLCanvasElement {
  let cur = src;
  if (!piksel) while (cur.width / 2 >= size) {
    const n = plotno(Math.round(cur.width / 2), Math.round(cur.height / 2));
    const g = n.getContext('2d')!;
    g.imageSmoothingQuality = 'high';
    g.drawImage(cur, 0, 0, n.width, n.height);
    cur = n;
  }
  const out = plotno(size, size);
  const g = out.getContext('2d')!;
  g.imageSmoothingEnabled = !piksel;
  g.imageSmoothingQuality = 'high';
  g.drawImage(cur, 0, 0, size, size);
  if (piksel) return out;
  // Twarda przezroczystość: półprzezroczysty pył na brzegach znika, prawie pełne piksele stają się pełne.
  const d = g.getImageData(0, 0, size, size);
  for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] < 14 ? 0 : d.data[i] > 240 ? 255 : d.data[i];
  g.putImageData(d, 0, 0);
  return out;
}

/**
 * Plik od grafika → { maly 64 px PNG, duzy 256 px WebP/PNG }. Przycina puste brzegi; obrazek bez przezroczystości
 * z jednolitym tłem w rogach (np. biały JPG) dostaje to tło wycięte. `piksel` = piksel-art: bez wygładzania.
 */
export async function przerobObrazek(file: Blob, piksel: boolean) {
  const img = await zaladuj(file);
  const W = img.naturalWidth, H = img.naturalHeight;
  if (!W || !H) throw new Error('Pusty obrazek.');
  const src = plotno(W, H), g = src.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, W, H), px = d.data;
  let przezroczyste = false;
  for (let i = 3; i < px.length; i += 4 * 7) if (px[i] < 250) { przezroczyste = true; break; }
  if (!przezroczyste) {
    const rogi = [0, (W - 1) * 4, (H - 1) * W * 4, ((H - 1) * W + W - 1) * 4];
    const [r, gg, b] = [0, 1, 2].map((k) => rogi.reduce((a, i) => a + px[i + k], 0) / 4);
    const podobne = rogi.every((i) => Math.abs(px[i] - r) + Math.abs(px[i + 1] - gg) + Math.abs(px[i + 2] - b) < 30);
    if (podobne) {
      for (let i = 0; i < px.length; i += 4) {
        const dist = Math.abs(px[i] - r) + Math.abs(px[i + 1] - gg) + Math.abs(px[i + 2] - b);
        if (dist < 36) px[i + 3] = 0;
        else if (dist < 60) px[i + 3] = Math.round(255 * (dist - 36) / 24);
      }
      g.putImageData(d, 0, 0);
    }
  }
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 16) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) throw new Error('Obrazek jest cały przezroczysty.');
  const bok = Math.max(x1 - x0 + 1, y1 - y0 + 1);
  const margines = piksel ? Math.max(1, Math.round(bok / 16)) : Math.round(bok * 0.06);
  const S = bok + 2 * margines;
  const kw = plotno(S, S), kg = kw.getContext('2d')!;
  kg.imageSmoothingEnabled = false;
  kg.drawImage(src, x0, y0, x1 - x0 + 1, y1 - y0 + 1, Math.round((S - (x1 - x0 + 1)) / 2), Math.round((S - (y1 - y0 + 1)) / 2), x1 - x0 + 1, y1 - y0 + 1);
  const duzy = zmniejsz(kw, 256, piksel);
  const maly = zmniejsz(piksel ? kw : duzy, 64, piksel);
  let duzyUrl = duzy.toDataURL('image/webp', 0.9);
  if (!duzyUrl.startsWith('data:image/webp')) duzyUrl = duzy.toDataURL('image/png');
  return { maly: maly.toDataURL('image/png'), duzy: duzyUrl, zrodlo: `${W}×${H} px` };
}

// ------------------------------------------------------------------ zakładka przedmiotów

/** Zakładka „🎒 Przedmioty”: lista własnych przedmiotów i formularz tworzenia/edycji. */
export async function przedmiotyTab(main: HTMLElement, t: Narzedzia) {
  const { el, btn, call } = t;
  main.append(el('h2', {}, ['🎒 Przedmioty']), el('p', { className: 'muted' }, [
    'Twoje przedmioty: unikaty, epiki, nagrody. Wgraj obrazek od grafika (najlepiej duży PNG z przezroczystym tłem) – panel sam przytnie go ',
    'i zrobi wersję do karty przedmiotu, do plecaka i do leżenia na ziemi w grze. Gotowy przedmiot wybierzesz w zakładce Łup, w nagrodach misji i w tajnych hasłach. ',
    'Do sklepów nie trafia. Zmiany widać od następnego wejścia gracza do gry.',
  ]));
  const lista = el('div'), forma = el('div');
  main.append(btn('＋ Nowy przedmiot', () => edytuj(null), 'b p'), forma, el('h3', {}, ['Gotowe przedmioty']), lista);
  let wpisy: Wpis[] = [];

  const wczytaj = async () => {
    wpisy = (await call<{ przedmioty: Wpis[] }>('admin_przedmioty', {})).przedmioty ?? [];
    ustawWlasne(wpisy);
    lista.replaceChildren(...(wpisy.length ? wpisy.map(karta) : [el('p', { className: 'muted' }, ['Jeszcze żadnego. Kliknij „Nowy przedmiot”.'])]));
  };

  const opisStat = (d: DanePrzedmiotu) => {
    const out: string[] = [MIEJSCA[d.miejsce as Miejsce] ?? d.miejsce];
    if (d.miejsce === 'bron') {
      out.push(d.rodzaj === 'luk' ? 'łuk' : d.rodzaj === 'magia' ? 'magia' : 'wręcz', `obrażenia ${d.obrazenia?.join('–') ?? '?'}`, `wymaga poz. ${d.wymaganySkill ?? 1}`);
    } else if (d.moc) out.push(d.rodzaj === 'magia' ? `moc czarów +${d.moc}` : `pancerz ${d.moc}`);
    if (d.wytrzymalosc) out.push(`wytrzymałość ${d.wytrzymalosc}`);
    if (d.umiejetnosc) out.push(`umiejętność: ${UMIEJETNOSCI.find((u) => u.id === d.umiejetnosc)?.nazwa ?? d.umiejetnosc}`);
    if (d.efekt) out.push(`moc: ${d.efekt}`);
    if (d.bieg) out.push(`chód +${Math.round(d.bieg * 100)}%`);
    return out.join(' · ');
  };

  const karta = (w: Wpis) => {
    const r = RZADKOSCI[w.dane.rzadkosc ?? 'zwykly'];
    const img = el('img', { src: w.ikona_hd ?? w.ikona ?? '', width: 64, height: 64, alt: '', style: `background: #0003; border-radius: 6px; box-shadow: 0 0 10px ${r.css}` });
    return el('div', { className: 'card', 'data-wlasny': w.id }, [
      el('div', { className: 'row' }, [img, el('div', { style: 'flex: 1 1 260px' }, [
        el('h3', { style: `margin: 0; color: ${r.css}` }, [w.dane.nazwa.pl, el('small', { className: 'muted' }, [`  ${r.nazwa}${w.dane.nazwa.en ? ` · EN: ${w.dane.nazwa.en}` : ''}`])]),
        el('p', { className: 'muted', style: 'margin: 4px 0' }, [opisStat(w.dane)]),
        el('small', { className: 'muted' }, [`ID: ${w.id} · ${w.aktywny === false ? '⏸ wyłączony (nie wypada z łupów)' : 'aktywny'} · ${w.tylko_test ? 'tylko serwer testowy' : 'test i produkcja'}`]),
      ]), btn('✎ Edytuj', () => edytuj(w))]),
    ]);
  };

  function edytuj(w: Wpis | null) {
    const d: DanePrzedmiotu = w ? structuredClone(w.dane) : { nazwa: { pl: '' }, miejsce: 'bron', rzadkosc: 'epicki', obrazenia: [5, 8], wymaganySkill: 1 };
    let obrazek: { maly: string; duzy: string } | null = w?.ikona ? { maly: w.ikona, duzy: w.ikona_hd ?? w.ikona } : null;
    let nowyObrazek = false;
    const pole = (label: string, input: HTMLElement, rada?: string) => el('label', { className: 'f', style: 'flex: 1 1 200px' }, [el('span', {}, [label]), input, rada ? el('small', { className: 'muted' }, [rada]) : null]);
    const tekst = (v = '', max = 60) => el('input', { type: 'text', value: v, maxLength: max });
    const liczba = (v: number | undefined, min: number, max: number, step = '1') => el('input', { type: 'number', min: String(min), max: String(max), step, value: v === undefined ? '' : String(v), style: 'width: 110px' });
    const wybor = (opcje: [string, string][], v: string | undefined) => el('select', {}, opcje.map(([k, n]) => el('option', { value: k, selected: k === (v ?? '') }, [n])));

    const nazwaPl = tekst(d.nazwa.pl), nazwaEn = tekst(d.nazwa.en ?? '');
    const opisPl = el('textarea', { value: d.opis?.pl ?? '', maxLength: 300, rows: 2 }), opisEn = el('textarea', { value: d.opis?.en ?? '', maxLength: 300, rows: 2 });
    const rzadkosc = wybor(RZADKOSCI_WLASNE.map((r) => [r, RZADKOSCI[r].nazwa]), d.rzadkosc ?? 'zwykly');
    const miejsce = wybor(MIEJSCA_WLASNE, d.miejsce);
    const rodzaj = wybor([['', 'zwykła'], ['luk', 'łuk / kusza / pistolet'], ['magia', 'magia']], d.rodzaj);
    const amunicja = wybor((Object.keys(AMUNICJA) as Amunicja[]).map((a) => [a, AMUNICJA[a].nazwa]), d.amunicja ?? 'strzaly');
    const wyglad = wybor([['miecz', 'miecz'], ['szabla', 'szabla'], ['galaz', 'kij / pałka']], d.wyglad ?? 'miecz');
    const min = liczba(d.obrazenia?.[0], 1, 10000), max = liczba(d.obrazenia?.[1], 1, 10000);
    const wymaga = liczba(d.wymaganySkill, 1, 20);
    const moc = liczba(d.moc, 0, 10000);
    const trwa = liczba(d.wytrzymalosc, 1, 1000000);
    const cena = liczba(d.cena, 0, 10000000);
    const bieg = liczba(d.bieg ? Math.round(d.bieg * 100) : undefined, 0, 100);
    const efekt = wybor(EFEKTY, d.efekt);
    const umiej = el('select');
    const aktywny = el('input', { type: 'checkbox', checked: w ? w.aktywny !== false : true });
    const tylkoTest = el('input', { type: 'checkbox', checked: w ? !!w.tylko_test : true });
    const plik = el('input', { type: 'file', accept: 'image/png,image/webp,image/jpeg' });
    const piksel = el('input', { type: 'checkbox' });
    const podglad = el('div', { className: 'row', style: 'align-items: flex-end; gap: 18px; margin: 6px 0' });
    const msg = el('p', { className: 'msg' });

    const bronRodzaj = () => (rodzaj.value === 'luk' ? 'luk' : rodzaj.value === 'magia' ? 'magia' : 'miecz');
    const odswiezUmiej = () => {
      const jest = miejsce.value === 'bron' ? UMIEJETNOSCI.filter((u) => u.bron === bronRodzaj()) : UMIEJETNOSCI;
      const v = umiej.value || d.umiejetnosc || '';
      umiej.replaceChildren(el('option', { value: '' }, ['— żadna —']), ...jest.map((u) => el('option', { value: u.id, selected: u.id === v }, [`${u.ikona} ${u.nazwa} (${BRONIE[u.bron].nazwa}${u.poziom ? `, normalnie od poz. ${u.poziom}` : ''})`])));
    };
    const rysujPodglad = () => {
      const kolor = RZADKOSCI[rzadkosc.value as Rzadkosc].css;
      if (!obrazek) return void podglad.replaceChildren(el('small', { className: 'muted' }, ['Brak obrazka – w grze pokaże się zastępcza ikonka.']));
      const tlo = (img: HTMLImageElement, opis: string) => el('figure', { style: 'margin: 0; text-align: center' }, [img, el('figcaption', { className: 'muted', style: 'font-size: 12px' }, [opis])]);
      podglad.replaceChildren(
        tlo(el('img', { src: obrazek.duzy, width: 128, height: 128, style: 'background: #2a2118; border-radius: 6px' }), 'karta przedmiotu'),
        tlo(el('img', { src: obrazek.duzy, width: 48, height: 48, style: 'background: #3a2d20; border: 2px solid #8a6a3a' }), 'plecak'),
        tlo(el('img', { src: obrazek.maly, width: 20, height: 20, style: `image-rendering: pixelated; background: #4f6b3a; padding: 10px; filter: drop-shadow(0 0 4px ${kolor})` }), 'na ziemi w grze (z poświatą rzadkości)'),
      );
    };
    const widocznosc = () => {
      const bron = miejsce.value === 'bron', druga = miejsce.value === 'dystans';
      const pokaz = (e: HTMLElement, v: boolean) => { e.parentElement!.style.display = v ? '' : 'none'; };
      pokaz(rodzaj, bron || druga);
      pokaz(amunicja, bron && rodzaj.value === 'luk');
      pokaz(wyglad, bron && !rodzaj.value);
      for (const e of [min, max, wymaga]) pokaz(e, bron);
      pokaz(moc, !bron);
      (moc.parentElement!.firstChild as HTMLElement).textContent = druga && rodzaj.value === 'magia' ? 'Moc czarów (dodaje się do różdżki)' : 'Pancerz';
      odswiezUmiej();
    };
    miejsce.onchange = rodzaj.onchange = widocznosc;
    rzadkosc.onchange = rysujPodglad;
    const przerob = async () => {
      const f = plik.files?.[0];
      if (!f) return;
      msg.className = 'msg'; msg.textContent = 'Przerabiam obrazek…';
      try {
        const o = await przerobObrazek(f, piksel.checked);
        obrazek = o; nowyObrazek = true;
        msg.className = 'msg ok'; msg.textContent = `Obrazek gotowy (oryginał ${o.zrodlo}). Zapisz przedmiot, żeby trafił do gry.`;
        rysujPodglad();
      } catch (e) { msg.className = 'msg bad'; msg.textContent = (e as Error).message; }
    };
    plik.onchange = () => void przerob();
    piksel.onchange = () => void przerob();

    const zapisz = async () => {
      msg.className = 'msg bad';
      const nazwa = nazwaPl.value.trim();
      if (!nazwa) return void (msg.textContent = 'Wpisz nazwę.');
      const m = miejsce.value as DanePrzedmiotu['miejsce'];
      const n = (e: HTMLInputElement) => (e.value.trim() === '' ? undefined : Number(e.value));
      const dane: DanePrzedmiotu = { nazwa: { pl: nazwa, ...(nazwaEn.value.trim() ? { en: nazwaEn.value.trim() } : {}) }, miejsce: m, rzadkosc: rzadkosc.value as Rzadkosc };
      if (opisPl.value.trim()) dane.opis = { pl: opisPl.value.trim(), ...(opisEn.value.trim() ? { en: opisEn.value.trim() } : {}) };
      if ((m === 'bron' || m === 'dystans') && rodzaj.value) dane.rodzaj = rodzaj.value as 'luk' | 'magia';
      if (m === 'bron') {
        const a = n(min), b = n(max);
        if (!a || !b || a > b) return void (msg.textContent = 'Obrażenia: minimum i maksimum (minimum nie większe).');
        dane.obrazenia = [Math.round(a), Math.round(b)];
        dane.wymaganySkill = Math.round(n(wymaga) ?? 1);
        if (dane.rodzaj === 'luk') dane.amunicja = amunicja.value as Amunicja;
        if (!dane.rodzaj) dane.wyglad = wyglad.value as DanePrzedmiotu['wyglad'];
      } else if (n(moc) !== undefined) dane.moc = Math.round(n(moc)!);
      if (n(trwa)) dane.wytrzymalosc = Math.round(n(trwa)!);
      if (n(cena)) dane.cena = Math.round(n(cena)!);
      if (umiej.value) dane.umiejetnosc = umiej.value;
      if (efekt.value) dane.efekt = efekt.value as DanePrzedmiotu['efekt'];
      if (n(bieg)) dane.bieg = n(bieg)! / 100;
      let id = w?.id ?? idZNazwy(nazwa);
      if (!w) { const baza = id.slice(0, 36); let i = 2; while (wpisy.some((x) => x.id === id) || PRZEDMIOTY.some((p) => p.id === id && !p.wlasny)) id = `${baza}_${i++}`; }
      try {
        await call('admin_przedmiot_zapisz', {
          p_id: id, p_dane: dane, p_ikona: nowyObrazek ? obrazek?.maly ?? null : null, p_ikona_hd: nowyObrazek ? obrazek?.duzy ?? null : null,
          p_aktywny: aktywny.checked, p_tylko_test: tylkoTest.checked,
        });
        forma.replaceChildren(el('p', { className: 'msg ok' }, [`Zapisane: ${nazwa} (${id}).`]));
        await wczytaj();
      } catch (e) { msg.textContent = (e as Error).message; }
    };

    forma.replaceChildren(el('div', { className: 'card', style: 'max-width: 860px; border-color: #c9a227' }, [
      el('h3', { style: 'margin-top: 0' }, [w ? `✎ ${w.dane.nazwa.pl}` : '＋ Nowy przedmiot']),
      el('b', {}, ['Obrazek']),
      el('div', { className: 'row' }, [plik, el('label', { className: 'row', style: 'gap: 4px' }, [piksel, 'piksel-art (ostre krawędzie, bez wygładzania)'])]),
      podglad,
      el('div', { className: 'row' }, [pole('Nazwa (PL)', nazwaPl), pole('Nazwa (EN)', nazwaEn, 'puste = polska')]),
      el('div', { className: 'row' }, [pole('Opis (PL)', opisPl), pole('Opis (EN)', opisEn)]),
      el('div', { className: 'row' }, [pole('Rzadkość', rzadkosc, 'kolor poświaty; epicki i unikat mają słup światła'), pole('Miejsce', miejsce), pole('Rodzaj', rodzaj), pole('Amunicja', amunicja), pole('Wygląd w ręku ludzika', wyglad, 'kształt rysuje kod')]),
      el('div', { className: 'row' }, [pole('Obrażenia – minimum', min), pole('Obrażenia – maksimum', max), pole('Wymagane wyszkolenie broni', wymaga, '1–20 (Krzepa / Celność / Skupienie)'), pole('Pancerz', moc)]),
      el('div', { className: 'row' }, [pole('Wytrzymałość', trwa, 'puste = nie zużywa się'), pole('Cena skupu', cena, 'tyle płaci sklep/warsztat przy sprzedaży'), pole('Szybszy chód (%)', bieg)]),
      el('div', { className: 'row' }, [pole('Umiejętność z przedmiotu', umiej, 'póki noszony: dostępna od razu, bez wymaganego poziomu'), pole('Moc specjalna', efekt)]),
      el('div', { className: 'row' }, [
        el('label', { className: 'row', style: 'gap: 4px' }, [aktywny, 'aktywny (wypada z łupów)']),
        el('label', { className: 'row', style: 'gap: 4px' }, [tylkoTest, 'tylko serwer testowy']),
      ]),
      msg,
      el('div', { className: 'row' }, [btn('💾 Zapisz przedmiot', () => void zapisz(), 'b p'), btn('Anuluj', () => forma.replaceChildren())]),
    ]));
    widocznosc();
    rysujPodglad();
    forma.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  try { await wczytaj(); }
  catch (e) { lista.replaceChildren(el('p', { className: 'msg bad' }, [`Nie udało się wczytać: ${(e as Error).message}`])); }
}

// ------------------------------------------------------------------ zakładka umiejętności

/** Zakładka „✨ Umiejętności”: co jest w grze (z kodu) i notatnik pomysłów do zrobienia z programistą. */
export async function umiejetnosciTab(main: HTMLElement, t: Narzedzia) {
  const { el, btn, call } = t;
  main.append(el('h2', {}, ['✨ Umiejętności']), el('p', { className: 'muted' }, [
    'Każda umiejętność ma własną fizykę (łańcuch piorunów skacze między wrogami, kula ognia wybucha), więc nowe robimy razem w kodzie. ',
    'Tu widać, co już jest w grze – te możesz przypisać przedmiotom w zakładce Przedmioty – i notatnik pomysłów na kolejne.',
  ]));
  const nosza = (id: string) => PRZEDMIOTY.filter((p) => p.umiejetnosc === id).map((p) => p.nazwa);
  main.append(el('h3', {}, ['W grze – przycisk specjalny (walka na żywo)']), el('div', { className: 'scroll' }, [el('table', {}, [
    el('thead', {}, [el('tr', {}, ['', 'Nazwa', 'Broń', 'Od poziomu', 'Co robi', 'Dają ją przedmioty', 'ID'].map((h) => el('th', {}, [h])))]),
    el('tbody', {}, UMIEJETNOSCI.map((u) => el('tr', {}, [
      el('td', {}, [u.ikona]), el('td', {}, [el('b', {}, [u.nazwa])]), el('td', {}, [BRONIE[u.bron].nazwa]),
      el('td', {}, [u.poziom ? String(u.poziom) : 'od startu']), el('td', {}, [u.opis]), el('td', {}, [nosza(u.id).join(', ') || '—']), el('td', {}, [el('code', {}, [u.id])]),
    ]))),
  ])]), el('h3', {}, ['W grze – ataki w walce turowej']), el('div', { className: 'scroll' }, [el('table', {}, [
    el('thead', {}, [el('tr', {}, ['Nazwa', 'Broń', 'Koszt (ruchy)', 'Siła', 'Kogo trafia', 'Opis'].map((h) => el('th', {}, [h])))]),
    el('tbody', {}, ATAKI.map((a) => el('tr', {}, [
      el('td', {}, [el('b', {}, [a.nazwa])]), el('td', {}, [a.bron]), el('td', {}, [String(a.koszt)]), el('td', {}, [`×${a.mnoznik}`]),
      el('td', {}, [a.obszar]), el('td', {}, [a.opis]),
    ]))),
  ])]));

  type Pomysl = { id: number; nazwa: string; bron: string; opis: string; status: string; updated_at: string };
  const STATUSY: [string, string][] = [['pomysl', '💡 pomysł'], ['do_zrobienia', '🔨 do zrobienia'], ['w_grze', '✅ w grze'], ['odrzucony', '✖ odrzucony']];
  const BRON: [string, string][] = [['miecz', 'miecz (Krzepa)'], ['luk', 'łuk (Celność)'], ['magia', 'magia (Skupienie)'], ['inne', 'inne']];
  const box = el('div');
  main.append(el('h3', {}, ['Pomysły na nowe umiejętności']), el('p', { className: 'muted' }, [
    'Opisz, jak ma działać (np. „piorun skacze do 3 najbliższych wrogów, każdy skok słabszy o 30%”). Status „do zrobienia” = sygnał dla mnie, że można budować.',
  ]), box);
  const wiersz = (p: Pomysl | null) => {
    const nazwa = el('input', { type: 'text', value: p?.nazwa ?? '', maxLength: 80, placeholder: 'np. Łańcuch piorunów', style: 'width: 220px' });
    const bron = el('select', {}, BRON.map(([k, n]) => el('option', { value: k, selected: k === (p?.bron ?? 'magia') }, [n])));
    const status = el('select', {}, STATUSY.map(([k, n]) => el('option', { value: k, selected: k === (p?.status ?? 'pomysl') }, [n])));
    const opis = el('textarea', { value: p?.opis ?? '', maxLength: 2000, rows: 2, style: 'width: 100%' });
    const msg = el('small', { className: 'muted' });
    return el('div', { className: 'card', style: 'max-width: 860px' }, [
      el('div', { className: 'row' }, [nazwa, bron, status]), opis,
      el('div', { className: 'row' }, [btn(p ? 'Zapisz' : '＋ Dodaj pomysł', async () => {
        if (!nazwa.value.trim()) return void (msg.textContent = 'Wpisz nazwę.');
        try {
          await call('admin_umiej_pomysl_zapisz', { p_id: p?.id ?? null, p_nazwa: nazwa.value.trim(), p_bron: bron.value, p_opis: opis.value, p_status: status.value });
          await wczytaj();
        } catch (e) { msg.className = 'msg bad'; msg.textContent = (e as Error).message; }
      }, 'b p'), msg]),
    ]);
  };
  const wczytaj = async () => {
    const lista = (await call<{ pomysly: Pomysl[] }>('admin_umiej_pomysly', {})).pomysly ?? [];
    box.replaceChildren(wiersz(null), ...lista.map(wiersz));
  };
  try { await wczytaj(); }
  catch (e) { box.replaceChildren(el('p', { className: 'msg bad' }, [`Nie udało się wczytać: ${(e as Error).message}`])); }
}
