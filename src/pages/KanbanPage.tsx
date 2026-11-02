import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { STATUSES, type Status, type Task } from '../types/task';
import { TaskCard, type TaskCardActions } from '../components/TaskCard';
import { calculatePriority } from '../utils/priority';
import { formatDuration } from '../utils/dates';

const COLUMN_STYLE: Record<Status, string> = {
  'To Do': 'bg-slate-400',
  'In Progress': 'bg-indigo-500',
  Waiting: 'bg-purple-500',
  Completed: 'bg-emerald-500',
};

function DraggableCard({ task, actions }: { task: Task; actions: TaskCardActions }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={`touch-manipulation cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}>
      <TaskCard task={task} actions={actions} />
    </div>
  );
}

function Column({ status, tasks, actions }: { status: Status; tasks: Task[]; actions: TaskCardActions }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const minutes = tasks.reduce((s, t) => s + (t.durationMinutes ?? 0), 0);
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-48 flex-col rounded-2xl border p-3 transition ${isOver ? 'border-indigo-300 bg-indigo-50/60' : 'border-slate-200 bg-slate-100/60'}`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${COLUMN_STYLE[status]}`} />
          <h3 className="text-sm font-semibold text-slate-700">{status}</h3>
          <span className="rounded-full bg-white px-2 text-xs font-medium text-slate-500 ring-1 ring-slate-200">{tasks.length}</span>
        </div>
        {status !== 'Completed' && minutes > 0 && <span className="text-[11px] text-slate-400">{formatDuration(minutes)}</span>}
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {tasks.map((t) => <DraggableCard key={t.id} task={t} actions={actions} />)}
        {tasks.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-xs text-slate-400">Drop tasks here</p>}
      </div>
    </div>
  );
}

export function KanbanPage({
  tasks,
  actions,
  onMove,
}: {
  tasks: Task[];
  actions: TaskCardActions;
  onMove: (id: string, status: Status) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const columns = useMemo(() => {
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, [] as Task[]])) as Record<Status, Task[]>;
    for (const t of tasks) byStatus[t.status].push(t);
    for (const s of STATUSES) {
      if (s === 'Completed') byStatus[s].sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
      else byStatus[s].sort((a, b) => calculatePriority(b).score - calculatePriority(a).score);
    }
    return byStatus;
  }, [tasks]);

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const target = e.over?.id as Status | undefined;
    if (target && STATUSES.includes(target)) onMove(String(e.active.id), target);
  };

  const active = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STATUSES.map((s) => <Column key={s} status={s} tasks={columns[s]} actions={actions} />)}
      </div>
      <DragOverlay>{active ? <TaskCard task={active} actions={actions} dragging /> : null}</DragOverlay>
    </DndContext>
  );
}
