import { describe, expect, it } from 'vitest';
import { assertPublicSupabaseKey } from '../vite.config';

// Fake, locally generated tokens (unsigned) — not real keys.
const fakeJwt = (role: string) =>
  ['e30', Buffer.from(JSON.stringify({ role, iss: 'supabase' })).toString('base64url'), 'sig'].join('.');

describe('frontend key guard', () => {
  it('accepts the anon key and publishable keys', () => {
    expect(() => assertPublicSupabaseKey(fakeJwt('anon'))).not.toThrow();
    expect(() => assertPublicSupabaseKey('sb_publishable_example')).not.toThrow();
    expect(() => assertPublicSupabaseKey(undefined)).not.toThrow();
  });
  it('rejects service_role and secret keys', () => {
    expect(() => assertPublicSupabaseKey(fakeJwt('service_role'))).toThrow(/role "service_role"/);
    expect(() => assertPublicSupabaseKey('sb_secret_example')).toThrow(/SECRET/);
  });
});
