-- Moduł PROCESY — szablony per typ projektu i postęp na projekcie
-- Uruchom w Supabase SQL Editor

do $$ begin
  create type public.process_item_kind as enum ('checklist', 'protocol', 'settlement');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.process_templates (
  id uuid primary key default gen_random_uuid(),
  project_type text not null unique,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.process_stages (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.process_templates (id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.process_milestones (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.process_stages (id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.process_items (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.process_milestones (id) on delete cascade,
  kind public.process_item_kind not null default 'checklist',
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.project_processes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  template_id uuid not null references public.process_templates (id) on delete restrict,
  completions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists process_stages_template_idx on public.process_stages (template_id, position);
create index if not exists process_milestones_stage_idx on public.process_milestones (stage_id, position);
create index if not exists process_items_milestone_idx on public.process_items (milestone_id, position);
create index if not exists project_processes_template_idx on public.project_processes (template_id);

alter table public.process_templates enable row level security;
alter table public.process_stages enable row level security;
alter table public.process_milestones enable row level security;
alter table public.process_items enable row level security;
alter table public.project_processes enable row level security;

drop policy if exists process_templates_all on public.process_templates;
create policy process_templates_all on public.process_templates for all using (true) with check (true);

drop policy if exists process_stages_all on public.process_stages;
create policy process_stages_all on public.process_stages for all using (true) with check (true);

drop policy if exists process_milestones_all on public.process_milestones;
create policy process_milestones_all on public.process_milestones for all using (true) with check (true);

drop policy if exists process_items_all on public.process_items;
create policy process_items_all on public.process_items for all using (true) with check (true);

drop policy if exists project_processes_all on public.project_processes;
create policy project_processes_all on public.project_processes for all using (true) with check (true);
