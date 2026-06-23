import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, StatusBar, Dimensions, Share, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { DiscoverStackParamList } from '../navigation/MainTabNavigator';
import { generateAffirmation, addToFavorites, removeFromFavorites } from '../services/affirmationService';
import { speakText, stopSpeaking, ttsAvailable } from '../utils/speech';
import { hapticLight, hapticSuccess } from '../utils/haptics';
import { AuroraBackground } from '../components/AuroraBackground';

const { width: W, height: H } = Dimensions.get('window');
type Route = RouteProp<DiscoverStackParamList, 'Category'>;

interface CatAffirm {
  id: string;
  text: string;
  reflection?: string;
}

// ── Single category affirmation page ──────────────────────────────────────────

function AffirmPage({
  item, saved, speaking, onSave, onSpeak, onShare, category,
}: {
  item: CatAffirm;
  saved: boolean;
  speaking: boolean;
  onSave: () => void;
  onSpeak: () => void;
  onShare: () => void;
  category: string;
}) {
  const textOpacity = useSharedValue(0);
  const textY = useSharedValue(16);

  useEffect(() => {
    textOpacity.value = 0; textY.value = 16;
    textOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
    textY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) });
  }, [item.id]);

  const style = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textY.value }],
  }));

  const fs = item.text.length < 60 ? 42 : item.text.length < 100 ? 36 : item.text.length < 150 ? 32 : 28;
  const lh = Math.round(fs * 1.52);

  return (
    <View style={{ width: W, height: H }}>
      <AuroraBackground key={category} category={category} />
      <Animated.View style={[aphStyles.wrap, style]}>
        <TouchableOpacity
          onPress={onSpeak}
          onLongPress={onSave}
          delayLongPress={500}
          activeOpacity={0.95}
        >
          <Text style={[aphStyles.text, { fontSize: fs, lineHeight: lh }]}>{item.text}</Text>
        </TouchableOpacity>
        <Text style={aphStyles.hint}>
          {ttsAvailable ? 'Tap to hear · Hold to save' : 'Hold to save'}
        </Text>
      </Animated.View>

      {/* Actions */}
      <View style={aphStyles.actions}>
        <TouchableOpacity style={aphStyles.actionBtn} onPress={onSave} activeOpacity={0.7}>
          <Text style={[aphStyles.actionSym, saved && aphStyles.actionSaved]}>{saved ? '♥' : '♡'}</Text>
        </TouchableOpacity>
        {ttsAvailable && (
          <TouchableOpacity style={aphStyles.actionBtn} onPress={onSpeak} activeOpacity={0.7}>
            <Text style={[aphStyles.actionSym, speaking && aphStyles.actionSaved]}>{speaking ? '◼' : '♪'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={aphStyles.actionBtn} onPress={onShare} activeOpacity={0.7}>
          <Text style={aphStyles.actionSym}>↑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const aphStyles = StyleSheet.create({
  wrap: {
    flex: 1, justifyContent: 'center',
    paddingHorizontal: 36, paddingVertical: 20,
    gap: 18,
  },
  text: {
    fontWeight: '200', fontStyle: 'italic',
    color: 'rgba(255,255,255,0.94)',
    textAlign: 'center', letterSpacing: 0.5,
  },
  hint: {
    fontSize: 10, color: 'rgba(255,255,255,0.22)',
    textAlign: 'center', letterSpacing: 1.2,
  },
  actions: {
    flexDirection: 'row', justifyContent: 'center', gap: 32,
    paddingBottom: 24,
  },
  actionBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  actionSym: { fontSize: 18, color: 'rgba(255,255,255,0.60)' },
  actionSaved: { color: 'rgba(255,255,255,0.95)' },
});

// ── CategoryScreen ─────────────────────────────────────────────────────────────

export function CategoryScreen() {
  const nav = useNavigation();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { categoryId, categoryLabel } = route.params;

  const [items, setItems] = useState<CatAffirm[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const result = await generateAffirmation('extra');
      const r = result as any;
      const item: CatAffirm = {
        id: r.id ?? String(Date.now()),
        text: result.affirmation_text,
        reflection: r.reflection ?? result.reason,
      };
      setItems(prev => [...prev, item]);
      const nextIdx = items.length;
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
        setCurrentIndex(nextIdx);
      }, 150);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [items.length]);

  useEffect(() => { generate(); }, []);

  const handleSave = async (item: CatAffirm) => {
    if (savedIds.has(item.id)) {
      await removeFromFavorites(item.id);
      setSavedIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
    } else {
      hapticSuccess();
      await addToFavorites(item.id, item.text);
      setSavedIds(prev => new Set(prev).add(item.id));
    }
  };

  const handleSpeak = (item: CatAffirm) => {
    hapticLight();
    if (speakingId === item.id) {
      stopSpeaking();
      setSpeakingId(null);
    } else {
      setSpeakingId(item.id);
      speakText(item.text, () => setSpeakingId(null));
    }
  };

  const handleShare = async (item: CatAffirm) => {
    await Share.share({ message: `"${item.text}"\n\n— AffirmAI` });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#09090F' }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {items.length === 0 && loading ? (
        <View style={{ flex: 1 }}>
          <AuroraBackground category={categoryId} />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <ActivityIndicator color="rgba(255,255,255,0.55)" size="large" />
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.36)', letterSpacing: 0.3 }}>
              Creating your affirmation…
            </Text>
          </View>
        </View>
      ) : (
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
            stopSpeaking();
            setSpeakingId(null);
          }}
          renderItem={({ item }) => (
            <AffirmPage
              item={item}
              saved={savedIds.has(item.id)}
              speaking={speakingId === item.id}
              category={categoryId}
              onSave={() => handleSave(item)}
              onSpeak={() => handleSpeak(item)}
              onShare={() => handleShare(item)}
            />
          )}
          getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
        />
      )}

      {/* Back button overlay */}
      <View style={[csStyles.topOverlay, { paddingTop: insets.top + 12 }]} pointerEvents="box-none">
        <TouchableOpacity style={csStyles.backBtn} onPress={() => nav.goBack()} activeOpacity={0.7}>
          <Text style={csStyles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={csStyles.catLabel}>{categoryLabel.toUpperCase()}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Bottom: dots + generate more */}
      <View style={[csStyles.bottom, { paddingBottom: (insets.bottom || 0) + 100 }]} pointerEvents="box-none">
        {/* Dots */}
        {items.length > 1 && (
          <View style={csStyles.dots}>
            {items.map((_, i) => (
              <View key={i} style={[csStyles.dot, i === currentIndex && csStyles.dotActive]} />
            ))}
          </View>
        )}
        <TouchableOpacity
          style={csStyles.moreBtn}
          onPress={generate}
          disabled={loading}
          activeOpacity={0.75}
        >
          {loading
            ? <ActivityIndicator color="rgba(255,255,255,0.60)" size="small" />
            : <Text style={csStyles.moreBtnText}>Another one</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const csStyles = StyleSheet.create({
  topOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 26, color: 'rgba(255,255,255,0.70)' },
  catLabel: {
    fontSize: 10, fontWeight: '700',
    color: 'rgba(255,255,255,0.40)',
    letterSpacing: 3,
  },

  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', gap: 14,
  },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)' },
  dotActive: { backgroundColor: 'rgba(255,255,255,0.80)', width: 14, borderRadius: 3 },

  moreBtn: {
    paddingVertical: 14, paddingHorizontal: 44,
    borderRadius: 999, minWidth: 150, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
  },
  moreBtnText: {
    fontSize: 15, fontWeight: '400',
    color: 'rgba(255,255,255,0.78)',
    letterSpacing: 0.5,
  },
});
