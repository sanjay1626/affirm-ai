-- ============================================================
-- My Library (Phase 1) — enrich the Saved collection.
-- The `favorites` table is reused as the single "Saved" collection
-- (UI labels it "Saved" / "My Library"; no separate Favorites concept).
-- These columns power Library views: by-category, filter-by-source,
-- and back-links to curated library lines.
-- ============================================================

alter table public.favorites
  add column if not exists category text;

alter table public.favorites
  add column if not exists source text;       -- 'home' | 'discover'

alter table public.favorites
  add column if not exists library_id uuid references public.affirmation_library(id);

create index if not exists favorites_user_category_idx
  on public.favorites (user_id, category);
