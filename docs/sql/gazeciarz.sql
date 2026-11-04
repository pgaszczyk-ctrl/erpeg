-- Gazeciarz (owner, 11 Oct 2026): players can order a quest / describe an adventure at a newsboy.
-- Untrusted player text, read only as ideas (like bug_reports). RLS on, no policies: only RPCs.
create table if not exists public.quest_orders (
  id bigserial primary key,
  at timestamptz not null default now(),
  player text,
  text text not null,
  ctx jsonb,
  status text not null default 'nowe' check (status in ('nowe', 'przyjete', 'odrzucone', 'zrobione'))
);
alter table public.quest_orders enable row level security;

create or replace function public.order_quest(p_player text, p_text text, p_ctx jsonb)
returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  if coalesce(length(trim(p_text)), 0) < 5 then return false; end if;
  -- Flood guards: 5 an hour per character, 100 an hour from everyone.
  if (select count(*) from quest_orders where at > now() - interval '1 hour' and player = left(p_player, 40)) >= 5 then return false; end if;
  if (select count(*) from quest_orders where at > now() - interval '1 hour') >= 100 then return false; end if;
  insert into quest_orders (player, text, ctx)
  values (left(p_player, 40), left(p_text, 500), case when p_ctx is null or length(p_ctx::text) > 4000 then null else p_ctx end);
  return true;
end $$;

create or replace function public.admin_quest_orders(p_key text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if not public._admin_ok(p_key) then raise exception 'Złe hasło admina'; end if;
  return coalesce((select jsonb_agg(to_jsonb(o) order by o.id desc) from (select * from quest_orders order by id desc limit 300) o), '[]'::jsonb);
end $$;

create or replace function public.admin_quest_order_status(p_key text, p_id bigint, p_status text)
returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  if not public._admin_ok(p_key) then raise exception 'Złe hasło admina'; end if;
  update quest_orders set status = p_status where id = p_id;
  return found;
end $$;

grant execute on function public.order_quest(text, text, jsonb) to anon, authenticated;
grant execute on function public.admin_quest_orders(text) to anon, authenticated;
grant execute on function public.admin_quest_order_status(text, bigint, text) to anon, authenticated;
