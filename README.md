# Smart Tasks

A lightweight personal task manager with four parts: a **Kanban board**, an **Eisenhower matrix**, **automatic priority scoring** and a **Today planner**. Your tasks stay in sync between your PCs through Supabase.

- React 19 + TypeScript + Tailwind CSS 4 + Vite
- Supabase PostgreSQL (database), Supabase Auth (email + password), Supabase Realtime (live sync)
- Row Level Security (RLS) means each user can only see and change their own tasks
- Free hosting on GitHub Pages: the two PCs only need a web browser

---

## Architecture

```
src/
├── types/task.ts              Data model: the 8 fixed categories, importance levels, statuses
├── lib/supabase.ts            Supabase client (reads only the public env vars)
├── services/
│   ├── taskRepository.ts      Storage interface the app talks to
│   ├── supabaseRepository.ts  Cloud storage + Realtime subscription
│   ├── localRepository.ts     LocalStorage fallback (used when Supabase isn't configured)
│   └── taskMapper.ts          camelCase Task ⇄ snake_case database row
├── hooks/
│   ├── useAuth.ts             Sign in / sign up / reset password / sign out
│   └── useTasks.ts            The single task store: optimistic writes, Realtime, offline handling
├── utils/
│   ├── priority.ts            ★ Priority scoring rules and weights (edit this to change scoring)
│   ├── eisenhower.ts          Quadrant classification
│   ├── kanban.ts              Drag-and-drop → status change logic
│   ├── syncReducer.ts         Applies changes that arrive from the other PC
│   ├── taskFilters.ts         Filters, dashboard stats, completed-task filtering
│   ├── validation.ts          Import/export validation
│   └── dates.ts, categories.ts, taskFactory.ts, sampleTasks.ts
├── components/                TaskCard, TaskFormModal, Dashboard, FilterBar, AuthScreen, …
├── pages/                     KanbanPage, MatrixPage, TodayPage
└── App.tsx                    Login check, layout and tabs
supabase/schema.sql            Table, constraints, RLS policies, Realtime setup
tests/integration/             Live tests of auth, sync and RLS against your Supabase project
```

All three views read **one** task list from `useTasks`. When you change a task on one PC, the change is saved to Postgres. Supabase Realtime then pushes it to the other PC, and every view updates straight away. The Today plan is stored on each task (`planned_date`, `plan_order`), so it syncs too.

**Sync and errors**
- Your edits show up immediately, before the save finishes. If the save fails, the edit is undone and an error message appears.
- The header badge shows *Synced*, *Saving…*, *Connecting…*, *Offline* or *Sync paused*. Click it to retry.
- When the connection comes back (for example after the PC wakes from sleep), the app reloads all tasks so nothing is missed.
- The browser keeps a copy of the last synced tasks. They load instantly at start-up and stay visible offline, but you can't change them while offline.
- If both PCs change the *same* task at the same moment, the last save wins.

---

## 1. Set up Supabase (one time, about 10 minutes, free tier)

1. Create an account at <https://supabase.com> and click **New project**. Choose a region near you and keep the database password somewhere safe.
2. **Create the database:** open **SQL Editor → New query**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. This creates the `tasks` table, the 8-category check, the RLS policies, and turns on Realtime. You can safely run it again.
3. **Check Realtime:** under **Database → Publications → `supabase_realtime`**, `tasks` should be listed.
4. **Set up authentication:**
   - **Authentication → Sign In / Providers → Email** should be enabled (it is by default).
   - In **Authentication → URL Configuration**, set **Site URL** to your GitHub Pages address, e.g. `https://YOUR-USER.github.io/smart-task-manager/`. Add the same address under **Redirect URLs**, plus `http://localhost:5173/` if you develop locally. Confirmation and password-reset emails link to these addresses.
   - Optional: once you've created your own account, turn off **Allow new users to sign up** so nobody else can register.
5. **Copy your keys** from **Project Settings → API** (or **API Keys**):
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / publishable key** → `VITE_SUPABASE_ANON_KEY`

> 🔐 **Never use the `service_role` / secret key in this app.** It bypasses RLS, and anything in a `VITE_*` variable ends up in the public JavaScript. The anon key is meant to be public: RLS limits it to the signed-in user's own rows.

### Security checklist (Supabase dashboard)

These settings live in Supabase, not in this code, so set them yourself:

- **Turn off sign-ups once you've created your account:** **Authentication → Sign In / Providers → Allow new users to sign up: off**. Otherwise anyone who finds the public URL can create an account. They still can't see your tasks, but they could store their own data in your project.
- **Keep email confirmation on** (**Confirm email**, enabled by default).
- **Require longer passwords:** under **Authentication → Policies** (or **Providers → Email**), set the minimum password length to at least **8**, to match the app.
- **Never share** the `service_role` / secret key or the database password. The app doesn't need either of them. The build refuses to run if a secret key is placed in `VITE_SUPABASE_ANON_KEY`.
- If you ever suspect a key has leaked, rotate it under **Project Settings → API Keys**. Then update the GitHub secret and re-run the deploy workflow.

## 2. Deploy to GitHub Pages

1. Create a GitHub repository (e.g. `smart-task-manager`) and push this folder to its `main` branch.
2. In the repository, go to **Settings → Secrets and variables → Actions → New repository secret** and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
4. Push to `main`, or run the workflow from the **Actions** tab. It takes about 1–2 minutes. The app is then at `https://YOUR-USER.github.io/REPO-NAME/`.

The workflow (`.github/workflows/deploy.yml`) installs the packages, runs the tests, builds the app and publishes it. Asset paths are relative, so any repository name works.

## 3. Use it on both PCs

On **each** Windows PC, open the GitHub Pages URL in Edge or Chrome and sign in with the same email and password. Nothing needs to be installed.

- On the first PC, click **Create an account**, confirm the email, then sign in.
- To get a desktop icon, use Edge's **⋯ → Apps → Install this site as an app**, or just bookmark the page.
- If your account has no tasks yet, click **Load examples** to add realistic sample tasks.

## 4. Back up your tasks

- **Export:** click the ⬇ icon in the header. This downloads `tasks-backup-YYYY-MM-DD.json` containing all your tasks.
- **Import:** click the ⬆ icon and choose a backup file. The app checks the file first and lists any problems (unknown categories, bad dates, invalid values). Nothing is imported unless every task in the file is valid.
  - Tasks with an ID that already exists are updated. New ones are added. Nothing is deleted.
- Export regularly. Supabase's free plan does not include automatic daily backups.

## 5. Change the priority scoring

Edit `PRIORITY_WEIGHTS` at the top of [`src/utils/priority.ts`](src/utils/priority.ts). The defaults are:

| Component | Max | Default rules |
|---|---|---|
| Importance | 40 | High 40 · Medium 24 · Low 8 |
| Deadline urgency | 35 | Overdue 35 · Today 32 · ≤1 day 28 · ≤2 days 24 · ≤7 days 16 · ≤14 days 10 · later 5 · none 0. Marking a task urgent by hand gives at least 24. |
| Duration | 15 | ≤15 min 15 · ≤30 12 · ≤60 9 · ≤120 6 · ≤240 3 · longer 1 · no estimate 5 |
| Status | 10 | In Progress 10 · To Do 8 · Waiting 0 (Waiting tasks are never recommended) |

After changing a value:

1. Run `npm test`. Some tests check the default values, so update those tests to match.
2. Push to GitHub. The app redeploys automatically.

To change how many days count as "urgent" in the Eisenhower matrix (default 2), edit `URGENT_WITHIN_DAYS` in `src/utils/eisenhower.ts`.

---

## Developing locally (optional: only needed to change the code)

Install **Node.js 22 LTS** from <https://nodejs.org>. Then open PowerShell in the project folder and run:

```powershell
npm install
copy .env.example .env.local   # then edit .env.local: add your URL and anon key
npm run dev                    # then open http://localhost:5173
```

Without `.env.local`, the app runs in **Local only** mode. Tasks are stored in this browser's LocalStorage, with no login and no sync. This is a quick way to try the app.

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server (reloads as you edit) |
| `npm run build` | Type-check and build the production files into `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Unit tests: priority, Eisenhower, overdue, filters, import validation, sync, repository |
| `npm run test:integration` | Live tests against your Supabase project (see below) |

### Testing auth, sync and RLS against your project

1. In Supabase, go to **Authentication → Users → Add user** and create two test users. Tick **Auto Confirm** for each.
2. Run these commands in PowerShell, filling in your values:

```powershell
$env:SUPABASE_URL="https://xxxx.supabase.co"; $env:SUPABASE_ANON_KEY="..."
$env:TEST_USER_A_EMAIL="a@example.com"; $env:TEST_USER_A_PASSWORD="..."
$env:TEST_USER_B_EMAIL="b@example.com"; $env:TEST_USER_B_PASSWORD="..."
npm run test:integration
```

The tests check that:
- wrong passwords are rejected, and signed-out visitors can't read or write anything;
- when user A creates, edits, completes and deletes a task on "PC 1", each change reaches "PC 2" through Realtime;
- user B can't read, update, delete or forge user A's tasks;
- a task can't be handed over to another user;
- categories outside the fixed eight are rejected.

3. Delete the two test users afterwards.
