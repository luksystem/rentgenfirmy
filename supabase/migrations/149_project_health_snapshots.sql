-- Snapshoty „Zdrowia projektu” — podsumowanie AI + wynik heurystyczny.

create table if not exists public.project_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  score integer not null check (score >= 0 and score <= 100),
  band text not null check (band in ('green', 'yellow', 'red')),
  sentiment text not null default 'mixed'
    check (sentiment in ('positive', 'mixed', 'negative')),
  summary_md text not null default '',
  signals jsonb not null default '{}'::jsonb,
  stage_title text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists project_health_snapshots_project_idx
  on public.project_health_snapshots (project_id, created_at desc);

alter table public.project_health_snapshots enable row level security;

drop policy if exists project_health_snapshots_all on public.project_health_snapshots;
create policy project_health_snapshots_all on public.project_health_snapshots
  for all using (true) with check (true);
