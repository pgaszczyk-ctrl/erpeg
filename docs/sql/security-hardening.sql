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
  join public._player_by_token(p_token) p on r.player = p.name
  where r.at > now() - interval '60 days'
$$;
revoke all on function public.port_answers_secure(text) from public;
grant execute on function public.port_answers_secure(text) to anon, authenticated;

