// Stamina (sword/bow) and mana (magic) – the owner's test package of 26 Oct 2026 (walka/live.ts), numbers from
// the brief „walka i łowiska” 3A, marked as TEST VALUES to tune. Time units: seconds of active play.

export const ZASOBY = {
  /** Stamina: base maximum, + per character level above 1 („samo zwiększa ilość” – more on higher levels). */
  stamina: { max: 100, naPoziom: 4, regen: 10, regenNaPoziom: 0.25, opoznienieS: 2.2 },
  /** Mana: slower to come back than stamina. */
  mana: { max: 60, naPoziom: 8, regen: 4, regenNaPoziom: 0.35, opoznienieS: 3 },
  /** In safety (outside mist/dungeons and away from enemies) both recover this many times faster. */
  bezpiecznieRazy: 1.6,
  /** In danger (mist, dungeon or active combat): recover while repositioning, after a pause in attacks. */
  wMgleRazy: 0.65,

  /** Costs (paid once when the action starts). */
  koszt: {
    /** An ordinary sword swing that lands near an enemy (a swing at nothing is free). */
    cios: 10,
    /** The strong attack / skill with a sword or bow. */
    mocny: 30,
    /** An ordinary bow shot. */
    strzal: 10,
    /** An ordinary spell (with 0 mana it still goes, but weak: brief – zero never takes away defence). */
    czar: 6,
    /** The strong spell / magic skill. */
    mocnyCzar: 20,
  },
  /** Exhaustion weakens/slows ordinary blows; walking stays free and full speed for dodging. */
  wyczerpanyPonizej: 0.2,
  wyczerpanyCios: 1.8,
  wyczerpanySila: 0.6,
  /** Bow: at empty stamina the shot hits this much worse (points) and this much weaker (share of damage). */
  lukCelnoscMinus: 25,
  lukSilaMin: 0.6,
  /** Spell at 0 mana: share of the damage. */
  czarBezMany: 0.4,

  /** Life coming back in a safe zone: half-hearts per second, after this long without a blow. */
  zycieNaS: 0.5,
  zyciePoS: 4,
  /** Strong attack / skill cooldown (s), on top of its cost. */
  mocnyCooldownS: 2.5,
};

/** Maximum stamina / mana at a character level. */
export const maxStaminy = (poziom: number) => ZASOBY.stamina.max + ZASOBY.stamina.naPoziom * Math.max(0, poziom - 1);
export const maxMany = (poziom: number) => ZASOBY.mana.max + ZASOBY.mana.naPoziom * Math.max(0, poziom - 1);

/** The hero's stamina and mana now (saved as `zasoby` {s, m}; a save without them starts full, once). */
export const zasoby = {
  s: 100,
  m: 60,
  /** Active-play second of the last spend (regeneration waits ZASOBY.*.opoznienieS after it). */
  sAt: -99,
  mAt: -99,
  czas: 0,
  /** Active-play second of the last blow the hero took (life waits ZASOBY.zyciePoS after it). */
  ranyAt: -99,
  mocnyAt: -99,
};

/** Takes `n` stamina if there is that much; false = not enough (nothing taken). */
export function wydajStamine(n: number, poziom: number, wymagaj = true) {
  if (wymagaj && zasoby.s < n) return false;
  zasoby.s = Math.max(0, Math.min(maxStaminy(poziom), zasoby.s - n));
  zasoby.sAt = zasoby.czas;
  return true;
}

export function wydajMane(n: number, poziom: number, wymagaj = true) {
  if (wymagaj && zasoby.m < n) return false;
  zasoby.m = Math.max(0, Math.min(maxMany(poziom), zasoby.m - n));
  zasoby.mAt = zasoby.czas;
  return true;
}

/** One step of active play (dt s): both come back, faster in a safe zone. */
export function regenerujZasoby(dt: number, poziom: number, bezpiecznie: boolean) {
  zasoby.czas += dt;
  const k = bezpiecznie ? ZASOBY.bezpiecznieRazy : ZASOBY.wMgleRazy;
  if (zasoby.czas - zasoby.sAt >= ZASOBY.stamina.opoznienieS)
    zasoby.s = Math.min(maxStaminy(poziom), zasoby.s + (ZASOBY.stamina.regen + ZASOBY.stamina.regenNaPoziom * poziom) * k * dt);
  if (zasoby.czas - zasoby.mAt >= ZASOBY.mana.opoznienieS)
    zasoby.m = Math.min(maxMany(poziom), zasoby.m + (ZASOBY.mana.regen + ZASOBY.mana.regenNaPoziom * poziom) * (bezpiecznie ? ZASOBY.bezpiecznieRazy : 1) * dt);
}

/** Share of stamina 0..1. */
export const udzialStaminy = (poziom: number) => zasoby.s / maxStaminy(poziom);
export const wyczerpany = (poziom: number) => udzialStaminy(poziom) < ZASOBY.wyczerpanyPonizej;

/** From the save (or full when there is nothing yet). */
export function wczytajZasoby(z: { s?: number; m?: number } | undefined, poziom: number) {
  zasoby.s = Number.isFinite(z?.s) ? Math.min(maxStaminy(poziom), Math.max(0, z!.s!)) : maxStaminy(poziom);
  zasoby.m = Number.isFinite(z?.m) ? Math.min(maxMany(poziom), Math.max(0, z!.m!)) : maxMany(poziom);
  zasoby.sAt = zasoby.mAt = zasoby.ranyAt = zasoby.mocnyAt = -99;
  zasoby.czas = 0;
}

export const zapiszZasoby = () => ({ s: Math.round(zasoby.s), m: Math.round(zasoby.m) });

// For browser tests (scripts/tests/browser-live.mjs).
(globalThis as Record<string, unknown>).__zasoby = zasoby;
