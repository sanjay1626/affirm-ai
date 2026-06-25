-- ============================================================
-- Hybrid model — PR1 schema (no behavior change)
-- Curated affirmation library + per-user serving history +
-- AI weekly insights. The app does NOT read these yet; the
-- Edge Function still generates via AI until PR2 flips the flag.
-- ============================================================

-- ── Curated library (global, read-only to clients) ──────────────────────────────
create table if not exists public.affirmation_library (
  id              uuid primary key default gen_random_uuid(),
  text            text not null,
  category        text not null,
  tones           text[] not null default '{}',   -- gentle|motivational|practical|spiritual|humorous
  energy          smallint not null default 3,     -- 1 calm … 5 bold
  difficulty      text not null default 'beginner',-- beginner|intermediate|advanced
  tags            text[] not null default '{}',    -- thematic tags
  addresses       text[] not null default '{}',    -- goal/struggle slugs it speaks to
  word_count      smallint,
  save_count      integer not null default 0,
  practice_count  integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  constraint affirmation_library_word_count_chk check (word_count between 3 and 12),
  constraint affirmation_library_difficulty_chk check (difficulty in ('beginner','intermediate','advanced')),
  constraint affirmation_library_category_text_uniq unique (category, text)
);
create index if not exists affirmation_library_category_idx
  on public.affirmation_library (category) where is_active;
create index if not exists affirmation_library_tones_idx
  on public.affirmation_library using gin (tones);
create index if not exists affirmation_library_tags_idx
  on public.affirmation_library using gin (tags);
create index if not exists affirmation_library_addresses_idx
  on public.affirmation_library using gin (addresses);

alter table public.affirmation_library enable row level security;
create policy "Library readable by authenticated users"
  on public.affirmation_library for select
  to authenticated using (is_active);
-- No user write policy: seeding + analytic increments happen via service role.

-- ── Per-user serving log (repeat prevention + future signals) ───────────────────
create table if not exists public.user_affirmation_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  library_id  uuid not null references public.affirmation_library(id) on delete cascade,
  context     text not null,                       -- daily|category|practice
  shown_on    date not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists user_affirmation_history_user_date_idx
  on public.user_affirmation_history (user_id, shown_on desc);
create index if not exists user_affirmation_history_user_lib_idx
  on public.user_affirmation_history (user_id, library_id);

alter table public.user_affirmation_history enable row level security;
create policy "Users manage their own affirmation history"
  on public.user_affirmation_history for all
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Link served affirmations to their library source (legacy rows stay null) ────
alter table public.affirmations
  add column if not exists library_id uuid references public.affirmation_library(id);

-- ── AI weekly insights ───────────────────────────────────────────────────────────
create table if not exists public.weekly_insights (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  week_start   date not null,
  insight_text text not null,
  created_at   timestamptz not null default now(),
  constraint weekly_insights_user_week_uniq unique (user_id, week_start)
);
alter table public.weekly_insights enable row level security;
create policy "Users manage their own weekly insights"
  on public.weekly_insights for all
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
