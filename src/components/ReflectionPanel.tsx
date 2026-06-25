// Collapsible "Your AI reflection" panel. Shared by Home + Category screens.
// Auto-measures its content so longer reflections aren't clipped.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';

export function ReflectionPanel({ reflection }: { reflection?: string }) {
  const [open, setOpen] = useState(false);
  const [contentH, setContentH] = useState(0);
  const height = useSharedValue(0);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    height.value = withTiming(next ? (contentH || 160) : 0, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
  };

  const bodyStyle = useAnimatedStyle(() => ({ height: height.value, overflow: 'hidden' }));

  if (!reflection) return null;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.trigger} onPress={toggle} activeOpacity={0.8}>
        <View style={styles.triggerLeft}>
          <Text style={styles.icon}>◈</Text>
          <Text style={styles.triggerLabel}>Your AI reflection</Text>
        </View>
        <Text style={styles.chevron}>{open ? '↑' : '↓'}</Text>
      </TouchableOpacity>

      <Animated.View style={bodyStyle}>
        <View
          style={styles.body}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && h !== contentH) setContentH(h);
          }}
        >
          <Text style={styles.bodyText}>{reflection}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  chevron: { fontSize: 14, color: 'rgba(255,255,255,0.40)' },
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
