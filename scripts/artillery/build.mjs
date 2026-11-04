// Persistent registry compiler: existing OSM extract → metre-based planner. Never downloads at login.
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  createReadStream,
} from "node:fs";
import { createGunzip, gzipSync } from "node:zlib";
import { createInterface } from "node:readline";
import { createHash } from "node:crypto";
import { build } from "vite";
await build({
  configFile: false,
  logLevel: "warn",
  build: {
    outDir: ".cache/artillery",
    emptyOutDir: true,
    lib: {
      entry: "src/artillery/network.ts",
      formats: ["es"],
      fileName: () => "network.mjs",
    },
  },
});
const { generate, RULES, inside } = await import(
  "../../.cache/artillery/network.mjs?" + Date.now()
);
const argv = process.argv.slice(2),
  arg = (k, f) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : f);
const id = arg("--id", "lublin"),
  src = arg("--src", "data/lublin-osm.geojsonseq.gz");
const bounds = arg("--bbox", "22.32,51.15,22.78,51.33").split(",").map(Number);
const origin = { lon: bounds[0], lat: bounds[3] },
  cos = Math.cos((origin.lat * Math.PI) / 180);
const project = ([lon, lat]) => ({
  x: (lon - origin.lon) * 111320 * cos,
  y: (origin.lat - lat) * 111132,
});
const input = { id, roads: [], buildings: [], obstacles: [], airports: [] };
let cityIdentity = null;
const cityBoundaries = [];
const features = createInterface({
  input: createReadStream(src).pipe(createGunzip()),
  crlfDelay: Infinity,
});
const hash = (s) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(36);
};
const foot = new Set([
  "primary",
  "secondary",
  "tertiary",
  "residential",
  "living_street",
  "unclassified",
  "service",
  "footway",
  "pedestrian",
  "path",
  "steps",
  "track",
]);
let runways = 0;
const buffer = (pts, width, kind) => {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1],
      b = pts[i],
      len = Math.hypot(b.x - a.x, b.y - a.y) || 1,
      nx = ((b.y - a.y) / len) * width,
      ny = (-(b.x - a.x) / len) * width;
    input.obstacles.push({
      kind,
      rings: [
        [
          { x: a.x + nx, y: a.y + ny },
          { x: b.x + nx, y: b.y + ny },
          { x: b.x - nx, y: b.y - ny },
          { x: a.x - nx, y: a.y - ny },
        ],
      ],
    });
  }
};
const airports = [],
  terminals = [],
  runwayShapes = [],
  seen = new Set();
for await (const rawLine of features) {
  const line = rawLine.replace(/^\x1e/, "").trim();
  if (!line) continue;
  const f = JSON.parse(line);
  const g = f.geometry,
    p = f.properties ?? {};
  if (!g) continue;
  const uniq =
    f.id ?? createHash("sha256").update(JSON.stringify(f)).digest("hex");
  if (seen.has(uniq)) continue;
  seen.add(uniq);
  const coords =
    g.type === "Point"
      ? [g.coordinates]
      : g.type === "LineString"
        ? g.coordinates
        : g.type === "Polygon"
          ? g.coordinates[0]
          : g.type === "MultiPolygon"
            ? g.coordinates[0]?.[0]
            : [];
  if (
    !coords?.length ||
    !coords.some(
      ([x, y]) =>
        x >= bounds[0] && x <= bounds[2] && y >= bounds[1] && y <= bounds[3],
    )
  )
    continue;
  const pts = coords.map(project),
    closed =
      coords.length > 3 &&
      coords[0][0] === coords.at(-1)[0] &&
      coords[0][1] === coords.at(-1)[1];
  const rings =
    g.type === "Polygon"
      ? g.coordinates.map((r) => r.map(project))
      : g.type === "MultiPolygon"
        ? g.coordinates.flatMap((rs) => rs.map((r) => r.map(project)))
        : closed
          ? [pts]
          : [];
  const key = String(
    f.id ??
      createHash("sha256")
        .update(
          JSON.stringify([p.name ?? "", p.highway ?? p.aeroway ?? "", coords]),
        )
        .digest("hex")
        .slice(0, 24),
  );
  if (
    p.place === "city" &&
    Number(String(p.population ?? "").replace(/[^0-9]/g, "")) >=
      (cityIdentity?.population ?? 0)
  )
    cityIdentity = {
      name: p.name ?? id,
      population:
        Number(String(p.population ?? "").replace(/[^0-9]/g, "")) || 0,
      center: pts[0],
      identity: p.wikidata ?? p.name,
    };
  if (p.boundary === "administrative" && rings.length)
    cityBoundaries.push({
      identity: p.wikidata ?? p.name,
      rings,
      level: Number(p.admin_level) || 99,
    });
  if (p.building && rings.length) {
    input.obstacles.push({ kind: "building", rings });
    input.buildings.push(
      pts.reduce(
        (a, b) => ({ x: a.x + b.x / pts.length, y: a.y + b.y / pts.length }),
        { x: 0, y: 0 },
      ),
    );
  }
  if (
    (p.natural === "water" ||
      p.landuse === "reservoir" ||
      p.landuse === "basin") &&
    rings.length
  )
    input.obstacles.push({ kind: "water", rings });
  if (p.waterway && g.type === "LineString")
    buffer(pts, Number(p.width) || (p.waterway === "river" ? 10 : 2), "water");
  if (
    p.railway &&
    ["rail", "tram", "light_rail"].includes(p.railway) &&
    p.bridge !== "yes" &&
    p.tunnel !== "yes"
  )
    buffer(pts, 3, "rail");
  if (["motorway", "trunk", "motorway_link", "trunk_link"].includes(p.highway))
    buffer(pts, 10, "expressway");
  if (p.barrier && g.type === "LineString") buffer(pts, 1, "barrier");
  if (["runway", "taxiway", "apron"].includes(p.aeroway)) {
    if (p.aeroway === "runway") runwayShapes.push(pts);
    runways++;
    if (rings.length) input.obstacles.push({ kind: "airside", rings });
    else buffer(pts, Number(p.width) || 30, "airside");
  }
  if (p.aeroway === "aerodrome")
    airports.push({
      id: key,
      name: p.name ?? p["name:en"] ?? "Aerodrome",
      pts,
      rings,
      priority: p.iata ? 2 : 0,
    });
  if (p.aeroway === "terminal" || (p.entrance && p.aeroway))
    terminals.push(pts[0]);
  if (
    foot.has(p.highway) &&
    g.type === "LineString" &&
    !["no", "private"].includes(p.foot) &&
    !["private", "no"].includes(p.access) &&
    p.tunnel !== "yes"
  ) {
    const width =
      Number(p.width) ||
      ({ primary: 12, secondary: 10, tertiary: 8, residential: 6, service: 5 }[
        p.highway
      ] ??
        3);
    input.roads.push({
      id: key,
      name: p.name ?? "",
      points: pts,
      width,
      level: `${p.layer ?? "0"}${p.bridge === "yes" ? "b" : ""}`,
    });
    if (
      !["footway", "pedestrian", "path", "steps", "track"].includes(p.highway)
    )
      buffer(pts, width / 2, "carriageway");
  }
}
const aerodromes = airports
  .filter((a) => a.rings.length)
  .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
const accepted = [];
for (const a of aerodromes) {
  const center = a.pts.reduce(
    (p, q) => ({ x: p.x + q.x / a.pts.length, y: p.y + q.y / a.pts.length }),
    { x: 0, y: 0 },
  );
  if (
    accepted.some(
      (b) => Math.hypot(center.x - b.center.x, center.y - b.center.y) < 2500,
    )
  )
    continue;
  const near = terminals.filter(
    (t) =>
      inside(t, a.rings) ||
      a.pts.some((p) => Math.hypot(t.x - p.x, t.y - p.y) < 1000),
  );
  const mappedRunway = runwayShapes.some((ps) =>
    ps.some(
      (p) =>
        inside(p, a.rings) ||
        a.pts.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < 300),
    ),
  );
  const airport = {
    id: a.id,
    name: a.name,
    entrances: near.length ? near : a.pts,
    boundary: a.rings,
    outsideOnly: !near.length,
    complete: mappedRunway,
  };
  input.airports.push(airport);
  accepted.push({ ...a, center });
}
const gameMapFile = arg("--game-map", null);
if (gameMapFile) {
  const raw = JSON.parse(readFileSync(gameMapFile)),
    o = raw.origin ?? {
      lon: raw.bounds.minLon,
      lat: raw.bounds.maxLat,
      lat0: (raw.bounds.minLat + raw.bounds.maxLat) / 2,
    },
    mlat = 111132.954 - 559.822 * Math.cos((2 * o.lat0 * Math.PI) / 180),
    mlon = 111412.84 * Math.cos((o.lat0 * Math.PI) / 180);
  const ring = (r) => {
    let x = 0,
      y = 0;
    const out = [];
    for (let i = 0; i < r.length; i += 2) {
      x = i ? x + r[i] : r[i];
      y = i ? y + r[i + 1] : r[i + 1];
      out.push(
        project([
          o.lon + x / raw.unitsPerM / mlon,
          o.lat - y / raw.unitsPerM / mlat,
        ]),
      );
    }
    return out;
  };
  for (const b of raw.buildings)
    input.obstacles.push({ kind: "game-building", rings: b[0].map(ring) });
  for (const a of raw.areas)
    if (a[0] === "water")
      input.obstacles.push({ kind: "water", rings: a.slice(1).map(ring) });
  for (const line of raw.lines) {
    const width = { major: 14, medium: 11, minor: 7, service: 4, track: 3 }[
      line[0]
    ];
    if (width) buffer(ring(line[2]), width / 2, "carriageway");
  }
}
if (cityIdentity) {
  const boundary = cityBoundaries
    .filter((b) => b.identity === cityIdentity.identity)
    .sort((a, b) => b.level - a.level)[0];
  input.city = { ...cityIdentity, boundary: boundary?.rings };
}
const file = `public/artillery/${id}.json`,
  old = argv.includes("--new-proposal")
    ? undefined
    : existsSync(file)
      ? JSON.parse(readFileSync(file))
      : argv.includes("--resume")
        ? { stops: JSON.parse(readFileSync(`work/artillery/${id}-stops.json`)) }
        : undefined;
if (old?.origin && JSON.stringify(old.origin) !== JSON.stringify(origin))
  throw Error("Origin changed: migrate registry coordinates explicitly");
const overrides = existsSync(`data/artillery-${id}-overrides.json`)
  ? JSON.parse(readFileSync(`data/artillery-${id}-overrides.json`))
  : {};
const rules = {
  ...RULES,
  ...(existsSync("data/artillery-rules.json")
    ? JSON.parse(readFileSync("data/artillery-rules.json"))
    : {}),
  ...(existsSync(`data/artillery-${id}-rules.json`)
    ? JSON.parse(readFileSync(`data/artillery-${id}-rules.json`))
    : {}),
};
console.log("Input", id, {
  roads: input.roads.length,
  buildings: input.buildings.length,
  obstacles: input.obstacles.length,
  airports: input.airports.map((a) => ({ name: a.name, complete: a.complete })),
  runways,
});
mkdirSync("work/artillery", { recursive: true });
if (argv.includes("--save-input"))
  writeFileSync(`work/artillery/${id}-input.json`, JSON.stringify(input));
const start = Date.now(),
  n = generate(input, old, overrides, rules, (message, stops, diagnostics) => {
    console.log(message);
    if (diagnostics)
      writeFileSync(
        `work/artillery/${id}-coverage.json`,
        JSON.stringify(diagnostics),
      );
    if (stops)
      writeFileSync(`work/artillery/${id}-stops.json`, JSON.stringify(stops));
  });
for (const stop of n.stops)
  if (/^MAP \d+$/.test(stop.name)) {
    const named = input.roads
      .filter((r) => r.name)
      .map((r) => ({
        name: r.name,
        d: Math.min(
          ...r.points.map((p) => Math.hypot(stop.x - p.x, stop.y - p.y)),
        ),
      }))
      .sort((a, b) => a.d - b.d)[0];
    if (named && named.d < 400) stop.name = named.name;
  }
const output = {
  ...n,
  city: input.city,
  origin,
  projection: { mLon: 111320 * cos, mLat: 111132 },
  rules,
  source: {
    file: src,
    sha256: createHash("sha256").update(readFileSync(src)).digest("hex"),
    bounds,
    runways,
    accessComplete: argv.includes("--complete"),
    gameMapSha256: gameMapFile
      ? createHash("sha256").update(readFileSync(gameMapFile)).digest("hex")
      : null,
  },
  coordinates: "metres",
};
mkdirSync("public/artillery", { recursive: true });
const indexFile = "public/artillery/index.json",
  index = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile)) : [];
writeFileSync(
  indexFile,
  JSON.stringify(
    [...index.filter((e) => e.id !== id), { id, bounds }].sort((a, b) =>
      a.id.localeCompare(b.id),
    ),
  ),
);
writeFileSync(
  `public/artillery/${id}-diagnostics.json.gz`,
  gzipSync(JSON.stringify(n.diagnostics)),
);
writeFileSync(
  file,
  JSON.stringify({
    ...output,
    diagnostics: { ...n.diagnostics, rejected: [], uncovered: [] },
  }),
);
writeFileSync(
  `public/artillery/${id}-geometry.json.gz`,
  gzipSync(
    JSON.stringify({
      roads: input.roads.map((r) => ({
        points: r.points.map((p) => ({
          x: Math.round(p.x),
          y: Math.round(p.y),
        })),
        name: r.name,
      })),
      buildings: [
        ...new Map(
          input.buildings.map((p) => [
            `${Math.floor(p.x / 100)},${Math.floor(p.y / 100)}`,
            p,
          ]),
        ).values(),
      ],
      water: input.obstacles.filter((o) => o.kind === "water"),
    }),
  ),
);
mkdirSync("work/artillery", { recursive: true });
if (argv.includes("--save-input"))
  writeFileSync(`work/artillery/${id}-input.json`, JSON.stringify(input));
writeFileSync(
  `work/artillery/${id}-summary.json`,
  JSON.stringify(
    {
      ...n,
      diagnostics: {
        ...n.diagnostics,
        rejected: n.diagnostics.rejected.length,
        uncovered: n.diagnostics.uncovered.length,
      },
    },
    null,
    2,
  ),
);
console.log("Network", {
  stops: n.stops.length,
  edges: n.edges.length,
  coverage: n.diagnostics.covered + "/" + n.diagnostics.demands,
  diameter: n.diagnostics.diameter,
  meanHops: n.diagnostics.meanHops,
  missing: n.diagnostics.missing,
  ms: Date.now() - start,
});
