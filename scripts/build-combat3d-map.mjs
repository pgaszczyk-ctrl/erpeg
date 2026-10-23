// Small, reproducible extract of the game's existing OSM data. No network access.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
const origin = { lat: 51.2482, lon: 22.5681 };
const scale = 0.18,
  radius = 560;
const project = ([lon, lat]) => [
  +(
    (lon - origin.lon) *
    111320 *
    Math.cos((origin.lat * Math.PI) / 180) *
    scale
  ).toFixed(3),
  +(-(lat - origin.lat) * 111320 * scale).toFixed(3),
];
const nearby = (p) =>
  Math.abs(p[0]) < radius * scale && Math.abs(p[1]) < radius * scale;
const buildings = [],
  roads = [],
  areas = [];
const features = gunzipSync(readFileSync("data/lublin-osm.geojsonseq.gz"))
  .toString()
  .split("\n")
  .map((l) => l.replace(/^\x1e/, "").trim())
  .filter(Boolean);
for (const line of features) {
  const { geometry: g, properties: p = {} } = JSON.parse(line);
  if (!g) continue;
  if (
    g.type === "LineString" &&
    p.highway &&
    !["proposed", "construction", "motorway", "motorway_link"].includes(
      p.highway,
    )
  ) {
    const pts = g.coordinates.map(project);
    if (!pts.some(nearby)) continue;
    const path = ["footway", "path", "steps", "cycleway"].includes(p.highway);
    roads.push({
      pts,
      width: path ? 0.8 : p.highway === "pedestrian" ? 1.7 : 2.1,
      name: p.name || "",
      path,
    });
  }
  const polys =
    g.type === "Polygon"
      ? [g.coordinates]
      : g.type === "MultiPolygon"
        ? g.coordinates
        : [];
  for (const poly of polys) {
    const rings = poly.map((r) => r.map(project));
    if (!rings[0].some(nearby)) continue;
    if (p.building && p.building !== "no") {
      const b = rings[0],
        area = Math.abs(
          b.reduce((n, v, i) => {
            const q = b[(i + 1) % b.length];
            return n + v[0] * q[1] - q[0] * v[1];
          }, 0) / 2,
        );
      if (area < 0.5 || area > 2500) continue;
      buildings.push({
        rings,
        height: Math.min(
          6.8,
          1.5 +
            Math.max(1, Math.min(4, Number(p["building:levels"]) || 2)) * 0.85,
        ),
        name: p.name || "",
        address: [p["addr:street"], p["addr:housenumber"]]
          .filter(Boolean)
          .join(" "),
      });
    } else if (
      p.leisure === "park" ||
      ["wood", "water", "scrub", "grassland"].includes(p.natural) ||
      ["forest", "grass", "meadow", "recreation_ground"].includes(p.landuse)
    ) {
      areas.push({ rings, water: p.natural === "water", name: p.name || "" });
    }
  }
}
mkdirSync("public/combat3d", { recursive: true });
writeFileSync(
  "public/combat3d/lublin.json",
  JSON.stringify({
    origin,
    scale,
    radius: radius * scale,
    buildings,
    roads,
    areas,
    attribution: "© OpenStreetMap contributors",
    source: "data/lublin-osm.geojsonseq.gz",
  }),
);
console.log(
  `combat3d: ${buildings.length} buildings, ${roads.length} roads, ${areas.length} areas`,
);
