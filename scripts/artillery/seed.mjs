// Produces reviewable SQL; never applies it. Uses the game's real map projections.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { build } from "vite";
await build({
  configFile: false,
  logLevel: "warn",
  build: {
    outDir: ".cache/artillery-projection",
    lib: {
      entry: "src/map/CityMap.ts",
      formats: ["es"],
      fileName: () => "city.mjs",
    },
  },
});
const { CityMap, PX_PER_M } = await import(
  "../../.cache/artillery-projection/city.mjs"
);
const id = process.argv[2] ?? "lublin",
  n = JSON.parse(readFileSync(`public/artillery/${id}.json`)),
  raw = JSON.parse(readFileSync("public/map/lublin.json"));
const lublin = new CityMap(raw, "lublin"),
  lat = (n.source.bounds[1] + n.source.bounds[3]) / 2,
  lon = (n.source.bounds[0] + n.source.bounds[2]) / 2;
const mapId = `w:${lat.toFixed(4)},${lon.toFixed(4)}`,
  world = CityMap.world(mapId, { lat, lon }, () => async () => ({
    areas: [],
    lines: [],
    buildings: [],
    pois: [],
  }));
const quote = (x) => "'" + String(x).replaceAll("'", "''") + "'",
  json = (x) => quote(JSON.stringify(x)) + "::jsonb";
const origins = {
  lublin: raw.origin ?? {
    lon: raw.bounds.minLon,
    lat: raw.bounds.maxLat,
    lat0: (raw.bounds.minLat + raw.bounds.maxLat) / 2,
  },
};
let sql = `-- REVIEW BEFORE APPLYING. TEST registry; stays disabled. Import only into a disabled network. No player data is removed.\nbegin;\ndo $guard$ begin if exists(select 1 from public.ma_networks where id=${quote(id)} and enabled) then raise exception 'Disable this network before importing';end if;end $guard$;\ninsert into public.ma_networks(id,version,enabled,price,payload) values(${quote(id)},${n.version},false,${n.rules.price},${json({ id: n.id, version: n.version, city: { name: n.city?.name, population: n.city?.population }, source: n.source, rules: n.rules, mapOrigins: origins })}) on conflict(id) do update set version=excluded.version,payload=excluded.payload,price=excluded.price;\n`;
for (const s of n.stops) {
  const ll = {
      lon: n.origin.lon + s.x / n.projection.mLon,
      lat: n.origin.lat - s.y / n.projection.mLat,
    },
    city = lublin.hasLatLon(ll.lat, ll.lon) ? lublin : world,
    p = city.fromLatLon(ll.lat, ll.lon),
    at = { m: city.id, ...p, s: PX_PER_M, ...ll };
  sql += `insert into public.ma_stops(id,network,name,at,enabled,airport) values(${quote(s.id)},${quote(id)},${quote(s.name)},${json(at)},${!s.disabled},${!!s.airport}) on conflict(id) do nothing;\n`;
  // Explicit corrections retain IDs and are applied only from the reviewed override file.
  const overrideFile = `data/artillery-${id}-overrides.json`;
  const overrides = existsSync(overrideFile)
    ? JSON.parse(readFileSync(overrideFile))
    : {};
  if (overrides[s.id])
    sql += `update public.ma_stops set name=${quote(s.name)},at=${json(at)},enabled=${!s.disabled},corrected=true where id=${quote(s.id)};\n`;
}
if (process.argv.includes("--replace-links"))
  sql += `delete from public.ma_edges e using public.ma_stops s where e.a=s.id and s.network=${quote(id)};\n`;
for (const [a, b] of n.edges)
  sql += `insert into public.ma_edges values(${quote(a < b ? a : b)},${quote(a < b ? b : a)}) on conflict do nothing;\n`;
sql +=
  "commit;\n-- After reviewing real data and database checks, activation is a separate explicit operation.\n";
writeFileSync(`docs/sql/artillery-${id}-registry.sql`, sql);
console.log("Wrote disabled registry SQL for", n.stops.length, "stops");
