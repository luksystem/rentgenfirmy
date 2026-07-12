-- Kanban: przypisanie po profile.id (oprócz assignee_name dla kompatybilności wstecznej)

alter table public.process_kanban_tasks
  add column if not exists assignee_id uuid references public.profiles (id) on delete set null;

create index if not exists process_kanban_tasks_assignee_id_idx
  on public.process_kanban_tasks (assignee_id)
  where assignee_id is not null;

-- Backfill: dopasowanie assignee_name do imienia i nazwiska profilu
update public.process_kanban_tasks t
set assignee_id = p.id
from public.profiles p
where t.assignee_id is null
  and t.assignee_name is not null
  and trim(t.assignee_name) <> ''
  and lower(trim(t.assignee_name)) = lower(trim(
    coalesce(nullif(trim(p.first_name), ''), '') || ' ' || coalesce(nullif(trim(p.last_name), ''), '')
  ));

comment on column public.process_kanban_tasks.assignee_id is
  'Osoba odpowiedzialna (FK profiles). assignee_name pozostaje dla kompatybilności i widoku publicznego.';
