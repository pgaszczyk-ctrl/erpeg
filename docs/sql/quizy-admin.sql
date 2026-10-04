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
