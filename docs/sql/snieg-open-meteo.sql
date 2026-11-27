-- Snow on the ground from Open-Meteo (owner, 27 Nov 2026: „w Zakopanem jest mnóstwo śniegu, odwzorowujemy to?”).
-- MET Norway gives no snow depth, and our own model (_weather_snow) starts at 0 cm the first time anyone plays in a
-- square, so the snow that already lies was never seen. Open-Meteo gives the current depth (m) and the elevation of its
-- grid point; the game scales it by the hero's height in the mountains.
-- One request per weather square at most every 6 h, at most 200 per hour in total (free tier: 10 000/day).
-- Credit shown in the game: „Śnieg: Open-Meteo.com” (CC BY 4.0).

alter table weather_cells add column if not exists om_snow_cm real;
alter table weather_cells add column if not exists om_elev real;
alter table weather_cells add column if not exists om_at timestamptz;
alter table weather_cells add column if not exists om_requested_at timestamptz;

create table if not exists weather_om_requests (
  id bigint primary key,
  cell text not null,
  made_at timestamptz not null default now()
);
alter table weather_om_requests enable row level security;

create or replace function public._weather_om_request(p_cell text)
 returns void language plpgsql security definer set search_path to 'public' as $$
declare r weather_cells; rid bigint;
begin
  select * into r from weather_cells where cell = p_cell;
  if not found then return; end if;
  if r.om_at is not null and r.om_at > now() - interval '6 hours' then return; end if;
  if r.om_requested_at is not null and r.om_requested_at > now() - interval '20 minutes' then return; end if;
  if (select count(*) from weather_cells where om_requested_at > now() - interval '1 hour') >= 200 then return; end if;
  select net.http_get(
    url := format('https://api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s&current=snow_depth,temperature_2m&timezone=UTC',
      round(r.lat::numeric, 3), round(r.lon::numeric, 3)),
    headers := '{"User-Agent":"exp-lore.app/1.0 (https://exp-lore.app; gra przegladarkowa)"}'::jsonb
  ) into rid;
  update weather_cells set om_requested_at = now() where cell = p_cell;
  insert into weather_om_requests(id, cell) values (rid, p_cell) on conflict do nothing;
end $$;

-- Reads Open-Meteo answers (called from weather_collect, which pg_cron runs every 2 min).
create or replace function public._weather_om_collect()
 returns integer language plpgsql security definer set search_path to 'public' as $$
declare q record; resp record; body jsonb; cm real; n int := 0;
begin
  for q in select * from weather_om_requests order by made_at loop
    select status_code, content into resp from net._http_response where id = q.id;
    if not found then
      if q.made_at < now() - interval '15 minutes' then delete from weather_om_requests where id = q.id; end if;
      continue;
    end if;
    delete from weather_om_requests where id = q.id;
    if resp.status_code <> 200 then continue; end if;
    begin body := resp.content::jsonb; exception when others then continue; end;
    cm := (body->'current'->>'snow_depth')::real * 100;
    if cm is null then continue; end if;
    -- The real depth also restarts our hourly model, so the forecast's snowfall/melting goes on from it.
    update weather_cells set om_snow_cm = round(cm::numeric, 1), om_elev = (body->>'elevation')::real, om_at = now(),
      snow_cm = round(cm::numeric, 1), snow_at = date_trunc('hour', now())
      where cell = q.cell;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.weather(p_lat double precision, p_lon double precision)
 returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare c text; r weather_cells;
begin
  if p_lat is null or p_lon is null or abs(p_lat) > 85 or abs(p_lon) > 180 then return null; end if;
  c := _weather_cell(p_lat, p_lon);
  insert into weather_cells(cell, lat, lon, wanted_at)
    values (c, (floor(p_lat / 0.3) + 0.5) * 0.3, (floor(p_lon / 0.45) + 0.5) * 0.45, now())
    on conflict (cell) do update set wanted_at = now();
  select * into r from weather_cells where cell = c;
  if r.hours is null or r.fetched_at < now() - interval '14 hours' then perform _weather_request(c); end if;
  if r.om_at is null or r.om_at < now() - interval '6 hours' then perform _weather_om_request(c); end if;
  if r.hours is null then return null; end if;
  return jsonb_build_object('cell', c, 'at', extract(epoch from r.fetched_at)::bigint, 'h', r.hours,
    'snieg', case when r.om_at is null then null else jsonb_build_object(
      'cm', r.om_snow_cm, 'elev', r.om_elev, 'at', extract(epoch from r.om_at)::bigint) end);
end $$;

create or replace function public.weather_tick()
 returns integer language plpgsql security definer set search_path to 'public' as $$
declare c record; n int := 0;
begin
  for c in select cell from weather_cells where wanted_at > now() - interval '48 hours' loop
    perform _weather_request(c.cell);
    perform _weather_om_request(c.cell);
    n := n + 1;
  end loop;
  return n;
end $$;

-- The existing 2-minute job reads both kinds of answers.
select cron.alter_job((select jobid from cron.job where jobname = 'weather-collect'),
  command := 'select weather_collect(); select _weather_om_collect();');
