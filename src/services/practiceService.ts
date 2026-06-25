import { supabase } from './supabase';

export interface DailyPractice {
  text: string;
  id: string | null;
  library_id: string | null;
}

/**
 * Pin an affirmation (the Discover Anchor) as the user's active daily-practice
 * affirmation. Stores the library reference + a snapshot, flips notifications on,
 * and bumps the line's practice popularity counter.
 */
export async function setDailyPractice(
  text: string,
  affirmationId?: string,
  libraryId?: string | null,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('notification_preferences').upsert(
    {
      user_id: user.id,
      practice_affirmation_text: text,
      practice_affirmation_id: affirmationId ?? null,
      practice_library_id: libraryId ?? null,
      practice_set_on: new Date().toISOString().split('T')[0],
      enabled: true,
    },
    { onConflict: 'user_id' }
  );

  if (libraryId) {
    await supabase.rpc('increment_library_practice', { p_library_id: libraryId });
  }
}

/**
 * Read the user's active daily-practice affirmation, if any.
 */
export async function getDailyPractice(): Promise<DailyPractice | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('notification_preferences')
    .select('practice_affirmation_text, practice_affirmation_id, practice_library_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!data?.practice_affirmation_text) return null;
  return {
    text: data.practice_affirmation_text,
    id: data.practice_affirmation_id ?? null,
    library_id: data.practice_library_id ?? null,
  };
}
