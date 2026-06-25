-- ============================================================
-- Saved "daily practice" affirmation
-- Lets a user pin one affirmation as their active practice, which the
-- daily notification then invites them to repeat in a 5-minute session.
-- ============================================================

alter table public.notification_preferences
  add column if not exists practice_affirmation_text text;

alter table public.notification_preferences
  add column if not exists practice_affirmation_id uuid;

alter table public.notification_preferences
  add column if not exists practice_set_on date;
