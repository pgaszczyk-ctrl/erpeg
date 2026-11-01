-- Owner, 1 Nov 2026: cannon flights don't need the destination to be discovered first,
-- and cost 13 coins per straight-line km (rounded, at least 1). Same formula as cenaLotu in src/artillery/network.ts.
create or replace function public.ma_price(a jsonb,b jsonb,per_km float default 13) returns int language sql immutable set search_path='public' as $$
 select greatest(1,floor(sqrt(power(((b->>'lon')::float-(a->>'lon')::float)*111320*cos(((a->>'lat')::float+(b->>'lat')::float)/2*pi()/180),2)
  +power(((b->>'lat')::float-(a->>'lat')::float)*111132,2))/1000*per_km+0.5))::int
$$;
revoke all on function public.ma_price(jsonb,jsonb,float) from public,anon,authenticated;

create or replace function public.ma_begin(p_token text,p_nonce uuid,p_from text,p_to text) returns jsonb language plpgsql security definer set search_path='public','extensions' as $$
declare v public.players;t public.ma_trips;f public.ma_stops;dest public.ma_stops;n public.ma_networks;coins int;a jsonb;cena int;
begin
 select p.* into v from players p join public._player_by_token(p_token) auth on auth.id=p.id for update of p;
 if v.id is null or v.dead then raise exception 'Session expired';end if;
 if v.name not in ('Arceus','Jam') then raise exception 'Artillery is available on TEST only';end if;
 select * into t from ma_trips where player=v.id and nonce=p_nonce;
 if found then
  if t.origin<>p_from or t.destination<>p_to then raise exception 'Nonce reused with different route';end if;
  return to_jsonb(t);
 end if;
 if exists(select 1 from ma_trips where player=v.id and state='pending') then raise exception 'Trip already pending';end if;
 select * into f from ma_stops where id=p_from and enabled;
 select * into dest from ma_stops where id=p_to and enabled;
 select * into n from ma_networks where id=f.network and enabled;
 if f.id is null or dest.id is null or n.id is null or f.network<>dest.network or not exists(select 1 from ma_edges e where e.a=least(f.id,dest.id) and e.b=greatest(f.id,dest.id)) then raise exception 'Route unavailable';end if;
 if exists(select 1 from jsonb_array_elements(coalesce(v.snapshot->'enemies','[]'::jsonb)) e where coalesce((e->>'hp')::float,0)>0 and sqrt(power((e->>'x')::float-(v.snapshot->>'x')::float,2)+power((e->>'y')::float-(v.snapshot->>'y')::float,2))<120) then raise exception 'Finish combat first';end if;
 a=v.save->'tu';
 if not public.ma_near(a,f.at,n.payload) then raise exception 'Come closer';end if;
 cena=public.ma_price(f.at,dest.at,coalesce((n.payload->'rules'->>'perKm')::float,13));
 coins=coalesce((v.save->>'coins')::int,0);
 if coins<cena then raise exception 'Not enough coins';end if;
 insert into ma_trips(player,nonce,origin,destination,state,price,coins_after,origin_at,destination_at,hero) values(v.id,p_nonce,f.id,dest.id,'pending',cena,coins-cena,a,dest.at,coalesce(v.save->'artilleryHero','{}'::jsonb)) returning * into t;
 update players set save=jsonb_set(jsonb_set(save,'{coins}',to_jsonb(coins-cena)),'{tu}',dest.at),snapshot=null where id=v.id;
 return to_jsonb(t);
end $$;
