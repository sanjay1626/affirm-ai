import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  ScrollView, KeyboardAvoidingView, Platform, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../utils/colors';
import { shadow } from '../utils/shadow';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    setError('');
    setLoading(true);
    const { error: err } = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} activeOpacity={0.7}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>EMAIL</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>PASSWORD</Text>
                <View style={styles.passwordWrap}>
                  <TextInput
                    style={[styles.fieldInput, styles.passwordInput]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Your password"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showPw}
                    autoComplete="password"
                  />
                  <TouchableOpacity onPress={() => setShowPw(p => !p)} style={styles.eyeBtn} activeOpacity={0.7}>
                    <Text style={styles.eyeText}>{showPw ? '●' : '○'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.submitBtn, (!email || !password) && styles.submitBtnDisabled]}
                onPress={handleLogin}
                disabled={loading || !email || !password}
                activeOpacity={0.82}
              >
                {loading
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.submitText}>Sign In</Text>
                }
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
                <Text style={styles.link}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 12, paddingBottom: 40 },

  back: { marginBottom: 32, width: 40, height: 40, justifyContent: 'center' },
  backText: { fontSize: 26, color: Colors.white70 },

  header: { marginBottom: 36, gap: 8 },
  title: { fontSize: 34, fontWeight: '300', color: Colors.white90, letterSpacing: 0.2 },
  subtitle: { fontSize: 16, color: Colors.textSecondary },

  form: { gap: 20 },
  fieldWrap: { gap: 8 },
  fieldLabel: {
    fontSize: 11, fontWeight: '700',
    color: Colors.textMuted, letterSpacing: 2,
  },
  fieldInput: {
    height: 52,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16,
    fontSize: 16, fontWeight: '400', color: Colors.textPrimary,
  },
  passwordWrap: { position: 'relative' },
  passwordInput: { paddingRight: 52 },
  eyeBtn: {
    position: 'absolute', right: 16, top: 0, bottom: 0,
    justifyContent: 'center',
  },
  eyeText: { fontSize: 16, color: Colors.textMuted },

  errorText: {
    fontSize: 14, color: Colors.error,
    textAlign: 'center', lineHeight: 20,
    backgroundColor: 'rgba(224,112,112,0.10)',
    borderRadius: 8, padding: 12,
  },

  submitBtn: {
    height: 54, borderRadius: 999,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
    ...shadow(Colors.primary, 4, 16, 0.35, 6),
  },
  submitBtnDisabled: { opacity: 0.55 },
  submitText: { fontSize: 16, fontWeight: '600', color: '#FFF', letterSpacing: 0.3 },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerText: { fontSize: 15, color: Colors.textSecondary },
  link: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
});
