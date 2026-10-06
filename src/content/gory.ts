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
  /** Pod górę wolniej: prędkość / (1 + podejscie × nachylenie). */
  podejscie: 2.5,
  /** Z góry też trochę wolniej na stromym: prędkość / (1 + zejscie × nachylenie). */
  zejscie: 0.8,
  /** Poziomice co tyle metrów, co piąta grubsza. */
  poziomice: 20,
  /** Jak mocne jest cieniowanie gór (0 – brak, 1 – mocne). */
  cien: 0.55,
};
