-- Synthetic characters only. Run in a single transaction; all rows roll back.
begin;
do $$
declare a uuid; b uuid; ta text := gen_random_uuid()::text; tb text := gen_random_uuid()::text; r jsonb;
begin
 insert into public.players(name,idik,start_x,start_y,token_hash,session_open)
 values ('Idea test fixture',public._new_code(),0,0,encode(extensions.digest(ta,'sha256'),'hex'),true) returning id into a;
 insert into public.players(name,idik,start_x,start_y,token_hash,session_open)
 values ('Idea test fixture',public._new_code(),0,0,encode(extensions.digest(tb,'sha256'),'hex'),true) returning id into b;
 assert public.submit_player_idea(ta,'quest',' ')->>'blad'='text';
 assert public.submit_player_idea(ta,'other','Idea')->>'blad'='text';
 assert public.submit_player_idea(ta,'quest',repeat('a',2001))->>'blad'='text';
 for i in 1..3 loop
   r := public.submit_player_idea(ta,case when i=2 then 'rozwoj' else 'quest' end,'Regression idea');
   assert (r->>'ok')::boolean;
   assert (r->>'remaining')::int=3-i;
 end loop;
 assert public.submit_player_idea(ta,'quest','Fourth idea')->>'blad'='limit';
 r := public.submit_player_idea(tb,'quest','Separate character, same display name');
 assert (r->>'ok')::boolean and (r->>'remaining')::int=2;
 update public.player_ideas set day=day-1 where player_id=a;
 r := public.submit_player_idea(ta,'quest','Next day');
 assert (r->>'ok')::boolean and (r->>'remaining')::int=2;
 assert public.submit_player_idea('invalid','quest','No access')->>'blad'='session';
 assert not has_table_privilege('anon','public.player_ideas','select');
 assert not has_table_privilege('anon','public.player_ideas','insert');
 perform set_config('ideas.test_token',ta,true);
end $$;
set local role anon;
do $$
begin
 assert (public.submit_player_idea(current_setting('ideas.test_token'),'quest','RPC as game client')->>'ok')::boolean;
 assert public.submit_player_idea('invalid','quest','No access')->>'blad'='session';
end $$;
rollback;
select 'PASS: validation, both categories, daily quota, same-name isolation, next day, anon RPC, private table; fixtures rolled back' result;
