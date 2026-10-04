-- Pokrętła gry z panelu admina (src/content/ustawienia.ts) i wskrzeszenie za
-- diamenty (zamiast kamienia mocy), 4 X 2026.

create table if not exists public.game_settings (
  k text primary key check (k ~ '^[a-z0-9_]{1,40}$'),
  v numeric not null,
  updated_at timestamptz not null default now()
);
alter table public.game_settings enable row level security;

-- Dla gry: tylko zmienione wartości ({klucz: liczba}); reszta = domyślne z kodu.
create or replace function public.game_settings()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from public.game_settings
$$;

create or replace function public.admin_settings(p_key text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public._admin_ok(p_key) then return jsonb_build_object('error', 'Złe hasło admina.'); end if;
  return jsonb_build_object('values', public.game_settings(),
    'gold', (select jsonb_build_object(
        'alive', count(*) filter (where not dead),
        'coins', coalesce(sum(coalesce((save->>'coins')::numeric, 0)) filter (where not dead), 0),
        'chest', coalesce(sum(coalesce((save->'chest'->>'coins')::numeric, 0)) filter (where not dead), 0),
        'diamonds', coalesce(sum(coalesce((save->>'diamenty')::numeric, 0)) filter (where not dead), 0))
      from public.players));
end $$;

-- p_v null = przywróć domyślną (usuń zmianę).
create or replace function public.admin_set_setting(p_key text, p_k text, p_v numeric)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public._admin_ok(p_key) then return jsonb_build_object('error', 'Złe hasło admina.'); end if;
  if p_k !~ '^[a-z0-9_]{1,40}$' then return jsonb_build_object('error', 'Zła nazwa pokrętła.'); end if;
  if p_v is null then
    delete from public.game_settings where k = p_k;
  else
    insert into public.game_settings(k, v) values (p_k, p_v)
      on conflict (k) do update set v = excluded.v, updated_at = now();
  end if;
  insert into public.admin_log(what) values (left('pokretlo ' || p_k || ' = ' || coalesce(p_v::text, 'domyslnie'), 200));
  return jsonb_build_object('ok', true, 'values', public.game_settings());
end $$;

revoke all on function public.admin_settings(text), public.admin_set_setting(text, text, numeric) from public;
grant execute on function public.game_settings() to anon, authenticated;
grant execute on function public.admin_settings(text), public.admin_set_setting(text, text, numeric) to anon, authenticated;

-- Wskrzeszenie: pierwsze za darmo, każde kolejne za diamenty z zapisu
-- (pokrętło wskrzeszenie_diamenty, domyślnie 10; stare kamienie mocy liczą się
-- po tyle diamentów każdy).
create or replace function public.resurrect(p_name text, p_idik text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare
  v public.players;
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_cost int := coalesce((select gs.v from public.game_settings gs where gs.k = 'wskrzeszenie_diamenty')::int, 10);
  v_have int;
  v_save jsonb;
begin
  select * into v from public.players where idik = upper(replace(btrim(p_idik), ' ', '')) and lower(name) = lower(btrim(p_name));
  if not found then
    return jsonb_build_object('error', 'Nie ma takiej postaci (sprawdź imię i kod)');
  end if;
  if v.pass_hash is not null then return jsonb_build_object('error', 'Najpierw wczytaj postać, żeby dostać nowy kod.'); end if;
  if not v.dead then return jsonb_build_object('error', 'Ta postać żyje.'); end if;
  v_save := coalesce(v.save, '{}'::jsonb);
  if v.resurrections >= 1 and not v.infinite_resurrect then
    v_have := greatest(0, coalesce((v_save->>'diamenty')::int, 0)) + greatest(0, coalesce((v_save->>'kamienie')::int, 0)) * v_cost;
    if v_have < v_cost then
      return jsonb_build_object('error', format('Wskrzeszenie kosztuje %s 💎, a postać ma %s 💎.', v_cost, v_have), 'paid', true);
    end if;
    v_save := jsonb_set(v_save - 'kamienie', '{diamenty}', to_jsonb(v_have - v_cost));
  end if;
  update public.deaths set resurrected_at = now()
   where id = (select id from public.deaths where player_id = v.id order by died_at desc limit 1);
  update public.players
     set dead = false, died_at = null, resurrections = resurrections + 1,
         save = jsonb_set(v_save, '{hp}', '6'::jsonb),
         token_hash = encode(digest(v_token, 'sha256'), 'hex'), session_open = true, snapshot = null, last_seen = now()
   where id = v.id returning * into v;
  return jsonb_build_object('token', v_token, 'player', public._player_json(v), 'abandoned', null);
end $function$;
