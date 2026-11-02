import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Only the public URL and anon (publishable) key are read here. They are
 * safe in the browser because Row Level Security restricts every query to
 * the signed-in user. The service_role key must NEVER be used in frontend code.
 */
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;
