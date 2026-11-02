import { useState, type FormEvent, type ReactNode } from 'react';
import { CATEGORIES, IMPORTANCE_LEVELS, STATUSES, type Category, type Task, type TaskInput } from '../types/task';
import { emptyTaskInput } from '../utils/taskFactory';
import { Modal, btn, inputCls } from './Modal';

type FormState = Omit<TaskInput, 'category' | 'durationMinutes'> & { category: Category | ''; durationMinutes: string };

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

export function TaskFormModal({
  task,
  onSave,
  onClose,
}: {
  task: Task | null; // null = create
  onSave: (input: TaskInput) => Promise<boolean>;
  onClose: () => void;
}) {
  const initial = task ?? emptyTaskInput();
  const [f, setF] = useState<FormState>({
    title: initial.title,
    description: initial.description,
    category: task ? task.category : '', // mandatory explicit choice for new tasks
    startDate: initial.startDate,
    deadline: initial.deadline,
    importance: initial.importance,
    durationMinutes: initial.durationMinutes != null ? String(initial.durationMinutes) : '',
    status: initial.status,
    notes: initial.notes,
    urgencyOverride: initial.urgencyOverride,
    importanceOverride: initial.importanceOverride,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!f.title.trim()) errs.title = 'Title is required.';
    if (!f.category) errs.category = 'Please choose a category.';
    const dur = f.durationMinutes === '' ? null : Number(f.durationMinutes);
    if (dur != null && (!Number.isInteger(dur) || dur < 0 || dur > 10000)) errs.durationMinutes = 'Enter whole minutes (0–10000).';
    if (f.startDate && f.deadline && f.startDate > f.deadline) errs.deadline = 'Deadline is before the start date.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const ok = await onSave({ ...f, title: f.title.trim(), category: f.category as Category, durationMinutes: dur });
    setSaving(false);
    if (ok) onClose();
  };

  const err = (k: string) => errors[k] && <span className="mt-1 block text-xs text-red-600">{errors[k]}</span>;

  return (
    <Modal
      title={task ? 'Edit task' : 'Add task'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
          <button type="submit" form="task-form" className={btn.primary} disabled={saving}>
            {saving ? 'Saving…' : task ? 'Save changes' : 'Add task'}
          </button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-2">
          <Field label="Title" required>
            <input autoFocus className={inputCls} value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={300} placeholder="e.g. Revise Chapter 3" />
          </Field>
          {err('title')}
        </div>
        <div className="sm:col-span-2">
          <Field label="Description">
            <textarea className={inputCls} rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
        </div>
        <div>
          <Field label="Category" required>
            <select className={inputCls} value={f.category} onChange={(e) => set('category', e.target.value as Category)}>
              <option value="" disabled>Select a category…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          {err('category')}
        </div>
        <Field label="Status">
          <select className={inputCls} value={f.status} onChange={(e) => set('status', e.target.value as Task['status'])}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Start date">
          <input type="date" className={inputCls} value={f.startDate ?? ''} onChange={(e) => set('startDate', e.target.value || null)} />
        </Field>
        <div>
          <Field label="Deadline">
            <input type="date" className={inputCls} value={f.deadline ?? ''} onChange={(e) => set('deadline', e.target.value || null)} />
          </Field>
          {err('deadline')}
        </div>
        <Field label="Importance">
          <select className={inputCls} value={f.importance} onChange={(e) => set('importance', e.target.value as Task['importance'])}>
            {IMPORTANCE_LEVELS.map((i) => <option key={i}>{i}</option>)}
          </select>
        </Field>
        <div>
          <Field label="Estimated duration (minutes)">
            <input type="number" min={0} step={5} inputMode="numeric" className={inputCls} value={f.durationMinutes} onChange={(e) => set('durationMinutes', e.target.value)} />
          </Field>
          {err('durationMinutes')}
        </div>
        <div className="sm:col-span-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-medium text-slate-600">Eisenhower overrides <span className="font-normal text-slate-400">(leave on Automatic to use the rules)</span></p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Urgency" hint="Auto: overdue or due within 2 days = urgent">
              <select className={inputCls} value={f.urgencyOverride ?? ''} onChange={(e) => set('urgencyOverride', (e.target.value || null) as Task['urgencyOverride'])}>
                <option value="">Automatic</option>
                <option value="urgent">Always urgent</option>
                <option value="not_urgent">Never urgent</option>
              </select>
            </Field>
            <Field label="Importance (matrix)" hint="Auto: High importance = important">
              <select className={inputCls} value={f.importanceOverride ?? ''} onChange={(e) => set('importanceOverride', (e.target.value || null) as Task['importanceOverride'])}>
                <option value="">Automatic</option>
                <option value="important">Important</option>
                <option value="not_important">Not important</option>
              </select>
            </Field>
          </div>
        </div>
        <div className="sm:col-span-2">
          <Field label="Notes">
            <textarea className={inputCls} rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
