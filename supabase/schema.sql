-- Uruchom w Supabase: SQL Editor → New query → Run

create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  flow_status text not null,
  stage text not null,
  priority text not null,
  next_step_owner text not null,
  next_contact_date date not null,
  blocker_reason text,
  notes text,
  last_changed_by text not null,
  last_changed_at timestamptz not null default now(),
  last_contact_date date not null,
  close_blocker text,
  remaining_hours numeric,
  next_action text,
  close_deadline date,
  created_at timestamptz not null default now()
);

create table if not exists public.interruptions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  person text not null,
  type text not null,
  project_id uuid not null references public.projects (id) on delete cascade,
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists projects_flow_status_idx on public.projects (flow_status);
create index if not exists projects_type_idx on public.projects (type);
create index if not exists projects_priority_idx on public.projects (priority);
create index if not exists interruptions_date_idx on public.interruptions (date);
create index if not exists interruptions_project_id_idx on public.interruptions (project_id);

alter table public.projects enable row level security;
alter table public.interruptions enable row level security;

-- Tymczasowe polityki bez logowania (MVP wewnętrzne).
-- Po dodaniu auth zamień na polityki oparte o auth.uid().
drop policy if exists "projects_select_all" on public.projects;
drop policy if exists "projects_insert_all" on public.projects;
drop policy if exists "projects_update_all" on public.projects;
drop policy if exists "projects_delete_all" on public.projects;
drop policy if exists "interruptions_select_all" on public.interruptions;
drop policy if exists "interruptions_insert_all" on public.interruptions;
drop policy if exists "interruptions_update_all" on public.interruptions;
drop policy if exists "interruptions_delete_all" on public.interruptions;

create policy "projects_select_all" on public.projects for select using (true);
create policy "projects_insert_all" on public.projects for insert with check (true);
create policy "projects_update_all" on public.projects for update using (true);
create policy "projects_delete_all" on public.projects for delete using (true);

create policy "interruptions_select_all" on public.interruptions for select using (true);
create policy "interruptions_insert_all" on public.interruptions for insert with check (true);
create policy "interruptions_update_all" on public.interruptions for update using (true);
create policy "interruptions_delete_all" on public.interruptions for delete using (true);
