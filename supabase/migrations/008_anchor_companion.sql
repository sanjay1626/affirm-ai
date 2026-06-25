-- ============================================================
-- Anchor / Companion model (dark — nothing reads these yet)
-- Discover returns 1 Anchor + 2 Companions; the Anchor is what
-- Daily Practice repeats. anchor_eligible marks lines strong
-- enough to stand alone as a daily mantra.
-- ============================================================

-- Which curated lines may be served as an Anchor. Default true for beta;
-- curate weaker / fragment-y lines to false later.
alter table public.affirmation_library
  add column if not exists anchor_eligible boolean not null default true;

-- Tag each serving's role for Anchor-vs-Companion analytics.
alter table public.user_affirmation_history
  add column if not exists role text;   -- 'anchor' | 'companion' | null
