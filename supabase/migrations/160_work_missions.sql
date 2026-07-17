-- Misje / delegacje powiązane z wpisami czasu.

create table if not exists public.work_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  project_id uuid references public.projects (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  start_date date not null,
  end_date date not null,
  status text not null default 'active'
    check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists work_missions_user_dates_idx
  on public.work_missions (user_id, start_date desc, end_date desc);

create index if not exists work_missions_project_idx
  on public.work_missions (project_id)
  where project_id is not null;

alter table public.time_entries
  drop constraint if exists time_entries_mission_id_fkey;

alter table public.time_entries
  add constraint time_entries_mission_id_fkey
  foreign key (mission_id) references public.work_missions (id) on delete set null;

alter table public.work_missions enable row level security;

drop policy if exists work_missions_select on public.work_missions;
create policy work_missions_select
  on public.work_missions for select
  using (auth.uid() is not null);

drop policy if exists work_missions_write on public.work_missions;
create policy work_missions_write
  on public.work_missions for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
