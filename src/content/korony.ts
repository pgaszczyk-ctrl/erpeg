// Prześwit koron drzew (overhaul 09, src/map/Korony.ts), w px generatora (= 0,5 px mapy).
export const KORONY = {
  /** Promień dziury wokół postaci pod koroną (dane/wiatr.json: 18 px pliku). */
  promien: 18,
  /** Szerokość postrzępionej krawędzi (szachownica). */
  pas: 5,
  /** Jak szybko dziura się otwiera i zamyka (na sekundę; ok. 0,3 s do pełnej). */
  szybkoscPrzeswitu: 7,
  /** Środek postaci nad stopami (px mapy). */
  srodekPostaci: 7,
};

/** Drzewa overhaulu 09: ścinanie i owoce (SPEC_09 punkt 4); dymki nad drzewem, którego nie wolno ściąć. */
export const DRZEWA_09 = {
  /** Pasek postępu gaśnie po tylu ms bez ciosu, a postęp przepada. */
  pasekGasnieMs: 3000,
  dlaczego: {
    park: '🌳 Drzewo w parku – nie wolno ścinać',
    ozdobne: '🌳 Ozdobne drzewo przy domach – nie wolno ścinać',
    gruby: '🌲 Za grube – szukaj drzew z zaciosem',
  } as Record<string, string>,
  /** Za drugim razem przy tym samym powodzie tylko krótko. */
  krotko: '🔒',
  pusto: '🍃 Już puste – owoce wrócą przy następnym logowaniu',
  /** Jaki owoc spada z którego gatunku (gruszek jeszcze nie ma w sklepach). */
  owoc: { jablon: 'jablko', sliwa: 'sliwka', grusza: 'jablko' } as Record<string, 'jablko' | 'sliwka'>,
};
