-- REVIEW BEFORE APPLYING. TEST registry; stays disabled. Import only into a disabled network. No player data is removed.
begin;
do $guard$ begin if exists(select 1 from public.ma_networks where id='lublin' and enabled) then raise exception 'Disable this network before importing';end if;end $guard$;
insert into public.ma_networks(id,version,enabled,price,payload) values('lublin',2,false,5,'{"id":"lublin","version":2,"city":{"name":"Lublin","population":334681},"source":{"file":"work/artillery/lublin.geojsonseq.gz","sha256":"de754c3a2bbc8472cf79decfbb7afd199d52b99819e9bd63b594041a6099f52c","bounds":[22.32,51.15,22.78,51.33],"runways":39,"accessComplete":true,"gameMapSha256":"fcb6fa29cac737202dce4902ed79e3e7d73c6beab765aea940241e06bdd73cfc"},"rules":{"version":2,"minCityPopulation":100000,"cityStops":7,"maxStops":10,"maxCityStops":40,"centralStops":2,"centralRadiusM":1800,"candidateGridM":400,"walkMps":19.444444444444443,"walkSeconds":90,"sampleM":220,"minSpacingM":900,"attachM":140,"clearM":12,"maxDegree":4,"airportDegree":2,"airportMaxM":22000,"price":5},"mapOrigins":{"lublin":{"lon":22.4537881,"lat":51.2965553,"lat0":51.21818255}}}'::jsonb) on conflict(id) do update set version=excluded.version,payload=excluded.payload,price=excluded.price;
insert into public.ma_stops(id,network,name,at,enabled,airport) values('lublin:rway/40052049:4:0:-1','lublin','Plac Zamkowy','{"m":"lublin","x":15643.105846583345,"y":9785.806261645588,"s":1.92,"lon":22.57054026670682,"lat":51.250743047553804}'::jsonb,true,false) on conflict(id) do nothing;
insert into public.ma_stops(id,network,name,at,enabled,airport) values('lublin:rway/40050974:1:0:1','lublin','3 Maja','{"m":"lublin","x":14014.39618032386,"y":10381.542148484585,"s":1.92,"lon":22.558384408123683,"lat":51.24795410997325}'::jsonb,true,false) on conflict(id) do nothing;
insert into public.ma_stops(id,network,name,at,enabled,airport) values('lublin:rway/40050349:3:0:1','lublin','Morwowa','{"m":"lublin","x":8097.296274037242,"y":10538.029267395037,"s":1.92,"lon":22.514222191141013,"lat":51.24722151551916}'::jsonb,true,false) on conflict(id) do nothing;
insert into public.ma_stops(id,network,name,at,enabled,airport) values('lublin:rway/40051830:1:0:1','lublin','Bieszczadzka','{"m":"lublin","x":5206.490984395548,"y":14630.015211040483,"s":1.92,"lon":22.49264669427976,"lat":51.22806488314321}'::jsonb,true,false) on conflict(id) do nothing;
insert into public.ma_stops(id,network,name,at,enabled,airport) values('lublin:rway/176221805:10:0:-1','lublin','Józefa Śliwińskiego','{"m":"lublin","x":13454.097845375174,"y":5019.305600137145,"s":1.92,"lon":22.55420262700879,"lat":51.273057420611224}'::jsonb,true,false) on conflict(id) do nothing;
insert into public.ma_stops(id,network,name,at,enabled,airport) values('lublin:rway/40049570:4:0:1','lublin','Władysława Grabskiego','{"m":"lublin","x":19127.84094321438,"y":14296.236355229763,"s":1.92,"lon":22.596548552843927,"lat":51.229627468871435}'::jsonb,true,false) on conflict(id) do nothing;
insert into public.ma_stops(id,network,name,at,enabled,airport) values('lublin:rway/85851330:1:0:-1','lublin','Aleksandra Świętochowskiego','{"m":"lublin","x":16198.934963033802,"y":19112.64919970878,"s":1.92,"lon":22.574688691853385,"lat":51.207079431927234}'::jsonb,true,false) on conflict(id) do nothing;
insert into public.ma_stops(id,network,name,at,enabled,airport) values('lublin:airport:way/71386702','lublin','Port Lotniczy Lublin','{"m":"w:51.2400,22.5500","x":21893.940228465268,"y":961.7984109103662,"s":1.92,"lon":22.71348269569687,"lat":51.23549735754554}'::jsonb,true,true) on conflict(id) do nothing;
insert into public.ma_stops(id,network,name,at,enabled,airport) values('lublin:airport:way/62382411','lublin','Lotnisko Radawiec','{"m":"lublin","x":-6849.460094040105,"y":15646.003445431837,"s":1.92,"lon":22.402667221921575,"lat":51.223308534179026}'::jsonb,true,true) on conflict(id) do nothing;
insert into public.ma_edges values('lublin:rway/40050974:1:0:1','lublin:rway/40052049:4:0:-1') on conflict do nothing;
insert into public.ma_edges values('lublin:rway/40050349:3:0:1','lublin:rway/40051830:1:0:1') on conflict do nothing;
insert into public.ma_edges values('lublin:rway/176221805:10:0:-1','lublin:rway/40052049:4:0:-1') on conflict do nothing;
insert into public.ma_edges values('lublin:rway/40049570:4:0:1','lublin:rway/85851330:1:0:-1') on conflict do nothing;
insert into public.ma_edges values('lublin:rway/40049570:4:0:1','lublin:rway/40052049:4:0:-1') on conflict do nothing;
insert into public.ma_edges values('lublin:rway/40050349:3:0:1','lublin:rway/40050974:1:0:1') on conflict do nothing;
insert into public.ma_edges values('lublin:airport:way/62382411','lublin:rway/40051830:1:0:1') on conflict do nothing;
insert into public.ma_edges values('lublin:airport:way/62382411','lublin:rway/40050349:3:0:1') on conflict do nothing;
insert into public.ma_edges values('lublin:airport:way/71386702','lublin:rway/40049570:4:0:1') on conflict do nothing;
insert into public.ma_edges values('lublin:airport:way/71386702','lublin:rway/40052049:4:0:-1') on conflict do nothing;
insert into public.ma_edges values('lublin:rway/40051830:1:0:1','lublin:rway/85851330:1:0:-1') on conflict do nothing;
insert into public.ma_edges values('lublin:rway/176221805:10:0:-1','lublin:rway/40051830:1:0:1') on conflict do nothing;
insert into public.ma_edges values('lublin:rway/40050974:1:0:1','lublin:rway/85851330:1:0:-1') on conflict do nothing;
insert into public.ma_edges values('lublin:rway/40049570:4:0:1','lublin:rway/40050349:3:0:1') on conflict do nothing;
commit;
-- After reviewing real data and database checks, activation is a separate explicit operation.
