# Daily affirmation push scheduler

Sends each user a **freshly generated** affirmation at their preferred local time,
even when the app is closed. This replaces the limitation of the local
notification (which repeats the same text until the app is reopened).

## How it works

1. A **pg_cron** job fires every 15 minutes.
2. It calls this edge function (via **pg_net**), passing a shared `x-cron-secret`.
3. The function looks at every user with notifications enabled and a push token,
   computes their **local** time from their saved `timezone`, and for anyone whose
   `notification_time` just passed (and who hasn't been sent today), it:
   - generates a personalized affirmation with Claude (OpenAI fallback),
   - saves it as today's daily affirmation (so it also appears in-app),
   - pushes it to their device via the **Expo Push API**,
   - records `last_notified_on` so they aren't sent twice.

## One-time setup

### 1. Run the migration
```bash
supabase db push           # applies 002_push_notifications.sql
```
This adds `timezone` + `last_notified_on` to `notification_preferences` and enables
`pg_cron` / `pg_net`.

### 2. Set the secrets
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — do NOT set them.
You only need:
```bash
# Reuse the keys you already set for generate-affirmation if present:
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set OPENAI_API_KEY=sk-...

# A random shared secret the cron job will send (generate any long random string):
supabase secrets set CRON_SECRET=$(openssl rand -hex 32)
```
Note the CRON_SECRET value — you need it in step 4.

### 3. Deploy the function
It is called by cron, not a logged-in user, so disable JWT verification (it is
instead protected by `x-cron-secret`):
```bash
supabase functions deploy send-daily-notifications --no-verify-jwt
```

### 4. Schedule it (run in the Supabase SQL editor)
Replace `<PROJECT_REF>` and `<YOUR_CRON_SECRET>` with your values. The `*/15`
interval **must** match `TICK_MINUTES` in index.ts.
```sql
select cron.schedule(
  'daily-affirmation-push',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-daily-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<YOUR_CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

To change or remove it later:
```sql
select cron.unschedule('daily-affirmation-push');
```

## Test it manually
```bash
curl -X POST 'https://<PROJECT_REF>.supabase.co/functions/v1/send-daily-notifications' \
  -H 'x-cron-secret: <YOUR_CRON_SECRET>'
# → {"sent":N,"skipped":N,"failed":N,"checked":N}
```
Tip: to force a send while testing, temporarily set your `notification_time` to the
next quarter-hour and clear `last_notified_on` for your row.

## Requirements & limits
- **Real device + development build.** Expo Go (SDK 54) does not provide real push
  tokens; the app stores `'local-only'`, which this function skips. Build with EAS to test.
- **Timezone** is captured from the device when the push token is saved
  (`savePushToken`). Existing users default to `UTC` until they re-register.
- **Frequency** (`daily` / `2x` / `weekly`) is not yet differentiated — everyone is
  treated as daily. Extend the window logic in `index.ts` if you want 2x/weekly.
- The local-notification path (`rescheduleDailyAffirmation`) still works as a fallback;
  once server push is live you may want to stop scheduling the repeating local one to
  avoid two notifications. (Left in place for now so nothing breaks before you deploy.)
