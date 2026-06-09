-- Historia zdarzeń zgłoszeń Kanban (utworzenie, zamknięcie, ponowne otwarcie)

create table if not exists public.process_kanban_task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.process_kanban_tasks (id) on delete cascade,
  event_type text not null check (event_type in ('created', 'closed', 'reopened')),
  author_name text not null,
  author_side text not null default 'team',
  created_at timestamptz not null default now()
);

create index if not exists process_kanban_task_events_task_idx
  on public.process_kanban_task_events (task_id, created_at);

alter table public.process_kanban_task_events enable row level security;

create policy "process_kanban_task_events_all"
  on public.process_kanban_task_events for all using (true) with check (true);

-- Uzupełnienie historii dla istniejących zgłoszeń
insert into public.process_kanban_task_events (task_id, event_type, author_name, author_side, created_at)
select
  t.id,
  'created',
  case when t.created_by_side = 'client' then 'Klient' else 'Zespół' end,
  t.created_by_side,
  t.created_at
from public.process_kanban_tasks t
where not exists (
  select 1
  from public.process_kanban_task_events e
  where e.task_id = t.id and e.event_type = 'created'
);

insert into public.process_kanban_task_events (task_id, event_type, author_name, author_side, created_at)
select
  t.id,
  'closed',
  'Nieznany',
  'team',
  t.closed_at
from public.process_kanban_tasks t
where t.closed_at is not null
  and not exists (
    select 1
    from public.process_kanban_task_events e
    where e.task_id = t.id and e.event_type = 'closed' and e.created_at = t.closed_at
  );
