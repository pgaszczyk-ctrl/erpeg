// Exact migration in a real embedded PostgreSQL engine; all rows are disposable fixtures.
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
await db.exec(`create role anon; create role authenticated;
create schema extensions;
create table public.players(id uuid primary key, name text default 'Jam', token text, save jsonb, snapshot jsonb,dead boolean default false);
create function public._player_by_token(p_token text) returns table(id uuid) language sql as 'select id from public.players where token=p_token';`);
await db.exec(await readFile("docs/sql/artillery.sql", "utf8"));
const id = "00000000-0000-4000-8000-000000000099",
  nonce = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002";
const at = (x) => ({ m: "lublin", x, y: 100, s: 1.92 });
await db.query("insert into players(id,token,save) values($1,$2,$3)", [
  id,
  "fixture",
  {
    coins: 100,
    artilleryHero:{hp:4,extra:2,extraUntil:2000000000000,boost:.3,boostUntil:2000000000000,face:{x:0,y:1}},
    tu: at(100),
    look: { postac: "female" },
    equip: { bron: "zelazny" },
  },
]);
await db.exec(`insert into ma_networks values('lublin',1,true,5,'{}');`);
for (const [stop, x] of [
  ["a", 100],
  ["b", 1000],
  ["c", 2000],
])
  await db.query(
    "insert into ma_stops(id,network,name,at) values($1,$2,$1,$3)",
    [stop, "lublin", at(x)],
  );
await db.exec(`insert into ma_edges values('a','b');`);
const call = async (name, ...args) =>
  (
    await db.query(
      `select ${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) as result`,
      args,
    )
  ).rows[0].result;
await assert.rejects(
  call("ma_state", "bad-token", "lublin"),
  /Session expired/,
);
await call("ma_discover", "fixture", "a");
await assert.rejects(call("ma_discover", "fixture", "b"), /Come closer/);
await assert.rejects(
  call("ma_begin", "fixture", nonce, "a", "b"),
  /Discover both/,
);
await db.query("insert into ma_discoveries(player,stop) values($1,$2)", [
  id,
  "b",
]);
await db.query("update players set snapshot=$1 where id=$2", [
  { x: 100, y: 100, enemies: [{ x: 105, y: 100, hp: 5 }] },
  id,
]);
await assert.rejects(call("ma_begin", "fixture", nonce, "a", "b"), /combat/);
await db.query("update players set snapshot=null where id=$1", [id]);
await assert.rejects(
  call("ma_begin", "fixture", nonce, "a", "c"),
  /Route unavailable/,
);
const receipt = await call("ma_begin", "fixture", nonce, "a", "b");
assert.equal(receipt.coins_after, 95);
assert.deepEqual(
  await call("ma_begin", "fixture", nonce, "a", "b"),
  receipt,
  "same nonce returns exactly the committed receipt",
);
await assert.rejects(
  call("ma_begin", "fixture", nonce, "b", "a"),
  /Nonce reused/,
);
await assert.rejects(
  call("ma_begin", "fixture", other, "a", "b"),
  /already pending/,
);
// A stale existing-client save and heartbeat cannot undo the committed wallet/arrival.
await db.query("update players set save=$1,snapshot=$2 where id=$3", [
  {
    coins: 100,
    tu: at(100),
    look: { postac: "female" },
    equip: { bron: "zelazny" },
  },
  { x: 100, y: 100, enemies: [{ hp: 5, x: 101, y: 100 }] },
  id,
]);
let player = (await db.query("select * from players where id=$1", [id]))
  .rows[0];
assert.equal(player.save.coins, 95);
assert.deepEqual(player.save.tu, at(1000));
assert.equal(player.snapshot, null);
assert.equal(
  player.save.artilleryHero.extra,
  2,
  "pending receipt protects timed effects against stale saves",
);
assert.equal(player.save.look.postac, "female");
const state = await call("ma_state", "fixture", "lublin");
assert.equal(state.pending.nonce, nonce);
assert.equal(
  (await call("ma_state", "fixture", "")).pending.nonce,
  nonce,
  "recovery does not depend on choosing the right network first",
);
assert(state.discovered.includes("a"));
await call("ma_settle", "fixture", nonce, true);
await call("ma_settle", "fixture", nonce, true);
player = (await db.query("select * from players where id=$1", [id])).rows[0];
assert.equal(player.save.coins, 100);
assert.deepEqual(player.save.tu, at(100));
const committed = await call("ma_begin", "fixture", other, "a", "b");
assert.equal(committed.coins_after, 95);
assert.equal((await call("ma_settle", "fixture", other, false)).state, "done");
assert.equal(
  (await call("ma_settle", "fixture", other, true)).state,
  "done",
  "late cancellation cannot refund a completed journey",
);
player = (await db.query("select * from players where id=$1", [id])).rows[0];
assert.equal(player.save.coins, 95);
assert.deepEqual(player.save.tu, at(1000));
await db.query("update players set save=$1 where id=$2", [
  { coins: 0, tu: at(1000) },
  id,
]);
await assert.rejects(
  call("ma_begin", "fixture", "00000000-0000-4000-8000-000000000003", "b", "a"),
  /Not enough coins/,
);
assert.equal(
  await call(
    "ma_near",
    { m: "lublin" },
    { m: "lublin", x: 0, y: 0, s: 1.92 },
    {},
  ),
  false,
  "missing coordinates fail closed",
);
assert.equal(
  (
    await db.query(
      "select has_function_privilege('anon','public.ma_near(jsonb,jsonb,jsonb)','execute') as allowed",
    )
  ).rows[0].allowed,
  false,
);
console.log(
  "PASS: exact SQL migration, auth, discovery, combat, edge validation, nonce replay, pending exclusion, late save/heartbeat guard, resume, refund once, terminal settlement, wallet, appearance",
);
await db.close();
