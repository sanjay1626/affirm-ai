import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Affirmation, generateAffirmation, getAffirmationsForDate,
  addToFavorites, removeFromFavorites, isFavorited,
} from '../services/affirmationService';
import { Background } from '../components/Background';
import { Glass } from '../utils/glass';
import { Colors } from '../utils/colors';
import { Spacing, Radius } from '../utils/spacing';
import { Button } from '../components/Button';

export function MoreAffirmationsScreen() {
  const navigation = useNavigation();
  const [affirmations, setAffirmations] = useState<Affirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());

  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    const items = await getAffirmationsForDate(today);
    setAffirmations(items);
    const favChecks = await Promise.all(items.map((a) => isFavorited(a.id)));
    const favSet = new Set<string>();
    items.forEach((a, i) => { if (favChecks[i]) favSet.add(a.id); });
    setFavoritedIds(favSet);
    setLoading(false);
  }, [today]);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError('');
    try {
      const result = await generateAffirmation('extra');
      const r = result as any;
      const newAff: Affirmation = {
        id: r.id ?? String(Date.now()),
        affirmation_text: result.affirmation_text,
        category: result.category ?? '',
        tone: result.tone ?? '',
        is_daily: false,
        generated_for: today,
        created_at: new Date().toISOString(),
      };
      setAffirmations((prev) => [...prev, newAff]);
    } catch (e: unknown) {
      setGenerateError(e instanceof Error ? e.message : 'Could not generate affirmation');
    } finally {
      setGenerating(false);
    }
  };

  const toggleFavorite = async (aff: Affirmation) => {
    const isFav = favoritedIds.has(aff.id);
    if (isFav) {
      await removeFromFavorites(aff.id);
      setFavoritedIds((prev) => { const s = new Set(prev); s.delete(aff.id); return s; });
    } else {
      await addToFavorites(aff.id, aff.affirmation_text);
      setFavoritedIds((prev) => new Set(prev).add(aff.id));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <Background />
        <ActivityIndicator style={{ flex: 1 }} color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <Background />
      <FlatList
        data={affirmations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Affirmations</Text>
            <Text style={styles.screenSubtitle}>
              {affirmations.length} affirmation{affirmations.length !== 1 ? 's' : ''} today
            </Text>
            <Button
              label={generating ? 'Generating…' : 'Generate Another'}
              onPress={handleGenerate}
              loading={generating}
              size="md"
              style={{ marginTop: Spacing.sm }}
            />
            {generateError ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{generateError}</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.emptyState, Glass.card]}>
            <View style={styles.emptyOrb}>
              <View style={styles.emptyOrbInner} />
            </View>
            <Text style={styles.emptyTitle}>No affirmations yet today</Text>
            <Text style={styles.emptyText}>Generate your first one above.</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={[styles.card, Glass.card]}>
            <View style={styles.cardHeader}>
              <View style={styles.indexBadge}>
                <Text style={styles.indexText}>{index + 1}</Text>
              </View>
              <View style={styles.tagRow}>
                {item.category ? (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{item.category}</Text>
                  </View>
                ) : null}
                {item.is_daily ? (
                  <View style={[styles.tag, styles.dailyTag]}>
                    <Text style={[styles.tagText, styles.dailyTagText]}>Daily</Text>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => toggleFavorite(item)} style={styles.heartBtn}>
                <Text style={[styles.heartIcon, favoritedIds.has(item.id) && styles.heartIconFaved]}>
                  {favoritedIds.has(item.id) ? '♥' : '♡'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.affirmText}>"{item.affirmation_text}"</Text>
            <Text style={styles.timeText}>
              {new Date(item.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  listHeader: { paddingTop: Spacing.lg, marginBottom: Spacing.lg },
  backBtn: { marginBottom: Spacing.md },
  backText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  screenTitle: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 },
  screenSubtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 2, marginBottom: Spacing.sm },
  errorCard: {
    backgroundColor: 'rgba(224,112,112,0.10)',
    borderRadius: Radius.md, padding: Spacing.md,
    borderLeftWidth: 3, borderLeftColor: Colors.error, marginTop: Spacing.sm,
  },
  errorText: { fontSize: 13, color: Colors.error, lineHeight: 19 },
  emptyState: {
    paddingVertical: Spacing.xxl, alignItems: 'center',
    gap: Spacing.sm, borderRadius: Radius.xl, marginTop: Spacing.md,
  },
  emptyOrb: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(77,191,138,0.10)',
    borderWidth: 1, borderColor: 'rgba(77,191,138,0.20)',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyOrbInner: {
    width: 16, height: 16, borderRadius: 3,
    borderWidth: 2, borderColor: Colors.primary,
    transform: [{ rotate: '45deg' }],
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  emptyText: { fontSize: 14, color: Colors.textSecondary },

  card: { borderRadius: Radius.lg, padding: Spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm, gap: Spacing.sm },
  indexBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  indexText: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  tagRow: { flex: 1, flexDirection: 'row', gap: 6 },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  tagText: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, textTransform: 'capitalize' },
  dailyTag: {
    backgroundColor: 'rgba(77,191,138,0.10)',
    borderColor: 'rgba(77,191,138,0.25)',
  },
  dailyTagText: { color: Colors.primary },
  heartBtn: { padding: 4 },
  heartIcon: { fontSize: 18, color: Colors.textMuted },
  heartIconFaved: { color: Colors.error },
  affirmText: {
    fontSize: 16, fontWeight: '400', lineHeight: 25,
    color: Colors.textPrimary, fontStyle: 'italic', marginBottom: Spacing.xs,
  },
  timeText: { fontSize: 11, color: Colors.textMuted },
});
