import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Glass } from '../utils/glass';
import { Colors } from '../utils/colors';
import { Spacing, Radius } from '../utils/spacing';

interface QuoteCardProps {
  quote: string;
  author?: string;
  style?: ViewStyle;
}

export function QuoteCard({ quote, author, style }: QuoteCardProps) {
  return (
    <View style={[styles.card, Glass.card, style]}>
      <View style={styles.accentBar} />
      <View style={styles.content}>
        <Text style={styles.quoteText}>"{quote}"</Text>
        {author && <Text style={styles.author}>— {author}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.xl, flexDirection: 'row', overflow: 'hidden' },
  accentBar: { width: 3, backgroundColor: Colors.accent },
  content: { flex: 1, padding: Spacing.lg },
  quoteText: {
    fontSize: 17, fontWeight: '400', lineHeight: 26,
    color: Colors.textPrimary, fontStyle: 'italic', marginBottom: Spacing.sm,
  },
  author: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
});
