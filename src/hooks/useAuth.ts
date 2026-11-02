import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { friendlyError } from '../services/supabaseRepository';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data }) => alive && setSession(data.session))
      .catch(() => alive && setSession(null))
      .finally(() => alive && setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : friendlyError(error));
  }, []);

  /** Returns true when Supabase requires e-mail confirmation before first sign-in. */
  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase!.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    if (error) throw new Error(friendlyError(error));
    return !data.session;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase!.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    });
    if (error) throw new Error(friendlyError(error));
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase!.auth.updateUser({ password });
    if (error) throw new Error(friendlyError(error));
    setRecovering(false);
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  return { session, user: session?.user ?? null, loading, recovering, signIn, signUp, signOut, resetPassword, updatePassword };
}
