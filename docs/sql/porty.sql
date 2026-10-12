-- Porty (owner, 12 Oct 2026): a player asks a harbour master for a destination that has no line yet
-- („🧭 Inne miejsce…”); we check it and add a real line (port_lines), which every captain then knows.
-- Player text is untrusted (ideas only, like bug_reports). RLS on, no policies: only RPCs.
create table if not exists public.port_requests (
  id bigserial primary key,
  at timestamptz not null default now(),
  player text,
  port text,
  lat double precision,
  lon double precision,
  text text not null,
  status text not null default 'nowe' check (status in ('nowe', 'dodana', 'odrzucona')),
  odpowiedz text
);
alter table public.port_requests enable row level security;

create table if not exists public.port_lines (
  id bigserial primary key,
  at timestamptz not null default now(),
  a_nazwa text not null, a_lat double precision not null, a_lon double precision not null,
  b_nazwa text not null, b_lat double precision not null, b_lon double precision not null,
  km integer not null check (km > 0),
  nazwa text,
  aktywna boolean not null default true,
  -- true = only the test server knows it (for now every line is tested there first).
  test boolean not null default true,
  prosba bigint references public.port_requests(id)
);
alter table public.port_lines enable row level security;

-- The game: a player's request at a port (3 a day per character, 100 an hour from everyone).
create or replace function public.port_request(p_player text, p_port text, p_lat double precision, p_lon double precision, p_text text)
returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  if coalesce(length(trim(p_text)), 0) < 2 then return false; end if;
  if (select count(*) from port_requests where at > now() - interval '1 day' and player = left(p_player, 40)) >= 3 then return false; end if;
  if (select count(*) from port_requests where at > now() - interval '1 hour') >= 100 then return false; end if;
  insert into port_requests (player, port, lat, lon, text)
  values (left(p_player, 40), left(p_port, 80), p_lat, p_lon, left(trim(p_text), 120));
  return true;
end $$;

-- The game: this character's requests of the last 60 days with their answers (the captain tells them).
create or replace function public.port_answers(p_player text)
returns jsonb language sql security definer set search_path to 'public' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'at', at, 'port', port, 'lat', lat, 'lon', lon, 'text', text, 'status', status, 'odpowiedz', odpowiedz) order by id), '[]'::jsonb)
  from port_requests where player = left(p_player, 40) and at > now() - interval '60 days';
$$;

-- The game: lines added by hand (test lines only for the test server).
create or replace function public.game_ports(p_test boolean default false)
returns jsonb language sql security definer set search_path to 'public' as $$
  select coalesce(jsonb_agg(jsonb_build_array(a_nazwa, a_lat, a_lon, b_nazwa, b_lat, b_lon, km, nazwa) order by id), '[]'::jsonb)
  from port_lines where aktywna and (p_test or not test);
$$;

create or replace function public.admin_port_requests(p_key text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if not public._admin_ok(p_key) then raise exception 'Złe hasło admina'; end if;
  return jsonb_build_object(
    'prosby', coalesce((select jsonb_agg(to_jsonb(r) order by r.id desc) from (select * from port_requests order by id desc limit 300) r), '[]'::jsonb),
    'linie', coalesce((select jsonb_agg(to_jsonb(l) order by l.id desc) from (select * from port_lines order by id desc limit 300) l), '[]'::jsonb));
end $$;

create or replace function public.admin_port_request(p_key text, p_id bigint, p_status text, p_odpowiedz text)
returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  if not public._admin_ok(p_key) then raise exception 'Złe hasło admina'; end if;
  update port_requests set status = p_status, odpowiedz = nullif(trim(coalesce(p_odpowiedz, '')), '') where id = p_id;
  return found;
end $$;

-- Adds (id null) or changes a line; {a_nazwa, a_lat, a_lon, b_nazwa, b_lat, b_lon, km, nazwa, aktywna, test, prosba}.
create or replace function public.admin_port_line(p_key text, p_id bigint, p_line jsonb)
returns bigint language plpgsql security definer set search_path to 'public' as $$
declare v_id bigint;
begin
  if not public._admin_ok(p_key) then raise exception 'Złe hasło admina'; end if;
  if p_id is null then
    insert into port_lines (a_nazwa, a_lat, a_lon, b_nazwa, b_lat, b_lon, km, nazwa, aktywna, test, prosba)
    values (p_line->>'a_nazwa', (p_line->>'a_lat')::float8, (p_line->>'a_lon')::float8, p_line->>'b_nazwa', (p_line->>'b_lat')::float8, (p_line->>'b_lon')::float8,
      (p_line->>'km')::int, nullif(p_line->>'nazwa', ''), coalesce((p_line->>'aktywna')::boolean, true), coalesce((p_line->>'test')::boolean, true), (p_line->>'prosba')::bigint)
    returning id into v_id;
    if (p_line->>'prosba') is not null then update port_requests set status = 'dodana' where id = (p_line->>'prosba')::bigint; end if;
    return v_id;
  end if;
  update port_lines set
    a_nazwa = coalesce(p_line->>'a_nazwa', a_nazwa), a_lat = coalesce((p_line->>'a_lat')::float8, a_lat), a_lon = coalesce((p_line->>'a_lon')::float8, a_lon),
    b_nazwa = coalesce(p_line->>'b_nazwa', b_nazwa), b_lat = coalesce((p_line->>'b_lat')::float8, b_lat), b_lon = coalesce((p_line->>'b_lon')::float8, b_lon),
    km = coalesce((p_line->>'km')::int, km), nazwa = coalesce(p_line->>'nazwa', nazwa),
    aktywna = coalesce((p_line->>'aktywna')::boolean, aktywna), test = coalesce((p_line->>'test')::boolean, test)
  where id = p_id;
  return p_id;
end $$;

grant execute on function public.port_request(text, text, double precision, double precision, text) to anon, authenticated;
grant execute on function public.port_answers(text) to anon, authenticated;
grant execute on function public.game_ports(boolean) to anon, authenticated;
grant execute on function public.admin_port_requests(text) to anon, authenticated;
grant execute on function public.admin_port_request(text, bigint, text, text) to anon, authenticated;
grant execute on function public.admin_port_line(text, bigint, jsonb) to anon, authenticated;
