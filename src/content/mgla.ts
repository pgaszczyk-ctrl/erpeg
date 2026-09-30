// ============================================================================
//  MGŁA NIEZNANYCH MIEJSC – zamiast czarnej pustki stara mapa (pergamin).
//  W dzień jasna, nocą ciemna, o świcie i zmierzchu płynnie pomiędzy –
//  według prawdziwego wschodu i zachodu słońca dla miejsca na mapie.
//  Plik od grafika (opcjonalnie): public/swiat/mgla_pergamin.png, kafelkujący
//  się, duże miękkie plamy (drobne szczegóły i tak się rozmyją).
// ============================================================================

export const MGLA = {
  /** Kolor pergaminu w pełnym dniu (R, G, B). */
  dzien: [206, 200, 178],
  /** Jak bardzo przyciemnić pergamin nocą (0 = wcale, 1 = czarno). */
  nocCiemnosc: 0.78,
  /** Ile godzin przed wschodem / po zachodzie trwa szarówka. */
  szarowkaGodzin: 1,
  /** Poznane, ale teraz niewidoczne miejsca: jak mocno je przykryć pergaminem (0–255). */
  poznaneKrycie: 150,
  /** Pergamin przesuwa się razem z bohaterem o taką część jego drogi (0 = przypięty do mapy, 1 = jedzie z graczem). */
  paralaksa: 1 / 20,
  /** Plik grafika z teksturą pergaminu (w public/swiat/): 'mgla_pergamin' (rzadsza siatka, polecana) albo 'mgla_pergamin_gestsza'. */
  plik: 'mgla_pergamin',
  /** Widziany budynek odsłania też tyle punktów mapy ziemi wokół siebie, żeby krawędź mgły nie szarpała tuż przy ścianie. */
  odScian: 4,
};
