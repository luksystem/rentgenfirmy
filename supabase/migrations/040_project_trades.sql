-- Branże projektu (wykonawcy / role w procesie ustaleń)

create table if not exists public.project_trades (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  company text not null default '',
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  description text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_trades_project_id_idx
  on public.project_trades (project_id, position);

alter table public.project_trades enable row level security;

drop policy if exists "project_trades_select_all" on public.project_trades;
drop policy if exists "project_trades_insert_all" on public.project_trades;
drop policy if exists "project_trades_update_all" on public.project_trades;
drop policy if exists "project_trades_delete_all" on public.project_trades;

create policy "project_trades_select_all" on public.project_trades for select using (true);
create policy "project_trades_insert_all" on public.project_trades for insert with check (true);
create policy "project_trades_update_all" on public.project_trades for update using (true);
create policy "project_trades_delete_all" on public.project_trades for delete using (true);
