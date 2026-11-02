import type { ISODate, Task } from '../types/task';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Today's local date as "YYYY-MM-DD". */
export function todayISO(now: Date = new Date()): ISODate {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse "YYYY-MM-DD" as a local-midnight Date. */
export function parseISODate(value: ISODate): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isValidISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = parseISODate(value);
  return !Number.isNaN(d.getTime()) && todayISO(d) === value;
}

/** Whole days from today until the deadline (negative = overdue, 0 = today). */
export function daysUntil(deadline: ISODate, now: Date = new Date()): number {
  const today = parseISODate(todayISO(now));
  return Math.round((parseISODate(deadline).getTime() - today.getTime()) / DAY_MS);
}

/** A task is overdue when it is not completed and its deadline is before today. */
export function isOverdue(task: Pick<Task, 'deadline' | 'status'>, now: Date = new Date()): boolean {
  return task.status !== 'Completed' && !!task.deadline && daysUntil(task.deadline, now) < 0;
}

export function isDueToday(task: Pick<Task, 'deadline' | 'status'>, now: Date = new Date()): boolean {
  return task.status !== 'Completed' && !!task.deadline && daysUntil(task.deadline, now) === 0;
}

export function addDays(now: Date, days: number): ISODate {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

export function formatDeadline(deadline: ISODate, now: Date = new Date()): string {
  const days = daysUntil(deadline, now);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days === -1) return 'Overdue by 1 day';
  if (days < 0) return `Overdue by ${-days} days`;
  if (days <= 7) return `Due in ${days} days`;
  return `Due ${parseISODate(deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
}

export function formatDuration(minutes: number | null): string {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
