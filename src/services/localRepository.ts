import type { Task } from '../types/task';
import { validateTask } from '../utils/validation';
import type { ChannelStatus, RemoteChange, TaskRepository } from './taskRepository';

export const LOCAL_KEY = 'smart-tasks:local:v1';

export function loadLocal(key = LOCAL_KEY): Task[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((t, i) => validateTask(t, i).task).filter((t): t is Task => !!t);
  } catch {
    return null;
  }
}

export function saveLocal(tasks: Task[], key = LOCAL_KEY): void {
  try {
    localStorage.setItem(key, JSON.stringify(tasks));
  } catch {
    /* storage full or blocked — ignore */
  }
}

/**
 * Offline / single-device mode (used when Supabase is not configured).
 * Same interface as the cloud repository; syncs between tabs of one browser.
 */
export class LocalTaskRepository implements TaskRepository {
  readonly mode = 'local' as const;

  async fetchAll(): Promise<Task[]> {
    return loadLocal() ?? [];
  }

  async upsert(tasks: Task[]): Promise<void> {
    const map = new Map((loadLocal() ?? []).map((t) => [t.id, t]));
    for (const t of tasks) map.set(t.id, t);
    saveLocal([...map.values()]);
  }

  async remove(ids: string[]): Promise<void> {
    const drop = new Set(ids);
    saveLocal((loadLocal() ?? []).filter((t) => !drop.has(t.id)));
  }

  subscribe(onChange: (c: RemoteChange) => void, onStatus: (s: ChannelStatus) => void): () => void {
    onStatus('live');
    const handler = (e: StorageEvent) => {
      if (e.key !== LOCAL_KEY) return;
      onChange({ type: 'replace', tasks: loadLocal() ?? [] });
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}
