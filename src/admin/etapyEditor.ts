import type { Etap, RodzajWroga, Strona, Pytanie, TypEtapu } from '../content/fabula';
import type { Owoc } from '../content/sklepy';
import { OWOCE } from '../content/sklepy';

// The admin panel's editor of a multi-stage mission (Misja.etapy): a list of stage cards, each with its kind
// and the fields that kind needs; ↑ ↓ ✕ and „+ Dodaj etap”. Built for the owner's quest chains
// („Serce Zębatka”, „Przebudzenie Starego Grodu”, 6–7 Oct 2026).

type Props = Record<string, unknown>;
function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, children: (Node | string | null | false)[] = []) {
  const e = Object.assign(document.createElement(tag), props);
  for (const c of children) if (c) e.append(c);
  return e;
}
const inp = (value: string | number | undefined, props: Props = {}) => el('input', { value: String(value ?? ''), ...props });
const area = (value: string | undefined, placeholder: string) => el('textarea', { value: value ?? '', placeholder });
const field = (label: string, input: HTMLElement, note?: string) => el('label', { className: 'f' }, [el('span', {}, [label]), input, note ? el('small', { className: 'muted' }, [note]) : null]);
const row = (...c: (Node | string | null)[]) => el('div', { className: 'row' }, c);
const btn = (text: string, onclick: () => void) => el('button', { type: 'button', className: 'b', onclick }, [text]);

export const RODZAJE_ETAPOW: Record<TypEtapu, string> = {
  idz: 'Idź (dojdź na miejsce)',
  pokonaj: 'Pokonaj wrogów',
  zbierz: 'Przynieś rzeczy z plecaka',
  rozmowa: 'Rozmowa (ktoś coś mówi na miejscu)',
  zagadka: 'Zagadka (jedno pytanie)',
  zagadki: 'Zagadki (kilka pytań po kolei)',
  podnies: 'Podnieś rzeczy z ziemi',
  napraw: 'Napraw (postój przy punkcie, pasek)',
  wybor: 'Wybór: przekonaj zagadką albo zapłać',
  paragraf: 'Paragraf (strony z wyborem drogi)',
  melodia: 'Melodia na fujarce',
  decyzja: 'Decyzja (bez utraty serc, zapisany wybór)',
  badanie: 'Badanie (dowolne tropy na mapie)',
  uklad: 'Układanie kart (zapis częściowego rozwiązania)',
  brak: 'Samo miejsce (bez zadania)',
};
const NUTY = ['Do', 'Re', 'Mi', 'Fa', 'Sol'];
const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

/** One question: text, 3 answers, which is right. */
function questionBox(q: Partial<Pytanie>) {
  const f = {
    p: inp(q.pytanie, { placeholder: 'pytanie' }),
    a: [0, 1, 2].map((i) => inp(q.odpowiedzi?.[i], { placeholder: `odpowiedź ${i + 1}` })),
    ok: el('select', {}, [0, 1, 2].map((i) => el('option', { value: String(i), selected: (q.dobra ?? 0) === i }, [`dobra: ${i + 1}`]))),
  };
  const box = el('div', { className: 'card' }, [f.p, row(...f.a, f.ok)]);
  return { box, read: (): Pytanie => ({ pytanie: f.p.value.trim(), odpowiedzi: f.a.map((x) => x.value.trim()).filter(Boolean), dobra: Number(f.ok.value) || 0 }) };
}

/** One paragraph page: text and up to 3 ways (each right or wrong). */
function pageBox(s: Partial<Strona>) {
  const t = area(s.tekst, 'tekst strony');
  const ways = [0, 1, 2].map((i) => ({
    t: inp(s.wybory?.[i]?.tekst, { placeholder: `wybór ${i + 1} (puste = brak)` }),
    ok: el('input', { type: 'checkbox', checked: s.wybory?.[i] ? s.wybory[i].dobry !== false : i === 0 }),
  }));
  const box = el('div', { className: 'card' }, [t, ...ways.map((w) => row(w.t, el('label', {}, [w.ok, ' dobra droga'])))]);
  return {
    box,
    read: (): Strona => {
      const wybory = ways.filter((w) => w.t.value.trim()).map((w) => ({ tekst: w.t.value.trim(), dobry: w.ok.checked }));
      return wybory.length ? { tekst: t.value.trim(), wybory } : { tekst: t.value.trim() };
    },
  };
}

/** A growing list of sub-boxes (questions, pages) with „+” and „–”. */
function growing<T>(items: Partial<T>[], make: (x: Partial<T>) => { box: HTMLElement; read: () => T }, label: string) {
  const wrap = el('div');
  const boxes: { box: HTMLElement; read: () => T }[] = [];
  const add = (x: Partial<T>) => {
    const b = make(x);
    boxes.push(b);
    holder.append(b.box);
  };
  const holder = el('div');
  wrap.append(holder, row(btn(`+ ${label}`, () => add({})), btn(`– ${label}`, () => boxes.pop()?.box.remove())));
  (items.length ? items : [{}]).forEach(add);
  return { box: wrap, read: () => boxes.map((b) => b.read()) };
}

/** One stage card; `onChange` refreshes the preview. */
function stageCard(e: Partial<Etap>, enemies: Record<string, string>, onChange: () => void) {
  const f = {
    language: el('select', {}, ['pl','en'].map(language => el('option', {value:language,selected:(e.dialogueMeta?.language ?? 'pl')===language}, [language==='pl'?'Polski':'English']))),
    localHumor: el('input', {type:'checkbox',checked:e.dialogueMeta?.localHumor ?? false}),
    decisionKey: inp(e.wyborKlucz, {placeholder:'stały klucz wyboru, np. essence'}),
    typ: el('select', {}, Object.entries(RODZAJE_ETAPOW).map(([k, v]) => el('option', { value: k, selected: (e.typ ?? 'idz') === k }, [v]))),
    miejsce: inp(typeof e.miejsce === 'string' ? e.miejsce : e.miejsce ? `${e.miejsce.lat}, ${e.miejsce.lon}` : '', { placeholder: 'adres albo „51.2468, 22.5684”; puste = drzwi zleceniodawcy (Enter = pokaż na mapie)' }),
    cel: inp(e.cel, { placeholder: 'krótko, na ekranie i w dzienniku' }),
    tekst: area(e.tekst, 'tekst na początku etapu (rozmowa: co mówi postać)'),
    komunikat: area(e.komunikat, 'tekst po wykonaniu etapu (opcjonalnie)'),
    daje: inp((e.daje ?? []).join(', '), { placeholder: 'np. soczewka, korzeń dębu' }),
    zabiera: inp((e.zabiera ?? []).join(', '), { placeholder: 'np. soczewka' }),
    imie: inp(e.postac?.imie, { placeholder: 'np. Latarnik (puste = bez postaci)' }),
    zjawa: el('input', { type: 'checkbox', checked: !!e.postac?.zjawa }),
    kobieta: el('input', { type: 'checkbox', checked: !!e.postac?.kobieta }),
    ile: inp(e.ile ?? 3, { type: 'number', min: 1, max: 30 }),
    wrog: el('select', {}, Object.entries(enemies).map(([k, v]) => el('option', { value: k, selected: (e.wrog ?? 'glut') === k }, [v]))),
    szukaj: el('input', { type: 'checkbox', checked: !!e.szukaj }),
    towar: el('select', {}, (Object.keys(OWOCE) as Owoc[]).map((k) => el('option', { value: k, selected: e.towar === k }, [OWOCE[k].nazwa]))),
    naCzas: el('input', { type: 'checkbox', checked: !!e.naCzas }),
    promien: inp(e.promien ?? 40, { type: 'number', min: 5, max: 400 }),
    sekund: inp(e.sekund ?? 5, { type: 'number', min: 1, max: 60 }),
    zaplac: inp(e.zaplac ?? 50, { type: 'number', min: 0 }),
    nuty: inp((e.nuty ?? []).map((n) => NUTY[n]).join(' '), { placeholder: 'np. Do Mi Sol Mi Re Do (puste = losowa)' }),
    podpowiedz: inp(e.podpowiedz, { placeholder: 'podpowiedź po złej odpowiedzi' }),
  };
  const one = questionBox({ pytanie: e.pytanie, odpowiedzi: e.odpowiedzi, dobra: e.dobra });
  const many = growing<Pytanie>(e.pytania ?? [], questionBox, 'pytanie');
  const pages = growing<Strona>(e.strony ?? [], pageBox, 'strona');
  const decisions = growing<NonNullable<Etap['opcje']>[number]>(e.opcje ?? [], option => {
    const id = inp(option.id, {placeholder:'stały identyfikator, np. leaf'});
    const label = inp(option.tekst, {placeholder:'odpowiedź gracza'});
    const result = area(option.wynik, 'reakcja po tym wyborze');
    return {box:el('div', {className:'card'}, [id,label,result]), read:()=>({id:id.value.trim(),tekst:label.value.trim(),wynik:result.value.trim()})};
  }, 'odpowiedź');
  const cards = growing<NonNullable<Etap['karty']>[number]>(e.karty ?? [], card => {
    const id=inp(card.id,{placeholder:'stałe ID karty'}),text=inp(card.tekst,{placeholder:'tekst karty'});
    return {box:row(id,text),read:()=>({id:id.value.trim(),tekst:text.value.trim()})};
  },'karta');
  const order=inp((e.kolejnosc ?? []).join(', '),{placeholder:'ID kart w poprawnej kolejności, po przecinku'});
  const clues = growing<NonNullable<Etap['tropy']>[number]>(e.tropy ?? [], clue => {
    const id=inp(clue.id,{placeholder:'stałe ID tropu'}),title=inp(clue.tytul,{placeholder:'nazwa tropu'}),text=area(clue.tekst,'informacja po zbadaniu'),place=inp(typeof clue.miejsce==='string' ? clue.miejsce : clue.miejsce ? `${clue.miejsce.lat}, ${clue.miejsce.lon}` : '',{placeholder:'adres lub lat, lon'});
    return {box:el('div',{className:'card'},[id,title,place,text]),read:()=>{
      const coords=place.value.split(',').map(Number);
      const miejsce=coords.length===2 && coords.every(Number.isFinite) ? {lat:coords[0],lon:coords[1]} : place.value.trim();
      return {id:id.value.trim(),tytul:title.value.trim(),tekst:text.value.trim(),miejsce};
    }};
  },'trop');
  const parts: Record<string, HTMLElement> = {
    pokonaj: row(field('Ilu', f.ile), field('Jaki wróg', f.wrog), el('label', {}, [f.szukaj, ' trzeba szukać'])),
    zbierz: row(field('Co', f.towar), field('Ile', f.ile)),
    idz: el('label', {}, [f.naCzas, ' na czas (po czasie etap cofa się o jeden)']),
    podnies: row(field('Ile rzeczy', f.ile), field('W promieniu (m)', f.promien), el('label', {}, [f.szukaj, ' strzałka pokazuje tylko okolicę'])),
    napraw: row(field('Ile punktów', f.ile), field('Sekund przy każdym', f.sekund), field('W promieniu (m)', f.promien)),
    zagadka: el('div', {}, [one.box, f.podpowiedz]),
    zagadki: many.box,
    decyzja: el('div', {}, [field('Klucz zapisywanego wyboru',f.decisionKey),decisions.box]),
    badanie: el('div',{},[field('Ile różnych tropów wystarczy',f.ile),clues.box]),
    uklad: el('div',{},[cards.box,field('Poprawna kolejność',order),f.podpowiedz]),
    wybor: field('Albo zapłać (monet, 0 = tylko zagadka)', f.zaplac),
    paragraf: pages.box,
    melodia: field('Nuty', f.nuty, 'Do Re Mi Fa Sol, oddzielone spacją.'),
  };
  const kind = el('div');
  const card = el('div', { className: 'card' });
  const show = () => {
    kind.replaceChildren(parts[f.typ.value] ?? '');
    onChange();
  };
  f.typ.addEventListener('change', show);
  // Typing an address doesn't redraw the map at every letter (owner 7.10.2026): only Enter or leaving the field does.
  f.miejsce.dataset.adres = '1';
  card.addEventListener('input', (ev) => { if (!(ev.target as HTMLElement).dataset?.adres) onChange(); });
  card.addEventListener('change', onChange);
  const title = el('b');
  card.append(
    title,
    row(field('Rodzaj', f.typ), field('Miejsce', f.miejsce)),
    field('Cel (na ekranie)', f.cel),
    kind,
    row(field('Język dialogu',f.language),el('label', {}, [f.localHumor,' Lokalny humor (w tłumaczeniu adaptuj żart)'])),
    field('Tekst na początku', f.tekst),
    field('Tekst po wykonaniu', f.komunikat),
    row(field('Daje przedmioty fabularne', f.daje), field('Zabiera', f.zabiera)),
    row(field('Postać na miejscu', f.imie), el('label', {}, [f.zjawa, ' zjawa']), el('label', {}, [f.kobieta, ' kobieta'])),
  );
  show();
  const read = (): Etap => {
    const typ = f.typ.value as TypEtapu;
    const m = f.miejsce.value.trim();
    const out: Etap = { typ, dialogueMeta:{language:f.language.value as 'pl'|'en',localHumor:f.localHumor.checked}, miejsce: m, cel: f.cel.value.trim() || RODZAJE_ETAPOW[typ] };
    const opt = <K extends keyof Etap>(k: K, v: Etap[K] | '' | undefined) => {
      if (v !== '' && v !== undefined && !(Array.isArray(v) && !v.length)) out[k] = v as Etap[K];
    };
    opt('tekst', f.tekst.value.trim());
    opt('komunikat', f.komunikat.value.trim());
    opt('daje', list(f.daje.value));
    opt('zabiera', list(f.zabiera.value));
    if (f.imie.value.trim()) out.postac = { imie: f.imie.value.trim(), ...(f.zjawa.checked ? { zjawa: true } : {}), ...(f.kobieta.checked ? { kobieta: true } : {}) };
    const n = Math.max(1, Number(f.ile.value) || 1);
    if (typ === 'pokonaj') Object.assign(out, { ile: n, wrog: f.wrog.value as RodzajWroga }, f.szukaj.checked ? { szukaj: true } : {});
    if (typ === 'zbierz') Object.assign(out, { towar: f.towar.value as Owoc, ile: n });
    if (typ === 'idz' && f.naCzas.checked) out.naCzas = true;
    if (typ === 'podnies') Object.assign(out, { ile: n, promien: Number(f.promien.value) || 40 }, f.szukaj.checked ? { szukaj: true } : {});
    if (typ === 'napraw') Object.assign(out, { ile: n, sekund: Number(f.sekund.value) || 5, promien: Number(f.promien.value) || 40 });
    if (typ === 'zagadka') {
      const q = one.read();
      Object.assign(out, { pytanie: q.pytanie, odpowiedzi: q.odpowiedzi, dobra: q.dobra });
      opt('podpowiedz', f.podpowiedz.value.trim());
    }
    if (typ === 'zagadki') out.pytania = many.read().filter((q) => q.pytanie && q.odpowiedzi.length);
    if (typ === 'decyzja') {out.wyborKlucz=f.decisionKey.value.trim() || 'decision';out.opcje=decisions.read().filter(o=>o.id&&o.tekst);}
    if (typ === 'badanie') {out.ile=n;out.tropy=clues.read().filter(c=>c.id&&c.tytul&&c.miejsce);}
    if (typ === 'uklad') {out.karty=cards.read().filter(c=>c.id&&c.tekst);out.kolejnosc=list(order.value);opt('podpowiedz',f.podpowiedz.value.trim());}
    if (e.warianty) out.warianty=e.warianty;
    if (typ === 'wybor') out.zaplac = Math.max(0, Number(f.zaplac.value) || 0);
    if (typ === 'paragraf') out.strony = pages.read().filter((s) => s.tekst);
    if (typ === 'melodia') opt('nuty', f.nuty.value.split(/\s+/).map((x) => NUTY.findIndex((n) => n.toLowerCase() === x.toLowerCase())).filter((i) => i >= 0));
    return out;
  };
  return { card, read, title, setPlace: (v: string) => { f.miejsce.value = v; onChange(); } };
}

/** The whole list: cards with ↑ ↓ ✕ and „+ Dodaj etap”. */
export function etapyEditor(etapy: Etap[], enemies: Record<string, string>, onChange: () => void) {
  const wrap = el('div');
  const holder = el('div');
  const cards: ReturnType<typeof stageCard>[] = [];
  const renumber = () => {
    cards.forEach((c, i) => {
      c.title.textContent = `Etap ${i + 1}`;
      holder.append(c.card);
    });
    onChange();
  };
  const add = (e: Partial<Etap>) => {
    const c = stageCard(e, enemies, onChange);
    c.title.after(
      row(
        btn('↑', () => {
          const i = cards.indexOf(c);
          if (i > 0) [cards[i - 1], cards[i]] = [cards[i], cards[i - 1]];
          renumber();
        }),
        btn('↓', () => {
          const i = cards.indexOf(c);
          if (i < cards.length - 1) [cards[i + 1], cards[i]] = [cards[i], cards[i + 1]];
          renumber();
        }),
        btn('✕ usuń etap', () => {
          cards.splice(cards.indexOf(c), 1);
          c.card.remove();
          renumber();
        }),
      ),
    );
    cards.push(c);
    renumber();
  };
  wrap.append(holder, btn('+ Dodaj etap', () => add({ typ: 'idz', miejsce: '', cel: '' })));
  etapy.forEach(add);
  return {
    box: wrap,
    read: () => cards.map((c) => c.read()),
    count: () => cards.length,
    /** A click on the preview map: this stage's place becomes that point. */
    setPlace: (i: number, v: string) => cards[i]?.setPlace(v),
  };
}
