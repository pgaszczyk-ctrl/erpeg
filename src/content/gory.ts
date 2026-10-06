// ----------------------------------------------------------------------------
//  GÓRY – jak teren wpływa na grę na mapach świata (np. Zakopane i Tatry).
//  Wysokości pochodzą z darmowej mapy wysokości całej Ziemi (src/map/terrain.ts).
// ----------------------------------------------------------------------------

export const GORY = {
  /**
   * Od jakiego nachylenia poza szlakiem robi się „stromo” (przewyższenie na metr: 0.45 to ok. 24°):
   * dalej da się iść, ale bardzo wolno (zgłoszenie 57, właściciel 6.10.2026: łąka pod skocznią w Zakopanem
   * wyglądała zwyczajnie, a była ścianą nie do przejścia).
   */
  stromoBezSzlaku: 0.45,
  /** Prędkość poza szlakiem na zboczu o nachyleniu `stromoBezSzlaku` (mnożnik, oprócz zwykłego „pod górę”)… */
  naStromym: 0.5,
  /** …malejąca do tej przy urwisku. */
  naStromymMin: 0.2,
  /** Urwisko (1.0 = 45°): tu poza szlakiem już się nie wejdzie. */
  urwisko: 1.0,
  /** Po skałach, piargach i lodowcach chodzi się tylko szlakiem. */
  skalyTylkoSzlakiem: true,
  /** Pod górę wolniej: prędkość / (1 + podejscie × nachylenie) (Góry v2, GORY.md p. 7: było 2,5). */
  podejscie: 3,
  /** Z góry też wolniej: prędkość / (1 + zejscie × nachylenie) (było 0,8 i dopiero od 10 %). */
  zejscie: 0.9,
  /**
   * Góry v2 (właściciel 6.10.2026, GORY.md p. 7–7c): teren niżej od bohatera warstwami co 10 m coraz bardziej rozmyty,
   * niebieskawy, od 20 m w dół mgła; pomniejszony i z paralaksą (1 = włączone, 0 = tylko rozmycie i mgła – plan B na słabe telefony).
   */
  paralaksa: 1,
  /** Jak szybko kotwica paralaksy dogania bohatera (s). */
  kotwicaS: 1.4,
  /** Najdalej, jak kotwica paralaksy zostaje w tyle za bohaterem (px mapy). */
  paralaksaMaksPx: 40,
  /** Siatka wysokości wysyłana na kartę graficzną (m). */
  siatkaM: 8,
  /** Kurz spod butów na podejściu od takiego nachylenia, co tyle ms. */
  kurzOd: 0.28,
  kurzCoMs: 220,
  /** Znaki szlaku przy ścieżkach powyżej tej wysokości (m n.p.m.), co tyle metrów. */
  szlakOdM: 1000,
  znakCoM: 40,
  /** Poziomice co tyle metrów, co piąta grubsza. */
  poziomice: 20,
  /** Jak mocne jest cieniowanie gór (0 – brak, 1 – mocne). */
  cien: 0.55,
};
