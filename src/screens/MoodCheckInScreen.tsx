import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, StatusBar,
} from 'react-native';
import {
  logMood, getRecentMoods, getTodaysMood, MoodLog, MOOD_LABELS, MOOD_EMOJIS,
} from '../services/moodService';
import { Background } from '../components/Background';
import { Glass } from '../utils/glass';
import { Colors } from '../utils/colors';
import { Spacing, Radius } from '../utils/spacing';
import { Button } from '../components/Button';

const MOOD_COLORS: Record<number, string> = {
  1: Colors.mood1, 2: Colors.mood2, 3: Colors.mood3, 4: Colors.mood4, 5: Colors.mood5,
};

export function MoodCheckInScreen() {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [todaysMood, setTodaysMood] = useState<MoodLog | null>(null);
  const [recentMoods, setRecentMoods] = useState<MoodLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const today = await getTodaysMood();
    const recent = await getRecentMoods(7);
    setTodaysMood(today);
    setRecentMoods(recent);
    if (today) setSelectedMood(today.mood);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!selectedMood) return;
    setSaving(true);
    try {
      await logMood(selectedMood, note);
      setSaved(true);
      setNote('');
      await load();
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <Background />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Mood Check-In</Text>
          <Text style={styles.subtitle}>How are you feeling right now?</Text>
        </View>

        {/* Today banner */}
        {todaysMood && (
          <View style={[styles.todayCard, Glass.cardBright, { borderColor: MOOD_COLORS[todaysMood.mood] + '50' }]}>
            <Text style={styles.todayEmoji}>{MOOD_EMOJIS[todaysMood.mood]}</Text>
            <View>
              <Text style={styles.todayLabel}>Already logged today</Text>
              <Text style={[styles.todayMood, { color: MOOD_COLORS[todaysMood.mood] }]}>
                {MOOD_LABELS[todaysMood.mood]}
              </Text>
            </View>
          </View>
        )}

        {/* Mood selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SELECT MOOD</Text>
          <View style={styles.moodRow}>
            {[1, 2, 3, 4, 5].map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.moodBtn,
                  Glass.card,
                  selectedMood === m && {
                    backgroundColor: MOOD_COLORS[m] + '18',
                    borderColor: MOOD_COLORS[m] + '60',
                    borderWidth: 1.5,
                  },
                ]}
                onPress={() => setSelectedMood(m)}
                activeOpacity={0.7}
              >
                <Text style={styles.moodBtnEmoji}>{MOOD_EMOJIS[m]}</Text>
                <Text style={[
                  styles.moodBtnLabel,
                  selectedMood === m && { color: MOOD_COLORS[m], fontWeight: '700' },
                ]}>
                  {MOOD_LABELS[m]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ADD A NOTE</Text>
          <TextInput
            style={[styles.noteInput, Glass.input]}
            value={note}
            onChangeText={setNote}
            placeholder="What's on your mind? Any context to add…"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={300}
          />
        </View>

        {/* Save */}
        {saved ? (
          <View style={[styles.savedBanner, Glass.card]}>
            <Text style={styles.savedText}>Mood logged ✓</Text>
          </View>
        ) : (
          <Button
            label={saving ? 'Saving…' : 'Log My Mood'}
            onPress={handleSave}
            loading={saving}
            disabled={!selectedMood}
            style={{ marginHorizontal: Spacing.lg }}
          />
        )}

        {/* Recent moods */}
        {recentMoods.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>RECENT MOODS</Text>
            {recentMoods.map((log) => (
              <View key={log.id} style={[styles.recentCard, Glass.card]}>
                <View style={[styles.moodIndicator, { backgroundColor: MOOD_COLORS[log.mood] }]} />
                <Text style={styles.recentEmoji}>{MOOD_EMOJIS[log.mood]}</Text>
                <View style={styles.recentInfo}>
                  <Text style={styles.recentMoodLabel}>{MOOD_LABELS[log.mood]}</Text>
                  {log.note ? <Text style={styles.recentNote}>{log.note}</Text> : null}
                  <Text style={styles.recentTime}>
                    {new Date(log.logged_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: Spacing.xl },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, marginBottom: Spacing.lg },
  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 2 },

  todayCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    borderRadius: Radius.lg, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderWidth: 1.5,
  },
  todayEmoji: { fontSize: 32 },
  todayLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600', letterSpacing: 0.5 },
  todayMood: { fontSize: 17, fontWeight: '700' },

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.8, marginBottom: Spacing.md },

  moodRow: { flexDirection: 'row', gap: Spacing.xs },
  moodBtn: {
    flex: 1, borderRadius: Radius.lg, paddingVertical: Spacing.md,
    alignItems: 'center', gap: 4,
  },
  moodBtnEmoji: { fontSize: 24 },
  moodBtnLabel: { fontSize: 10, fontWeight: '500', color: Colors.textMuted, textAlign: 'center' },

  noteInput: {
    borderRadius: Radius.md, padding: Spacing.md,
    fontSize: 15, color: Colors.textPrimary, minHeight: 100, lineHeight: 22,
  },

  savedBanner: {
    marginHorizontal: Spacing.lg, borderRadius: Radius.lg,
    paddingVertical: Spacing.md, alignItems: 'center',
    borderColor: 'rgba(77,191,138,0.25)', borderWidth: 1,
  },
  savedText: { fontSize: 14, fontWeight: '700', color: Colors.primary, letterSpacing: 0.3 },

  recentCard: {
    borderRadius: Radius.lg, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'flex-start',
    gap: Spacing.sm, marginBottom: Spacing.sm, overflow: 'hidden',
  },
  moodIndicator: { width: 3, position: 'absolute', left: 0, top: 0, bottom: 0 },
  recentEmoji: { fontSize: 24 },
  recentInfo: { flex: 1 },
  recentMoodLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  recentNote: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 19 },
  recentTime: { fontSize: 11, color: Colors.textMuted, marginTop: 4, letterSpacing: 0.2 },
});
