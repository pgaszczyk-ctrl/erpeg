// The walkable Kulociąg hall (artist's pack 48-G002 v2, docs/poczta/od-grafika/48_kulociag_v2/; owner, 2 Nov 2026:
// „zejście do metra to normalne zejście – na hali chodzisz, gadasz z NPC, coś kupisz, bilet przy podejściu do kuli”).
// Coordinates = the hall picture's pixels (1672×941); one scale for everything: 1 hall px = 1 px of a character frame
// (64 frame, 54 model, feet at 62), so the hero is as big as on the street when the whole hall fits a phone.

export const HALA_CHODZENIE = {
  /** Where the hero stands after coming down the stairs; walking back into this circle goes up to the street. */
  wejscie: [251, 324] as [number, number],
  wyjscieR: 22,
  /** The way out works only after the hero has first walked this far from it. */
  uzbrojenieR: 56,
  /** Launchers: where the hero buys the ticket (feet) and from how far. */
  wyrzutnie: [[907, 607, 96], [1147, 637, 96], [1370, 637, 96]] as [number, number, number][],
  /** Free floor on the left where the newsboy and the trader stand (random spot per station). */
  npc: [[190, 338], [850, 338], [850, 655], [275, 655], [190, 594]] as [number, number][],
  /** The floor mosaic's frame (x, y, w, h): nobody stands on it. */
  mozaika: [418, 390, 351, 96] as [number, number, number, number],
  npcOdstep: 76,
  odWejscia: 85,
  /** Walking speed in the hall: the street's speed × this (1 map px = 4 hall px). */
  tempo: 0.7,
  hallNaMape: 4,
  /** How near (hall px) the hero must be to talk to the newsboy / trade at the stall. */
  rozmowaR: 46,
  straganR: 70,
  /** Warm tint so the artist's stall and trader take the hall's lamplight („stoi jak wklejony”). */
  swiatlo: 0xe2bb8c,
  /** Foreground layers [id, file, x, y, baseline y]: drawn over the hero when he stands north of the baseline. */
  przod: [
    ["bench_north", "bench_north", 439, 216, 290],
    ["bench_west", "bench_west", 111, 385, 571],
    ["bench_south", "bench_south", 437, 677, 754],
    ["crates_southwest", "crates_southwest", 59, 674, 833],
    ["barrel_north", "barrel_north", 341, 173, 246],
    ["chest_stairs", "chest_stairs", 65, 270, 344],
    ["railing_left", "railing_left", 78, 95, 307],
    ["railing_right", "railing_right", 283, 194, 307],
    ["lamp_0", "lamp_0", 71, 568, 650],
    ["lamp_1", "lamp_1", 281, 730, 812],
    ["lamp_2", "lamp_2", 782, 194, 276],
    ["lamp_3", "lamp_3", 930, 525, 607],
    ["lamp_4", "lamp_4", 1134, 525, 607],
    ["lamp_5", "lamp_5", 1350, 525, 607],
    ["lamp_6", "lamp_6", 1583, 525, 607],
    ["launcher_0", "launcher_0", 934, 0, 817],
    ["launcher_1", "launcher_1", 1157, 0, 817],
    ["launcher_2", "launcher_2", 1380, 0, 817],
  ] as [string, string, number, number, number][],
};
