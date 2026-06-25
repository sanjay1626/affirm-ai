// Maps a user's onboarding answers to Discover category ids, ordered by relevance.
// Used to build the personalized "For you" row.

import { DISCOVER_CATEGORIES } from './gradients';

const VALID_IDS = new Set<string>(DISCOVER_CATEGORIES.map(c => c.id));

// Onboarding "life area" values → category id
const LIFE_AREA_MAP: Record<string, string> = {
  career: 'career',
  health: 'health',
  relationships: 'relationships',
  confidence: 'confidence',
  productivity: 'productivity',
  anxiety: 'anxiety',
  'self-esteem': 'self_love',
  spirituality: 'spirituality',
  learning: 'creativity',
  creativity: 'creativity',
};

// Onboarding goal labels → category id
const GOAL_MAP: Record<string, string> = {
  'build confidence': 'confidence',
  'reduce anxiety': 'anxiety',
  'stay motivated': 'productivity',
  'improve relationships': 'relationships',
  'career growth': 'career',
  'better health': 'health',
  'find purpose': 'spirituality',
  'be more productive': 'productivity',
  'practice gratitude': 'gratitude',
  'spiritual growth': 'spirituality',
};

// Onboarding struggle labels → category id
const STRUGGLE_MAP: Record<string, string> = {
  'self-doubt': 'confidence',
  'stress & overwhelm': 'anxiety',
  procrastination: 'productivity',
  'negative self-talk': 'self_love',
  loneliness: 'relationships',
  'fear of failure': 'confidence',
  'comparison to others': 'self_love',
  'low energy': 'health',
  'work-life balance': 'productivity',
  'grief or loss': 'self_love',
};

function resolve(value: string, map: Record<string, string>): string | null {
  const key = value.trim().toLowerCase();
  // direct map hit
  if (map[key]) return map[key];
  // already a valid category id (handles spaces/dashes → underscores)
  const normalized = key.replace(/[\s-]/g, '_');
  if (VALID_IDS.has(normalized)) return normalized;
  return null;
}

export interface OnboardingSignal {
  life_areas?: string[] | null;
  main_goals?: string[] | null;
  current_struggles?: string[] | null;
}

// Returns an ordered, de-duplicated list of category ids relevant to the user.
// Priority: life areas > goals > struggles, preserving the order the user chose.
export function matchCategories(signal: OnboardingSignal): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();

  const add = (id: string | null) => {
    if (id && VALID_IDS.has(id) && !seen.has(id)) {
      seen.add(id);
      ordered.push(id);
    }
  };

  (signal.life_areas ?? []).forEach(v => add(resolve(v, LIFE_AREA_MAP)));
  (signal.main_goals ?? []).forEach(v => add(resolve(v, GOAL_MAP)));
  (signal.current_struggles ?? []).forEach(v => add(resolve(v, STRUGGLE_MAP)));

  return ordered;
}
