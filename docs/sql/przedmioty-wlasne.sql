-- Własne przedmioty z panelu admina (właściciel, 24.11.2026: „w drugiej zakładce tworzyć przedmioty – ładować zdjęcie
-- od grafika, ustalać statystyki; unikalne, epickie, magiczne mogą mieć swoją nazwę”). Zakładka „🎒 Przedmioty”.
-- id zawsze zaczyna się od 'w_' (nie zderzy się z przedmiotami z kodu). dane = jsonb jak w src/content/przedmiotyWlasne.ts.
-- ikona = mały obrazek (data URL, 64 px: plecak na mapie, tekstura w grze), ikona_hd = duży (256 px: karta przedmiotu, sklep).
-- Przedmiotów nic nie kasuje: „aktywny = false” chowa go przed nowymi łupami, ale gracze, którzy go mają, zachowują go.
-- tylko_test = widzi go tylko serwer testowy (gra woła game_przedmioty(true)).
create table if not exists public.przedmioty_wlasne (
  id text primary key check (id ~ '^w_[a-z0-9_]{1,38}$'),
  dane jsonb not null,
  ikona text,
  ikona_hd text,
  aktywny boolean not null default true,
  tylko_test boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.przedmioty_wlasne enable row level security;

-- Gra: wszystkie (także wyłączone – żeby gracz, który już ma przedmiot, wciąż widział jego obrazek i statystyki).
create or replace function public.game_przedmioty(p_test boolean default false)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'dane', dane, 'ikona', ikona, 'ikona_hd', ikona_hd, 'aktywny', aktywny) order by id), '[]'::jsonb)
  from public.przedmioty_wlasne where p_test or not tylko_test
$$;

create or replace function public.admin_przedmioty(p_key text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public._admin_ok(p_key) then return jsonb_build_object('error', 'Złe hasło admina.'); end if;
  return jsonb_build_object('przedmioty', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'dane', dane, 'ikona', ikona,
    'ikona_hd', ikona_hd, 'aktywny', aktywny, 'tylko_test', tylko_test, 'updated_at', updated_at) order by updated_at desc)
    from public.przedmioty_wlasne), '[]'::jsonb));
end $$;

create or replace function public.admin_przedmiot_zapisz(p_key text, p_id text, p_dane jsonb, p_ikona text, p_ikona_hd text,
  p_aktywny boolean, p_tylko_test boolean)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public._admin_ok(p_key) then return jsonb_build_object('error', 'Złe hasło admina.'); end if;
  if p_id !~ '^w_[a-z0-9_]{1,38}$' then return jsonb_build_object('error', 'Złe id przedmiotu (w_ + małe litery, cyfry, _).'); end if;
  if jsonb_typeof(p_dane) <> 'object' or length(p_dane::text) > 8000 then return jsonb_build_object('error', 'Złe dane przedmiotu.'); end if;
  if coalesce(p_dane->>'miejsce', '') not in ('bron', 'dystans', 'zbroja', 'helm', 'buty', 'amulet', 'talizman') then
    return jsonb_build_object('error', 'Złe miejsce przedmiotu.');
  end if;
  if coalesce(p_dane->'nazwa'->>'pl', '') = '' then return jsonb_build_object('error', 'Brak nazwy.'); end if;
  if p_ikona is not null and (p_ikona !~ '^data:image/(png|webp);base64,' or length(p_ikona) > 120000) then
    return jsonb_build_object('error', 'Mały obrazek: PNG/WebP do ok. 90 kB.');
  end if;
  if p_ikona_hd is not null and (p_ikona_hd !~ '^data:image/(png|webp);base64,' or length(p_ikona_hd) > 400000) then
    return jsonb_build_object('error', 'Duży obrazek: PNG/WebP do ok. 300 kB.');
  end if;
  insert into public.przedmioty_wlasne(id, dane, ikona, ikona_hd, aktywny, tylko_test)
    values (p_id, p_dane, p_ikona, p_ikona_hd, coalesce(p_aktywny, true), coalesce(p_tylko_test, true))
    on conflict (id) do update set dane = excluded.dane,
      ikona = coalesce(excluded.ikona, przedmioty_wlasne.ikona), ikona_hd = coalesce(excluded.ikona_hd, przedmioty_wlasne.ikona_hd),
      aktywny = excluded.aktywny, tylko_test = excluded.tylko_test, updated_at = now();
  insert into public.admin_log(what) values (left('przedmiot ' || p_id || ' ' || coalesce(p_dane->'nazwa'->>'pl', '') || ' aktywny=' || coalesce(p_aktywny, true)::text || ' test=' || coalesce(p_tylko_test, true)::text, 200));
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.admin_przedmioty(text), public.admin_przedmiot_zapisz(text, text, jsonb, text, text, boolean, boolean) from public;
grant execute on function public.game_przedmioty(boolean) to anon, authenticated;
grant execute on function public.admin_przedmioty(text), public.admin_przedmiot_zapisz(text, text, jsonb, text, text, boolean, boolean) to anon, authenticated;

-- Łup miejsc (skrzynie lochów, rozbite bandy, szefowie obozów) trzyma ta sama tabela co łup stworków:
-- public.stwory_lup z rodzajem 'miejsce_<id>' (docs/sql/stwory-lup.sql; jego walidacja już to przepuszcza).

-- Pomysły na umiejętności (zakładka „✨ Umiejętności”): repozytorium do zrobienia z programistą. Każda nowa
-- umiejętność (np. łańcuch piorunów) ma własną fizykę, więc gra jej nie „składa” z formularza – to tylko notatnik.
create table if not exists public.umiejetnosci_pomysly (
  id bigserial primary key,
  nazwa text not null check (length(nazwa) between 1 and 80),
  bron text not null default 'magia' check (bron in ('miecz', 'luk', 'magia', 'inne')),
  opis text not null default '' check (length(opis) <= 2000),
  status text not null default 'pomysl' check (status in ('pomysl', 'do_zrobienia', 'w_grze', 'odrzucony')),
  updated_at timestamptz not null default now()
);
alter table public.umiejetnosci_pomysly enable row level security;

create or replace function public.admin_umiej_pomysly(p_key text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public._admin_ok(p_key) then return jsonb_build_object('error', 'Złe hasło admina.'); end if;
  return jsonb_build_object('pomysly', coalesce((select jsonb_agg(to_jsonb(u) order by u.updated_at desc) from public.umiejetnosci_pomysly u), '[]'::jsonb));
end $$;

create or replace function public.admin_umiej_pomysl_zapisz(p_key text, p_id bigint, p_nazwa text, p_bron text, p_opis text, p_status text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public._admin_ok(p_key) then return jsonb_build_object('error', 'Złe hasło admina.'); end if;
  if p_id is null then
    insert into public.umiejetnosci_pomysly(nazwa, bron, opis, status) values (p_nazwa, p_bron, coalesce(p_opis, ''), coalesce(p_status, 'pomysl'));
  else
    insert into public.umiejetnosci_pomysly(id, nazwa, bron, opis, status) values (p_id, p_nazwa, p_bron, coalesce(p_opis, ''), coalesce(p_status, 'pomysl'))
      on conflict (id) do update set nazwa = excluded.nazwa, bron = excluded.bron, opis = excluded.opis, status = excluded.status, updated_at = now();
  end if;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.admin_umiej_pomysly(text), public.admin_umiej_pomysl_zapisz(text, bigint, text, text, text, text) from public;
grant execute on function public.admin_umiej_pomysly(text), public.admin_umiej_pomysl_zapisz(text, bigint, text, text, text, text) to anon, authenticated;
