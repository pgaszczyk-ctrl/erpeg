-- 2026-11-04: additive hardening; no player data is removed.
alter table public.players add column if not exists session_expires_at timestamptz
  not null default (now() + interval '7 days');

create or replace function public._session_deadline()
returns trigger language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    new.session_expires_at := now() + interval '7 days';
  elsif new.token_hash is distinct from old.token_hash then
    new.session_expires_at := now() + interval '7 days';
  end if;
  return new;
end $$;
revoke all on function public._session_deadline() from public, anon, authenticated;
do $$ begin
  if not exists (select 1 from pg_trigger where tgrelid='public.players'::regclass and tgname='session_deadline') then
    create trigger session_deadline before insert or update of token_hash on public.players
      for each row execute function public._session_deadline();
  end if;
end $$;

create or replace function public._player_by_token(p_token text)
returns public.players language sql stable security definer
set search_path = public, extensions as $$
  select * from public.players
  where token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and not dead and session_open and session_expires_at > now()
$$;
revoke all on function public._player_by_token(text) from public, anon, authenticated;

-- The old endpoint trusts only a name. Keep its response shape, but disclose
-- nothing. New clients use a character session; no request rows are deleted.
-- Historical unverified name-only rows are NOT assigned to guessed owners.
alter table public.port_requests add column if not exists player_id uuid references public.players(id);

create or replace function public.port_answers(p_player text)
returns jsonb language sql stable set search_path = '' as $$
  select '[]'::jsonb
$$;

create or replace function public.port_answers_secure(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'at', r.at, 'port', r.port, 'lat', r.lat, 'lon', r.lon,
    'text', r.text, 'status', r.status, 'odpowiedz', r.odpowiedz
  ) order by r.id), '[]'::jsonb)
  from public.port_requests r
  join public._player_by_token(p_token) p on r.player_id = p.id
  where r.at > now() - interval '60 days'
$$;
revoke all on function public.port_answers_secure(text) from public;
grant execute on function public.port_answers_secure(text) to anon, authenticated;

create or replace function public.port_request_secure(p_token text, p_port text,
  p_lat double precision, p_lon double precision, p_text text)
returns boolean language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  select * into p from public._player_by_token(p_token);
  if p.id is null or coalesce(length(trim(p_text)), 0) < 2 then return false; end if;
  if p_lat is null or p_lon is null or not(p_lat between -90 and 90 and p_lon between -180 and 180) then return false; end if;
  if (select count(*) from public.port_requests where player_id=p.id and at > now()-interval '1 day') >= 3 then return false; end if;
  if (select count(*) from public.port_requests where at > now()-interval '1 hour') >= 100 then return false; end if;
  insert into public.port_requests(player_id,player,port,lat,lon,text)
    values(p.id,p.name,left(p_port,80),p_lat,p_lon,left(trim(p_text),120));
  return true;
end $$;
revoke all on function public.port_request_secure(text,text,double precision,double precision,text) from public;
grant execute on function public.port_request_secure(text,text,double precision,double precision,text) to anon, authenticated;
