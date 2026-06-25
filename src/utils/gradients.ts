// Gradient presets for affirmation backgrounds.
// Softer, muted, slightly lighter tones — calmer "luxury wellness" feel while
// keeping enough depth for white text to stay readable at the centre (mid stop).
// Aurora overlay colors are added as semi-transparent hex (8-digit: #RRGGBBAA)

// expo-linear-gradient requires `colors` to be a tuple of at least 2 colors.
export type GradientTuple = readonly [string, string, ...string[]];

export const CategoryGradients: Record<string, GradientTuple> = {
  confidence:           ['#2E2747', '#463A6B', '#5A4C82'],
  career:               ['#1E2A40', '#2C3E63', '#3A5285'],
  anxiety_stress:       ['#1E3329', '#2C4A3A', '#3A5C49'],
  self_love:            ['#3A2A40', '#5A3E63', '#74527E'],
  relationships:        ['#33263F', '#4E3A63', '#674C82'],
  productivity:         ['#1C2838', '#2A3D55', '#385072'],
  gratitude:            ['#33271C', '#4E3D2A', '#6B5238'],
  spirituality:         ['#262540', '#3A3A63', '#4E4E82'],
  financial_confidence: ['#16302A', '#234A3C', '#327055'],
  health_wellness:      ['#1C3330', '#2A4A45', '#38625A'],
  creativity:           ['#382722', '#573D32', '#74523F'],
  purpose_meaning:      ['#2E2C1E', '#4A452C', '#6B6238'],
  resilience:           ['#26292E', '#3A4048', '#525A66'],
  emotional_wellness:   ['#332329', '#4E3640', '#704F5C'],
  default:              ['#232138', '#34314F', '#423E63'],
  morning:              ['#232E3A', '#33455A', '#415673'],
  evening:              ['#2A2440', '#3E3463', '#50447E'],
} as const;

// Pick a gradient for a category string (handles casing, underscores, spaces)
export function getGradient(category?: string | null): GradientTuple {
  if (!category) return CategoryGradients.default;
  const key = category.toLowerCase().replace(/[\s-]/g, '_');
  return CategoryGradients[key] ?? CategoryGradients.default;
}

// Blob accent colors per gradient — lighter version for animated glow blobs
export const BlobAccents: Record<string, readonly string[]> = {
  confidence:           ['#8B1CF7', '#D946EF'],
  career:               ['#1976D2', '#42A5F5'],
  anxiety_stress:       ['#1B5E20', '#4CAF50'],
  self_love:            ['#9C27B0', '#CE93D8'],
  relationships:        ['#7B1FA2', '#BA68C8'],
  productivity:         ['#1565C0', '#64B5F6'],
  gratitude:            ['#E65100', '#FFAB40'],
  spirituality:         ['#4527A0', '#9575CD'],
  financial_confidence: ['#1B5E20', '#26A69A'],
  health_wellness:      ['#1B5E20', '#69F0AE'],
  creativity:           ['#BF360C', '#FF8A65'],
  purpose_meaning:      ['#9E7B1F', '#D4AF37'],
  resilience:           ['#455A64', '#90A4AE'],
  emotional_wellness:   ['#AD1457', '#F06292'],
  default:              ['#5C4DB1', '#9B8CD4'],
  morning:              ['#1A4A7A', '#4A90D9'],
  evening:              ['#5E35B1', '#B39DDB'],
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
  confidence:           [['#9C27B040', '#7B1FA260', '#4A148C40'], ['#E040FB20', '#AB47BC40', '#E040FB20']],
  career:               [['#1565C040', '#0D47A160', '#01579B40'], ['#42A5F520', '#1E88E540', '#42A5F520']],
  anxiety_stress:       [['#1B5E2040', '#2E7D3260', '#1B5E2040'], ['#43A04720', '#66BB6A40', '#43A04720']],
  self_love:            [['#6A1B9A40', '#8E24AA60', '#6A1B9A40'], ['#CE93D820', '#BA68C840', '#CE93D820']],
  relationships:        [['#4A148C40', '#6A1B9A60', '#4A148C40'], ['#9C27B020', '#AB47BC40', '#9C27B020']],
  productivity:         [['#0D47A140', '#1565C060', '#0D47A140'], ['#1E88E520', '#42A5F540', '#1E88E520']],
  gratitude:            [['#E6510040', '#BF360C60', '#E6510040'], ['#FF8A6520', '#FF704040', '#FF8A6520']],
  spirituality:         [['#311B9240', '#4527A060', '#311B9240'], ['#9575CD20', '#7E57C240', '#9575CD20']],
  financial_confidence: [['#1B5E2040', '#2E7D5060', '#1B5E2040'], ['#26A69A20', '#4DB6AC40', '#26A69A20']],
  health_wellness:      [['#1B5E2040', '#2E7D3260', '#1B5E2040'], ['#66BB6A20', '#A5D6A740', '#66BB6A20']],
  creativity:           [['#BF360C40', '#E64A1960', '#BF360C40'], ['#FF704020', '#FF8A6540', '#FF704020']],
  purpose_meaning:      [['#9E7B1F40', '#B8860B60', '#9E7B1F40'], ['#D4AF3720', '#E6C34D40', '#D4AF3720']],
  resilience:           [['#37474F40', '#546E7A60', '#37474F40'], ['#90A4AE20', '#B0BEC540', '#90A4AE20']],
  emotional_wellness:   [['#AD145740', '#C2185B60', '#AD145740'], ['#F0629220', '#F48FB140', '#F0629220']],
  default:              [['#4527A040', '#512DA860', '#4527A040'], ['#9575CD20', '#B39DDB40', '#9575CD20']],
  morning:              [['#0D47A140', '#1565C060', '#0D47A140'], ['#42A5F520', '#90CAF940', '#42A5F520']],
  evening:              [['#4A148C40', '#6A1B9A60', '#4A148C40'], ['#CE93D820', '#B39DDB40', '#CE93D820']],
};

export function getAuroraOverlays(category?: string | null): [GradientTuple, GradientTuple] {
  if (!category) return AuroraOverlays.default;
  const key = category.toLowerCase().replace(/[\s-]/g, '_');
  return AuroraOverlays[key] ?? AuroraOverlays.default;
}

// All browsable categories shown in Discover (14-category model)
export const DISCOVER_CATEGORIES = [
  { id: 'confidence',           label: 'Confidence',           emoji: '✦' },
  { id: 'career',               label: 'Career',               emoji: '◈' },
  { id: 'anxiety_stress',       label: 'Anxiety & Stress',     emoji: '◎' },
  { id: 'self_love',            label: 'Self-Love',            emoji: '◇' },
  { id: 'relationships',        label: 'Relationships',        emoji: '◉' },
  { id: 'productivity',         label: 'Productivity',         emoji: '▲' },
  { id: 'gratitude',            label: 'Gratitude',            emoji: '◆' },
  { id: 'spirituality',         label: 'Spirituality',         emoji: '✧' },
  { id: 'financial_confidence', label: 'Financial Confidence', emoji: '⬡' },
  { id: 'health_wellness',      label: 'Health & Wellness',    emoji: '❋' },
  { id: 'creativity',           label: 'Creativity',           emoji: '✺' },
  { id: 'purpose_meaning',      label: 'Purpose & Meaning',    emoji: '✸' },
  { id: 'resilience',           label: 'Resilience',           emoji: '◬' },
  { id: 'emotional_wellness',   label: 'Emotional Wellness',   emoji: '❀' },
] as const;

export type CategoryId = typeof DISCOVER_CATEGORIES[number]['id'];
