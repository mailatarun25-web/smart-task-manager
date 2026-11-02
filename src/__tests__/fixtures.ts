import type { Task } from '../types/task';

/** Fixed "now": Monday 2026-03-02, 10:00 local time. */
export const NOW = new Date(2026, 2, 2, 10, 0, 0);

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Test task',
    description: '',
    category: 'Research',
    startDate: null,
    deadline: null,
    importance: 'Medium',
    durationMinutes: 30,
    status: 'To Do',
    notes: '',
    urgencyOverride: null,
    importanceOverride: null,
    plannedDate: null,
    planOrder: null,
    completedAt: null,
    createdAt: '2026-03-01T09:00:00.000Z',
    updatedAt: '2026-03-01T09:00:00.000Z',
    ...overrides,
  };
}
