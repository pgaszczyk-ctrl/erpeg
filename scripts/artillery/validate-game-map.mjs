import fs from "node:fs";
import { build } from "vite";
await build({
  configFile: false,
  logLevel: "warn",
  build: {
    outDir: ".cache/artillery-map-check",
    lib: {
      entry: { city: "src/map/CityMap.ts", world: "src/map/world.ts" },
      formats: ["es"],
      fileName: (_f, n) => `${n}.mjs`,
    },
  },
});
const { CityMap } = await import("../../.cache/artillery-map-check/city.mjs"),
  { worldMap } = await import("../../.cache/artillery-map-check/world.mjs");
globalThis.location = { search: "" };
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (url, options) =>
  typeof url === "string" && !/^https?:/.test(url)
    ? new Response(fs.readFileSync("public/" + url), {
        headers: { "Content-Type": "application/json" },
      })
    : nativeFetch(url, options);
const n = JSON.parse(fs.readFileSync("public/artillery/lublin.json")),
  lublin = new CityMap(
    JSON.parse(fs.readFileSync("public/map/lublin.json")),
    "lublin",
  ),
  world = worldMap(51.24, 22.55),
  results = [];
for (const s of n.stops) {
  const ll = {
      lat: n.origin.lat - s.y / n.projection.mLat,
      lon: n.origin.lon + s.x / n.projection.mLon,
    },
    city = lublin.hasLatLon(ll.lat, ll.lon) ? lublin : world,
    p = city.fromLatLon(ll.lat, ll.lon);
  try {
    await city.ensure(p.x, p.y, 400);
    const free = city.isFree(p.x, p.y, 14, 14),
      road = city.roadAt(p.x, p.y)?.kind,
      reachable = free && city.reachesFar(p.x, p.y, 100);
    const row = {
      id: s.id,
      name: s.name,
      map: city.id,
      free,
      road: road ?? null,
      reachable,
      ...ll,
    };
    results.push(row);
    console.log(row);
  } catch (e) {
    results.push({ id: s.id, name: s.name, error: e.message, ...ll });
    console.log(s.name, e.message);
  }
}
fs.writeFileSync(
  "work/artillery/game-map-validation.json",
  JSON.stringify(results, null, 2),
);
if (
  results.some(
    (r) =>
      r.error ||
      !r.free ||
      (r.road && !["path", "pedestrian"].includes(r.road)) ||
      !r.reachable,
  )
)
  process.exitCode = 1;
