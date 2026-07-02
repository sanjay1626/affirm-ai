import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Dimensions, Share, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { DiscoverStackParamList } from '../navigation/MainTabNavigator';
import {
  generateTriad, addToFavorites, createAffirmationFromLibrary, incrementLibrarySave,
  type TriadResult, type LibraryLine,
} from '../services/affirmationService';
import { schedulePracticeNotification } from '../services/notificationService';
import { setDailyPractice } from '../services/practiceService';
import { speakText, stopSpeaking, ttsAvailable } from '../utils/speech';
import { hapticLight, hapticSuccess } from '../utils/haptics';
import { AuroraBackground } from '../components/AuroraBackground';
import { AutoFitText } from '../components/AutoFitText';
import { ReflectionPanel } from '../components/ReflectionPanel';

const { width: W, height: H } = Dimensions.get('window');
type Route = RouteProp<DiscoverStackParamList, 'Category'>;

const keyOf = (line: LibraryLine) => line.library_id ?? line.text;

export function CategoryScreen() {
  const nav = useNavigation();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { categoryId, categoryLabel } = route.params;

  const [triad, setTriad] = useState<TriadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [availH, setAvailH] = useState(0);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [practiceSet, setPracticeSet] = useState(false);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);

  const fade = useSharedValue(0);
  const slide = useSharedValue(14);

  const loadTriad = useCallback(async () => {
    setLoading(true);
    try {
      const t = await generateTriad(categoryId);
      setTriad(t);
      setSavedKeys(new Set());
      setPracticeSet(false);
      setSpeakingKey(null);
      stopSpeaking();
      fade.value = 0; slide.value = 14;
      fade.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
      slide.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) });
    } catch {
      // leave previous triad in place
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => { loadTriad(); }, [loadTriad]);

  const handleSpeak = (line: LibraryLine) => {
    if (!ttsAvailable) return;
    hapticLight();
    const k = keyOf(line);
    if (speakingKey === k) {
      stopSpeaking();
      setSpeakingKey(null);
    } else {
      setSpeakingKey(k);
      speakText(line.text, () => setSpeakingKey(null));
    }
  };

  const handleSave = async (line: LibraryLine) => {
    const k = keyOf(line);
    if (savedKeys.has(k)) return; // add-only (popularity signal)
    hapticSuccess();
    setSavedKeys(prev => new Set(prev).add(k)); // optimistic
    try {
      // Lazy-create an `affirmations` row, then the `favorites` (Saved) row.
      const id = await createAffirmationFromLibrary({
        text: line.text, library_id: line.library_id, category: categoryId, reflection: triad?.reflection,
      });
      if (!id) throw new Error('Could not create affirmation row for save');
      await addToFavorites(id, line.text, {
        category: categoryId, source: 'discover', library_id: line.library_id,
      });
      await incrementLibrarySave(line.library_id);
    } catch (e) {
      console.warn('[Discover] save failed:', e);
      setSavedKeys(prev => { const s = new Set(prev); s.delete(k); return s; }); // revert
    }
  };

  const handleShare = async (line: LibraryLine) => {
    await Share.share({ message: `"${line.text}"\n\n— AffirmAI` });
  };

  const handlePracticeAnchor = async () => {
    if (!triad || practiceSet) return;
    hapticSuccess();
    setPracticeSet(true);
    const anchor = triad.anchor;
    const id = await createAffirmationFromLibrary({
      text: anchor.text, library_id: anchor.library_id, category: categoryId, reflection: triad.reflection,
    });
    await setDailyPractice(anchor.text, id ?? undefined, anchor.library_id);
    await schedulePracticeNotification();
  };

  const heroStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: slide.value }],
  }));

  const anchor = triad?.anchor;
  const anchorSaved = anchor ? savedKeys.has(keyOf(anchor)) : false;
  const textAvailable = availH > 0 ? Math.max(0, availH - 64) : 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <AuroraBackground category={categoryId} />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.catLabel}>{categoryLabel.toUpperCase()}</Text>
        <View style={{ width: 44 }} />
      </View>

      {!triad ? (
        <View style={styles.centre}>
          <ActivityIndicator color="rgba(255,255,255,0.55)" size="large" />
          <Text style={styles.loadingText}>Gathering your set…</Text>
        </View>
      ) : (
        <>
          {/* Anchor hero */}
          <Animated.View
            style={[styles.hero, heroStyle]}
            onLayout={e => setAvailH(e.nativeEvent.layout.height)}
          >
            <Text style={styles.anchorCaption}>ANCHOR</Text>
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={() => anchor && handleSpeak(anchor)}
              onLongPress={() => anchor && handleSave(anchor)}
              delayLongPress={500}
            >
              <AutoFitText
                text={anchor!.text}
                available={textAvailable}
                maxSize={40} minSize={22} lineHeightRatio={1.5}
                style={styles.anchorText}
              />
            </TouchableOpacity>
            <Text style={styles.hint}>
              {ttsAvailable ? 'Tap to hear · Hold to save' : 'Hold to save'}
            </Text>
          </Animated.View>

          {/* Bottom cluster */}
          <Animated.View style={[styles.cluster, heroStyle, { paddingBottom: insets.bottom + 90 }]}>
            {/* Anchor actions */}
            <View style={styles.actions}>
              <ActionBtn symbol={anchorSaved ? '♥' : '♡'} active={anchorSaved} onPress={() => anchor && handleSave(anchor)} />
              {ttsAvailable && (
                <ActionBtn symbol={speakingKey === (anchor && keyOf(anchor)) ? '◼' : '♪'} active={speakingKey === (anchor && keyOf(anchor))} onPress={() => anchor && handleSpeak(anchor)} />
              )}
              <ActionBtn symbol="↑" onPress={() => anchor && handleShare(anchor)} />
            </View>

            {/* Daily practice — Anchor only */}
            <TouchableOpacity
              style={[styles.practiceBtn, practiceSet && styles.practiceBtnSet]}
              onPress={handlePracticeAnchor}
              disabled={practiceSet}
              activeOpacity={0.8}
            >
              <Text style={[styles.practiceText, practiceSet && styles.practiceTextSet]}>
                {practiceSet ? '✓ Your daily practice' : 'Use Anchor for daily practice'}
              </Text>
            </TouchableOpacity>

            {/* Companions */}
            <Text style={styles.companionCaption}>ALSO FOR YOU</Text>
            {triad.companions.map((c) => {
              const k = keyOf(c);
              const isSaved = savedKeys.has(k);
              return (
                <View key={k} style={styles.companionRow}>
                  {/* Tap text → TTS */}
                  <TouchableOpacity
                    style={styles.companionTextWrap}
                    activeOpacity={0.7}
                    onPress={() => handleSpeak(c)}
                  >
                    <Text style={styles.companionText} numberOfLines={2}>{c.text}</Text>
                  </TouchableOpacity>
                  {/* Tap heart → save only (its own touchable, so it doesn't trigger TTS) */}
                  <TouchableOpacity
                    style={styles.companionHeartBtn}
                    activeOpacity={0.6}
                    disabled={isSaved}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => handleSave(c)}
                  >
                    <Text style={[styles.companionMark, isSaved && styles.companionMarkSaved]}>
                      {isSaved ? '♥' : '♡'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            {/* One triad reflection */}
            <ReflectionPanel reflection={triad.reflection} />

            {/* Another set */}
            <TouchableOpacity style={styles.moreBtn} onPress={loadTriad} disabled={loading} activeOpacity={0.75}>
              {loading
                ? <ActivityIndicator color="rgba(255,255,255,0.60)" size="small" />
                : <Text style={styles.moreBtnText}>Another set</Text>}
            </TouchableOpacity>
          </Animated.View>
        </>
      )}
    </View>
  );
}

function ActionBtn({ symbol, onPress, active }: { symbol: string; onPress: () => void; active?: boolean }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.actionSym, active && styles.actionSymActive]}>{symbol}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#09090F' },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 10,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 26, color: 'rgba(255,255,255,0.70)' },
  catLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.40)', letterSpacing: 3 },

  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 14, color: 'rgba(255,255,255,0.36)', letterSpacing: 0.3 },

  hero: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 34, paddingTop: 80, gap: 14,
  },
  anchorCaption: {
    fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.32)', letterSpacing: 3,
  },
  anchorText: {
    fontWeight: '200', fontStyle: 'italic', color: 'rgba(255,255,255,0.95)',
    textAlign: 'center', letterSpacing: 0.5,
  },
  hint: { fontSize: 10, color: 'rgba(255,255,255,0.22)', textAlign: 'center', letterSpacing: 1.2 },

  cluster: { gap: 14, paddingHorizontal: 0 },

  actions: { flexDirection: 'row', justifyContent: 'center', gap: 30 },
  actionBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  actionSym: { fontSize: 18, color: 'rgba(255,255,255,0.60)' },
  actionSymActive: { color: 'rgba(255,255,255,0.95)' },

  practiceBtn: {
    alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 22, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(255,255,255,0.06)',
  },
  practiceBtnSet: { borderColor: 'rgba(140,200,160,0.45)', backgroundColor: 'rgba(120,200,150,0.12)' },
  practiceText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.78)', letterSpacing: 0.4 },
  practiceTextSet: { color: 'rgba(180,230,200,0.95)' },

  companionCaption: {
    fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.30)', letterSpacing: 3,
    textAlign: 'center', marginTop: 2,
  },
  companionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 24, paddingVertical: 8, paddingHorizontal: 8, paddingLeft: 16,
    borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  companionTextWrap: { flex: 1, paddingVertical: 4 },
  companionText: {
    fontSize: 15, fontWeight: '300', fontStyle: 'italic',
    color: 'rgba(255,255,255,0.82)', letterSpacing: 0.2,
  },
  companionHeartBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  companionMark: { fontSize: 18, color: 'rgba(255,255,255,0.40)' },
  companionMarkSaved: { color: 'rgba(255,255,255,0.95)' },

  moreBtn: {
    alignSelf: 'center', paddingVertical: 14, paddingHorizontal: 44, borderRadius: 999,
    minWidth: 150, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
  },
  moreBtnText: { fontSize: 15, fontWeight: '400', color: 'rgba(255,255,255,0.78)', letterSpacing: 0.5 },
});
