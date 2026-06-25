// Auto-shrinking text. Renders at a starting font size, measures its rendered
// height, and steps the size down until it fits within `available` height.
// Cross-platform (uses onLayout height, not line-count, so it works on web too).
import React, { useEffect, useState } from 'react';
import { Text, StyleProp, TextStyle, LayoutChangeEvent } from 'react-native';

interface Props {
  text: string;
  available: number;        // available height in px (0 = unmeasured, render at max)
  maxSize: number;
  minSize: number;
  lineHeightRatio: number;
  style?: StyleProp<TextStyle>;
}

// Estimate a sensible starting size from text length so we converge in fewer steps.
function estimateStart(text: string, maxSize: number, minSize: number): number {
  const len = text.length;
  if (len < 50)  return maxSize;
  if (len < 80)  return Math.max(minSize, maxSize - 4);
  if (len < 110) return Math.max(minSize, maxSize - 8);
  if (len < 150) return Math.max(minSize, maxSize - 12);
  return Math.max(minSize, maxSize - 16);
}

export function AutoFitText({ text, available, maxSize, minSize, lineHeightRatio, style }: Props) {
  const [size, setSize] = useState(() => estimateStart(text, maxSize, minSize));

  // Reset to the estimate whenever the text or the available space changes.
  useEffect(() => {
    setSize(estimateStart(text, maxSize, minSize));
  }, [text, available, maxSize, minSize]);

  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (available > 0 && h > available && size > minSize) {
      // Step down — larger steps when far over, fine steps when close.
      const overshoot = h - available;
      const step = overshoot > available * 0.4 ? 4 : 2;
      setSize(s => Math.max(minSize, s - step));
    }
  };

  return (
    <Text
      onLayout={onLayout}
      style={[style, { fontSize: size, lineHeight: Math.round(size * lineHeightRatio) }]}
    >
      {text}
    </Text>
  );
}
