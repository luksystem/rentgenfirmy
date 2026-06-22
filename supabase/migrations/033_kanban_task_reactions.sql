-- Szybkie reakcje emoji na zadaniach Kanban

create table if not exists public.process_kanban_task_reactions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.process_kanban_tasks (id) on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '✅')),
  author_name text not null,
  author_side text not null check (author_side in ('team', 'client')),
  created_at timestamptz not null default now(),
  unique (task_id, emoji, author_name, author_side)
);

create index if not exists process_kanban_task_reactions_task_idx
  on public.process_kanban_task_reactions (task_id, created_at);

alter table public.process_kanban_task_reactions enable row level security;

drop policy if exists "process_kanban_task_reactions_all" on public.process_kanban_task_reactions;
create policy "process_kanban_task_reactions_all" on public.process_kanban_task_reactions
  for all using (true) with check (true);
