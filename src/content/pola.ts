// Pola uprawne (overhaul 09, zadanie G11, src/gen/pola.ts): całe obsiane pasami, wygląd z miesiąca,
// część warzyw dojrzała do zebrania (cios → pasek WARZYWA.zbiorSekund → do plecaka).
export const POLA = {
  /** Udział roślin dojrzałych do zebrania w miesiącach zbioru (pokrętło admina pola_dojrzale). */
  dojrzale: 0.035,
};

/** Miesiąc upraw (0–11): z daty gracza; `?miesiac=1..12` wymusza (testy, podgląd pór roku). */
export const miesiacUpraw = () => {
  try {
    const q = Number(new URLSearchParams(location.search).get('miesiac'));
    if (q >= 1 && q <= 12) return q - 1;
  } catch {
    // brak location (Node)
  }
  return new Date().getMonth();
};
