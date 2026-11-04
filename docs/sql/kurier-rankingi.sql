-- „Kurier Parowy” – codzienne rankingi (owner, 11 Oct 2026).
-- The game adds `kur` {m: metres walked in total, o: badge ids held, k: country (2 letters), c: town}
-- to the heartbeat snapshot about once a minute. `_kurier_note` keeps one row per character and day
-- (Warsaw date): metres walked that day (m1 − m0; added up from the growth of the total `ml` between
-- heartbeats, so reloading an older save never subtracts – at most 5 km per note), the badges at the
-- start of the day (o0 = the previous day's end) and the latest ones (o1). `kurier_wydanie` builds yesterday's edition: top walkers and outstanding badges for
-- the world, the player's country and town, plus the player's own summary.
-- Test characters (immortal / infinite_resurrect) never appear in the rankings.

create table if not exists public.kurier_dni (
  player uuid not null references public.players(id) on delete cascade,
  dzien date not null,
  m0 real not null default 0,
  m1 real not null default 0,
  ml real not null default 0,
  o0 text[] not null default '{}',
  o1 text[] not null default '{}',
  kraj text,
  miasto text,
  at timestamptz not null default now(),
  primary key (player, dzien)
);
alter table public.kurier_dni enable row level security;
alter table public.kurier_dni add column if not exists ml real not null default 0;
create index if not exists kurier_dni_dzien on public.kurier_dni (dzien);

create or replace function public._kurier_note(p_player uuid, p_kur jsonb)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_day date := (now() at time zone 'Europe/Warsaw')::date;
  v_m real := least(greatest(coalesce((p_kur->>'m')::real, 0), 0), 1e9);
  v_o text[];
  v_k text := nullif(upper(left(coalesce(p_kur->>'k', ''), 2)), '');
  v_c text := nullif(left(coalesce(p_kur->>'c', ''), 60), '');
  v_prev record;
begin
  if jsonb_typeof(p_kur->'o') = 'array' then
    select coalesce(array_agg(left(x, 24)), '{}') into v_o
      from (select jsonb_array_elements_text(p_kur->'o') x limit 60) s;
  else v_o := '{}'; end if;
  update kurier_dni set m1 = m1 + least(greatest(v_m - ml, 0), 5000), ml = v_m, o1 = v_o,
      kraj = coalesce(v_k, kraj), miasto = coalesce(v_c, miasto), at = now()
    where player = p_player and dzien = v_day;
  if found then return; end if;
  select ml, o1 into v_prev from kurier_dni where player = p_player and dzien < v_day order by dzien desc limit 1;
  insert into kurier_dni (player, dzien, m0, m1, ml, o0, o1, kraj, miasto)
    values (p_player, v_day, 0, coalesce(least(greatest(v_m - v_prev.ml, 0), 5000), 0), v_m, coalesce(v_prev.o1, v_o), v_o, v_k, v_c)
    on conflict (player, dzien) do nothing;
end $$;
revoke all on function public._kurier_note(uuid, jsonb) from public, anon, authenticated;

create or replace function public.heartbeat(p_token text, p_snapshot jsonb)
returns boolean language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare v_id uuid;
begin
  select id into v_id from public._player_by_token(p_token);
  if v_id is null then return false; end if;
  update public.players set snapshot = p_snapshot - 'kur', session_open = true, last_seen = now() where id = v_id;
  if jsonb_typeof(p_snapshot->'kur') = 'object' then
    begin
      perform public._kurier_note(v_id, p_snapshot->'kur');
    exception when others then null; -- the newspaper must never break the heartbeat
    end;
  end if;
  return true;
end $$;

-- One scope of the edition: rows of the day, optionally filtered by country/town.
create or replace function public._kurier_zakres(p_day date, p_kraj text, p_miasto text)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  with d as (
    select k.player, p.name, k.m1 - k.m0 as m,
      array(select unnest(k.o1) except select unnest(k.o0)) as nowe
    from kurier_dni k join players p on p.id = k.player
    where k.dzien = p_day and not coalesce(p.immortal, false) and not coalesce(p.infinite_resurrect, false)
      and (p_kraj is null or k.kraj = p_kraj) and (p_miasto is null or k.miasto = p_miasto)
  ), rzadkie as (  -- how many characters hold each badge (fewer = more outstanding)
    select o, count(*) n from (
      select distinct on (player) player, o1 from kurier_dni order by player, dzien desc
    ) l, unnest(l.o1) o group by o
  )
  select jsonb_build_object(
    'km', coalesce((select jsonb_agg(jsonb_build_object('n', name, 'km', round((m / 1000)::numeric, 1)) order by m desc)
      from (select name, m from d where m >= 100 order by m desc limit 5) t), '[]'),
    'wybitne', coalesce((select jsonb_agg(jsonb_build_object('n', name, 'o', nowe) order by w)
      from (select name, nowe, (select min(coalesce(r.n, 1)) from unnest(d.nowe) x left join rzadkie r on r.o = x) w
            from d where cardinality(nowe) > 0 order by w, cardinality(nowe) desc limit 5) t), '[]'),
    'graczy', (select count(*) from d where m >= 100 or cardinality(nowe) > 0)
  )
$$;
revoke all on function public._kurier_zakres(date, text, text) from public, anon, authenticated;

-- Yesterday's edition (Warsaw date); while yesterday is empty (the first day) today's live one.
create or replace function public.kurier_wydanie(p_token text, p_kraj text, p_miasto text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_today date := (now() at time zone 'Europe/Warsaw')::date;
  v_day date := v_today - 1;
  v_id uuid;
  v_ja jsonb;
  v_kraj text := nullif(upper(left(coalesce(p_kraj, ''), 2)), '');
  v_miasto text := nullif(left(coalesce(p_miasto, ''), 60), '');
begin
  if not exists (select 1 from kurier_dni where dzien = v_day) then v_day := v_today; end if;
  select id into v_id from public._player_by_token(p_token);
  if v_id is not null then
    select jsonb_build_object('km', round(((m1 - m0) / 1000)::numeric, 1),
      'o', to_jsonb(array(select unnest(o1) except select unnest(o0))))
      into v_ja from kurier_dni where player = v_id and dzien = v_day;
  end if;
  return jsonb_build_object(
    'dzien', v_day, 'dzis', v_day = v_today,
    'swiat', _kurier_zakres(v_day, null, null),
    'kraj', case when v_kraj is null then null else _kurier_zakres(v_day, v_kraj, null) end,
    'miasto', case when v_miasto is null then null else _kurier_zakres(v_day, v_kraj, v_miasto) end,
    'ja', v_ja);
end $$;
grant execute on function public.kurier_wydanie(text, text, text) to anon, authenticated;
