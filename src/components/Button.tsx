import React from 'react';
import {
  TouchableOpacity, Text, StyleSheet,
  ActivityIndicator, ViewStyle, TextStyle,
} from 'react-native';
import { Colors } from '../utils/colors';
import { Glass } from '../utils/glass';
import { Spacing, Radius } from '../utils/spacing';
import { shadow } from '../utils/shadow';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  label, onPress, variant = 'primary', loading = false,
  disabled = false, style, textStyle, size = 'lg',
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variant === 'primary' ? styles.primary : null,
        variant === 'secondary' ? styles.secondary : null,
        variant === 'ghost' ? styles.ghost : null,
        variant === 'danger' ? styles.danger : null,
        styles[`size_${size}`],
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? '#FFF' : Colors.primary}
          size="small"
        />
      ) : (
        <Text style={[
          styles.label,
          variant === 'primary' ? styles.labelPrimary : null,
          variant === 'secondary' ? styles.labelSecondary : null,
          variant === 'ghost' ? styles.labelGhost : null,
          variant === 'danger' ? styles.labelDanger : null,
          styles[`labelSize_${size}`],
          textStyle,
        ]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primary: {
    backgroundColor: Colors.primary,
    ...shadow(Colors.primary, 4, 16, 0.40, 6),
  },
  secondary: {
    ...Glass.card,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: Colors.error,
  },
  disabled: { opacity: 0.4 },

  size_sm: { paddingVertical: Spacing.xs + 2, paddingHorizontal: Spacing.md },
  size_md: { paddingVertical: Spacing.sm + 4, paddingHorizontal: Spacing.lg },
  size_lg: { paddingVertical: Spacing.md - 2, paddingHorizontal: Spacing.xl },

  label: { fontWeight: '600', letterSpacing: 0.2 },
  labelPrimary: { color: '#FFFFFF' },
  labelSecondary: { color: Colors.textPrimary },
  labelGhost: { color: Colors.primary },
  labelDanger: { color: '#FFFFFF' },
  labelSize_sm: { fontSize: 13 },
  labelSize_md: { fontSize: 15 },
  labelSize_lg: { fontSize: 15 },
});
