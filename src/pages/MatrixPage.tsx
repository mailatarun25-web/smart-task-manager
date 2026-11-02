import { useMemo } from 'react';
import type { Task } from '../types/task';
import { TaskCard, type TaskCardActions } from '../components/TaskCard';
import { buildMatrix, isImportant, isUrgent, QUADRANTS, type Quadrant } from '../utils/eisenhower';
import { QUADRANT_STYLES } from '../utils/categories';
import { calculatePriority } from '../utils/priority';
import { formatDuration } from '../utils/dates';

const ORDER: Quadrant[] = ['do', 'schedule', 'delegate', 'later'];

function reason(t: Task) {
  const u = isUrgent(t) ? 'Urgent' : 'Not urgent';
  const i = isImportant(t) ? 'Important' : 'Not important';
  return `${u}${t.urgencyOverride ? ' (manual)' : ''} · ${i}${t.importanceOverride ? ' (manual)' : ''}`;
}

export function MatrixPage({ tasks, actions }: { tasks: Task[]; actions: TaskCardActions }) {
  // Completed tasks are excluded by buildMatrix.
  const matrix = useMemo(() => {
    const m = buildMatrix(tasks);
    for (const q of ORDER) m[q].sort((a, b) => calculatePriority(b).score - calculatePriority(a).score);
    return m;
  }, [tasks]);

  return (
    <div>
      <div className="mb-2 hidden grid-cols-2 gap-4 text-xs font-medium uppercase tracking-wide text-slate-400 md:grid">
        <span className="text-center">Urgent</span>
        <span className="text-center">Not urgent</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {ORDER.map((q) => {
          const meta = QUADRANTS[q];
          const st = QUADRANT_STYLES[meta.color];
          const list = matrix[q];
          const mins = list.reduce((s, t) => s + (t.durationMinutes ?? 0), 0);
          return (
            <section key={q} className={`rounded-2xl border p-4 ${st.panel}`}>
              <header className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h3 className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wide ${st.title}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${st.chip}`} /> {meta.title}
                  </h3>
                  <p className="text-xs text-slate-500">{meta.subtitle}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div className="font-semibold text-slate-700">{list.length} task{list.length === 1 ? '' : 's'}</div>
                  {mins > 0 && <div>{formatDuration(mins)}</div>}
                </div>
              </header>
              <div className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto pr-1">
                {list.map((t) => (
                  <TaskCard key={t.id} task={t} actions={actions} extra={<span className="text-[11px] text-slate-400">{reason(t)}</span>} />
                ))}
                {list.length === 0 && <p className="py-6 text-center text-xs text-slate-400">Nothing here</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
