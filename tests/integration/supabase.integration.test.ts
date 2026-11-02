/**
 * Live tests against YOUR Supabase project: authentication, two-device
 * realtime sync, and Row Level Security. Skipped unless these are set:
 *
 *   SUPABASE_URL, SUPABASE_ANON_KEY,
 *   TEST_USER_A_EMAIL, TEST_USER_A_PASSWORD,
 *   TEST_USER_B_EMAIL, TEST_USER_B_PASSWORD
 *
 * Create the two test users first (Dashboard → Authentication → Add user,
 * tick "Auto confirm"). Only the public anon key is used — never the service key.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const env = process.env;
const ready = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'TEST_USER_A_EMAIL', 'TEST_USER_A_PASSWORD', 'TEST_USER_B_EMAIL', 'TEST_USER_B_PASSWORD'].every((k) => env[k]);

const newClient = () =>
  createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

async function signIn(email: string, password: string) {
  const c = newClient();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { client: c, userId: data.user!.id };
}

const row = (title: string) => ({
  id: randomUUID(),
  title,
  category: 'Research',
  importance: 'High',
  status: 'To Do',
  duration_minutes: 30,
});

function waitFor<T>(arr: T[], pred: (x: T) => boolean, ms = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      const hit = arr.find(pred);
      if (hit) return resolve(hit);
      if (Date.now() - start > ms) return reject(new Error('Timed out waiting for realtime event'));
      setTimeout(tick, 100);
    };
    tick();
  });
}

describe.skipIf(!ready)('Supabase integration', () => {
  let pc1: SupabaseClient; // user A on "PC 1"
  let pc2: SupabaseClient; // user A on "PC 2"
  let other: SupabaseClient; // user B
  let userA: string;
  const created: string[] = [];

  beforeAll(async () => {
    const a1 = await signIn(env.TEST_USER_A_EMAIL!, env.TEST_USER_A_PASSWORD!);
    const a2 = await signIn(env.TEST_USER_A_EMAIL!, env.TEST_USER_A_PASSWORD!);
    const b = await signIn(env.TEST_USER_B_EMAIL!, env.TEST_USER_B_PASSWORD!);
    pc1 = a1.client;
    pc2 = a2.client;
    other = b.client;
    userA = a1.userId;
  });

  afterAll(async () => {
    if (pc1 && created.length) await pc1.from('tasks').delete().in('id', created);
    await Promise.all([pc1, pc2, other].filter(Boolean).map((c) => c.removeAllChannels()));
  });

  describe('authentication', () => {
    it('rejects a wrong password', async () => {
      const { error } = await newClient().auth.signInWithPassword({ email: env.TEST_USER_A_EMAIL!, password: 'definitely-wrong-password' });
      expect(error).not.toBeNull();
    });

    it('gives signed-out visitors no access to tasks', async () => {
      const anon = newClient();
      const { data, error } = await anon.from('tasks').select('id');
      expect(error ? [] : data).toEqual([]);
      const ins = await anon.from('tasks').insert(row('anon attempt'));
      expect(ins.error).not.toBeNull();
    });
  });

  describe('two-PC synchronisation (Realtime)', () => {
    it('pushes create, edit, complete and delete from PC 1 to PC 2', async () => {
      const events: Array<{ eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }> = [];
      await new Promise<void>((resolve, reject) => {
        const filter = `user_id=eq.${userA}`;
        pc2
          .channel(`it-${randomUUID()}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks', filter }, (p) => events.push(p as never))
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks', filter }, (p) => events.push(p as never))
          .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, (p) => events.push(p as never))
          .subscribe((s) => (s === 'SUBSCRIBED' ? resolve() : s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' ? reject(new Error(s)) : undefined));
      });
      await new Promise((r) => setTimeout(r, 1000)); // let the subscription settle

      const task = row('sync test');
      created.push(task.id);
      expect((await pc1.from('tasks').insert(task)).error).toBeNull();
      await waitFor(events, (e) => e.eventType === 'INSERT' && e.new.id === task.id);

      expect((await pc1.from('tasks').update({ category: 'Thesis' }).eq('id', task.id)).error).toBeNull();
      await waitFor(events, (e) => e.eventType === 'UPDATE' && e.new.category === 'Thesis');

      expect((await pc1.from('tasks').update({ status: 'Completed', completed_at: new Date().toISOString() }).eq('id', task.id)).error).toBeNull();
      await waitFor(events, (e) => e.eventType === 'UPDATE' && e.new.status === 'Completed');

      expect((await pc1.from('tasks').delete().eq('id', task.id)).error).toBeNull();
      await waitFor(events, (e) => e.eventType === 'DELETE' && e.old.id === task.id);

      // PC 2 reading directly also sees the final state.
      const { data } = await pc2.from('tasks').select('id').eq('id', task.id);
      expect(data).toEqual([]);
    }, 30000);
  });

  describe('Row Level Security', () => {
    let taskId: string;
    beforeAll(async () => {
      const t = row('private to A');
      taskId = t.id;
      created.push(t.id);
      const { data, error } = await pc1.from('tasks').insert(t).select('user_id').single();
      expect(error).toBeNull();
      expect(data!.user_id).toBe(userA); // user_id is filled from auth.uid()
    });

    it("user B cannot read user A's tasks", async () => {
      const { data } = await other.from('tasks').select('*').eq('id', taskId);
      expect(data).toEqual([]);
    });

    it("user B cannot update user A's tasks", async () => {
      const { data } = await other.from('tasks').update({ title: 'hacked' }).eq('id', taskId).select();
      expect(data ?? []).toEqual([]);
      const { data: mine } = await pc1.from('tasks').select('title').eq('id', taskId).single();
      expect(mine!.title).toBe('private to A');
    });

    it("user B cannot delete user A's tasks", async () => {
      await other.from('tasks').delete().eq('id', taskId);
      const { data } = await pc1.from('tasks').select('id').eq('id', taskId);
      expect(data).toHaveLength(1);
    });

    it('user B cannot create tasks on behalf of user A', async () => {
      const t = { ...row('forged'), user_id: userA };
      const { error } = await other.from('tasks').insert(t);
      expect(error).not.toBeNull();
    });

    it('user A cannot hand a task over to another user', async () => {
      const { data: bUser } = await other.auth.getUser();
      const { error } = await pc1.from('tasks').update({ user_id: bUser.user!.id }).eq('id', taskId);
      expect(error).not.toBeNull();
    });

    it('rejects categories outside the fixed eight', async () => {
      const { error } = await pc1.from('tasks').insert({ ...row('bad'), category: 'Hobby' });
      expect(error).not.toBeNull();
    });
  });
});
