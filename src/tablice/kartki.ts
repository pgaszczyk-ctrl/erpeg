// The note pinned to a city board (owner, 2 Nov 2026): made when the board is opened, one per board per day – the
// same note all day (seeded by the board and the day), gone once taken. A tidier generator than the withdrawn city
// quest pack: three kinds built from mechanisms the game already has – drive monsters out of a park/forest/cemetery,
// carry a parcel to an address, bring mushrooms/wood from the forest – and the pay is collected from a public place
// 100–400 m from the board (the giver), like the random jobs of temples and offices. Texts: content/kartki.ts.
import type { CityMap, Place as CityPlace } from '../map/CityMap';
import { PX_PER_M } from '../map/CityMap';
import type { Misja } from '../content/fabula';
import { tr, tx, type Txt } from '../i18n';
import { rng } from '../rng';
import { forestNear } from '../quests';
import { NAGRODA, ZBIERANIE } from '../content/zlecenia';
import {
  KARTKI, WZORY_KARTEK, MIEJSCA_POLOWAN, RODZAJE_OSOBLIWOSCI, WZORY_ZWIADU, TROPY_ZWIADU, WZORY_PATROLU, ZBIERANIE_POGODA, POWROT_KARTKI,
  type RodzajKartki,
} from '../content/kartki';
import type { Etap } from '../content/fabula';
import type { Owoc } from '../content/sklepy';
import { weather } from '../weather';

export interface Kartka {
  misja: Misja;
  rodzaj: RodzajKartki;
  /** The giver's place (where the pay is collected) and its short name for the note. */
  zleca: CityPlace;
  zlecaNazwa: string;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The board's key: its map and spot. */
export function kluczTablicy(city: CityMap, t: { x: number; y: number }) {
  return `${city.id}:${Math.round(t.x)}:${Math.round(t.y)}`;
}

/** The mission id of the note on this board today. */
export function idKartki(klucz: string, dzien: string) {
  return `gen-tablica-${klucz}-${dzien}`;
}

/** Notes made today, so a weather change doesn't swap a note already seen (the same note all day). */
const DZIS = new Map<string, Kartka | null>();

/** A short name for a place in notes (a school „Szkoła Podstawowa nr 50”, not the patron and town). */
function nazwaMiejsca(p: CityPlace) {
  const m = /^(.*?\bnr\.?\s*\d+[a-z]?)\b/i.exec(p.name);
  // „… w Lublinie” / „… KWP w Lublinie”: the town is obvious on the board.
  return (m ? m[1] : p.name).replace(/\s+w\s+[A-ZĄĆĘŁŃÓŚŹŻ][\p{L}-]*$/u, '').trim();
}

/**
 * The note on board `t` today, or null when nothing fits here (no public place near, nowhere to send the hero).
 * `dzien` = the game's day string; the same board and day always give the same note.
 */
export function kartkaTablicy(city: CityMap, t: { x: number; y: number }, dzien: string, wymus?: RodzajZlecenia): Kartka | null {
  const id0 = idKartki(kluczTablicy(city, t), dzien);
  if (!wymus && DZIS.has(id0)) return DZIS.get(id0)!;
  const k = nowaKartka(city, t, dzien, wymus);
  if (wymus) return k;
  // A board whose ground isn't loaded yet may find nothing: ask again next time instead of keeping „none”.
  if (k) DZIS.set(id0, k);
  return k;
}

/** Polish plural of a count: 2–4 → `formy[0]`, else `formy[1]`. */
function liczba(ile: number, formy: [string, string]) {
  return ile % 10 >= 2 && ile % 10 <= 4 && (ile % 100 < 12 || ile % 100 > 14) ? formy[0] : formy[1];
}

export type RodzajZlecenia = 'polowanie' | 'dostawa' | 'zbieranie' | 'zwiad' | 'patrol';

function nowaKartka(city: CityMap, t: { x: number; y: number }, dzien: string, wymus?: RodzajZlecenia): Kartka | null {
  const klucz = kluczTablicy(city, t);
  const r = rng(hash(`${klucz}:${dzien}:kartka`));
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const M = PX_PER_M;
  const dist = (p: { x: number; y: number }) => Math.hypot(p.x - t.x, p.y - t.y) / M;
  // The giver: a public place in the ring round the board, else a little farther.
  const mozliwi = city.places.filter((p) => KARTKI.zleceniodawcy.includes(p.kind) && p.name);
  let zlecajacy = mozliwi.filter((p) => dist(p.door) >= KARTKI.zleceniodawcaM[0] && dist(p.door) <= KARTKI.zleceniodawcaM[1]);
  if (!zlecajacy.length) zlecajacy = mozliwi.filter((p) => dist(p.door) <= KARTKI.zleceniodawcaDalejM);
  if (!zlecajacy.length) return null;
  const zleca = pick(zlecajacy);
  const zlecaNazwa = nazwaMiejsca(zleca);
  const id = idKartki(klucz, dzien);
  const fill = (s: Txt, miejsce: string, ile = '') => tr(s).replaceAll('{miejsce}', miejsce).replaceAll('{zleca}', zlecaNazwa).replaceAll('{ile}', ile);

  // The three kinds in a fixed order picked by the seed; the first that fits this place wins.
  const rodzaje = ['polowanie', 'dostawa', 'zbieranie', 'zwiad', 'patrol'] as const;
  const ll = (p: { x: number; y: number }) => { const q = city.toLatLon(p.x, p.y); return { lat: q.lat, lon: q.lon }; };
  // The last stage of scouting and patrols: back to the giver's door with the report.
  const powrot = (): Etap => ({ typ: 'idz', miejsce: ll(zleca.door), cel: tr(POWROT_KARTKI.cel).replaceAll('{zleca}', zlecaNazwa) });
  // Now and then something lurks at the end.
  const zasadzka = (p: { x: number; y: number }, wrog: 'glut' | 'szkielet' | 'driada'): Etap => ({
    typ: 'pokonaj', miejsce: ll(p), ile: 2 + Math.floor(r() * 2), wrog, cel: tr(POWROT_KARTKI.zasadzka),
  });
  const start = Math.floor(r() * rodzaje.length);
  for (let k = 0; k < rodzaje.length; k++) {
    const rodzaj = wymus ?? rodzaje[(start + k) % rodzaje.length];
    if (wymus && k) break;
    const wzor = rodzaj === 'zwiad' || rodzaj === 'patrol' ? WZORY_KARTEK.polowanie[0] : pick(WZORY_KARTEK[rodzaj]);

    if (rodzaj === 'zwiad') {
      // An odd place (ruins, a water tower, an old mill, a shrine…) at a walk's distance.
      const mozliwe = city.osobliwe.filter((o) => RODZAJE_OSOBLIWOSCI[o.rodzaj] && dist(o) >= KARTKI.zwiadM[0] && dist(o) <= KARTKI.zwiadM[1]);
      if (!mozliwe.length) continue;
      const o = pick(mozliwe);
      const opis = RODZAJE_OSOBLIWOSCI[o.rodzaj];
      const nazwa = o.nazwa && o.nazwa.length <= 40 ? o.nazwa : '';
      const ulica = city.streetNear(o.x, o.y, 250);
      const miejsce = nazwa
        ? tx(`${nazwa} (${opis.pl})`, `${nazwa} (${opis.en.replace(/^the /, '')})`)
        : ulica ? tx(`${opis.pl} przy ulicy ${ulica}`, `${opis.en} by ${ulica}`) : tx(opis.pl, opis.en);
      // Clues on free ground round the spot, in different directions.
      const tropy: NonNullable<Etap['tropy']> = [];
      const pula = [...TROPY_ZWIADU];
      const kat0 = r() * Math.PI * 2;
      for (let i = 0, proby = 0; tropy.length < KARTKI.tropy && proby < 60; proby++) {
        const a = kat0 + (i / KARTKI.tropy) * Math.PI * 2 + (r() - 0.5) * 0.8;
        const d = (KARTKI.tropyPromienM[0] + r() * (KARTKI.tropyPromienM[1] - KARTKI.tropyPromienM[0])) * M;
        const x = o.x + Math.cos(a) * d, y = o.y + Math.sin(a) * d;
        if (!city.isFree(x, y, 4, 4)) continue;
        const c = pula.splice(Math.floor(r() * pula.length), 1)[0];
        tropy.push({ id: `trop${i}`, miejsce: ll({ x, y }), tytul: tr(c.tytul), tekst: tr(c.tekst) });
        i++;
      }
      if (tropy.length < KARTKI.tropowTrzeba) continue;
      const w = pick(WZORY_ZWIADU);
      const etapy: Etap[] = [{ typ: 'badanie', miejsce: tropy[0].miejsce, ile: KARTKI.tropowTrzeba, cel: fill(w.cel, miejsce), tropy }];
      if (r() < KARTKI.zwiadZasadzka) etapy.push(zasadzka(o, opis.wrog));
      etapy.push(powrot());
      return {
        rodzaj: 'stara', zleca, zlecaNazwa,
        misja: {
          id, placeId: zleca.id, adres: zleca.name, tytul: tr(w.tytul), opis: fill(w.tresc, miejsce),
          zadanie: { typ: 'idz', miejsce: ll(o), cel: fill(w.cel, miejsce) }, etapy,
          zakonczenie: tr(w.koniec),
          nagroda: KARTKI.nagrodaZwiad + Math.round((dist(o) * 2) / 100) * NAGRODA.zaKazde100m,
        },
      };
    }

    if (rodzaj === 'patrol') {
      // A path in the ground loaded round the board, long enough for the checkpoints; by water if one is.
      const R = KARTKI.patrolM[1] * M;
      const potrzeba = (KARTKI.patrolPunkty - 1) * KARTKI.patrolOdstepM * M;
      const sciezki = city.query({ x0: t.x - R, y0: t.y - R, x1: t.x + R, y1: t.y + R }).lines.filter((l) => {
        if (!['path', 'track', 'pedestrian'].includes(l.kind) || l.bridge || l.pts.length < 4) return false;
        let len = 0;
        for (let i = 2; i < l.pts.length; i += 2) len += Math.hypot(l.pts[i] - l.pts[i - 2], l.pts[i + 1] - l.pts[i - 1]);
        const mx = (l.x0 + l.x1) / 2, my = (l.y0 + l.y1) / 2, d = dist({ x: mx, y: my });
        return len >= potrzeba && d >= KARTKI.patrolM[0] && d <= KARTKI.patrolM[1];
      });
      if (!sciezki.length) continue;
      const wodne = sciezki.filter((l) => city.nearWater((l.x0 + l.x1) / 2, (l.y0 + l.y1) / 2, 40 * M));
      const l = wodne.length && r() < 0.7 ? pick(wodne) : pick(sciezki);
      const nadWoda = wodne.includes(l);
      // Checkpoints every patrolOdstepM along the line, from a seeded start.
      const punkty: { x: number; y: number }[] = [];
      let len = 0;
      for (let i = 2; i < l.pts.length; i += 2) len += Math.hypot(l.pts[i] - l.pts[i - 2], l.pts[i + 1] - l.pts[i - 1]);
      let s0 = r() * Math.max(0, len - potrzeba);
      let acc = 0;
      for (let i = 2; i < l.pts.length && punkty.length < KARTKI.patrolPunkty; i += 2) {
        const ax = l.pts[i - 2], ay = l.pts[i - 1], bx = l.pts[i], by = l.pts[i + 1];
        const seg = Math.hypot(bx - ax, by - ay);
        while (s0 <= acc + seg && punkty.length < KARTKI.patrolPunkty) {
          const f = seg ? (s0 - acc) / seg : 0;
          punkty.push({ x: ax + (bx - ax) * f, y: ay + (by - ay) * f });
          s0 += KARTKI.patrolOdstepM * M;
        }
        acc += seg;
      }
      if (punkty.length < KARTKI.patrolPunkty) continue;
      const w = WZORY_PATROLU[nadWoda ? 'rzeka' : 'sciezka'];
      const ulica = l.name || city.streetNear(punkty[0].x, punkty[0].y, 300);
      const miejsce = ulica ? tx(ulica, ulica) : nadWoda ? tx('brzeg wody', 'the waterside') : tx('ścieżka', 'the path');
      const ile = String(KARTKI.patrolPunkty);
      const etapy: Etap[] = [{
        typ: 'badanie', miejsce: ll(punkty[0]), ile: punkty.length, cel: fill(w.cel, miejsce),
        tropy: punkty.map((p, i) => ({ id: `punkt${i}`, miejsce: ll(p), tytul: `${tr(POWROT_KARTKI.punkt)} ${i + 1}/${punkty.length}`, tekst: tr(POWROT_KARTKI.punktTekst), przycisk: tr(POWROT_KARTKI.przycisk) })),
      }];
      if (r() < KARTKI.patrolZasadzka) etapy.push(zasadzka(punkty[punkty.length - 1], nadWoda ? 'glut' : 'driada'));
      etapy.push(powrot());
      return {
        rodzaj: 'urzedowa', zleca, zlecaNazwa,
        misja: {
          id, placeId: zleca.id, adres: zleca.name, tytul: tr(w.tytul), opis: fill(w.tresc, miejsce, ile),
          zadanie: { typ: 'idz', miejsce: ll(punkty[0]), cel: fill(w.cel, miejsce) }, etapy,
          zakonczenie: tr(w.koniec),
          nagroda: KARTKI.nagrodaPatrol + Math.round((dist(punkty[0]) * 2) / 100) * NAGRODA.zaKazde100m + punkty.length * 5,
        },
      };
    }

    if (rodzaj === 'polowanie') {
      // A park, forest, thicket or cemetery at a walk's distance (in the ground already loaded round the board).
      const R = KARTKI.polowanieM[1] * M;
      const obszary = city.query({ x0: t.x - R, y0: t.y - R, x1: t.x + R, y1: t.y + R }).areas.filter((a) => MIEJSCA_POLOWAN[a.kind]);
      let cel: { x: number; y: number; kind: string } | null = null;
      for (let i = 0; i < 40 && !cel && obszary.length; i++) {
        const a = pick(obszary);
        const x = a.x0 + r() * (a.x1 - a.x0), y = a.y0 + r() * (a.y1 - a.y0), d = dist({ x, y });
        if (d < KARTKI.polowanieM[0] || d > KARTKI.polowanieM[1] || !city.areaKindsAt(x, y).includes(a.kind) || !city.isFree(x, y, 4, 4)) continue;
        cel = { x, y, kind: a.kind };
      }
      if (!cel) continue;
      const opis = MIEJSCA_POLOWAN[cel.kind];
      const ulica = city.streetNear(cel.x, cel.y, 250);
      const miejsce = ulica ? tx(`${opis.pl} przy ulicy ${ulica}`, `${opis.en} by ${ulica}`) : tx(opis.pl, opis.en);
      const at = city.toLatLon(cel.x, cel.y);
      const ile = KARTKI.ilePotworow[0] + Math.floor(r() * (KARTKI.ilePotworow[1] - KARTKI.ilePotworow[0] + 1));
      return {
        rodzaj: 'gonczy', zleca, zlecaNazwa,
        misja: {
          id, placeId: zleca.id, adres: zleca.name, tytul: tr(wzor.tytul), opis: fill(wzor.tresc, miejsce),
          zadanie: { typ: 'pokonaj', miejsce: { lat: at.lat, lon: at.lon }, ile, wrog: opis.wrog, cel: fill(wzor.cel, miejsce) },
          zakonczenie: tr(wzor.koniec),
          nagroda: NAGRODA.pokonaj + Math.round(dist(cel) / 100) * NAGRODA.zaKazde100m,
        },
      };
    }

    if (rodzaj === 'dostawa') {
      const domy = city.addressed().filter((b) => b.addresses[0] && b !== zleca.building);
      let cel: { adres: string; x: number; y: number } | null = null;
      for (let i = 0; i < 300 && !cel && domy.length; i++) {
        const b = pick(domy);
        const d = city.entranceOf(b), m = dist(d);
        if (m >= KARTKI.dostawaM[0] && m <= KARTKI.dostawaM[1]) cel = { adres: b.addresses[0], x: d.x, y: d.y };
      }
      if (!cel) continue;
      const at = city.toLatLon(cel.x, cel.y);
      return {
        rodzaj: zleca.kind === 'office' || zleca.kind === 'police' || zleca.kind === 'university' ? 'urzedowa' : 'zwykla', zleca, zlecaNazwa,
        misja: {
          id, placeId: zleca.id, adres: zleca.name, tytul: tr(wzor.tytul), opis: fill(wzor.tresc, cel.adres),
          zadanie: {
            typ: 'idz', miejsce: { lat: at.lat, lon: at.lon }, cel: fill(wzor.cel, cel.adres),
            komunikat: tx(`Przesyłka doręczona. Wróć po zapłatę: ${zlecaNazwa}.`, `Delivered. Go back to ${zlecaNazwa} for your pay.`),
          },
          zakonczenie: tr(wzor.koniec),
          nagroda: NAGRODA.idz + Math.round((dist(cel) * 2) / 100) * NAGRODA.zaKazde100m,
        },
      };
    }

    // zbieranie: by the weather – mushrooms after rain, firewood in frost, fruit on a summer day – else the
    // old mushrooms (the first note) or wood (the second) from the nearest forest.
    const mies = new Date().getMonth() + 1;
    const deszcz = ['deszcz', 'ulewa', 'burza'].includes(weather.kind);
    const mroz = weather.kind === 'snieg' || (weather.temp !== null && weather.temp <= 2);
    const lato = mies >= 7 && mies <= 10 && weather.kind === 'czysto' && (weather.temp === null || weather.temp >= 15);
    const pogoda = deszcz ? ZBIERANIE_POGODA.po_deszczu : mroz ? ZBIERANIE_POGODA.mroz : lato && r() < 0.6 ? ZBIERANIE_POGODA.owoce : null;
    if (pogoda?.towar === 'jablko') {
      // Fruit grows in parks and gardens: point at the nearest park.
      const R = KARTKI.zbieranieDoM * M;
      const parki = city.query({ x0: t.x - R, y0: t.y - R, x1: t.x + R, y1: t.y + R }).areas.filter((a) => a.kind === 'park' || a.kind === 'allotments');
      if (parki.length) {
        const a = parki.reduce((b, c) => (dist({ x: (c.x0 + c.x1) / 2, y: (c.y0 + c.y1) / 2 }) < dist({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 }) ? c : b));
        const ile = pogoda.ile[0] + Math.floor(r() * (pogoda.ile[1] - pogoda.ile[0] + 1));
        const ileTxt = tx(`${ile} ${ile === 1 ? 'jabłko' : liczba(ile, ['jabłka', 'jabłek'])}`, `${ile} apples`);
        return {
          rodzaj: 'stara', zleca, zlecaNazwa,
          misja: {
            id, placeId: zleca.id, adres: zleca.name, tytul: tr(pogoda.wzor.tytul), opis: fill(pogoda.wzor.tresc, '', ileTxt),
            zadanie: { typ: 'zbierz', towar: 'jablko', ile, miejsce: ll({ x: (a.x0 + a.x1) / 2, y: (a.y0 + a.y1) / 2 }), cel: fill(pogoda.wzor.cel, '', ileTxt) },
            zakonczenie: tr(pogoda.wzor.koniec),
            nagroda: ZBIERANIE.premia + ile * pogoda.zaSztuke,
          },
        };
      }
    }
    const las = forestNear(city, t.x, t.y, KARTKI.zbieranieDoM * M, r);
    if (!las) continue;
    const zwykly = WZORY_KARTEK.zbieranie.indexOf(wzor) === 0 ? 'grzyb' : 'drewno';
    const towar = (pogoda && pogoda.towar !== 'jablko' ? pogoda.towar : zwykly) as 'grzyb' | 'drewno';
    const z = ZBIERANIE[towar];
    const zakres = pogoda && pogoda.towar === towar ? pogoda.ile : z.ile;
    const ile = zakres[0] + Math.floor(r() * (zakres[1] - zakres[0] + 1));
    const ileTxt = tx(`${ile} ${liczba(ile, z.formy as [string, string])}`, `${ile} ${towar === 'grzyb' ? 'mushrooms' : 'pieces of wood'}`);
    const w = pogoda && pogoda.towar === towar ? pogoda.wzor : wzor;
    const at = city.toLatLon(las.x, las.y);
    return {
      rodzaj: 'stara', zleca, zlecaNazwa,
      misja: {
        id, placeId: zleca.id, adres: zleca.name, tytul: tr(w.tytul), opis: fill(w.tresc, '', ileTxt),
        zadanie: { typ: 'zbierz', towar: towar as Owoc, ile, miejsce: { lat: at.lat, lon: at.lon }, cel: fill(w.cel, '', ileTxt) },
        zakonczenie: tr(w.koniec),
        nagroda: ZBIERANIE.premia + ile * (pogoda && pogoda.towar === towar ? pogoda.zaSztuke : z.zaSztuke),
      },
    };
  }
  return null;
}

// For browser tests: a note of a chosen kind for any board.
if (typeof window !== 'undefined') (window as unknown as { __kartki: unknown }).__kartki = { kartkaTablicy, kluczTablicy };
