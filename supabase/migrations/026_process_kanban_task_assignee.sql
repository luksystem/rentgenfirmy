-- Odpowiedzialny za zgłoszenie Kanban (lista jak właściciel kolejnego kroku projektu)

alter table public.process_kanban_tasks
  add column if not exists assignee_name text;

create index if not exists process_kanban_tasks_assignee_idx
  on public.process_kanban_tasks (assignee_name)
  where assignee_name is not null;
