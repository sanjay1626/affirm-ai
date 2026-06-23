import { supabase } from './supabase';

// Returns number of consecutive days (including today) the user has generated an affirmation.
export async function getStreak(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data } = await supabase
    .from('affirmations')
    .select('generated_for')
    .eq('user_id', user.id)
    .order('generated_for', { ascending: false });

  if (!data || data.length === 0) return 0;

  // Deduplicate dates and sort descending
  const uniqueDates = [...new Set(data.map(d => d.generated_for as string))].sort().reverse();

  const today = new Date().toISOString().split('T')[0];
  let current = today;
  let streak = 0;

  for (const date of uniqueDates) {
    if (date === current) {
      streak++;
      const d = new Date(current);
      d.setDate(d.getDate() - 1);
      current = d.toISOString().split('T')[0];
    } else if (date < current) {
      // Gap — streak broken
      break;
    }
  }

  return streak;
}
