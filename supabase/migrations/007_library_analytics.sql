-- ============================================================
-- PR2 (dark) — library popularity counters
-- Increment-only signals (not exact current-state counts).
-- SECURITY DEFINER so authenticated users can bump global counters on
-- affirmation_library, which they have no direct write access to.
-- Nothing calls these yet — client wiring lands later in PR2.
-- ============================================================

create or replace function public.increment_library_save(p_library_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.affirmation_library
  set save_count = save_count + 1
  where id = p_library_id;
$$;

create or replace function public.increment_library_practice(p_library_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.affirmation_library
  set practice_count = practice_count + 1
  where id = p_library_id;
$$;

-- Only authenticated users may call these (not anon).
revoke all on function public.increment_library_save(uuid) from public;
revoke all on function public.increment_library_practice(uuid) from public;
grant execute on function public.increment_library_save(uuid) to authenticated;
grant execute on function public.increment_library_practice(uuid) to authenticated;
