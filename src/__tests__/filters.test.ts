import { describe, expect, it } from 'vitest';
import { activeTasks, applyFilters, completedOn, completedTasks, computeStats } from '../utils/taskFilters';
import { moveToStatus } from '../utils/kanban';
import { CATEGORIES } from '../types/task';
import { makeTask, NOW } from './fixtures';

const tasks = [
  makeTask({ id: '1', title: 'Write abstract', category: 'Publication', importance: 'High', deadline: '2026-03-02' }),
  makeTask({ id: '2', title: 'Grade exams', category: 'Teaching', importance: 'Low', deadline: '2026-02-27' }),
  makeTask({ id: '3', title: 'Old task', category: 'Teaching', status: 'Completed', completedAt: new Date(2026, 2, 2, 8).toISOString() }),
  makeTask({ id: '4', title: 'Older task', category: 'Thesis', status: 'Completed', completedAt: new Date(2026, 1, 20).toISOString() }),
  makeTask({ id: '5', title: 'Wait for reply', category: 'Thesis', status: 'Waiting', notes: 'ping supervisor' }),
];

describe('completed task filtering', () => {
  it('separates active and completed tasks', () => {
    expect(activeTasks(tasks).map((t) => t.id)).toEqual(['1', '2', '5']);
    expect(completedTasks(tasks).map((t) => t.id)).toEqual(['3', '4']);
  });
  it('finds tasks completed on a given day', () => {
    expect(completedOn(tasks, '2026-03-02').map((t) => t.id)).toEqual(['3']);
  });
});

describe('filters', () => {
  it('filters by category ("All" shows everything)', () => {
    expect(applyFilters(tasks, { category: 'Teaching', importance: 'All', search: '' }).map((t) => t.id)).toEqual(['2', '3']);
    expect(applyFilters(tasks, { category: 'All', importance: 'All', search: '' })).toHaveLength(5);
  });
  it('filters by importance and search (title, description, notes)', () => {
    expect(applyFilters(tasks, { category: 'All', importance: 'High', search: '' }).map((t) => t.id)).toEqual(['1']);
    expect(applyFilters(tasks, { category: 'All', importance: 'All', search: 'SUPERVISOR' }).map((t) => t.id)).toEqual(['5']);
  });
});

describe('dashboard stats', () => {
  it('counts active, due today, overdue, high priority, completed and per category', () => {
    const s = computeStats(tasks, NOW);
    expect(s).toMatchObject({ active: 3, dueToday: 1, overdue: 1, highPriority: 1, completed: 2 });
    expect(Object.keys(s.byCategory)).toEqual([...CATEGORIES]);
    expect(s.byCategory.Thesis).toBe(1);
    expect(s.byCategory.Teaching).toBe(1);
    expect(s.byCategory.Proposal).toBe(0);
  });
});

describe('kanban moves', () => {
  it('sets status and completedAt when dropped on Completed, clears it when moved back', () => {
    const done = moveToStatus(makeTask(), 'Completed', NOW);
    expect(done).toEqual({ status: 'Completed', completedAt: NOW.toISOString() });
    expect(moveToStatus(makeTask({ status: 'Completed' }), 'In Progress', NOW)).toEqual({ status: 'In Progress', completedAt: null });
    expect(moveToStatus(makeTask(), 'To Do', NOW)).toBeNull();
  });
});
