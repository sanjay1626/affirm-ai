// Parity guard: the Deno mirror MUST match the client canonical mapping.
// Run:  deno test --no-check supabase/functions/_shared/onboardingTagMap.parity.test.ts
//
// (`--no-check` avoids type-checking the React Native client file under Deno;
//  we only compare runtime VALUES here.)
import { assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';

import * as mirror from './onboardingTagMap.ts';
import * as client from '../../../src/utils/onboardingTagMap.ts';

// Order-independent deep compare (sorts object keys recursively).
// deno-lint-ignore no-explicit-any
function normalize(value: any): any {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, k) => {
        acc[k] = normalize(value[k]);
        return acc;
      }, {} as Record<string, unknown>);
  }
  return value;
}

function same(name: string, a: unknown, b: unknown) {
  assertEquals(normalize(a), normalize(b), `${name} drifted between Deno mirror and client`);
}

Deno.test('CATEGORY_IDS parity', () => same('CATEGORY_IDS', mirror.CATEGORY_IDS, client.CATEGORY_IDS));
Deno.test('CATEGORY_LABELS parity', () => same('CATEGORY_LABELS', mirror.CATEGORY_LABELS, client.CATEGORY_LABELS));
Deno.test('GOAL_MAP parity', () => same('GOAL_MAP', mirror.GOAL_MAP, client.GOAL_MAP));
Deno.test('STRUGGLE_MAP parity', () => same('STRUGGLE_MAP', mirror.STRUGGLE_MAP, client.STRUGGLE_MAP));
Deno.test('LIFE_AREA_MAP parity', () => same('LIFE_AREA_MAP', mirror.LIFE_AREA_MAP, client.LIFE_AREA_MAP));
Deno.test('TONE_ENERGY parity', () => same('TONE_ENERGY', mirror.TONE_ENERGY, client.TONE_ENERGY));

// Sanity: derivePersonality agrees on a representative input.
Deno.test('derivePersonality parity', () => {
  const input = {
    main_goals: ['Reduce anxiety', 'Career growth'],
    current_struggles: ['Self-doubt'],
    life_areas: ['learning', 'creativity'],
    preferred_tone: 'gentle',
  };
  same('derivePersonality', mirror.derivePersonality(input), client.derivePersonality(input));
});
