// Supabase Edge Function: generate-affirmation
// Deployed to: supabase functions deploy generate-affirmation
//
// Env secrets:
//   ANTHROPIC_API_KEY, OPENAI_API_KEY
//   AFFIRMATION_SOURCE — "library" | "ai"  (Discover kill-switch; Home is ALWAYS AI)
//
// Request body:
//   { surface?: "home"|"discover", type?, category?, excludeTexts?, mode?, journalContext? }
//
// Routing:
//   - type "journal_insight"        → reflective insight (unchanged)
//   - surface "discover"            → library Anchor + 2 Companions (+1 reflection); AI-triad fallback
//   - surface "home" OR no category → AI single reflective affirmation (always AI)
//   - no surface + category (legacy)→ single library line if AFFIRMATION_SOURCE=library, else AI

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  selectAffirmation, selectTriad, orderByRecency,
  type LibraryRow, type SelectionContext, type Triad,
} from "../_shared/selection.ts";
import { derivePersonality } from "../_shared/onboardingTagMap.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORY_LABELS: Record<string, string> = {
  confidence: "Confidence", career: "Career", anxiety_stress: "Anxiety & Stress",
  self_love: "Self-Love", relationships: "Relationships", productivity: "Productivity",
  gratitude: "Gratitude", spirituality: "Spirituality", financial_confidence: "Financial Confidence",
  health_wellness: "Health & Wellness", creativity: "Creativity", purpose_meaning: "Purpose & Meaning",
  resilience: "Resilience", emotional_wellness: "Emotional Wellness",
};

const CATEGORY_GUIDANCE: Record<string, string> = {
  confidence: "Self-assurance, self-worth, owning their presence.",
  career: "Professional growth, ambition, skill, purpose at work.",
  anxiety_stress: "Calming and grounding — safety, breath, releasing worry.",
  self_love: "Self-acceptance and the kindness they'd give a friend.",
  relationships: "Connection, healthy boundaries, belonging.",
  productivity: "Momentum, focus, steady meaningful progress.",
  gratitude: "Appreciation, abundance, noticing the good already here.",
  spirituality: "Meaning, inner stillness, trust in life.",
  financial_confidence: "A calm, clear money mindset — agency without fear.",
  health_wellness: "The body, energy, rest, gentle sustainable strength.",
  creativity: "Imagination, expression, the courage to create.",
  purpose_meaning: "Direction, what matters, living in alignment.",
  resilience: "Recovering, courage, beginning again.",
  emotional_wellness: "Feeling, processing, gentleness with oneself.",
};

const CATEGORY_FALLBACKS: Record<string, string[]> = {
  confidence: ["I trust my own voice.", "My doubts are not facts.", "I take up space."],
  career: ["I build slowly and on purpose.", "Skill follows showing up.", "My effort compounds quietly."],
  anxiety_stress: ["I release what I cannot control.", "This feeling will pass.", "I return to my breath."],
  self_love: ["I am on my own side.", "I speak to myself gently.", "I am kind to myself today."],
  relationships: ["My boundaries protect my peace.", "I belong where I am valued.", "I let love be slow."],
  productivity: ["Clarity follows action.", "Small steps still move me.", "I begin where I am."],
  gratitude: ["I notice the good already here.", "I let enough be enough.", "Today gave me something."],
  spirituality: ["I trust the unfolding.", "Stillness is always available.", "I move with purpose."],
  financial_confidence: ["I make calm, clear decisions.", "I trust myself with money.", "I plan instead of worry."],
  health_wellness: ["My body deserves my patience.", "Rest is productive too.", "Energy returns with care."],
  creativity: ["I create before I judge.", "Curiosity leads the way.", "I follow the interesting thread."],
  purpose_meaning: ["I move toward what matters.", "Meaning is built, not found.", "I follow what feels true."],
  resilience: ["I bend without breaking.", "I begin again, gently.", "Hard seasons end."],
  emotional_wellness: ["My feelings are allowed here.", "I sit with what is.", "I let it move through me."],
  general: ["I trust my pace.", "I begin where I am.", "I move with purpose."],
};

const GENERIC_QUOTE = {
  quote_text: "The journey of a thousand miles begins with a single step.",
  quote_author: "Lao Tzu",
};
const INSIGHT_FALLBACK =
  "Looking back over your recent entries, there's a thread of someone working honestly through what's in front of them. Whatever you're carrying, the act of writing it down is itself a step toward clarity. Be as patient with yourself as you would be with a good friend.";

// ── AI + parsing helpers ──────────────────────────────────────────────────────────

async function callAI(
  anthropicKey: string | undefined, openaiKey: string | undefined,
  systemPrompt: string, userPrompt: string,
): Promise<string | null> {
  if (anthropicKey) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", max_tokens: 500,
        system: systemPrompt, messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (res.ok) {
      const d = await res.json();
      const text = d.content?.[0]?.text ?? null;
      if (text) return text;
    } else console.error("Claude error:", await res.text());
  }
  if (openaiKey) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        temperature: 0.9, max_tokens: 500, response_format: { type: "json_object" },
      }),
    });
    if (res.ok) {
      const d = await res.json();
      return d.choices?.[0]?.message?.content ?? null;
    } else console.error("OpenAI error:", await res.text());
  }
  return null;
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
}
function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
const SLUG_OVERRIDES: Record<string, string> = { "comparison-to-others": "comparison", "grief-or-loss": "grief-loss" };
function toSlug(label: string): string { const s = slugify(label); return SLUG_OVERRIDES[s] ?? s; }

interface ReflectionInputs {
  userName: string; goals: string[]; struggles: string[];
  lifeAreas: string; moodSummary: string; journalSummary: string;
}

// ── Single-line reflection (legacy category path) ─────────────────────────────────

function templateReflection(ctx: ReflectionInputs): string {
  const g = ctx.goals[0], s = ctx.struggles[0];
  if (g && g !== "(not specified)") return `A quiet companion for your focus on ${g.toLowerCase()} — let it sit with you today.`;
  if (s && s !== "(not specified)") return `A steadying line for the fuller days — let it be the one you come back to.`;
  return `A line to return to whenever you want steadier ground.`;
}

async function buildReflection(
  row: LibraryRow, ctx: ReflectionInputs, aKey: string | undefined, oKey: string | undefined,
): Promise<{ text: string; templated: boolean }> {
  if (!aKey && !oKey) return { text: templateReflection(ctx), templated: true };
  const label = CATEGORY_LABELS[row.category] ?? row.category;
  const system = `You are a warm, thoughtful companion — like a wise friend, or a favorite author writing a note in the margin.
A short affirmation has been chosen for the reader. Reflect on why these words suit the season they are in.
You did NOT write the line — never claim to. Never sound clinical, diagnostic, or therapeutic; never analyze the person or imply any psychological assessment. Respond with valid JSON only.`;
  const prompt = `The affirmation: "${row.text}"  (theme: ${label})

A little about their season right now:
- Goals: ${ctx.goals.join(", ")}
- On their mind: ${ctx.struggles.join(", ")}
- Recent moods: ${ctx.moodSummary}
- Recent journal themes: ${ctx.journalSummary}

Write 2-3 concise sentences about why this line naturally fits where they are right now. Warm, thoughtful, intellectually reflective, quietly encouraging. Touch one real detail above as a passing observation, never analysis — and never "this addresses your X pattern". It should read like a page from a thoughtful book, not a counseling session. No clichés ("your journey", "embrace"). Do not claim to have written the line.
Respond with ONLY this JSON: { "reflection": "..." }`;
  const raw = await callAI(aKey, oKey, system, prompt);
  if (!raw) return { text: templateReflection(ctx), templated: true };
  try { const p = JSON.parse(stripFences(raw)); if (p.reflection) return { text: String(p.reflection), templated: false }; } catch { /* */ }
  return { text: templateReflection(ctx), templated: true };
}

// ── Triad-level reflection (Discover) ─────────────────────────────────────────────

function templateTriadReflection(category: string, ctx: ReflectionInputs): string {
  const label = (CATEGORY_LABELS[category] ?? category).toLowerCase();
  const g = ctx.goals[0], s = ctx.struggles[0];
  if (g && g !== "(not specified)") return `A ${label} set to keep company with your focus on ${g.toLowerCase()} — start with the anchor.`;
  if (s && s !== "(not specified)") return `A ${label} set for the fuller days — let the anchor be the one you return to.`;
  return `A ${label} set to sit with today — begin with the anchor.`;
}

async function buildTriadReflection(
  category: string, anchorText: string, companionTexts: string[],
  ctx: ReflectionInputs, aKey: string | undefined, oKey: string | undefined,
): Promise<{ text: string; templated: boolean }> {
  if (!aKey && !oKey) return { text: templateTriadReflection(category, ctx), templated: true };
  const label = CATEGORY_LABELS[category] ?? category;
  const system = `You are a warm, thoughtful companion — like a wise friend, or a favorite author writing a note in the margin.
The reader is exploring a theme; three short affirmations have been chosen for them. Reflect on why this theme and these words suit the season they are in.
You did NOT write the lines — never claim to. Never sound clinical, diagnostic, or therapeutic; never analyze the person or imply any psychological assessment. Respond with valid JSON only.`;
  const prompt = `Theme: ${label}
The set:
- Anchor: "${anchorText}"
- Companion: "${companionTexts[0] ?? ""}"
- Companion: "${companionTexts[1] ?? ""}"

A little about their season right now:
- Goals: ${ctx.goals.join(", ")}
- On their mind: ${ctx.struggles.join(", ")}
- Recent moods: ${ctx.moodSummary}
- Recent journal themes: ${ctx.journalSummary}

Write 2-3 concise sentences about why this set naturally fits where they are right now — let the Anchor lead. Warm, thoughtful, intellectually reflective, quietly encouraging. Touch one real detail above as a passing observation, never analysis — and never "this addresses your X pattern". It should read like a page from a thoughtful book, not a counseling session. No clichés. Do not claim to have written the lines.
Respond with ONLY this JSON: { "reflection": "..." }`;
  const raw = await callAI(aKey, oKey, system, prompt);
  if (!raw) return { text: templateTriadReflection(category, ctx), templated: true };
  try { const p = JSON.parse(stripFences(raw)); if (p.reflection) return { text: String(p.reflection), templated: false }; } catch { /* */ }
  return { text: templateTriadReflection(category, ctx), templated: true };
}

// ── AI fallbacks ──────────────────────────────────────────────────────────────────

function pickFallback(category: string | undefined, exclude: string[]) {
  const pool = (category && CATEGORY_FALLBACKS[category]) || CATEGORY_FALLBACKS.general;
  const fresh = pool.filter((t) => !exclude.includes(t));
  const list = fresh.length ? fresh : pool;
  const text = list[Math.floor(Math.random() * list.length)];
  return { affirmation_text: text, ...GENERIC_QUOTE, reflection: "Chosen to meet you where you are today.", category: category ?? "general", tone: "gentle" };
}

function fallbackTriadFromPool(category: string | undefined): { anchor: string; companions: string[] } {
  const pool = (category && CATEGORY_FALLBACKS[category]) || CATEGORY_FALLBACKS.general;
  const uniq = [...new Set([...pool, ...CATEGORY_FALLBACKS.general])];
  return { anchor: uniq[0], companions: [uniq[1] ?? uniq[0], uniq[2] ?? uniq[1] ?? uniq[0]] };
}

async function aiTriadFallback(
  category: string | undefined, ctx: ReflectionInputs, aKey: string | undefined, oKey: string | undefined,
): Promise<{ anchor: string; companions: string[] }> {
  if (!aKey && !oKey) return fallbackTriadFromPool(category);
  const label = category ? (CATEGORY_LABELS[category] ?? category) : "general wellbeing";
  const guidance = category ? (CATEGORY_GUIDANCE[category] ?? "") : "";
  const system = `You write short affirmations in a curated, reflective style — each 3 to 12 words. Never a long paragraph, never motivational-poster language. Respond with valid JSON only.`;
  const prompt = `Theme: ${label}. ${guidance}
For ${ctx.userName}. Goals: ${ctx.goals.join(", ")}. Struggles: ${ctx.struggles.join(", ")}. Recent moods: ${ctx.moodSummary}.
Produce ONE Anchor (a strong, standalone line they could repeat daily) and TWO Companions (supporting lines). All three: 3-12 words, first person or quiet aphorism, on-theme, reflective, all different.
Respond with ONLY this JSON: { "anchor": "...", "companions": ["...", "..."] }`;
  const raw = await callAI(aKey, oKey, system, prompt);
  if (raw) {
    try {
      const p = JSON.parse(stripFences(raw));
      if (p.anchor && Array.isArray(p.companions) && p.companions.length >= 2) {
        return { anchor: String(p.anchor), companions: [String(p.companions[0]), String(p.companions[1])] };
      }
    } catch { /* */ }
  }
  return fallbackTriadFromPool(category);
}

// ── Library selection plumbing (shared by single + triad) ─────────────────────────

interface Prep {
  ctx: SelectionContext;
  recentIds: Set<string>;
  hist: { library_id: string; shown_on: string }[];
  fetchScope: (scope: string[] | null) => Promise<LibraryRow[]>;
  scope: string[] | null;
}

// deno-lint-ignore no-explicit-any
async function prepareSelection(
  supabase: any, userId: string, category: string | undefined,
  // deno-lint-ignore no-explicit-any
  onboarding: any, recentMoods: { mood: number }[], goalsArr: string[], strugglesArr: string[],
): Promise<Prep> {
  const personality = derivePersonality({
    main_goals: onboarding?.main_goals, current_struggles: onboarding?.current_struggles,
    life_areas: onboarding?.life_areas, preferred_tone: onboarding?.preferred_tone,
  });
  supabase.from("user_personality").upsert({
    user_id: userId, preferred_tones: personality.preferred_tones,
    energy_pref: personality.energy_pref, focus_tags: personality.focus_tags, avoid_tags: personality.avoid_tags,
  }, { onConflict: "user_id" }).then(() => {}, () => {});

  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const { data: hist } = await supabase.from("user_affirmation_history")
    .select("library_id, shown_on").eq("user_id", userId).gte("shown_on", cutoff);
  const { count: historyCount } = await supabase.from("user_affirmation_history")
    .select("id", { count: "exact", head: true }).eq("user_id", userId);

  const recentIds = new Set((hist ?? []).map((h: { library_id: string }) => h.library_id));
  const moodAvg = recentMoods.length ? recentMoods.reduce((s, m) => s + m.mood, 0) / recentMoods.length : null;

  const ctx: SelectionContext = {
    personality: {
      preferred_tones: personality.preferred_tones, energy_pref: personality.energy_pref,
      focus_tags: personality.focus_tags, focus_categories: personality.focus_categories,
    },
    goalStruggleSlugs: [...goalsArr, ...strugglesArr].map(toSlug),
    moodAvg, historyCount: historyCount ?? 0,
  };

  const COLS = "id, text, category, tones, energy, difficulty, tags, addresses, anchor_eligible";
  // deno-lint-ignore no-explicit-any
  const mapRow = (r: any): LibraryRow => ({ ...r, anchorEligible: r.anchor_eligible });
  const fetchScope = async (scope: string[] | null): Promise<LibraryRow[]> => {
    let q = supabase.from("affirmation_library").select(COLS).eq("is_active", true);
    if (scope && scope.length) q = q.in("category", scope);
    const { data } = await q;
    return (data ?? []).map(mapRow);
  };

  const scope = category ? [category] : (personality.focus_categories.length ? personality.focus_categories : null);
  return { ctx, recentIds, hist: (hist ?? []) as { library_id: string; shown_on: string }[], fetchScope, scope };
}

function recencyMap(hist: { library_id: string; shown_on: string }[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const h of hist) {
    const days = Math.floor((Date.now() - new Date(h.shown_on).getTime()) / 86400000);
    if (m[h.library_id] === undefined || days < m[h.library_id]) m[h.library_id] = days;
  }
  return m;
}

interface Selected { row: LibraryRow; sourceTag: string; }
async function selectSingle(prep: Prep): Promise<Selected | null> {
  const inScope = await prep.fetchScope(prep.scope);
  const fresh = inScope.filter((r) => !prep.recentIds.has(r.id));
  let pick = selectAffirmation(fresh, prep.ctx, "library");
  if (!pick && inScope.length) {
    const recycled = orderByRecency(inScope, recencyMap(prep.hist)).slice(0, 8);
    pick = selectAffirmation(recycled, prep.ctx, "library:recycled");
  }
  if (!pick && prep.scope) {
    const all = (await prep.fetchScope(null)).filter((r) => !prep.recentIds.has(r.id));
    pick = selectAffirmation(all, prep.ctx, "library:broadened");
  }
  return pick ? { row: pick.row, sourceTag: pick.sourceTag } : null;
}

async function selectTriadFromLibrary(prep: Prep): Promise<Triad | null> {
  const inScope = await prep.fetchScope(prep.scope);
  const fresh = inScope.filter((r) => !prep.recentIds.has(r.id));
  let triad = selectTriad(fresh, prep.ctx, "library");
  if ((!triad || triad.companions.length < 2) && inScope.length) {
    const recycled = orderByRecency(inScope, recencyMap(prep.hist));
    triad = selectTriad(recycled, prep.ctx, "library:recycled") ?? triad;
  }
  if ((!triad || triad.companions.length < 2) && prep.scope) {
    const all = (await prep.fetchScope(null)).filter((r) => !prep.recentIds.has(r.id));
    triad = selectTriad(all, prep.ctx, "library:broadened") ?? triad;
  }
  return triad && triad.companions.length >= 2 ? triad : null;
}

// ── Persistence ───────────────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
async function saveServed(supabase: any, userId: string, row: LibraryRow, reflection: string, requestType: string, mode: string | undefined): Promise<string | null> {
  const today = new Date().toISOString().split("T")[0];
  const { data: inserted } = await supabase.from("affirmations").insert({
    user_id: userId, affirmation_text: row.text, category: row.category, tone: row.tones?.[0] ?? "gentle",
    reason: reflection, generated_for: today, is_daily: requestType === "daily", library_id: row.id,
  }).select("id").single();
  await supabase.from("user_affirmation_history").insert({ user_id: userId, library_id: row.id, context: mode ?? requestType, shown_on: today, role: null });
  return inserted?.id ?? null;
}

// Log a Discover triad to history (repeat prevention) — no affirmations rows (lazy-create on action).
// deno-lint-ignore no-explicit-any
async function logTriadHistory(supabase: any, userId: string, anchor: LibraryRow, companions: LibraryRow[]): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const rows = [
    { user_id: userId, library_id: anchor.id, context: "discover", shown_on: today, role: "anchor" },
    ...companions.map((c) => ({ user_id: userId, library_id: c.id, context: "discover", shown_on: today, role: "companion" })),
  ];
  await supabase.from("user_affirmation_history").insert(rows);
}

// deno-lint-ignore no-explicit-any
async function saveToDatabase(supabase: any, userId: string, data: { affirmation_text: string; quote_text?: string; quote_author?: string; reflection?: string; category?: string; tone?: string }, requestType: string): Promise<string | null> {
  const today = new Date().toISOString().split("T")[0];
  const { data: inserted } = await supabase.from("affirmations").insert({
    user_id: userId, affirmation_text: data.affirmation_text, category: data.category ?? "general",
    tone: data.tone ?? "motivational", reason: data.reflection ?? "", generated_for: today, is_daily: requestType === "daily",
  }).select("id").single();
  if (requestType === "daily" && data.quote_text) {
    await supabase.from("quotes").insert({
      user_id: userId, quote_text: data.quote_text, quote_author: data.quote_author ?? "Unknown",
      category: data.category ?? "general", generated_for: today,
    });
  }
  return inserted?.id ?? null;
}

// ── Handler ───────────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const SOURCE = (Deno.env.get("AFFIRMATION_SOURCE") ?? "ai").toLowerCase();

    const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    let requestType = "daily", journalContext = "", surface: string | undefined, mode: string | undefined;
    let category: string | undefined;
    let excludeTexts: string[] = [];
    try {
      const body = await req.json();
      requestType = body?.type ?? "daily";
      journalContext = body?.journalContext ?? "";
      surface = typeof body?.surface === "string" ? body.surface : undefined;
      category = typeof body?.category === "string" ? body.category : undefined;
      mode = typeof body?.mode === "string" ? body.mode : undefined;
      if (Array.isArray(body?.excludeTexts)) excludeTexts = body.excludeTexts.filter((t: unknown) => typeof t === "string").slice(0, 8);
    } catch { /* no body */ }

    if (category) {
      const key = category.toLowerCase().replace(/[\s-]/g, "_");
      category = CATEGORY_LABELS[key] ? key : undefined;
    }

    const [onboardingRes, moodsRes, journalRes] = await Promise.all([
      supabase.from("onboarding_answers").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("mood_logs").select("mood, mood_label, note, logged_at").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(5),
      supabase.from("journal_entries").select("body, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
    ]);

    const onboarding = onboardingRes.data;
    const recentMoods = (moodsRes.data ?? []) as { mood: number; mood_label: string; note?: string }[];
    const recentJournals = journalRes.data ?? [];

    const userName = onboarding?.preferred_name ?? "friend";
    const goalsArr = (onboarding?.main_goals ?? []) as string[];
    const strugglesArr = (onboarding?.current_struggles ?? []) as string[];
    const goals = goalsArr.join(", ") || "(not specified)";
    const struggles = strugglesArr.join(", ") || "(not specified)";
    const lifeAreas = (onboarding?.life_areas ?? []).join(", ") || "(not specified)";
    const tone = onboarding?.preferred_tone ?? "motivational";
    const personalContext = onboarding?.personal_context ?? "";

    const moodSummary = recentMoods.length
      ? recentMoods.map((m) => `${m.mood_label}(${m.mood}/5)${m.note ? `: "${m.note}"` : ""}`).join(", ")
      : "(no recent mood data)";
    const journalSummary = journalContext ||
      (recentJournals.length ? recentJournals.map((j: { body: string }) => j.body.slice(0, 140)).join(" / ") : "(no journal entries yet)");

    const reflectionInputs: ReflectionInputs = {
      userName, goals: goalsArr.length ? goalsArr : ["(not specified)"],
      struggles: strugglesArr.length ? strugglesArr : ["(not specified)"], lifeAreas, moodSummary, journalSummary,
    };

    // ── Journal insight (unchanged) ──
    if (requestType === "journal_insight") {
      if (!anthropicKey && !openaiKey) return json({ insight: INSIGHT_FALLBACK, affirmation_text: INSIGHT_FALLBACK, source: "fallback:no_key" });
      const sys = `You are a perceptive, compassionate journaling companion. You do NOT write affirmations or quotes. Respond with valid JSON only.`;
      const pr = `Reflect on ${userName}'s recent journaling.
Goals: ${goals}. Struggles: ${struggles}. Recent moods: ${moodSummary}. Recent entries: ${journalSummary}.
Write a 3-4 sentence insight that names a real pattern, validates it, connects to a goal/struggle, and offers one kind suggestion. Second person, warm, not an affirmation.
Respond ONLY: { "insight": "..." }`;
      const ai = await callAI(anthropicKey, openaiKey, sys, pr);
      if (!ai) return json({ insight: INSIGHT_FALLBACK, affirmation_text: INSIGHT_FALLBACK, source: "fallback:ai_error" });
      let insight = "";
      try { insight = JSON.parse(stripFences(ai)).insight ?? ""; } catch { /* */ }
      if (!insight) insight = stripFences(ai);
      return json({ insight, affirmation_text: insight, source: "ai" });
    }

    // ── DISCOVER triad ──
    if (surface === "discover") {
      const prep = await prepareSelection(supabase, user.id, category, onboarding, recentMoods, goalsArr, strugglesArr);
      const triad = SOURCE === "ai" ? null : await selectTriadFromLibrary(prep);

      let anchor: { text: string; library_id: string | null };
      let companions: { text: string; library_id: string | null }[];
      let source: string;

      if (triad) {
        anchor = { text: triad.anchor.text, library_id: triad.anchor.id };
        companions = triad.companions.map((c) => ({ text: c.text, library_id: c.id }));
        source = triad.sourceTag;
        await logTriadHistory(supabase, user.id, triad.anchor, triad.companions);
      } else {
        const ai = await aiTriadFallback(category, reflectionInputs, anthropicKey, openaiKey);
        anchor = { text: ai.anchor, library_id: null };
        companions = ai.companions.map((t) => ({ text: t, library_id: null }));
        source = "ai-fallback";
      }

      const { text: reflection, templated } = await buildTriadReflection(
        category ?? (triad?.anchor.category ?? "general"),
        anchor.text, companions.map((c) => c.text), reflectionInputs, anthropicKey, openaiKey,
      );

      return json({
        anchor, companions, reflection,
        category: category ?? triad?.anchor.category ?? "general",
        source: templated ? `${source}:template-reflection` : source,
      });
    }

    // ── HOME (always AI) or legacy category single ──
    const isHome = surface === "home" || !category;

    // Legacy category single via library (only when not Home and flag=library).
    if (!isHome && SOURCE === "library" && category) {
      const prep = await prepareSelection(supabase, user.id, category, onboarding, recentMoods, goalsArr, strugglesArr);
      const selected = await selectSingle(prep);
      if (selected) {
        const { text: reflection, templated } = await buildReflection(selected.row, reflectionInputs, anthropicKey, openaiKey);
        const id = await saveServed(supabase, user.id, selected.row, reflection, requestType, mode);
        return json({
          affirmation_text: selected.row.text, category: selected.row.category, reflection,
          tone: selected.row.tones?.[0] ?? "gentle", library_id: selected.row.id, id,
          source: templated ? `${selected.sourceTag}:template-reflection` : selected.sourceTag,
        });
      }
    }

    // AI authorship — Home (reflective) or legacy category (single line).
    let systemPrompt: string, userPrompt: string;
    if (isHome) {
      // Fetch what resonates: saved affirmations + active practice.
      const [favRes, prefRes] = await Promise.all([
        supabase.from("favorites").select("affirmation_text").order("created_at", { ascending: false }).limit(5),
        supabase.from("notification_preferences").select("practice_affirmation_text").eq("user_id", user.id).maybeSingle(),
      ]);
      const savedList = (favRes.data ?? []).map((f: { affirmation_text: string }) => `"${f.affirmation_text}"`).join("; ") || "(none yet)";
      const practiceText = prefRes.data?.practice_affirmation_text ? `"${prefRes.data.practice_affirmation_text}"` : "(none)";

      systemPrompt = `You are a perceptive personal affirmation coach who knows this person well.
You write ONE short, reflective daily affirmation — like a wise note from someone who truly gets them. Always respond with valid JSON only.`;
      userPrompt = `Write today's affirmation for ${userName}.

WHO THEY ARE:
- Goals: ${goals}
- Current struggles: ${struggles}
- Life focus areas: ${lifeAreas}
- Preferred tone: ${tone}
- Personal context: ${personalContext || "(none provided)"}
- Recent moods: ${moodSummary}
- Recent journal themes: ${journalSummary}

WHAT RESONATES:
- Saved affirmations: ${savedList}
- Current daily practice: ${practiceText}

STYLE (critical):
- 1 to 3 sentences, MAX ~50 words. Two sentences often works best.
- Reflective and meaningful — NOT a motivational poster, NOT a single clipped line, NOT a long paragraph.
- First person, present tense, specific to them.
Direction (do not copy): "I release the need to have every answer today. Progress is built through small acts of courage." / "I can move forward without perfect certainty. Clarity often follows action."

REFLECTION (tone matters):
- 2-3 concise sentences on why this affirmation suits the season they are in.
- Warm, thoughtful, intellectually reflective, quietly encouraging — like a note from a wise friend or a page from a thoughtful book.
- Touch one real detail (a goal, mood, or journal theme) as a passing observation, never analysis. Never clinical, diagnostic, or therapeutic; never analyze them, never "this addresses your X pattern". No clichés.

Respond with ONLY this JSON: { "affirmation_text": "...", "reflection": "...", "category": "one of the 14 category ids", "tone": "${tone}" }`;
    } else {
      const categoryLabel = category ? CATEGORY_LABELS[category] : null;
      const categoryGuidance = category ? CATEGORY_GUIDANCE[category] : null;
      systemPrompt = `You are a perceptive affirmation coach. Always respond with valid JSON only.`;
      userPrompt = `Write one short affirmation for ${userName} about "${categoryLabel}". ${categoryGuidance}
Goals: ${goals}. Struggles: ${struggles}. Recent moods: ${moodSummary}. Tone: ${tone}.
Under 12 words, reflective, on-theme, not a paragraph. Set category to "${category}".
${excludeTexts.length ? `Avoid: ${excludeTexts.map((t) => `"${t}"`).join(", ")}` : ""}
Respond ONLY: { "affirmation_text": "...", "reflection": "...", "category": "${category}", "tone": "${tone}" }`;
    }

    const aiSource = (!isHome && SOURCE === "library") ? "ai-fallback" : "ai";

    if (!anthropicKey && !openaiKey) {
      const fb = { ...pickFallback(category, excludeTexts), source: "fallback:no_key" };
      const id = await saveToDatabase(supabase, user.id, fb, requestType);
      return json({ ...fb, id });
    }
    const aiContent = await callAI(anthropicKey, openaiKey, systemPrompt, userPrompt);
    if (!aiContent) {
      const fb = { ...pickFallback(category, excludeTexts), source: "fallback:ai_error" };
      const id = await saveToDatabase(supabase, user.id, fb, requestType);
      return json({ ...fb, id });
    }
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(stripFences(aiContent)); } catch {
      const fb = { ...pickFallback(category, excludeTexts), source: "fallback:parse_error" };
      const id = await saveToDatabase(supabase, user.id, fb, requestType);
      return json({ ...fb, id });
    }
    if (!parsed.affirmation_text) throw new Error("Invalid AI response structure");

    const result = {
      affirmation_text: String(parsed.affirmation_text),
      reflection: parsed.reflection ? String(parsed.reflection) : "",
      category: category ?? (parsed.category ? String(parsed.category) : "general"),
      tone: parsed.tone ? String(parsed.tone) : tone,
      source: aiSource,
    };
    const id = await saveToDatabase(supabase, user.id, result, requestType);
    return json({ ...result, id });
  } catch (error) {
    console.error("Edge function error:", String(error));
    return json({ ...pickFallback(undefined, []), source: "fallback:exception" });
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
