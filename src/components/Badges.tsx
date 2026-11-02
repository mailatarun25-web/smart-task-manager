import type { Category, Importance } from '../types/task';
import { CATEGORY_STYLES, IMPORTANCE_STYLES } from '../utils/categories';

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${CATEGORY_STYLES[category].badge}`}>
      {category}
    </span>
  );
}

export function ImportanceBadge({ importance }: { importance: Importance }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${IMPORTANCE_STYLES[importance]}`}>
      {importance}
    </span>
  );
}

export function ScoreBadge({ score, explanation }: { score: number; explanation: string }) {
  const tone = score >= 70 ? 'bg-red-600' : score >= 50 ? 'bg-indigo-600' : score >= 30 ? 'bg-slate-500' : 'bg-slate-300';
  return (
    <span title={`Priority ${score}/100 — ${explanation}`} className={`inline-flex min-w-8 justify-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-white ${tone}`}>
      {score}
    </span>
  );
}
