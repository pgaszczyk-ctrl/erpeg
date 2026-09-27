// ----------------------------------------------------------------------------
//  POCIĄGI DALEKOBIEŻNE – z Lublina do miejsc spoza naszej mapy regionu.
//  Woźnica na dowolnej stacji w Lublinie proponuje te wyjazdy (od podanego
//  poziomu postaci, za podaną cenę). Mapa na miejscu powstaje z mapy świata
//  w trakcie chodzenia (src/map/world.ts). Z każdej stacji na takiej mapie
//  można wrócić do Lublina za `powrot.cena`.
// ----------------------------------------------------------------------------

export interface Pociag {
  nazwa: string;
  /** Dworzec docelowy. */
  lat: number;
  lon: number;
  cena: number;
  odPoziomu: number;
}

export const POCIAGI: Pociag[] = [
  { nazwa: 'Zakopane', lat: 49.30077, lon: 19.96304, cena: 5000, odPoziomu: 7 },
];

export const POWROT = { nazwa: 'Lublin', cena: 5000 };
