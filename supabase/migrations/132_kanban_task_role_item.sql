-- Kanban: rola operacyjna przypisana do zadania (oprócz osoby assignee_id)
alter table public.process_kanban_tasks
  add column if not exists role_item_id uuid references public.resource_dictionary_items (id) on delete set null;

create index if not exists process_kanban_tasks_role_item_id_idx
  on public.process_kanban_tasks (role_item_id)
  where role_item_id is not null;

comment on column public.process_kanban_tasks.role_item_id is
  'Rola operacyjna (słownik operational_role). Osoba przypisana osobno w assignee_id.';
