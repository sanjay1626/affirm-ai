import { supabase } from './supabase';

export interface JournalEntry {
  id: string;
  title?: string;
  body: string;
  created_at: string;
  updated_at: string;
}

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export async function createJournalEntry(
  body: string,
  title?: string
): Promise<JournalEntry> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('journal_entries')
    .insert({ user_id: userId, body: body.trim(), title: title?.trim() || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateJournalEntry(
  id: string,
  body: string,
  title?: string
): Promise<void> {
  const { error } = await supabase
    .from('journal_entries')
    .update({ body: body.trim(), title: title?.trim() || null })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteJournalEntry(id: string): Promise<void> {
  await supabase.from('journal_entries').delete().eq('id', id);
}

export async function getJournalEntries(): Promise<JournalEntry[]> {
  const { data } = await supabase
    .from('journal_entries')
    .select('*')
    .order('created_at', { ascending: false });
  return data ?? [];
}
