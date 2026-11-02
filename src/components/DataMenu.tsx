import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import type { Task } from '../types/task';
import { buildExport, parseImportText } from '../utils/validation';
import { Modal, btn } from './Modal';

export function exportTasks(tasks: Task[]) {
  const blob = new Blob([JSON.stringify(buildExport(tasks), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tasks-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DataMenu({ tasks, onImport }: { tasks: Task[]; onImport: (tasks: Task[]) => Promise<boolean> }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ tasks: Task[]; errors: string[]; name: string } | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5_000_000) return setPreview({ tasks: [], errors: ['File is larger than 5 MB.'], name: file.name });
    const res = parseImportText(await file.text());
    setPreview({ ...res, name: file.name });
    if (input.current) input.current.value = '';
  };

  return (
    <>
      <button className={btn.ghost} onClick={() => exportTasks(tasks)} title="Export all tasks to JSON (backup)" aria-label="Export tasks">
        <Download size={18} />
      </button>
      <button className={btn.ghost} onClick={() => input.current?.click()} title="Import tasks from JSON" aria-label="Import tasks">
        <Upload size={18} />
      </button>
      <input ref={input} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      {preview && (
        <Modal
          title="Import tasks"
          onClose={() => setPreview(null)}
          size="sm"
          footer={
            <>
              <button className={btn.secondary} onClick={() => setPreview(null)}>Cancel</button>
              {preview.errors.length === 0 && (
                <button className={btn.primary} onClick={async () => (await onImport(preview.tasks)) && setPreview(null)}>
                  Import {preview.tasks.length} task(s)
                </button>
              )}
            </>
          }
        >
          {preview.errors.length ? (
            <div className="text-sm">
              <p className="mb-2 font-medium text-red-700">“{preview.name}” can’t be imported:</p>
              <ul className="max-h-60 list-disc space-y-1 overflow-y-auto pl-5 text-red-600">
                {preview.errors.slice(0, 50).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
              {preview.errors.length > 50 && <p className="mt-2 text-slate-500">…and {preview.errors.length - 50} more.</p>}
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              “{preview.name}” contains <b>{preview.tasks.length}</b> valid task(s). Tasks with the same ID will be updated; others will be added. Existing tasks are not deleted.
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
