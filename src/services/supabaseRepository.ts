import type { SupabaseClient } from '@supabase/supabase-js';
import type { Task } from '../types/task';
import { rowToTask, taskToRow, type TaskRow } from './taskMapper';
import type { ChannelStatus, RemoteChange, TaskRepository } from './taskRepository';

const TABLE = 'tasks';

/** Turns Supabase/network errors into short, user-friendly messages. */
export function friendlyError(err: unknown): string {
  const msg = (err as { message?: string })?.message ?? String(err);
  if (/Failed to fetch|NetworkError|network|ERR_INTERNET/i.test(msg)) return 'Cannot reach the server. Check your internet connection.';
  if (/JWT|token|not authenticated/i.test(msg)) return 'Your session has expired. Please sign in again.';
  if (/row-level security/i.test(msg)) return 'Permission denied for this task.';
  if (/check constraint/i.test(msg)) return 'The task contains an invalid value.';
  return msg;
}

export class SupabaseTaskRepository implements TaskRepository {
  readonly mode = 'cloud' as const;
  constructor(private client: SupabaseClient, private userId: string) {}

  async fetchAll(): Promise<Task[]> {
    // RLS already limits rows to auth.uid(); the explicit filter is defence in depth.
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(friendlyError(error));
    return (data as TaskRow[]).map(rowToTask);
  }

  async upsert(tasks: Task[]): Promise<void> {
    if (!tasks.length) return;
    const rows = tasks.map((t) => ({ ...taskToRow(t), user_id: this.userId }));
    const { error } = await this.client.from(TABLE).upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(friendlyError(error));
  }

  async remove(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const { error } = await this.client.from(TABLE).delete().in('id', ids).eq('user_id', this.userId);
    if (error) throw new Error(friendlyError(error));
  }

  subscribe(onChange: (c: RemoteChange) => void, onStatus: (s: ChannelStatus) => void): () => void {
    onStatus('connecting');
    const filter = `user_id=eq.${this.userId}`;
    const onRow = (payload: { new: unknown }) => onChange({ type: 'upsert', task: rowToTask(payload.new as TaskRow) });
    const channel = this.client
      .channel(`tasks:${this.userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE, filter }, onRow)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: TABLE, filter }, onRow)
      // Supabase cannot filter DELETE events; they carry only the primary key,
      // and ids that are not in our list are ignored by applyRemoteChange.
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: TABLE }, (payload) => {
        const id = (payload.old as Partial<TaskRow>)?.id;
        if (id) onChange({ type: 'delete', id });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') onStatus('live');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onStatus('error');
        else if (status === 'CLOSED') onStatus('closed');
      });
    return () => {
      void this.client.removeChannel(channel);
    };
  }
}
