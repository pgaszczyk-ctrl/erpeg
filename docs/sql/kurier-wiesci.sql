-- „Kurier Parowy” – front page news written by the owner (owner, 11 Oct 2026): new quests,
-- special tasks, other news. Written in the admin panel (tab „📰 Gazeta”), in Polish and English.
-- `test` = shown only on the test server; `aktywna` false = hidden (we never delete rows).
-- `kraj` / `miasto` (optional) = only for players there; empty = everywhere.

create table if not exists public.kurier_wiesci (
  id bigserial primary key,
  at timestamptz not null default now(),
  rodzaj text not null default 'wiesc' check (rodzaj in ('zadanie', 'specjalne', 'wiesc')),
  tytul jsonb not null default '{}',
  tresc jsonb not null default '{}',
  miejsce text,
  od date not null default ((now() at time zone 'Europe/Warsaw')::date),
  "do" date,
  kraj text,
  miasto text,
  test boolean not null default false,
  aktywna boolean not null default true
);
alter table public.kurier_wiesci enable row level security;

-- The game: today's news for this place, newest first.
create or replace function public.kurier_wiesci(p_kraj text, p_miasto text, p_test boolean default false)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'rodzaj', rodzaj, 'tytul', tytul, 'tresc', tresc,
      'miejsce', miejsce, 'od', od) order by od desc, id desc), '[]')
  from (
    select * from kurier_wiesci
    where aktywna and (not test or p_test)
      and od <= (now() at time zone 'Europe/Warsaw')::date
      and ("do" is null or "do" >= (now() at time zone 'Europe/Warsaw')::date)
      and (kraj is null or kraj = upper(p_kraj)) and (miasto is null or miasto = p_miasto)
    order by od desc, id desc limit 12
  ) w
$$;
grant execute on function public.kurier_wiesci(text, text, boolean) to anon, authenticated;

create or replace function public.admin_kurier_wiesci(p_key text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if not public._admin_ok(p_key) then raise exception 'Złe hasło admina'; end if;
  return coalesce((select jsonb_agg(to_jsonb(w) order by w.id desc) from (select * from kurier_wiesci order by id desc limit 200) w), '[]');
end $$;
grant execute on function public.admin_kurier_wiesci(text) to anon, authenticated;

-- Save one piece of news: p_w = {id?, rodzaj, tytul {pl,en}, tresc {pl,en}, miejsce, od, do, kraj, miasto, test, aktywna}.
create or replace function public.admin_kurier_zapisz(p_key text, p_w jsonb)
returns bigint language plpgsql security definer set search_path to 'public' as $$
declare v_id bigint := nullif(p_w->>'id', '')::bigint;
begin
  if not public._admin_ok(p_key) then raise exception 'Złe hasło admina'; end if;
  if v_id is null then
    insert into kurier_wiesci (rodzaj, tytul, tresc, miejsce, od, "do", kraj, miasto, test, aktywna)
    values (coalesce(p_w->>'rodzaj', 'wiesc'), coalesce(p_w->'tytul', '{}'), coalesce(p_w->'tresc', '{}'), nullif(p_w->>'miejsce', ''),
      coalesce(nullif(p_w->>'od', '')::date, (now() at time zone 'Europe/Warsaw')::date), nullif(p_w->>'do', '')::date,
      nullif(upper(p_w->>'kraj'), ''), nullif(p_w->>'miasto', ''), coalesce((p_w->>'test')::boolean, false), coalesce((p_w->>'aktywna')::boolean, true))
    returning id into v_id;
  else
    update kurier_wiesci set rodzaj = coalesce(p_w->>'rodzaj', rodzaj), tytul = coalesce(p_w->'tytul', tytul), tresc = coalesce(p_w->'tresc', tresc),
      miejsce = nullif(p_w->>'miejsce', ''), od = coalesce(nullif(p_w->>'od', '')::date, od), "do" = nullif(p_w->>'do', '')::date,
      kraj = nullif(upper(p_w->>'kraj'), ''), miasto = nullif(p_w->>'miasto', ''),
      test = coalesce((p_w->>'test')::boolean, test), aktywna = coalesce((p_w->>'aktywna')::boolean, aktywna)
    where id = v_id;
  end if;
  return v_id;
end $$;
grant execute on function public.admin_kurier_zapisz(text, jsonb) to anon, authenticated;
