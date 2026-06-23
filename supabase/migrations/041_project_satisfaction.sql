-- Ocena spełnienia ustaleń/specyfikacji oraz zadowolenia z etapów procesu

create type public.fulfillment_status as enum ('pending', 'met', 'not_met', 'partial');

create table if not exists public.project_agreement_fulfillments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  agreement_id uuid not null references public.project_client_agreements (id) on delete cascade,
  status public.fulfillment_status not null default 'pending',
  note text not null default '',
  reviewed_by_name text not null default '',
  reviewed_by_side text not null default 'client' check (reviewed_by_side in ('client', 'team')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, agreement_id)
);

create index if not exists project_agreement_fulfillments_project_id_idx
  on public.project_agreement_fulfillments (project_id);

create table if not exists public.project_specification_fulfillments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  specification_item_id uuid not null references public.project_specification_items (id) on delete cascade,
  status public.fulfillment_status not null default 'pending',
  note text not null default '',
  reviewed_by_name text not null default '',
  reviewed_by_side text not null default 'client' check (reviewed_by_side in ('client', 'team')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, specification_item_id)
);

create index if not exists project_specification_fulfillments_project_id_idx
  on public.project_specification_fulfillments (project_id);

create table if not exists public.project_stage_satisfactions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  stage_id uuid not null,
  stage_title text not null default '',
  score smallint not null default 0 check (score >= 0 and score <= 10),
  best_aspect text not null default '',
  worst_aspect text not null default '',
  comment text not null default '',
  author_name text not null default '',
  author_side text not null default 'client' check (author_side in ('client', 'team')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, stage_id, author_side)
);

create index if not exists project_stage_satisfactions_project_id_idx
  on public.project_stage_satisfactions (project_id, stage_id);

create table if not exists public.project_satisfaction_overviews (
  project_id uuid primary key references public.projects (id) on delete cascade,
  expectation_score smallint check (expectation_score >= 0 and expectation_score <= 10),
  reality_score smallint check (reality_score >= 0 and reality_score <= 10),
  overall_note text not null default '',
  reviewed_by_name text not null default '',
  reviewed_by_side text not null default 'client' check (reviewed_by_side in ('client', 'team')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_agreement_fulfillments enable row level security;
alter table public.project_specification_fulfillments enable row level security;
alter table public.project_stage_satisfactions enable row level security;
alter table public.project_satisfaction_overviews enable row level security;

drop policy if exists "project_agreement_fulfillments_all" on public.project_agreement_fulfillments;
drop policy if exists "project_specification_fulfillments_all" on public.project_specification_fulfillments;
drop policy if exists "project_stage_satisfactions_all" on public.project_stage_satisfactions;
drop policy if exists "project_satisfaction_overviews_all" on public.project_satisfaction_overviews;

create policy "project_agreement_fulfillments_all" on public.project_agreement_fulfillments for all using (true) with check (true);
create policy "project_specification_fulfillments_all" on public.project_specification_fulfillments for all using (true) with check (true);
create policy "project_stage_satisfactions_all" on public.project_stage_satisfactions for all using (true) with check (true);
create policy "project_satisfaction_overviews_all" on public.project_satisfaction_overviews for all using (true) with check (true);
