-- Łamigłówka dnia w „Kurierze Parowym” (owner, 12 Oct 2026). The puzzles themselves are made in the game
-- (src/lamiglowki.ts, deterministic from the Warsaw day and the difficulty level); the server only records
-- who solved the day's puzzle – once per character per day – for the admin panel and the coming lottery
-- (owner: 3 winners, at most 10 000 gold each – not built yet). RLS on, no policies: only RPCs.
create table if not exists public.lamiglowki_rozwiazania (
  player_id uuid not null,
  dzien date not null,
  poziom int not null,
  rodzaj text not null,
  sekundy int,
  at timestamptz not null default now(),
  primary key (player_id, dzien)
);
alter table public.lamiglowki_rozwiazania enable row level security;

-- p_dzien must be today or yesterday in Warsaw (a puzzle started just before midnight).
create or replace function public.lamiglowka_rozwiazana(p_token text, p_dzien date, p_poziom int, p_rodzaj text, p_sekundy int)
returns boolean language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid; v_dzis date := (now() at time zone 'Europe/Warsaw')::date;
begin
  select id into v_id from public._player_by_token(p_token);
  if v_id is null then return false; end if;
  if p_dzien not in (v_dzis, v_dzis - 1) then return false; end if;
  if p_rodzaj not in ('sudoku', 'kakuro', 'krzyzowka', 'trasa') or p_poziom not between 0 and 4 then return false; end if;
  insert into lamiglowki_rozwiazania (player_id, dzien, poziom, rodzaj, sekundy)
  values (v_id, p_dzien, p_poziom, p_rodzaj, greatest(0, least(p_sekundy, 86400)))
  on conflict do nothing;
  return found;
end $$;

-- Per day (last 30): how many solved, per level, median time; plus the latest 50 solvers.
create or replace function public.admin_lamiglowki(p_key text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if not public._admin_ok(p_key) then raise exception 'Złe hasło admina'; end if;
  return jsonb_build_object(
    'dni', coalesce((select jsonb_agg(d order by d.dzien desc) from (
      select l.dzien, min(l.rodzaj) rodzaj, count(*) ile,
        count(*) filter (where not coalesce(p.immortal, false) and not coalesce(p.infinite_resurrect, false)) graczy,
        jsonb_build_array(count(*) filter (where poziom = 0), count(*) filter (where poziom = 1), count(*) filter (where poziom = 2),
          count(*) filter (where poziom = 3), count(*) filter (where poziom = 4)) poziomy,
        percentile_cont(0.5) within group (order by sekundy) mediana
      from lamiglowki_rozwiazania l left join players p on p.id = l.player_id
      where l.dzien > (now() at time zone 'Europe/Warsaw')::date - 30
      group by l.dzien) d), '[]'::jsonb),
    'ostatni', coalesce((select jsonb_agg(o) from (
      select p.name, l.dzien, l.poziom, l.sekundy, l.at, coalesce(p.immortal, false) or coalesce(p.infinite_resurrect, false) test
      from lamiglowki_rozwiazania l left join players p on p.id = l.player_id
      order by l.at desc limit 50) o), '[]'::jsonb));
end $$;

grant execute on function public.lamiglowka_rozwiazana(text, date, int, text, int) to anon, authenticated;
grant execute on function public.admin_lamiglowki(text) to anon, authenticated;
