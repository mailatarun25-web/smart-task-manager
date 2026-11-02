import type { Task, TaskInput } from '../types/task';

export function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // Fallback RFC4122 v4 (older browsers)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function createTask(input: TaskInput, now: Date = new Date()): Task {
  const ts = now.toISOString();
  return {
    ...input,
    title: input.title.trim(),
    id: generateId(),
    plannedDate: null,
    planOrder: null,
    completedAt: input.status === 'Completed' ? ts : null,
    createdAt: ts,
    updatedAt: ts,
  };
}

/** Apply edits, keeping completedAt consistent with status. */
export function applyTaskPatch(task: Task, patch: Partial<Task>, now: Date = new Date()): Task {
  const next: Task = { ...task, ...patch, updatedAt: now.toISOString() };
  if (patch.status && patch.status !== task.status && !('completedAt' in patch)) {
    next.completedAt = patch.status === 'Completed' ? now.toISOString() : null;
  }
  return next;
}

export function emptyTaskInput(): TaskInput {
  return {
    title: '',
    description: '',
    category: 'Project',
    startDate: null,
    deadline: null,
    importance: 'Medium',
    durationMinutes: 30,
    status: 'To Do',
    notes: '',
    urgencyOverride: null,
    importanceOverride: null,
  };
}
