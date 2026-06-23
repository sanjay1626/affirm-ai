import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { Colors } from '../utils/colors';
import { shadow } from '../utils/shadow';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;
};

export function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {/* Subtle gradient background */}
      <LinearGradient
        colors={['#0B0819', '#0F0C29', '#180D3A']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Soft glow orb */}
      <View style={styles.glowOrb} />

      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}>
          {/* Logo mark */}
          <View style={styles.logoWrap}>
            <View style={styles.logoRing}>
              <View style={styles.logoDiamond} />
            </View>
          </View>
          <Text style={styles.appName}>AffirmAI</Text>
          <Text style={styles.tagline}>
            A daily practice of intentional{'\n'}self-affirmation, powered by AI.
          </Text>
        </View>

        <View style={styles.pillars}>
          {[
            ['✦', 'Personalized affirmations, every day'],
            ['◎', 'Mood tracking & private journaling'],
            ['◇', 'Gentle reminders at the time you choose'],
          ].map(([icon, text]) => (
            <View key={text} style={styles.pillar}>
              <Text style={styles.pillarIcon}>{icon}</Text>
              <Text style={styles.pillarText}>{text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.cta}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.82}
          >
            <Text style={styles.primaryBtnText}>Begin your practice</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={styles.ghostBtnText}>I already have an account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0819' },
  glowOrb: {
    position: 'absolute',
    top: '25%', left: '50%',
    width: 300, height: 300,
    marginLeft: -150, marginTop: -150,
    borderRadius: 150,
    backgroundColor: 'rgba(124,107,235,0.12)',
  },
  safe: { flex: 1, paddingHorizontal: 32, justifyContent: 'space-between', paddingTop: 40, paddingBottom: 36 },

  hero: { alignItems: 'center', gap: 18 },
  logoWrap: { marginBottom: 4 },
  logoRing: {
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 1.5, borderColor: 'rgba(124,107,235,0.55)',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(124,107,235,0.10)',
  },
  logoDiamond: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 2, borderColor: Colors.primaryLight,
    transform: [{ rotate: '45deg' }],
  },
  appName: { fontSize: 36, fontWeight: '300', color: Colors.white90, letterSpacing: 1 },
  tagline: {
    fontSize: 16, fontWeight: '400',
    color: Colors.textSecondary, textAlign: 'center', lineHeight: 26,
  },

  pillars: { gap: 18 },
  pillar: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pillarIcon: { fontSize: 16, color: Colors.primaryLight, width: 20, textAlign: 'center' },
  pillarText: { fontSize: 15, fontWeight: '400', color: Colors.textSecondary, lineHeight: 22 },

  cta: { gap: 12 },
  primaryBtn: {
    paddingVertical: 17,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    ...shadow(Colors.primary, 4, 16, 0.40, 6),
  },
  primaryBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', letterSpacing: 0.3 },
  ghostBtn: {
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
  },
  ghostBtnText: { fontSize: 15, fontWeight: '400', color: Colors.white70, letterSpacing: 0.2 },
});
