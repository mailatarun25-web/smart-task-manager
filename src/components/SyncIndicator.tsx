import { CloudOff, HardDrive, Loader2, RefreshCw, Wifi } from 'lucide-react';
import type { SyncState } from '../hooks/useTasks';

export function SyncIndicator({ state, mode, onRetry }: { state: SyncState; mode: 'cloud' | 'local'; onRetry: () => void }) {
  if (mode === 'local')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200" title="Supabase is not configured — tasks are saved only in this browser.">
        <HardDrive size={13} /> Local only
      </span>
    );
  const map: Record<SyncState, { label: string; cls: string; icon: React.ReactNode }> = {
    loading: { label: 'Loading…', cls: 'bg-slate-100 text-slate-600 ring-slate-200', icon: <Loader2 size={13} className="animate-spin" /> },
    saving: { label: 'Saving…', cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200', icon: <Loader2 size={13} className="animate-spin" /> },
    live: { label: 'Synced', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: <Wifi size={13} /> },
    connecting: { label: 'Connecting…', cls: 'bg-slate-100 text-slate-600 ring-slate-200', icon: <Loader2 size={13} className="animate-spin" /> },
    offline: { label: 'Offline', cls: 'bg-red-50 text-red-700 ring-red-200', icon: <CloudOff size={13} /> },
    error: { label: 'Sync paused', cls: 'bg-amber-50 text-amber-700 ring-amber-200', icon: <RefreshCw size={13} /> },
  };
  const s = map[state];
  const clickable = state === 'error' || state === 'offline';
  return (
    <button
      onClick={clickable ? onRetry : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${s.cls} ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
      title={clickable ? 'Click to retry' : 'Changes sync automatically between your devices'}
    >
      {s.icon} <span className="hidden sm:inline">{s.label}</span>
    </button>
  );
}
