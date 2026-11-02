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
import { KARTKI, WZORY_KARTEK, MIEJSCA_POLOWAN, type RodzajKartki } from '../content/kartki';

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
export function kartkaTablicy(city: CityMap, t: { x: number; y: number }, dzien: string): Kartka | null {
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
  const rodzaje = ['polowanie', 'dostawa', 'zbieranie'] as const;
  const start = Math.floor(r() * rodzaje.length);
  for (let k = 0; k < rodzaje.length; k++) {
    const rodzaj = rodzaje[(start + k) % rodzaje.length];
    const wzor = pick(WZORY_KARTEK[rodzaj]);

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

    // zbieranie: mushrooms (the first note) or wood (the second) from the nearest forest.
    const las = forestNear(city, t.x, t.y, KARTKI.zbieranieDoM * M, r);
    if (!las) continue;
    const towar = WZORY_KARTEK.zbieranie.indexOf(wzor) === 0 ? 'grzyb' : 'drewno';
    const z = ZBIERANIE[towar];
    const ile = z.ile[0] + Math.floor(r() * (z.ile[1] - z.ile[0] + 1));
    const ilePL = `${ile} ${ile % 10 >= 2 && ile % 10 <= 4 && (ile % 100 < 12 || ile % 100 > 14) ? z.formy[0] : z.formy[1]}`;
    const ileTxt = tx(ilePL, `${ile} ${towar === 'grzyb' ? 'mushrooms' : 'pieces of wood'}`);
    const at = city.toLatLon(las.x, las.y);
    return {
      rodzaj: 'stara', zleca, zlecaNazwa,
      misja: {
        id, placeId: zleca.id, adres: zleca.name, tytul: tr(wzor.tytul), opis: fill(wzor.tresc, '', ileTxt),
        zadanie: { typ: 'zbierz', towar, ile, miejsce: { lat: at.lat, lon: at.lon }, cel: fill(wzor.cel, '', ileTxt) },
        zakonczenie: tr(wzor.koniec),
        nagroda: ZBIERANIE.premia + ile * z.zaSztuke,
      },
    };
  }
  return null;
}
