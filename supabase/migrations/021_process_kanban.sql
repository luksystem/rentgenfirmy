-- Kanban jako typ elementu procesu + tablice, kolumny, taski, komentarze

alter type public.process_item_kind add value if not exists 'kanban';

create table if not exists public.process_kanban_boards (
  id uuid primary key default gen_random_uuid(),
  project_process_item_id uuid not null unique references public.project_process_items (id) on delete cascade,
  public_token uuid not null unique default gen_random_uuid(),
  public_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.process_kanban_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.process_kanban_boards (id) on delete cascade,
  title text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists process_kanban_columns_board_idx on public.process_kanban_columns (board_id, position);

create table if not exists public.process_kanban_tasks (
  id uuid primary key default gen_random_uuid(),
  column_id uuid not null references public.process_kanban_columns (id) on delete cascade,
  title text not null,
  description text not null default '',
  priority text not null default 'normal',
  due_date date,
  position int not null default 0,
  closed_at timestamptz,
  created_by_side text not null default 'team',
  is_new_for_team boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists process_kanban_tasks_column_idx on public.process_kanban_tasks (column_id, position);
create index if not exists process_kanban_tasks_new_idx on public.process_kanban_tasks (is_new_for_team) where closed_at is null;

create table if not exists public.process_kanban_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.process_kanban_tasks (id) on delete cascade,
  author_name text not null,
  author_side text not null default 'team',
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists process_kanban_comments_task_idx on public.process_kanban_comments (task_id, created_at);

alter table public.process_kanban_boards enable row level security;
alter table public.process_kanban_columns enable row level security;
alter table public.process_kanban_tasks enable row level security;
alter table public.process_kanban_comments enable row level security;

create policy "process_kanban_boards_all" on public.process_kanban_boards for all using (true) with check (true);
create policy "process_kanban_columns_all" on public.process_kanban_columns for all using (true) with check (true);
create policy "process_kanban_tasks_all" on public.process_kanban_tasks for all using (true) with check (true);
create policy "process_kanban_comments_all" on public.process_kanban_comments for all using (true) with check (true);
