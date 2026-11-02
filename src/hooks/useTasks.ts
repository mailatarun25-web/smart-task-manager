import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Status, Task, TaskInput } from '../types/task';
import type { ChannelStatus, TaskRepository } from '../services/taskRepository';
import { loadLocal, saveLocal } from '../services/localRepository';
import { applyRemoteChange } from '../utils/syncReducer';
import { applyTaskPatch, createTask } from '../utils/taskFactory';
import { moveToStatus } from '../utils/kanban';
import { todayISO } from '../utils/dates';

export type SyncState = 'loading' | 'live' | 'connecting' | 'offline' | 'error' | 'saving';
export interface Notice {
  id: number;
  kind: 'error' | 'success' | 'info';
  message: string;
}

/**
 * Single source of truth for tasks. Kanban, Eisenhower and Today all read
 * this one list, so any change (incl. one arriving from the other PC via
 * Realtime) updates every view immediately.
 *
 * Writes are optimistic: the UI updates instantly, the change is sent to the
 * database, and on failure the previous state is restored and an error shown.
 */
export function useTasks(repo: TaskRepository, cacheKey: string) {
  const [tasks, setTasksState] = useState<Task[]>(() => loadLocal(cacheKey) ?? []);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [channel, setChannel] = useState<ChannelStatus>('connecting');
  const [online, setOnline] = useState(() => navigator.onLine);
  const [pending, setPending] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const tasksRef = useRef(tasks);

  // Updates the ref synchronously so back-to-back actions always see the latest list.
  const setTasks = useCallback((updater: (prev: Task[]) => Task[]) => {
    const next = updater(tasksRef.current);
    tasksRef.current = next;
    setTasksState(next);
  }, []);

  const notify = useCallback((kind: Notice['kind'], message: string) => {
    setNotice({ id: Date.now() + Math.random(), kind, message });
  }, []);

  // Keep a per-user cache so the app shows data instantly and stays readable offline.
  useEffect(() => {
    if (!loading) saveLocal(tasks, cacheKey);
  }, [tasks, loading, cacheKey]);

  const refresh = useCallback(async () => {
    try {
      const fresh = await repo.fetchAll();
      setTasks(() => fresh);
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [repo, setTasks]);

  // Initial load + realtime subscription.
  useEffect(() => {
    void refresh();
    let wasDown = false;
    const unsubscribe = repo.subscribe(
      (change) => setTasks((prev) => applyRemoteChange(prev, change)),
      (status) => {
        setChannel(status);
        if (status === 'error' || status === 'closed') wasDown = true;
        // After a reconnect, re-fetch to pick up anything missed while disconnected.
        if (status === 'live' && wasDown) {
          wasDown = false;
          void refresh();
        }
      },
    );
    return unsubscribe;
  }, [repo, refresh, setTasks]);

  // Browser connectivity.
  useEffect(() => {
    const up = () => {
      setOnline(true);
      void refresh();
    };
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, [refresh]);

  /** Optimistically apply `update`, persist, and roll back on failure. */
  const commit = useCallback(
    async (update: (prev: Task[]) => Task[], persist: () => Promise<void>, success?: string) => {
      if (repo.mode === 'cloud' && !navigator.onLine) {
        notify('error', "You're offline — changes can't be saved until the connection returns.");
        return false;
      }
      const snapshot = tasksRef.current;
      setTasks(update);
      setPending((n) => n + 1);
      try {
        await persist();
        if (success) notify('success', success);
        return true;
      } catch (e) {
        setTasks(() => snapshot);
        notify('error', `Not saved: ${(e as Error).message}`);
        return false;
      } finally {
        setPending((n) => n - 1);
      }
    },
    [repo, notify, setTasks],
  );

  const upsertLocal = (changed: Task[]) => (prev: Task[]) => {
    const map = new Map(changed.map((t) => [t.id, t]));
    const existing = new Set(prev.map((t) => t.id));
    return [...prev.map((t) => map.get(t.id) ?? t), ...changed.filter((t) => !existing.has(t.id))];
  };

  const saveTasks = useCallback(
    (changed: Task[], success?: string) => commit(upsertLocal(changed), () => repo.upsert(changed), success),
    [commit, repo],
  );

  const find = (id: string) => tasksRef.current.find((t) => t.id === id);

  const actions = useMemo(
    () => ({
      addTask: (input: TaskInput) => saveTasks([createTask(input)], 'Task added'),
      addTasks: (inputs: TaskInput[], success?: string) => saveTasks(inputs.map((i) => createTask(i)), success),
      updateTask: (id: string, patch: Partial<Task>, success?: string) => {
        const t = find(id);
        return t ? saveTasks([applyTaskPatch(t, patch)], success) : Promise.resolve(false);
      },
      setStatus: (id: string, status: Status) => {
        const t = find(id);
        const patch = t && moveToStatus(t, status);
        return t && patch ? saveTasks([applyTaskPatch(t, patch)]) : Promise.resolve(false);
      },
      toggleComplete: (id: string) => {
        const t = find(id);
        if (!t) return Promise.resolve(false);
        return saveTasks([applyTaskPatch(t, { status: t.status === 'Completed' ? 'To Do' : 'Completed' })]);
      },
      deleteTask: (id: string) =>
        commit((prev) => prev.filter((t) => t.id !== id), () => repo.remove([id]), 'Task deleted'),
      importTasks: (imported: Task[]) => saveTasks(imported, `Imported ${imported.length} task(s)`),

      // ── Today plan (stored on the task so it syncs too) ──
      addToPlan: (ids: string | string[]) => {
        const today = todayISO();
        let order = Math.max(0, ...tasksRef.current.filter((x) => x.plannedDate === today).map((x) => x.planOrder ?? 0));
        const changed = (Array.isArray(ids) ? ids : [ids])
          .map(find)
          .filter((t): t is Task => !!t && t.plannedDate !== today)
          .map((t) => applyTaskPatch(t, { plannedDate: today, planOrder: ++order }));
        return changed.length ? saveTasks(changed) : Promise.resolve(false);
      },
      removeFromPlan: (id: string) => {
        const t = find(id);
        return t ? saveTasks([applyTaskPatch(t, { plannedDate: null, planOrder: null })]) : Promise.resolve(false);
      },
      /** Move a planned task up (-1) or down (+1); renumbers the whole plan. */
      movePlanned: (id: string, dir: -1 | 1) => {
        const today = todayISO();
        const plan = tasksRef.current
          .filter((t) => t.plannedDate === today)
          .sort((a, b) => (a.planOrder ?? 0) - (b.planOrder ?? 0));
        const i = plan.findIndex((t) => t.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= plan.length) return Promise.resolve(false);
        [plan[i], plan[j]] = [plan[j], plan[i]];
        const changed = plan
          .map((t, idx) => (t.planOrder === idx + 1 ? null : applyTaskPatch(t, { planOrder: idx + 1 })))
          .filter((t): t is Task => !!t);
        return saveTasks(changed);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saveTasks, commit, repo],
  );

  const dismissNotice = useCallback(() => setNotice(null), []);

  const sync: SyncState = loading
    ? 'loading'
    : !online
      ? 'offline'
      : pending > 0
        ? 'saving'
        : channel === 'live'
          ? 'live'
          : channel === 'connecting'
            ? 'connecting'
            : 'error';

  return {
    tasks,
    loading,
    loadError,
    sync,
    notice,
    dismissNotice,
    notify,
    refresh,
    ...actions,
  };
}

export type TaskStore = ReturnType<typeof useTasks>;
