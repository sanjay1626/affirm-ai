// ============================================================
// Pure affirmation selection engine (Deno, no I/O — fully testable).
//
// The Edge Function does the DB work (filtering candidates, reading history)
// and hands a candidate array to these functions. Nothing here touches the
// network, so it can be unit-tested deterministically by injecting `rng`.
//
// Score weights (sum to 1.0):
//   tone 0.30 · energy 0.25 · tag/address 0.25 · mood 0.10 · difficulty 0.05 · novelty 0.05
// ============================================================

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface LibraryRow {
  id: string;
  text: string;
  category: string;
  tones: string[];
  energy: number; // 1..5
  difficulty: Difficulty;
  tags: string[];
  addresses: string[];
  anchorEligible?: boolean; // may stand alone as a daily-practice Anchor (default true)
}

export interface PersonalityVec {
  preferred_tones: string[];
  energy_pref: number; // 1..5
  focus_tags: string[];
  focus_categories: string[];
}

export interface SelectionContext {
  personality: PersonalityVec;
  goalStruggleSlugs: string[]; // user's selected goal/struggle slugs (match library.addresses)
  moodAvg: number | null;      // avg recent mood 1..5, null if none
  historyCount: number;        // affirmations the user has received (difficulty progression)
  rng?: () => number;          // injectable randomness for deterministic tests
}

export interface Selection {
  row: LibraryRow;
  sourceTag: 'library' | 'library:recycled' | 'library:broadened';
}

const CALMING_CATEGORIES = new Set(['anxiety_stress', 'self_love', 'emotional_wellness']);
const CALMING_TAGS = new Set([
  'calm', 'letting-go', 'grounding', 'self-compassion', 'acceptance', 'presence', 'rest',
]);

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function overlapCount(a: string[], b: string[]): number {
  const set = new Set(b);
  let n = 0;
  for (const x of a) if (set.has(x)) n++;
  return n;
}

/** Energy the user "wants" today: personality preference, nudged by recent mood. */
export function targetEnergy(p: PersonalityVec, moodAvg: number | null): number {
  const adj = moodAvg == null ? 0 : Math.round(moodAvg - 3); // low mood pulls energy down
  return clamp(p.energy_pref + adj, 1, 5);
}

/** 0..1 difficulty fit — beginners start easy; intermediate/advanced unlock with history. */
export function difficultyFit(d: Difficulty, historyCount: number): number {
  if (historyCount < 7) {
    return d === 'beginner' ? 1 : d === 'intermediate' ? 0.4 : 0.1;
  }
  if (historyCount < 30) {
    return d === 'beginner' ? 0.7 : d === 'intermediate' ? 1 : 0.6;
  }
  return d === 'beginner' ? 0.5 : d === 'intermediate' ? 0.9 : 1;
}

/** Deterministic given ctx.rng. Returns a 0..~1 relevance score for one candidate. */
export function scoreCandidate(row: LibraryRow, ctx: SelectionContext): number {
  const rng = ctx.rng ?? Math.random;
  const tEnergy = targetEnergy(ctx.personality, ctx.moodAvg);

  // tone 0.30 — any shared preferred tone
  const toneScore = overlapCount(row.tones, ctx.personality.preferred_tones) > 0 ? 1 : 0;

  // energy 0.25 — closeness to target
  const energyScore = 1 - Math.abs(row.energy - tEnergy) / 4;

  // tag/address 0.25 — thematic + direct goal/struggle overlap, capped
  const hits = overlapCount(row.tags, ctx.personality.focus_tags)
    + overlapCount(row.addresses, ctx.goalStruggleSlugs);
  const overlapScore = hits === 0 ? 0 : Math.min(1, hits / 3);

  // mood 0.10 — when recently low, favor calming categories/tags
  let moodScore = 0;
  if (ctx.moodAvg != null && ctx.moodAvg <= 2) {
    if (CALMING_CATEGORIES.has(row.category)) moodScore += 0.5;
    if (row.tags.some((t) => CALMING_TAGS.has(t))) moodScore += 0.5;
    moodScore = Math.min(1, moodScore);
  }

  // difficulty 0.05
  const difficultyScore = difficultyFit(row.difficulty, ctx.historyCount);

  // novelty 0.05
  const novelty = rng();

  return (
    0.30 * toneScore +
    0.25 * energyScore +
    0.25 * overlapScore +
    0.10 * moodScore +
    0.05 * difficultyScore +
    0.05 * novelty
  );
}

/**
 * Score all candidates and weighted-randomly pick from the top K (variety, not argmax).
 * Returns null only for an empty candidate set.
 */
export function selectAffirmation(
  candidates: LibraryRow[],
  ctx: SelectionContext,
  sourceTag: Selection['sourceTag'] = 'library',
  topK = 5,
): Selection | null {
  if (candidates.length === 0) return null;

  const scored = candidates
    .map((row) => ({ row, score: scoreCandidate(row, ctx) }))
    .sort((a, b) => b.score - a.score);

  const pool = scored.slice(0, Math.min(topK, scored.length));
  const rng = ctx.rng ?? Math.random;

  const total = pool.reduce((s, p) => s + p.score, 0);
  if (total <= 0) return { row: pool[0].row, sourceTag };

  let r = rng() * total;
  for (const p of pool) {
    r -= p.score;
    if (r <= 0) return { row: p.row, sourceTag };
  }
  return { row: pool[0].row, sourceTag };
}

/**
 * Order candidates for the recycle fallback: least-recently-shown first
 * (never-shown rows come first). `lastShownDaysAgo[id]` is undefined when never shown.
 */
export function orderByRecency(
  rows: LibraryRow[],
  lastShownDaysAgo: Record<string, number>,
): LibraryRow[] {
  const days = (r: LibraryRow) =>
    lastShownDaysAgo[r.id] === undefined ? Number.POSITIVE_INFINITY : lastShownDaysAgo[r.id];
  return [...rows].sort((a, b) => days(b) - days(a));
}

// ── Anchor + Companion triad (Discover) ─────────────────────────────────────────

function weightedPick(pool: { row: LibraryRow; score: number }[], rng: () => number): LibraryRow {
  const total = pool.reduce((s, p) => s + p.score, 0);
  if (total <= 0) return pool[0].row;
  let r = rng() * total;
  for (const p of pool) {
    r -= p.score;
    if (r <= 0) return p.row;
  }
  return pool[0].row;
}

export interface Triad {
  anchor: LibraryRow;
  companions: LibraryRow[]; // up to 2 (fewer only when the pool is tiny)
  sourceTag: string;
}

/**
 * Pick 1 Anchor + 2 Companions for a Discover category.
 *   - Anchor:     weighted-random among the top-K *anchor-eligible* candidates.
 *   - Companions: next highest-scored, distinct from the Anchor, lightly biased
 *                 to share a tag with it so the set feels cohesive.
 */
export function selectTriad(
  candidates: LibraryRow[],
  ctx: SelectionContext,
  sourceTag = 'library',
  topK = 5,
): Triad | null {
  if (candidates.length === 0) return null;
  const rng = ctx.rng ?? Math.random;

  const scored = candidates
    .map((row) => ({ row, score: scoreCandidate(row, ctx) }))
    .sort((a, b) => b.score - a.score);

  // Anchor — prefer anchor-eligible; fall back to all if none are eligible.
  const eligible = scored.filter((s) => s.row.anchorEligible !== false);
  const fromList = eligible.length ? eligible : scored;
  const anchorPool = fromList.slice(0, Math.min(topK, fromList.length));
  const anchor = weightedPick(anchorPool, rng);

  // Companions — next best, distinct from the anchor, tag-cohesion bonus.
  const anchorTags = new Set(anchor.tags);
  const companions = scored
    .filter((s) => s.row.id !== anchor.id)
    .map((s) => ({
      row: s.row,
      combo: s.score + (s.row.tags.some((t) => anchorTags.has(t)) ? 0.1 : 0),
    }))
    .sort((a, b) => b.combo - a.combo)
    .slice(0, 2)
    .map((s) => s.row);

  return { anchor, companions, sourceTag };
}
