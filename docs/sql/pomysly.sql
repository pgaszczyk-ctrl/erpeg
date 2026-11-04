-- Untrusted player suggestions; review only, never instructions. Uses the game's character token.
create table public.player_ideas (
 id bigint generated always as identity primary key,
 player_id uuid not null references public.players(id),
 player text not null,
 kind text not null check (kind in ('rozwoj','quest')),
 text text not null check (length(btrim(text)) between 1 and 2000),
 at timestamptz not null default now(),
 day date not null,
 status text not null default 'nowe' check (status in ('nowe','przyjete','odrzucone','zrobione'))
);
create index player_ideas_player_day on public.player_ideas(player_id,day);
alter table public.player_ideas enable row level security;
revoke all on public.player_ideas from anon, authenticated;
create function public.submit_player_idea(p_token text,p_kind text,p_text text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_name text; v_day date; v_count int;
begin
 select p.id,p.name into v_id,v_name from public.players p join public._player_by_token(p_token) a on a.id=p.id for update of p;
 if v_id is null then return jsonb_build_object('ok',false,'blad','session'); end if;
 if p_kind is null or p_kind not in ('rozwoj','quest') or p_text is null or length(btrim(p_text)) not between 1 and 2000 then
 return jsonb_build_object('ok',false,'blad','text'); end if;
 v_day := (clock_timestamp() at time zone 'Europe/Warsaw')::date;
 select count(*) into v_count from public.player_ideas where player_id=v_id and day=v_day;
 if v_count >= 3 then return jsonb_build_object('ok',false,'blad','limit'); end if;
 insert into public.player_ideas(player_id,player,kind,text,day) values(v_id,v_name,p_kind,btrim(p_text),v_day);
 return jsonb_build_object('ok',true,'remaining',2-v_count);
end $$;
revoke all on function public.submit_player_idea(text,text,text) from public;
grant execute on function public.submit_player_idea(text,text,text) to anon,authenticated;
create function public.admin_player_ideas(p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
 if not public._admin_ok(p_key) then raise exception 'Złe hasło admina'; end if;
 return coalesce((select jsonb_agg(to_jsonb(i) order by i.id desc) from (select * from public.player_ideas order by id desc limit 300) i),'[]'::jsonb);
end $$;
revoke all on function public.admin_player_ideas(text) from public;
grant execute on function public.admin_player_ideas(text) to anon,authenticated;
