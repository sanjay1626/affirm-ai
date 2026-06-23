import React, { useState } from 'react';
import {
  View, TextInput, Text, StyleSheet,
  TouchableOpacity, TextInputProps, ViewStyle,
} from 'react-native';
import { Colors } from '../utils/colors';
import { Glass } from '../utils/glass';
import { Spacing, Radius } from '../utils/spacing';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
}

export function Input({ label, error, containerStyle, isPassword = false, ...rest }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputRow,
        Glass.input,
        isFocused && styles.inputFocused,
        error && styles.inputError,
      ]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: {
    fontSize: 12, fontWeight: '600',
    color: Colors.textMuted, marginBottom: Spacing.xs, letterSpacing: 0.8,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.md, paddingHorizontal: Spacing.md,
  },
  inputFocused: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1, paddingVertical: Spacing.md - 2,
    fontSize: 16, color: Colors.textPrimary,
  },
  eyeButton: { padding: Spacing.sm },
  eyeText: { fontSize: 18 },
  error: { fontSize: 13, color: Colors.error, marginTop: Spacing.xs },
});
