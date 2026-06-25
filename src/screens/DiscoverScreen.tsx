import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../utils/colors';
import { DISCOVER_CATEGORIES, getGradient } from '../utils/gradients';
import { derivePersonality } from '../utils/onboardingTagMap';
import { supabase } from '../services/supabase';
import { AuroraBackground } from '../components/AuroraBackground';
import type { DiscoverStackParamList } from '../navigation/MainTabNavigator';

type Nav = NativeStackNavigationProp<DiscoverStackParamList>;
type Category = typeof DISCOVER_CATEGORIES[number];

const CATEGORY_BY_ID: Record<string, Category> = Object.fromEntries(
  DISCOVER_CATEGORIES.map(c => [c.id, c])
);

// ── Category pill (horizontal scroll) ─────────────────────────────────────────

function Pill({ item, selected, onPress }: { item: Category; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[pStyles.pill, selected && pStyles.pillActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[pStyles.pillText, selected && pStyles.pillTextActive]}>{item.label}</Text>
    </TouchableOpacity>
  );
}

const pStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: 'rgba(124,107,235,0.20)',
    borderColor: 'rgba(124,107,235,0.45)',
  },
  pillText: { fontSize: 14, fontWeight: '400', color: Colors.textSecondary, letterSpacing: 0.2 },
  pillTextActive: { color: Colors.primaryLight, fontWeight: '500' },
});

// ── Editorial category card (full-width) ───────────────────────────────────────

function CategoryCard({ item, featured }: { item: Category; featured?: boolean }) {
  const nav = useNavigation<Nav>();
  const gradient = getGradient(item.id);

  return (
    <TouchableOpacity
      style={[cStyles.card, featured && cStyles.cardFeatured]}
      activeOpacity={0.88}
      onPress={() => nav.navigate('Category', { categoryId: item.id, categoryLabel: item.label })}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)']}
        start={{ x: 0.35, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={cStyles.orb} />

      <View style={cStyles.content}>
        <Text style={cStyles.emoji}>{item.emoji}</Text>
        <View style={{ gap: 3, flex: 1 }}>
          <Text style={cStyles.label}>{item.label}</Text>
          <Text style={cStyles.sub}>{cardSubtitle(item.id)}</Text>
        </View>
      </View>

      <Text style={cStyles.arrow}>→</Text>
    </TouchableOpacity>
  );
}

function cardSubtitle(id: string): string {
  const map: Record<string, string> = {
    confidence:           'Own your presence',
    career:               'Navigate ambition',
    anxiety_stress:       'Find calm within',
    self_love:            'Honour yourself',
    relationships:        'Deepen connection',
    productivity:         'Move with purpose',
    gratitude:            'Recognise abundance',
    spirituality:         'Expand your sense of meaning',
    financial_confidence: 'Steady your money mind',
    health_wellness:      'Nurture your body',
    creativity:           'Spark your imagination',
    purpose_meaning:      'Move toward what matters',
    resilience:           'Rise after the fall',
    emotional_wellness:   'Make room to feel',
  };
  return map[id] ?? 'Explore affirmations';
}

const cStyles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 14,
    height: 108,
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardFeatured: {
    height: 124,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  orb: {
    position: 'absolute',
    top: -40, left: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  emoji: { fontSize: 22, color: 'rgba(255,255,255,0.72)' },
  label: { fontSize: 19, fontWeight: '300', color: 'rgba(255,255,255,0.92)', letterSpacing: 0.2 },
  sub: { fontSize: 12, fontWeight: '400', color: 'rgba(255,255,255,0.50)', letterSpacing: 0.2 },
  arrow: { fontSize: 18, color: 'rgba(255,255,255,0.30)' },
});

// ── Section heading ────────────────────────────────────────────────────────────

function SectionHeading({ title, caption }: { title: string; caption?: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
    </View>
  );
}

// ── DiscoverScreen ─────────────────────────────────────────────────────────────

export function DiscoverScreen() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [forYouIds, setForYouIds] = useState<string[]>([]);
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('onboarding_answers')
        .select('preferred_name, life_areas, main_goals, current_struggles')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        // Canonical 14-category mapping → personalized "For you" order.
        setForYouIds([...derivePersonality(data).focus_categories]);
        if (data.preferred_name) setFirstName(String(data.preferred_name).split(' ')[0]);
      }
    })();
  }, []);

  // Split categories into "For you" (matched, in priority order) and the rest.
  const { forYou, rest } = useMemo(() => {
    const matched = forYouIds.map(id => CATEGORY_BY_ID[id]).filter(Boolean) as Category[];
    const matchedSet = new Set(forYouIds);
    const others = DISCOVER_CATEGORIES.filter(c => !matchedSet.has(c.id));
    return { forYou: matched, rest: others };
  }, [forYouIds]);

  const filtering = selectedId !== null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <AuroraBackground subtle />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Discover</Text>
          <Text style={styles.sub}>
            {firstName ? `Curated for you, ${firstName}` : 'Explore by what you need today'}
          </Text>
        </View>

        {/* Category pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pills}
          style={styles.pillsScroll}
        >
          {DISCOVER_CATEGORIES.map(cat => (
            <Pill
              key={cat.id}
              item={cat}
              selected={selectedId === cat.id}
              onPress={() => setSelectedId(prev => (prev === cat.id ? null : cat.id))}
            />
          ))}
        </ScrollView>

        {/* Cards */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 18, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          {filtering ? (
            // Pill filter active — show just the chosen category
            CATEGORY_BY_ID[selectedId!] && <CategoryCard item={CATEGORY_BY_ID[selectedId!]} />
          ) : (
            <>
              {forYou.length > 0 && (
                <>
                  <SectionHeading title="For you" caption="Based on your goals & check-ins" />
                  {forYou.map(cat => <CategoryCard key={cat.id} item={cat} featured />)}
                </>
              )}
              <SectionHeading title={forYou.length > 0 ? 'Explore more' : 'All themes'} />
              {rest.map(cat => <CategoryCard key={cat.id} item={cat} />)}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 4, gap: 4,
  },
  title: { fontSize: 32, fontWeight: '200', color: Colors.white90, letterSpacing: 0.2 },
  sub: { fontSize: 14, fontWeight: '400', color: Colors.textSecondary },

  pillsScroll: { flexGrow: 0, marginTop: 16 },
  pills: { paddingHorizontal: 20, gap: 8 },

  sectionHead: {
    paddingHorizontal: 24, paddingTop: 14, paddingBottom: 12, gap: 2,
  },
  sectionTitle: {
    fontSize: 12, fontWeight: '700',
    color: Colors.textMuted, letterSpacing: 2, textTransform: 'uppercase',
  },
  sectionCaption: {
    fontSize: 12, fontWeight: '400', color: 'rgba(255,255,255,0.35)',
  },
});
