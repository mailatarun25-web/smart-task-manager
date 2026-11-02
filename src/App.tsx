import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, CheckSquare, Grid2x2, Kanban, Loader2, LogOut, Plus, RefreshCw, Sparkles } from 'lucide-react';
import type { Task, TaskFilters } from './types/task';
import { DEFAULT_FILTERS } from './types/task';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { useAuth } from './hooks/useAuth';
import { useTasks } from './hooks/useTasks';
import type { TaskRepository } from './services/taskRepository';
import { SupabaseTaskRepository } from './services/supabaseRepository';
import { LOCAL_KEY, LocalTaskRepository } from './services/localRepository';
import { applyFilters } from './utils/taskFilters';
import { sampleTaskInputs } from './utils/sampleTasks';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import { FilterBar } from './components/FilterBar';
import { TaskFormModal } from './components/TaskFormModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DataMenu } from './components/DataMenu';
import { SyncIndicator } from './components/SyncIndicator';
import { Toast } from './components/Toast';
import { Modal, btn, inputCls } from './components/Modal';
import type { TaskCardActions } from './components/TaskCard';
import { KanbanPage } from './pages/KanbanPage';
import { MatrixPage } from './pages/MatrixPage';
import { TodayPage } from './pages/TodayPage';

type Tab = 'kanban' | 'matrix' | 'today';
const TABS: { id: Tab; label: string; icon: typeof Kanban }[] = [
  { id: 'kanban', label: 'Kanban Board', icon: Kanban },
  { id: 'matrix', label: 'Eisenhower Matrix', icon: Grid2x2 },
  { id: 'today', label: 'Today Planner', icon: CalendarCheck2 },
];
const TAB_KEY = 'smart-tasks:tab';
const cacheKeyFor = (userId: string) => `smart-tasks:cache:${userId}`;

function FullScreenLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-slate-500">
      <Loader2 size={18} className="animate-spin" /> {label}
    </div>
  );
}

export default function App() {
  return isSupabaseConfigured ? <CloudApp /> : <LocalApp />;
}

/** Fallback when no Supabase env vars are set: everything stays in this browser. */
function LocalApp() {
  const repo = useMemo(() => new LocalTaskRepository(), []);
  return <Workspace repo={repo} cacheKey={LOCAL_KEY} />;
}

function CloudApp() {
  const auth = useAuth();
  const userId = auth.user?.id;
  const repo = useMemo(() => (userId ? new SupabaseTaskRepository(supabase!, userId) : null), [userId]);

  if (auth.loading) return <FullScreenLoader label="Checking your session…" />;
  if (!auth.user || !repo)
    return <AuthScreen onSignIn={auth.signIn} onSignUp={auth.signUp} onReset={auth.resetPassword} />;

  return (
    <>
      <Workspace
        key={auth.user.id}
        repo={repo}
        cacheKey={cacheKeyFor(auth.user.id)}
        userEmail={auth.user.email ?? ''}
        onSignOut={async () => {
          localStorage.removeItem(cacheKeyFor(auth.user!.id));
          await auth.signOut();
        }}
      />
      {auth.recovering && <SetPasswordModal onSave={auth.updatePassword} />}
    </>
  );
}

function SetPasswordModal({ onSave }: { onSave: (pw: string) => Promise<void> }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  return (
    <Modal
      title="Choose a new password"
      onClose={() => {}}
      size="sm"
      footer={
        <button
          className={btn.primary}
          onClick={async () => {
            if (pw.length < 8) return setErr('Password must be at least 8 characters.');
            try {
              await onSave(pw);
            } catch (e) {
              setErr((e as Error).message);
            }
          }}
        >
          Save password
        </button>
      }
    >
      <input type="password" autoComplete="new-password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" />
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
    </Modal>
  );
}

function Workspace({
  repo,
  cacheKey,
  userEmail,
  onSignOut,
}: {
  repo: TaskRepository;
  cacheKey: string;
  userEmail?: string;
  onSignOut?: () => void;
}) {
  const store = useTasks(repo, cacheKey);
  const [tab, setTab] = useState<Tab>(() => {
    try {
      return (localStorage.getItem(TAB_KEY) as Tab) || 'kanban';
    } catch {
      return 'kanban';
    }
  });
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS);
  const [editing, setEditing] = useState<Task | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(TAB_KEY, tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  // Local mode: seed realistic example tasks on the very first run.
  useEffect(() => {
    if (repo.mode !== 'local' || store.loading) return;
    if (localStorage.getItem('smart-tasks:seeded')) return;
    localStorage.setItem('smart-tasks:seeded', '1');
    if (store.tasks.length === 0) void store.addTasks(sampleTaskInputs());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo.mode, store.loading]);

  // Every view uses the same task list; each tab applies the filters it supports.
  const effective: TaskFilters =
    tab === 'kanban' ? filters : tab === 'matrix' ? { ...filters, importance: 'All' } : { ...filters, importance: 'All', search: '' };
  const visible = useMemo(() => applyFilters(store.tasks, effective), [store.tasks, effective.category, effective.importance, effective.search]); // eslint-disable-line react-hooks/exhaustive-deps

  const cardActions: TaskCardActions = useMemo(
    () => ({
      onEdit: (t) => setEditing(t),
      onDelete: (t) => setDeleting(t),
      onToggleComplete: (t) => void store.toggleComplete(t.id),
    }),
    [store.toggleComplete], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const onSave = useCallback(
    (input: Parameters<typeof store.addTask>[0]) =>
      editing && editing !== 'new' ? store.updateTask(editing.id, input, 'Task updated') : store.addTask(input),
    [editing, store],
  );

  const showBlockingError = store.loadError && store.tasks.length === 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-indigo-600 p-1.5 text-white"><CheckSquare size={18} /></span>
            <h1 className="hidden text-base font-semibold text-slate-900 sm:block">Smart Tasks</h1>
          </div>
          <SyncIndicator state={store.sync} mode={repo.mode} onRetry={store.refresh} />
          <div className="ml-auto flex items-center gap-1">
            <DataMenu tasks={store.tasks} onImport={store.importTasks} />
            {onSignOut && (
              <button className={btn.ghost} onClick={onSignOut} title={`Sign out ${userEmail}`} aria-label="Sign out">
                <LogOut size={18} />
              </button>
            )}
            <button className={`${btn.primary} ml-1`} onClick={() => setEditing('new')}>
              <Plus size={16} /> <span className="hidden sm:inline">Add Task</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5">
        {store.loadError && !showBlockingError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            <span>Showing your last saved copy — {store.loadError}</span>
            <button className="inline-flex items-center gap-1 font-medium hover:underline" onClick={store.refresh}><RefreshCw size={14} /> Retry</button>
          </div>
        )}

        {store.loading && store.tasks.length === 0 ? (
          <FullScreenLoader label="Loading your tasks…" />
        ) : showBlockingError ? (
          <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
            <p className="font-medium text-red-700">Couldn’t load your tasks</p>
            <p className="mt-1 text-sm text-slate-500">{store.loadError}</p>
            <button className={`${btn.primary} mt-4`} onClick={store.refresh}><RefreshCw size={15} /> Try again</button>
          </div>
        ) : (
          <>
            <Dashboard tasks={store.tasks} selectedCategory={filters.category} onSelectCategory={(category) => setFilters((f) => ({ ...f, category }))} />

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <nav className="flex rounded-2xl bg-slate-200/60 p-1" role="tablist">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition lg:flex-none ${
                      tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon size={16} /> <span className="text-xs sm:text-sm">{label}</span>
                  </button>
                ))}
              </nav>
              <FilterBar filters={filters} onChange={setFilters} showImportance={tab === 'kanban'} showSearch={tab !== 'today'} />
            </div>

            {store.tasks.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="font-medium text-slate-700">No tasks yet</p>
                <p className="mt-1 text-sm text-slate-500">Add your first task, or load a set of realistic examples to explore the app.</p>
                <div className="mt-4 flex justify-center gap-2">
                  <button className={btn.primary} onClick={() => setEditing('new')}><Plus size={15} /> Add Task</button>
                  <button className={btn.secondary} onClick={() => store.addTasks(sampleTaskInputs(), 'Example tasks added')}><Sparkles size={15} /> Load examples</button>
                </div>
              </div>
            )}

            {tab === 'kanban' && <KanbanPage tasks={visible} actions={cardActions} onMove={store.setStatus} />}
            {tab === 'matrix' && <MatrixPage tasks={visible} actions={cardActions} />}
            {tab === 'today' && (
              <TodayPage tasks={visible} actions={cardActions} plan={{ addToPlan: store.addToPlan, removeFromPlan: store.removeFromPlan, movePlanned: store.movePlanned }} />
            )}
          </>
        )}
      </main>

      {editing && <TaskFormModal task={editing === 'new' ? null : editing} onSave={onSave} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog
          title="Delete task?"
          message={`“${deleting.title}” will be permanently deleted${repo.mode === 'cloud' ? ' on all your devices' : ''}. This cannot be undone.`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            void store.deleteTask(deleting.id);
            setDeleting(null);
          }}
        />
      )}
      <Toast notice={store.notice} onClose={store.dismissNotice} />
    </div>
  );
}
