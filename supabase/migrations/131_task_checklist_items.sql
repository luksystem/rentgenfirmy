-- Pomocnicze podzadania (checklisty) przy przydziałach planu zasobów i ręcznych zadaniach.
-- Nie są osobnymi work_items — dziedziczą kontekst zadania nadrzędnego (termin, projekt itd.).

create table if not exists public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid references public.work_items (id) on delete cascade,
  resource_plan_item_id uuid references public.resource_plan_items (id) on delete cascade,
  title text not null default '',
  is_completed boolean not null default false,
  completed_at timestamptz,
  completed_by_id uuid references public.profiles (id) on delete set null,
  sort_order int not null default 0,
  created_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (work_item_id is not null and resource_plan_item_id is null)
    or (work_item_id is null and resource_plan_item_id is not null)
  ),
  check (char_length(trim(title)) > 0)
);

create index if not exists task_checklist_items_work_item_idx
  on public.task_checklist_items (work_item_id, sort_order);
create index if not exists task_checklist_items_resource_plan_item_idx
  on public.task_checklist_items (resource_plan_item_id, sort_order);

alter table public.task_checklist_items enable row level security;

drop policy if exists task_checklist_items_select on public.task_checklist_items;
create policy task_checklist_items_select
  on public.task_checklist_items for select
  using (auth.uid() is not null);

drop policy if exists task_checklist_items_insert on public.task_checklist_items;
create policy task_checklist_items_insert
  on public.task_checklist_items for insert
  with check (auth.uid() is not null);

drop policy if exists task_checklist_items_update on public.task_checklist_items;
create policy task_checklist_items_update
  on public.task_checklist_items for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists task_checklist_items_delete on public.task_checklist_items;
create policy task_checklist_items_delete
  on public.task_checklist_items for delete
  using (auth.uid() is not null);
