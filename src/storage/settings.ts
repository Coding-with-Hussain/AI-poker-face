import { clampSensitivity, DEFAULT_DIFFICULTY, DEFAULT_DURATION, DIFFICULTY_ORDER, ROUND_DURATIONS, SENSITIVITY } from '../game/gameConfig';
import type { Difficulty, RoundDurationSec } from '../game/gameTypes';
import { isRecord, readJSON, writeJSON } from './safeStorage';

export interface Settings {
  soundEnabled: boolean;
  difficulty: Difficulty;
  durationSec: RoundDurationSec;
  /** 1 (relaxed) .. 10 (strict). */
  sensitivity: number;
  showOverlay: boolean;
  showDiagnostics: boolean;
}

export const SETTINGS_KEY = 'ai-poker-face:settings:v1';

export const DEFAULT_SETTINGS: Settings = {
  soundEnabled: true,
  difficulty: DEFAULT_DIFFICULTY,
  durationSec: DEFAULT_DURATION,
  sensitivity: SENSITIVITY.default,
  showOverlay: true,
  showDiagnostics: false,
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
  };
}

export function loadSettings(): Settings {
  return sanitizeSettings(readJSON(SETTINGS_KEY));
}

export function saveSettings(settings: Settings): boolean {
  const { showDiagnostics: _hiddenByDefault, ...persisted } = settings;
  return writeJSON(SETTINGS_KEY, persisted);
}
