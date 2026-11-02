import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { Notice } from '../hooks/useTasks';

export function Toast({ notice, onClose }: { notice: Notice | null; onClose: () => void }) {
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(onClose, notice.kind === 'error' ? 7000 : 2500);
    return () => clearTimeout(t);
  }, [notice, onClose]);
  if (!notice) return null;
  const style = {
    error: 'bg-red-600 text-white',
    success: 'bg-slate-900 text-white',
    info: 'bg-slate-900 text-white',
  }[notice.kind];
  const Icon = { error: AlertCircle, success: CheckCircle2, info: Info }[notice.kind];
  return (
    <div className="fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4" role="status" aria-live="polite">
      <div className={`flex max-w-md items-start gap-2 rounded-xl px-4 py-3 text-sm shadow-lg ${style}`}>
        <Icon size={18} className="mt-0.5 shrink-0" />
        <span className="flex-1">{notice.message}</span>
        <button onClick={onClose} aria-label="Dismiss" className="opacity-70 hover:opacity-100"><X size={16} /></button>
      </div>
    </div>
  );
}
