// Safe TTS wrapper — silently disabled if expo-speech is not installed.
// Run: npx expo install expo-speech   to enable.

type SpeechOptions = { rate?: number; pitch?: number; language?: string; onDone?: () => void };
type SpeechMod = {
  speak(text: string, options?: SpeechOptions): void;
  stop(): void;
  isSpeakingAsync(): Promise<boolean>;
};

let Mod: SpeechMod | null = null;
try { Mod = require('expo-speech') as SpeechMod; } catch {}

export const ttsAvailable = Mod !== null;

export function speakText(text: string, onDone?: () => void) {
  if (!Mod) return;
  Mod.stop();
  Mod.speak(text, { rate: 0.82, pitch: 1.0, onDone });
}

export function stopSpeaking() {
  if (!Mod) return;
  Mod.stop();
}

export async function isSpeakingAsync(): Promise<boolean> {
  if (!Mod) return false;
  return Mod.isSpeakingAsync();
}
