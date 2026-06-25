// ============================================================
// CANONICAL onboarding → category/tag mapping (hybrid model).
//
// Single source of truth for:
//   - personality derivation (user_personality)
//   - affirmation ranking (library tag/address overlap)
//   - future recommendation logic
//
// PR1: this module is defined but NOT imported anywhere yet (no behavior
// change). PR2 wires it into the Edge Function; a Deno copy will mirror it.
//
// NOTE: this supersedes src/utils/categoryMatch.ts, which still uses the old
// 10-category ids and is reconciled in a later (behavior-change) PR.
// ============================================================

// ── 14 canonical category ids ────────────────────────────────────────────────────
export const CATEGORY_IDS = [
  'confidence',
  'career',
  'anxiety_stress',
  'self_love',
  'relationships',
  'productivity',
  'gratitude',
  'spirituality',
  'financial_confidence',
  'health_wellness',
  'creativity',
  'purpose_meaning',
  'resilience',
  'emotional_wellness',
] as const;

export type CategoryId = typeof CATEGORY_IDS[number];

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  confidence: 'Confidence',
  career: 'Career',
  anxiety_stress: 'Anxiety & Stress',
  self_love: 'Self-Love',
  relationships: 'Relationships',
  productivity: 'Productivity',
  gratitude: 'Gratitude',
  spirituality: 'Spirituality',
  financial_confidence: 'Financial Confidence',
  health_wellness: 'Health & Wellness',
  creativity: 'Creativity',
  purpose_meaning: 'Purpose & Meaning',
  resilience: 'Resilience',
  emotional_wellness: 'Emotional Wellness',
};

// ── Mapping shape ─────────────────────────────────────────────────────────────────
interface MapEntry {
  categories: CategoryId[]; // category bias (empty = tags-only influence)
  tags: string[];           // thematic focus_tags contributed
}

// Goal label (lowercased) → bias. Includes the 3 new Financial goals.
export const GOAL_MAP: Record<string, MapEntry> = {
  'build confidence':           { categories: ['confidence'],           tags: ['self-trust', 'self-worth'] },
  'reduce anxiety':             { categories: ['anxiety_stress'],       tags: ['calm', 'letting-go'] },
  'stay motivated':             { categories: ['productivity', 'resilience'], tags: ['momentum'] },
  'improve relationships':      { categories: ['relationships'],        tags: ['connection', 'boundaries'] },
  'career growth':              { categories: ['career'],               tags: ['growth', 'ambition'] },
  'better health':              { categories: ['health_wellness'],      tags: ['body', 'vitality'] },
  'find purpose':               { categories: ['purpose_meaning'],      tags: ['meaning', 'direction'] },
  'be more productive':         { categories: ['productivity'],         tags: ['focus', 'action'] },
  'practice gratitude':         { categories: ['gratitude'],            tags: ['appreciation', 'presence'] },
  'spiritual growth':           { categories: ['spirituality'],         tags: ['stillness', 'faith'] },
  // New financial onboarding goals
  'reduce financial stress':    { categories: ['financial_confidence'], tags: ['calm', 'security'] },
  'build better money habits':  { categories: ['financial_confidence'], tags: ['discipline', 'security'] },
  'increase financial confidence': { categories: ['financial_confidence'], tags: ['self-trust', 'agency'] },
};

// Struggle label (lowercased) → bias.
export const STRUGGLE_MAP: Record<string, MapEntry> = {
  'self-doubt':            { categories: ['confidence', 'resilience'],            tags: ['self-trust'] },
  'stress & overwhelm':    { categories: ['anxiety_stress'],                      tags: ['calm', 'overwhelm'] },
  'procrastination':       { categories: ['productivity'],                        tags: ['action', 'momentum'] },
  'negative self-talk':    { categories: ['self_love', 'emotional_wellness'],     tags: ['self-compassion'] },
  'loneliness':            { categories: ['relationships', 'emotional_wellness'], tags: ['connection', 'belonging'] },
  'fear of failure':       { categories: ['resilience', 'confidence'],            tags: ['courage', 'failure'] },
  'comparison to others':  { categories: ['self_love', 'emotional_wellness'],     tags: ['self-acceptance'] },
  'low energy':            { categories: ['health_wellness'],                     tags: ['energy', 'rest'] },
  'work-life balance':     { categories: ['productivity', 'emotional_wellness'],  tags: ['balance', 'boundaries'] },
  'grief or loss':         { categories: ['emotional_wellness', 'resilience'],    tags: ['grief', 'healing'] },
};

// Life-area value → bias. `learning` contributes tags only (no single category),
// influencing Career / Creativity / Purpose & Meaning via tag overlap.
export const LIFE_AREA_MAP: Record<string, MapEntry> = {
  career:        { categories: ['career'],               tags: ['ambition'] },
  health:        { categories: ['health_wellness'],      tags: ['body'] },
  relationships: { categories: ['relationships'],        tags: ['connection'] },
  confidence:    { categories: ['confidence'],           tags: ['self-trust'] },
  productivity:  { categories: ['productivity'],         tags: ['focus'] },
  anxiety:       { categories: ['anxiety_stress'],       tags: ['calm'] },
  'self-esteem': { categories: ['self_love'],            tags: ['self-worth'] },
  spirituality:  { categories: ['spirituality'],         tags: ['stillness'] },
  creativity:    { categories: ['creativity'],           tags: ['curiosity'] },
  learning:      { categories: [],                       tags: ['curiosity', 'growth', 'mastery'] },
};

// Preferred tone → energy seed + the tone itself.
export const TONE_ENERGY: Record<string, number> = {
  gentle: 2,
  spiritual: 2,
  practical: 3,
  motivational: 4,
  humorous: 4,
};

// ── Derivation ────────────────────────────────────────────────────────────────────
export interface OnboardingInput {
  main_goals?: string[] | null;
  current_struggles?: string[] | null;
  life_areas?: string[] | null;
  preferred_tone?: string | null;
}

export interface DerivedPersonality {
  preferred_tones: string[];
  energy_pref: number;
  focus_tags: string[];
  focus_categories: CategoryId[];
  avoid_tags: string[];
}

function lookup(values: string[] | null | undefined, map: Record<string, MapEntry>): MapEntry[] {
  return (values ?? [])
    .map(v => map[v.trim().toLowerCase()])
    .filter((e): e is MapEntry => !!e);
}

/**
 * Derive the personality vector from onboarding answers. Pure, side-effect-free.
 */
export function derivePersonality(input: OnboardingInput): DerivedPersonality {
  const entries: MapEntry[] = [
    ...lookup(input.main_goals, GOAL_MAP),
    ...lookup(input.current_struggles, STRUGGLE_MAP),
    ...lookup(input.life_areas, LIFE_AREA_MAP),
  ];

  const focus_tags = [...new Set(entries.flatMap(e => e.tags))];
  const focus_categories = [...new Set(entries.flatMap(e => e.categories))] as CategoryId[];

  const tone = (input.preferred_tone ?? 'practical').trim().toLowerCase();
  const energy_pref = TONE_ENERGY[tone] ?? 3;

  return {
    preferred_tones: [tone],
    energy_pref,
    focus_tags,
    focus_categories,
    avoid_tags: [],
  };
}
