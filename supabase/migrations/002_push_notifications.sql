-- ============================================================
-- Server-side scheduled push notifications
-- Adds the fields the daily scheduler needs and enables the
-- extensions used to call the edge function on a cron.
-- (No secrets here — the actual cron.schedule() call, which
--  contains your service key, is run separately; see the
--  send-daily-notifications/README.md)
-- ============================================================

-- Per-user timezone (IANA, e.g. "America/New_York") so the server can match
-- "08:00" to the user's LOCAL time. Captured from the device on push registration.
alter table public.notification_preferences
  add column if not exists timezone text default 'UTC';

-- The local date we last sent a push for — prevents double-sends within a day.
alter table public.notification_preferences
  add column if not exists last_notified_on date;

-- Extensions used by the scheduler:
--   pg_cron — runs the job on a schedule
--   pg_net  — lets the job make an HTTP call to the edge function
create extension if not exists pg_cron;
create extension if not exists pg_net;
