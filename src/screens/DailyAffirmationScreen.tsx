import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  ActivityIndicator, Share, TouchableOpacity, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  getTodaysAffirmation, generateAffirmation,
  addToFavorites, removeFromFavorites, isFavorited, Affirmation,
} from '../services/affirmationService';
import { scheduleDailyNotification } from '../services/notificationService';
import { Background } from '../components/Background';
import { Glass } from '../utils/glass';
import { Colors } from '../utils/colors';
import { Spacing, Radius } from '../utils/spacing';
import { Button } from '../components/Button';

export function DailyAffirmationScreen() {
  const navigation = useNavigation();
  const [affirmation, setAffirmation] = useState<Affirmation | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [favorited, setFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [source, setSource] = useState<'ai' | 'fallback' | ''>('');

  const load = useCallback(async () => {
    const aff = await getTodaysAffirmation();
    setAffirmation(aff);
    if (aff) {
      const faved = await isFavorited(aff.id);
      setFavorited(faved);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError('');
    try {
      const result = await generateAffirmation('daily');
      const r = result as any;
      setAffirmation({
        id: r.id ?? '',
        affirmation_text: result.affirmation_text,
        category: result.category ?? '',
        tone: result.tone ?? '',
        is_daily: true,
        generated_for: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
      });
      setReason(result.reason ?? '');
      setFavorited(false);
      setSource(r.source?.startsWith('ai') ? 'ai' : 'fallback');
      await scheduleDailyNotification(result.affirmation_text);
    } catch (e: unknown) {
      setGenerateError(e instanceof Error ? e.message : 'Could not generate affirmation');
    } finally {
      setGenerating(false);
    }
  };

  const handleFavorite = async () => {
    if (!affirmation || favLoading) return;
    setFavLoading(true);
    try {
      if (favorited) {
        await removeFromFavorites(affirmation.id);
        setFavorited(false);
      } else {
        await addToFavorites(affirmation.id, affirmation.affirmation_text);
        setFavorited(true);
      }
    } finally {
      setFavLoading(false);
    }
  };

  const handleShare = async () => {
    if (!affirmation) return;
    await Share.share({ message: `"${affirmation.affirmation_text}"\n\n— AffirmAI` });
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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          {affirmation && (
            <TouchableOpacity onPress={handleShare}>
              <Text style={styles.shareText}>Share</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.screenTitle}>Daily Affirmation</Text>
        <Text style={styles.screenDate}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        {affirmation ? (
          <>
            {/* Main affirmation card — dark glass with green glow */}
            <View style={[styles.mainCard, Glass.cardDark]}>
              <View style={styles.mainCardGlow} />

              {source ? (
                <View style={styles.sourcePill}>
                  <View style={[styles.sourceDot, {
                    backgroundColor: source === 'ai' ? Colors.primary : Colors.textMuted,
                  }]} />
                  <Text style={styles.sourceText}>
                    {source === 'ai' ? 'AI generated' : 'Curated'}
                  </Text>
                </View>
              ) : null}

              <Text style={styles.quoteOpen}>"</Text>
              <Text style={styles.affirmText}>{affirmation.affirmation_text}</Text>

              {(affirmation.category || affirmation.tone) ? (
                <View style={styles.tags}>
                  {affirmation.category ? (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{affirmation.category}</Text>
                    </View>
                  ) : null}
                  {affirmation.tone ? (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{affirmation.tone}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>

            {/* Why this affirmation */}
            {reason ? (
              <View style={[styles.reasonCard, Glass.card]}>
                <View style={styles.reasonAccent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reasonLabel}>WHY THIS FOR YOU</Text>
                  <Text style={styles.reasonText}>{reason}</Text>
                </View>
              </View>
            ) : null}

            {/* Action row */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, Glass.card, favorited && styles.actionBtnActive]}
                onPress={handleFavorite}
                disabled={favLoading}
              >
                <Text style={[styles.actionIcon, favorited && styles.actionIconActive]}>
                  {favorited ? '♥' : '♡'}
                </Text>
                <Text style={[styles.actionLabel, favorited && styles.actionLabelActive]}>
                  {favorited ? 'Saved' : 'Save'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, Glass.card]} onPress={handleShare}>
                <Text style={styles.actionIcon}>↑</Text>
                <Text style={styles.actionLabel}>Share</Text>
              </TouchableOpacity>
            </View>

            {generateError ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{generateError}</Text>
              </View>
            ) : null}

            <Button
              label={generating ? 'Generating…' : 'Regenerate'}
              onPress={handleGenerate}
              loading={generating}
              variant="secondary"
              style={{ marginHorizontal: Spacing.lg, marginTop: Spacing.sm }}
            />
          </>
        ) : (
          <View style={[styles.emptyState, Glass.card]}>
            <View style={styles.emptyOrb}>
              <View style={styles.emptyOrbInner} />
            </View>
            <Text style={styles.emptyTitle}>No affirmation yet today</Text>
            <Text style={styles.emptyText}>Generate your personalized daily affirmation below.</Text>
            {generateError ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{generateError}</Text>
              </View>
            ) : null}
            <Button
              label={generating ? 'Generating…' : 'Generate My Affirmation'}
              onPress={handleGenerate}
              loading={generating}
              style={{ marginTop: Spacing.lg, alignSelf: 'stretch' }}
            />
          </View>
        )}

        {/* Practice tip */}
        <View style={styles.tipWrap}>
          <View style={styles.tipLine} />
          <Text style={styles.tipLabel}>DAILY PRACTICE</Text>
          <Text style={styles.tipText}>
            Read your affirmation aloud three times — morning works best for setting the tone of your day.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: Spacing.xl },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
  },
  backBtn: { padding: Spacing.xs },
  backText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  shareText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },

  screenTitle: {
    fontSize: 28, fontWeight: '700', color: Colors.textPrimary,
    paddingHorizontal: Spacing.lg, letterSpacing: -0.6, marginBottom: 2,
  },
  screenDate: {
    fontSize: 13, color: Colors.textMuted,
    paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg,
  },

  mainCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  mainCardGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 160,
    backgroundColor: 'rgba(77,191,138,0.07)',
  },
  sourcePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md,
  },
  sourceDot: { width: 6, height: 6, borderRadius: 3 },
  sourceText: { fontSize: 11, fontWeight: '600', color: 'rgba(242,238,232,0.40)', letterSpacing: 1 },
  quoteOpen: {
    fontSize: 72, lineHeight: 56,
    color: 'rgba(77,191,138,0.20)', marginBottom: -Spacing.sm,
  },
  affirmText: {
    fontSize: 22, fontWeight: '400', lineHeight: 34,
    color: Colors.textPrimary, fontStyle: 'italic',
    letterSpacing: 0.1, marginBottom: Spacing.lg,
  },
  tags: { flexDirection: 'row', gap: Spacing.sm },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  tagText: { fontSize: 11, fontWeight: '600', color: 'rgba(242,238,232,0.55)', textTransform: 'capitalize' },

  reasonCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    borderRadius: Radius.lg, padding: Spacing.md,
    flexDirection: 'row', gap: Spacing.sm, overflow: 'hidden',
  },
  reasonAccent: { width: 2, backgroundColor: Colors.primary, borderRadius: 1 },
  reasonLabel: {
    fontSize: 10, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 1.5, marginBottom: Spacing.xs,
  },
  reasonText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },

  actions: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md,
  },
  actionBtn: {
    flex: 1, borderRadius: Radius.lg, paddingVertical: Spacing.md,
    alignItems: 'center', gap: 4,
  },
  actionBtnActive: {
    backgroundColor: 'rgba(77,191,138,0.12)',
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  actionIcon: { fontSize: 20, color: Colors.textSecondary },
  actionIconActive: { color: Colors.primary },
  actionLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  actionLabelActive: { color: Colors.primary },

  errorCard: {
    marginHorizontal: Spacing.lg, marginTop: Spacing.sm,
    backgroundColor: 'rgba(224,112,112,0.10)',
    borderRadius: Radius.md, padding: Spacing.md,
    borderLeftWidth: 3, borderLeftColor: Colors.error,
  },
  errorText: { fontSize: 13, color: Colors.error, lineHeight: 19 },

  emptyState: {
    marginHorizontal: Spacing.lg, borderRadius: Radius.xxl,
    padding: Spacing.xl, alignItems: 'center',
  },
  emptyOrb: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(77,191,138,0.10)',
    borderWidth: 1, borderColor: 'rgba(77,191,138,0.20)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyOrbInner: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 2.5, borderColor: Colors.primary,
    transform: [{ rotate: '45deg' }],
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.xs },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21 },

  tipWrap: {
    marginHorizontal: Spacing.lg, marginTop: Spacing.xl, paddingTop: Spacing.md,
  },
  tipLine: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: Spacing.md },
  tipLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: Spacing.xs },
  tipText: { fontSize: 13, color: Colors.textMuted, lineHeight: 20 },
});
