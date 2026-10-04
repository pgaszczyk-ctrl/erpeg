-- Zakładka „🧠 Quizy” w panelu admina (4 X 2026): statystyki, lista z usuwaniem złych pytań,
-- wklejanie odpowiedzi od Gemini. Do uruchomienia raz w bazie (Supabase → SQL).

CREATE OR REPLACE FUNCTION public.admin_quizzes(p_key text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare d0 date := public._warsaw_today();
begin
  if not public._admin_ok(p_key) then return jsonb_build_object('error', 'Złe hasło admina.'); end if;
  return jsonb_build_object(
    'today', (select count(*) from public.quizzes where d0 between valid_from and valid_to),
    'tomorrow', (select count(*) from public.quizzes where d0 + 1 between valid_from and valid_to),
    'in5', (select count(*) from public.quizzes where d0 + 4 between valid_from and valid_to),
    'byLevel', (select coalesce(jsonb_object_agg(level, c), '{}'::jsonb) from (select level, count(*) c from public.quizzes where d0 between valid_from and valid_to group by level) x),
    'reserve', (select coalesce(jsonb_object_agg(level, c), '{}'::jsonb) from (select level, count(*) c from public.quizzes where not (d0 between valid_from and valid_to) and answered = 0 group by level) x),
    'answered', (select count(*) from public.quizzes where answered > 0),
    'total', (select count(*) from public.quizzes),
    'history', (select count(*) from public.quiz_history),
    'hasKey', exists (select 1 from public.admin_config where k = 'quiz_key'),
    'last', (select max(created_at) from public.quizzes),
    'sample', '[]'::jsonb);
end $function$;

CREATE OR REPLACE FUNCTION public.admin_quiz_list(p_key text, p_level int default null, p_q text default null, p_limit int default 100)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if not public._admin_ok(p_key) then raise exception 'Złe hasło admina'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'level', level, 'category', category, 'question', question, 'answers', answers,
      'from', valid_from, 'to', valid_to, 'answered', answered, 'at', created_at) order by id desc), '[]'::jsonb)
    from (select * from public.quizzes
          where (p_level is null or level = p_level)
            and (coalesce(p_q, '') = '' or question ilike '%' || p_q || '%' or category ilike '%' || p_q || '%')
          order by id desc limit least(greatest(coalesce(p_limit, 100), 1), 500)) q);
end $function$;

-- Usuwa złe pytanie; zostaje w quiz_history, więc nie da się go wgrać ponownie.
CREATE OR REPLACE FUNCTION public.admin_quiz_delete(p_key text, p_id bigint)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if not public._admin_ok(p_key) then raise exception 'Złe hasło admina'; end if;
  delete from public.quizzes where id = p_id;
  return found;
end $function$;

-- Okienko „wklej odpowiedź Gemini” w panelu admina.
CREATE OR REPLACE FUNCTION public.admin_add_quizzes(p_key text, p_quizzes jsonb, p_days int default 5)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if not public._admin_ok(p_key) then return jsonb_build_object('error', 'Złe hasło admina.'); end if;
  return public._insert_quizzes(p_quizzes, p_days);
end $function$;

grant execute on function public.admin_quiz_list(text, int, text, int) to anon, authenticated;
grant execute on function public.admin_quiz_delete(text, bigint) to anon, authenticated;
grant execute on function public.admin_add_quizzes(text, jsonb, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Kraj pytania (4 X 2026): null = ogólne (wszędzie), 'PL', 'JP'… = tylko w szkołach w tym kraju.
-- Gra rozpoznaje kraj po miejscu szkoły (src/kraj.ts). Lubelszczyzna = zawsze PL.

alter table public.quizzes add column if not exists country text check (country ~ '^[A-Z]{2}$');
update public.quizzes set country = 'PL' where country is null and category = 'Lubelszczyzna';

CREATE OR REPLACE FUNCTION public._insert_quizzes(p_quizzes jsonb, p_days integer)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare q jsonb; ans text[]; added int := 0; skipped int := 0; repeated int := 0; d0 date := public._warsaw_today(); days int := least(greatest(coalesce(p_days, 5), 5), 7); k text; c text; cat text;
begin
  if jsonb_typeof(p_quizzes) <> 'array' then return jsonb_build_object('error', 'p_quizzes musi być tablicą.'); end if;
  if jsonb_array_length(p_quizzes) > 1000 then return jsonb_build_object('error', 'Najwyżej 1000 quizów naraz.'); end if;
  delete from public.quizzes where answered > 0 and valid_to < d0 - 90;
  for q in select * from jsonb_array_elements(p_quizzes) loop
    begin
      select array_agg(left(trim(x), 120)) into ans from jsonb_array_elements_text(q->'answers') x where trim(x) <> '';
      cat := left(coalesce(q->>'category', ''), 40);
      c := nullif(upper(trim(coalesce(q->>'country', ''))), '');
      if c in ('OGÓLNE', 'OGOLNE') then c := null; end if;
      if c is null and cat = 'Lubelszczyzna' then c := 'PL'; end if;
      if coalesce(array_length(ans, 1), 0) not between 2 and 5
         or coalesce(trim(q->>'question'), '') = ''
         or (q->>'level')::int not between 0 and 3
         or (c is not null and c !~ '^[A-Z]{2}$')
         or (select count(distinct a) from unnest(ans) a) <> array_length(ans, 1) then
        skipped := skipped + 1; continue;
      end if;
      k := public._quiz_norm(q->>'question');
      insert into public.quiz_history (qkey, level, category, first_day) values (k, (q->>'level')::int, cat, d0)
      on conflict (qkey) do nothing;
      if not found then repeated := repeated + 1; continue; end if;
      insert into public.quizzes (valid_from, valid_to, level, category, country, question, answers)
      values (d0, d0 + days - 1, (q->>'level')::int, cat, c, left(trim(q->>'question'), 300), ans);
      added := added + 1;
    exception when others then skipped := skipped + 1;
    end;
  end loop;
  return jsonb_build_object('added', added, 'repeated', repeated, 'skipped', skipped,
    'active', (select count(*) from public.quizzes where d0 between valid_from and valid_to));
end $function$;

-- New game versions call school_quizzes(p_all => true) and get the country as the 6th field;
-- old ones call school_quizzes() (a wrapper below) and get only general questions (they can't filter by country).
CREATE OR REPLACE FUNCTION public.school_quizzes(p_all boolean)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  with d as (select public._warsaw_today() t),
  src as (select * from public.quizzes q where coalesce(p_all, false) or q.country is null),
  cur as (select q.* from src q, d where d.t between q.valid_from and q.valid_to),
  need as (select l, greatest(0, 150 - (select count(*) from cur where cur.level = l)) n from generate_series(0, 3) l),
  old as (
    select q.*, row_number() over (partition by q.level order by (q.answered > 0), md5(q.id::text || d.t::text)) rn
    from src q, d where not (d.t between q.valid_from and q.valid_to) and q.valid_from <= d.t
  ),
  pick as (
    select * from (select id, level, category, question, answers, country from cur order by id desc limit 3000) a
    union all
    select o.id, o.level, o.category, o.question, o.answers, o.country from old o join need on need.l = o.level where o.rn <= need.n
  )
  select coalesce(jsonb_agg(case when coalesce(p_all, false) then jsonb_build_array(id, level, category, question, answers, country)
                                 else jsonb_build_array(id, level, category, question, answers) end), '[]'::jsonb) from pick
$function$;
grant execute on function public.school_quizzes(boolean) to anon, authenticated;

CREATE OR REPLACE FUNCTION public.school_quizzes()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ select public.school_quizzes(false) $function$;

drop function if exists public.admin_quiz_list(text, int, text, int);
CREATE OR REPLACE FUNCTION public.admin_quiz_list(p_key text, p_level int default null, p_q text default null, p_limit int default 100, p_country text default null)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if not public._admin_ok(p_key) then raise exception 'Złe hasło admina'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'level', level, 'category', category, 'country', country, 'question', question, 'answers', answers,
      'from', valid_from, 'to', valid_to, 'answered', answered, 'at', created_at) order by id desc), '[]'::jsonb)
    from (select * from public.quizzes
          where (p_level is null or level = p_level)
            and (coalesce(p_country, '') = '' or (p_country = '-' and country is null) or (p_country = '*' and country is not null) or country = upper(p_country))
            and (coalesce(p_q, '') = '' or question ilike '%' || p_q || '%' or category ilike '%' || p_q || '%')
          order by id desc limit least(greatest(coalesce(p_limit, 100), 1), 500)) q);
end $function$;
grant execute on function public.admin_quiz_list(text, int, text, int, text) to anon, authenticated;

-- Zmiana kraju jednego pytania w panelu ('' = ogólne).
CREATE OR REPLACE FUNCTION public.admin_quiz_country(p_key text, p_id bigint, p_country text)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare c text := nullif(upper(trim(coalesce(p_country, ''))), '');
begin
  if not public._admin_ok(p_key) then raise exception 'Złe hasło admina'; end if;
  if c is not null and c !~ '^[A-Z]{2}$' then raise exception 'Kraj: pusty albo dwie litery (np. PL)'; end if;
  update public.quizzes set country = c where id = p_id;
  return found;
end $function$;
grant execute on function public.admin_quiz_country(text, bigint, text) to anon, authenticated;
