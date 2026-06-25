-- ============================================================
-- AffirmAI — Initial Schema
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension (usually already on)
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- One row per auth user. Created on signup via trigger.
-- ============================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  full_name    text,
  avatar_url   text,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

-- RLS
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ONBOARDING ANSWERS
-- Stores the user's onboarding preferences
-- ============================================================
create table if not exists public.onboarding_answers (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  preferred_name    text not null,
  main_goals        text[] default '{}',
  current_struggles text[] default '{}',
  life_areas        text[] default '{}',
  preferred_tone    text default 'motivational',
  notification_time text default '08:00',
  frequency         text default 'daily',
  personal_context  text,
  onboarding_done   boolean default false,
  created_at        timestamptz default now() not null,
  updated_at        timestamptz default now() not null
);

create unique index if not exists onboarding_answers_user_id_idx
  on public.onboarding_answers (user_id);

alter table public.onboarding_answers enable row level security;

create policy "Users can manage their own onboarding answers"
  on public.onboarding_answers for all
  using (auth.uid() = user_id);

-- ============================================================
-- AFFIRMATIONS
-- AI-generated affirmations stored per user per day
-- ============================================================
create table if not exists public.affirmations (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  affirmation_text text not null,
  category         text,
  tone             text,
  reason           text,
  generated_for    date default current_date,
  is_daily         boolean default false,
  created_at       timestamptz default now() not null
);

create index if not exists affirmations_user_id_date_idx
  on public.affirmations (user_id, generated_for desc);

alter table public.affirmations enable row level security;

create policy "Users can manage their own affirmations"
  on public.affirmations for all
  using (auth.uid() = user_id);

-- ============================================================
-- QUOTES
-- AI-generated or curated daily quotes
-- ============================================================
create table if not exists public.quotes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  quote_text   text not null,
  quote_author text,
  category     text,
  generated_for date default current_date,
  created_at   timestamptz default now() not null
);

create index if not exists quotes_user_id_date_idx
  on public.quotes (user_id, generated_for desc);

alter table public.quotes enable row level security;

create policy "Users can manage their own quotes"
  on public.quotes for all
  using (auth.uid() = user_id);

-- ============================================================
-- MOOD LOGS
-- User's daily mood check-ins
-- ============================================================
create table if not exists public.mood_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  mood       integer not null check (mood >= 1 and mood <= 5),
  mood_label text,
  note       text,
  logged_at  timestamptz default now() not null,
  created_at timestamptz default now() not null
);

create index if not exists mood_logs_user_id_idx
  on public.mood_logs (user_id, logged_at desc);

alter table public.mood_logs enable row level security;

create policy "Users can manage their own mood logs"
  on public.mood_logs for all
  using (auth.uid() = user_id);

-- ============================================================
-- JOURNAL ENTRIES
-- User's private journal entries
-- ============================================================
create table if not exists public.journal_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text,
  body       text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists journal_entries_user_id_idx
  on public.journal_entries (user_id, created_at desc);

alter table public.journal_entries enable row level security;

create policy "Users can manage their own journal entries"
  on public.journal_entries for all
  using (auth.uid() = user_id);

-- ============================================================
-- FAVORITES
-- Affirmations the user has starred
-- ============================================================
create table if not exists public.favorites (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  affirmation_id  uuid references public.affirmations(id) on delete cascade,
  affirmation_text text not null,
  created_at      timestamptz default now() not null
);

create unique index if not exists favorites_user_affirmation_idx
  on public.favorites (user_id, affirmation_id);

create index if not exists favorites_user_id_idx
  on public.favorites (user_id, created_at desc);

alter table public.favorites enable row level security;

create policy "Users can manage their own favorites"
  on public.favorites for all
  using (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATION PREFERENCES
-- Stores push token + scheduling preferences
-- ============================================================
create table if not exists public.notification_preferences (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  expo_push_token   text,
  notification_time text default '08:00',
  frequency         text default 'daily',
  enabled           boolean default true,
  created_at        timestamptz default now() not null,
  updated_at        timestamptz default now() not null
);

create unique index if not exists notification_preferences_user_id_idx
  on public.notification_preferences (user_id);

alter table public.notification_preferences enable row level security;

create policy "Users can manage their own notification preferences"
  on public.notification_preferences for all
  using (auth.uid() = user_id);

-- ============================================================
-- HELPER: updated_at trigger function
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Attach to tables that have updated_at
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger set_onboarding_updated_at
  before update on public.onboarding_answers
  for each row execute procedure public.set_updated_at();

create trigger set_journal_updated_at
  before update on public.journal_entries
  for each row execute procedure public.set_updated_at();

create trigger set_notif_prefs_updated_at
  before update on public.notification_preferences
  for each row execute procedure public.set_updated_at();
