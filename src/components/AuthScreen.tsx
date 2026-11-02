import { useState, type FormEvent } from 'react';
import { CheckSquare, Loader2 } from 'lucide-react';
import { btn, inputCls } from './Modal';

type Mode = 'signin' | 'signup' | 'reset';

export function AuthScreen({
  onSignIn,
  onSignUp,
  onReset,
}: {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<boolean>;
  onReset: (email: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.');
    if (mode !== 'reset' && password.length < 8) return setError('Password must be at least 8 characters.');
    setBusy(true);
    try {
      if (mode === 'signin') await onSignIn(email, password);
      else if (mode === 'signup') {
        const needsConfirm = await onSignUp(email, password);
        if (needsConfirm) {
          setInfo('Account created. Check your inbox and click the confirmation link, then sign in here.');
          setMode('signin');
        }
      } else {
        await onReset(email);
        setInfo('If an account exists for that email, a password-reset link has been sent.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-indigo-50/50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="rounded-xl bg-indigo-600 p-2 text-white"><CheckSquare size={20} /></span>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Smart Tasks</h1>
            <p className="text-xs text-slate-500">Your tasks, synced across your PCs</p>
          </div>
        </div>
        <h2 className="mb-4 text-sm font-semibold text-slate-700">
          {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'}
        </h2>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <input className={inputCls} type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
          {mode !== 'reset' && (
            <input
              className={inputCls}
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder="Password (min. 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label="Password"
            />
          )}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          {info && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{info}</p>}
          <button type="submit" className={`${btn.primary} w-full`} disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
          </button>
        </form>
        <div className="mt-4 flex justify-between text-xs">
          {mode === 'signin' ? (
            <>
              <button className="text-indigo-600 hover:underline" onClick={() => setMode('signup')}>Create an account</button>
              <button className="text-slate-500 hover:underline" onClick={() => setMode('reset')}>Forgot password?</button>
            </>
          ) : (
            <button className="text-indigo-600 hover:underline" onClick={() => setMode('signin')}>Back to sign in</button>
          )}
        </div>
      </div>
    </div>
  );
}
