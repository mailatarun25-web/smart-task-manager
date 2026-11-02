import { useState, type ReactNode } from 'react';
import { CalendarClock, Check, Clock, Pencil, StickyNote, Trash2 } from 'lucide-react';
import type { Task } from '../types/task';
import { formatDeadline, formatDuration, isOverdue } from '../utils/dates';
import { calculatePriority } from '../utils/priority';
import { classifyTask, QUADRANTS } from '../utils/eisenhower';
import { QUADRANT_STYLES } from '../utils/categories';
import { CategoryBadge, ImportanceBadge, ScoreBadge } from './Badges';

export interface TaskCardActions {
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  onToggleComplete: (t: Task) => void;
}

/** Rounded task card used by every view. Left border = Eisenhower colour. */
export function TaskCard({
  task,
  actions,
  showExplanation = false,
  extra,
  dragging = false,
}: {
  task: Task;
  actions: TaskCardActions;
  showExplanation?: boolean;
  extra?: ReactNode;
  dragging?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const done = task.status === 'Completed';
  const overdue = isOverdue(task);
  const priority = calculatePriority(task);
  const quadrant = QUADRANTS[classifyTask(task)];
  const border = done ? 'border-l-emerald-400' : QUADRANT_STYLES[quadrant.color].border;

  return (
    <div
      className={`group rounded-xl border border-l-4 ${border} bg-white p-3 shadow-sm transition ${
        overdue ? 'border-red-200 bg-red-50/70 ring-1 ring-red-200' : 'border-slate-200'
      } ${dragging ? 'rotate-1 shadow-lg ring-2 ring-indigo-300' : 'hover:shadow-md'} ${done ? 'opacity-75' : ''}`}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={() => actions.onToggleComplete(task)}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={done ? 'Mark as not completed' : 'Mark as completed'}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500'
          }`}
        >
          <Check size={12} strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-medium leading-snug ${done ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{task.title}</p>
            {!done && (
              <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setOpen((o) => !o)} aria-label="Show priority explanation">
                <ScoreBadge score={priority.score} explanation={priority.explanation} />
              </button>
            )}
          </div>
          {task.description && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{task.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={task.category} />
            <ImportanceBadge importance={task.importance} />
            {task.status === 'Waiting' && (
              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700 ring-1 ring-inset ring-purple-200">Waiting</span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {task.deadline && (
              <span className={`inline-flex items-center gap-1 ${overdue ? 'font-semibold text-red-600' : ''}`}>
                <CalendarClock size={13} />
                {done ? `Deadline ${task.deadline}` : formatDeadline(task.deadline)}
              </span>
            )}
            {task.durationMinutes ? (
              <span className="inline-flex items-center gap-1"><Clock size={13} />{formatDuration(task.durationMinutes)}</span>
            ) : null}
            {task.notes && <span className="inline-flex items-center gap-1" title={task.notes}><StickyNote size={13} />Notes</span>}
          </div>
          {!done && (showExplanation || open) && (
            <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] leading-relaxed text-slate-500">
              <span className="font-medium text-slate-600">Score {priority.score}:</span> {priority.explanation}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">{extra}</div>
            <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
              <button onPointerDown={(e) => e.stopPropagation()} onClick={() => actions.onEdit(task)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Edit task">
                <Pencil size={14} />
              </button>
              <button onPointerDown={(e) => e.stopPropagation()} onClick={() => actions.onDelete(task)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete task">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
