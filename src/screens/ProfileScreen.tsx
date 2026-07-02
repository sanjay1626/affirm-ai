import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Switch, StatusBar, Alert, Platform, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { schedulePracticeNotification, cancelAllNotifications } from '../services/notificationService';
import {
  getVoicePreference, setVoicePreference, speakText, ttsAvailable, type VoicePref,
} from '../utils/speech';
import { Colors } from '../utils/colors';
import { AuroraBackground } from '../components/AuroraBackground';

// ── Sub-components ─────────────────────────────────────────────────────────────

function Row({ label, right }: { label: string; right: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>{right}</View>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

// ── ProfileScreen ──────────────────────────────────────────────────────────────

export function ProfileScreen() {
  const [email, setEmail] = useState('');
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifTime, setNotifTime] = useState('08:00');
  const [editingTime, setEditingTime] = useState(false);
  const [timeInput, setTimeInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [voice, setVoice] = useState<VoicePref>(getVoicePreference());

  const handleSelectVoice = async (pref: VoicePref) => {
    setVoice(pref);
    await setVoicePreference(pref);
    if (ttsAvailable) speakText('This is your affirmation voice.');
  };

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) setEmail(user.email);

    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('notification_time, enabled')
      .eq('user_id', user?.id ?? '')
      .maybeSingle();
    if (prefs) {
      setNotifEnabled(prefs.enabled ?? true);
      setNotifTime(prefs.notification_time ?? '08:00');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggleNotif = async (value: boolean) => {
    setNotifEnabled(value);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (!value) {
      await cancelAllNotifications();
      await supabase
        .from('notification_preferences')
        .upsert({ user_id: user.id, enabled: false }, { onConflict: 'user_id' });
    } else {
      await supabase
        .from('notification_preferences')
        .upsert({ user_id: user.id, enabled: true, notification_time: notifTime }, { onConflict: 'user_id' });
      // Daily practice-session reminder at the chosen time.
      await schedulePracticeNotification(notifTime);
    }
  };

  const handleSaveTime = async () => {
    const parsed = timeInput.trim();
    // Validate HH:MM format
    if (!/^\d{1,2}:\d{2}$/.test(parsed)) {
      Alert.alert('Invalid time', 'Enter time as HH:MM (e.g. 08:00)');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('notification_preferences').upsert(
          { user_id: user.id, notification_time: parsed, enabled: notifEnabled },
          { onConflict: 'user_id' }
        );
        if (notifEnabled) {
          await schedulePracticeNotification(parsed);
        }
        setNotifTime(parsed);
      }
    } finally {
      setSaving(false);
      setEditingTime(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => { await supabase.auth.signOut(); },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <AuroraBackground subtle />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.pageTitle}>Profile</Text>
          </View>

          {/* Notifications */}
          <View style={styles.card}>
            <SectionHeader title="Notifications" />
            <Row
              label="Daily reminders"
              right={
                <Switch
                  value={notifEnabled}
                  onValueChange={handleToggleNotif}
                  trackColor={{ false: Colors.surface, true: Colors.primary }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={Colors.surface}
                />
              }
            />
            {notifEnabled && (
              <Row
                label="Reminder time"
                right={
                  editingTime ? (
                    <View style={styles.timeEdit}>
                      <TextInput
                        style={styles.timeInput}
                        value={timeInput}
                        onChangeText={setTimeInput}
                        placeholder="HH:MM"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="numbers-and-punctuation"
                        autoFocus
                        maxLength={5}
                      />
                      <TouchableOpacity onPress={handleSaveTime} disabled={saving} style={styles.saveTimeBtn}>
                        <Text style={styles.saveTimeBtnText}>{saving ? '…' : 'Save'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setEditingTime(false)} style={styles.cancelTimeBtn}>
                        <Text style={styles.cancelTimeBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => { setTimeInput(notifTime); setEditingTime(true); }} activeOpacity={0.7}>
                      <Text style={styles.timeValue}>{notifTime}</Text>
                    </TouchableOpacity>
                  )
                }
              />
            )}
          </View>

          {/* Voice */}
          <View style={styles.card}>
            <SectionHeader title="Voice" />
            <View style={styles.voiceRow}>
              {([
                { key: 'default', label: 'System Default' },
                { key: 'woman', label: 'Woman' },
                { key: 'man', label: 'Man' },
              ] as { key: VoicePref; label: string }[]).map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.voiceOption, voice === opt.key && styles.voiceOptionActive]}
                  onPress={() => handleSelectVoice(opt.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.voiceOptionText, voice === opt.key && styles.voiceOptionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.voiceHint}>
              {ttsAvailable
                ? 'Tap a voice to hear a sample. Woman and Man use a distinct device voice when available, and adjust tone otherwise.'
                : 'Spoken affirmations are not available on this device.'}
            </Text>
          </View>

          {/* Account */}
          <View style={styles.card}>
            <SectionHeader title="Account" />
            <Row label="Email" right={<Text style={styles.emailText} numberOfLines={1}>{email}</Text>} />
          </View>

          {/* Sign out */}
          <View style={[styles.card, { marginBottom: 100 }]}>
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.75}>
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingTop: 8 },

  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 },
  pageTitle: { fontSize: 30, fontWeight: '300', color: Colors.white90, letterSpacing: 0.2 },

  card: {
    marginHorizontal: 24, marginTop: 20,
    backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 2, textTransform: 'uppercase',
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6,
  },

  voiceRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingTop: 4 },
  voiceOption: {
    flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: Colors.border,
  },
  voiceOptionActive: { backgroundColor: 'rgba(124,107,235,0.18)', borderColor: 'rgba(124,107,235,0.45)' },
  voiceOptionText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary, textAlign: 'center' },
  voiceOptionTextActive: { color: Colors.primaryLight },
  voiceHint: { fontSize: 12, color: Colors.textMuted, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 16, lineHeight: 17 },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  rowLabel: { fontSize: 15, fontWeight: '400', color: Colors.textPrimary },
  rowRight: { flexShrink: 1, maxWidth: '55%' },

  emailText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right' },

  timeValue: {
    fontSize: 15, fontWeight: '500', color: Colors.primary,
    letterSpacing: 0.3,
  },
  timeEdit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: {
    fontSize: 15, fontWeight: '500', color: Colors.textPrimary,
    borderBottomWidth: 1, borderBottomColor: Colors.primary,
    minWidth: 60, textAlign: 'center',
    paddingBottom: 2,
  },
  saveTimeBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: Colors.primary, borderRadius: 8,
  },
  saveTimeBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  cancelTimeBtn: { padding: 6 },
  cancelTimeBtnText: { fontSize: 14, color: Colors.textMuted },

  signOutBtn: {
    paddingVertical: 16, alignItems: 'center',
  },
  signOutText: { fontSize: 15, fontWeight: '500', color: Colors.error, letterSpacing: 0.3 },
});
