// ============================================================================
//  ZLECENIA LOSOWE – kościoły, urzędy i komendy policji.
//  Przy każdym uruchomieniu gry w danym miejscu czeka nowe zlecenie,
//  złożone z jednego z poniższych szablonów. {adres} i {ulica} gra podmienia
//  na prawdziwe miejsce w okolicy, {zloczynca} na imię z listy.
//  Przyjęte, a niedokończone zlecenie nie przepada po wyjściu z gry.
// ============================================================================

export interface SzablonZlecen {
  /** Tytuły do losowania. */
  tytuly: string[];
  /** Zlecenia „pokonaj chochliki pod adresem”. */
  pokonaj: string[];
  /** Zlecenia „dojdź / zanieś coś pod adres”. */
  idz: string[];
  /** Zlecenia „przynieś z lasu”: {ile} i {towar} gra podmienia (np. „5 grzybów”). */
  zbierz: string[];
  /** Jak daleko (w metrach) może być cel. */
  odleglosc: [number, number];
}

export const KOSCIOL: SzablonZlecen = {
  tytuly: ['Prośba proboszcza', 'Sprawa parafialna', 'Pomoc dla sąsiada'],
  pokonaj: [
    'Proboszcz prosi o pomoc: chochliki oblazły ogródek przy {adres}. Przegoń je, a Bóg ci wynagrodzi.',
    'Pani z chóru skarży się, że pod {adres} kręcą się psotne chochliki. Zrób z nimi porządek.',
  ],
  idz: [
    'Zanieś pani Halinie spod {adres} ciasto z kiermaszu parafialnego.',
    'Trzeba doręczyć zaproszenie na odpust pod adres {adres}.',
  ],
  zbierz: [
    'Siostry gotują zupę dla ubogich. Przynieś z lasu {ile} {towar}.',
    'Na kiermasz parafialny brakuje {ile} {towar}. Las jest niedaleko – pomożesz?',
  ],
  odleglosc: [150, 700],
};

export const URZAD: SzablonZlecen = {
  tytuly: ['Sprawa urzędowa', 'Pilne pismo', 'Skarga mieszkańców'],
  pokonaj: [
    'Mieszkańcy spod {adres} złożyli skargę na chochliki. Urzędnik prosi o rozwiązanie problemu w trybie pilnym.',
    'Wydział porządku publicznego zleca usunięcie chochlików spod {adres}.',
  ],
  idz: [
    'Doręcz pismo urzędowe pod adres {adres}. Za potwierdzenie odbioru czeka nagroda.',
    'Zanieś decyzję w sprawie ogródka działkowego do mieszkańca spod {adres}.',
  ],
  zbierz: [
    'Gmina naprawia ławki w parku i potrzebuje {ile} {towar}. Zetnij drzewa w lesie.',
    'Stołówka urzędu zamawia {ile} {towar}. Zbierz je w pobliskim lesie.',
  ],
  odleglosc: [200, 900],
};

export const POLICJA = {
  tytuly: ['List gończy', 'Poszukiwany!', 'Zlecenie dla łowcy nagród'],
  /** Złoczyńca: trzeba go znaleźć (strzałka pokazuje tylko okolicę) i pokonać. */
  bandyta: [
    'List gończy! {zloczynca} ukrywa się gdzieś w okolicy ulicy {ulica}. Znajdź go i pokonaj.',
    'Poszukiwany {zloczynca}, ostatnio widziany przy ulicy {ulica}. Nagroda za ujęcie!',
  ],
  /** Wielki stwór w danym miejscu. */
  potwor: [
    'Przy ulicy {ulica} grasuje wielki chochlik. Zabij go, zanim kogoś ugryzie!',
    'Mieszkańcy ulicy {ulica} widzieli ogromnego, rogatego chochlika. Potrzebny ktoś odważny.',
  ],
  zloczyncy: ['Mietek Łom', 'Zdzichu Wytrych', 'Czarny Kazik', 'Heniek Fałszerz', 'Bolek Kieszonkowiec', 'Rudy Wiesiek'],
  odleglosc: [300, 1200] as [number, number],
  /** Nagrody w monetach (EXP tyle samo). */
  nagrodaBandyta: 60,
  nagrodaPotwor: 90,
  /** Szansa, że policja da też przedmiot (np. łuk) i jakie przedmioty. */
  szansaNaPrzedmiot: 0.35,
  przedmioty: ['luk', 'skorzana_zbroja', 'skorzany_helm', 'skorzane_buty'],
};

/** Nagroda za zwykłe zlecenia: podstawa + dodatek za każde 100 m drogi. */
export const NAGRODA = { pokonaj: 15, idz: 6, zaKazde100m: 2 };

/**
 * Zlecenia „przynieś z lasu”: co można zamówić, ile sztuk (od–do), nagroda za
 * sztukę (więcej niż w sklepie) i jak daleko może być las (metry).
 * Kościół zamawia grzyby, urząd drewno.
 */
export const ZBIERANIE = {
  // formy: 2–4 sztuki, 5 i więcej sztuk
  grzyb: { ile: [3, 6] as [number, number], zaSztuke: 12, formy: ['grzyby', 'grzybów'] },
  drewno: { ile: [2, 4] as [number, number], zaSztuke: 25, formy: ['kawałki drewna', 'kawałków drewna'] },
  premia: 10,
  lasDo: 2000,
};
