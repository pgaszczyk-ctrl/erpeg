-- Arena Cechu – asynchroniczne PvP (owner, 18 Oct 2026; docs/walka/PVP_PLAN.md).
-- A fight costs 100 coins and pays 150 for a win (both counted in the game's save, like every price).
-- Rivals are "ghosts": a snapshot of another character at level ±1 whose owner fought at the arena that same
-- Warsaw day (owner: „walczysz automatycznie danego dnia, jeśli choć jedną walkę stoczyłeś tego dnia”).
-- Each ghost win counts in the owner's daily letter (10 gold per win, collected from the home chest).
-- Limits: 5 fights per hour, 15 per day (tickets issued, so re-drawing a rival also uses one).
-- RLS on, no policies: only these SECURITY DEFINER functions.

create table if not exists public.arena_duchy (
  player_id uuid primary key,
  name text not null,
  poziom int not null,
  snap jsonb not null,
  dzien date,                      -- the Warsaw day of the owner's last arena fight
  punkty int not null default 1000,
  wygrane int not null default 0,
  przegrane int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.arena_duchy enable row level security;
create index if not exists arena_duchy_dzien on public.arena_duchy (dzien, poziom);

create table if not exists public.arena_bilety (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null,
  rywal_id uuid,                   -- null = the Mechanical Gladiator
  at timestamptz not null default now(),
  wynik boolean,
  rozegrana_at timestamptz
);
alter table public.arena_bilety enable row level security;
create index if not exists arena_bilety_gracz on public.arena_bilety (player_id, at desc);

create table if not exists public.arena_obrony (
  player_id uuid not null,         -- the ghost's owner
  dzien date not null,
  walk int not null default 0,
  wygranych int not null default 0,
  odebrane boolean not null default false,
  primary key (player_id, dzien)
);
alter table public.arena_obrony enable row level security;

-- The character level from EXP (content/historia.ts: thresholds 50·(N−1)·N, at most 20).
create or replace function public._poziom_z_exp(p_exp int) returns int language sql immutable as $$
  select least(20, greatest(1, floor((1 + sqrt(1 + 4.0 * greatest(p_exp, 0) / 50)) / 2)::int));
$$;

-- Draws a rival and issues a ticket. p_snap = the player's own fighter (kept as their ghost).
create or replace function public.arena_rywal(p_token text, p_snap jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_id uuid; v_name text; v_exp int; v_test boolean; v_poziom int;
  v_dzis date := (now() at time zone 'Europe/Warsaw')::date;
  v_godz int; v_dzien int; v_ostatni uuid; v_r record; v_bilet uuid;
begin
  select t.id into v_id from public._player_by_token(p_token) t;
  if v_id is null then return jsonb_build_object('blad', 'sesja'); end if;
  select name, exp, coalesce(immortal, false) or coalesce(infinite_resurrect, false) into v_name, v_exp, v_test from players where id = v_id;
  v_poziom := public._poziom_z_exp(v_exp);
  select count(*) filter (where at > now() - interval '1 hour'),
         count(*) filter (where (at at time zone 'Europe/Warsaw')::date = v_dzis)
    into v_godz, v_dzien from arena_bilety where player_id = v_id and at > now() - interval '2 days';
  if v_dzien >= 15 then return jsonb_build_object('blad', 'dzien'); end if;
  if v_godz >= 5 then
    return jsonb_build_object('blad', 'godzina', 'za_min', (select ceil(extract(epoch from (min(at) + interval '1 hour' - now())) / 60)
      from (select at from arena_bilety where player_id = v_id and at > now() - interval '1 hour') q));
  end if;
  if p_snap is null or length(p_snap::text) > 8000 then return jsonb_build_object('blad', 'dane'); end if;
  insert into arena_duchy (player_id, name, poziom, snap, updated_at) values (v_id, v_name, v_poziom, p_snap, now())
  on conflict (player_id) do update set name = excluded.name, poziom = excluded.poziom, snap = excluded.snap, updated_at = now();
  select rywal_id into v_ostatni from arena_bilety where player_id = v_id order by at desc limit 1;
  -- Ghosts whose owners fought today, level ±1, alive; test characters only meet each other.
  select d.player_id, d.name, d.poziom, d.snap, d.wygrane, d.punkty into v_r
  from arena_duchy d join players p on p.id = d.player_id
  where d.player_id <> v_id and d.dzien = v_dzis and abs(d.poziom - v_poziom) <= 1 and not coalesce(p.dead, false)
    and (coalesce(p.immortal, false) or coalesce(p.infinite_resurrect, false)) = v_test
    and d.player_id is distinct from v_ostatni
  order by random() limit 1;
  insert into arena_bilety (player_id, rywal_id) values (v_id, v_r.player_id) returning id into v_bilet;
  return jsonb_build_object('bilet', v_bilet, 'poziom', v_poziom,
    'zostalo_godz', 4 - v_godz, 'zostalo_dzis', 14 - v_dzien,
    'rywal', case when v_r.player_id is null then null else jsonb_build_object('name', v_r.name, 'poziom', v_r.poziom, 'snap', v_r.snap, 'wygrane', v_r.wygrane, 'punkty', v_r.punkty) end);
end $$;

-- The fight's result for a ticket (once, between 5 s and 30 min after it was issued).
create or replace function public.arena_wynik(p_token text, p_bilet uuid, p_wygrana boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_id uuid; v_b record; v_dzis date := (now() at time zone 'Europe/Warsaw')::date;
  v_ja int; v_on int; v_ocz real; v_delta int;
begin
  select t.id into v_id from public._player_by_token(p_token) t;
  if v_id is null then return jsonb_build_object('blad', 'sesja'); end if;
  select * into v_b from arena_bilety where id = p_bilet and player_id = v_id for update;
  if v_b.id is null or v_b.wynik is not null then return jsonb_build_object('blad', 'bilet'); end if;
  if v_b.at > now() - interval '5 seconds' or v_b.at < now() - interval '30 minutes' then return jsonb_build_object('blad', 'czas'); end if;
  update arena_bilety set wynik = p_wygrana, rozegrana_at = now() where id = p_bilet;
  select punkty into v_ja from arena_duchy where player_id = v_id;
  v_on := coalesce((select punkty from arena_duchy where player_id = v_b.rywal_id), 1000);
  -- Elo, K = 32.
  v_ocz := 1 / (1 + power(10, (v_on - coalesce(v_ja, 1000)) / 400.0));
  v_delta := round(32 * ((case when p_wygrana then 1 else 0 end) - v_ocz));
  update arena_duchy set dzien = v_dzis, punkty = greatest(0, punkty + v_delta),
    wygrane = wygrane + (case when p_wygrana then 1 else 0 end), przegrane = przegrane + (case when p_wygrana then 0 else 1 end)
  where player_id = v_id;
  if v_b.rywal_id is not null then
    update arena_duchy set punkty = greatest(0, punkty - v_delta) where player_id = v_b.rywal_id;
    insert into arena_obrony (player_id, dzien, walk, wygranych) values (v_b.rywal_id, v_dzis, 1, case when p_wygrana then 0 else 1 end)
    on conflict (player_id, dzien) do update set walk = arena_obrony.walk + 1, wygranych = arena_obrony.wygranych + excluded.wygranych;
  end if;
  return (select jsonb_build_object('punkty', punkty, 'delta', v_delta, 'wygrane', wygrane, 'przegrane', przegrane) from arena_duchy where player_id = v_id);
end $$;

-- Letters waiting in the home chest: one per earlier day the ghost fought.
create or replace function public.arena_listy(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid;
begin
  select t.id into v_id from public._player_by_token(p_token) t;
  if v_id is null then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('dzien', dzien, 'walk', walk, 'wygranych', wygranych) order by dzien)
    from arena_obrony where player_id = v_id and not odebrane and walk > 0 and dzien < (now() at time zone 'Europe/Warsaw')::date), '[]'::jsonb);
end $$;

-- Opens a letter: 10 gold per ghost win (once).
create or replace function public.arena_odbierz(p_token text, p_dzien date)
returns int language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid; v_w int;
begin
  select t.id into v_id from public._player_by_token(p_token) t;
  if v_id is null then return 0; end if;
  update arena_obrony set odebrane = true where player_id = v_id and dzien = p_dzien and not odebrane
    and dzien < (now() at time zone 'Europe/Warsaw')::date returning wygranych into v_w;
  return coalesce(v_w, 0) * 10;
end $$;

-- Top 10 (no test characters) and the player's own line and place.
create or replace function public.arena_ranking(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid;
begin
  select t.id into v_id from public._player_by_token(p_token) t;
  return jsonb_build_object(
    'top', coalesce((select jsonb_agg(r) from (
      select d.name, d.poziom, d.punkty, d.wygrane, d.przegrane from arena_duchy d join players p on p.id = d.player_id
      where d.wygrane + d.przegrane > 0 and not coalesce(p.immortal, false) and not coalesce(p.infinite_resurrect, false)
      order by d.punkty desc, d.wygrane desc limit 10) r), '[]'::jsonb),
    'ja', (select jsonb_build_object('punkty', d.punkty, 'wygrane', d.wygrane, 'przegrane', d.przegrane,
        'miejsce', (select count(*) + 1 from arena_duchy o join players q on q.id = o.player_id
          where o.punkty > d.punkty and o.wygrane + o.przegrane > 0 and not coalesce(q.immortal, false) and not coalesce(q.infinite_resurrect, false)),
        'obrony', coalesce((select sum(wygranych) from arena_obrony where player_id = v_id), 0))
      from arena_duchy d where d.player_id = v_id));
end $$;

grant execute on function public.arena_rywal(text, jsonb) to anon, authenticated;
grant execute on function public.arena_wynik(text, uuid, boolean) to anon, authenticated;
grant execute on function public.arena_listy(text) to anon, authenticated;
grant execute on function public.arena_odbierz(text, date) to anon, authenticated;
grant execute on function public.arena_ranking(text) to anon, authenticated;
