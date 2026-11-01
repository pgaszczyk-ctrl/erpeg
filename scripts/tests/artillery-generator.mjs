// The generated artillery: game recipe (src/artillery/generator.ts) vs its server twin (docs/sql/artillery-generator.sql)
// on hundreds of real cities, plus ma_lot's checks. Runs in PGlite, no real database.
// node --experimental-strip-types scripts/tests/artillery-generator.mjs   (PGLITE_MODULE=/path/to/pglite if not installed)
import fs from "node:fs";
import assert from "node:assert/strict";
const { PGlite } = await import(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const G = await import("../../src/artillery/generator.ts");
const swiat = JSON.parse(fs.readFileSync("public/artillery/swiat.json"));
const db = new PGlite();
await db.exec(`
create table players(id uuid primary key,name text,save jsonb,snapshot jsonb,dead boolean default false,token text);
create function _player_by_token(p text) returns table(id uuid) language sql as $$ select id from players where token=p $$;
create table ma_trips(player uuid references players(id),nonce uuid,origin text,destination text,state text not null,price int not null,coins_after int not null,origin_at jsonb not null,destination_at jsonb not null,hero jsonb not null default '{}'::jsonb,created timestamptz default now(),primary key(player,nonce));
do $$ begin create role anon; create role authenticated; exception when others then null; end $$;
`);
await db.exec(fs.readFileSync("docs/sql/artillery-generator.sql", "utf8"));
await db.exec(fs.readFileSync("docs/sql/artillery-swiat-dane.sql", "utf8"));

// 1) Parity on a spread of cities (every 15th + chosen ones).
const chosen = new Set(["Lublin", "Warsaw", "Istanbul", "Chicago", "Copenhagen", "Gdańsk", "Radom", "Tokyo", "Lagos", "Reykjavík", "Quito", "Auckland"]);
const sample = swiat.miasta.filter((m, i) => i % 15 === 0 || chosen.has(m[1]));
let stations = 0, links = 0, maxDiff = 0;
for (const m of sample) {
  const js = G.generujSiec(m, swiat.lotniska);
  const sq = (await db.query(`select k,lat,lon,rodzaj from ma_siec($1) order by k`, [m[0]])).rows;
  assert.equal(sq.length, js.stacje.length, `${m[1]}: station count`);
  for (const s of js.stacje) {
    const r = sq[s.k];
    assert.equal(r.rodzaj, s.rodzaj, `${m[1]} #${s.k}: kind`);
    const d = G.metry(s, r);
    maxDiff = Math.max(maxDiff, d);
    assert(d < 0.01, `${m[1]} #${s.k}: ${d} m apart`);
  }
  const ek = (await db.query(`select a,b from ma_krawedzie($1)`, [m[0]])).rows.map((r) => `${r.a},${r.b}`);
  assert.deepEqual(ek, js.krawedzie.map(([a, b]) => `${a},${b}`), `${m[1]}: links`);
  stations += js.stacje.length;
  links += js.krawedzie.length;
}
const masked = sample.filter((m) => m[6]).length;
assert(masked > 10, "the sample includes coastal cities with stations left out on water");
console.log(`parity OK: ${sample.length} cities, ${stations} stations, ${links} links, max ${maxDiff.toExponential(1)} m`);

// 2) Lublin: airports, counts, every station linked, network connected.
const lublin = swiat.miasta.find((m) => m[1] === "Lublin");
const L = G.generujSiec(lublin, swiat.lotniska);
console.log("Lublin:", L.stacje.map((s) => `${G.nazwaStacji(s, L, false)} ${s.lat.toFixed(4)},${s.lon.toFixed(4)}`).join(" | "));
assert(L.stacje.some((s) => s.rodzaj === "lotnisko" && /Lublin Airport/.test(s.nazwa)), "Lublin airport is a station");
const seen = new Set([0]);
for (let grew = true; grew; ) {
  grew = false;
  for (const [a, b] of L.krawedzie) if (seen.has(a) !== seen.has(b)) seen.add(a), seen.add(b), (grew = true);
}
assert.equal(seen.size, L.stacje.length, "Lublin network is connected");
for (const m of sample) {
  const s = G.generujSiec(m, swiat.lotniska), ok = new Set([0]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const [a, b] of s.krawedzie) if (ok.has(a) !== ok.has(b)) ok.add(a), ok.add(b), (grew = true);
  }
  assert.equal(ok.size, s.stacje.length, `${m[1]} connected`);
}
assert.equal(G.miastoPrzy(swiat, { lat: 51.2478, lon: 22.5686 })?.[1], "Lublin");
assert.equal(G.miastoPrzy(swiat, { lat: 52.19, lon: 21.03 })?.[1], "Warsaw", "Mokotów belongs to Warsaw");
assert.equal(G.miastoPrzy(swiat, { lat: 50.0, lon: 25.0 }), null, "open country: no network");

// 3) ma_lot: price, distance checks, links.
const sq = (await db.query(`select k,lat,lon from ma_siec($1) order by k`, [lublin[0]])).rows;
// Lublin map projection (same as CityMap / ma_ll): position near a lat/lon.
const O = { lat: 51.2965553, lon: 22.4537881, lat0: (51.21818255 * Math.PI) / 180 };
const at = (p, dm = 0) => ({
  m: "lublin",
  s: 1.92,
  x: (p.lon - O.lon) * 111412.84 * Math.cos(O.lat0) * 1.92 + dm * 1.92,
  y: (O.lat - p.lat) * (111132.954 - 559.822 * Math.cos(2 * O.lat0)) * 1.92,
});
const [a, b] = L.krawedzie[0];
await db.query(`insert into players values('00000000-0000-0000-0000-000000000001','Arceus',$1,null,false,'tok')`, [
  JSON.stringify({ coins: 1000, tu: at(sq[a], 100) }),
]);
const lot = (from, to, dest, nonce = crypto.randomUUID()) =>
  db.query(`select ma_lot('tok',$1,$2,$3,$4) r`, [nonce, `c${lublin[0]}:${from}`, `c${lublin[0]}:${to}`, JSON.stringify(dest)]);
const nonLinked = L.stacje.map((s) => s.k).find((k) => k !== a && !L.krawedzie.some(([x, y]) => (x === a && y === k) || (y === a && x === k)));
await assert.rejects(lot(a, nonLinked, at(sq[nonLinked])), /Route unavailable/);
await assert.rejects(lot(a, b, at(sq[b], 600)), /unsafe/);
const r = (await lot(a, b, at(sq[b], 150))).rows[0].r;
const price = G.cenaZaMetry(G.metry(L.stacje[a], L.stacje[b]));
assert.equal(r.price, price, "server price = game price");
assert.equal(r.coins_after, 1000 - price);
console.log(`ma_lot OK: ${G.metry(L.stacje[a], L.stacje[b]).toFixed(0)} m → ${price} coins`);
const far = (await db.query(`update players set save=jsonb_set(save,'{tu}',$1) returning 1`, [JSON.stringify(at(sq[a], 800))]));
await db.query(`update ma_trips set state='done'`);
await assert.rejects(lot(a, b, at(sq[b])), /Come closer/);
console.log("PASS artillery generator");
