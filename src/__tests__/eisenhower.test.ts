import { describe, expect, it } from 'vitest';
import { buildMatrix, classifyTask, isImportant, isUrgent } from '../utils/eisenhower';
import { makeTask, NOW } from './fixtures';

describe('Eisenhower classification', () => {
  it('treats only High importance as important', () => {
    expect(isImportant(makeTask({ importance: 'High' }))).toBe(true);
    expect(isImportant(makeTask({ importance: 'Medium' }))).toBe(false);
    expect(isImportant(makeTask({ importance: 'Low' }))).toBe(false);
  });

  it('treats overdue and due-within-2-days as urgent', () => {
    expect(isUrgent(makeTask({ deadline: '2026-02-20' }), NOW)).toBe(true); // overdue
    expect(isUrgent(makeTask({ deadline: '2026-03-02' }), NOW)).toBe(true); // today
    expect(isUrgent(makeTask({ deadline: '2026-03-04' }), NOW)).toBe(true); // +2 days
    expect(isUrgent(makeTask({ deadline: '2026-03-05' }), NOW)).toBe(false); // +3 days
    expect(isUrgent(makeTask({ deadline: null }), NOW)).toBe(false);
  });

  it('assigns all four quadrants', () => {
    expect(classifyTask(makeTask({ importance: 'High', deadline: '2026-03-03' }), NOW)).toBe('do');
    expect(classifyTask(makeTask({ importance: 'High', deadline: '2026-04-01' }), NOW)).toBe('schedule');
    expect(classifyTask(makeTask({ importance: 'Low', deadline: '2026-03-01' }), NOW)).toBe('delegate');
    expect(classifyTask(makeTask({ importance: 'Medium' }), NOW)).toBe('later');
  });

  it('respects manual overrides', () => {
    const t = makeTask({ importance: 'Low', urgencyOverride: 'urgent', importanceOverride: 'important' });
    expect(classifyTask(t, NOW)).toBe('do');
    const u = makeTask({ importance: 'High', deadline: '2026-03-01', urgencyOverride: 'not_urgent', importanceOverride: 'not_important' });
    expect(classifyTask(u, NOW)).toBe('later');
  });

  it('excludes completed tasks from the matrix', () => {
    const m = buildMatrix(
      [makeTask({ id: 'a', importance: 'High', deadline: '2026-03-02' }), makeTask({ id: 'b', importance: 'High', deadline: '2026-03-02', status: 'Completed' })],
      NOW,
    );
    expect(m.do.map((t) => t.id)).toEqual(['a']);
    expect(Object.values(m).flat()).toHaveLength(1);
  });
});
