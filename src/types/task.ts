/**
 * Core data model. Categories, importance levels and statuses are fixed
 * union types; the arrays below are the single source of truth for every
 * dropdown, filter and validation check in the app (and match the CHECK
 * constraints in supabase/schema.sql).
 */

export const CATEGORIES = [
  'Thesis',
  'Project',
  'Publication',
  'Teaching',
  'Research',
  'Administration',
  'Proposal',
  'Personal',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const IMPORTANCE_LEVELS = ['High', 'Medium', 'Low'] as const;
export type Importance = (typeof IMPORTANCE_LEVELS)[number];

export const STATUSES = ['To Do', 'In Progress', 'Waiting', 'Completed'] as const;
export type Status = (typeof STATUSES)[number];

/** Manual Eisenhower overrides. `null` = use the automatic rule. */
export type UrgencyOverride = 'urgent' | 'not_urgent' | null;
export type ImportanceOverride = 'important' | 'not_important' | null;

/** Dates are stored as local calendar dates: "YYYY-MM-DD". */
export type ISODate = string;

export interface Task {
  id: string;
  title: string;
  description: string;
  category: Category;
  startDate: ISODate | null;
  deadline: ISODate | null;
  importance: Importance;
  durationMinutes: number | null;
  status: Status;
  notes: string;
  urgencyOverride: UrgencyOverride;
  importanceOverride: ImportanceOverride;
  /** Date the task was added to the Today plan (null = not planned). */
  plannedDate: ISODate | null;
  /** Manual order within the Today plan. */
  planOrder: number | null;
  completedAt: string | null; // ISO timestamp
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/** Fields the user edits in the task form. */
export type TaskInput = Omit<
  Task,
  'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'plannedDate' | 'planOrder'
>;

export interface TaskFilters {
  category: Category | 'All';
  importance: Importance | 'All';
  search: string;
}

export const DEFAULT_FILTERS: TaskFilters = { category: 'All', importance: 'All', search: '' };
