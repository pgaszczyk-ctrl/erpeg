import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
const rows = [];
for (const id of ["lublin", "warszawa", "istanbul"]) {
  const n = JSON.parse(readFileSync(`public/artillery/${id}.json`)),
    d = JSON.parse(
      gunzipSync(readFileSync(`public/artillery/${id}-diagnostics.json.gz`)),
    ),
    degree = (s) => n.edges.filter((e) => e.includes(s.id)).length;
  const km = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) / 1000;
  rows.push({
    id,
    name: n.city.name,
    population: n.city.population,
    scope: n.source.bounds,
    sourceSha256: n.source.sha256,
    stops: n.stops.length,
    airports: n.stops
      .filter((s) => s.airport)
      .map((s) => ({
        name: s.name,
        directions: degree(s),
        links: n.edges
          .filter((e) => e.includes(s.id))
          .map((e) => {
            const b = n.stops.find((x) => x.id === e.find((id) => id !== s.id));
            return {
              to: b.name,
              km: Math.round(km(s, b) * 100) / 100,
              airport: !!b.airport,
            };
          }),
      })),
    edges: n.edges.length,
    maxDirections: Math.max(...n.stops.map(degree)),
    maxLegs: d.diameter,
    maxTransfers: Math.max(0, d.diameter - 1),
    meanLegs: d.meanHops,
    coveredCells: d.covered,
    totalCells: d.demands,
    coveragePercent: Math.round((d.covered / d.demands) * 1000) / 10,
    uncoveredCells: d.uncovered.length,
    waterRejected: d.rejected.filter((p) => p.reason === "water").length,
    missing: d.missing,
    normalAnimationPerLegS: 5.35,
    normalAnimationLongestRouteS: Math.round(d.diameter * 5.35 * 10) / 10,
  });
}
writeFileSync(
  "docs/artillery/validation.json",
  JSON.stringify(
    {
      scope:
        "Generator validation on real OSM extracts; full in-game collision/reachability checks are Lublin only. No cross-city edges.",
      cities: rows,
    },
    null,
    2,
  ),
);
const checks = JSON.parse(
  readFileSync("work/artillery/game-map-validation.json"),
);
writeFileSync(
  "docs/artillery/lublin-game-map-validation.json",
  JSON.stringify(checks, null, 2),
);
console.log(
  rows.map((r) => ({
    city: r.name,
    stops: r.stops,
    edges: r.edges,
    maxLegs: r.maxLegs,
    coverage: r.coveragePercent,
    waterRejected: r.waterRejected,
    missing: r.missing,
  })),
);
