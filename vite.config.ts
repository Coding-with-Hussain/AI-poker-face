import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Content-Security-Policy that keeps the game local-only: scripts, WASM, the
 * model and media may only come from this machine, and connect-src 'self'
 * stops any outbound request (for example MediaPipe's built-in usage logger).
 * The dev server additionally needs inline scripts (React Fast Refresh) and
 * its hot-reload WebSocket.
 */
function contentSecurityPolicy(dev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'wasm-unsafe-eval'${dev ? " 'unsafe-inline'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob: mediastream:",
    `connect-src 'self'${dev ? ' ws://localhost:* ws://127.0.0.1:*' : ''}`,
    "font-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');
}

function localOnlyCsp(): Plugin {
  return {
    name: 'ai-poker-face:local-only-csp',
    transformIndexHtml(_html, ctx) {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy(Boolean(ctx.server)) },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

// Everything the game needs at runtime (app code, MediaPipe WASM, the face
// model, content and sounds) is served from this machine. No CDN is used.
export default defineConfig({
  plugins: [react(), localOnlyCsp()],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: false,
    headers: { 'Content-Security-Policy': contentSecurityPolicy(true) },
  },
  preview: {
    host: 'localhost',
    port: 4173,
    headers: { 'Content-Security-Policy': contentSecurityPolicy(false) },
  },
  build: {
    target: 'es2022',
    // The MediaPipe bundle is large by nature; keep the warning meaningful.
    chunkSizeWarningLimit: 1200,
  },
});
