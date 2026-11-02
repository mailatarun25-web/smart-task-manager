import { AlertTriangle, CalendarDays, CheckCircle2, Flame, ListTodo } from 'lucide-react';
import { CATEGORIES, type Category, type Task } from '../types/task';
import { computeStats } from '../utils/taskFilters';
import { CATEGORY_STYLES } from '../utils/categories';

export function Dashboard({
  tasks,
  selectedCategory,
  onSelectCategory,
}: {
  tasks: Task[];
  selectedCategory: Category | 'All';
  onSelectCategory: (c: Category | 'All') => void;
}) {
  const s = computeStats(tasks);
  const cards = [
    { label: 'Active tasks', value: s.active, icon: ListTodo, tone: 'text-indigo-600 bg-indigo-50' },
    { label: 'Due today', value: s.dueToday, icon: CalendarDays, tone: 'text-blue-600 bg-blue-50' },
    { label: 'Overdue', value: s.overdue, icon: AlertTriangle, tone: 'text-red-600 bg-red-50' },
    { label: 'High priority', value: s.highPriority, icon: Flame, tone: 'text-orange-600 bg-orange-50', hint: 'Urgent + Important' },
    { label: 'Completed', value: s.completed, icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
  ];
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map(({ label, value, icon: Icon, tone, hint }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" title={hint}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">{label}</span>
              <span className={`rounded-lg p-1.5 ${tone}`}><Icon size={16} /></span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Active tasks per category">
        <button
          onClick={() => onSelectCategory('All')}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
            selectedCategory === 'All' ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
          }`}
        >
          All Categories <span className="ml-1 opacity-70">{s.active}</span>
        </button>
        {CATEGORIES.map((c) => {
          const sel = selectedCategory === c;
          return (
            <button
              key={c}
              onClick={() => onSelectCategory(sel ? 'All' : c)}
              aria-pressed={sel}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                sel ? `${CATEGORY_STYLES[c].badge} ring-2` : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${CATEGORY_STYLES[c].dot}`} />
              {c} <span className="opacity-70">{s.byCategory[c]}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
