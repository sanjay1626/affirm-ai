# AffirmAI

A personalized daily affirmation companion powered by AI. Built with React Native (Expo), Supabase, and Claude AI.

## Features

- **AI-generated affirmations** — Personalized daily affirmations and quotes using Claude claude-haiku-4-5, tailored to your goals, struggles, and preferred tone
- **7-step onboarding** — Collects your name, goals, life areas, preferred tone, and notification schedule
- **Mood tracking** — Log and review your daily mood with optional notes
- **Private journal** — Write, edit, and delete personal journal entries
- **Favorites** — Save and share affirmations you want to return to
- **Daily push notifications** — Scheduled reminders at your chosen time with your actual affirmation text
- **Daily quote** — An AI-selected inspiring quote paired with each affirmation

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile framework | React Native + Expo SDK 52 |
| Backend / Auth / DB | Supabase (PostgreSQL + Row Level Security) |
| AI | Anthropic Claude claude-haiku-4-5 via Supabase Edge Function |
| Notifications | expo-notifications (mobile) |
| Navigation | React Navigation (Stack + Bottom Tabs) |
| Language | TypeScript |

## Project Structure

```
affirm-ai/
├── src/
│   ├── components/       # Shared UI components (Button, Input, etc.)
│   ├── context/          # AuthContext — session + onboarding state
│   ├── navigation/       # AppNavigator, AuthNavigator, MainTabNavigator
│   ├── screens/          # All app screens
│   │   └── onboarding/   # 7-step onboarding flow
│   ├── services/         # Supabase queries (affirmations, mood, journal, etc.)
│   └── utils/            # Colors, spacing, and design tokens
├── supabase/
│   ├── functions/        # Deno edge functions
│   │   └── generate-affirmation/
│   └── migrations/       # SQL schema (001_initial_schema.sql)
└── assets/
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Supabase account — [supabase.com](https://supabase.com)
- Anthropic account with API credits — [console.anthropic.com](https://console.anthropic.com)

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a new Supabase project
2. Run `supabase/migrations/001_initial_schema.sql` in the **SQL Editor**
3. Copy your project URL and anon key

### 3. Configure environment variables

Create a `.env` file at the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Deploy the edge function

```bash
supabase login
supabase link --project-ref your-project-ref
supabase functions deploy generate-affirmation
```

### 5. Set the Anthropic API secret

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 6. Run the app

```bash
# Web (development)
npx expo start --web

# iOS / Android
npx expo start
# Then scan the QR code with Expo Go
```

## Database Schema

8 tables, all with Row Level Security enabled:

| Table | Purpose |
|---|---|
| `profiles` | Auto-created on signup |
| `onboarding_answers` | User preferences from onboarding |
| `affirmations` | AI-generated affirmations per user per day |
| `quotes` | AI-generated daily quotes |
| `mood_logs` | Daily mood check-ins |
| `journal_entries` | Private journal entries |
| `favorites` | Saved affirmations |
| `notification_preferences` | Push token + scheduling preferences |

## Edge Function

`generate-affirmation` is a Deno function that:

1. Authenticates the caller via JWT
2. Reads the user's onboarding profile and recent mood history from the database
3. Builds a personalized prompt
4. Calls **Claude claude-haiku-4-5** (Anthropic) with fallback to OpenAI gpt-4o-mini if available
5. Saves the result to `affirmations` and `quotes` tables
6. Returns the generated content with an `id` and `source` field

If no API keys are available, it returns one of three built-in fallback affirmations.

## Deployment

The app is built with Expo and can be deployed to:
- **iOS** via EAS Build + App Store
- **Android** via EAS Build + Google Play
- **Web** via `npx expo export --platform web`

```bash
# Install EAS CLI
npm install -g eas-cli

# Build for production
eas build --platform all
```

## License

MIT
