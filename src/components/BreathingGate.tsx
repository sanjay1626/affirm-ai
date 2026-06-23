// Full-screen breathing animation shown once before the first daily affirmation.
// One breath cycle (4s), then fades out and calls onComplete.
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSequence, withDelay, runOnJS, Easing,
} from 'react-native-reanimated';

interface Props {
  onComplete: () => void;
}

export function BreathingGate({ onComplete }: Props) {
  const containerOpacity = useSharedValue(1);
  const circleScale = useSharedValue(0.7);
  const ringOpacity = useSharedValue(0.0);
  const ringScale = useSharedValue(0.7);
  const textOpacity = useSharedValue(0);
  const labelOpacity = useSharedValue(0);

  const finish = () => {
    containerOpacity.value = withTiming(0, { duration: 700, easing: Easing.out(Easing.ease) }, (done) => {
      if (done) runOnJS(onComplete)();
    });
  };

  useEffect(() => {
    // Fade in label
    labelOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));

    // Breathe in: scale up over 2s
    circleScale.value = withSequence(
      withDelay(500, withTiming(1.35, { duration: 2200, easing: Easing.inOut(Easing.ease) })),
      // Breathe out: scale back over 2s, then fade out
      withTiming(0.7, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
    );

    // Ring pulse
    ringOpacity.value = withDelay(500, withSequence(
      withTiming(0.45, { duration: 2200 }),
      withTiming(0.0, { duration: 2000 }),
    ));
    ringScale.value = withDelay(500, withSequence(
      withTiming(1.7, { duration: 2200, easing: Easing.out(Easing.ease) }),
      withTiming(1.0, { duration: 2000 }),
    ));

    // Text: "breathe in" then "breathe out"
    textOpacity.value = withDelay(600, withSequence(
      withTiming(1, { duration: 400 }),
      withTiming(1, { duration: 1600 }),
      withTiming(0, { duration: 300 }),
      withDelay(100, withTiming(0.6, { duration: 400 })),
    ));

    // After full cycle (~4.9s), fade out
    const t = setTimeout(() => { runOnJS(finish)(); }, 4900);
    return () => clearTimeout(t);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));
  const circleStyle = useAnimatedStyle(() => ({ transform: [{ scale: circleScale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: ringOpacity.value, transform: [{ scale: ringScale.value }] }));
  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: labelOpacity.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, containerStyle]}>
      {/* Tappable to skip */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={() => runOnJS(finish)()}
      />

      {/* Expanding ring */}
      <Animated.View style={[styles.ring, ringStyle]} />

      {/* Core circle */}
      <Animated.View style={[styles.circle, circleStyle]} />

      {/* "Breathe in / out" label */}
      <Animated.View style={[styles.textWrap, textStyle]}>
        <Text style={styles.breatheText}>breathe in</Text>
      </Animated.View>

      {/* Skip hint */}
      <Animated.View style={[styles.skipWrap, labelStyle]}>
        <Text style={styles.skipText}>Tap to skip</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 99,
    backgroundColor: '#0B0821',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  circle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.50)',
  },
  textWrap: {
    position: 'absolute',
    bottom: '38%',
  },
  breatheText: {
    fontSize: 15, fontWeight: '300',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 3,
    textTransform: 'lowercase',
  },
  skipWrap: {
    position: 'absolute',
    bottom: 80,
  },
  skipText: {
    fontSize: 12, fontWeight: '400',
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 1.5,
  },
});
