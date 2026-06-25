// Supabase Edge Function: send-daily-notifications
// Invoked by a pg_cron schedule (see README.md), NOT by the app.
//
// For every user whose LOCAL time has just reached their preferred notification
// time, it generates a fresh personalized affirmation and pushes it to their
// device via the Expo Push API — so they get a new affirmation each day without
// opening the app.
//
// Required environment secrets (set with `supabase secrets set ...`):
//   SUPABASE_URL                — auto-provided
//   SUPABASE_SERVICE_ROLE_KEY   — service role (bypasses RLS to read all users)
//   ANTHROPIC_API_KEY           — primary AI
//   OPENAI_API_KEY              — fallback AI
//   CRON_SECRET                 — shared secret the cron job sends in a header

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// How often the cron runs (minutes). MUST match the cron schedule in README.md.
const TICK_MINUTES = 15;

const FALLBACKS = [
  "I am enough exactly as I am, and I grow stronger with each passing day.",
  "I choose to release what I cannot control and focus on what brings me peace.",
  "Every small step I take today is building the life I deserve tomorrow.",
];

interface Pref {
  user_id: string;
  expo_push_token: string | null;
  notification_time: string | null;
  timezone: string | null;
  enabled: boolean;
  last_notified_on: string | null;
}

// ── Local time helpers ──────────────────────────────────────────────────────────

function localParts(tz: string, now: Date): { date: string; minutesOfDay: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
  const parts = fmt.formatToParts(now).reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {} as Record<string, string>);
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const minutesOfDay = parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10);
  return { date, minutesOfDay };
}

function parseHHMM(t: string): number | null {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

// ── AI generation (compact, service-role context) ───────────────────────────────

async function generateAffirmation(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  anthropicKey?: string,
  openaiKey?: string,
): Promise<{ text: string; category: string; tone: string; reflection: string }> {
  const [onboardingRes, moodsRes] = await Promise.all([
    supabase.from("onboarding_answers").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("mood_logs").select("mood, mood_label").eq("user_id", userId)
      .order("logged_at", { ascending: false }).limit(3),
  ]);
  const onboarding = onboardingRes.data as Record<string, unknown> | null;
  const moods = (moodsRes.data ?? []) as { mood: number; mood_label: string }[];

  const tone = (onboarding?.preferred_tone as string) ?? "motivational";
  const goals = ((onboarding?.main_goals as string[]) ?? []).join(", ") || "personal growth";
  const struggles = ((onboarding?.current_struggles as string[]) ?? []).join(", ") || "daily challenges";
  const moodSummary = moods.length ? moods.map(m => `${m.mood_label}(${m.mood}/5)`).join(", ") : "no recent moods";

  const system = `You are a compassionate affirmation coach. Respond with valid JSON only — no markdown.`;
  const prompt = `Create a personalized daily affirmation.
Goals: ${goals}. Struggles: ${struggles}. Recent moods: ${moodSummary}. Tone: ${tone}.
Rules: first person, under 45 words, ${tone} tone, addresses their goals/struggles.
Respond ONLY as JSON:
{"affirmation_text":"...","reflection":"...","category":"confidence|career|anxiety|self_love|relationships|productivity|spirituality|gratitude|health|creativity","tone":"${tone}"}`;

  const raw = await callAI(anthropicKey, openaiKey, system, prompt);
  if (raw) {
    try {
      const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      const p = JSON.parse(clean);
      if (p.affirmation_text) {
        return {
          text: p.affirmation_text,
          category: p.category ?? "general",
          tone: p.tone ?? tone,
          reflection: p.reflection ?? "",
        };
      }
    } catch { /* fall through to fallback */ }
  }
  return {
    text: FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)],
    category: "general",
    tone,
    reflection: "",
  };
}

async function callAI(
  anthropicKey: string | undefined,
  openaiKey: string | undefined,
  system: string,
  prompt: string,
): Promise<string | null> {
  if (anthropicKey) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (res.ok) {
      const d = await res.json();
      const t = d.content?.[0]?.text ?? null;
      if (t) return t;
    }
  }
  if (openaiKey) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
        temperature: 0.85, max_tokens: 400,
        response_format: { type: "json_object" },
      }),
    });
    if (res.ok) {
      const d = await res.json();
      return d.choices?.[0]?.message?.content ?? null;
    }
  }
  return null;
}

// ── Expo push ────────────────────────────────────────────────────────────────────

async function sendExpoPush(token: string): Promise<boolean> {
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({
      to: token,
      title: "🧘 Daily Practice",
      body: "Take 5 minutes to repeat your affirmation.",
      sound: "default",
      data: { screen: "Home", mode: "practice" },
    }),
  });
  return res.ok;
}

// ── Handler ───────────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Only the cron job (which knows CRON_SECRET) may invoke this.
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  const supabase = createClient(supabaseUrl, serviceKey);
  const now = new Date();

  // All users who want notifications and have a usable push token.
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id, expo_push_token, notification_time, timezone, enabled, last_notified_on")
    .eq("enabled", true)
    .not("expo_push_token", "is", null);

  let sent = 0, skipped = 0, failed = 0;

  for (const pref of (prefs ?? []) as Pref[]) {
    const token = pref.expo_push_token;
    if (!token || token === "local-only") { skipped++; continue; }

    const tz = pref.timezone || "UTC";
    const notifMinutes = parseHHMM(pref.notification_time || "08:00");
    if (notifMinutes === null) { skipped++; continue; }

    const { date: localDate, minutesOfDay } = localParts(tz, now);

    // Already sent today?
    if (pref.last_notified_on === localDate) { skipped++; continue; }

    // Is now within the window that just passed their preferred time?
    const diff = minutesOfDay - notifMinutes;
    if (diff < 0 || diff >= TICK_MINUTES) { skipped++; continue; }

    try {
      const affirmation = await generateAffirmation(supabase, pref.user_id, anthropicKey, openaiKey);

      // Save it as today's daily affirmation so it shows up in-app too.
      await supabase.from("affirmations").insert({
        user_id: pref.user_id,
        affirmation_text: affirmation.text,
        category: affirmation.category,
        tone: affirmation.tone,
        reason: affirmation.reflection,
        generated_for: localDate,
        is_daily: true,
      });

      const ok = await sendExpoPush(token);
      if (ok) {
        await supabase
          .from("notification_preferences")
          .update({ last_notified_on: localDate })
          .eq("user_id", pref.user_id);
        sent++;
      } else {
        failed++;
      }
    } catch (e) {
      console.error("Failed for user", pref.user_id, String(e));
      failed++;
    }
  }

  return new Response(JSON.stringify({ sent, skipped, failed, checked: prefs?.length ?? 0 }), {
    headers: { "Content-Type": "application/json" },
  });
});
