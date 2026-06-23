import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, FlatList,
  TouchableOpacity, Share, StatusBar, ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSequence, withSpring, Easing, runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import {
  generateAffirmation, addToFavorites, removeFromFavorites,
  isFavorited, getAffirmationsForDate, type Affirmation,
} from '../services/affirmationService';
import { scheduleDailyNotification } from '../services/notificationService';
import { AuroraBackground } from '../components/AuroraBackground';
import { BreathingGate } from '../components/BreathingGate';
import { speakText, stopSpeaking, isSpeakingAsync, ttsAvailable } from '../utils/speech';
import { hapticLight, hapticSuccess } from '../utils/haptics';

const { width: W, height: H } = Dimensions.get('window');

// ── Helpers ────────────────────────────────────────────────────────────────────

interface AffirmItem extends Affirmation {
  reflection?: string;
  source?: string;
}

function affirmFontSize(text: string): number {
  const len = text.length;
  if (len < 50)  return 46;
  if (len < 80)  return 42;
  if (len < 110) return 38;
  if (len < 150) return 34;
  return 30;
}

// ── AI Reflection panel ────────────────────────────────────────────────────────

function ReflectionPanel({ reflection }: { reflection?: string }) {
  const [open, setOpen] = useState(false);
  const height = useSharedValue(0);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    height.value = withTiming(next ? 140 : 0, { duration: 320, easing: Easing.out(Easing.ease) });
  };

  const bodyStyle = useAnimatedStyle(() => ({ height: height.value, overflow: 'hidden' }));

  if (!reflection) return null;

  return (
    <View style={rStyles.wrap}>
      <TouchableOpacity style={rStyles.trigger} onPress={toggle} activeOpacity={0.8}>
        <View style={rStyles.triggerLeft}>
          <Text style={rStyles.icon}>◈</Text>
          <Text style={rStyles.triggerLabel}>Your AI reflection</Text>
        </View>
        <Text style={rStyles.chevron}>{open ? '↑' : '↓'}</Text>
      </TouchableOpacity>

      <Animated.View style={bodyStyle}>
        <View style={rStyles.body}>
          <Text style={rStyles.bodyText}>{reflection}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const rStyles = StyleSheet.create({
  wrap: {
    marginHorizontal: 24,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  trigger: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
  },
  triggerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { fontSize: 14, color: 'rgba(255,255,255,0.55)' },
  triggerLabel: {
    fontSize: 13, fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.3,
  },
  chevron: {
    fontSize: 14, color: 'rgba(255,255,255,0.40)',
  },
  body: {
    paddingHorizontal: 18, paddingBottom: 18, paddingTop: 4,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  bodyText: {
    fontSize: 14, fontWeight: '400',
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 22, fontStyle: 'italic',
  },
});

// ── Action bar ─────────────────────────────────────────────────────────────────

interface ActionBarProps {
  saved: boolean;
  speaking: boolean;
  generating: boolean;
  onSave: () => void;
  onSpeak: () => void;
  onRegenerate: () => void;
  onShare: () => void;
}

function ActionBar({ saved, speaking, generating, onSave, onSpeak, onRegenerate, onShare }: ActionBarProps) {
  return (
    <View style={aStyles.row}>
      <GhostAction symbol={saved ? '♥' : '♡'} label={saved ? 'Saved' : 'Save'} onPress={onSave} active={saved} />
      {ttsAvailable && (
        <GhostAction symbol={speaking ? '◼' : '♪'} label={speaking ? 'Stop' : 'Listen'} onPress={onSpeak} active={speaking} />
      )}
      <GhostAction
        symbol={generating ? '…' : '↺'}
        label="New"
        onPress={onRegenerate}
        disabled={generating}
      />
      <GhostAction symbol="↑" label="Share" onPress={onShare} />
    </View>
  );
}

function GhostAction({ symbol, label, onPress, active, disabled }:
  { symbol: string; label: string; onPress: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <TouchableOpacity
      style={aStyles.btn}
      onPress={onPress}
      activeOpacity={0.6}
      disabled={disabled}
    >
      <Text style={[aStyles.symbol, active && aStyles.symbolActive, disabled && aStyles.symbolDisabled]}>
        {symbol}
      </Text>
      <Text style={[aStyles.label, active && aStyles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const aStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: ttsAvailable ? 28 : 40,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  btn: { alignItems: 'center', gap: 5, minWidth: 44, minHeight: 44, justifyContent: 'center' },
  symbol: { fontSize: 20, color: 'rgba(255,255,255,0.45)' },
  symbolActive: { color: 'rgba(255,255,255,0.92)' },
  symbolDisabled: { color: 'rgba(255,255,255,0.22)' },
  label: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.30)', letterSpacing: 0.5 },
  labelActive: { color: 'rgba(255,255,255,0.60)' },
});

// ── Affirmation page ───────────────────────────────────────────────────────────

interface PageProps {
  item: AffirmItem;
  saved: boolean;
  speaking: boolean;
  generating: boolean;
  onSave: () => void;
  onLongPressSave: () => void;
  onSpeak: () => void;
  onRegenerate: () => void;
  onShare: () => void;
}

function AffirmationPage({
  item, saved, speaking, generating,
  onSave, onLongPressSave, onSpeak, onRegenerate, onShare,
}: PageProps) {
  const insets = useSafeAreaInsets();
  const textOpacity = useSharedValue(0);
  const textY = useSharedValue(20);
  const saveScale = useSharedValue(1);

  useEffect(() => {
    textOpacity.value = 0;
    textY.value = 20;
    textOpacity.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.ease) });
    textY.value = withTiming(0, { duration: 700, easing: Easing.out(Easing.ease) });
  }, [item.id]);

  // Pulse + haptic when saved via long press
  const triggerSavePulse = () => {
    hapticSuccess();
    saveScale.value = withSequence(
      withSpring(1.18, { damping: 6 }),
      withSpring(1.0, { damping: 8 }),
    );
    onLongPressSave();
  };

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textY.value }],
  }));
  const saveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveScale.value }],
  }));

  const fs = affirmFontSize(item.affirmation_text);
  const lh = Math.round(fs * 1.52);

  const topPad = insets.top > 0 ? insets.top + 4 : 20;
  const bottomPad = (insets.bottom > 0 ? insets.bottom : 0) + 96;

  return (
    <View style={{ width: W, height: H }}>
      {/* Aurora background — remounts on category change */}
      <AuroraBackground key={item.category ?? 'default'} category={item.category} />

      {/* Top bar — minimal */}
      <View style={[pageStyles.topBar, { paddingTop: topPad }]}>
        <Text style={pageStyles.dateText}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
        {item.category ? (
          <Text style={pageStyles.catPill}>
            {item.category.replace(/_/g, ' ').toUpperCase()}
          </Text>
        ) : null}
      </View>

      {/* Affirmation — dominates screen, centered in available space */}
      <Animated.View style={[pageStyles.affirmWrap, textStyle]}>
        <Animated.View style={saveStyle}>
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={onSpeak}
            onLongPress={triggerSavePulse}
            delayLongPress={500}
          >
            <Text style={[pageStyles.affirmText, { fontSize: fs, lineHeight: lh }]}>
              {item.affirmation_text}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Long-press hint — only shown once */}
        <Text style={pageStyles.hint}>
          {ttsAvailable ? 'Tap to hear · Hold to save' : 'Hold to save'}
        </Text>
      </Animated.View>

      {/* AI Reflection */}
      <ReflectionPanel reflection={item.reflection} />

      {/* Action bar */}
      <View style={[pageStyles.actionWrap, { paddingBottom: bottomPad }]}>
        <ActionBar
          saved={saved}
          speaking={speaking}
          generating={generating}
          onSave={onSave}
          onSpeak={onSpeak}
          onRegenerate={onRegenerate}
          onShare={onShare}
        />
      </View>
    </View>
  );
}

const pageStyles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 28,
    paddingBottom: 8,
    gap: 5,
  },
  dateText: {
    fontSize: 12, fontWeight: '400',
    color: 'rgba(255,255,255,0.42)',
    letterSpacing: 0.3,
  },
  catPill: {
    fontSize: 9, fontWeight: '700',
    color: 'rgba(255,255,255,0.30)',
    letterSpacing: 2.8,
  },

  affirmWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 12,
    gap: 20,
  },
  affirmText: {
    fontWeight: '200',
    color: 'rgba(255,255,255,0.94)',
    textAlign: 'center',
    letterSpacing: 0.5,
    fontStyle: 'italic',
  },
  hint: {
    fontSize: 10, fontWeight: '400',
    color: 'rgba(255,255,255,0.22)',
    textAlign: 'center',
    letterSpacing: 1.2,
  },

  actionWrap: { paddingTop: 16 },
});

// ── Dot indicators ─────────────────────────────────────────────────────────────

function Dots({ count, current }: { count: number; current: number }) {
  if (count <= 1) return null;
  return (
    <View style={dStyles.row}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[dStyles.dot, i === current && dStyles.dotActive]} />
      ))}
    </View>
  );
}

const dStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)' },
  dotActive: { backgroundColor: 'rgba(255,255,255,0.80)', width: 14, borderRadius: 3 },
});

// ── Generate / empty state ─────────────────────────────────────────────────────

function GeneratePage({ onGenerate, generating, error }: {
  onGenerate: () => void; generating: boolean; error?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ width: W, height: H }}>
      <AuroraBackground category={null} />
      <View style={[gStyles.centre, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 100 }]}>
        <Text style={gStyles.title}>{error ? 'Something went wrong' : 'Your space is ready'}</Text>
        <Text style={gStyles.sub}>{error ?? 'Begin your practice for today'}</Text>
        <TouchableOpacity style={gStyles.btn} onPress={onGenerate} disabled={generating} activeOpacity={0.8}>
          {generating
            ? <ActivityIndicator color="rgba(255,255,255,0.8)" />
            : <Text style={gStyles.btnText}>{error ? 'Try again' : 'Begin'}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const gStyles = StyleSheet.create({
  centre: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, paddingHorizontal: 40,
  },
  title: {
    fontSize: 32, fontWeight: '200', fontStyle: 'italic',
    color: 'rgba(255,255,255,0.88)', textAlign: 'center', letterSpacing: 0.3,
  },
  sub: {
    fontSize: 15, fontWeight: '400',
    color: 'rgba(255,255,255,0.46)', textAlign: 'center', lineHeight: 24,
  },
  btn: {
    paddingVertical: 18, paddingHorizontal: 56,
    borderRadius: 999, minWidth: 160, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
  },
  btnText: {
    fontSize: 17, fontWeight: '400',
    color: 'rgba(255,255,255,0.88)', letterSpacing: 1,
  },
});

// ── HomeScreen ─────────────────────────────────────────────────────────────────

export function HomeScreen() {
  const today = new Date().toISOString().split('T')[0];
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<AffirmItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [showBreathing, setShowBreathing] = useState(false);
  const breathingShown = useRef(false);

  const flatListRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    const existing = await getAffirmationsForDate(today);
    if (existing.length > 0) {
      setItems(existing as AffirmItem[]);
      const checks = await Promise.all(existing.map(a => isFavorited(a.id)));
      const s = new Set<string>();
      existing.forEach((a, i) => { if (checks[i]) s.add(a.id); });
      setSavedIds(s);
    }
    setLoading(false);
  }, [today]);

  useEffect(() => { load(); }, [load]);

  // Show breathing gate the first time affirmations load
  useEffect(() => {
    if (!loading && items.length > 0 && !breathingShown.current) {
      breathingShown.current = true;
      setShowBreathing(true);
    }
  }, [loading, items.length]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError('');
    try {
      const result = await generateAffirmation('daily');
      const r = result as any;
      const newItem: AffirmItem = {
        id: r.id ?? String(Date.now()),
        affirmation_text: result.affirmation_text,
        category: result.category ?? '',
        tone: result.tone ?? '',
        is_daily: true,
        generated_for: today,
        created_at: new Date().toISOString(),
        reflection: r.reflection ?? result.reason ?? '',
        source: r.source ?? '',
      };
      setItems(prev => [...prev.filter(p => p.id !== '__gen__'), newItem]);
      await scheduleDailyNotification(result.affirmation_text);
      if (!breathingShown.current) {
        breathingShown.current = true;
        setShowBreathing(true);
      }
    } catch (e: unknown) {
      setGenerateError(e instanceof Error ? e.message : 'Could not generate');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const result = await generateAffirmation('extra');
      const r = result as any;
      const newItem: AffirmItem = {
        id: r.id ?? String(Date.now()),
        affirmation_text: result.affirmation_text,
        category: result.category ?? '',
        tone: result.tone ?? '',
        is_daily: false,
        generated_for: today,
        created_at: new Date().toISOString(),
        reflection: r.reflection ?? result.reason ?? '',
        source: r.source ?? '',
      };
      setItems(prev => [...prev, newItem]);
      const nextIdx = items.length;
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
        setCurrentIndex(nextIdx);
      }, 100);
    } catch {
      // silent — user can try again
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (item: AffirmItem) => {
    if (savedIds.has(item.id)) {
      await removeFromFavorites(item.id);
      setSavedIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
    } else {
      await addToFavorites(item.id, item.affirmation_text);
      setSavedIds(prev => new Set(prev).add(item.id));
    }
  };

  const handleSpeak = async (item: AffirmItem) => {
    if (!ttsAvailable) return;
    hapticLight();
    const currently = await isSpeakingAsync();
    if (currently || speakingId === item.id) {
      stopSpeaking();
      setSpeakingId(null);
    } else {
      setSpeakingId(item.id);
      speakText(item.affirmation_text, () => setSpeakingId(null));
    }
  };

  const handleShare = async (item: AffirmItem) => {
    await Share.share({ message: `"${item.affirmation_text}"\n\n— AffirmAI` });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09090F' }}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <AuroraBackground category={null} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="rgba(255,255,255,0.50)" size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#09090F' }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {items.length === 0 ? (
        <GeneratePage
          onGenerate={handleGenerate}
          generating={generating}
          error={generateError || undefined}
        />
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={items}
            keyExtractor={item => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            onMomentumScrollEnd={e => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / W);
              setCurrentIndex(idx);
              // Stop TTS when swiping to different page
              stopSpeaking();
              setSpeakingId(null);
            }}
            renderItem={({ item }) => (
              <AffirmationPage
                item={item}
                saved={savedIds.has(item.id)}
                speaking={speakingId === item.id}
                generating={generating}
                onSave={() => handleSave(item)}
                onLongPressSave={() => handleSave(item)}
                onSpeak={() => handleSpeak(item)}
                onRegenerate={handleRegenerate}
                onShare={() => handleShare(item)}
              />
            )}
            getItemLayout={(_, index) => ({ length: W, offset: W * index, index })}
          />

          {/* Dots — positioned above tab bar */}
          <View
            style={{
              position: 'absolute',
              bottom: (insets.bottom > 0 ? insets.bottom : 0) + 80,
              left: 0, right: 0,
              alignItems: 'center',
            }}
            pointerEvents="none"
          >
            <Dots count={items.length} current={currentIndex} />
          </View>

          {/* Generating pill */}
          {generating && (
            <View style={homeStyles.genPill} pointerEvents="none">
              <ActivityIndicator color="rgba(255,255,255,0.65)" size="small" />
              <Text style={homeStyles.genText}>Creating…</Text>
            </View>
          )}
        </>
      )}

      {/* Breathing gate overlay */}
      {showBreathing && (
        <BreathingGate onComplete={() => setShowBreathing(false)} />
      )}
    </View>
  );
}

const homeStyles = StyleSheet.create({
  genPill: {
    position: 'absolute', top: 56, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.40)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  genText: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
});
