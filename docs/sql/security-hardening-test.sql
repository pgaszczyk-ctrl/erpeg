-- Run after security-hardening.sql; all synthetic rows are rolled back.
begin;
do $$
declare a uuid; b uuid; na text := 'audit-' || left(gen_random_uuid()::text,8);
  nb text := 'audit-' || left(gen_random_uuid()::text,8);
  ta text := gen_random_uuid()::text; tb text := gen_random_uuid()::text;
begin
  insert into public.players(name,idik,start_x,start_y,token_hash,session_open)
    values(na,public._new_code(),0,0,encode(extensions.digest(ta,'sha256'),'hex'),true) returning id into a;
  insert into public.players(name,idik,start_x,start_y,token_hash,session_open)
    values(nb,public._new_code(),0,0,encode(extensions.digest(tb,'sha256'),'hex'),true) returning id into b;
  insert into public.port_requests(player,text) values(na,'synthetic audit request');
  if (public._player_by_token(ta)).id is distinct from a then raise exception 'valid token denied'; end if;
  if jsonb_array_length(public.port_answers_secure(ta)) <> 1 then raise exception 'owner denied'; end if;
  if public.port_answers_secure(tb) <> '[]'::jsonb then raise exception 'other character disclosure'; end if;
  if public.port_answers(na) <> '[]'::jsonb then raise exception 'legacy disclosure'; end if;
  update public.players set session_expires_at=now()-interval '1 second' where id=a;
  if (public._player_by_token(ta)).id is not null then raise exception 'expired token accepted'; end if;
  if public.port_answers_secure(ta) <> '[]'::jsonb then raise exception 'expired port token accepted'; end if;
  ta := gen_random_uuid()::text;
  update public.players set token_hash=encode(extensions.digest(ta,'sha256'),'hex') where id=a;
  if (public._player_by_token(ta)).id is distinct from a then raise exception 'renewal failed'; end if;
  update public.players set session_open=false where id=a;
  if (public._player_by_token(ta)).id is not null then raise exception 'closed token accepted'; end if;
  update public.players set session_open=true where id=a;
  perform set_config('audit.token',ta,true);
  if has_function_privilege('anon','public._session_deadline()','execute') then raise exception 'internal helper exposed'; end if;
end $$;
set local role anon;
do $$
begin
  if jsonb_array_length(public.port_answers_secure(current_setting('audit.token')))<>1 then raise exception 'anon owner access failed'; end if;
  if public.port_answers_secure('invalid')<>'[]'::jsonb then raise exception 'invalid token disclosure'; end if;
end $$;
rollback;
select 'PASS: ownership, anon RPC, legacy privacy, expiry, closed sessions, rotation; synthetic data rolled back' result;
