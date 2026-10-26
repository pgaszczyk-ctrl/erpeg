-- Śmierć nie jest ostateczna (właściciel, 26 Oct 2026): postać, która zginęła jeszcze w starej grze
-- (players.dead = true), wraca za darmo. Kara jak w grze: znika złoto z plecaka (save.coins = 0) i połowa
-- postępu bieżącego poziomu (EXP progu 50·(N−1)·N + połowa reszty). Stary `resurrect` zostaje dla starszych klientów.
create or replace function public.szpital_powrot(p_name text, p_idik text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare
  v public.players;
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_save jsonb;
  v_lvl int := 1;
  v_exp int;
begin
  select * into v from public.players where idik = upper(replace(btrim(p_idik), ' ', '')) and lower(name) = lower(btrim(p_name));
  if not found then return jsonb_build_object('error', 'Nie ma takiej postaci (sprawdź imię i kod)'); end if;
  if v.pass_hash is not null then return jsonb_build_object('error', 'Najpierw wczytaj postać, żeby dostać nowy kod.'); end if;
  if not v.dead then return jsonb_build_object('error', 'Ta postać żyje.'); end if;
  v_exp := greatest(0, coalesce(v.exp, 0));
  while v_lvl < 20 and v_exp >= 50 * v_lvl * (v_lvl + 1) loop v_lvl := v_lvl + 1; end loop;
  v_exp := 50 * (v_lvl - 1) * v_lvl + (v_exp - 50 * (v_lvl - 1) * v_lvl) / 2;
  v_save := jsonb_set(jsonb_set(coalesce(v.save, '{}'::jsonb), '{coins}', '0'::jsonb), '{hp}', '6'::jsonb);
  if v_save ? 'exp' then v_save := jsonb_set(v_save, '{exp}', to_jsonb(v_exp)); end if;
  update public.players
     set dead = false, died_at = null, exp = v_exp, save = v_save,
         token_hash = encode(digest(v_token, 'sha256'), 'hex'), session_open = true, snapshot = null, last_seen = now()
   where id = v.id returning * into v;
  return jsonb_build_object('token', v_token, 'player', public._player_json(v), 'abandoned', null);
end $function$;
grant execute on function public.szpital_powrot(text, text) to anon, authenticated;
