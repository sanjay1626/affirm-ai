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

/**
 * Calls the Supabase Edge Function to generate a personalized affirmation.
 * The Edge Function handles AI calls and saves results to the database.
 * Throws a user-friendly error if the function is not deployed yet.
 */
export async function generateAffirmation(
  type: 'daily' | 'extra' = 'daily'
): Promise<AffirmationResult> {
  const { data, error } = await supabase.functions.invoke('generate-affirmation', {
    body: { type },
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

/**
 * Add an affirmation to favorites.
 */
export async function addToFavorites(
  affirmationId: string,
  affirmationText: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from('favorites').insert({
    user_id: user.id,
    affirmation_id: affirmationId,
    affirmation_text: affirmationText,
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
