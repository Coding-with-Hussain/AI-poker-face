import { clampSensitivity, DEFAULT_DIFFICULTY, DEFAULT_DURATION, DIFFICULTY_ORDER, ROUND_DURATIONS, SENSITIVITY } from '../game/gameConfig';
import type { ContentMix, Difficulty, RoundDurationSec } from '../game/gameTypes';
import { isRecord, readJSON, writeJSON } from './safeStorage';

export interface Settings {
  soundEnabled: boolean;
  difficulty: Difficulty;
  durationSec: RoundDurationSec;
  /** 1 (relaxed) .. 10 (strict). */
  sensitivity: number;
  showOverlay: boolean;
  showDiagnostics: boolean;
  /** Built-in jokes, your own media, or both. */
  contentMix: ContentMix;
  /** Play your sound effects from media/sounds instead of the built-in ones. */
  useCustomSounds: boolean;
}

const CONTENT_MIXES: readonly ContentMix[] = ['mixed', 'mine', 'builtin'];

export const SETTINGS_KEY = 'ai-poker-face:settings:v1';

export const DEFAULT_SETTINGS: Settings = {
  soundEnabled: true,
  difficulty: DEFAULT_DIFFICULTY,
  durationSec: DEFAULT_DURATION,
  sensitivity: SENSITIVITY.default,
  showOverlay: true,
  showDiagnostics: false,
  contentMix: 'mixed',
  useCustomSounds: true,
};

/** Accepts anything (e.g. hand-edited storage) and returns valid settings. */
export function sanitizeSettings(value: unknown): Settings {
  if (!isRecord(value)) return { ...DEFAULT_SETTINGS };
  const difficulty = DIFFICULTY_ORDER.includes(value.difficulty as Difficulty)
    ? (value.difficulty as Difficulty)
    : DEFAULT_SETTINGS.difficulty;
  const durationSec = ROUND_DURATIONS.includes(value.durationSec as RoundDurationSec)
    ? (value.durationSec as RoundDurationSec)
    : DEFAULT_SETTINGS.durationSec;
  return {
    soundEnabled: typeof value.soundEnabled === 'boolean' ? value.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
    difficulty,
    durationSec,
    sensitivity: typeof value.sensitivity === 'number' ? clampSensitivity(value.sensitivity) : DEFAULT_SETTINGS.sensitivity,
    showOverlay: typeof value.showOverlay === 'boolean' ? value.showOverlay : DEFAULT_SETTINGS.showOverlay,
    // Diagnostics always start hidden so every player gets the clean view.
    showDiagnostics: false,
    contentMix: CONTENT_MIXES.includes(value.contentMix as ContentMix) ? (value.contentMix as ContentMix) : DEFAULT_SETTINGS.contentMix,
    useCustomSounds: typeof value.useCustomSounds === 'boolean' ? value.useCustomSounds : DEFAULT_SETTINGS.useCustomSounds,
  };
}

export function loadSettings(): Settings {
  return sanitizeSettings(readJSON(SETTINGS_KEY));
}

export function saveSettings(settings: Settings): boolean {
  const { showDiagnostics: _hiddenByDefault, ...persisted } = settings;
  return writeJSON(SETTINGS_KEY, persisted);
}
