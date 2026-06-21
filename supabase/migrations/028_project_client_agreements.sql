-- Ustalenia projektu wymagające akceptacji klienta

create type public.project_agreement_category as enum (
  'integration',
  'specification',
  'change',
  'handover',
  'other'
);

create type public.project_agreement_status as enum (
  'draft',
  'pending_client',
  'accepted',
  'rejected',
  'cancelled'
);

create table if not exists public.project_client_agreements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  body text not null default '',
  category public.project_agreement_category not null default 'other',
  status public.project_agreement_status not null default 'draft',
  proposed_cost_net numeric(12, 2),
  proposed_cost_gross numeric(12, 2),
  cost_note text,
  created_by_name text not null,
  created_by_side text not null default 'team' check (created_by_side in ('team', 'client')),
  submitted_at timestamptz,
  client_responded_at timestamptz,
  client_response_name text,
  client_response_note text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_client_agreements_project_id_idx
  on public.project_client_agreements (project_id);

create index if not exists project_client_agreements_status_idx
  on public.project_client_agreements (project_id, status);

alter table public.project_client_agreements enable row level security;

drop policy if exists "project_client_agreements_select_all" on public.project_client_agreements;
drop policy if exists "project_client_agreements_insert_all" on public.project_client_agreements;
drop policy if exists "project_client_agreements_update_all" on public.project_client_agreements;
drop policy if exists "project_client_agreements_delete_all" on public.project_client_agreements;

create policy "project_client_agreements_select_all" on public.project_client_agreements for select using (true);
create policy "project_client_agreements_insert_all" on public.project_client_agreements for insert with check (true);
create policy "project_client_agreements_update_all" on public.project_client_agreements for update using (true);
create policy "project_client_agreements_delete_all" on public.project_client_agreements for delete using (true);
