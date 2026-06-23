import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Share, ActivityIndicator, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getTodaysQuote, generateAffirmation, Quote } from '../services/affirmationService';
import { Background } from '../components/Background';
import { Glass } from '../utils/glass';
import { Colors } from '../utils/colors';
import { Spacing, Radius } from '../utils/spacing';
import { Button } from '../components/Button';

export function DailyQuoteScreen() {
  const navigation = useNavigation();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  const load = useCallback(async () => {
    const q = await getTodaysQuote();
    setQuote(q);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError('');
    try {
      const result = await generateAffirmation('daily');
      setQuote({
        id: (result as any).id ?? String(Date.now()),
        quote_text: result.quote_text,
        quote_author: result.quote_author,
        category: result.category,
        generated_for: new Date().toISOString().split('T')[0],
      });
    } catch (e: unknown) {
      setGenerateError(e instanceof Error ? e.message : 'Could not generate quote');
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!quote) return;
    await Share.share({
      message: `"${quote.quote_text}"\n— ${quote.quote_author ?? 'Unknown'}\n\nShared from AffirmAI`,
    });
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

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          {quote && (
            <TouchableOpacity onPress={handleShare}>
              <Text style={styles.shareText}>Share</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.screenTitle}>Daily Quote</Text>
        <Text style={styles.screenDate}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        {quote ? (
          <>
            {/* Hero quote card */}
            <View style={[styles.heroCard, Glass.cardDark]}>
              <View style={styles.heroGlow} />
              <Text style={styles.openMark}>"</Text>
              <Text style={styles.quoteText}>{quote.quote_text}</Text>
              <View style={styles.goldLine} />
              <Text style={styles.authorText}>{quote.quote_author ?? 'Unknown'}</Text>
            </View>

            {/* Reflection glass card */}
            <View style={[styles.reflectionCard, Glass.card]}>
              <Text style={styles.reflectionLabel}>REFLECTION</Text>
              <Text style={styles.reflectionText}>
                How does this resonate with where you are right now? Give it a moment.
              </Text>
            </View>

            {/* Share row */}
            <TouchableOpacity style={[styles.shareCard, Glass.card]} onPress={handleShare} activeOpacity={0.8}>
              <Text style={styles.shareCardText}>Share this quote</Text>
              <Text style={styles.shareCardArrow}>↑</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={[styles.emptyState, Glass.card]}>
            <View style={styles.emptyOrb}>
              <Text style={styles.emptyOrbQuote}>"</Text>
            </View>
            <Text style={styles.emptyTitle}>
              {generateError ? 'Could not generate' : 'No quote yet today'}
            </Text>
            <Text style={styles.emptyText}>
              {generateError || "Generate your daily affirmation to receive today's quote."}
            </Text>
            <Button
              label={generating ? 'Generating…' : generateError ? 'Try Again' : "Get Today's Quote"}
              onPress={handleGenerate}
              loading={generating}
              style={{ marginTop: Spacing.lg, alignSelf: 'stretch' }}
            />
          </View>
        )}
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
  backText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  shareText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  screenTitle: {
    fontSize: 28, fontWeight: '700', color: Colors.textPrimary,
    paddingHorizontal: Spacing.lg, letterSpacing: -0.6, marginBottom: 2,
  },
  screenDate: { fontSize: 13, color: Colors.textMuted, paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },

  heroCard: {
    marginHorizontal: Spacing.lg, borderRadius: Radius.xxl,
    padding: Spacing.xl, marginBottom: Spacing.md, overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 120,
    backgroundColor: 'rgba(212,168,67,0.07)',
  },
  openMark: {
    fontSize: 80, lineHeight: 64,
    color: 'rgba(212,168,67,0.30)',
    fontFamily: 'Georgia',
    marginBottom: -Spacing.sm,
    marginLeft: -Spacing.xs,
  },
  quoteText: {
    fontSize: 20, fontWeight: '400', lineHeight: 32,
    color: Colors.textPrimary, fontStyle: 'italic', marginBottom: Spacing.lg,
  },
  goldLine: {
    width: 36, height: 2,
    backgroundColor: Colors.accent, borderRadius: 1, marginBottom: Spacing.md,
  },
  authorText: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.2 },

  reflectionCard: {
    marginHorizontal: Spacing.lg, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  reflectionLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: Spacing.xs },
  reflectionText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },

  shareCard: {
    marginHorizontal: Spacing.lg, borderRadius: Radius.lg,
    padding: Spacing.md, flexDirection: 'row', alignItems: 'center',
  },
  shareCardText: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  shareCardArrow: { fontSize: 18, color: Colors.textMuted },

  emptyState: {
    marginHorizontal: Spacing.lg, borderRadius: Radius.xxl,
    padding: Spacing.xl, alignItems: 'center',
  },
  emptyOrb: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(212,168,67,0.10)',
    borderWidth: 1, borderColor: 'rgba(212,168,67,0.20)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyOrbQuote: { fontSize: 28, color: Colors.accent, fontFamily: 'Georgia', lineHeight: 36 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.xs },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21 },
});
