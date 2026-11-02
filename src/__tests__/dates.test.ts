import { describe, expect, it } from 'vitest';
import { daysUntil, isDueToday, isOverdue, isValidISODate, todayISO } from '../utils/dates';
import { makeTask, NOW } from './fixtures';

describe('overdue detection', () => {
  it('flags tasks whose deadline is before today', () => {
    expect(isOverdue(makeTask({ deadline: '2026-03-01' }), NOW)).toBe(true);
  });
  it('does not flag tasks due today or later', () => {
    expect(isOverdue(makeTask({ deadline: '2026-03-02' }), NOW)).toBe(false);
    expect(isOverdue(makeTask({ deadline: '2026-03-10' }), NOW)).toBe(false);
  });
  it('does not flag tasks without a deadline', () => {
    expect(isOverdue(makeTask({ deadline: null }), NOW)).toBe(false);
  });
  it('does not flag completed tasks', () => {
    expect(isOverdue(makeTask({ deadline: '2026-01-01', status: 'Completed' }), NOW)).toBe(false);
  });
  it('detects tasks due today', () => {
    expect(isDueToday(makeTask({ deadline: '2026-03-02' }), NOW)).toBe(true);
  });
  it('computes day differences in local time', () => {
    expect(todayISO(NOW)).toBe('2026-03-02');
    expect(daysUntil('2026-03-09', NOW)).toBe(7);
    expect(daysUntil('2026-02-28', NOW)).toBe(-2);
  });
  it('validates ISO dates', () => {
    expect(isValidISODate('2026-02-28')).toBe(true);
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('02/03/2026')).toBe(false);
  });
});
