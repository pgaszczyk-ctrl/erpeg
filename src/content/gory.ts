// ----------------------------------------------------------------------------
//  GÓRY – jak teren wpływa na grę na mapach świata (np. Zakopane i Tatry).
//  Wysokości pochodzą z darmowej mapy wysokości całej Ziemi (src/map/terrain.ts).
// ----------------------------------------------------------------------------

export const GORY = {
  /**
   * Jak strome zbocze da się przejść bez szlaku (przewyższenie na metr:
   * 0.45 to ok. 24°). Na bardziej stromym trzeba iść ścieżką albo drogą.
   */
  stromoBezSzlaku: 0.45,
  /** Po skałach, piargach i lodowcach chodzi się tylko szlakiem. */
  skalyTylkoSzlakiem: true,
  /** Pod górę wolniej: prędkość / (1 + podejscie × nachylenie). */
  podejscie: 2.5,
  /** Z góry też trochę wolniej na stromym: prędkość / (1 + zejscie × nachylenie). */
  zejscie: 0.8,
  /** Poziomice co tyle metrów, co piąta grubsza. */
  poziomice: 20,
  /** Jak mocne jest cieniowanie gór (0 – brak, 1 – mocne). */
  cien: 0.55,
};
