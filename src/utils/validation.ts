import { CATEGORIES, IMPORTANCE_LEVELS, STATUSES, type Task } from '../types/task';
import { isValidISODate } from './dates';
import { generateId } from './taskFactory';

export interface ImportResult {
  tasks: Task[];
  errors: string[];
}

const isStr = (v: unknown): v is string => typeof v === 'string';
const optStr = (v: unknown) => (isStr(v) ? v : '');
const isTimestamp = (v: unknown): v is string => isStr(v) && !Number.isNaN(Date.parse(v));

/** Validate a single task-like object. Returns the normalised task or a list of problems. */
export function validateTask(
  raw: unknown,
  index = 0,
  opts: { touch?: boolean } = {},
): { task?: Task; errors: string[] } {
  const label = `Task #${index + 1}`;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { errors: [`${label}: not an object`] };
  const r = raw as Record<string, unknown>;
  const errors: string[] = [];

  if (!isStr(r.title) || !r.title.trim()) errors.push(`${label}: title is required`);
  else if (r.title.length > 300) errors.push(`${label}: title is longer than 300 characters`);
  if (!CATEGORIES.includes(r.category as never))
    errors.push(`${label}: category must be one of ${CATEGORIES.join(', ')}`);
  if (!IMPORTANCE_LEVELS.includes(r.importance as never))
    errors.push(`${label}: importance must be High, Medium or Low`);
  if (!STATUSES.includes(r.status as never))
    errors.push(`${label}: status must be one of ${STATUSES.join(', ')}`);
  for (const key of ['startDate', 'deadline', 'plannedDate'] as const) {
    if (r[key] != null && r[key] !== '' && !isValidISODate(r[key]))
      errors.push(`${label}: ${key} must be a date in YYYY-MM-DD format`);
  }
  if (
    r.durationMinutes != null &&
    !(typeof r.durationMinutes === 'number' && Number.isInteger(r.durationMinutes) && r.durationMinutes >= 0 && r.durationMinutes <= 10000)
  )
    errors.push(`${label}: durationMinutes must be a whole number between 0 and 10000`);
  if (r.urgencyOverride != null && !['urgent', 'not_urgent'].includes(r.urgencyOverride as string))
    errors.push(`${label}: invalid urgencyOverride`);
  if (r.importanceOverride != null && !['important', 'not_important'].includes(r.importanceOverride as string))
    errors.push(`${label}: invalid importanceOverride`);

  if (errors.length) return { errors };

  const now = new Date().toISOString();
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const status = r.status as Task['status'];
  return {
    errors,
    task: {
      id: isStr(r.id) && uuidRe.test(r.id) ? r.id : generateId(),
      title: (r.title as string).trim(),
      description: optStr(r.description),
      category: r.category as Task['category'],
      startDate: (r.startDate as string) || null,
      deadline: (r.deadline as string) || null,
      importance: r.importance as Task['importance'],
      durationMinutes: (r.durationMinutes as number | null | undefined) ?? null,
      status,
      notes: optStr(r.notes),
      urgencyOverride: (r.urgencyOverride as Task['urgencyOverride']) ?? null,
      importanceOverride: (r.importanceOverride as Task['importanceOverride']) ?? null,
      plannedDate: (r.plannedDate as string) || null,
      planOrder: typeof r.planOrder === 'number' ? r.planOrder : null,
      completedAt: isTimestamp(r.completedAt) ? r.completedAt : status === 'Completed' ? now : null,
      createdAt: isTimestamp(r.createdAt) ? r.createdAt : now,
      // Imports are stamped "now" so they count as the latest edit.
      updatedAt: !opts.touch && isTimestamp(r.updatedAt) ? r.updatedAt : now,
    },
  };
}

/**
 * Validate an imported JSON backup. Accepts either `{ tasks: [...] }`
 * (the export format) or a bare array. All-or-nothing: if any task is
 * invalid, nothing is imported and every problem is reported.
 */
export function validateImport(json: unknown): ImportResult {
  const list = Array.isArray(json)
    ? json
    : json && typeof json === 'object' && Array.isArray((json as { tasks?: unknown }).tasks)
      ? (json as { tasks: unknown[] }).tasks
      : null;
  if (!list) return { tasks: [], errors: ['File must contain a "tasks" array.'] };
  if (list.length > 5000) return { tasks: [], errors: ['Too many tasks (max 5000).'] };

  const tasks: Task[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  list.forEach((raw, i) => {
    const res = validateTask(raw, i, { touch: true });
    errors.push(...res.errors);
    if (res.task) {
      if (seen.has(res.task.id)) res.task.id = generateId();
      seen.add(res.task.id);
      tasks.push(res.task);
    }
  });
  return errors.length ? { tasks: [], errors } : { tasks, errors: [] };
}

export function parseImportText(text: string): ImportResult {
  try {
    return validateImport(JSON.parse(text));
  } catch {
    return { tasks: [], errors: ['File is not valid JSON.'] };
  }
}

export function buildExport(tasks: Task[]) {
  return { app: 'smart-task-manager', version: 2, exportedAt: new Date().toISOString(), tasks };
}
