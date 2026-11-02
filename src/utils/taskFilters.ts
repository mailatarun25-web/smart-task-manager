import type { Category, Task, TaskFilters } from '../types/task';
import { CATEGORIES } from '../types/task';
import { isDueToday, isOverdue, todayISO } from './dates';
import { isImportant, isUrgent } from './eisenhower';

export const activeTasks = (tasks: Task[]) => tasks.filter((t) => t.status !== 'Completed');
export const completedTasks = (tasks: Task[]) => tasks.filter((t) => t.status === 'Completed');

export function completedOn(tasks: Task[], day: string = todayISO()): Task[] {
  return tasks.filter(
    (t) => t.status === 'Completed' && t.completedAt && todayISO(new Date(t.completedAt)) === day,
  );
}

export function applyFilters(tasks: Task[], f: TaskFilters): Task[] {
  const q = f.search.trim().toLowerCase();
  return tasks.filter(
    (t) =>
      (f.category === 'All' || t.category === f.category) &&
      (f.importance === 'All' || t.importance === f.importance) &&
      (!q ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.notes.toLowerCase().includes(q)),
  );
}

export interface DashboardStats {
  active: number;
  dueToday: number;
  overdue: number;
  highPriority: number;
  completed: number;
  byCategory: Record<Category, number>;
}

export function computeStats(tasks: Task[], now: Date = new Date()): DashboardStats {
  const active = activeTasks(tasks);
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const t of active) byCategory[t.category]++;
  return {
    active: active.length,
    dueToday: active.filter((t) => isDueToday(t, now)).length,
    overdue: active.filter((t) => isOverdue(t, now)).length,
    // "High priority" = Urgent + Important (the red Do First quadrant)
    highPriority: active.filter((t) => isImportant(t) && isUrgent(t, now)).length,
    completed: tasks.length - active.length,
    byCategory,
  };
}
