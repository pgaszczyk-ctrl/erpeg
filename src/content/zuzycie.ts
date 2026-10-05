// ----------------------------------------------------------------------------
// ZUŻYCIE BRONI I STRZAŁY (docs/ekonomia.md, krok 2; 4 X 2026)
//
// Broń się tępi od poziomu trudności Średni wzwyż (`zuzycie` w trudnosc.ts):
// każdy cios, który kogoś trafi, i każdy strzał z łuku zabiera jeden punkt
// wytrzymałości (Przedmiot.wytrzymalosc). Zepsuta broń bije jak kijek, dopóki
// się jej nie naprawi w sklepie (Kupuj → 🔧 Napraw). Kijek, różdżka i miecze
// magiczne (Świetlisty, Gromowładny) się nie zużywają.
// Szklany miecz (`szklany`) pęka na każdym poziomie trudności i znika.
// Później naprawi go kowal (krok 3), a miecze magiczne – diamenty i składniki.
// ----------------------------------------------------------------------------

export const ZUZYCIE = {
  /** Przy tylu procentach wytrzymałości gra ostrzega: „broń się tępi”. */
  ostrzezenieProcent: 20,
  /** Pełna naprawa całkiem zepsutej broni kosztuje tyle ceny sklepowej (mniej zużyta – mniej). */
  naprawaCzescCeny: 0.3,
};

/**
 * Amunicja broni dystansowej (właściciel, 5 X 2026: „dużo więcej, 200, zużywa się jak broń”):
 * łuki strzelają strzałami, kusza bełtami, pistolet parowy nabojami. Każdy strzał zabiera
 * jedną sztukę (i punkt wytrzymałości broni). Każdego rodzaju mieści się `kolczan`,
 * nowa broń przychodzi z `zLukiem` sztuk swojej amunicji.
 */
export type Amunicja = 'strzaly' | 'belty' | 'naboje';

export const AMUNICJA: Record<Amunicja, { nazwa: string; wielu: string; ikona: string; cena: number }> = {
  strzaly: { nazwa: 'Strzały', wielu: 'strzał', ikona: '🏹', cena: 3 },
  belty: { nazwa: 'Bełty', wielu: 'bełtów', ikona: '🎯', cena: 5 },
  naboje: { nazwa: 'Naboje', wielu: 'nabojów', ikona: '🔩', cena: 8 },
};

export const STRZALY = {
  kolczan: 200,
  zLukiem: 50,
  /** Postacie sprzed strzał dostają tyle na start (żeby łuk nie stanął). */
  naStart: 50,
  /** Licznik przy broni robi się czerwony poniżej tylu. */
  malo: 10,
};
