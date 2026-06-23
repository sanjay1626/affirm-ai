export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 30,
  full: 9999,
} as const;

// Shadow constants — use the shadow() helper to get platform-appropriate styles.
// These are kept for backwards-compat but new code should prefer shadow() directly.
import { shadow } from './shadow';

export const Shadow = {
  sm: shadow('#000000', 2, 8,  0.25, 2),
  md: shadow('#000000', 4, 16, 0.30, 4),
  lg: shadow('#000000', 8, 24, 0.40, 8),
};
