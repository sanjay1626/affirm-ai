import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../utils/colors';
import { Spacing } from '../utils/spacing';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>✨</Text>
      <ActivityIndicator color={Colors.primary} size="large" style={styles.spinner} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  logo: {
    fontSize: 48,
  },
  spinner: {
    marginTop: Spacing.sm,
  },
  message: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
