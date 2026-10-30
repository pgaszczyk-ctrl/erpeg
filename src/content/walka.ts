// ============================================================================
//  WALKA – obrażenia, szybkość, celność, szybki i mocny atak
//
//  Obrażenia ciosu / strzału = poziom umiejętności + `zaMoc` × moc broni.
//  Kijek (moc 1) na 10. poziomie ≈ najlepszy miecz na 1. poziomie: broń sama
//  za bohatera nie walczy, trzeba ćwiczyć. Życie potworów: objects/Slime.ts.
//
//  Tabele: [poziom umiejętności, wartość]; między wierszami liczy się po równo
//  (np. poziom 4 leży w połowie między 3 a 5).
//    przerwa    – ile ms między atakami,
//    trafienie  – szansa trafienia w % (do tego trudność: `celnosc` w trudnosc.ts,
//                 +15 na Dziecięcym i Młodym; najwyżej 100%),
//    mocny…     – to samo dla mocnego ataku.
//
//  Stuknięcie (klik, spacja) = szybki atak. Przytrzymanie przez `mocnyPoMs`
//  i puszczenie = mocny atak (wokół bohatera rośnie złote kółko):
//    miecz: `mocnyMnoznik` razy mocniej, `zasiegMiecz` razy dalej, zawsze
//           trafia i ogłusza na `ogluszenieMs`;
//    łuk:   `mocnyMnoznik` razy mocniej, własna tabela trafienia.
//  Łuk ma też szansę `natychmiast` (%) zabić zwykłego potwora jednym strzałem
//  (nie działa na hersztów i smoki). Pudło: nad wrogiem napis „pudło!”.
//
//  Animacja ciosu: obrazek broni z ręki przelatuje łukiem `lukStopnie`
//  na zmianę z lewej do prawej i z prawej do lewej, w `ciosMs`.
// ============================================================================

export type Tabela = [poziom: number, wartosc: number][];

export const WALKA = {
  zaMoc: 1.5,
  mocnyPoMs: 1000,
  zasiegMiecz: 1.3,
  /** 30.10.2026: Celność / Skupienie 1–3 = 2× miecz, potem +20% poprzedniego zasięgu. */
  dystans: { start: 2, odPoziomu: 4, naPoziom: 1.2, mocny: 1.3, mocnyOd: 4, lotStartS: 0.55, lukLotuPx: 6, czarLotS: 0.3 },
  /** Zwykły cios wybiera jednego przeciwnika w tym kącie przed bohaterem. */
  ciosStopnie: 70,
  miecz: {
    przerwa: [[1, 320], [2, 310], [3, 300], [5, 280], [10, 230], [15, 180], [20, 130]] as Tabela,
    trafienie: [[1, 85], [2, 90], [3, 93], [5, 96], [10, 99], [15, 100], [20, 100]] as Tabela,
    mocnyMnoznik: [[1, 3], [20, 5]] as Tabela,
    ogluszenieMs: 800,
  },
  luk: {
    przerwa: [[1, 650], [2, 630], [3, 610], [5, 570], [10, 470], [15, 370], [20, 270]] as Tabela,
    /** Łuk nie strzela częściej niż co tyle ms, choćby tabela mówiła mniej. */
    najkrotszaPrzerwa: 400,
    trafienie: [[1, 52], [2, 57], [3, 61], [5, 74], [10, 81], [15, 86], [20, 90]] as Tabela,
    mocnyTrafienie: [[1, 80], [2, 83], [3, 86], [5, 92], [10, 97], [15, 99], [20, 100]] as Tabela,
    mocnyMnoznik: 1.8,
    natychmiast: [[1, 5], [20, 15]] as Tabela,
  },
  /** Na nich jeden strzał nigdy nie zabija. */
  bezNatychmiast: ['herszt', 'wielki_herszt', 'koziol', 'upior', 'smok', 'wojownik'] as string[],
  /** Magia na razie: mocny czar tyle razy mocniej (pełna magia przyjdzie później). */
  mnoznikCzaru: 2,
  lukStopnie: 120,
  /**
   * Celowanie strzałą i czarem (właściciel 5.10.2026: „patrzę mniej więcej w kierunku wroga, to musi lecieć do celu”):
   * strzał leci prosto w najbliższy cel (potwór, tarcza albo kryształ treningowy) w tym stożku wokół kierunku,
   * jeśli nic go nie zasłania. Pudło dalej się zdarza (i pokazuje „pudło!”), ale lot jest w stronę celu.
   */
  celowanieStopnie: 35,
  ciosMs: 150,
  /** Wielkość obrazka broni w punktach mapy (mocny cios trochę większy). */
  wielkoscBroni: 13,
};

/** Same distance for preview, aim assist and projectile collision; independent of character level. */
export function zasiegDystansu(poziom: number, zasiegMiecza: number, mocny = false) {
  const p = WALKA.dystans;
  return zasiegMiecza * p.start * p.naPoziom ** Math.max(0, poziom - p.odPoziomu + 1)
    * (mocny && poziom >= p.mocnyOd ? p.mocny : 1);
}

/** The table's value at that level (straight lines between its rows). */
export function zTabeli(t: Tabela, poziom: number) {
  if (poziom <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    const [l1, v1] = t[i];
    if (poziom <= l1) {
      const [l0, v0] = t[i - 1];
      return v0 + ((v1 - v0) * (poziom - l0)) / (l1 - l0);
    }
  }
  return t[t.length - 1][1];
}
