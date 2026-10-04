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

/** Strzały do łuku: kołczan mieści `kolczan`, nowy łuk przychodzi z `zLukiem`. */
export const STRZALY = {
  cena: 3,
  kolczan: 50,
  zLukiem: 20,
  /** Postacie sprzed strzał dostają tyle na start (żeby łuk nie stanął). */
  naStart: 50,
  /** Licznik przy broni robi się czerwony poniżej tylu. */
  malo: 10,
};
