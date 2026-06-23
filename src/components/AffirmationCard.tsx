import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Glass } from '../utils/glass';
import { Colors } from '../utils/colors';
import { Spacing, Radius } from '../utils/spacing';

interface AffirmationCardProps {
  text: string;
  category?: string;
  tone?: string;
  isFavorited?: boolean;
  onFavorite?: () => void;
  style?: ViewStyle;
  showActions?: boolean;
}

export function AffirmationCard({
  text, category, tone, isFavorited = false, onFavorite, style, showActions = true,
}: AffirmationCardProps) {
  return (
    <View style={[styles.card, Glass.card, style]}>
      <Text style={styles.quoteDecor}>"</Text>
      <Text style={styles.affirmationText}>{text}</Text>
      <View style={styles.footer}>
        <View style={styles.tags}>
          {category && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{category}</Text>
            </View>
          )}
          {tone && (
            <View style={[styles.tag, styles.tagSecondary]}>
              <Text style={styles.tagText}>{tone}</Text>
            </View>
          )}
        </View>
        {showActions && onFavorite && (
          <TouchableOpacity onPress={onFavorite} style={styles.heartButton}>
            <Text style={[styles.heartIcon, isFavorited && styles.heartIconFaved]}>
              {isFavorited ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.xl, padding: Spacing.lg },
  quoteDecor: {
    fontSize: 64, lineHeight: 56,
    color: 'rgba(77,191,138,0.25)',
    fontFamily: 'Georgia',
    marginBottom: -Spacing.sm, marginLeft: -Spacing.xs,
  },
  affirmationText: {
    fontSize: 20, fontWeight: '500', lineHeight: 32,
    color: Colors.textPrimary, fontStyle: 'italic',
    letterSpacing: 0.2, marginBottom: Spacing.md,
  },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  tag: {
    backgroundColor: 'rgba(77,191,138,0.12)',
    borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(77,191,138,0.20)',
  },
  tagSecondary: {
    backgroundColor: 'rgba(212,168,67,0.12)',
    borderColor: 'rgba(212,168,67,0.20)',
  },
  tagText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textTransform: 'capitalize' },
  heartButton: { padding: Spacing.xs },
  heartIcon: { fontSize: 22, color: Colors.textMuted },
  heartIconFaved: { color: Colors.error },
});
