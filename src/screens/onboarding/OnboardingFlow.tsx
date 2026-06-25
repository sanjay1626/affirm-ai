import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity, TextInput, StatusBar,
} from 'react-native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { Background } from '../../components/Background';
import { Glass } from '../../utils/glass';
import { Button } from '../../components/Button';
import { Colors } from '../../utils/colors';
import { Spacing, Radius } from '../../utils/spacing';
import {
  registerForPushNotifications, savePushToken, schedulePracticeNotification,
} from '../../services/notificationService';

interface OnboardingData {
  preferred_name: string;
  main_goals: string[];
  current_struggles: string[];
  life_areas: string[];
  preferred_tone: string;
  notification_time: string;
  frequency: string;
  personal_context: string;
}

const INITIAL: OnboardingData = {
  preferred_name: '',
  main_goals: [],
  current_struggles: [],
  life_areas: [],
  preferred_tone: 'motivational',
  notification_time: '08:00',
  frequency: 'daily',
  personal_context: '',
};

const GOALS = [
  'Build confidence', 'Reduce anxiety', 'Stay motivated', 'Improve relationships',
  'Career growth', 'Better health', 'Find purpose', 'Be more productive',
  'Practice gratitude', 'Spiritual growth',
];

const STRUGGLES = [
  'Self-doubt', 'Stress & overwhelm', 'Procrastination', 'Negative self-talk',
  'Loneliness', 'Fear of failure', 'Comparison to others', 'Low energy',
  'Work-life balance', 'Grief or loss',
];

const LIFE_AREAS = [
  { value: 'career', label: '💼 Career' },
  { value: 'health', label: '🏃 Health' },
  { value: 'relationships', label: '💑 Relationships' },
  { value: 'confidence', label: '💪 Confidence' },
  { value: 'productivity', label: '⚡ Productivity' },
  { value: 'anxiety', label: '🌊 Anxiety' },
  { value: 'self-esteem', label: '🌸 Self-Esteem' },
  { value: 'spirituality', label: '🕊️ Spirituality' },
  { value: 'learning', label: '📚 Learning' },
  { value: 'creativity', label: '🎨 Creativity' },
];

const TONES = [
  { value: 'gentle', label: '🌿 Gentle', desc: 'Soft, nurturing, kind' },
  { value: 'motivational', label: '🔥 Motivational', desc: 'Energizing, bold, powerful' },
  { value: 'practical', label: '🎯 Practical', desc: 'Direct, actionable, grounded' },
  { value: 'spiritual', label: '✨ Spiritual', desc: 'Soulful, mindful, reflective' },
  { value: 'humorous', label: '😄 Humorous', desc: 'Light, fun, uplifting' },
];

const TIMES = ['06:00', '07:00', '08:00', '09:00', '12:00', '18:00', '20:00', '21:00'];
const FREQ = [
  { value: 'daily', label: 'Once a day' },
  { value: '2x', label: 'Twice a day' },
  { value: 'weekly', label: 'Weekly' },
];

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected ? styles.chipSelected : Glass.card]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { width: `${(step / total) * 100}%` as any }]} />
    </View>
  );
}

const TOTAL_STEPS = 7;

export function OnboardingFlow() {
  const { user, refreshOnboardingStatus } = useAuth();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (key: keyof Pick<OnboardingData, 'main_goals' | 'current_struggles' | 'life_areas'>, value: string) => {
    setData((prev) => {
      const arr = prev[key] as string[];
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
  };

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      const { error: dbError } = await supabase
        .from('onboarding_answers')
        .upsert({ user_id: user.id, ...data, onboarding_done: true });
      if (dbError) throw dbError;

      const token = await registerForPushNotifications();
      if (token) {
        await savePushToken(token, data.notification_time, data.frequency);
        // Schedule the daily practice-session reminder at their chosen time.
        await schedulePracticeNotification(data.notification_time);
      }
      await refreshOnboardingStatus();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <StepWrapper emoji="👋" title="What should we call you?" subtitle="This is the name that'll appear in your affirmations.">
            <TextInput
              style={[styles.nameInput, Glass.input]}
              value={data.preferred_name}
              onChangeText={(v) => setData((p) => ({ ...p, preferred_name: v }))}
              placeholder="Your preferred name..."
              placeholderTextColor={Colors.textMuted}
              autoFocus maxLength={40}
            />
            <Button label="Continue →" onPress={next} disabled={!data.preferred_name.trim()} style={{ marginTop: Spacing.lg }} />
          </StepWrapper>
        );
      case 1:
        return (
          <StepWrapper emoji="🎯" title="What are your main goals?" subtitle="Choose all that resonate with you.">
            <View style={styles.chips}>
              {GOALS.map((g) => (
                <Chip key={g} label={g} selected={data.main_goals.includes(g)} onPress={() => toggle('main_goals', g)} />
              ))}
            </View>
            <NavButtons onBack={back} onNext={next} nextDisabled={data.main_goals.length === 0} />
          </StepWrapper>
        );
      case 2:
        return (
          <StepWrapper emoji="🌊" title="What are you working through?" subtitle="This helps us speak to what matters most.">
            <View style={styles.chips}>
              {STRUGGLES.map((s) => (
                <Chip key={s} label={s} selected={data.current_struggles.includes(s)} onPress={() => toggle('current_struggles', s)} />
              ))}
            </View>
            <NavButtons onBack={back} onNext={next} nextDisabled={data.current_struggles.length === 0} />
          </StepWrapper>
        );
      case 3:
        return (
          <StepWrapper emoji="🌱" title="Which life areas matter most?" subtitle="Pick the areas where you want to grow.">
            <View style={styles.chips}>
              {LIFE_AREAS.map(({ value, label }) => (
                <Chip key={value} label={label} selected={data.life_areas.includes(value)} onPress={() => toggle('life_areas', value)} />
              ))}
            </View>
            <NavButtons onBack={back} onNext={next} nextDisabled={data.life_areas.length === 0} />
          </StepWrapper>
        );
      case 4:
        return (
          <StepWrapper emoji="🎨" title="How would you like to be spoken to?" subtitle="Your affirmations will match this style.">
            <View style={styles.toneList}>
              {TONES.map(({ value, label, desc }) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.toneCard,
                    Glass.card,
                    data.preferred_tone === value && styles.toneCardSelected,
                  ]}
                  onPress={() => setData((p) => ({ ...p, preferred_tone: value }))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toneLabel}>{label}</Text>
                  <Text style={styles.toneDesc}>{desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <NavButtons onBack={back} onNext={next} />
          </StepWrapper>
        );
      case 5:
        return (
          <StepWrapper emoji="🔔" title="When would you like your affirmations?" subtitle="We'll send them right to your notification bar.">
            <Text style={styles.sectionLabel}>TIME</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timePicker}>
              <View style={{ flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md }}>
                {TIMES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timeChip, data.notification_time === t ? styles.timeChipSelected : Glass.card]}
                    onPress={() => setData((p) => ({ ...p, notification_time: t }))}
                  >
                    <Text style={[styles.timeChipText, data.notification_time === t && styles.timeChipTextSelected]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>FREQUENCY</Text>
            <View style={styles.freqList}>
              {FREQ.map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.freqCard, data.frequency === value ? styles.freqCardSelected : Glass.card]}
                  onPress={() => setData((p) => ({ ...p, frequency: value }))}
                >
                  <Text style={[styles.freqLabel, data.frequency === value && styles.freqLabelSelected]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <NavButtons onBack={back} onNext={next} />
          </StepWrapper>
        );
      case 6:
        return (
          <StepWrapper emoji="💬" title="Anything else to share?" subtitle="Optional — this helps the AI go deeper. Keep it brief.">
            <TextInput
              style={[styles.contextInput, Glass.input]}
              value={data.personal_context}
              onChangeText={(v) => setData((p) => ({ ...p, personal_context: v }))}
              placeholder="e.g. 'I'm going through a career change and feeling uncertain about my future...'"
              placeholderTextColor={Colors.textMuted}
              multiline numberOfLines={5} maxLength={500} textAlignVertical="top"
            />
            <Text style={styles.charCount}>{data.personal_context.length}/500</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.navRow}>
              <Button label="← Back" onPress={back} variant="secondary" style={{ flex: 1 }} />
              <Button label="✨ Finish Setup" onPress={finish} loading={saving} style={{ flex: 2, marginLeft: Spacing.sm }} />
            </View>
          </StepWrapper>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <Background />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <Text style={styles.stepText}>Step {step + 1} of {TOTAL_STEPS}</Text>
          <ProgressBar step={step + 1} total={TOTAL_STEPS} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {renderStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StepWrapper({ emoji, title, subtitle, children }: {
  emoji: string; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepEmoji}>{emoji}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepSubtitle}>{subtitle}</Text>
      <View style={styles.stepContent}>{children}</View>
    </View>
  );
}

function NavButtons({ onBack, onNext, nextDisabled = false }: {
  onBack: () => void; onNext: () => void; nextDisabled?: boolean;
}) {
  return (
    <View style={styles.navRow}>
      <Button label="← Back" onPress={onBack} variant="secondary" style={{ flex: 1 }} />
      <Button label="Continue →" onPress={onNext} disabled={nextDisabled} style={{ flex: 2, marginLeft: Spacing.sm }} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  topBar: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.sm },
  stepText: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.8 },
  progressBar: {
    height: 2, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radius.full, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: Radius.full },
  scroll: { flexGrow: 1, paddingBottom: Spacing.xl },
  stepContainer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  stepEmoji: { fontSize: 52, lineHeight: 62, marginBottom: Spacing.sm },
  stepTitle: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: Spacing.xs },
  stepSubtitle: { fontSize: 16, color: Colors.textSecondary, lineHeight: 24, marginBottom: Spacing.lg },
  stepContent: { gap: Spacing.sm },
  nameInput: { borderRadius: Radius.md, padding: Spacing.md, fontSize: 18, color: Colors.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full },
  chipSelected: { backgroundColor: Colors.primary, borderWidth: 1, borderColor: Colors.primary },
  chipText: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
  chipTextSelected: { color: Colors.textOnPrimary },
  toneList: { gap: Spacing.sm },
  toneCard: { padding: Spacing.md, borderRadius: Radius.lg },
  toneCardSelected: { backgroundColor: 'rgba(77,191,138,0.15)', borderColor: Colors.primary, borderWidth: 1.5 },
  toneLabel: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  toneDesc: { fontSize: 14, color: Colors.textSecondary },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: Spacing.sm },
  timePicker: { marginHorizontal: -Spacing.lg },
  timeChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full },
  timeChipSelected: { backgroundColor: Colors.primary },
  timeChipText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  timeChipTextSelected: { color: Colors.textOnPrimary },
  freqList: { gap: Spacing.sm },
  freqCard: { padding: Spacing.md, borderRadius: Radius.lg, alignItems: 'center' },
  freqCardSelected: { backgroundColor: 'rgba(77,191,138,0.15)', borderWidth: 1.5, borderColor: Colors.primary },
  freqLabel: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  freqLabelSelected: { color: Colors.primary },
  contextInput: { borderRadius: Radius.md, padding: Spacing.md, fontSize: 16, color: Colors.textPrimary, minHeight: 130, lineHeight: 24 },
  charCount: { fontSize: 12, color: Colors.textMuted, textAlign: 'right' },
  navRow: { flexDirection: 'row', marginTop: Spacing.lg },
  errorText: { color: Colors.error, fontSize: 14, textAlign: 'center' },
});
