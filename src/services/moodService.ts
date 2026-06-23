import { supabase } from './supabase';

export interface MoodLog {
  id: string;
  mood: number;
  mood_label: string;
  note?: string;
  logged_at: string;
}

export const MOOD_LABELS: Record<number, string> = {
  1: 'Struggling',
  2: 'Low',
  3: 'Okay',
  4: 'Good',
  5: 'Thriving',
};

export const MOOD_EMOJIS: Record<number, string> = {
  1: '😔',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😊',
};

export async function logMood(mood: number, note?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('mood_logs').insert({
    user_id: user.id,
    mood,
    mood_label: MOOD_LABELS[mood] ?? 'Unknown',
    note: note?.trim() || null,
  });
  if (error) throw error;
}

export async function getRecentMoods(limit = 7): Promise<MoodLog[]> {
  const { data } = await supabase
    .from('mood_logs')
    .select('*')
    .order('logged_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getTodaysMood(): Promise<MoodLog | null> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('mood_logs')
    .select('*')
    .gte('logged_at', start.toISOString())
    .order('logged_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
