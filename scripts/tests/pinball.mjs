// Every metro city in src/content/metro.ts must be a city of public/artillery/swiat.json (else its network rides
// cannons by mistake); Lublin has no metro, Warsaw has.  node --experimental-strip-types scripts/tests/pinball.mjs
import fs from "node:fs";
import assert from "node:assert/strict";
const { MIASTA_Z_METREM, maMetro } = await import("../../src/content/metro.ts");
const swiat = JSON.parse(fs.readFileSync("public/artillery/swiat.json"));
const brak = MIASTA_Z_METREM.filter((w) => {
  const [cc, nazwa] = w.split(/:(.*)/s);
  return !swiat.miasta.some((m) => m[2] === cc && maMetro(m[2], m[1]) && maMetro(cc, nazwa));
});
assert.deepEqual(brak, [], "metro cities missing from swiat.json");
assert(maMetro("PL", "Warsaw") && !maMetro("PL", "Lublin"));
const ile = swiat.miasta.filter((m) => maMetro(m[2], m[1], m[0])).length;
assert.equal(ile, MIASTA_Z_METREM.length, "one network per metro city");
console.log(`PASS pinball: ${MIASTA_Z_METREM.length} metro cities, ${ile} networks ride the pinball`);
