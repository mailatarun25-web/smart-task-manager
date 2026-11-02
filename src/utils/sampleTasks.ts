import type { TaskInput } from '../types/task';
import { addDays } from './dates';

/** Realistic example tasks with deadlines relative to today. */
export function sampleTaskInputs(now: Date = new Date()): TaskInput[] {
  const d = (n: number) => addDays(now, n);
  const base = { notes: '', urgencyOverride: null, importanceOverride: null, startDate: null } as const;
  return [
    { ...base, title: 'Revise Chapter 3 – methodology', description: 'Address supervisor comments on sampling and validity.', category: 'Thesis', deadline: d(1), importance: 'High', durationMinutes: 180, status: 'In Progress', startDate: d(-3) },
    { ...base, title: 'Submit camera-ready paper to conference', description: 'Final formatting + copyright form.', category: 'Publication', deadline: d(-1), importance: 'High', durationMinutes: 90, status: 'To Do' },
    { ...base, title: 'Grade Week 6 lab reports', description: '32 reports, use rubric v2.', category: 'Teaching', deadline: d(2), importance: 'Medium', durationMinutes: 150, status: 'To Do' },
    { ...base, title: 'Reply to ethics committee email', description: 'Confirm amended consent form.', category: 'Administration', deadline: d(0), importance: 'Medium', durationMinutes: 15, status: 'To Do' },
    { ...base, title: 'Draft budget section for grant proposal', description: 'Personnel, equipment and travel justification.', category: 'Proposal', deadline: d(12), importance: 'High', durationMinutes: 120, status: 'To Do' },
    { ...base, title: 'Run pilot survey analysis', description: 'Descriptives + reliability (Cronbach α).', category: 'Research', deadline: d(6), importance: 'High', durationMinutes: 60, status: 'To Do' },
    { ...base, title: 'Waiting for co-author feedback on Section 4', description: 'Sent draft on Monday.', category: 'Publication', deadline: d(4), importance: 'Medium', durationMinutes: 30, status: 'Waiting', notes: 'Follow up Thursday if no reply.' },
    { ...base, title: 'Update project dashboard prototype', description: 'Add filtering to the results table.', category: 'Project', deadline: d(9), importance: 'Medium', durationMinutes: 45, status: 'In Progress' },
    { ...base, title: 'Book dentist appointment', description: '', category: 'Personal', deadline: null, importance: 'Low', durationMinutes: 10, status: 'To Do' },
    { ...base, title: 'Read 3 papers for literature review', description: 'Focus on 2023–2025 meta-analyses.', category: 'Research', deadline: null, importance: 'Medium', durationMinutes: 90, status: 'To Do' },
    { ...base, title: 'Submit travel reimbursement', description: 'Receipts from workshop trip.', category: 'Administration', deadline: d(20), importance: 'Low', durationMinutes: 20, status: 'To Do' },
    { ...base, title: 'Prepare slides for Thursday lecture', description: 'Topic: experimental design.', category: 'Teaching', deadline: d(3), importance: 'High', durationMinutes: 120, status: 'To Do' },
    { ...base, title: 'Send thesis outline to committee', description: '', category: 'Thesis', deadline: d(-5), importance: 'High', durationMinutes: 20, status: 'Completed' },
  ];
}
