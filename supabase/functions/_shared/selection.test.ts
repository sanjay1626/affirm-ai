// Deno unit tests for the pure selection engine.
// Run:  deno test supabase/functions/_shared/selection.test.ts
import {
  assert,
  assertEquals,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import {
  targetEnergy,
  difficultyFit,
  scoreCandidate,
  selectAffirmation,
  selectTriad,
  orderByRecency,
  type LibraryRow,
  type SelectionContext,
} from './selection.ts';

const basePersonality = {
  preferred_tones: ['gentle'],
  energy_pref: 2,
  focus_tags: ['calm', 'self-trust'],
  focus_categories: ['anxiety_stress'],
};

function ctx(over: Partial<SelectionContext> = {}): SelectionContext {
  return {
    personality: basePersonality,
    goalStruggleSlugs: ['stress-overwhelm'],
    moodAvg: 3,
    historyCount: 0,
    rng: () => 0, // deterministic: novelty + weighted-pick collapse to top item
    ...over,
  };
}

function row(over: Partial<LibraryRow> = {}): LibraryRow {
  return {
    id: 'x',
    text: 'I return to my breath.',
    category: 'anxiety_stress',
    tones: ['gentle'],
    energy: 2,
    difficulty: 'beginner',
    tags: ['calm'],
    addresses: ['stress-overwhelm'],
    ...over,
  };
}

// ── targetEnergy ──────────────────────────────────────────────────────────────────
Deno.test('targetEnergy: low mood lowers, high raises, clamps to 1..5', () => {
  const p = { ...basePersonality, energy_pref: 3 };
  assertEquals(targetEnergy(p, 1), 1); // 3 + (-2) = 1
  assertEquals(targetEnergy(p, 5), 5); // 3 + 2 = 5
  assertEquals(targetEnergy(p, null), 3); // no mood → preference
  assertEquals(targetEnergy({ ...p, energy_pref: 1 }, 1), 1); // clamp floor
});

// ── difficultyFit ─────────────────────────────────────────────────────────────────
Deno.test('difficultyFit: new users favor beginner; advanced unlocks with history', () => {
  assert(difficultyFit('beginner', 0) > difficultyFit('advanced', 0));
  assert(difficultyFit('advanced', 50) > difficultyFit('beginner', 50));
});

// ── scoreCandidate ────────────────────────────────────────────────────────────────
Deno.test('scoreCandidate: a well-matched row scores higher than a mismatched one', () => {
  const good = row(); // matches tone, energy, tags, address, calming
  const bad = row({
    id: 'y',
    tones: ['motivational'],
    energy: 5,
    tags: ['ambition'],
    addresses: [],
    category: 'career',
  });
  assert(scoreCandidate(good, ctx()) > scoreCandidate(bad, ctx()));
});

Deno.test('scoreCandidate: low mood boosts calming categories', () => {
  const calming = row({ category: 'anxiety_stress', tags: ['calm'] });
  const neutral = row({ id: 'z', category: 'career', tags: ['ambition'], tones: ['gentle'], addresses: [] });
  const lowMood = ctx({ moodAvg: 1 });
  assert(scoreCandidate(calming, lowMood) > scoreCandidate(neutral, lowMood));
});

// ── selectAffirmation ─────────────────────────────────────────────────────────────
Deno.test('selectAffirmation: returns null for empty candidates', () => {
  assertEquals(selectAffirmation([], ctx()), null);
});

Deno.test('selectAffirmation: with deterministic rng, picks the top-scored row', () => {
  const top = row({ id: 'top' });
  const weak = row({ id: 'weak', tones: ['humorous'], energy: 5, tags: [], addresses: [], category: 'career' });
  const picked = selectAffirmation([weak, top], ctx());
  assertEquals(picked?.row.id, 'top');
  assertEquals(picked?.sourceTag, 'library');
});

Deno.test('selectAffirmation: carries through the provided sourceTag', () => {
  const picked = selectAffirmation([row()], ctx(), 'library:recycled');
  assertEquals(picked?.sourceTag, 'library:recycled');
});

// ── orderByRecency ────────────────────────────────────────────────────────────────
Deno.test('orderByRecency: never-shown first, then oldest-shown', () => {
  const a = row({ id: 'a' }); // shown 5 days ago
  const b = row({ id: 'b' }); // shown 20 days ago
  const c = row({ id: 'c' }); // never shown
  const ordered = orderByRecency([a, b, c], { a: 5, b: 20 });
  assertEquals(ordered.map((r) => r.id), ['c', 'b', 'a']);
});

// ── selectTriad ───────────────────────────────────────────────────────────────────
Deno.test('selectTriad: returns null for empty candidates', () => {
  assertEquals(selectTriad([], ctx()), null);
});

Deno.test('selectTriad: returns 1 anchor + 2 distinct companions', () => {
  const rows = [row({ id: 'a' }), row({ id: 'b' }), row({ id: 'c' }), row({ id: 'd' })];
  const t = selectTriad(rows, ctx())!;
  assertEquals(t.companions.length, 2);
  assert(t.companions.every((c) => c.id !== t.anchor.id));
  assertEquals(new Set([t.anchor.id, ...t.companions.map((c) => c.id)]).size, 3);
});

Deno.test('selectTriad: tiny pool of 2 yields anchor + 1 companion', () => {
  const t = selectTriad([row({ id: 'a' }), row({ id: 'b' })], ctx())!;
  assertEquals(t.companions.length, 1);
  assert(t.companions[0].id !== t.anchor.id);
});

Deno.test('selectTriad: anchor respects anchor_eligible', () => {
  // 'a' is the best match but NOT anchor-eligible → must become a companion.
  const a = row({ id: 'a', anchorEligible: false }); // best score, ineligible
  const b = row({ id: 'b', tags: ['calm'] });        // eligible, slightly lower
  const c = row({ id: 'c', energy: 3, tags: [] });   // eligible, lower still
  const t = selectTriad([a, b, c], ctx())!;
  assertEquals(t.anchor.id, 'b');
  assert(t.companions.some((x) => x.id === 'a'));
});

Deno.test('selectTriad: companions favor tag-cohesion with the anchor', () => {
  // All equal base score; c1 shares the anchor's tag, c2 does not.
  const noFocus = ctx({ personality: { ...basePersonality, focus_tags: [] }, goalStruggleSlugs: [] });
  const an = row({ id: 'an', tags: ['calm'], addresses: [] });
  const c1 = row({ id: 'c1', tags: ['calm'], addresses: [] }); // shares "calm"
  const c2 = row({ id: 'c2', tags: ['rest'], addresses: [] }); // no shared tag
  const t = selectTriad([an, c1, c2], noFocus)!;
  assertEquals(t.anchor.id, 'an');
  assertEquals(t.companions[0].id, 'c1');
});
