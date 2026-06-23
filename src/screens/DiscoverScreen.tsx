import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, FlatList, StatusBar, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../utils/colors';
import { DISCOVER_CATEGORIES, getGradient } from '../utils/gradients';
import type { DiscoverStackParamList } from '../navigation/MainTabNavigator';

const { width: W } = Dimensions.get('window');
type Nav = NativeStackNavigationProp<DiscoverStackParamList>;

// ── Category pill (horizontal scroll) ─────────────────────────────────────────

function Pill({ item, selected, onPress }: { item: typeof DISCOVER_CATEGORIES[number]; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[pStyles.pill, selected && pStyles.pillActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[pStyles.pillText, selected && pStyles.pillTextActive]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}

const pStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: 'rgba(124,107,235,0.18)',
    borderColor: 'rgba(124,107,235,0.45)',
  },
  pillText: {
    fontSize: 14, fontWeight: '400',
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },
  pillTextActive: {
    color: Colors.primaryLight,
    fontWeight: '500',
  },
});

// ── Editorial category card (full-width) ───────────────────────────────────────

function CategoryCard({ item }: { item: typeof DISCOVER_CATEGORIES[number] }) {
  const nav = useNavigation<Nav>();
  const gradient = getGradient(item.id);

  return (
    <TouchableOpacity
      style={cStyles.card}
      activeOpacity={0.88}
      onPress={() => nav.navigate('Category', { categoryId: item.id, categoryLabel: item.label })}
    >
      {/* Gradient fills the left 40% */}
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Dark overlay on right for readability */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.62)']}
        start={{ x: 0.35, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle light orb top-left */}
      <View style={cStyles.orb} />

      {/* Content */}
      <View style={cStyles.content}>
        <Text style={cStyles.emoji}>{item.emoji}</Text>
        <View style={{ gap: 3 }}>
          <Text style={cStyles.label}>{item.label}</Text>
          <Text style={cStyles.sub}>{cardSubtitle(item.id)}</Text>
        </View>
      </View>

      {/* Arrow */}
      <Text style={cStyles.arrow}>→</Text>
    </TouchableOpacity>
  );
}

function cardSubtitle(id: string): string {
  const map: Record<string, string> = {
    confidence:    'Own your presence',
    career:        'Navigate ambition',
    anxiety:       'Find calm within',
    self_love:     'Honour yourself',
    relationships: 'Deepen connection',
    productivity:  'Move with purpose',
    spirituality:  'Expand your sense of meaning',
    gratitude:     'Recognise abundance',
  };
  return map[id] ?? 'Explore affirmations';
}

const cStyles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 14,
    height: 110,
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  orb: {
    position: 'absolute',
    top: -40, left: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  emoji: { fontSize: 22, color: 'rgba(255,255,255,0.70)' },
  label: {
    fontSize: 19, fontWeight: '300',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.2,
  },
  sub: {
    fontSize: 12, fontWeight: '400',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.2,
  },
  arrow: {
    fontSize: 18, color: 'rgba(255,255,255,0.30)',
  },
});

// ── DiscoverScreen ─────────────────────────────────────────────────────────────

export function DiscoverScreen() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pillsRef = useRef<ScrollView>(null);

  const displayedCategories = selectedId
    ? DISCOVER_CATEGORIES.filter(c => c.id === selectedId)
    : DISCOVER_CATEGORIES;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Discover</Text>
          <Text style={styles.sub}>Explore by what you need today</Text>
        </View>

        {/* Category pills */}
        <ScrollView
          ref={pillsRef}
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
              onPress={() => setSelectedId(prev => prev === cat.id ? null : cat.id)}
            />
          ))}
        </ScrollView>

        {/* Category cards — editorial full-width */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {displayedCategories.map(cat => (
            <CategoryCard key={cat.id} item={cat} />
          ))}
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
});
