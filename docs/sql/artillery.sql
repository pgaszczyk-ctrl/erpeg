-- TEST-only artillery, additive migration. NOT applied by frontend/deploy.
-- Inspect players and existing SECURITY DEFINER helpers before installation.
create table if not exists public.ma_networks(id text primary key,version int not null,enabled boolean not null default false,price int not null default 5 check(price between 0 and 100),payload jsonb not null);
create table if not exists public.ma_stops(id text primary key,network text references public.ma_networks(id),name text not null,at jsonb not null,enabled boolean not null default true,airport boolean not null default false,corrected boolean not null default false);
create table if not exists public.ma_edges(a text references public.ma_stops(id),b text references public.ma_stops(id),primary key(a,b),check(a<b));
create table if not exists public.ma_discoveries(player uuid references public.players(id),stop text references public.ma_stops(id),discovered timestamptz not null default now(),primary key(player,stop));
create table if not exists public.ma_trips(player uuid references public.players(id),nonce uuid,origin text references public.ma_stops(id),destination text references public.ma_stops(id),state text not null check(state in('pending','done','cancelled')),price int not null,coins_after int not null,origin_at jsonb not null,destination_at jsonb not null,hero jsonb not null default '{}'::jsonb,created timestamptz not null default now(),primary key(player,nonce));
alter table public.ma_trips add column if not exists hero jsonb not null default '{}'::jsonb;
create unique index if not exists ma_one_pending on public.ma_trips(player) where state='pending';
alter table public.ma_networks enable row level security;
alter table public.ma_stops enable row level security;
alter table public.ma_edges enable row level security;
alter table public.ma_discoveries enable row level security;
alter table public.ma_trips enable row level security;
revoke all on public.ma_networks,public.ma_stops,public.ma_edges,public.ma_discoveries,public.ma_trips from public,anon,authenticated;

-- Compare geography across world-map origins. Local curated maps use the registry's projection metadata.
create or replace function public.ma_near(a jsonb,t jsonb,payload jsonb) returns boolean language plpgsql immutable set search_path='public' as $$
declare o jsonb; parts text[]; lat float;lon float;lat0 float;sc float;dx float;dy float;
begin
 if a is null or t is null or jsonb_typeof(a->'x')<>'number' or jsonb_typeof(a->'y')<>'number' then return false;end if;
 sc=coalesce((a->>'s')::float,1.92);if sc<=0 then return false;end if;
 if t ? 'lat' and t ? 'lon' then
  parts=regexp_match(a->>'m','^w:([-0-9.]+),([-0-9.]+)$');
  if parts is not null then o=jsonb_build_object('lat',parts[1]::float,'lon',parts[2]::float,'lat0',parts[1]::float);else o=payload->'mapOrigins'->(a->>'m');end if;
  if o is null then return false;end if;
  lat0=(o->>'lat0')::float*pi()/180;
  lat=(o->>'lat')::float-(a->>'y')::float/sc/(111132.954-559.822*cos(2*lat0));
  lon=(o->>'lon')::float+(a->>'x')::float/sc/(111412.84*cos(lat0));
  dx=(lon-(t->>'lon')::float)*111320*cos(lat*pi()/180);dy=(lat-(t->>'lat')::float)*111132;
 else
  if a->>'m' is distinct from t->>'m' then return false;end if;
  dx=(a->>'x')::float/sc-(t->>'x')::float/(t->>'s')::float;
  dy=(a->>'y')::float/sc-(t->>'y')::float/(t->>'s')::float;
 end if;
 return coalesce(dx*dx+dy*dy<=3600,false);
end $$;
revoke all on function public.ma_near(jsonb,jsonb,jsonb) from public,anon,authenticated;

create or replace function public.ma_state(p_token text,p_network text) returns jsonb language plpgsql security definer set search_path='public','extensions' as $$
declare v_id uuid; result jsonb;
begin
 select id into v_id from public._player_by_token(p_token);
 if v_id is null then raise exception 'Session expired';end if;
 select jsonb_build_object('enabled',enabled and (select name in ('Arceus','Jam') from players where id=v_id),'version',version,'price',price,
 'discovered',coalesce((select jsonb_agg(stop) from ma_discoveries where player=v_id),'[]'::jsonb),
 'pending',(select to_jsonb(t) from ma_trips t where player=v_id and state='pending')) into result from ma_networks where id=p_network;
 return coalesce(result,jsonb_build_object('enabled',false,'discovered','[]'::jsonb,'pending',(select to_jsonb(t) from ma_trips t where player=v_id and state='pending')));
end $$;

create or replace function public.ma_discover(p_token text,p_stop text) returns boolean language plpgsql security definer set search_path='public','extensions' as $$
declare v public.players;s public.ma_stops;a jsonb;
begin
 select p.* into v from players p join public._player_by_token(p_token) auth on auth.id=p.id for update of p;
 if v.id is null or v.dead then raise exception 'Session expired';end if;
 if v.name not in ('Arceus','Jam') then raise exception 'Artillery is available on TEST only';end if;
 select * into s from ma_stops where id=p_stop and enabled;
 if s.id is null then raise exception 'Stop unavailable';end if;
 a=v.save->'tu';
 if not public.ma_near(a,s.at,(select payload from ma_networks where id=s.network)) then raise exception 'Come closer';end if;
 insert into ma_discoveries(player,stop) values(v.id,s.id) on conflict do nothing;
 return true;
end $$;

create or replace function public.ma_begin(p_token text,p_nonce uuid,p_from text,p_to text) returns jsonb language plpgsql security definer set search_path='public','extensions' as $$
declare v public.players;t public.ma_trips;f public.ma_stops;dest public.ma_stops;n public.ma_networks;coins int;a jsonb;
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
 if not exists(select 1 from ma_discoveries where player=v.id and stop=f.id) or not exists(select 1 from ma_discoveries where player=v.id and stop=dest.id) then raise exception 'Discover both stops first';end if;
 if exists(select 1 from jsonb_array_elements(coalesce(v.snapshot->'enemies','[]'::jsonb)) e where coalesce((e->>'hp')::float,0)>0 and sqrt(power((e->>'x')::float-(v.snapshot->>'x')::float,2)+power((e->>'y')::float-(v.snapshot->>'y')::float,2))<120) then raise exception 'Finish combat first';end if;
 a=v.save->'tu';
 if not public.ma_near(a,f.at,n.payload) then raise exception 'Come closer';end if;
 coins=coalesce((v.save->>'coins')::int,0);
 if coins<n.price then raise exception 'Not enough coins';end if;
 insert into ma_trips(player,nonce,origin,destination,state,price,coins_after,origin_at,destination_at,hero) values(v.id,p_nonce,f.id,dest.id,'pending',n.price,coins-n.price,a,dest.at,coalesce(v.save->'artilleryHero','{}'::jsonb)) returning * into t;
 update players set save=jsonb_set(jsonb_set(save,'{coins}',to_jsonb(coins-n.price)),'{tu}',dest.at),snapshot=null where id=v.id;
 return to_jsonb(t);
end $$;

-- Late departure saves/heartbeats cannot overwrite an in-progress arrival or wallet.
create or replace function public.ma_pending_guard() returns trigger language plpgsql security definer set search_path='public' as $$
declare t public.ma_trips;
begin
 select * into t from ma_trips where player=new.id and state='pending';
 if found then new.save=jsonb_set(jsonb_set(coalesce(new.save,'{}'::jsonb),'{tu}',t.destination_at),'{coins}',to_jsonb(t.coins_after));new.snapshot=null;if t.hero<>'{}'::jsonb then new.save=jsonb_set(new.save,'{artilleryHero}',t.hero);end if;end if;
 return new;
end $$;
do $install$ begin
 if not exists(select 1 from pg_trigger where tgrelid='public.players'::regclass and tgname='ma_pending_guard') then
  create trigger ma_pending_guard before update on public.players for each row when (new.name in ('Arceus','Jam')) execute function public.ma_pending_guard();
 end if;
end $install$;

create or replace function public.ma_settle(p_token text,p_nonce uuid,p_cancel boolean default false) returns jsonb language plpgsql security definer set search_path='public','extensions' as $$
declare v public.players;t public.ma_trips;
begin
 select p.* into v from players p join public._player_by_token(p_token) auth on auth.id=p.id for update of p;
 if v.id is null then raise exception 'Session expired';end if;
 if v.name not in ('Arceus','Jam') then raise exception 'Artillery is available on TEST only';end if;
 select * into t from ma_trips where player=v.id and nonce=p_nonce for update;
 if not found then raise exception 'Unknown trip';end if;
 if t.state<>'pending' then return to_jsonb(t);end if;
 update ma_trips set state=case when p_cancel then 'cancelled' else 'done' end where player=v.id and nonce=p_nonce returning * into t;
 update players set save=jsonb_set(jsonb_set(save,'{tu}',case when p_cancel then t.origin_at else t.destination_at end),'{coins}',to_jsonb(t.coins_after+case when p_cancel then t.price else 0 end))-'artilleryHero',snapshot=null where id=v.id;
 return to_jsonb(t);
end $$;
revoke all on function public.ma_pending_guard() from public,anon,authenticated;
revoke all on function public.ma_state(text,text),public.ma_discover(text,text),public.ma_begin(text,uuid,text,text),public.ma_settle(text,uuid,boolean) from public;
grant execute on function public.ma_state(text,text),public.ma_discover(text,text),public.ma_begin(text,uuid,text,text),public.ma_settle(text,uuid,boolean) to anon,authenticated;
-- Registry remains disabled until diagnostic geometry and database tests pass.

create index if not exists ma_stops_network_idx on public.ma_stops(network);
create index if not exists ma_edges_b_idx on public.ma_edges(b);
create index if not exists ma_discoveries_stop_idx on public.ma_discoveries(stop);
create index if not exists ma_trips_origin_idx on public.ma_trips(origin);
create index if not exists ma_trips_destination_idx on public.ma_trips(destination);
