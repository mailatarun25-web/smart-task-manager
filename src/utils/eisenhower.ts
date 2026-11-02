import type { Task } from '../types/task';
import { daysUntil } from './dates';

export type Quadrant = 'do' | 'schedule' | 'delegate' | 'later';

/** Deadlines within this many days (incl. overdue) count as urgent. */
export const URGENT_WITHIN_DAYS = 2;

export const QUADRANTS: Record<
  Quadrant,
  { title: string; subtitle: string; color: 'red' | 'blue' | 'yellow' | 'grey' }
> = {
  do: { title: 'Do First', subtitle: 'Urgent + Important', color: 'red' },
  schedule: { title: 'Schedule', subtitle: 'Not Urgent + Important', color: 'blue' },
  delegate: { title: 'Delegate', subtitle: 'Urgent + Not Important', color: 'yellow' },
  later: { title: 'Later', subtitle: 'Not Urgent + Not Important', color: 'grey' },
};

/** High importance = Important; Medium/Low = Not Important — unless manually overridden. */
export function isImportant(task: Task): boolean {
  if (task.importanceOverride) return task.importanceOverride === 'important';
  return task.importance === 'High';
}

/** Overdue or due within 2 days = Urgent; later or no deadline = Not Urgent — unless overridden. */
export function isUrgent(task: Task, now: Date = new Date()): boolean {
  if (task.urgencyOverride) return task.urgencyOverride === 'urgent';
  if (!task.deadline) return false;
  return daysUntil(task.deadline, now) <= URGENT_WITHIN_DAYS;
}

export function classifyTask(task: Task, now: Date = new Date()): Quadrant {
  const urgent = isUrgent(task, now);
  const important = isImportant(task);
  if (urgent && important) return 'do';
  if (important) return 'schedule';
  if (urgent) return 'delegate';
  return 'later';
}

/** Groups active (non-completed) tasks into the four quadrants. */
export function buildMatrix(tasks: Task[], now: Date = new Date()): Record<Quadrant, Task[]> {
  const matrix: Record<Quadrant, Task[]> = { do: [], schedule: [], delegate: [], later: [] };
  for (const t of tasks) {
    if (t.status === 'Completed') continue;
    matrix[classifyTask(t, now)].push(t);
  }
  return matrix;
}
