import { describe, expect, it } from 'vitest';
import { calculatePriority, isActionable, PRIORITY_WEIGHTS, rankTasks } from '../utils/priority';
import { makeTask, NOW } from './fixtures';

describe('priority scoring', () => {
  it('keeps every component within its maximum and the total within 0–100', () => {
    const t = makeTask({ importance: 'High', deadline: '2026-02-01', durationMinutes: 5, status: 'In Progress' });
    const p = calculatePriority(t, NOW);
    expect(p.breakdown.importance).toBeLessThanOrEqual(PRIORITY_WEIGHTS.importance.max);
    expect(p.breakdown.deadline).toBeLessThanOrEqual(PRIORITY_WEIGHTS.deadline.max);
    expect(p.breakdown.duration).toBeLessThanOrEqual(PRIORITY_WEIGHTS.duration.max);
    expect(p.breakdown.status).toBeLessThanOrEqual(PRIORITY_WEIGHTS.status.max);
    expect(p.score).toBe(100);
  });

  it('scores importance High > Medium > Low', () => {
    const s = (importance: 'High' | 'Medium' | 'Low') => calculatePriority(makeTask({ importance }), NOW).score;
    expect(s('High')).toBeGreaterThan(s('Medium'));
    expect(s('Medium')).toBeGreaterThan(s('Low'));
  });

  it('scores overdue > due today > due soon > later > no deadline', () => {
    const s = (deadline: string | null) => calculatePriority(makeTask({ deadline }), NOW).breakdown.deadline;
    expect(s('2026-03-01')).toBe(35);
    expect(s('2026-03-02')).toBe(32);
    expect(s('2026-03-03')).toBe(28);
    expect(s('2026-03-04')).toBe(24);
    expect(s('2026-03-08')).toBe(16);
    expect(s('2026-06-01')).toBe(5);
    expect(s(null)).toBe(0);
  });

  it('gives short tasks a modest preference when everything else is equal', () => {
    const short = calculatePriority(makeTask({ durationMinutes: 15 }), NOW).score;
    const long = calculatePriority(makeTask({ durationMinutes: 300 }), NOW).score;
    expect(short).toBeGreaterThan(long);
    expect(short - long).toBeLessThanOrEqual(PRIORITY_WEIGHTS.duration.max);
  });

  it('gives waiting tasks 0 status points and excludes them from recommendations', () => {
    const waiting = makeTask({ id: 'a', status: 'Waiting', importance: 'High', deadline: '2026-03-01' });
    const todo = makeTask({ id: 'b', status: 'To Do', importance: 'Low' });
    expect(calculatePriority(waiting, NOW).breakdown.status).toBe(0);
    expect(isActionable(waiting)).toBe(false);
    expect(rankTasks([waiting, todo], NOW).map((t) => t.id)).toEqual(['b']);
  });

  it('raises the deadline score for tasks manually marked urgent', () => {
    const p = calculatePriority(makeTask({ urgencyOverride: 'urgent' }), NOW);
    expect(p.breakdown.deadline).toBe(PRIORITY_WEIGHTS.deadline.manualUrgentMinimum);
  });

  it('returns 0 for completed tasks', () => {
    expect(calculatePriority(makeTask({ status: 'Completed' }), NOW).score).toBe(0);
  });

  it('sorts actionable tasks from highest to lowest score', () => {
    const tasks = [
      makeTask({ id: 'low', importance: 'Low' }),
      makeTask({ id: 'high', importance: 'High', deadline: '2026-03-02' }),
      makeTask({ id: 'mid', importance: 'Medium', deadline: '2026-03-05' }),
      makeTask({ id: 'done', status: 'Completed', importance: 'High' }),
    ];
    expect(rankTasks(tasks, NOW).map((t) => t.id)).toEqual(['high', 'mid', 'low']);
  });

  it('produces a readable explanation', () => {
    const p = calculatePriority(makeTask({ importance: 'High', deadline: '2026-03-03' }), NOW);
    expect(p.explanation).toContain('High importance (+40)');
    expect(p.explanation).toContain('Due in 1 day (+28)');
  });
});
