/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Refuses to build if the key in VITE_SUPABASE_ANON_KEY is a secret key.
 * Everything in a VITE_* variable is published in the website's JavaScript,
 * so a service_role / secret key there would give anyone full database access.
 */
export function assertPublicSupabaseKey(key: string | undefined): void {
  if (!key) return;
  if (key.startsWith('sb_secret_')) throw new Error('VITE_SUPABASE_ANON_KEY contains a Supabase SECRET key. Use the anon / publishable key.');
  const parts = key.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
      if (payload.role && payload.role !== 'anon')
        throw new Error(`VITE_SUPABASE_ANON_KEY has role "${payload.role}". Only the anon key may be used in the frontend.`);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('VITE_SUPABASE_ANON_KEY')) throw e;
    }
  }
}

/** Content-Security-Policy for the production build (GitHub Pages can't send headers). */
function contentSecurityPolicy(supabaseUrl: string | undefined): Plugin {
  let host = 'https://*.supabase.co';
  try {
    if (supabaseUrl) host = new URL(supabaseUrl).origin;
  } catch {
    /* keep wildcard */
  }
  const ws = host.replace(/^https:/, 'wss:');
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${host} ${ws}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  return {
    name: 'csp',
    apply: 'build', // the dev server needs inline scripts for hot reload
    transformIndexHtml: (html) =>
      html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`,
      ),
  };
}

// `base: './'` produces relative asset paths, so the same build works on
// GitHub Pages (https://<user>.github.io/<repo>/) and when served locally.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  assertPublicSupabaseKey(env.VITE_SUPABASE_ANON_KEY);
  return {
    base: process.env.VITE_BASE_PATH ?? './',
    plugins: [react(), tailwindcss(), contentSecurityPolicy(env.VITE_SUPABASE_URL)],
    build: { sourcemap: false },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    },
  };
});
