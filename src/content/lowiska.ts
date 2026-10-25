// ============================================================================
//  ŁOWISKA — test pilota „walka i gęste łowiska” (brief właściciela, 25.10.2026).
//  Odrębny, w pełni odwracalny eksperyment: watahy wilków żyją w prawdziwych
//  lasach (OSM natural=wood/landuse=forest, CityMap.areaKindsAt), zawsze w
//  czasie rzeczywistym (Slime.spokojny = false) – niezależnie od globalnego
//  przełącznika walki turowej `tury()` (src/walka/tryb.ts). Nic z istniejącej
//  walki turowej, Areny Cechu czy innych gangów nie jest tym ruszane.
//
//  Włączane tylko świadomie: `?lowiska=1` (zapamiętane na urządzeniu jako
//  localStorage „exp-lowiska”), domyślnie wyłączone nawet na serwerze
//  testowym. `?lowiska=0` wyłącza z powrotem.
//
//  Właściciel, 25 Oct 2026: to NIE jest gang, który się „rozbija" dla jednorazowej
//  nagrody – watacha nie ma bossa i nie ma specjalnej premii za pokonanie ostatniego
//  członka. Każdy zabity wilk/warg daje EXP z osobna (ciągłe farmienie), a głębiej
//  w dziczy (dalej od miast/miejsc) trafiają się silniejsze wargi – patrz LOWISKA.glebia*.
//
//  Wszystkie liczby poniżej są WARTOŚCIAMI DO TESTU (brief, rozdz. 4 i 8),
//  nie zatwierdzonym bilansem. Jednostki metryczne (m, m/s) przeliczane na
//  piksele świata przez PX_PER_M w miejscu użycia – tak jak przy gangach
//  (content/gangi.ts GANG_OD_MIEJSC_M itd.).
// ============================================================================

const wymuszone = (() => {
  try {
    const q = new URLSearchParams(location.search).get('lowiska');
    if (q === '0' || q === '1') localStorage.setItem('exp-lowiska', q);
    return localStorage.getItem('exp-lowiska');
  } catch {
    return null;
  }
})();

/** Czy nowy pilot łowisk jest włączony w tej sesji (patrz nagłówek pliku). */
export function lowiska() {
  return wymuszone === '1';
}

export interface WilkParam {
  /** Z jakiej odległości (m) wataha zauważa bohatera. */
  sightRange: number;
  /** Od jakiej odległości (m) traci zainteresowanie. */
  loseRange: number;
  /** Z jakiej odległości (m) może zacząć zapowiedź doskoku. */
  doskokZasiegM: number;
  /** Dodatkowy zasięg (m, do promienia ciała), w którym doskok trafia. */
  trafienieZasiegM: number;
  /** Prędkość podchodzenia (m/s). */
  predkoscPodejscia: number;
  /** Prędkość doskoku/szarży (m/s). */
  predkoscDoskoku: number;
  /** Zapowiedź – czas na reakcję (ms). */
  zapowiedzMs: number;
  /** Sam doskok (ms). */
  doskokMs: number;
  /** Odpoczynek po doskoku, zanim zdecyduje znowu (ms). */
  odpoczynekMs: number;
  /** Obrażenia jednego trafionego doskoku (połówki serca, jak ENEMY_KINDS.damage). */
  obrazenie: number;
}

export const LOWISKA = {
  /** Promień terytorium jednej watahy (m) – podobnego rzędu co istniejące gangi (GANG_OD_MIEJSC_M = 200). */
  promienM: 70,
  /** Ile watah średnio na km² LASU (nie całej mapy). */
  naKm2Lasu: 1.1,
  /** Zwykła wataha (liczba wilków). */
  pakiet: [3, 6] as [number, number],
  /** Większe spotkanie: rzadsze, więcej przeciwników naraz (bez salwy całej grupy – patrz limitAtakow). */
  wieksze: { czlonkow: [8, 12] as [number, number], szansa: 0.25 },
  /**
   * Trudniejsze stworki głębiej w dziczy (właściciel, 25 Oct 2026) – udział silniejszego warga w watasze
   * rośnie z odległością jej środka od najbliższego znanego miejsca (drzwi/dom – ta sama lista `avoid` co
   * przy stawianiu siedlisk): 0 do `glebiaOdM`, rośnie do `wargMax` przy `glebiaPelnaOdM`. Nigdy 100% i
   * nigdy obowiązkowy do przejścia – to tylko udział, każdy członek losowany z osobna.
   */
  glebiaOdM: 400,
  glebiaPelnaOdM: 1800,
  wargMax: 0.5,
  /** Sekundy AKTYWNEJ symulacji (nie zegara ściennego) od rozbicia, zanim miejsce może dać nową generację. */
  odnowieniePoS: 25,
  /** Odnowienie czeka, gdy bohater jest bliżej niż to (m) – musi być większe niż promień aktywacji poniżej,
   *  żeby wataha nigdy nie odrodziła się na oczach/pod stopami bohatera. */
  bezOdnowieniaWidoczneM: 260,
  /** Z jakiej odległości (m) wataha jest „blisko” i dostaje żywe modele. */
  aktywacjaM: 220,
  /** Ile watah naraz liczy się do wspólnego budżetu żywych modeli (informacyjnie – patrz brief rozdz. 9). */
  pobliskieMax: 3,
  /** Wspólny limit równoczesnych sekwencji ataku (zapowiedź…odpoczynek) wokół bohatera. */
  limitAtakow: { wrecz: 2, dystans: 1 },

  wilk: {
    sightRange: 44, loseRange: 70,
    doskokZasiegM: 7, trafienieZasiegM: 0.8,
    predkoscPodejscia: 11, predkoscDoskoku: 34,
    zapowiedzMs: 650, doskokMs: 320, odpoczynekMs: 1000,
    obrazenie: 2, // 1 serce
  } as WilkParam,

  warg: {
    sightRange: 50, loseRange: 80,
    doskokZasiegM: 8, trafienieZasiegM: 0.9,
    predkoscPodejscia: 10, predkoscDoskoku: 32,
    zapowiedzMs: 950, doskokMs: 360, odpoczynekMs: 1400,
    obrazenie: 4, // 2 serca
  } as WilkParam,
};
