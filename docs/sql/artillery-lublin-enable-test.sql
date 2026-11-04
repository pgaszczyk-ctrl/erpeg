-- Enable only the reviewed 9-stop Lublin network. RPCs independently restrict travel to Arceus/Jam.
begin;
do $review$
declare total int; reached int;
begin
 select count(*) into total from public.ma_stops where network='lublin' and enabled;
 if total<>9 then raise exception 'Expected exactly 9 reviewed Lublin stops';end if;
 if not exists(select 1 from public.ma_networks where id='lublin' and version=2 and (payload->'city'->>'population')::int>=100000 and (payload->'rules'->>'maxStops')::int=10) then raise exception 'Unexpected network rules';end if;
 if exists(select 1 from public.ma_stops s where s.network='lublin' and (select count(*) from public.ma_edges e where e.a=s.id or e.b=s.id)>case when s.airport then 2 else 4 end) then raise exception 'Degree limit exceeded';end if;
 with recursive reachable(id) as (select min(id) from public.ma_stops where network='lublin' and enabled union select case when e.a=r.id then e.b else e.a end from reachable r join public.ma_edges e on e.a=r.id or e.b=r.id) select count(*) into reached from reachable;
 if reached<>total then raise exception 'Network is disconnected or linked outside Lublin';end if;
 update public.ma_networks set enabled=true where id='lublin';
end $review$;
commit;
