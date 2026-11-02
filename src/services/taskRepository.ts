import type { Task } from '../types/task';

export type RemoteChange =
  | { type: 'upsert'; task: Task }
  | { type: 'delete'; id: string }
  | { type: 'replace'; tasks: Task[] };
export type ChannelStatus = 'connecting' | 'live' | 'error' | 'closed';

/**
 * Storage abstraction. All three views read from ONE task list held in
 * `useTasks`, which talks to the database only through this interface.
 */
export interface TaskRepository {
  readonly mode: 'cloud' | 'local';
  fetchAll(): Promise<Task[]>;
  /** Insert or update (by id). Used for create, edit, complete, plan and import. */
  upsert(tasks: Task[]): Promise<void>;
  remove(ids: string[]): Promise<void>;
  /** Push changes made elsewhere (other PC / other tab). Returns an unsubscribe function. */
  subscribe(onChange: (c: RemoteChange) => void, onStatus: (s: ChannelStatus) => void): () => void;
}
