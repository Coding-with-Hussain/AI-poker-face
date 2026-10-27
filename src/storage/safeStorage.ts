/**
 * LocalStorage access that never throws. Private browsing modes, disabled
 * site data or a full quota simply mean preferences and scores are not kept.
 */

let cached: Storage | null | undefined;

function resolveStorage(): Storage | null {
  if (cached !== undefined) return cached;
  try {
    const storage = globalThis.localStorage;
    const probe = '__ai_poker_face_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    cached = storage;
  } catch {
    console.warn('[AI Poker Face] LocalStorage is unavailable; settings and scores will not be saved.');
    cached = null;
  }
  return cached;
}

export function isStorageAvailable(): boolean {
  return resolveStorage() !== null;
}

export function readJSON(key: string): unknown {
  const storage = resolveStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch (error) {
    console.warn(`[AI Poker Face] Ignoring unreadable saved data for "${key}"`, error);
    return null;
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  const storage = resolveStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`[AI Poker Face] Could not save "${key}"`, error);
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    resolveStorage()?.removeItem(key);
  } catch {
    // Nothing useful to do; storage is best-effort.
  }
}

/** Test hook: forget the cached storage decision. */
export function resetStorageCacheForTests(): void {
  cached = undefined;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
