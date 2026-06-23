// Safe haptics wrapper — silently disabled on web or if expo-haptics is missing.
import { Platform } from 'react-native';

type HapticsMod = {
  impactAsync(style?: unknown): Promise<void>;
  notificationAsync(type?: unknown): Promise<void>;
  selectionAsync(): Promise<void>;
  ImpactFeedbackStyle: { Light: unknown; Medium: unknown; Heavy: unknown };
  NotificationFeedbackType: { Success: unknown; Warning: unknown; Error: unknown };
};

let Mod: HapticsMod | null = null;
if (Platform.OS !== 'web') {
  try { Mod = require('expo-haptics') as HapticsMod; } catch {}
}

export function hapticLight() {
  if (!Mod) return;
  Mod.impactAsync(Mod.ImpactFeedbackStyle.Light).catch(() => {});
}

export function hapticMedium() {
  if (!Mod) return;
  Mod.impactAsync(Mod.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function hapticSuccess() {
  if (!Mod) return;
  Mod.notificationAsync(Mod.NotificationFeedbackType.Success).catch(() => {});
}

export function hapticSelection() {
  if (!Mod) return;
  Mod.selectionAsync().catch(() => {});
}
