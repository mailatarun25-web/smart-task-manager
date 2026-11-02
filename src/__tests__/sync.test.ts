import { describe, expect, it, vi } from 'vitest';
import { applyRemoteChange } from '../utils/syncReducer';
import { rowToTask, taskToRow } from '../services/taskMapper';
import { SupabaseTaskRepository } from '../services/supabaseRepository';
import { makeTask } from './fixtures';

describe('realtime sync reducer', () => {
  const a = makeTask({ id: 'a', title: 'A' });
  const b = makeTask({ id: 'b', title: 'B' });

  it('adds tasks created on the other PC', () => {
    expect(applyRemoteChange([a], { type: 'upsert', task: b }).map((t) => t.id)).toEqual(['a', 'b']);
  });
  it('applies edits, completions and category changes from the other PC', () => {
    const edited = { ...a, category: 'Thesis' as const, status: 'Completed' as const };
    expect(applyRemoteChange([a, b], { type: 'upsert', task: edited })[0]).toEqual(edited);
  });
  it('removes tasks deleted on the other PC and ignores unknown ids', () => {
    expect(applyRemoteChange([a, b], { type: 'delete', id: 'a' })).toEqual([b]);
    const list = [a];
    expect(applyRemoteChange(list, { type: 'delete', id: 'someone-elses' })).toBe(list);
  });
  it('is idempotent (echo of our own write)', () => {
    const once = applyRemoteChange([a], { type: 'upsert', task: b });
    expect(applyRemoteChange(once, { type: 'upsert', task: b })).toEqual(once);
  });
});

describe('database row mapping', () => {
  it('round-trips task ↔ row and never sends user_id from the task object', () => {
    const t = makeTask({ deadline: '2026-03-10', plannedDate: '2026-03-02', planOrder: 2, urgencyOverride: 'urgent' });
    const row = taskToRow(t);
    expect(row).not.toHaveProperty('user_id');
    expect(row.duration_minutes).toBe(30);
    expect(rowToTask({ ...row, user_id: 'u1' })).toEqual(t);
  });
});

/** Minimal chainable fake of the supabase-js query builder. */
function fakeClient() {
  const calls: Array<[string, unknown[]]> = [];
  const handlers: Array<{ filter: Record<string, unknown>; cb: (p: unknown) => void }> = [];
  const result = { data: [] as unknown[], error: null as null | { message: string } };
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order', 'upsert', 'delete', 'in']) {
    builder[m] = (...args: unknown[]) => {
      calls.push([m, args]);
      return builder;
    };
  }
  builder.then = (resolve: (v: unknown) => void) => resolve(result);
  const channel = {
    on: (_t: string, filter: Record<string, unknown>, cb: (p: unknown) => void) => {
      handlers.push({ filter, cb });
      return channel;
    },
    subscribe: (cb: (s: string) => void) => {
      cb('SUBSCRIBED');
      return channel;
    },
  };
  const client = {
    from: (table: string) => {
      calls.push(['from', [table]]);
      return builder;
    },
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
  };
  return { client, calls, handlers, result };
}

describe('SupabaseTaskRepository', () => {
  it('scopes reads and deletes to the signed-in user', async () => {
    const f = fakeClient();
    const repo = new SupabaseTaskRepository(f.client as never, 'user-1');
    await repo.fetchAll();
    await repo.remove(['x']);
    expect(f.calls).toContainEqual(['eq', ['user_id', 'user-1']]);
    expect(f.calls.filter(([m]) => m === 'eq')).toHaveLength(2);
  });

  it('writes rows owned by the signed-in user', async () => {
    const f = fakeClient();
    await new SupabaseTaskRepository(f.client as never, 'user-1').upsert([makeTask()]);
    const [, args] = f.calls.find(([m]) => m === 'upsert')!;
    expect((args[0] as Array<{ user_id: string }>)[0].user_id).toBe('user-1');
  });

  it('surfaces database errors as friendly messages', async () => {
    const f = fakeClient();
    f.result.error = { message: 'new row violates row-level security policy for table "tasks"' };
    await expect(new SupabaseTaskRepository(f.client as never, 'u').upsert([makeTask()])).rejects.toThrow('Permission denied');
    f.result.error = { message: 'TypeError: Failed to fetch' };
    await expect(new SupabaseTaskRepository(f.client as never, 'u').fetchAll()).rejects.toThrow(/internet connection/);
  });

  it('subscribes to realtime changes filtered by user and maps events', () => {
    const f = fakeClient();
    const changes: unknown[] = [];
    const statuses: string[] = [];
    new SupabaseTaskRepository(f.client as never, 'user-1').subscribe((c) => changes.push(c), (s) => statuses.push(s));
    expect(statuses).toEqual(['connecting', 'live']);
    const insert = f.handlers.find((h) => h.filter.event === 'INSERT')!;
    const del = f.handlers.find((h) => h.filter.event === 'DELETE')!;
    expect(insert.filter.filter).toBe('user_id=eq.user-1');
    const row = { ...taskToRow(makeTask({ id: 'r1' })), user_id: 'user-1' };
    insert.cb({ new: row });
    del.cb({ old: { id: 'r1' } });
    expect(changes).toEqual([{ type: 'upsert', task: makeTask({ id: 'r1' }) }, { type: 'delete', id: 'r1' }]);
  });
});
