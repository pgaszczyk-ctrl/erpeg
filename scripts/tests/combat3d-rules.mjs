import assert from "node:assert/strict";
import {
  inArc,
  circleBlocked,
  segmentHitsCircle,
  deathExperience,
} from "../../src/combat3d/rules.ts";
const p = { x: 0, z: 0 };
assert(inArc(p, { x: 0, z: 2 }, 0, 3, 0.8));
assert(
  !inArc(p, { x: 0, z: -2 }, 0, 3, 0.8),
  "targets behind the blade are not hit",
);
assert(!inArc(p, { x: 0, z: 5 }, 0, 3, 0.8), "range is finite");
assert(
  inArc(p, { x: -0.05, z: -2 }, Math.PI - 0.03, 3, 0.8),
  "arc wraps around pi",
);
const rings = [
  [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ],
  [
    [3, 3],
    [7, 3],
    [7, 7],
    [3, 7],
    [3, 3],
  ],
];
assert(circleBlocked({ x: 1, z: 1 }, 0.4, rings));
assert(!circleBlocked({ x: 5, z: 5 }, 0.4, rings), "courtyards remain open");
assert(
  circleBlocked({ x: -0.2, z: 5 }, 0.4, rings),
  "body radius blocks the wall before its centre enters",
);
assert(
  segmentHitsCircle({ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 5, z: 0 }, 0.5),
  "fast projectiles cannot tunnel through a target",
);
assert(
  !segmentHitsCircle({ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 5, z: 2 }, 0.5),
);
assert.equal(deathExperience(90), 87);
assert.equal(deathExperience(120), 120, "death cannot remove an earned level");
console.log(
  "PASS: melee arcs, range, courtyards, wall clearance, swept projectiles and death XP",
);
