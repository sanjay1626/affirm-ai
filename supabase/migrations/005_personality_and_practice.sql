-- ============================================================
-- Hybrid model — PR1 schema (no behavior change)
-- Derived personality vector + practice library reference.
-- ============================================================

-- Derived per-user personality vector (computed from onboarding_answers).
create table if not exists public.user_personality (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  preferred_tones text[] not null default '{}',
  energy_pref     smallint not null default 3,    -- 1 calm … 5 bold
  focus_tags      text[] not null default '{}',
  avoid_tags      text[] not null default '{}',
  updated_at      timestamptz not null default now()
);
alter table public.user_personality enable row level security;
create policy "Users manage their own personality profile"
  on public.user_personality for all
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Pinned daily-practice affirmation now references the stable library item.
-- practice_affirmation_text (already present) stays as a display snapshot.
alter table public.notification_preferences
  add column if not exists practice_library_id uuid references public.affirmation_library(id);
