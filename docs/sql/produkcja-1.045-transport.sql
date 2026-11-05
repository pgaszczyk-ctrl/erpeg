-- Full release 1.045, explicitly requested by the owner, 5 Nov 2026.
-- Preserve token, route, wallet and receipt validation. No player data is deleted.
CREATE OR REPLACE FUNCTION public.ma_stan(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_id uuid;v_name text;
begin
 select p.id,p.name into v_id,v_name from players p join public._player_by_token(p_token) auth on auth.id=p.id;
 if v_id is null then raise exception 'Session expired';end if;
 return jsonb_build_object('enabled',true,'zaKm',public.ma_za_km(),
  'pending',(select to_jsonb(t) from ma_trips t where player=v_id and state='pending'));
end $function$
;
CREATE OR REPLACE FUNCTION public.ma_lot(p_token text, p_nonce uuid, p_from text, p_to text, p_dest jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v public.players;t public.ma_trips;coins int;a jsonb;cena int;city int;kf int;kt int;f record;d record;h record;q record;dest jsonb;
begin
 select p.* into v from players p join public._player_by_token(p_token) auth on auth.id=p.id for update of p;
 if v.id is null or v.dead then raise exception 'Session expired';end if;
 select * into t from ma_trips where player=v.id and nonce=p_nonce;
 if found then
  if t.origin<>p_from or t.destination<>p_to then raise exception 'Nonce reused with different route';end if;
  return to_jsonb(t);
 end if;
 if exists(select 1 from ma_trips where player=v.id and state='pending') then raise exception 'Trip already pending';end if;
 if p_from !~ '^c[0-9]+:[0-9]+$' or p_to !~ '^c[0-9]+:[0-9]+$' or split_part(p_from,':',1)<>split_part(p_to,':',1) then raise exception 'Route unavailable';end if;
 city=substr(split_part(p_from,':',1),2)::int;kf=split_part(p_from,':',2)::int;kt=split_part(p_to,':',2)::int;
 if not exists(select 1 from ma_krawedzie(city) e where e.a=least(kf,kt) and e.b=greatest(kf,kt)) then raise exception 'Route unavailable';end if;
 select * into f from ma_siec(city) s where s.k=kf;
 select * into d from ma_siec(city) s where s.k=kt;
 if exists(select 1 from jsonb_array_elements(coalesce(v.snapshot->'enemies','[]'::jsonb)) e where coalesce((e->>'hp')::float,0)>0 and sqrt(power((e->>'x')::float-(v.snapshot->>'x')::float,2)+power((e->>'y')::float-(v.snapshot->>'y')::float,2))<120) then raise exception 'Finish combat first';end if;
 a=v.save->'tu';
 select * into h from ma_ll(a);
 if h.lat is null or ma_m(h.lat,h.lon,f.lat,f.lon)>1590 then raise exception 'Come closer';end if;
 select * into q from ma_ll(p_dest);
 if q.lat is null or ma_m(q.lat,q.lon,d.lat,d.lon)>1530 then raise exception 'Destination is unsafe';end if;
 dest=jsonb_build_object('m',p_dest->>'m','x',(p_dest->>'x')::float8,'y',(p_dest->>'y')::float8,'s',coalesce((p_dest->>'s')::float8,1.92));
 cena=greatest(1,floor(ma_m(f.lat,f.lon,d.lat,d.lon)/1000*public.ma_za_km()+0.5)::int);
 coins=coalesce((v.save->>'coins')::int,0);
 if coins<cena then raise exception 'Not enough coins';end if;
 insert into ma_trips(player,nonce,origin,destination,state,price,coins_after,origin_at,destination_at,hero) values(v.id,p_nonce,p_from,p_to,'pending',cena,coins-cena,a,dest,coalesce(v.save->'artilleryHero','{}'::jsonb)) returning * into t;
 update players set save=jsonb_set(jsonb_set(save,'{coins}',to_jsonb(coins-cena)),'{tu}',dest),snapshot=null where id=v.id;
 return to_jsonb(t);
end $function$
;
CREATE OR REPLACE FUNCTION public.ma_settle(p_token text, p_nonce uuid, p_cancel boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v public.players;t public.ma_trips;
begin
 select p.* into v from players p join public._player_by_token(p_token) auth on auth.id=p.id for update of p;
 if v.id is null then raise exception 'Session expired';end if;
 select * into t from ma_trips where player=v.id and nonce=p_nonce for update;
 if not found then raise exception 'Unknown trip';end if;
 if t.state<>'pending' then return to_jsonb(t);end if;
 update ma_trips set state=case when p_cancel then 'cancelled' else 'done' end where player=v.id and nonce=p_nonce returning * into t;
 update players set save=jsonb_set(jsonb_set(save,'{tu}',case when p_cancel then t.origin_at else t.destination_at end),'{coins}',to_jsonb(t.coins_after+case when p_cancel then t.price else 0 end))-'artilleryHero',snapshot=null where id=v.id;
 return to_jsonb(t);
end $function$
;
-- Protect pending arrivals for every character, including late saves/heartbeats.
CREATE OR REPLACE TRIGGER ma_pending_guard BEFORE UPDATE ON public.players
FOR EACH ROW EXECUTE FUNCTION public.ma_pending_guard();

