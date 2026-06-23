// Supabase Edge Function: generate-affirmation
// Deployed to: supabase functions deploy generate-affirmation
//
// Required environment secrets:
//   ANTHROPIC_API_KEY  — Anthropic Claude key (primary)
//   OPENAI_API_KEY     — OpenAI key (fallback)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FALLBACKS = [
  {
    affirmation_text: "I am enough exactly as I am, and I grow stronger with each passing day.",
    quote_text: "The secret of getting ahead is getting started.",
    quote_author: "Mark Twain",
    reflection: "This affirmation grounds you in your inherent worth — a universal truth that gains power each time you return to it.",
    category: "self-esteem",
    tone: "gentle",
  },
  {
    affirmation_text: "I choose to release what I cannot control and focus on what brings me peace.",
    quote_text: "Almost everything will work again if you unplug it for a few minutes — including you.",
    quote_author: "Anne Lamott",
    reflection: "When the mind races toward what's uncertain, this affirmation anchors you in the present — the only place where peace actually lives.",
    category: "anxiety",
    tone: "gentle",
  },
  {
    affirmation_text: "Every small step I take today is building the life I deserve tomorrow.",
    quote_text: "You don't have to be great to start, but you have to start to be great.",
    quote_author: "Zig Ziglar",
    reflection: "Progress is rarely visible in the moment. This affirmation invites you to trust the accumulation of small, consistent actions.",
    category: "productivity",
    tone: "motivational",
  },
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let requestType = "daily";
    let journalContext = "";
    try {
      const body = await req.json();
      requestType = body?.type ?? "daily";
      journalContext = body?.journalContext ?? "";
    } catch { /* no body */ }

    // Fetch user data in parallel
    const [onboardingRes, moodsRes, journalRes] = await Promise.all([
      supabase.from("onboarding_answers").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("mood_logs").select("mood, mood_label, note, logged_at")
        .eq("user_id", user.id).order("logged_at", { ascending: false }).limit(5),
      supabase.from("journal_entries").select("body, created_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
    ]);

    const onboarding = onboardingRes.data;
    const recentMoods = moodsRes.data ?? [];
    const recentJournals = journalRes.data ?? [];

    const userName = onboarding?.preferred_name ?? "friend";
    const goals = (onboarding?.main_goals ?? []).join(", ") || "personal growth";
    const struggles = (onboarding?.current_struggles ?? []).join(", ") || "daily challenges";
    const lifeAreas = (onboarding?.life_areas ?? []).join(", ") || "general wellbeing";
    const tone = onboarding?.preferred_tone ?? "motivational";
    const personalContext = onboarding?.personal_context ?? "";

    const moodSummary = recentMoods.length
      ? recentMoods.map((m: { mood: number; mood_label: string; note?: string }) =>
          `${m.mood_label}(${m.mood}/5)${m.note ? `: "${m.note}"` : ""}`
        ).join(", ")
      : "no recent mood data";

    const journalSummary = journalContext ||
      (recentJournals.length
        ? recentJournals.map((j: { body: string }) => j.body.slice(0, 120)).join(" / ")
        : "no journal entries yet");

    const systemPrompt = `You are a compassionate, perceptive affirmation coach — like a wise friend who truly knows the user.
You craft affirmations that feel personal, not generic. Your reflection field is what sets you apart: a warm, specific 2-3 sentence paragraph that feels like a handwritten note, not a template.
Always respond with valid JSON only — no markdown, no extra text.`;

    const userPrompt = `Create a deeply personalized affirmation for ${userName}.

User profile:
- Goals: ${goals}
- Current struggles: ${struggles}
- Life focus areas: ${lifeAreas}
- Preferred tone: ${tone}
- Personal context: ${personalContext || "none provided"}
- Recent moods: ${moodSummary}
- Recent journal themes: ${journalSummary}
- Request type: ${requestType}

Affirmation rules:
- First person ("I am...", "I choose...", "I have...", "I trust...")
- Tone must be ${tone}
- Under 55 words
- Addresses their specific goals or struggles
- Feels intimate, not like a poster quote

Reflection rules (the most important field):
- 2-3 warm sentences written as if to the user personally
- Reference at least one specific goal or struggle they named
- If mood data shows a pattern (e.g. consistently low), acknowledge it gently
- If there are journal themes, weave them in subtly
- End with a gentle encouragement
- Write as a trusted mentor, not an AI

Respond with ONLY this JSON:
{
  "affirmation_text": "...",
  "quote_text": "...",
  "quote_author": "...",
  "reflection": "...",
  "category": "one of: confidence | career | anxiety | self_love | relationships | productivity | spirituality | gratitude | health | creativity",
  "tone": "${tone}"
}`;

    if (!anthropicKey && !openaiKey) {
      const fallback = { ...FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)], source: "fallback:no_key" };
      const id = await saveToDatabase(supabase, user.id, fallback, requestType);
      return new Response(JSON.stringify({ ...fallback, id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let aiContent: string | null = null;

    // ── Try Anthropic Claude ────────────────────────────────────────────────────
    if (anthropicKey) {
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (claudeRes.ok) {
        const d = await claudeRes.json();
        aiContent = d.content?.[0]?.text ?? null;
      } else {
        console.error("Claude error:", await claudeRes.text());
      }
    }

    // ── Fall back to OpenAI ─────────────────────────────────────────────────────
    if (!aiContent && openaiKey) {
      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.88,
          max_tokens: 500,
          response_format: { type: "json_object" },
        }),
      });

      if (openaiRes.ok) {
        const d = await openaiRes.json();
        aiContent = d.choices?.[0]?.message?.content ?? null;
      } else {
        console.error("OpenAI error:", await openaiRes.text());
      }
    }

    if (!aiContent) {
      const fallback = { ...FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)], source: "fallback:ai_error" };
      const id = await saveToDatabase(supabase, user.id, fallback, requestType);
      return new Response(JSON.stringify({ ...fallback, id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clean = aiContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const parsed = JSON.parse(clean);

    if (!parsed.affirmation_text || !parsed.quote_text) throw new Error("Invalid AI response structure");

    const result = { ...parsed, source: "ai" };
    const id = await saveToDatabase(supabase, user.id, result, requestType);

    return new Response(JSON.stringify({ ...result, id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", String(error));
    const fallback = { ...FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)], source: "fallback:exception" };
    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function saveToDatabase(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  data: {
    affirmation_text: string;
    quote_text: string;
    quote_author?: string;
    reflection?: string;
    category?: string;
    tone?: string;
  },
  requestType: string
): Promise<string | null> {
  const today = new Date().toISOString().split("T")[0];

  const { data: inserted } = await supabase
    .from("affirmations")
    .insert({
      user_id: userId,
      affirmation_text: data.affirmation_text,
      category: data.category ?? "general",
      tone: data.tone ?? "motivational",
      reason: data.reflection ?? "",
      generated_for: today,
      is_daily: requestType === "daily",
    })
    .select("id")
    .single();

  if (requestType === "daily") {
    await supabase.from("quotes").insert({
      user_id: userId,
      quote_text: data.quote_text,
      quote_author: data.quote_author ?? "Unknown",
      category: data.category ?? "general",
      generated_for: today,
    });
  }

  return inserted?.id ?? null;
}
