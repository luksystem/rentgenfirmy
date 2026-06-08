-- Instancje elementów procesu per projekt (checklisty, protokoły, rozliczenia)

create table if not exists public.project_process_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  template_item_id uuid not null,
  kind public.process_item_kind not null default 'checklist',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, template_item_id)
);

create index if not exists project_process_items_project_idx
  on public.project_process_items (project_id);

create index if not exists project_process_items_template_item_idx
  on public.project_process_items (template_item_id);

alter table public.project_process_items enable row level security;

drop policy if exists project_process_items_all on public.project_process_items;
create policy project_process_items_all on public.project_process_items for all using (true) with check (true);
