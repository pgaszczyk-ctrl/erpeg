// Rzadkość przedmiotów (właściciel, 22.11.2026: „przedmioty lepsze niż zwykłe muszą mieć też inną poświatę – rarki,
// uncommony, unique, epik”). Liczona z istniejącej jakości (content/przedmioty.ts JAKOSCI_*): 2 = niepospolity,
// 3 = rzadki, 4 = epicki; przedmioty z mocą specjalną (mityczne miecze, talizmany z misji) = unikat.
// Bez Phasera – używają tego też okna HTML (Kufer, sklep).
import { PRZEDMIOTY } from './przedmioty';
import { tx } from '../i18n';

export type Rzadkosc = 'kiepski' | 'zwykly' | 'niepospolity' | 'rzadki' | 'epicki' | 'unikat';

export interface OpisRzadkosci {
  readonly nazwa: string;
  /** Kolor poświaty na ziemi (Phaser) i w okienkach (CSS). */
  kolor: number;
  css: string;
  /** 0 = bez poświaty; im więcej, tym większa i jaśniejsza. */
  poziom: number;
  /** Słup światła nad przedmiotem na ziemi (epickie i unikaty). */
  slup: boolean;
}

export const RZADKOSCI: Record<Rzadkosc, OpisRzadkosci> = {
  kiepski: { get nazwa() { return tx('Kiepski', 'Poor'); }, kolor: 0x9a9a9a, css: '#9a9a9a', poziom: 0, slup: false },
  zwykly: { get nazwa() { return tx('Zwykły', 'Common'); }, kolor: 0xffffff, css: '#f2ead8', poziom: 0, slup: false },
  niepospolity: { get nazwa() { return tx('Niepospolity', 'Uncommon'); }, kolor: 0x4fe36a, css: '#5fe37a', poziom: 1, slup: false },
  rzadki: { get nazwa() { return tx('Rzadki', 'Rare'); }, kolor: 0x4aa8ff, css: '#5ab0ff', poziom: 2, slup: false },
  epicki: { get nazwa() { return tx('Epicki', 'Epic'); }, kolor: 0xb45cff, css: '#c27bff', poziom: 3, slup: true },
  unikat: { get nazwa() { return tx('Unikat', 'Unique'); }, kolor: 0xffa52e, css: '#ffb347', poziom: 4, slup: true },
};

/** Unikaty bez mocy specjalnej (korona tylko z haseł/nagród). */
const UNIKATY = new Set(['korona']);

export function rzadkoscPrzedmiotu(id: string): Rzadkosc {
  const p = PRZEDMIOTY.find((x) => x.id === id);
  if (!p) return 'zwykly';
  if (UNIKATY.has(p.id) || (p.efekt && !p.fabularny)) return 'unikat';
  switch (p.jakosc) {
    case 0: return 'kiepski';
    case 2: return 'niepospolity';
    case 3: return 'rzadki';
    case 4: return 'epicki';
    default: return 'zwykly';
  }
}
