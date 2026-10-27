/**
 * Local-only network guard.
 *
 * The game needs nothing from the internet at runtime: the app, the MediaPipe
 * WASM runtime and the face model are all served from this machine. MediaPipe
 * Tasks (1.1.x) contains a built-in usage logger that periodically POSTs task
 * statistics (task type, platform, latency — no images) to a Google endpoint,
 * and it has no public opt-out. This guard refuses every cross-origin fetch
 * before it leaves the browser. The Content-Security-Policy set in
 * vite.config.ts (connect-src 'self') is the second, browser-enforced layer.
 */

const PASS_THROUGH_PROTOCOLS = new Set(['data:', 'blob:']);

/** True when `url` may be fetched: same origin as the page, or an in-memory data/blob URL. */
export function isAllowedUrl(url: string, pageOrigin: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url, pageOrigin);
  } catch {
    return false;
  }
  if (PASS_THROUGH_PROTOCOLS.has(parsed.protocol)) return true;
  return parsed.origin === pageOrigin;
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

let installed = false;

export function installNetworkGuard(): void {
  if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  installed = true;
  const originalFetch = window.fetch.bind(window);
  const origin = window.location.origin;
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = requestUrl(input);
    if (!isAllowedUrl(url, origin)) {
      const target = (() => {
        try {
          const u = new URL(url, origin);
          return `${u.origin}${u.pathname}`;
        } catch {
          return url;
        }
      })();
      console.info(`[AI Poker Face] Blocked outbound request to ${target} — the game runs fully offline.`);
      return Promise.reject(new TypeError('Blocked by the AI Poker Face local-only network guard'));
    }
    return originalFetch(input, init);
  };
}
