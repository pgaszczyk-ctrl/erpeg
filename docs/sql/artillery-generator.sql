-- Generated municipal artillery for the whole world (owner, 1 Nov 2026). Server twin of src/artillery/generator.ts:
-- the same recipe gives the same stations and links, so a flight is checked without any per-city registry.
-- Keep it in step with generator.ts (scripts/tests/artillery-generator.mjs compares both in PGlite).
-- World list: docs/sql/artillery-swiat-dane.sql (scripts/artillery/swiat.py).
create table if not exists public.ma_miasta(id int primary key,name text not null,cc text not null,lat float8 not null,lon float8 not null,pop int not null);
create table if not exists public.ma_lotniska(id text primary key,name text not null,lat float8 not null,lon float8 not null);
create index if not exists ma_lotniska_lat on public.ma_lotniska(lat);
-- Bitmask of generated stations (0..n-1) that fall on sea/big lakes and are left out (scripts/artillery/woda.mjs).
alter table public.ma_miasta add column if not exists woda bigint not null default 0;
alter table public.ma_miasta enable row level security;
alter table public.ma_lotniska enable row level security;
revoke all on public.ma_miasta,public.ma_lotniska from public,anon,authenticated;
-- Generated stations are not rows of ma_stops: trips keep their own text ids (c<city>:<k>).
alter table public.ma_trips drop constraint if exists ma_trips_origin_fkey;
alter table public.ma_trips drop constraint if exists ma_trips_destination_fkey;

create or replace function public.ma_u(id float8,k float8) returns float8 language sql immutable as $$ select (id*0.61803398875+k*0.7548776662)-floor(id*0.61803398875+k*0.7548776662) $$;
create or replace function public.ma_m(lat1 float8,lon1 float8,lat2 float8,lon2 float8) returns float8 language sql immutable as $$
 select sqrt(power((lon2-lon1)*111320*cos((lat1+lat2)/2*pi()/180),2)+power((lat2-lat1)*111132,2)) $$;

-- Stations of one city: k, lat, lon, kind (centrum/dzielnica/rogatka/lotnisko).
create or replace function public.ma_siec(p_city int) returns table(k int,lat float8,lon float8,rodzaj text) language plpgsql stable set search_path='public' as $$
declare m public.ma_miasta;rad float8;n int;mIn int;mOut int;a0 float8;a1 float8;a2 float8;a float8;r float8;j int;c float8;i int:=0;idx int:=0;
 la float8[]:='{}';lo float8[]:='{}';ro text[]:='{}';l record;pla float8;plo float8;
begin
 select * into m from ma_miasta where id=p_city;
 if m.id is null then return;end if;
 rad=9.5*sqrt(m.pop::float8);
 n=least(20,greatest(5,floor(5+2.4*(ln(m.pop::float8/100000)/ln(2))+0.5)::int));
 c=cos(m.lat*pi()/180);
 mIn=floor((n-2)/3.0)::int;mOut=n-2-mIn;
 a0=2*pi()*ma_u(m.id,1);a1=2*pi()*ma_u(m.id,2);a2=2*pi()*ma_u(m.id,3);
 for idx in 0..n-1 loop
  if idx<2 then a=a0+pi()*idx;r=0.08*rad;rodzaj='centrum';
  elsif idx<2+mIn then j=idx-2;a=a1+2*pi()*j/mIn;r=0.55*rad;rodzaj='dzielnica';
  else j=idx-2-mIn;a=a2+2*pi()*j/mOut+(ma_u(m.id,10+j)-0.5)*0.35*(2*pi()/mOut);r=1.5*rad*(1+(ma_u(m.id,40+j)-0.5)*0.12);rodzaj='rogatka';
  end if;
  if (m.woda>>idx)&1=0 then la=la||(m.lat+r*cos(a)/111132);lo=lo||(m.lon+r*sin(a)/(111320*c));ro=ro||rodzaj;end if;
 end loop;
 for l in select x.lat,x.lon from (select t.lat,t.lon,t.id,ma_m(m.lat,m.lon,t.lat,t.lon) d from ma_lotniska t where t.lat between m.lat-1 and m.lat+1) x
   where x.d<=greatest(25000,1.8*rad) and x.d>=0.3*rad order by x.d,x.id collate "C" limit 2 loop
  la=la||l.lat;lo=lo||l.lon;ro=ro||'lotnisko'::text;
 end loop;
 if array_length(la,1) is null then return;end if;
 for i in 1..array_length(la,1) loop k=i-1;lat=la[i];lon=lo[i];rodzaj=ro[i];return next;end loop;
end $$;

-- Links of one city (a < b).
create or replace function public.ma_krawedzie(p_city int) returns table(a int,b int) language plpgsql stable set search_path='public' as $$
declare s record;cen int[]:='{}';wew int[]:='{}';zew int[]:='{}';lot int[]:='{}';miej int[]:='{}';la float8[]:='{}';lo float8[]:='{}';
 aa int[]:='{}';bb int[]:='{}';j int;x int;y int;best int;r int[];doz int[];
begin
 for s in select * from ma_siec(p_city) order by k loop
  la=la||s.lat;lo=lo||s.lon;
  if s.rodzaj='centrum' then cen=cen||s.k;elsif s.rodzaj='dzielnica' then wew=wew||s.k;elsif s.rodzaj='rogatka' then zew=zew||s.k;else lot=lot||s.k;end if;
  if s.rodzaj<>'lotnisko' then miej=miej||s.k;end if;
 end loop;
 if array_length(la,1) is null then return;end if;
 if coalesce(array_length(cen,1),0)=2 then aa=aa||cen[1];bb=bb||cen[2];end if;
 for j in 1..2 loop
  r=case when j=1 then wew else zew end;
  if coalesce(array_length(r,1),0)=2 then aa=aa||least(r[1],r[2]);bb=bb||greatest(r[1],r[2]);
  elsif coalesce(array_length(r,1),0)>2 then
   for x in 1..array_length(r,1) loop y=r[(x % array_length(r,1))+1];aa=aa||least(r[x],y);bb=bb||greatest(r[x],y);end loop;
  end if;
 end loop;
 if cen<>'{}' then foreach x in array wew loop
  select q into best from unnest(cen) with ordinality t(q,o) order by ma_m(la[x+1],lo[x+1],la[q+1],lo[q+1]),o limit 1;
  aa=aa||least(x,best);bb=bb||greatest(x,best);
 end loop;end if;
 doz=case when wew<>'{}' then wew else cen end;
 if doz<>'{}' then foreach x in array zew loop
  select q into best from unnest(doz) with ordinality t(q,o) order by ma_m(la[x+1],lo[x+1],la[q+1],lo[q+1]),o limit 1;
  aa=aa||least(x,best);bb=bb||greatest(x,best);
 end loop;end if;
 foreach x in array lot loop
  for best in select q from unnest(miej) q order by ma_m(la[x+1],lo[x+1],la[q+1],lo[q+1]),q limit 2 loop
   aa=aa||least(x,best);bb=bb||greatest(x,best);
  end loop;
 end loop;
 return query select distinct t.a,t.b from unnest(aa,bb) t(a,b) where t.a<>t.b order by 1,2;
end $$;

-- lat/lon of a saved game position {m, x, y, s} on the Lublin map or a world map ('w:lat,lon'); null elsewhere.
create or replace function public.ma_ll(a jsonb,out lat float8,out lon float8) language plpgsql immutable set search_path='public' as $$
declare parts text[];olat float8;olon float8;lat0 float8;sc float8;
begin
 if a is null or jsonb_typeof(a->'x')<>'number' or jsonb_typeof(a->'y')<>'number' then return;end if;
 sc=coalesce((a->>'s')::float8,1.92);if sc<=0 then return;end if;
 parts=regexp_match(a->>'m','^w:([-0-9.]+),([-0-9.]+)$');
 if parts is not null then olat=parts[1]::float8;olon=parts[2]::float8;lat0=olat;
 elsif a->>'m'='lublin' then olat=51.2965553;olon=22.4537881;lat0=51.21818255;
 else return;end if;
 lat0=lat0*pi()/180;
 lat=olat-(a->>'y')::float8/sc/(111132.954-559.822*cos(2*lat0));
 lon=olon+(a->>'x')::float8/sc/(111412.84*cos(lat0));
end $$;

-- Who may fly (TEST characters for now).
-- Coins per km of a cannon flight: the admin knob `armata_za_km` (game_settings), else 13 (src/artillery/generator.ts).
create or replace function public.ma_za_km() returns float8 language plpgsql stable security definer set search_path='public' as $$
declare v float8;
begin
 if to_regclass('public.game_settings') is not null then
  execute 'select v from public.game_settings where k=''armata_za_km''' into v;
 end if;
 return greatest(0,least(10000,coalesce(v,13)));
end $$;

create or replace function public.ma_stan(p_token text) returns jsonb language plpgsql security definer set search_path='public','extensions' as $$
declare v_id uuid;v_name text;
begin
 select p.id,p.name into v_id,v_name from players p join public._player_by_token(p_token) auth on auth.id=p.id;
 if v_id is null then raise exception 'Session expired';end if;
 return jsonb_build_object('enabled',v_name in ('Arceus','Jam'),'zaKm',public.ma_za_km(),
  'pending',(select to_jsonb(t) from ma_trips t where player=v_id and state='pending'));
end $$;

-- A flight between two linked generated stations. p_dest = where the game put the destination cannon (snapped near
-- its nominal point): {m, x, y, s}. Price = ma_za_km() (default 13) coins per km between the nominal points.
create or replace function public.ma_lot(p_token text,p_nonce uuid,p_from text,p_to text,p_dest jsonb) returns jsonb language plpgsql security definer set search_path='public','extensions' as $$
declare v public.players;t public.ma_trips;coins int;a jsonb;cena int;city int;kf int;kt int;f record;d record;h record;q record;dest jsonb;
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
 if p_from !~ '^c[0-9]+:[0-9]+$' or p_to !~ '^c[0-9]+:[0-9]+$' or split_part(p_from,':',1)<>split_part(p_to,':',1) then raise exception 'Route unavailable';end if;
 city=substr(split_part(p_from,':',1),2)::int;kf=split_part(p_from,':',2)::int;kt=split_part(p_to,':',2)::int;
 if not exists(select 1 from ma_krawedzie(city) e where e.a=least(kf,kt) and e.b=greatest(kf,kt)) then raise exception 'Route unavailable';end if;
 select * into f from ma_siec(city) s where s.k=kf;
 select * into d from ma_siec(city) s where s.k=kt;
 if exists(select 1 from jsonb_array_elements(coalesce(v.snapshot->'enemies','[]'::jsonb)) e where coalesce((e->>'hp')::float,0)>0 and sqrt(power((e->>'x')::float-(v.snapshot->>'x')::float,2)+power((e->>'y')::float-(v.snapshot->>'y')::float,2))<120) then raise exception 'Finish combat first';end if;
 a=v.save->'tu';
 select * into h from ma_ll(a);
 if h.lat is null or ma_m(h.lat,h.lon,f.lat,f.lon)>330 then raise exception 'Come closer';end if;
 select * into q from ma_ll(p_dest);
 if q.lat is null or ma_m(q.lat,q.lon,d.lat,d.lon)>270 then raise exception 'Destination is unsafe';end if;
 dest=jsonb_build_object('m',p_dest->>'m','x',(p_dest->>'x')::float8,'y',(p_dest->>'y')::float8,'s',coalesce((p_dest->>'s')::float8,1.92));
 cena=greatest(1,floor(ma_m(f.lat,f.lon,d.lat,d.lon)/1000*public.ma_za_km()+0.5)::int);
 coins=coalesce((v.save->>'coins')::int,0);
 if coins<cena then raise exception 'Not enough coins';end if;
 insert into ma_trips(player,nonce,origin,destination,state,price,coins_after,origin_at,destination_at,hero) values(v.id,p_nonce,p_from,p_to,'pending',cena,coins-cena,a,dest,coalesce(v.save->'artilleryHero','{}'::jsonb)) returning * into t;
 update players set save=jsonb_set(jsonb_set(save,'{coins}',to_jsonb(coins-cena)),'{tu}',dest),snapshot=null where id=v.id;
 return to_jsonb(t);
end $$;
revoke all on function public.ma_u(float8,float8),public.ma_m(float8,float8,float8,float8),public.ma_siec(int),public.ma_krawedzie(int),public.ma_ll(jsonb) from public,anon,authenticated;
revoke all on function public.ma_stan(text),public.ma_lot(text,uuid,text,text,jsonb) from public;
grant execute on function public.ma_stan(text),public.ma_lot(text,uuid,text,text,jsonb) to anon,authenticated;
