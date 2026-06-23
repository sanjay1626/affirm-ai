import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Switch, Alert, StatusBar,
} from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import {
  registerForPushNotifications, savePushToken,
  scheduleDailyNotification, cancelAllNotifications, sendTestNotification,
} from '../services/notificationService';
import { Background } from '../components/Background';
import { Glass } from '../utils/glass';
import { Colors } from '../utils/colors';
import { Spacing, Radius } from '../utils/spacing';
import { shadow } from '../utils/shadow';
import { Button } from '../components/Button';

const TIMES = ['06:00', '07:00', '08:00', '09:00', '10:00', '12:00', '18:00', '20:00', '21:00'];

interface NotifPrefs {
  notification_time: string;
  frequency: string;
  enabled: boolean;
}

export function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [prefs, setPrefs] = useState<NotifPrefs>({ notification_time: '08:00', frequency: 'daily', enabled: true });
  const [preferredName, setPreferredName] = useState('');
  const email = user?.email ?? '';
  const [saving, setSaving] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: notifData } = await supabase
      .from('notification_preferences').select('*').eq('user_id', user.id).maybeSingle();
    if (notifData) {
      setPrefs({
        notification_time: notifData.notification_time ?? '08:00',
        frequency: notifData.frequency ?? 'daily',
        enabled: notifData.enabled ?? true,
      });
    }
    const { data: ob } = await supabase
      .from('onboarding_answers').select('preferred_name').eq('user_id', user.id).maybeSingle();
    if (ob?.preferred_name) setPreferredName(ob.preferred_name);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleSavePrefs = async () => {
    setSaving(true);
    try {
      const token = await registerForPushNotifications();
      if (token) await savePushToken(token, prefs.notification_time, prefs.frequency);
      if (prefs.enabled) {
        await scheduleDailyNotification(
          `Good morning, ${preferredName}! Your daily affirmation awaits.`,
          prefs.notification_time
        );
      } else {
        await cancelAllNotifications();
      }
      Alert.alert('Saved', 'Notification preferences updated.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    await sendTestNotification('This is a test. Your personalized affirmations will appear here.');
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const initial = preferredName ? preferredName[0].toUpperCase() : email[0]?.toUpperCase() ?? '?';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <Background />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={[styles.group, Glass.card]}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View>
                <Text style={styles.profileName}>{preferredName || 'Your account'}</Text>
                <Text style={styles.profileEmail}>{email}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
          <View style={[styles.group, Glass.card]}>
            <View style={styles.row}>
              <View>
                <Text style={styles.rowTitle}>Daily Reminders</Text>
                <Text style={styles.rowDesc}>Receive your affirmation each day</Text>
              </View>
              <Switch
                value={prefs.enabled}
                onValueChange={(v) => setPrefs((p) => ({ ...p, enabled: v }))}
                trackColor={{ false: 'rgba(255,255,255,0.10)', true: Colors.primary + '80' }}
                thumbColor={prefs.enabled ? Colors.primary : Colors.textMuted}
              />
            </View>

            <View style={styles.divider} />

            <Text style={styles.groupLabel}>Notification Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
              <View style={styles.timeRow}>
                {TIMES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timeChip, prefs.notification_time === t && styles.timeChipSelected]}
                    onPress={() => setPrefs((p) => ({ ...p, notification_time: t }))}
                  >
                    <Text style={[
                      styles.timeChipText,
                      prefs.notification_time === t && styles.timeChipTextSelected,
                    ]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Button
              label={saving ? 'Saving…' : 'Save Preferences'}
              onPress={handleSavePrefs}
              loading={saving}
              size="md"
              style={{ marginTop: Spacing.md }}
            />
          </View>
        </View>

        {/* Test */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TESTING</Text>
          <View style={[styles.group, Glass.card]}>
            <Text style={styles.rowTitle}>Send Test Notification</Text>
            <Text style={styles.rowDesc}>Verify notifications are working on your device.</Text>
            <Button
              label={testSent ? 'Sent — check your notifications' : 'Send Test'}
              onPress={handleTestNotification}
              variant="secondary"
              size="md"
              disabled={testSent}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ABOUT</Text>
          <View style={[styles.group, Glass.card]}>
            <View style={styles.row}>
              <Text style={styles.rowTitle}>AffirmAI</Text>
              <Text style={styles.rowValue}>v1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Sign out */}
        <View style={[styles.section, { marginBottom: Spacing.xl }]}>
          <Button label="Sign Out" onPress={handleSignOut} variant="danger" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: Spacing.xl },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, marginBottom: Spacing.lg },
  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 },

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.8, marginBottom: Spacing.sm },

  group: { borderRadius: Radius.lg, padding: Spacing.md },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...shadow(Colors.primary, 0, 12, 0.50, 4),
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.textOnPrimary },
  profileName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  profileEmail: { fontSize: 13, color: Colors.textMuted, marginTop: 1 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  rowDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  rowValue: { fontSize: 14, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: Spacing.md },
  groupLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },

  timeScroll: { marginHorizontal: -Spacing.md },
  timeRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md },
  timeChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  timeChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timeChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  timeChipTextSelected: { color: Colors.textOnPrimary },
});
