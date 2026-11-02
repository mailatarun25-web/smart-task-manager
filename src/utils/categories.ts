import type { Category, Importance } from '../types/task';

/** Distinct, fixed colour per category (Tailwind classes). */
export const CATEGORY_STYLES: Record<Category, { badge: string; dot: string }> = {
  Thesis: { badge: 'bg-violet-100 text-violet-800 ring-violet-200', dot: 'bg-violet-500' },
  Project: { badge: 'bg-sky-100 text-sky-800 ring-sky-200', dot: 'bg-sky-500' },
  Publication: { badge: 'bg-emerald-100 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500' },
  Teaching: { badge: 'bg-orange-100 text-orange-800 ring-orange-200', dot: 'bg-orange-500' },
  Research: { badge: 'bg-teal-100 text-teal-800 ring-teal-200', dot: 'bg-teal-500' },
  Administration: { badge: 'bg-stone-200 text-stone-800 ring-stone-300', dot: 'bg-stone-500' },
  Proposal: { badge: 'bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200', dot: 'bg-fuchsia-500' },
  Personal: { badge: 'bg-pink-100 text-pink-800 ring-pink-200', dot: 'bg-pink-500' },
};

export const IMPORTANCE_STYLES: Record<Importance, string> = {
  High: 'bg-rose-50 text-rose-700 ring-rose-200',
  Medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  Low: 'bg-slate-100 text-slate-600 ring-slate-200',
};

/** Eisenhower priority colours used consistently across views. */
export const QUADRANT_STYLES = {
  red: { border: 'border-l-red-500', panel: 'bg-red-50/60 border-red-200', title: 'text-red-700', chip: 'bg-red-500' },
  blue: { border: 'border-l-blue-500', panel: 'bg-blue-50/60 border-blue-200', title: 'text-blue-700', chip: 'bg-blue-500' },
  yellow: { border: 'border-l-yellow-400', panel: 'bg-yellow-50/70 border-yellow-200', title: 'text-yellow-700', chip: 'bg-yellow-400' },
  grey: { border: 'border-l-slate-300', panel: 'bg-slate-100/70 border-slate-200', title: 'text-slate-600', chip: 'bg-slate-400' },
} as const;
