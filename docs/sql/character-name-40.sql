-- Full character names can include a title from the creator.
ALTER TABLE public.players
  DROP CONSTRAINT players_name_check,
  ADD CONSTRAINT players_name_check CHECK (char_length(name) BETWEEN 2 AND 40);

CREATE OR REPLACE FUNCTION public.create_character(p_name text, p_start_place text, p_start_x real, p_start_y real, p_scale real DEFAULT 4, p_age integer DEFAULT 7, p_look jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_player public.players;
begin
  p_name := btrim(p_name);
  if char_length(p_name) < 2 or char_length(p_name) > 40 then raise exception 'Imię musi mieć od 2 do 40 znaków'; end if;
  if p_scale is null or p_scale <= 0 or p_scale > 100 then raise exception 'Zła skala mapy'; end if;
  insert into public.players (name, idik, pass_hash, start_place, start_x, start_y, map_scale, token_hash, session_open, last_seen, age, save)
  values (p_name, public._new_code(), null, nullif(btrim(p_start_place), ''), p_start_x, p_start_y, p_scale,
          encode(digest(v_token, 'sha256'), 'hex'), true, now(), least(greatest(coalesce(p_age, 7), 3), 99),
          case when jsonb_typeof(p_look) = 'object' and length(p_look::text) < 400 then jsonb_build_object('look', p_look) else '{}'::jsonb end)
  returning * into v_player;
  return jsonb_build_object('token', v_token, 'player', public._player_json(v_player));
end $function$
;
