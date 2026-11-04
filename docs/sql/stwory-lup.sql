-- Łup i EXP stworków ustawiane w panelu admina (właściciel, 26.10.2026; zakładka „🐺 Stworki”).
-- Jeden wiersz na rodzaj stworka (id jak w grze: wilk, warg, glut, koziol…). exp null = domyślne z gry.
-- lup = [{co, ile, szansa}] – każdy wiersz losowany osobno (szansa w %, np. 0.05). Gra stosuje to w trybie
-- „nowej walki” (serwer testowy, walka/live.ts).
create table if not exists public.stwory_lup (
  rodzaj text primary key,
  exp int,
  lup jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.stwory_lup enable row level security;

create or replace function public.game_stwory()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(rodzaj, jsonb_build_object('exp', exp, 'lup', lup)), '{}'::jsonb) from public.stwory_lup
$$;

create or replace function public.admin_stwory(p_key text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public._admin_ok(p_key) then return jsonb_build_object('error', 'Złe hasło admina.'); end if;
  return jsonb_build_object('stwory', public.game_stwory());
end $$;

create or replace function public.admin_stwory_zapisz(p_key text, p_rodzaj text, p_exp int, p_lup jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r jsonb;
begin
  if not public._admin_ok(p_key) then return jsonb_build_object('error', 'Złe hasło admina.'); end if;
  if p_rodzaj !~ '^[a-z0-9_]{1,40}$' then return jsonb_build_object('error', 'Zła nazwa stworka.'); end if;
  if p_exp is not null and (p_exp < 0 or p_exp > 100000) then return jsonb_build_object('error', 'EXP od 0 do 100000.'); end if;
  if jsonb_typeof(coalesce(p_lup, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_lup, '[]'::jsonb)) > 20 then
    return jsonb_build_object('error', 'Najwyżej 20 wierszy łupu.');
  end if;
  for r in select * from jsonb_array_elements(coalesce(p_lup, '[]'::jsonb)) loop
    if coalesce(r->>'co', '') !~ '^[a-z0-9_]{1,40}$'
       or coalesce((r->>'ile')::numeric, 0) < 1 or (r->>'ile')::numeric > 100000
       or coalesce((r->>'szansa')::numeric, -1) < 0 or (r->>'szansa')::numeric > 100 then
      return jsonb_build_object('error', 'Zły wiersz łupu: ' || r::text);
    end if;
  end loop;
  insert into public.stwory_lup(rodzaj, exp, lup) values (p_rodzaj, p_exp, coalesce(p_lup, '[]'::jsonb))
    on conflict (rodzaj) do update set exp = excluded.exp, lup = excluded.lup, updated_at = now();
  insert into public.admin_log(what) values (left('stworek ' || p_rodzaj || ' exp=' || coalesce(p_exp::text, 'dom') || ' lup=' || coalesce(p_lup::text, '[]'), 200));
  return jsonb_build_object('ok', true, 'stwory', public.game_stwory());
end $$;

revoke all on function public.admin_stwory(text), public.admin_stwory_zapisz(text, text, int, jsonb) from public;
grant execute on function public.game_stwory() to anon, authenticated;
grant execute on function public.admin_stwory(text), public.admin_stwory_zapisz(text, text, int, jsonb) to anon, authenticated;
