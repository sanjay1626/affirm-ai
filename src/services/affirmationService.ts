import { supabase } from './supabase';

export interface AffirmationResult {
  id?: string;
  affirmation_text: string;
  quote_text: string;
  quote_author?: string;
  reflection?: string;
  reason?: string;      // legacy — use reflection
  category?: string;
  tone?: string;
  source?: string;
}

export interface Affirmation {
  id: string;
  affirmation_text: string;
  category?: string;
  tone?: string;
  reason?: string;       // stored AI reflection (column name is `reason`)
  library_id?: string;
  is_daily: boolean;
  generated_for: string;
  created_at: string;
}

export interface Quote {
  id: string;
  quote_text: string;
  quote_author?: string;
  category?: string;
  generated_for: string;
}

export type GenerateMode = 'daily' | 'practice' | 'category';

export interface GenerateOptions {
  type?: 'daily' | 'extra';
  /** Which experience is asking — 'home' (always AI) or 'discover' (library triad). */
  surface?: 'home' | 'discover';
  /** Force a specific theme, e.g. "spirituality" — the result will match it. */
  category?: string;
  /** Previous affirmation texts the AI should NOT repeat or paraphrase. */
  excludeTexts?: string[];
  /** Hint about how this affirmation will be used. */
  mode?: GenerateMode;
}

// ── Discover triad (Anchor + 2 Companions) ──────────────────────────────────────

export interface LibraryLine {
  text: string;
  library_id: string | null;   // null when AI-generated (library fallback)
}

export interface TriadResult {
  anchor: LibraryLine;
  companions: LibraryLine[];
  reflection?: string;
  category?: string;
  source?: string;
}

/**
 * Calls the Supabase Edge Function to generate a personalized affirmation.
 * The Edge Function handles AI calls and saves results to the database.
 *
 * Accepts either an options object (preferred) or a bare type string
 * (backward-compatible with older call sites).
 */
export async function generateAffirmation(
  options: GenerateOptions | 'daily' | 'extra' = {}
): Promise<AffirmationResult> {
  const opts: GenerateOptions = typeof options === 'string' ? { type: options } : options;

  const { data, error } = await supabase.functions.invoke('generate-affirmation', {
    body: {
      type: opts.type ?? 'daily',
      surface: opts.surface,
      category: opts.category,
      excludeTexts: opts.excludeTexts,
      mode: opts.mode,
    },
  });

  if (error) {
    // Surface a clear message when the function isn't deployed yet
    const msg = error.message ?? '';
    if (msg.includes('Failed to send') || msg.includes('CORS') || msg.includes('not found')) {
      throw new Error(
        'Edge Function not deployed yet. Run: supabase functions deploy generate-affirmation'
      );
    }
    throw new Error(msg || 'Failed to generate affirmation');
  }

  return data as AffirmationResult;
}

/**
 * Discover: fetch an Anchor + 2 Companions for a category (library-first).
 */
export async function generateTriad(category: string): Promise<TriadResult> {
  const { data, error } = await supabase.functions.invoke('generate-affirmation', {
    body: { surface: 'discover', category },
  });
  if (error) throw new Error(error.message || 'Failed to load affirmations');
  return data as TriadResult;
}

/**
 * Lazy-create an `affirmations` row from a curated/AI line, so it can be
 * favorited or set as the daily-practice Anchor. Returns the new row id.
 */
export async function createAffirmationFromLibrary(line: {
  text: string;
  library_id: string | null;
  category?: string;
  tone?: string;
  reflection?: string;
}): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('affirmations')
    .insert({
      user_id: user.id,
      affirmation_text: line.text,
      category: line.category ?? 'general',
      tone: line.tone ?? 'gentle',
      reason: line.reflection ?? '',
      generated_for: today,
      is_daily: false,
      library_id: line.library_id,
    })
    .select('id')
    .single();
  return data?.id ?? null;
}

/** Bump a library line's popularity-save counter (no-op for AI lines). */
export async function incrementLibrarySave(libraryId: string | null): Promise<void> {
  if (!libraryId) return;
  await supabase.rpc('increment_library_save', { p_library_id: libraryId });
}

/**
 * Get today's daily affirmation from the database (avoids regenerating).
 */
export async function getTodaysAffirmation(): Promise<Affirmation | null> {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('affirmations')
    .select('*')
    .eq('generated_for', today)
    .eq('is_daily', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle(); // returns null (not 406) when no row exists
  return data ?? null;
}

/**
 * Get today's quote.
 */
export async function getTodaysQuote(): Promise<Quote | null> {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('quotes')
    .select('*')
    .eq('generated_for', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/**
 * Get all affirmations for a date (daily + extras).
 */
export async function getAffirmationsForDate(date: string): Promise<Affirmation[]> {
  const { data } = await supabase
    .from('affirmations')
    .select('*')
    .eq('generated_for', date)
    .order('created_at', { ascending: true });
  return data ?? [];
}

/** Metadata stored alongside a saved item (powers the Library views). */
export interface SaveMeta {
  category?: string;
  source?: 'home' | 'discover';
  library_id?: string | null;
}

/** A row in the user's Saved collection (table is `favorites`, UI is "Saved"). */
export interface SavedItem {
  id: string;
  affirmation_id: string | null;
  affirmation_text: string;
  category?: string | null;
  source?: string | null;
  library_id?: string | null;
  created_at: string;
}

/**
 * Add an affirmation to the Saved collection.
 * `meta` (category / source / library_id) is optional for backward-compat.
 */
export async function addToFavorites(
  affirmationId: string,
  affirmationText: string,
  meta: SaveMeta = {}
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from('favorites').insert({
    user_id: user.id,
    affirmation_id: affirmationId,
    affirmation_text: affirmationText,
    category: meta.category ?? null,
    source: meta.source ?? null,
    library_id: meta.library_id ?? null,
  });
  if (error && !error.message.includes('duplicate')) {
    throw error;
  }
}

/**
 * Remove an affirmation from favorites.
 */
export async function removeFromFavorites(affirmationId: string): Promise<void> {
  await supabase.from('favorites').delete().eq('affirmation_id', affirmationId);
}

/**
 * Get all favorited affirmations.
 */
export async function getFavorites() {
  const { data } = await supabase
    .from('favorites')
    .select('*')
    .order('created_at', { ascending: false });
  return data ?? [];
}

/**
 * Check if a specific affirmation is favorited.
 */
export async function isFavorited(affirmationId: string): Promise<boolean> {
  const { data } = await supabase
    .from('favorites')
    .select('id')
    .eq('affirmation_id', affirmationId)
    .maybeSingle();
  return !!data;
}
