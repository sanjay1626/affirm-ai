import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  SectionList, StatusBar, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  getFavorites, removeFromFavorites, type SavedItem,
} from '../services/affirmationService';
import { setDailyPractice, getDailyPractice, type DailyPractice } from '../services/practiceService';
import { schedulePracticeNotification, getPreferredTime } from '../services/notificationService';
import { speakText, stopSpeaking, ttsAvailable } from '../utils/speech';
import { hapticSuccess, hapticLight } from '../utils/haptics';
import { AuroraBackground } from '../components/AuroraBackground';
import { CATEGORY_LABELS } from '../utils/onboardingTagMap';
import { Colors } from '../utils/colors';

type SourceFilter = 'all' | 'home' | 'discover';

function categoryLabel(c?: string | null): string {
  if (!c) return 'Other';
  return (CATEGORY_LABELS as Record<string, string>)[c] ?? c;
}
function sourceLabel(s?: string | null): string {
  return s === 'home' ? 'Home' : s === 'discover' ? 'Discover' : 'Saved';
}

export function LibraryScreen() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [active, setActive] = useState<DailyPractice | null>(null);
  const [reminderTime, setReminderTime] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [grouped, setGrouped] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const handleSpeak = (item: SavedItem) => {
    if (!ttsAvailable) return;
    hapticLight();
    if (speakingId === item.id) {
      stopSpeaking();
      setSpeakingId(null);
    } else {
      setSpeakingId(item.id);
      speakText(item.affirmation_text, () => setSpeakingId(null));
    }
  };

  const load = useCallback(async () => {
    const [saved, practice, time] = await Promise.all([
      getFavorites() as Promise<SavedItem[]>,
      getDailyPractice(),
      getPreferredTime(),
    ]);
    setItems(saved);
    setActive(practice);
    setReminderTime(time);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isActive = (item: SavedItem) =>
    !!active && (
      (item.affirmation_id && active.id === item.affirmation_id) ||
      active.text === item.affirmation_text
    );

  const handlePractice = async (item: SavedItem) => {
    hapticSuccess();
    setActive({ text: item.affirmation_text, id: item.affirmation_id ?? null, library_id: item.library_id ?? null });
    await setDailyPractice(item.affirmation_text, item.affirmation_id ?? undefined, item.library_id ?? null);
    await schedulePracticeNotification();
  };

  const handleShare = async (item: SavedItem) => {
    await Share.share({ message: `"${item.affirmation_text}"\n\n— AffirmAI` });
  };

  const handleUnsave = async (item: SavedItem) => {
    hapticLight();
    setItems(prev => prev.filter(i => i.id !== item.id));
    if (item.affirmation_id) await removeFromFavorites(item.affirmation_id);
  };

  const sections = useMemo(() => {
    let list = items;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(i => i.affirmation_text.toLowerCase().includes(q));
    if (sourceFilter !== 'all') list = list.filter(i => (i.source ?? '') === sourceFilter);

    if (grouped) {
      const map = new Map<string, SavedItem[]>();
      for (const i of list) {
        const c = i.category || 'other';
        if (!map.has(c)) map.set(c, []);
        map.get(c)!.push(i);
      }
      return [...map.entries()]
        .sort((a, b) => categoryLabel(a[0]).localeCompare(categoryLabel(b[0])))
        .map(([cat, data]) => ({ title: categoryLabel(cat), data }));
    }
    return [{ title: 'Recently saved', data: list }];
  }, [items, search, sourceFilter, grouped]);

  const header = (
    <View>
      <View style={styles.headerWrap}>
        <Text style={styles.title}>My Library</Text>
        <Text style={styles.sub}>The lines that resonated with you</Text>
      </View>

      {/* Active Daily Practice card */}
      {active ? (
        <View style={styles.practiceCard}>
          <Text style={styles.practiceCaption}>ACTIVE DAILY PRACTICE</Text>
          <Text style={styles.practiceText}>“{active.text}”</Text>
          {reminderTime ? <Text style={styles.practiceMeta}>Reminder · {reminderTime}</Text> : null}
          <Text style={styles.practiceHint}>Change it by setting another from Saved or Discover</Text>
        </View>
      ) : null}

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Search your saved lines…"
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {(['all', 'home', 'discover'] as SourceFilter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, sourceFilter === f && styles.chipActive]}
            onPress={() => setSourceFilter(f)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, sourceFilter === f && styles.chipTextActive]}>
              {f === 'all' ? 'All' : f === 'home' ? 'Home' : 'Discover'}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[styles.chip, grouped && styles.chipActive]}
          onPress={() => setGrouped(g => !g)}
          activeOpacity={0.75}
        >
          <Text style={[styles.chipText, grouped && styles.chipTextActive]}>By category</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <AuroraBackground subtle />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          renderSectionHeader={({ section }) =>
            section.data.length ? <Text style={styles.sectionHeader}>{section.title}</Text> : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nothing saved yet.</Text>
              <Text style={styles.emptySub}>Save affirmations from Home or Discover to build your library.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const activeNow = isActive(item);
            return (
              <View style={styles.card}>
                <TouchableOpacity activeOpacity={0.75} onPress={() => handleSpeak(item)} disabled={!ttsAvailable}>
                  <Text style={styles.cardText}>{item.affirmation_text}</Text>
                </TouchableOpacity>
                <Text style={styles.cardMeta}>
                  {categoryLabel(item.category)} · {sourceLabel(item.source)}
                  {ttsAvailable ? (speakingId === item.id ? ' · playing…' : ' · tap to hear') : ''}
                </Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => handlePractice(item)} disabled={activeNow} activeOpacity={0.7}>
                    <Text style={[styles.actionText, activeNow && styles.actionActive]}>
                      {activeNow ? '✓ Daily practice' : 'Set as practice'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleShare(item)} activeOpacity={0.7}>
                    <Text style={styles.actionText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleUnsave(item)} activeOpacity={0.7}>
                    <Text style={[styles.actionText, styles.actionRemove]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  headerWrap: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8, gap: 4 },
  title: { fontSize: 30, fontWeight: '200', color: Colors.white90, letterSpacing: 0.2 },
  sub: { fontSize: 14, fontWeight: '400', color: Colors.textSecondary },

  practiceCard: {
    marginHorizontal: 24, marginTop: 14, padding: 18, borderRadius: 16,
    backgroundColor: 'rgba(124,107,235,0.10)', borderWidth: 1, borderColor: 'rgba(124,107,235,0.24)', gap: 6,
  },
  practiceCaption: { fontSize: 10, fontWeight: '700', color: 'rgba(165,148,249,0.85)', letterSpacing: 2 },
  practiceText: { fontSize: 17, fontWeight: '300', fontStyle: 'italic', color: Colors.white90, lineHeight: 24 },
  practiceMeta: { fontSize: 12, color: Colors.textSecondary },
  practiceHint: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },

  searchWrap: { paddingHorizontal: 24, marginTop: 16 },
  search: {
    height: 44, borderRadius: 12, paddingHorizontal: 16,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    color: Colors.textPrimary, fontSize: 15,
  },

  filters: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, marginTop: 12 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: 'rgba(124,107,235,0.20)', borderColor: 'rgba(124,107,235,0.45)' },
  chipText: { fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primaryLight, fontWeight: '500' },

  sectionHeader: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 2, textTransform: 'uppercase',
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8,
  },

  card: {
    marginHorizontal: 24, marginBottom: 12, padding: 16, borderRadius: 14,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  cardText: { fontSize: 16, fontWeight: '300', fontStyle: 'italic', color: Colors.white90, lineHeight: 23 },
  cardMeta: { fontSize: 11, color: Colors.textMuted, letterSpacing: 0.3 },
  cardActions: { flexDirection: 'row', gap: 20, marginTop: 2 },
  actionText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  actionActive: { color: 'rgba(180,230,200,0.95)' },
  actionRemove: { color: 'rgba(224,112,112,0.85)' },

  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 8 },
  emptyText: { fontSize: 16, color: Colors.white70 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21 },
});
