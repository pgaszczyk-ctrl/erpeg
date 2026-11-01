// Generated artillery on the real Lublin game map: where each station's cannon ends up (needs public/map from build-maps).
// node scripts/artillery/sprawdz-lublin.mjs [city name]
import fs from "node:fs";
import { build } from "vite";
await build({ configFile: false, logLevel: "warn", build: { outDir: ".cache/artillery-gen-check",
  lib: { entry: { city: "src/map/CityMap.ts", miejsce: "src/artillery/miejsce.ts", gen: "src/artillery/generator.ts" }, formats: ["es"], fileName: (_f, n) => `${n}.mjs` } } });
const { CityMap, PX_PER_M } = await import("../../.cache/artillery-gen-check/city.mjs");
const { miejsceStacji } = await import("../../.cache/artillery-gen-check/miejsce.mjs");
const G = await import("../../.cache/artillery-gen-check/gen.mjs");
globalThis.fetch = async (url) => new Response(fs.readFileSync("public/" + url), { headers: { "Content-Type": "application/json" } });
const swiat = JSON.parse(fs.readFileSync("public/artillery/swiat.json"));
const name = process.argv[2] ?? "Lublin";
const m = swiat.miasta.find((c) => c[1] === name);
const siec = G.generujSiec(m, swiat.lotniska);
const lublin = new CityMap(JSON.parse(fs.readFileSync("public/map/lublin.json")), "lublin");
const out = [];
for (const s of siec.stacje) {
  const row = { k: s.k, nazwa: G.nazwaStacji(s, siec, false), lat: +s.lat.toFixed(5), lon: +s.lon.toFixed(5) };
  if (!lublin.hasLatLon(s.lat, s.lon)) { out.push({ ...row, mapa: "świat (poza mapą Lublina)" }); continue; }
  const g = lublin.fromLatLon(s.lat, s.lon);
  await lublin.ensure(g.x, g.y, 700 * PX_PER_M);
  const p = miejsceStacji(lublin, s.id, s.lat, s.lon);
  out.push({ ...row, mapa: "lublin", przesuniecieM: p ? Math.round(Math.hypot(p.x - g.x, p.y - g.y) / PX_PER_M) : null, ok: !!p });
}
console.table(out);
console.log("links:", siec.krawedzie.map(([a, b]) => `${a}-${b}`).join(" "));
