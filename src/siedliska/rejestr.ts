// Rejestr siedlisk mapy: CityMap trzyma listę (tylko typy – patrz CityMap.siedliska), tu jest kod, który ją
// zmienia i podpina kolizje konstrukcji pod CityMap.isBlocked (bohater, potwory, pociski, stawianie rzeczy).
import { PX_PER_M, type CityMap } from '../map/CityMap';
import { OBOZ } from '../content/siedliska';
import { zablokowaneW, ustawGruboscPalisady, obejscie, podlozeW } from './kolizje';
import type { Siedlisko } from './typy';

ustawGruboscPalisady(OBOZ.grubosc);

/** Dodaje siedlisko (raz na id); odświeża zapamiętane podłoże i powiadamia renderer (kawałki pod nim się przemalują). */
export function dodajSiedlisko(city: CityMap, s: Siedlisko) {
  if (city.siedliska.some((q) => q.id === s.id)) return false;
  city.siedliska.push(s);
  city.przeszkoda = (x, y) => {
    for (const q of city.siedliska) if (zablokowaneW(q, x, y, PX_PER_M)) return true;
    return false;
  };
  city.podlozeSiedliska = (x, y) => {
    for (const q of city.siedliska) { const p = podlozeW(q, x, y); if (p) return p; }
    return null;
  };
  city.zapomnijPodloze();
  for (const f of city.siedliskaSluchacze) f(s);
  return true;
}

/** Punkt pośredni przez bramę dla stworków (StworHost.przejscie). */
export function przejscieSiedlisk(city: CityMap, ax: number, ay: number, bx: number, by: number) {
  return city.siedliska.length ? obejscie(city.siedliska, ax, ay, bx, by, PX_PER_M) : null;
}
