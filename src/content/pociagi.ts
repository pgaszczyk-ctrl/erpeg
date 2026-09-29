// ----------------------------------------------------------------------------
//  WOŹNICE I POCIĄGI DALEKOBIEŻNE
//
//  Każdy woźnica na stacji ma 3 kursy, losowane od nowa o każdej pełnej
//  godzinie i o wpół do (co `zmianaCoMin` minut):
//   1. jedna z `bliskichDoWyboru` najbliższych stacji,
//   2. jedna stacja od `srednioOdKm` do `srednioDoKm` km,
//   3. jedno z DUZYCH_MIAST od `dalekoOdKm` do `maksKm` km – pociąg
//      dalekobieżny (od `odPoziomu`); mapa na miejscu powstaje z mapy świata
//      w trakcie chodzenia (src/map/world.ts).
//  Każdy kurs kosztuje tyle samo za kilometr (opłata + stawka za km).
//  Na dużych stacjach (z „Główny/Główna” w nazwie albo z 3+ kierunkami) stoi
//  3 woźniców, każdy jedzie tylko w swoją stronę świata.
//  Z dalekiego miasta woźnica wozi do najbliższych miast w zasięgu (Lublin jest
//  jednym z nich, jeśli jest blisko) – nie ma obowiązkowego powrotu.
// ----------------------------------------------------------------------------

export const WOZNICA = {
  zmianaCoMin: 30,
  bliskichDoWyboru: 3,
  srednioOdKm: 10,
  srednioDoKm: 50,
  dalekoOdKm: 100,
  /** Najdalej, dokąd woźnica/pociąg jedzie (km w linii prostej). */
  maksKm: 400,
  /** Cena każdego kursu: opłata + za każdy km (travel.ts COACH_FEE / COACH_PER_KM), zaokrąglona w górę do tylu monet. */
  zaokraglenie: 10,
  odPoziomu: 7,
  /** Zniżka u woźniców na zawsze (flaga `znizka_woznica` z misji „Tajemnica stacji”): tyle taniej. */
  znizka: 0.25,
  /** Darmowy przejazd z tej samej misji: u woźnicy na tym dworcu (nazwa stacji zawiera ten tekst). */
  gratisNaStacji: 'Lublin Główny',
  /**
   * Na dużych stacjach stoi tylu woźniców (każdy w inną stronę świata:
   * północ, południe, wschód, zachód – losowo; jedna strona zostaje bez
   * woźnicy aż do następnej zmiany kursów).
   */
  woznicNaDuzejStacji: 3,
  /** Dworce autobusowe (po nazwie) też są „duże”: trzech woźniców. */
  dworzecAutobusowy: /dworzec|autobus|pks/i,
};

export interface Miasto {
  nazwa: string;
  wojewodztwo: string;
  /** Okolice głównego dworca. */
  lat: number;
  lon: number;
}

/** Po dwa miasta z każdego województwa (poza lubelskim, które mamy na własnych mapach). */
export const DUZE_MIASTA: Miasto[] = [
  { nazwa: 'Wrocław', wojewodztwo: 'dolnośląskie', lat: 51.0983, lon: 17.0366 },
  { nazwa: 'Jelenia Góra', wojewodztwo: 'dolnośląskie', lat: 50.9040, lon: 15.7340 },
  { nazwa: 'Bydgoszcz', wojewodztwo: 'kujawsko-pomorskie', lat: 53.1350, lon: 17.9910 },
  { nazwa: 'Toruń', wojewodztwo: 'kujawsko-pomorskie', lat: 53.0000, lon: 18.6150 },
  { nazwa: 'Zielona Góra', wojewodztwo: 'lubuskie', lat: 51.9480, lon: 15.5180 },
  { nazwa: 'Gorzów Wielkopolski', wojewodztwo: 'lubuskie', lat: 52.7300, lon: 15.2400 },
  { nazwa: 'Łódź', wojewodztwo: 'łódzkie', lat: 51.7700, lon: 19.4690 },
  { nazwa: 'Piotrków Trybunalski', wojewodztwo: 'łódzkie', lat: 51.4070, lon: 19.6960 },
  { nazwa: 'Kraków', wojewodztwo: 'małopolskie', lat: 50.0680, lon: 19.9470 },
  { nazwa: 'Zakopane', wojewodztwo: 'małopolskie', lat: 49.30077, lon: 19.96304 },
  { nazwa: 'Warszawa', wojewodztwo: 'mazowieckie', lat: 52.2289, lon: 21.0030 },
  { nazwa: 'Radom', wojewodztwo: 'mazowieckie', lat: 51.4000, lon: 21.1450 },
  { nazwa: 'Opole', wojewodztwo: 'opolskie', lat: 50.6620, lon: 17.9270 },
  { nazwa: 'Nysa', wojewodztwo: 'opolskie', lat: 50.4740, lon: 17.3340 },
  { nazwa: 'Rzeszów', wojewodztwo: 'podkarpackie', lat: 50.0430, lon: 22.0060 },
  { nazwa: 'Przemyśl', wojewodztwo: 'podkarpackie', lat: 49.7840, lon: 22.7760 },
  { nazwa: 'Białystok', wojewodztwo: 'podlaskie', lat: 53.1340, lon: 23.1470 },
  { nazwa: 'Suwałki', wojewodztwo: 'podlaskie', lat: 54.0960, lon: 22.9290 },
  { nazwa: 'Gdańsk', wojewodztwo: 'pomorskie', lat: 54.3560, lon: 18.6440 },
  { nazwa: 'Gdynia', wojewodztwo: 'pomorskie', lat: 54.5200, lon: 18.5300 },
  { nazwa: 'Katowice', wojewodztwo: 'śląskie', lat: 50.2575, lon: 19.0170 },
  { nazwa: 'Częstochowa', wojewodztwo: 'śląskie', lat: 50.8080, lon: 19.1190 },
  { nazwa: 'Kielce', wojewodztwo: 'świętokrzyskie', lat: 50.8740, lon: 20.6180 },
  { nazwa: 'Sandomierz', wojewodztwo: 'świętokrzyskie', lat: 50.6690, lon: 21.7430 },
  { nazwa: 'Olsztyn', wojewodztwo: 'warmińsko-mazurskie', lat: 53.7810, lon: 20.4930 },
  { nazwa: 'Elbląg', wojewodztwo: 'warmińsko-mazurskie', lat: 54.1640, lon: 19.4040 },
  { nazwa: 'Poznań', wojewodztwo: 'wielkopolskie', lat: 52.4020, lon: 16.9120 },
  { nazwa: 'Kalisz', wojewodztwo: 'wielkopolskie', lat: 51.7570, lon: 18.0870 },
  { nazwa: 'Szczecin', wojewodztwo: 'zachodniopomorskie', lat: 53.4170, lon: 14.5510 },
  { nazwa: 'Kołobrzeg', wojewodztwo: 'zachodniopomorskie', lat: 54.1840, lon: 15.5760 },
];

/** Nazwa Lublina jako celu pociągu z dalekiego miasta. */
export const POWROT = { nazwa: 'Lublin' };
