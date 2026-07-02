// TTS wrapper with a Woman/Man/System voice preference.
// - Web: drives the browser SpeechSynthesis API directly (reliable voice objects).
// - Native: uses expo-speech.
// Preference stored locally (available voices are device-specific).
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type VoicePref = 'default' | 'woman' | 'man';

const STORAGE_KEY = 'voice_preference';
// Warm, natural, gently-calming — human, a hair slower than normal.
const NATURAL_RATE = 0.9;
const PITCH: Record<VoicePref, number> = {
  default: 0.98,
  woman: 1.1,   // brighter
  man: 0.82,    // deeper
};

// ── Engines ───────────────────────────────────────────────────────────────────────
const isWeb = Platform.OS === 'web';

// deno-lint-ignore no-explicit-any
const synth: any = isWeb ? (globalThis as any)?.speechSynthesis : undefined;

type Voice = { identifier: string; name?: string; language?: string };
type SpeechOptions = { rate?: number; pitch?: number; voice?: string; onDone?: () => void };
type SpeechMod = {
  speak(text: string, options?: SpeechOptions): void;
  stop(): void;
  isSpeakingAsync(): Promise<boolean>;
  getAvailableVoicesAsync?(): Promise<Voice[]>;
};
let Mod: SpeechMod | null = null;
if (!isWeb) { try { Mod = require('expo-speech') as SpeechMod; } catch { /* not installed */ } }

export const ttsAvailable = isWeb ? !!synth : Mod !== null;

let currentPref: VoicePref = 'default';
let resolvedPitch = PITCH.default;
let resolvedVoiceId: string | undefined; // native voice identifier
// deno-lint-ignore no-explicit-any
let webVoice: any;                        // web SpeechSynthesisVoice object

// ── Gender heuristics (voices don't expose gender, so match name/identifier) ───────
function isFemale(s: string): boolean { return /female|woman/i.test(s); }
function isMale(s: string): boolean {
  if (isFemale(s)) return false;
  return /male/i.test(s) || /\bman\b/i.test(s);
}
const FEMALE_NAMES = ['samantha', 'karen', 'moira', 'tessa', 'fiona', 'serena', 'allison', 'ava', 'susan', 'zoe', 'victoria', 'catherine', 'nora', 'kate', 'zira', 'hazel', 'linda', 'heather', 'amelie', 'anna', 'ellen', 'joana', 'sara', 'sandy', 'shelley', 'aria', 'jenny', 'michelle', 'clara'];
const MALE_NAMES = ['daniel', 'aaron', 'fred', 'alex', 'tom', 'arthur', 'oliver', 'rishi', 'gordon', 'lee', 'reed', 'albert', 'george', 'david', 'mark', 'james', 'richard', 'paul', 'bruce', 'ralph', 'diego', 'jorge', 'luca', 'thomas', 'eddy', 'guy', 'christopher', 'brian', 'roger'];

// deno-lint-ignore no-explicit-any
function pickByGender(pool: any[], pref: VoicePref, getName: (v: any) => string, getId: (v: any) => string) {
  const want = pref === 'woman' ? isFemale : isMale;
  let m = pool.find((v) => want(getName(v)) || want(getId(v)));
  if (!m) {
    const names = pref === 'woman' ? FEMALE_NAMES : MALE_NAMES;
    m = pool.find((v) => names.some((n) => getName(v).toLowerCase().includes(n)));
  }
  return m;
}

// ── Web voice resolution ───────────────────────────────────────────────────────────
function resolveWebVoice(pref: VoicePref) {
  if (!synth || pref === 'default') return undefined;
  // deno-lint-ignore no-explicit-any
  const voices: any[] = synth.getVoices() ?? [];
  if (!voices.length) return undefined;
  const en = voices.filter((v) => (v.lang ?? '').toLowerCase().startsWith('en'));
  const pool = en.length ? en : voices;
  const m = pickByGender(pool, pref, (v) => v.name ?? '', (v) => v.voiceURI ?? '');
  console.log(`[voice] web pref=${pref} matched=${m?.name ?? '(none — pitch only)'} of ${pool.length} voices`);
  return m;
}

// ── Native voice resolution ─────────────────────────────────────────────────────────
async function resolveNativeVoice(pref: VoicePref): Promise<string | undefined> {
  if (pref === 'default' || !Mod?.getAvailableVoicesAsync) return undefined;
  try {
    const voices = await Mod.getAvailableVoicesAsync();
    if (!voices?.length) return undefined;
    const en = voices.filter((v) => (v.language ?? '').toLowerCase().startsWith('en'));
    const pool = en.length ? en : voices;
    const m = pickByGender(pool, pref, (v) => v.name ?? '', (v) => v.identifier ?? '');
    console.log(`[voice] native pref=${pref} matched=${m?.name ?? '(none — pitch only)'} of ${pool.length} voices`);
    return m?.identifier;
  } catch (e) {
    console.warn('[voice] native resolve failed:', e);
    return undefined;
  }
}

async function applyPreference(pref: VoicePref) {
  resolvedPitch = PITCH[pref];
  if (isWeb) {
    webVoice = resolveWebVoice(pref);
    // Browser voice list is often empty on first call — resolve again when ready.
    if (!webVoice && pref !== 'default' && synth && !(synth.getVoices()?.length)) {
      synth.onvoiceschanged = () => { webVoice = resolveWebVoice(pref); };
    }
    resolvedVoiceId = undefined;
  } else {
    resolvedVoiceId = await resolveNativeVoice(pref);
  }
}

// ── Public API ──────────────────────────────────────────────────────────────────────
export async function loadVoicePreference(): Promise<VoicePref> {
  try {
    const v = (await AsyncStorage.getItem(STORAGE_KEY)) as VoicePref | null;
    currentPref = v === 'woman' || v === 'man' ? v : 'default';
  } catch {
    currentPref = 'default';
  }
  await applyPreference(currentPref);
  return currentPref;
}

export async function setVoicePreference(pref: VoicePref): Promise<void> {
  currentPref = pref;
  try { await AsyncStorage.setItem(STORAGE_KEY, pref); } catch { /* ignore */ }
  await applyPreference(pref);
}

export function getVoicePreference(): VoicePref { return currentPref; }

export function speakText(text: string, onDone?: () => void) {
  if (isWeb) {
    if (!synth) return;
    synth.cancel();
    // deno-lint-ignore no-explicit-any
    const u = new (globalThis as any).SpeechSynthesisUtterance(text);
    u.rate = NATURAL_RATE;
    u.pitch = resolvedPitch;
    if (webVoice) u.voice = webVoice;
    if (onDone) u.onend = () => onDone();
    // Defer past cancel() to avoid Chrome's cancel→speak drop.
    setTimeout(() => synth.speak(u), 0);
    return;
  }
  if (!Mod) return;
  Mod.stop();
  const opts: SpeechOptions = { rate: NATURAL_RATE, pitch: resolvedPitch, onDone };
  if (resolvedVoiceId) opts.voice = resolvedVoiceId;
  Mod.speak(text, opts);
}

export function stopSpeaking() {
  if (isWeb) { synth?.cancel(); return; }
  Mod?.stop();
}

export async function isSpeakingAsync(): Promise<boolean> {
  if (isWeb) return !!synth?.speaking;
  return Mod ? Mod.isSpeakingAsync() : false;
}
