import type { Task } from '../types/task';

/** Shape of a row in public.tasks (snake_case, see supabase/schema.sql). */
export interface TaskRow {
  id: string;
  user_id?: string;
  title: string;
  description: string;
  category: Task['category'];
  start_date: string | null;
  deadline: string | null;
  importance: Task['importance'];
  duration_minutes: number | null;
  status: Task['status'];
  notes: string;
  urgency_override: Task['urgencyOverride'];
  importance_override: Task['importanceOverride'];
  planned_date: string | null;
  plan_order: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function rowToTask(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? '',
    category: r.category,
    startDate: r.start_date,
    deadline: r.deadline,
    importance: r.importance,
    durationMinutes: r.duration_minutes,
    status: r.status,
    notes: r.notes ?? '',
    urgencyOverride: r.urgency_override,
    importanceOverride: r.importance_override,
    plannedDate: r.planned_date,
    planOrder: r.plan_order,
    completedAt: r.completed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** user_id is intentionally omitted: the database fills it with auth.uid(). */
export function taskToRow(t: Task): Omit<TaskRow, 'user_id'> {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    start_date: t.startDate,
    deadline: t.deadline,
    importance: t.importance,
    duration_minutes: t.durationMinutes,
    status: t.status,
    notes: t.notes,
    urgency_override: t.urgencyOverride,
    importance_override: t.importanceOverride,
    planned_date: t.plannedDate,
    plan_order: t.planOrder,
    completed_at: t.completedAt,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}
