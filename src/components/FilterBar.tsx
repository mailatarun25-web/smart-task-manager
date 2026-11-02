import { Search, X } from 'lucide-react';
import { CATEGORIES, IMPORTANCE_LEVELS, type Category, type Importance, type TaskFilters } from '../types/task';
import { inputCls } from './Modal';

export function FilterBar({
  filters,
  onChange,
  showImportance = true,
  showSearch = true,
}: {
  filters: TaskFilters;
  onChange: (f: TaskFilters) => void;
  showImportance?: boolean;
  showSearch?: boolean;
}) {
  const active = filters.category !== 'All' || filters.importance !== 'All' || filters.search;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {showSearch && (
        <div className="relative sm:w-64">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className={`${inputCls} pl-9`}
            placeholder="Search tasks…"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            aria-label="Search tasks"
          />
        </div>
      )}
      <div className="flex gap-2">
        <select
          className={`${inputCls} sm:w-44`}
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value as Category | 'All' })}
          aria-label="Filter by category"
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {showImportance && (
          <select
            className={`${inputCls} sm:w-40`}
            value={filters.importance}
            onChange={(e) => onChange({ ...filters, importance: e.target.value as Importance | 'All' })}
            aria-label="Filter by importance"
          >
            <option value="All">All importance</option>
            {IMPORTANCE_LEVELS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        )}
        {active && (
          <button
            className="inline-flex shrink-0 items-center gap-1 rounded-xl px-2 text-xs font-medium text-slate-500 hover:text-slate-800"
            onClick={() => onChange({ category: 'All', importance: 'All', search: '' })}
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
