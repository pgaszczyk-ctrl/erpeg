-- Do wklejenia w Supabase → SQL Editor → Run (4 X 2026).
-- Zapis kraju przy wgrywaniu pytań i kosz 🗑 w panelu (zakładka 🧠 Quizy).

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

CREATE OR REPLACE FUNCTION public.admin_quiz_delete(p_key text, p_id bigint)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if not public._admin_ok(p_key) then raise exception 'Złe hasło admina'; end if;
  delete from public.quizzes where id = p_id;
  return found;
end $function$;
grant execute on function public.admin_quiz_delete(text, bigint) to anon, authenticated;
