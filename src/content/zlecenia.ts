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
  /** Zlecenia „pokonaj gluty pod adresem”. */
  pokonaj: string[];
  /** Zlecenia „dojdź / zanieś coś pod adres”. */
  idz: string[];
  /** Jak daleko (w metrach) może być cel. */
  odleglosc: [number, number];
}

export const KOSCIOL: SzablonZlecen = {
  tytuly: ['Prośba proboszcza', 'Sprawa parafialna', 'Pomoc dla sąsiada'],
  pokonaj: [
    'Proboszcz prosi o pomoc: gluty oblazły ogródek przy {adres}. Przegoń je, a Bóg ci wynagrodzi.',
    'Pani z chóru skarży się, że pod {adres} kręcą się fioletowe gluty. Zrób z nimi porządek.',
  ],
  idz: [
    'Zanieś pani Halinie spod {adres} ciasto z kiermaszu parafialnego.',
    'Trzeba doręczyć zaproszenie na odpust pod adres {adres}.',
  ],
  odleglosc: [150, 700],
};

export const URZAD: SzablonZlecen = {
  tytuly: ['Sprawa urzędowa', 'Pilne pismo', 'Skarga mieszkańców'],
  pokonaj: [
    'Mieszkańcy spod {adres} złożyli skargę na gluty. Urzędnik prosi o rozwiązanie problemu w trybie pilnym.',
    'Wydział porządku publicznego zleca usunięcie glutów spod {adres}.',
  ],
  idz: [
    'Doręcz pismo urzędowe pod adres {adres}. Za potwierdzenie odbioru czeka nagroda.',
    'Zanieś decyzję w sprawie ogródka działkowego do mieszkańca spod {adres}.',
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
    'Przy ulicy {ulica} grasuje wielki glut. Zabij go, zanim kogoś połknie!',
    'Mieszkańcy ulicy {ulica} widzieli ogromnego, fioletowego gluta. Potrzebny ktoś odważny.',
  ],
  zloczyncy: ['Mietek Łom', 'Zdzichu Wytrych', 'Czarny Kazik', 'Heniek Fałszerz', 'Bolek Kieszonkowiec', 'Rudy Wiesiek'],
  odleglosc: [300, 1200] as [number, number],
  /** Nagrody w monetach (EXP tyle samo). */
  nagrodaBandyta: 60,
  nagrodaPotwor: 90,
};

/** Nagroda za zwykłe zlecenia: podstawa + dodatek za każde 100 m drogi. */
export const NAGRODA = { pokonaj: 15, idz: 6, zaKazde100m: 2 };
