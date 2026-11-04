import assert from "node:assert/strict";
import { build } from "vite";
await build({
  configFile: false,
  logLevel: "warn",
  build: {
    outDir: ".cache/artillery-tests",
    lib: {
      entry: "src/artillery/network.ts",
      formats: ["es"],
      fileName: () => "network.mjs",
    },
  },
});
const { generate, connect, route, RULES, safety } = await import(
  "../../.cache/artillery-tests/network.mjs"
);
const stop = (id, x, y, airport = false) => ({
  id,
  x,
  y,
  name: id,
  anchor: id,
  airport,
});
for (const count of [1, 2, 8, 20, 48]) {
  const stops = Array.from({ length: count }, (_, i) =>
    stop(
      "s" + String(i).padStart(3, "0"),
      (i % 8) * 1500,
      Math.floor(i / 8) * 1400,
    ),
  );
  const edges = connect(stops),
    n = { stops, edges },
    degrees = new Map(stops.map((s) => [s.id, 0]));
  for (const [a, b] of edges) {
    assert.notEqual(a, b);
    degrees.set(a, degrees.get(a) + 1);
    degrees.set(b, degrees.get(b) + 1);
    assert(route(n, b, a));
  }
  for (const s of stops) {
    assert(degrees.get(s.id) <= 4);
    assert(route(n, stops[0].id, s.id));
  }
  assert.deepEqual(
    connect([...stops].reverse()),
    edges,
    "topology deterministic despite input order",
  );
  console.log(
    "topology",
    count,
    "stops",
    edges.length,
    "links",
    "diameter",
    Math.max(
      ...stops.flatMap((a) =>
        stops.map((b) => route(n, a.id, b.id).length - 1),
      ),
    ),
  );
}
const cities = [
  stop("west", 0, 0),
  stop("centre", 9000, 0),
  stop("east", 16000, 0),
];
const airports = [
  stop("radawiec", -8000, 2000, true),
  stop("swidnik", 21000, 0, true),
  stop("distant", 170000, 0, true),
];
const edges = connect([...cities, ...airports]);
assert(edges.some((e) => e.includes("radawiec")));
assert(edges.some((e) => e.includes("swidnik")));
assert(!edges.some((e) => e.includes("distant")));
assert(
  !edges.some(
    ([a, b]) =>
      airports.some((s) => s.id === a) && airports.some((s) => s.id === b),
  ),
);
for (const a of airports)
  assert(edges.filter((e) => e.includes(a.id)).length <= 2);
const input = {
  id: "linear-city",
  city: { name: "City", population: 300000, center: { x: 3000, y: 0 } },
  roads: [
    {
      id: "main",
      name: "Main",
      points: Array.from({ length: 21 }, (_, i) => ({ x: i * 300, y: 0 })),
      width: 6,
      level: "0",
    },
  ],
  buildings: Array.from({ length: 21 }, (_, i) => ({ x: i * 300, y: 70 })),
  obstacles: [],
  airports: [],
};
const first = generate(input),
  again = generate({ ...input, roads: [...input.roads].reverse() });
assert(first.stops.length >= 3);
assert(first.stops.length <= 8);
assert.equal(first.diagnostics.uncovered.length, 0);
assert.deepEqual(again, first);
const id = first.stops[0].id,
  overrides = { [id]: { x: first.stops[0].x + 12, name: "Corrected" } };
const saved = generate(
  {
    ...input,
    roads: [
      ...input.roads,
      {
        id: "new",
        name: "New",
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 1000 },
        ],
        width: 6,
        level: "0",
      },
    ],
  },
  first,
  overrides,
);
assert.equal(saved.stops.find((s) => s.id === id).x, first.stops[0].x + 12);
assert.equal(saved.stops.find((s) => s.id === id).name, "Corrected");
for (const s of first.stops)
  assert(
    saved.stops.some((t) => t.id === s.id),
    "map refresh retains IDs",
  );
const disabled = generate(input, first, { [id]: { disabled: true } });
assert(disabled.stops.find((s) => s.id === id).disabled);
assert(!disabled.edges.some((e) => e.includes(id)));
const forbidden = {
  kind: "water",
  rings: [
    [
      { x: -100, y: -100 },
      { x: 100, y: -100 },
      { x: 100, y: 100 },
      { x: -100, y: 100 },
    ],
  ],
};
assert.equal(
  safety({ ...input, obstacles: [forbidden] })({ x: 0, y: 0 }, 7),
  "water",
);
const blocked = generate({
  ...input,
  obstacles: [
    {
      kind: "building",
      rings: [
        [
          { x: -1000, y: -1000 },
          { x: 7000, y: -1000 },
          { x: 7000, y: 1000 },
          { x: -1000, y: 1000 },
        ],
      ],
    },
  ],
});
assert.equal(blocked.stops.length, 0);
assert(blocked.diagnostics.rejected.length > 0);
assert(blocked.diagnostics.uncovered.length > 0);
const incomplete = generate({
  ...input,
  airports: [
    {
      id: "unknown-airport",
      name: "Incomplete",
      entrances: [{ x: 200, y: 0 }],
      complete: false,
    },
  ],
});
assert(!incomplete.stops.some((s) => s.airport));
assert(incomplete.diagnostics.missing.some((s) => s.includes("Incomplete")));
assert.equal(
  generate({ ...input, city: { ...input.city, population: 40000 } }).stops
    .length,
  0,
  "small towns have no artillery network",
);
assert.throws(() => generate(input, undefined, {}, { ...RULES, maxDegree: 9 }));
console.log(
  "PASS: deterministic generator, no fixed city stop cap, coverage, safety, overrides, IDs, bounded local airport links, routes",
);
// Close banks must not acquire a walking shortcut through water; real bridge endpoints connect grades.
const banks = {
  id: "river",
  city: {
    name: "Large river city",
    population: 200000,
    center: { x: 0, y: 0 },
  },
  roads: [
    {
      id: "left",
      name: "Left",
      level: "0",
      width: 6,
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    },
    {
      id: "right",
      name: "Right",
      level: "0",
      width: 6,
      points: [
        { x: 200, y: 0 },
        { x: 300, y: 0 },
      ],
    },
  ],
  buildings: [
    { x: 50, y: 50 },
    { x: 250, y: 50 },
  ],
  obstacles: [
    {
      kind: "water",
      rings: [
        [
          { x: 110, y: -100 },
          { x: 190, y: -100 },
          { x: 190, y: 100 },
          { x: 110, y: 100 },
        ],
      ],
    },
  ],
  airports: [],
};
const single = { ...RULES, cityStops: 1, centralStops: 1, maxStops: 1 };
const separated = generate(banks, undefined, {}, single),
  bridged = generate(
    {
      ...banks,
      roads: [
        ...banks.roads,
        {
          id: "bridge",
          name: "Bridge",
          level: "0b",
          width: 6,
          points: [
            { x: 100, y: 0 },
            { x: 200, y: 0 },
          ],
        },
      ],
    },
    undefined,
    {},
    single,
  );
assert(
  bridged.diagnostics.covered > separated.diagnostics.covered,
  "bridge joins real shared endpoints without treating a river as walkable ground",
);
console.log("PASS: water barrier and bridge grade transition");
