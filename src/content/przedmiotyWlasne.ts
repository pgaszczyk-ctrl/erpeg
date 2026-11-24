// Własne przedmioty z panelu admina (właściciel, 24.11.2026; zakładka „🎒 Przedmioty”, tabela `przedmioty_wlasne`,
// docs/sql/przedmioty-wlasne.sql). Gra wczytuje je przy starcie (RPC `game_przedmioty`) i dokłada do PRZEDMIOTY,
// więc działają wszędzie tam, gdzie przedmioty z kodu: plecak, Kufer, łup ze stworków i miejsc, nagrody za misje,
// tajne hasła, warsztaty. Do sklepów NIE trafiają (cena służy tylko do skupu i napraw).
// Obrazek: mały (64 px) = tekstura w grze, także leżąca na ziemi z poświatą rzadkości; duży (256 px) = karta i sklep.
// Bez Phasera – używa tego też panel admina.
import { PRZEDMIOTY, type Przedmiot, type Miejsce } from './przedmioty';
import type { Rzadkosc } from './rzadkosc';
import type { Amunicja } from './zuzycie';
import { tx } from '../i18n';

export type Tekst2 = { pl: string; en?: string };

/** Co panel zapisuje w kolumnie `dane` (wszystko poza nazwą i miejscem jest opcjonalne). */
export interface DanePrzedmiotu {
  nazwa: Tekst2;
  opis?: Tekst2;
  miejsce: Exclude<Miejsce, 'talizman2' | 'talizman3'>;
  /** Broń: zwykła (miecz/kij), łuk albo magia. Druga ręka: magia = wzmacnia czary, brak = tarcza (pancerz). */
  rodzaj?: 'luk' | 'magia';
  amunicja?: Amunicja;
  /** Broń: obrażenia min–max (jak w Repozytorium broni). */
  obrazenia?: [number, number];
  /** Pancerz (zbroja, hełm, buty, tarcza) albo moc czarów (kula/księga). */
  moc?: number;
  /** Wymagany poziom wyszkolenia broni (Krzepa, Celność, Skupienie). */
  wymaganySkill?: number;
  /** Cena skupu/napraw (do sklepów nie trafia). */
  cena?: number;
  wytrzymalosc?: number;
  rzadkosc?: Rzadkosc;
  /** Umiejętność, którą daje noszenie (content/umiejetnosci.ts): dostępna od razu, bez wymaganego poziomu. */
  umiejetnosc?: string;
  efekt?: Przedmiot['efekt'];
  /** Szybsze chodzenie (0.1 = +10%). */
  bieg?: number;
  /** Jak wygląda w ręku ludzika (kod rysuje kształt): miecz, szabla, kij; łuk i kostur wynikają z rodzaju. */
  wyglad?: 'miecz' | 'szabla' | 'galaz';
}

export interface WpisPrzedmiotu {
  id: string;
  dane: DanePrzedmiotu;
  ikona?: string | null;
  ikona_hd?: string | null;
  aktywny?: boolean;
  tylko_test?: boolean;
}

/** Obrazki własnych przedmiotów: id → data URL (mały/duży). */
export const OBRAZKI_WLASNE = new Map<string, { maly?: string; duzy?: string }>();
/** Wyłączone w panelu: nie wypadają z nowych łupów (gracze, którzy je mają, zachowują je). */
export const WYLACZONE = new Set<string>();

const liczba = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : undefined;

/** Wpis z panelu → przedmiot gry (nazwa i opis czytane w języku gracza). */
export function przedmiotZWpisu(w: WpisPrzedmiotu): Przedmiot {
  const d = w.dane;
  const p: Przedmiot = {
    id: w.id,
    get nazwa() { return tx(d.nazwa.pl, d.nazwa.en || d.nazwa.pl); },
    miejsce: d.miejsce,
    moc: liczba(d.moc, 0, 10000) ?? 0,
    cena: Math.round(liczba(d.cena, 0, 10_000_000) ?? 0),
    wlasny: true,
  };
  if (d.opis?.pl) Object.defineProperty(p, 'opis', { get: () => tx(d.opis!.pl, d.opis!.en || d.opis!.pl), enumerable: true });
  if (d.miejsce === 'bron' || d.miejsce === 'dystans') if (d.rodzaj === 'luk' || d.rodzaj === 'magia') p.rodzaj = d.rodzaj;
  if (p.rodzaj === 'luk' && d.amunicja) p.amunicja = d.amunicja;
  if (d.miejsce === 'bron') {
    const [a, b] = d.obrazenia ?? [1, 1];
    const min = Math.round(liczba(a, 1, 10000) ?? 1), max = Math.round(liczba(b, 1, 10000) ?? min);
    p.obrazenia = [Math.min(min, max), Math.max(min, max)];
    p.moc = p.moc || Math.round((p.obrazenia[0] + p.obrazenia[1]) / 2);
    p.wymaganySkill = Math.round(liczba(d.wymaganySkill, 1, 20) ?? 1);
  }
  const trwa = liczba(d.wytrzymalosc, 1, 1_000_000);
  if (trwa) p.wytrzymalosc = Math.round(trwa);
  if (d.rzadkosc) p.rzadkosc = d.rzadkosc;
  if (d.umiejetnosc) p.umiejetnosc = d.umiejetnosc;
  if (d.efekt) p.efekt = d.efekt;
  const bieg = liczba(d.bieg, 0, 1);
  if (bieg) p.bieg = bieg;
  if (d.wyglad) p.wyglad = d.wyglad;
  return p;
}

/** Podmienia własne przedmioty w PRZEDMIOTY (stare usuwa, nowe dokłada) i rejestruje ich obrazki. */
export function ustawWlasne(lista: WpisPrzedmiotu[] | null | undefined) {
  for (let i = PRZEDMIOTY.length - 1; i >= 0; i--) if (PRZEDMIOTY[i].wlasny) PRZEDMIOTY.splice(i, 1);
  OBRAZKI_WLASNE.clear();
  WYLACZONE.clear();
  for (const w of lista ?? []) {
    if (!w || typeof w.id !== 'string' || !/^w_[a-z0-9_]{1,38}$/.test(w.id) || !w.dane?.nazwa?.pl) continue;
    try {
      PRZEDMIOTY.push(przedmiotZWpisu(w));
      OBRAZKI_WLASNE.set(w.id, { maly: w.ikona ?? undefined, duzy: w.ikona_hd ?? w.ikona ?? undefined });
      if (w.aktywny === false) WYLACZONE.add(w.id);
    } catch {
      // a broken row never stops the game
    }
  }
}
