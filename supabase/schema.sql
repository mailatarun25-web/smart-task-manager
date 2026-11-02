-- ═══════════════════════════════════════════════════════════════════════
--  Smart Task Manager — Supabase schema
--  Run once in: Supabase Dashboard → SQL Editor → New query → Run.
--  Safe to re-run (idempotent).
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid()
                        references auth.users (id) on delete cascade,
  title               text not null check (char_length(btrim(title)) between 1 and 300),
  description         text not null default '',
  category            text not null check (category in
                        ('Thesis','Project','Publication','Teaching',
                         'Research','Administration','Proposal','Personal')),
  start_date          date,
  deadline            date,
  importance          text not null check (importance in ('High','Medium','Low')),
  duration_minutes    integer check (duration_minutes between 0 and 10000),
  status              text not null default 'To Do'
                        check (status in ('To Do','In Progress','Waiting','Completed')),
  notes               text not null default '',
  urgency_override    text check (urgency_override in ('urgent','not_urgent')),
  importance_override text check (importance_override in ('important','not_important')),
  planned_date        date,
  plan_order          integer,
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks (user_id);

-- Size limits so one account can't fill the database with huge text.
-- (Added with ALTER so they also apply to tables created by an earlier version.)
alter table public.tasks drop constraint if exists tasks_description_len;
alter table public.tasks add constraint tasks_description_len check (char_length(description) <= 10000);
alter table public.tasks drop constraint if exists tasks_notes_len;
alter table public.tasks add constraint tasks_notes_len check (char_length(notes) <= 10000);

-- Server-side timestamp so both PCs agree on one clock.
create or replace function public.tasks_set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before insert or update on public.tasks
  for each row execute function public.tasks_set_updated_at();

-- ─── Row Level Security: each user sees and changes ONLY their own rows ───
alter table public.tasks enable row level security;
alter table public.tasks force row level security;

drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;
drop policy if exists "tasks_delete_own" on public.tasks;

create policy "tasks_select_own" on public.tasks
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "tasks_insert_own" on public.tasks
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "tasks_update_own" on public.tasks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);   -- cannot hand a task to another user

create policy "tasks_delete_own" on public.tasks
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Anonymous (signed-out) visitors get nothing.
revoke all on public.tasks from anon;
grant select, insert, update, delete on public.tasks to authenticated;

-- ─── Realtime: broadcast row changes (RLS is applied per subscriber) ───
-- INSERT/UPDATE events are filtered by user_id and checked against RLS,
-- so a user only ever receives their own rows. DELETE events carry only the
-- deleted row's id (no content), which the app ignores unless it owns it.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
end $$;
