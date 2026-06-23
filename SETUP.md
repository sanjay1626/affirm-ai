# AffirmAI — Complete Setup Guide

## Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Supabase account (free): https://supabase.com
- OpenAI account (optional for AI): https://platform.openai.com
- Expo Go app on your phone (iOS or Android)

---

## STEP 1 — Install dependencies

```bash
cd affirm-ai
npm install
```

---

## STEP 2 — Create a Supabase project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Name it "affirm-ai", choose a strong database password, pick a region
4. Wait ~2 minutes for it to initialize

---

## STEP 3 — Run the SQL migration

1. In Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open the file `supabase/migrations/001_initial_schema.sql`
4. Copy the ENTIRE contents and paste it into the SQL editor
5. Click **Run**
6. You should see "Success. No rows returned."
7. Go to **Table Editor** — you should see 8 tables created

---

## STEP 4 — Set up environment variables

1. In your project root, copy the example file:
   ```bash
   cp .env.example .env
   ```

2. In Supabase dashboard, go to **Settings → API**
3. Copy:
   - **Project URL** → paste as `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** key → paste as `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Your `.env` file should look like:
```
EXPO_PUBLIC_SUPABASE_URL=https://abcdefghijkl.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## STEP 5 — Deploy the Supabase Edge Function

### Install Supabase CLI
```bash
npm install -g supabase
```

### Login and link your project
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```
(Your project ref is in the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`)

### Set the OpenAI secret
```bash
supabase secrets set OPENAI_API_KEY=sk-your-openai-key-here
```

### Deploy the function
```bash
supabase functions deploy generate-affirmation --no-verify-jwt
```

Wait — don't use `--no-verify-jwt` in production. Remove it after testing.

Actually for this app we DO need JWT (the function reads the user's data), so deploy like:
```bash
supabase functions deploy generate-affirmation
```

### Verify deployment
In Supabase dashboard → **Edge Functions** — you should see `generate-affirmation` listed.

---

## STEP 6 — Run the app

```bash
npx expo start
```

This opens the Expo developer tools. Then:
- **On your phone**: Open Expo Go → Scan the QR code
- **iOS Simulator**: Press `i` in the terminal
- **Android Emulator**: Press `a` in the terminal

---

## STEP 7 — Test authentication

1. Open the app → tap **Get Started**
2. On Register screen: enter name, email, password → tap **Create Account**
3. Check your email for the confirmation link → click it
4. Go back to app → tap **Sign In** → enter your credentials
5. You should be taken to the **Onboarding Flow**

**If you don't want email confirmation during testing:**
- Supabase Dashboard → **Authentication → Settings**
- Under **Email Auth** → turn off **Confirm email**

---

## STEP 8 — Complete onboarding

Go through all 7 onboarding steps:
1. Enter your name
2. Select your goals (pick a few)
3. Select your struggles
4. Pick life areas
5. Choose your tone
6. Pick notification time and frequency
7. Add optional personal context → tap **Finish Setup**

When prompted, **allow notifications**.

---

## STEP 9 — Test AI generation

On the Home screen:
1. You'll see the "Generate today's affirmation" card
2. Tap it — this calls the Supabase Edge Function
3. Wait 2-5 seconds — your personalized affirmation appears!
4. Navigate to **Daily Affirmation** screen to see the full view with reason

**If AI generation fails**: Check:
- Edge function is deployed: `supabase functions list`
- OpenAI key is set: `supabase secrets list`
- Check function logs: `supabase functions logs generate-affirmation`

**Without an OpenAI key**: The function returns a fallback affirmation automatically.

---

## STEP 10 — Test notifications

### Method 1: Test button in app
1. Go to **Settings** tab
2. Scroll to "Testing" section
3. Tap **Send Test Notification**
4. In 3 seconds, a notification should appear

### Method 2: Physical device
Notifications only work on real devices or Expo Go on a real device.
They do NOT work in iOS Simulator (but Android Emulator works).

### Method 3: From terminal (after getting your push token)
```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{"to": "ExponentPushToken[your-token]", "title": "Test", "body": "Hello from AffirmAI!"}'
```

---

## STEP 11 — Deploy Edge Functions to production

Already done in Step 5. To update after code changes:
```bash
supabase functions deploy generate-affirmation
```

To view logs:
```bash
supabase functions logs generate-affirmation --tail
```

---

## STEP 12 — Prepare for app store deployment

### Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

### Configure EAS
```bash
eas build:configure
```

### Create a build
```bash
# For Android (APK for testing)
eas build -p android --profile preview

# For iOS (requires Apple Developer account)
eas build -p ios --profile preview
```

### Submit to stores
```bash
eas submit -p android
eas submit -p ios
```

### Important before submitting:
1. Replace placeholder assets in `assets/` with real PNG images
2. Update `app.json` with your real EAS project ID
3. Set up production environment variables in `eas.json`

---

## Troubleshooting

### "Missing Supabase env vars" error
- Make sure your `.env` file exists and has valid values
- Restart the Expo dev server after changing `.env`

### "Unauthorized" from Edge Function
- Make sure the user is logged in before calling the function
- Check that the Supabase URL and anon key in `.env` match your project

### Notifications not appearing
- On iOS: Make sure you granted notification permission
- On Simulator: Push notifications don't work; use a real device
- Check Settings → Test Notification to verify local notifications work

### Edge Function not found
- Run `supabase functions list` to verify it's deployed
- Make sure your `supabase link` used the correct project ref

### Database tables not found
- Re-run the SQL migration file
- Check Supabase → Table Editor to verify tables exist
