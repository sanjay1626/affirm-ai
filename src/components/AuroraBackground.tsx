// Living aurora gradient background.
// Three stacked LinearGradient layers with animated opacity create
// the shifting, breathing effect without animating gradient colors.
import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import { getGradient, getAuroraOverlays } from '../utils/gradients';

const { width: W, height: H } = Dimensions.get('window');

// ── Floating particle ──────────────────────────────────────────────────────────

function Particle({ x, delay, size }: { x: number; delay: number; size: number }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const run = () => {
      translateY.value = 0;
      opacity.value = withSequence(
        withTiming(0, { duration: delay }),
        withTiming(0.35, { duration: 1200, easing: Easing.out(Easing.ease) }),
        withTiming(0.35, { duration: H * 3 - 1200 - 800 }),
        withTiming(0, { duration: 800 }),
      );
      translateY.value = withSequence(
        withTiming(0, { duration: delay }),
        withTiming(-H, { duration: H * 3, easing: Easing.linear }),
      );
    };
    run();
    const total = delay + H * 3;
    const id = setInterval(run, total);
    return () => clearInterval(id);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[styles.particle, style, { left: x, bottom: -size, width: size, height: size, borderRadius: size / 2 }]}
    />
  );
}

// ── Aurora layers ──────────────────────────────────────────────────────────────

interface Props {
  category?: string | null;
  // `subtle` = calmer atmosphere for non-Home tabs: gentler veils, no particles.
  subtle?: boolean;
}

export function AuroraBackground({ category, subtle = false }: Props) {
  const gradient = getGradient(category);
  const [layer1Colors, layer2Colors] = getAuroraOverlays(category);

  // Softer opacity ranges than before for an overall lighter, gentler feel.
  // Subtle variant is gentler still so content on the other tabs stays legible.
  const v1Hi = subtle ? 0.16 : 0.40;
  const v1Lo = subtle ? 0.06 : 0.12;
  const v2Hi = subtle ? 0.12 : 0.28;
  const v2Lo = subtle ? 0.04 : 0.08;

  // Aurora veil 1: breathes
  const a1 = useSharedValue(v1Lo);
  const a1s = useSharedValue(1);
  // Aurora veil 2: counter-cycles
  const a2 = useSharedValue(v2Lo);

  useEffect(() => {
    a1.value = withRepeat(
      withSequence(
        withTiming(v1Hi, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
        withTiming(v1Lo, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, false,
    );
    a1s.value = withRepeat(
      withSequence(
        withTiming(1.14, { duration: 13000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.92, { duration: 13000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, false,
    );
    a2.value = withRepeat(
      withSequence(
        withTiming(v2Hi, { duration: 5500, easing: Easing.inOut(Easing.sin) }),
        withTiming(v2Lo, { duration: 5500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, false,
    );
  }, [category, subtle]);

  const s1 = useAnimatedStyle(() => ({
    opacity: a1.value,
    transform: [{ scale: a1s.value }],
  }));
  const s2 = useAnimatedStyle(() => ({ opacity: a2.value }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Base: stable category gradient */}
      <LinearGradient
        colors={gradient}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Aurora veil 1 — diagonal, breathes */}
      <Animated.View style={[StyleSheet.absoluteFill, s1]}>
        <LinearGradient
          colors={layer1Colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Aurora veil 2 — opposite diagonal, counter-phases */}
      <Animated.View style={[StyleSheet.absoluteFill, s2]}>
        <LinearGradient
          colors={layer2Colors}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Bottom vignette — frames text above action bar */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.50)']}
        style={styles.vignette}
      />

      {/* Floating particles — Home/Category only */}
      {!subtle && (
        <>
          <Particle x={W * 0.15} delay={0}    size={3} />
          <Particle x={W * 0.35} delay={2200} size={2} />
          <Particle x={W * 0.55} delay={4400} size={3} />
          <Particle x={W * 0.72} delay={1100} size={2} />
          <Particle x={W * 0.88} delay={3300} size={2} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.70)',
  },
  vignette: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 300,
  },
});
