import type { Status, Task } from '../types/task';

/**
 * Kanban drag-and-drop logic: moving a card to a column changes its status.
 * Completing a task stamps `completedAt`; moving it out clears the stamp.
 * Returns null when nothing changes.
 */
export function moveToStatus(task: Task, status: Status, now: Date = new Date()): Partial<Task> | null {
  if (task.status === status) return null;
  return {
    status,
    completedAt: status === 'Completed' ? now.toISOString() : null,
  };
}
