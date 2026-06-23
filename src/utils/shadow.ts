// Cross-platform shadow helper.
// React Native Web v0.19 deprecated shadow* style props in favour of CSS boxShadow.
// This helper returns the right style object for each platform so the console warning is silenced.
//
// Usage (inside or outside StyleSheet.create):
//   ...shadow('#000000', 4, 16, 0.35, 6)
//   ...shadow(Colors.primary, 4, 16, 0.40, 6)

import { Platform } from 'react-native';

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function shadow(color: string, offsetY: number, blur: number, opacity: number, elevation = 4): any {
  if (Platform.OS === 'web') {
    return { boxShadow: `0px ${offsetY}px ${blur}px ${hexToRgba(color, opacity)}` };
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: blur / 2,
    elevation,
  };
}
