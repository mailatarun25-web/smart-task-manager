/**
 * ─────────────────────────────────────────────────────────────────────────
 *  AUTOMATIC PRIORITY SCORING  (transparent, rule-based, 0–100)
 * ─────────────────────────────────────────────────────────────────────────
 *  Score = importance (max 40) + deadline urgency (max 35)
 *        + duration (max 15)   + status/actionability (max 10)
 *
 *  To change how tasks are ranked, edit PRIORITY_WEIGHTS below. Each table
 *  maps a condition to points. Keep each component ≤ its `max` so the total
 *  stays within 0–100 (the final score is clamped anyway).
 * ─────────────────────────────────────────────────────────────────────────
 */
import type { Task } from '../types/task';
import { daysUntil } from './dates';

export const PRIORITY_WEIGHTS = {
  importance: {
    max: 40,
    High: 40,
    Medium: 24,
    Low: 8,
  },
  deadline: {
    max: 35,
    overdue: 35,
    dueToday: 32,
    /** Deadline within N days → points. Checked in order; first match wins. */
    withinDays: [
      { days: 1, points: 28 },
      { days: 2, points: 24 },
      { days: 7, points: 16 },
      { days: 14, points: 10 },
    ],
    later: 5,
    noDeadline: 0,
    /** Minimum deadline points when the user manually marks a task "urgent". */
    manualUrgentMinimum: 24,
  },
  duration: {
    max: 15,
    /** Shorter tasks get a modest boost ("quick wins"). First match wins. */
    upToMinutes: [
      { minutes: 15, points: 15 },
      { minutes: 30, points: 12 },
      { minutes: 60, points: 9 },
      { minutes: 120, points: 6 },
      { minutes: 240, points: 3 },
    ],
    longer: 1,
    unknown: 5,
  },
  status: {
    max: 10,
    'In Progress': 10, // already started → keep momentum
    'To Do': 8,
    Waiting: 0, // blocked on someone else → not actionable
    Completed: 0,
  },
} as const;

export interface PriorityResult {
  score: number;
  breakdown: { importance: number; deadline: number; duration: number; status: number };
  /** Short human-readable explanation, e.g. "High importance (+40) · Due tomorrow (+28)". */
  explanation: string;
  reasons: string[];
}

export function calculatePriority(task: Task, now: Date = new Date()): PriorityResult {
  const W = PRIORITY_WEIGHTS;
  const reasons: string[] = [];

  if (task.status === 'Completed') {
    return {
      score: 0,
      breakdown: { importance: 0, deadline: 0, duration: 0, status: 0 },
      explanation: 'Completed',
      reasons: ['Completed'],
    };
  }

  // 1. Importance
  const importance = W.importance[task.importance];
  reasons.push(`${task.importance} importance (+${importance})`);

  // 2. Deadline urgency
  let deadline: number = W.deadline.noDeadline;
  if (task.deadline) {
    const days = daysUntil(task.deadline, now);
    if (days < 0) {
      deadline = W.deadline.overdue;
      reasons.push(`Overdue (+${deadline})`);
    } else if (days === 0) {
      deadline = W.deadline.dueToday;
      reasons.push(`Due today (+${deadline})`);
    } else {
      const band = W.deadline.withinDays.find((b) => days <= b.days);
      deadline = band ? band.points : W.deadline.later;
      reasons.push(`Due in ${days} day${days === 1 ? '' : 's'} (+${deadline})`);
    }
  } else {
    reasons.push('No deadline (+0)');
  }
  if (task.urgencyOverride === 'urgent' && deadline < W.deadline.manualUrgentMinimum) {
    deadline = W.deadline.manualUrgentMinimum;
    reasons.push(`Marked urgent (deadline score raised to ${deadline})`);
  }

  // 3. Duration (short tasks get a modest preference)
  let duration: number = W.duration.unknown;
  if (task.durationMinutes && task.durationMinutes > 0) {
    const band = W.duration.upToMinutes.find((b) => task.durationMinutes! <= b.minutes);
    duration = band ? band.points : W.duration.longer;
    reasons.push(`${task.durationMinutes} min task (+${duration})`);
  } else {
    reasons.push(`No estimate (+${duration})`);
  }

  // 4. Status / actionability
  const status = W.status[task.status];
  reasons.push(task.status === 'Waiting' ? 'Waiting on others (+0)' : `${task.status} (+${status})`);

  const score = Math.max(0, Math.min(100, Math.round(importance + deadline + duration + status)));
  return {
    score,
    breakdown: { importance, deadline, duration, status },
    reasons,
    explanation: reasons.join(' · '),
  };
}

/** Actionable = not completed and not waiting on someone else. */
export function isActionable(task: Task): boolean {
  return task.status !== 'Completed' && task.status !== 'Waiting';
}

/** Actionable tasks sorted from highest to lowest priority (ties: earlier deadline, shorter task). */
export function rankTasks(tasks: Task[], now: Date = new Date()): Array<Task & { priority: PriorityResult }> {
  return tasks
    .filter(isActionable)
    .map((t) => ({ ...t, priority: calculatePriority(t, now) }))
    .sort(
      (a, b) =>
        b.priority.score - a.priority.score ||
        (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999') ||
        (a.durationMinutes ?? 9999) - (b.durationMinutes ?? 9999),
    );
}
