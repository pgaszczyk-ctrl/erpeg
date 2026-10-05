// ============================================================================
//  KSIĘGA OSIĄGNIĘĆ (Kufer → zakładka „Księga osiągnięć”).
//  Pieczęcie liczone z tego, co gra już zapisuje (statystyki, poziom, tytuł).
//  Nowa pieczęć = nowy wpis tutaj; `ile` mówi, ile już jest, `cel` – ile trzeba.
// ============================================================================

export interface StanDoOsiagniec {
  km: number;
  zabite: number;
  gangi: number;
  pojedynki: number;
  misje: number;
  owoce: number;
  zarobione: number;
  poziom: number;
  tytul: string | null;
  hasla: number;
}

export interface Osiagniecie {
  ikona: string;
  nazwa: string;
  opis: string;
  cel: number;
  ile: (s: StanDoOsiagniec) => number;
}

export const OSIAGNIECIA: Osiagniecie[] = [
  { ikona: '🥾', nazwa: 'Pierwsze kroki', opis: 'Przejdź 1 km.', cel: 1, ile: (s) => s.km },
  { ikona: '🗺', nazwa: 'Wędrowiec', opis: 'Przejdź 25 km.', cel: 25, ile: (s) => s.km },
  { ikona: '🧭', nazwa: 'Podróżnik', opis: 'Przejdź 100 km.', cel: 100, ile: (s) => s.km },
  { ikona: '⚔', nazwa: 'Pierwsza krew', opis: 'Pokonaj pierwszego potwora.', cel: 1, ile: (s) => s.zabite },
  { ikona: '👹', nazwa: 'Pogromca chochlików', opis: 'Pokonaj 100 potworów.', cel: 100, ile: (s) => s.zabite },
  { ikona: '🏴', nazwa: 'Postrach gangów', opis: 'Rozbij 5 gangów.', cel: 5, ile: (s) => s.gangi },
  { ikona: '🤺', nazwa: 'Mistrz pojedynków', opis: 'Wygraj 10 pojedynków z mieszkańcami.', cel: 10, ile: (s) => s.pojedynki },
  { ikona: '📜', nazwa: 'Zaufany', opis: 'Wykonaj 10 zleceń.', cel: 10, ile: (s) => s.misje },
  { ikona: '🍎', nazwa: 'Sadownik', opis: 'Zbierz 500 owoców i warzyw.', cel: 500, ile: (s) => s.owoce },
  { ikona: '💰', nazwa: 'Kupiec', opis: 'Zarób łącznie 10 000 złota.', cel: 10_000, ile: (s) => s.zarobione },
  { ikona: '⭐', nazwa: 'Doświadczony', opis: 'Osiągnij 10. poziom.', cel: 10, ile: (s) => s.poziom },
  { ikona: '👑', nazwa: 'Mistrz', opis: 'Osiągnij 20. poziom.', cel: 20, ile: (s) => s.poziom },
  { ikona: '🐉', nazwa: 'Cień smoka', opis: 'Zakończ historię smoka (dowolnym tytułem).', cel: 1, ile: (s) => (s.tytul ? 1 : 0) },
  { ikona: '🤫', nazwa: 'Wtajemniczony', opis: 'Zdradź komuś tajemne hasło.', cel: 1, ile: (s) => s.hasla },
];
