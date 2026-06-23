import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, StatusBar, Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logMood, getTodaysMood, MOOD_LABELS, MOOD_EMOJIS } from '../services/moodService';
import { createJournalEntry, getJournalEntries, type JournalEntry } from '../services/journalService';
import { Colors } from '../utils/colors';
import { supabase } from '../services/supabase';

// ── AI insight via edge function ───────────────────────────────────────────────

async function getJournalInsight(recentEntries: string[]): Promise<string> {
  const combined = recentEntries.slice(0, 5).join('\n\n');
  const { data, error } = await supabase.functions.invoke('generate-affirmation', {
    body: { type: 'journal_insight', journalContext: combined },
  });
  if (error || !data?.affirmation_text) throw new Error('Could not get insight');
  return data.affirmation_text as string;
}

// ── Mood picker ────────────────────────────────────────────────────────────────

function MoodPicker({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <View style={styles.moodRow}>
      {[1, 2, 3, 4, 5].map(m => (
        <TouchableOpacity
          key={m}
          style={[styles.moodBtn, value === m && styles.moodBtnActive]}
          onPress={() => onChange(m)}
          activeOpacity={0.7}
        >
          <Text style={styles.moodEmoji}>{MOOD_EMOJIS[m]}</Text>
          <Text style={[styles.moodLabel, value === m && styles.moodLabelActive]}>
            {MOOD_LABELS[m]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Entry card ─────────────────────────────────────────────────────────────────

function EntryCard({ entry }: { entry: JournalEntry }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(entry.created_at);
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const preview = entry.body.length > 100 && !expanded ? entry.body.slice(0, 100) + '…' : entry.body;

  return (
    <TouchableOpacity style={styles.entryCard} onPress={() => setExpanded(e => !e)} activeOpacity={0.85}>
      <View style={styles.entryMeta}>
        <Text style={styles.entryDate}>{dateStr}</Text>
        <Text style={styles.entryTime}>{timeStr}</Text>
      </View>
      {entry.title ? <Text style={styles.entryTitle}>{entry.title}</Text> : null}
      <Text style={styles.entryBody}>{preview}</Text>
    </TouchableOpacity>
  );
}

// ── JournalScreen ──────────────────────────────────────────────────────────────

export function JournalScreen() {
  const [todaysMood, setTodaysMood] = useState<number | null>(null);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [moodSaved, setMoodSaved] = useState(false);
  const [bodyText, setBodyText] = useState('');
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const loadData = useCallback(async () => {
    const [moodData, journalData] = await Promise.all([getTodaysMood(), getJournalEntries()]);
    if (moodData) { setTodaysMood(moodData.mood); setSelectedMood(moodData.mood); setMoodSaved(true); }
    setEntries(journalData);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveMood = async () => {
    if (!selectedMood) return;
    try {
      await logMood(selectedMood);
      setTodaysMood(selectedMood);
      setMoodSaved(true);
    } catch {
      Alert.alert('Error', 'Could not save mood.');
    }
  };

  const handleSaveEntry = async () => {
    if (!bodyText.trim()) return;
    setSaving(true);
    try {
      const entry = await createJournalEntry(bodyText.trim());
      setEntries(prev => [entry, ...prev]);
      setBodyText('');
      inputRef.current?.blur();
    } catch {
      Alert.alert('Error', 'Could not save entry.');
    } finally {
      setSaving(false);
    }
  };

  const handleGetInsight = async () => {
    if (entries.length === 0) return;
    setInsightLoading(true);
    setInsight('');
    try {
      const text = await getJournalInsight(entries.map(e => e.body));
      setInsight(text);
    } catch {
      setInsight('Could not generate insight at this time.');
    } finally {
      setInsightLoading(false);
    }
  };

  const moodColor = selectedMood
    ? [Colors.mood1, Colors.mood2, Colors.mood3, Colors.mood4, Colors.mood5][selectedMood - 1]
    : Colors.primary;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={20}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.pageTitle}>Journal</Text>
              <Text style={styles.pageSub}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
            </View>

            {/* ── Mood ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How are you feeling?</Text>
              <MoodPicker value={selectedMood} onChange={v => { setSelectedMood(v); setMoodSaved(false); }} />
              {selectedMood && !moodSaved && (
                <TouchableOpacity style={styles.saveMoodBtn} onPress={handleSaveMood} activeOpacity={0.75}>
                  <Text style={styles.saveMoodText}>Log mood</Text>
                </TouchableOpacity>
              )}
              {moodSaved && todaysMood && (
                <Text style={[styles.moodSavedLabel, { color: moodColor }]}>
                  {MOOD_EMOJIS[todaysMood]} {MOOD_LABELS[todaysMood]} — logged for today
                </Text>
              )}
            </View>

            {/* ── Reflect ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reflect</Text>
              <View style={styles.inputCard}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  placeholder="What's on your mind? Start writing…"
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  value={bodyText}
                  onChangeText={setBodyText}
                  textAlignVertical="top"
                  scrollEnabled={false}
                />
              </View>
              <TouchableOpacity
                style={[styles.saveEntryBtn, !bodyText.trim() && styles.saveEntryBtnDisabled]}
                onPress={handleSaveEntry}
                disabled={!bodyText.trim() || saving}
                activeOpacity={0.75}
              >
                {saving
                  ? <ActivityIndicator color="#FFFFFF" size="small" />
                  : <Text style={styles.saveEntryText}>Save entry</Text>
                }
              </TouchableOpacity>
            </View>

            {/* ── AI Insight ── */}
            {entries.length >= 2 && (
              <View style={styles.section}>
                <View style={styles.insightHeader}>
                  <Text style={styles.sectionTitle}>AI Insight</Text>
                  <TouchableOpacity onPress={handleGetInsight} disabled={insightLoading} activeOpacity={0.7}>
                    <Text style={styles.insightRefresh}>{insightLoading ? 'Thinking…' : '↺ Refresh'}</Text>
                  </TouchableOpacity>
                </View>
                {insightLoading ? (
                  <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} />
                ) : insight ? (
                  <View style={styles.insightCard}>
                    <Text style={styles.insightText}>{insight}</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.insightPrompt} onPress={handleGetInsight} activeOpacity={0.75}>
                    <Text style={styles.insightPromptText}>
                      Get an AI reflection based on your recent entries
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ── Past Entries ── */}
            {entries.length > 0 && (
              <View style={[styles.section, { paddingBottom: 100 }]}>
                <Text style={styles.sectionTitle}>Recent entries</Text>
                {entries.map(entry => <EntryCard key={entry.id} entry={entry} />)}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingTop: 8 },

  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8, gap: 4 },
  pageTitle: { fontSize: 30, fontWeight: '300', color: Colors.white90, letterSpacing: 0.2 },
  pageSub: { fontSize: 14, fontWeight: '400', color: Colors.textSecondary },

  section: { paddingHorizontal: 24, paddingTop: 28 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14,
  },

  moodRow: { flexDirection: 'row', gap: 8 },
  moodBtn: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12,
    borderRadius: 12, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  moodBtnActive: { backgroundColor: Colors.glass, borderColor: 'rgba(255,255,255,0.30)' },
  moodEmoji: { fontSize: 20 },
  moodLabel: { fontSize: 9, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.5, textAlign: 'center' },
  moodLabelActive: { color: Colors.white70 },

  saveMoodBtn: {
    marginTop: 14, paddingVertical: 12, borderRadius: 999,
    backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder,
    alignItems: 'center',
  },
  saveMoodText: { fontSize: 14, fontWeight: '500', color: Colors.white90, letterSpacing: 0.5 },
  moodSavedLabel: { marginTop: 12, fontSize: 13, fontWeight: '500', textAlign: 'center', letterSpacing: 0.2 },

  inputCard: {
    backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    padding: 16, minHeight: 130,
  },
  input: { fontSize: 16, fontWeight: '400', color: Colors.textPrimary, lineHeight: 24, minHeight: 100 },

  saveEntryBtn: {
    marginTop: 12, paddingVertical: 14, borderRadius: 999,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  saveEntryBtnDisabled: { opacity: 0.4 },
  saveEntryText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', letterSpacing: 0.3 },

  insightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  insightRefresh: { fontSize: 13, fontWeight: '500', color: Colors.primary, letterSpacing: 0.3 },
  insightCard: {
    backgroundColor: 'rgba(124,107,235,0.12)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(124,107,235,0.25)', padding: 18,
  },
  insightText: { fontSize: 15, fontWeight: '400', color: Colors.white90, lineHeight: 24, fontStyle: 'italic' },
  insightPrompt: {
    backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    padding: 18, alignItems: 'center',
  },
  insightPromptText: { fontSize: 14, fontWeight: '400', color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  entryCard: {
    backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    padding: 16, marginBottom: 12, gap: 6,
  },
  entryMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  entryDate: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.5 },
  entryTime: { fontSize: 12, fontWeight: '400', color: Colors.textMuted },
  entryTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, letterSpacing: 0.1 },
  entryBody: { fontSize: 14, fontWeight: '400', color: Colors.textSecondary, lineHeight: 22 },
});
