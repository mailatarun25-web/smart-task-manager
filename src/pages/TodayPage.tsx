import { useMemo, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, CalendarCheck2, Check, Clock, ListPlus, Minus, Plus, Sparkles } from 'lucide-react';
import type { Task } from '../types/task';
import { TaskCard, type TaskCardActions } from '../components/TaskCard';
import { CategoryBadge, ScoreBadge } from '../components/Badges';
import { formatDuration, isDueToday, isOverdue, todayISO } from '../utils/dates';
import { calculatePriority, rankTasks } from '../utils/priority';
import { completedOn } from '../utils/taskFilters';

export interface PlanActions {
  addToPlan: (ids: string | string[]) => void;
  removeFromPlan: (id: string) => void;
  movePlanned: (id: string, dir: -1 | 1) => void;
}

function Section({ title, icon, count, children, aside }: { title: string; icon: ReactNode; count?: number; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          {icon} {title} {count != null && <span className="rounded-full bg-slate-100 px-2 text-xs font-medium text-slate-500">{count}</span>}
        </h3>
        {aside}
      </header>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: ReactNode }) => <p className="py-4 text-center text-xs text-slate-400">{children}</p>;

export function TodayPage({ tasks, actions, plan }: { tasks: Task[]; actions: TaskCardActions; plan: PlanActions }) {
  const today = todayISO();
  const planned = useMemo(
    () => tasks.filter((t) => t.plannedDate === today).sort((a, b) => (a.planOrder ?? 0) - (b.planOrder ?? 0)),
    [tasks, today],
  );
  const plannedIds = new Set(planned.map((t) => t.id));
  const top5 = useMemo(() => rankTasks(tasks).slice(0, 5), [tasks]);
  const dueToday = tasks.filter((t) => isDueToday(t));
  const overdue = tasks.filter((t) => isOverdue(t));
  const doneToday = completedOn(tasks, today);

  const totalPlanned = planned.reduce((s, t) => s + (t.durationMinutes ?? 0), 0);
  const remaining = planned.filter((t) => t.status !== 'Completed').reduce((s, t) => s + (t.durationMinutes ?? 0), 0);
  const unestimated = planned.filter((t) => !t.durationMinutes && t.status !== 'Completed').length;
  const progress = totalPlanned ? Math.round(((totalPlanned - remaining) / totalPlanned) * 100) : 0;

  const planButton = (t: Task) =>
    t.status === 'Completed' ? null : plannedIds.has(t.id) ? (
      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700"><Check size={12} /> Planned</span>
    ) : (
      <button onClick={() => plan.addToPlan(t.id)} className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100">
        <Plus size={12} /> Add to today
      </button>
    );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Planned today', value: String(planned.length) },
          { label: 'Total workload', value: totalPlanned ? formatDuration(totalPlanned) : '0 min' },
          { label: 'Remaining', value: remaining ? formatDuration(remaining) : '0 min' },
          { label: 'Completed today', value: String(doneToday.length) },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{c.label}</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Section
            title="Today's plan"
            icon={<CalendarCheck2 size={16} className="text-indigo-600" />}
            count={planned.length}
            aside={<span className="text-xs text-slate-500">{progress}% done</span>}
          >
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            {planned.length === 0 ? (
              <Empty>No tasks planned yet. Add some from the recommendations →</Empty>
            ) : (
              <ol className="space-y-2">
                {planned.map((t, i) => {
                  const done = t.status === 'Completed';
                  const p = calculatePriority(t);
                  return (
                    <li key={t.id} className={`flex items-center gap-2 rounded-xl border p-2.5 ${isOverdue(t) ? 'border-red-200 bg-red-50/60' : 'border-slate-200'} ${done ? 'bg-slate-50' : ''}`}>
                      <span className="w-5 text-center text-xs font-semibold text-slate-400">{i + 1}</span>
                      <button
                        onClick={() => actions.onToggleComplete(t)}
                        aria-label={done ? 'Mark as not completed' : 'Mark as completed'}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500'}`}
                      >
                        <Check size={12} strokeWidth={3} />
                      </button>
                      <button className="min-w-0 flex-1 text-left" onClick={() => actions.onEdit(t)}>
                        <p className={`truncate text-sm font-medium ${done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{t.title}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                          <CategoryBadge category={t.category} />
                          <span className="inline-flex items-center gap-1"><Clock size={11} />{formatDuration(t.durationMinutes)}</span>
                          {t.status === 'Waiting' && <span className="text-purple-600">Waiting</span>}
                        </div>
                      </button>
                      {!done && <ScoreBadge score={p.score} explanation={p.explanation} />}
                      <div className="flex shrink-0 items-center">
                        <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30" disabled={i === 0} onClick={() => plan.movePlanned(t.id, -1)} aria-label="Move up"><ArrowUp size={15} /></button>
                        <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30" disabled={i === planned.length - 1} onClick={() => plan.movePlanned(t.id, 1)} aria-label="Move down"><ArrowDown size={15} /></button>
                        <button className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => plan.removeFromPlan(t.id)} aria-label="Remove from today's plan"><Minus size={15} /></button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
            {unestimated > 0 && <p className="mt-2 text-[11px] text-slate-400">{unestimated} planned task(s) have no time estimate.</p>}
          </Section>

          <Section title="Overdue" icon={<span className="h-2.5 w-2.5 rounded-full bg-red-500" />} count={overdue.length}>
            {overdue.length ? <div className="grid gap-2 md:grid-cols-2">{overdue.map((t) => <TaskCard key={t.id} task={t} actions={actions} extra={planButton(t)} />)}</div> : <Empty>Nothing overdue 🎉</Empty>}
          </Section>

          <Section title="Due today" icon={<span className="h-2.5 w-2.5 rounded-full bg-blue-500" />} count={dueToday.length}>
            {dueToday.length ? <div className="grid gap-2 md:grid-cols-2">{dueToday.map((t) => <TaskCard key={t.id} task={t} actions={actions} extra={planButton(t)} />)}</div> : <Empty>No deadlines today.</Empty>}
          </Section>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Section title="Top 5 recommended" icon={<Sparkles size={16} className="text-amber-500" />}>
            <p className="-mt-1 mb-3 text-[11px] text-slate-400">Ranked by priority score. Waiting tasks are never recommended.</p>
            {top5.length ? (
              <div className="space-y-2">
                {top5.map((t) => <TaskCard key={t.id} task={t} actions={actions} showExplanation extra={planButton(t)} />)}
              </div>
            ) : (
              <Empty>No actionable tasks.</Empty>
            )}
            {top5.some((t) => !plannedIds.has(t.id)) && (
              <button
                onClick={() => plan.addToPlan(top5.filter((t) => !plannedIds.has(t.id)).map((t) => t.id))}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-indigo-300 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
              >
                <ListPlus size={14} /> Add all recommendations to today
              </button>
            )}
          </Section>

          <Section title="Completed today" icon={<Check size={16} className="text-emerald-600" />} count={doneToday.length}>
            {doneToday.length ? <div className="space-y-2">{doneToday.map((t) => <TaskCard key={t.id} task={t} actions={actions} />)}</div> : <Empty>Nothing completed yet today.</Empty>}
          </Section>
        </div>
      </div>
    </div>
  );
}
