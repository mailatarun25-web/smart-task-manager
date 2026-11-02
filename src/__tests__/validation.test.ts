import { describe, expect, it } from 'vitest';
import { buildExport, parseImportText, validateImport } from '../utils/validation';
import { makeTask } from './fixtures';

describe('import validation', () => {
  it('round-trips an export', () => {
    const tasks = [makeTask({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }), makeTask({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', title: 'Second' })];
    const res = parseImportText(JSON.stringify(buildExport(tasks)));
    expect(res.errors).toEqual([]);
    expect(res.tasks.map((t) => t.id)).toEqual(tasks.map((t) => t.id));
  });

  it('accepts a bare array', () => {
    expect(validateImport([makeTask()]).tasks).toHaveLength(1);
  });

  it('rejects invalid JSON and wrong shapes', () => {
    expect(parseImportText('{oops').errors[0]).toMatch(/not valid JSON/);
    expect(validateImport({ foo: 1 }).errors[0]).toMatch(/tasks/);
    expect(validateImport('hello').errors).toHaveLength(1);
  });

  it('rejects unknown categories, importance, status, bad dates and durations', () => {
    const res = validateImport([
      { ...makeTask(), category: 'Hobby' },
      { ...makeTask(), importance: 'Urgent' },
      { ...makeTask(), status: 'Done' },
      { ...makeTask(), deadline: '31/12/2026' },
      { ...makeTask(), durationMinutes: -5 },
      { ...makeTask(), title: '   ' },
    ]);
    expect(res.tasks).toEqual([]);
    expect(res.errors.join('\n')).toMatch(/category/);
    expect(res.errors.join('\n')).toMatch(/importance/);
    expect(res.errors.join('\n')).toMatch(/status/);
    expect(res.errors.join('\n')).toMatch(/deadline/);
    expect(res.errors.join('\n')).toMatch(/durationMinutes/);
    expect(res.errors.join('\n')).toMatch(/title/);
  });

  it('is all-or-nothing: one bad task blocks the import', () => {
    const res = validateImport([makeTask(), { ...makeTask(), category: 'Nope' }]);
    expect(res.tasks).toEqual([]);
    expect(res.errors).toHaveLength(1);
  });

  it('generates ids for missing/invalid/duplicate ids and fills defaults', () => {
    const res = validateImport([
      { title: 'Minimal', category: 'Personal', importance: 'Low', status: 'To Do' },
      { title: 'Dup 1', category: 'Personal', importance: 'Low', status: 'To Do', id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
      { title: 'Dup 2', category: 'Personal', importance: 'Low', status: 'Completed', id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    ]);
    expect(res.errors).toEqual([]);
    expect(new Set(res.tasks.map((t) => t.id)).size).toBe(3);
    expect(res.tasks[0]).toMatchObject({ description: '', notes: '', deadline: null, durationMinutes: null });
    expect(res.tasks[2].completedAt).not.toBeNull();
  });
});
