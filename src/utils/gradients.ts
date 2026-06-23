// Gradient presets for affirmation backgrounds.
// Each is a top-to-bottom dark gradient — white text always readable.
// Aurora overlay colors are added as semi-transparent hex (8-digit: #RRGGBBAA)

// expo-linear-gradient requires `colors` to be a tuple of at least 2 colors.
export type GradientTuple = readonly [string, string, ...string[]];

export const CategoryGradients: Record<string, GradientTuple> = {
  confidence:    ['#1B0052', '#4B009E', '#6A0DAD'],
  career:        ['#0A1628', '#0D2B62', '#1565C0'],
  anxiety:       ['#0B2E1C', '#0D4A2E', '#155A38'],
  self_love:     ['#26003A', '#5D0E8B', '#7B1FA2'],
  relationships: ['#1C003A', '#45006E', '#6A1B9A'],
  productivity:  ['#071326', '#0A2744', '#0D47A1'],
  spirituality:  ['#0D0A24', '#1A1050', '#3116A6'],
  gratitude:     ['#1A0A00', '#3E1F00', '#6D3400'],
  health:        ['#001E12', '#003D26', '#005C3A'],
  creativity:    ['#200A00', '#4A1200', '#7B2000'],
  default:       ['#0F0C29', '#302B63', '#24243e'],
  morning:       ['#0F1923', '#162435', '#1C3050'],
  evening:       ['#0D0221', '#1A0539', '#26076B'],
} as const;

// Pick a gradient for a category string (handles casing, underscores, spaces)
export function getGradient(category?: string | null): GradientTuple {
  if (!category) return CategoryGradients.default;
  const key = category.toLowerCase().replace(/[\s-]/g, '_');
  return CategoryGradients[key] ?? CategoryGradients.default;
}

// Blob accent colors per gradient — lighter version for animated glow blobs
export const BlobAccents: Record<string, readonly string[]> = {
  confidence:    ['#8B1CF7', '#D946EF'],
  career:        ['#1976D2', '#42A5F5'],
  anxiety:       ['#1B5E20', '#4CAF50'],
  self_love:     ['#9C27B0', '#CE93D8'],
  relationships: ['#7B1FA2', '#BA68C8'],
  productivity:  ['#1565C0', '#64B5F6'],
  spirituality:  ['#4527A0', '#9575CD'],
  gratitude:     ['#E65100', '#FFAB40'],
  health:        ['#1B5E20', '#69F0AE'],
  creativity:    ['#BF360C', '#FF8A65'],
  default:       ['#5C4DB1', '#9B8CD4'],
  morning:       ['#1A4A7A', '#4A90D9'],
  evening:       ['#5E35B1', '#B39DDB'],
};

export function getBlobAccents(category?: string | null): readonly string[] {
  if (!category) return BlobAccents.default;
  const key = category.toLowerCase().replace(/[\s-]/g, '_');
  return BlobAccents[key] ?? BlobAccents.default;
}

// ── Aurora overlay layers per category ────────────────────────────────────────
// Two overlay gradient triplets per category.
// Each triplet: [start, mid, end] colors used diagonally over the base.
// '40' = 25% opacity, '60' = 38%, '80' = 50%, '99' = 60%, 'AA' = 67%
export const AuroraOverlays: Record<string, [GradientTuple, GradientTuple]> = {
  confidence:    [['#9C27B040', '#7B1FA260', '#4A148C40'], ['#E040FB20', '#AB47BC40', '#E040FB20']],
  career:        [['#1565C040', '#0D47A160', '#01579B40'], ['#42A5F520', '#1E88E540', '#42A5F520']],
  anxiety:       [['#1B5E2040', '#2E7D3260', '#1B5E2040'], ['#43A04720', '#66BB6A40', '#43A04720']],
  self_love:     [['#6A1B9A40', '#8E24AA60', '#6A1B9A40'], ['#CE93D820', '#BA68C840', '#CE93D820']],
  relationships: [['#4A148C40', '#6A1B9A60', '#4A148C40'], ['#9C27B020', '#AB47BC40', '#9C27B020']],
  productivity:  [['#0D47A140', '#1565C060', '#0D47A140'], ['#1E88E520', '#42A5F540', '#1E88E520']],
  spirituality:  [['#311B9240', '#4527A060', '#311B9240'], ['#9575CD20', '#7E57C240', '#9575CD20']],
  gratitude:     [['#E6510040', '#BF360C60', '#E6510040'], ['#FF8A6520', '#FF704040', '#FF8A6520']],
  health:        [['#1B5E2040', '#2E7D3260', '#1B5E2040'], ['#66BB6A20', '#A5D6A740', '#66BB6A20']],
  creativity:    [['#BF360C40', '#E64A1960', '#BF360C40'], ['#FF704020', '#FF8A6540', '#FF704020']],
  default:       [['#4527A040', '#512DA860', '#4527A040'], ['#9575CD20', '#B39DDB40', '#9575CD20']],
  morning:       [['#0D47A140', '#1565C060', '#0D47A140'], ['#42A5F520', '#90CAF940', '#42A5F520']],
  evening:       [['#4A148C40', '#6A1B9A60', '#4A148C40'], ['#CE93D820', '#B39DDB40', '#CE93D820']],
};

export function getAuroraOverlays(category?: string | null): [GradientTuple, GradientTuple] {
  if (!category) return AuroraOverlays.default;
  const key = category.toLowerCase().replace(/[\s-]/g, '_');
  return AuroraOverlays[key] ?? AuroraOverlays.default;
}

// All browsable categories shown in Discover
export const DISCOVER_CATEGORIES = [
  { id: 'confidence',    label: 'Confidence',    emoji: '✦' },
  { id: 'career',        label: 'Career',         emoji: '◈' },
  { id: 'anxiety',       label: 'Anxiety',        emoji: '◎' },
  { id: 'self_love',     label: 'Self-Love',      emoji: '◇' },
  { id: 'relationships', label: 'Relationships',  emoji: '◉' },
  { id: 'productivity',  label: 'Productivity',   emoji: '▲' },
  { id: 'spirituality',  label: 'Spirituality',   emoji: '✧' },
  { id: 'gratitude',     label: 'Gratitude',      emoji: '◆' },
] as const;

export type CategoryId = typeof DISCOVER_CATEGORIES[number]['id'];
