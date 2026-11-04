// Local PostgreSQL/WASM only. PGLITE_MODULE points to an external test install;
// it is intentionally not a game dependency. No production credentials used.
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const { pgcrypto } = require(process.env.PGLITE_MODULE
  ? process.env.PGLITE_MODULE + '/dist/contrib/pgcrypto.cjs'
  : '@electric-sql/pglite/contrib/pgcrypto');
(async () => {
  const db = new PGlite({ extensions: { pgcrypto } });
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema extensions; create extension pgcrypto with schema extensions;
      create table public.players(id uuid primary key default gen_random_uuid(),
        name text not null, idik text not null, start_x real not null, start_y real not null,
        token_hash text, session_open boolean not null default false, dead boolean not null default false);
      alter table public.players enable row level security;
      create table public.port_requests(id bigserial primary key, at timestamptz default now(),
        player text, port text, lat float8, lon float8, text text not null,
        status text default 'nowe', odpowiedz text);
      alter table public.port_requests enable row level security;
      create function public._new_code() returns text language sql as $$ select upper(left(gen_random_uuid()::text,8)) $$;
    `);
    const migration = readFileSync('docs/sql/security-hardening.sql', 'utf8');
    await db.exec(migration);
    await db.exec(migration); // Repeatability: no data destruction or duplicate triggers.
    const result = await db.exec(readFileSync('docs/sql/security-hardening-test.sql', 'utf8'));
    console.log(result.at(-1).rows[0].result);
    assert.equal((await db.query('select count(*)::int n from public.players')).rows[0].n,0);
    assert.equal((await db.query('select count(*)::int n from public.port_requests')).rows[0].n,0);
    console.log('PASS: migration repeated; RLS retained; synthetic rows fully rolled back');
  } finally { await db.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
