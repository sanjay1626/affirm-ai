// Minimal palette for new content-first, gradient-based design

export const Colors = {
  // Base — used only for flat auth/onboarding screens
  background:   '#09090F',
  surface:      '#131320',
  surfaceAlt:   '#1A1A2E',
  border:       'rgba(255,255,255,0.10)',
  divider:      'rgba(255,255,255,0.06)',

  // Text on dark backgrounds
  textPrimary:  '#F0EDE6',
  textSecondary:'rgba(240,237,230,0.60)',
  textMuted:    'rgba(240,237,230,0.32)',
  textOnPrimary:'#FFFFFF',

  // Brand
  primary:      '#7C6BEB',
  primaryLight: '#A594F9',
  primaryDark:  '#5849C0',
  accent:       '#D4A843',
  accentTeal:   '#4D7C78',
  accentAmber:  '#D4A843',

  // Translucent whites — used on gradient screens
  white:   '#FFFFFF',
  white90: 'rgba(255,255,255,0.90)',
  white70: 'rgba(255,255,255,0.70)',
  white50: 'rgba(255,255,255,0.50)',
  white30: 'rgba(255,255,255,0.30)',
  white15: 'rgba(255,255,255,0.15)',
  white08: 'rgba(255,255,255,0.08)',
  white05: 'rgba(255,255,255,0.05)',

  // Translucent darks
  dark70: 'rgba(0,0,0,0.70)',
  dark50: 'rgba(0,0,0,0.50)',
  dark30: 'rgba(0,0,0,0.30)',
  dark15: 'rgba(0,0,0,0.15)',
  dark08: 'rgba(0,0,0,0.08)',

  // Glass surfaces
  glass:       'rgba(255,255,255,0.06)',
  glassBright: 'rgba(255,255,255,0.11)',
  glassDark:   'rgba(0,0,0,0.28)',
  glassBorder: 'rgba(255,255,255,0.10)',

  // Functional
  success: '#4DBF8A',
  error:   '#E07070',
  warning: '#D4A843',

  // Mood
  mood1: '#E07070', mood2: '#D4A843', mood3: '#B8B040', mood4: '#4A9E9A', mood5: '#4DBF8A',

  // Blob colours for Background component
  blobGreen: '#1B5C38',
  blobGold:  '#8B5E0A',
  blobTeal:  '#0B4055',
} as const;

export type ColorKey = keyof typeof Colors;
