-- Fog in the save (29 Oct 2026, bug report 74: entering a dungeon took ~6 s because Arceus's save was
-- 8 MB, 7 MB of it world-map fog). The game now sends only the maps whose fog changed, marked with
-- "fogsCzesc": true; save_game keeps the other maps' fog from the stored save. Older clients send the
-- whole save without the mark and it replaces the stored one as before.
create or replace function public.save_game(p_token text, p_save jsonb, p_exp integer)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare v_id uuid; v_save jsonb := p_save;
begin
  select id into v_id from public._player_by_token(p_token);
  if v_id is null then raise exception 'Sesja wygasła, zaloguj się ponownie'; end if;
  if coalesce((p_save->>'fogsCzesc')::boolean, false) then
    select (p_save - 'fogsCzesc')
           || jsonb_build_object('fogs', coalesce(p.save->'fogs', '{}'::jsonb) || coalesce(p_save->'fogs', '{}'::jsonb))
      into v_save
      from public.players p where p.id = v_id;
  end if;
  update public.players set save = v_save, exp = greatest(0, p_exp), last_seen = now() where id = v_id;
  return true;
end $function$;
