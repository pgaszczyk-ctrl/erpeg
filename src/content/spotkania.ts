// TEST prototype; starting values, not the final balance. Distances in real metres.
export const SPOTKANIA = {
  ruchy: [[1, 3], [5, 4], [12, 5]] as [number, number][],
  koszt: { atak: 1, ruch: 1, mocny: 2, leczenie: 1 },
  krokM: 12,
  krokWrogaM: 9,
  siatkaPx: 3,
  mglaM: 30,
  interakcjaM: 24,
  grupaM: 8,
  aktywnych: 3,
  czlonkowie: [[2, 3], [3, 4], [6, 8]] as [number, number][],
  wedrowne: 0.45,
  wedrowkaMNaS: 1.5,
  orbitaS: 18,
  animacjaMs: 280,
  obrazeniaWroga: 0.65,
  // Bosses prepare a directional strike for a full hero turn before resolving it.
  mocnyWroga: 1.5,
  stozekStopnie: 80,
  szczescie: { krytyk: 0.08, mnoznik: 1.6, unik: 0.08, dodatkowy: 0.06 },
};

export function ruchyPoziomu(level: number) {
  let n = SPOTKANIA.ruchy[0][1];
  for (const [od, pula] of SPOTKANIA.ruchy) if (level >= od) n = pula;
  return n;
}

export function kosztRuchow(n: number, en = false) {
  if (en) return `${n} ${n === 1 ? 'move' : 'moves'}`;
  const a = n % 10, b = n % 100;
  return `${n} ${n === 1 ? 'ruch' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'ruchy' : 'ruchów'}`;
}
