import type { Task } from '../types/task';
import type { RemoteChange } from '../services/taskRepository';

/**
 * Applies a change received from the database (another PC, another tab, or
 * the echo of our own write) to the local task list.
 *
 * The database is the source of truth and Realtime delivers changes in
 * commit order, so incoming changes always win. We deliberately do NOT
 * compare client timestamps: the two PCs' clocks may differ.
 * Applying the same change twice is harmless (idempotent).
 */
export function applyRemoteChange(tasks: Task[], change: RemoteChange): Task[] {
  switch (change.type) {
    case 'replace':
      return change.tasks;
    case 'delete':
      return tasks.some((t) => t.id === change.id) ? tasks.filter((t) => t.id !== change.id) : tasks;
    case 'upsert': {
      const idx = tasks.findIndex((t) => t.id === change.task.id);
      if (idx === -1) return [...tasks, change.task];
      const next = tasks.slice();
      next[idx] = change.task;
      return next;
    }
  }
}
