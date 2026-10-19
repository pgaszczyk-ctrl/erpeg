// ============================================================================
//  WALKA TUROWA NA MAPIE (MVP 1, tylko serwer testowy)
//  Chodzenie po mapie zostaje na żywo, ale potwory nikogo nie gonią: siedzą
//  zbitymi grupkami. Wejście w „bliską przestrzeń” grupki zatrzymuje grę:
//  Podejdź albo Odejdź. Podejście: smok rozmawia, rozmowni (bandyci, herszt)
//  gadają albo biorą okup, narwani od razu walczą – w turach, w tym samym
//  miejscu mapy. Po walce bohater sam wraca do pełnego zdrowia.
//  Wszystkie liczby to próba do strojenia, nie zatwierdzony balans.
//  Odległości w „W” = wysokość bohatera na mapie (56 × 0,36 × SKALA_POSTACI).
// ============================================================================

import type { RodzajWroga } from './fabula';

export const WALKA_TUROWA = {
  /** Promień bliskiej przestrzeni grupki (W, liczony od najbliższego członka). */
  bliskoW: 1.9,
  /** „Odejdź” odsuwa bohatera tyle W poza krąg. */
  odsunW: 0.8,
  /** Okienko wraca dopiero, gdy bohater odejdzie tyle W poza krąg (albo wyjdzie z terenu gangu). */
  powrotW: 4,
  /** Członkowie jednej grupki stoją najwyżej tyle W od siebie (łańcuchem); więcej niż `maksUczestnikow` nie walczy naraz. */
  grupkaLancuchW: 2.4,
  maksUczestnikow: 6,

  /** Ruchy na turę według poziomu postaci: [od poziomu, ile]. */
  ruchy: [[1, 3], [5, 4], [12, 5]] as [number, number][],
  koszt: { cios: 1, ruch: 1, mocny: 2, lecz: 1, ucieczka: 1, oslona: 1 },
  /** Zasięg jednego „Ruchu” bohatera (długość prawdziwej drogi, W). */
  ruchW: 3.4,
  /** Krótki doskok wliczony w cios (droga, W) i powrót na miejsce. */
  doskokW: 1.3,
  /** Zasięg strzału z łuku / czaru (W); potrzebna wolna linia bez budynków. */
  strzalW: 8,
  /** Siatka szukania drogi (piksele mapy). */
  kratkaPx: 3,
  /** Odstęp między obszarami zajętymi na ziemi (px mapy). */
  odstepPx: 2,

  /** Rozstawienie po podejściu: linia wręcz tyle W od bohatera, dystansowi dalej, herszt pośrodku z tyłu; odstęp boczny w W. */
  rozstaw: { wreczW: 2.6, dystansW: 4.4, szefW: 4.0, bokW: 1.45 },

  /** Wróg: zasięg ruchu (W), ilu naraz bije wręcz, ilu naraz strzela, szansa trafienia, mnożnik obrażeń, mnożnik życia. */
  // Właściciel 18.10: „bardzo łatwo, nawet z hersztem nie czułem zagrożenia” – mocniej i częściej, życie bliżej zwykłego.
  wrog: { ruchW: 2.6, natarcieWrecz: 2, salwa: 2, trafienie: 0.8, obrazenia: 1.3, zycie: 0.8, strzalW: 6.5 },
  /** Herszt i berserker robią tyle działań w swojej turze (herszt zawsze może bić, poza limitem natarcia). */
  akcjeSzefa: 2,
  akcjeBerserkera: 2,
  /**
   * Po ciosie bohater cofa się tylko część drogi doskoku: na poziomie 1 `od`, rośnie do `do` na poziomie `pelnyOd`
   * (właściciel 18.10: „powinienem być trochę bliżej, zwłaszcza na niskim poziomie”). Cios pada z miejsca jak najbliżej celu.
   */
  powrot: { od: 0.15, do: 0.8, pelnyOd: 15 },
  /** Ćwiczenie umiejętności za jeden cios w turach (dawniej jeden z tysięcy szybkich ciosów). */
  cwiczenie: 6,
  /** Ucieczka: tyle połówek serca kosztuje (nigdy do śmierci). */
  ucieczkaPolowek: 2,

  /** Szczęście (koniczynka): krytyk (×mnożnik), szczęśliwy unik ciosu wroga, +1 ruch na początku tury. */
  szczescie: { krytyk: 0.08, krytykMnoznik: 1.6, unik: 0.08, dodatkowyRuch: 0.06 },
  /** Po nocy w hotelu (zamiast niebieskich serduszek): tyle minut więcej szczęścia (×) i jeden ruch więcej w każdej turze. */
  hotel: { minut: 30, szczescieRazy: 2, ruchow: 1 },

  /** Okup u rozmownych: monety za każdego członka grupki (×poziom postaci/2, co najmniej ×1). */
  okupZaCzlonka: 8,
  /** Kamera w walce: o jeden stopień bliżej, jeśli wszyscy się mieszczą; wysokość dolnego panelu (CSS px) do ominięcia. */
  panelPx: 168,
  /** Nowe sterowanie (serwer testowy): pasek tury u góry zakrywa tyle CSS px. */
  panelNowyPx: 84,
  /** Czas jednego kroku animacji (ms). */
  animMs: 260,
};

/**
 * Grupki w gangach (zamiast potworów rozsianych po terenie): ile grupek, ilu w każdej
 * i czy herszt siedzi przy ostatniej. Grupka stoi zbita (promień `zbitaW`), w małym
 * miejscu terenu; kolejne grupki co najmniej `odstepW` od siebie.
 */
export const GRUPKI_GANGU: Record<string, { grupek: number; czlonkow: [number, number]; herszt: boolean }> = {
  Banda: { grupek: 1, czlonkow: [3, 4], herszt: false },
  'Mały gang': { grupek: 1, czlonkow: [3, 4], herszt: true },
  'Wielki gang': { grupek: 3, czlonkow: [3, 4], herszt: true },
};
export const GRUPKA = { zbitaW: 1.1, odstepW: 11, odSrodka: 0.6, gestosc: 2.5 };
// gestosc – w walce turowej gangów jest tyle razy więcej (właściciel 18.10: „trudno je znaleźć”).

/** Kto jak się rozstawia w walce. */
export type RolaWWalce = 'wrecz' | 'dystans' | 'szef';
export const ROLA_WROGA: Partial<Record<RodzajWroga, RolaWWalce>> = {
  szkielet: 'dystans',
  wodnik: 'dystans',
  herszt: 'szef',
  wielki_herszt: 'szef',
  koziol: 'szef',
  smok: 'szef',
};

/** Z kim da się pogadać przed walką (owner: bandyci i herszt); reszta jest narwana. */
export const ROZMOWNI: RodzajWroga[] = ['bandyta', 'herszt', 'wielki_herszt'];

/** Teksty spotkań (PL). */
export const SPOTKANIA = {
  narwani: (kto: string) => `${kto}. Narwani – jak podejdziesz, będzie walka.`,
  rozmowni: (kto: string) => `${kto}. Wyglądają, jakby dało się z nimi pogadać… albo i nie.`,
  smok: (kto: string) => `${kto} odpoczywa przy drodze. Patrzy na ciebie spokojnie.`,
  rozmowa: [
    '– Czego tu? To nasz teren. Chcesz przejść, to płać.',
    '– Kometa wszystkim pomieszała w głowach, a my tylko pilnujemy swojego.',
    '– Słyszeliśmy o tobie. Albo sypniesz groszem, albo pogadamy inaczej.',
    '– Herszt mówi, że za odpowiednią opłatą możemy się stąd wynieść.',
  ],
  okupOk: 'Złapali monety, splunęli i zniknęli w zaułkach. Teren wolny.',
  okupBrak: (ile: number, masz: number) => `Chcą ${ile} monet, a masz ${masz}. Śmieją się.`,
  smokMowi: [
    '– Kometa rozpaliła nam krew, ale nie wszystkim odebrała rozum – mówi smok. – Idź swoją drogą, wędrowcze.',
    '– Czujesz rdzę w powietrzu? To Rdza Umysłu. Trzymaj się z dala od narwanych chochlików.',
    '– Moi bracia śpią w górach. Kiedyś znów zaśpiewamy razem.',
    '– Pachniesz mosiądzem i parą. Ludzie znów budują… Uważaj, żeby nie obudzić tego, co śpi.',
  ],
  smokWyzwanie: 'Możesz iść dalej… albo stanąć z nim do walki. Smok zapowiada swoje ataki – patrz na czerwone pola.',
  smokFabuly: 'Smok czeka na ciebie. Tym razem nie odleci. Uważaj na czerwone pola – tam spadnie jego atak.',
  wygrana: 'Wygrana! Odpoczywasz chwilę – wracają wszystkie siły.',
  ucieczka: 'Uciekasz! Dostajesz jeszcze po plecach, ale grupka zostaje w miejscu.',
};

/**
 * Smok w walce turowej (właściciel 18.10.2026: „walka ze smokiem też ma być turowa”; docs/walka/SMOK_TUROWY.md).
 * Smok zapowiada swój atak specjalny czerwonym polem na ziemi pod koniec tury, gracz ma swoją turę na wyjście,
 * cios albo Osłonę, w następnej turze smoka atak spada na pole. Obrażenia = część pełnego życia bohatera
 * (× TRUDNOSC_SMOKOW.obrazenia), Osłona je zmniejsza. Liczby do wyważenia później.
 */
export const SMOK_W_TURACH = {
  /** Działania na turę (ruch, ugryzienie, wykonanie zapowiedzi). */
  akcje: 2,
  /** Zasięg ruchu smoka (W). */
  ruchW: 2.2,
  /** Po wykonaniu ataku specjalnego tyle tur smoka bez nowej zapowiedzi. */
  odpoczynek: 1,
  /** Życie smoka z historii w turach: tyle zwykłych ciosów bohatera. Dzikie: życie gatunku (content/smoki.ts). */
  ciosowFabuly: 16,
  ugryzienie: { obrazenia: 0.12 },
  ogien: { dlugoscW: 4.6, polkat: 34, obrazenia: 0.3, plonieTur: 2, plonieObrazenia: 0.08 },
  kwas: { promienW: 1.1, rozrzutW: 1.8, obrazenia: 0.18, kaluzaTur: 3, kaluzaObrazenia: 0.07 },
  dym: { promienW: 3, odSmokaW: 2, tur: 3, obrazenia: 0.07, ruchowMniej: 1 },
  lot: { promienW: 2.6, obrazeniaSrodek: 0.4, obrazeniaBrzeg: 0.12, ogluszenieTur: 1 },
  /** Osłona: obrażenia × tyle (do końca tury przeciwników). */
  oslona: 0.5,
  zapowiedzi: {
    ogien: '🔥 Smok nabiera powietrza – ogień spadnie na czerwone pole!',
    kwas: '🧪 Smok zbiera kwas w pysku – wyjdź z czerwonych kół!',
    dym: '☠ Smok wciąga powietrze – trujący obłok wypełni czerwone koło!',
    lot: '🪽 Smok wzbija się w powietrze – wyląduje na cieniu!',
  },
  napisy: { ogien: 'Ogień!', kwas: 'Kwas!', dym: 'Trujący obłok!', lot: 'Lądowanie!', ogluszony: 'Smok ogłuszony!' },
};
