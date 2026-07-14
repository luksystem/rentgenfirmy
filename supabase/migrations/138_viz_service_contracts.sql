-- ═══════════════════════════════════════════════════════════════════════════
-- Wizualizacje — umowy serwisowe dashboardu (Etap 4)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.viz_service_contracts (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.viz_dashboards (id) on delete cascade,
  name text not null,
  contract_type public.viz_service_contract_status not null default 'mixed',
  monthly_hours_budget numeric(10, 2),
  sla_response_hours integer,
  valid_from date,
  valid_until date,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists viz_service_contracts_dashboard_idx
  on public.viz_service_contracts (dashboard_id, is_active);

create table if not exists public.viz_service_contract_rate_versions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.viz_service_contracts (id) on delete cascade,
  version_label text not null,
  valid_from date not null,
  valid_until date,
  rates_json jsonb not null default '{}'::jsonb,
  zone_settings_json jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists viz_service_contract_rate_versions_contract_idx
  on public.viz_service_contract_rate_versions (contract_id, valid_from desc);

create table if not exists public.viz_service_contract_project_terms (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.viz_service_contracts (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  monthly_hours_override numeric(10, 2),
  contract_status_override public.viz_service_contract_status,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id, project_id)
);

alter table public.viz_service_contracts enable row level security;
alter table public.viz_service_contract_rate_versions enable row level security;
alter table public.viz_service_contract_project_terms enable row level security;

drop policy if exists viz_service_contracts_select on public.viz_service_contracts;
create policy viz_service_contracts_select on public.viz_service_contracts
  for select using (public.user_can_access_viz_dashboard(dashboard_id));

drop policy if exists viz_service_contracts_write on public.viz_service_contracts;
create policy viz_service_contracts_write on public.viz_service_contracts
  for all using (public.user_can_manage_viz_dashboard(dashboard_id))
  with check (public.user_can_manage_viz_dashboard(dashboard_id));

drop policy if exists viz_service_contract_rate_versions_select on public.viz_service_contract_rate_versions;
create policy viz_service_contract_rate_versions_select on public.viz_service_contract_rate_versions
  for select using (
    exists (
      select 1 from public.viz_service_contracts c
      where c.id = contract_id and public.user_can_access_viz_dashboard(c.dashboard_id)
    )
  );

drop policy if exists viz_service_contract_rate_versions_write on public.viz_service_contract_rate_versions;
create policy viz_service_contract_rate_versions_write on public.viz_service_contract_rate_versions
  for all using (
    exists (
      select 1 from public.viz_service_contracts c
      where c.id = contract_id and public.user_can_manage_viz_dashboard(c.dashboard_id)
    )
  )
  with check (
    exists (
      select 1 from public.viz_service_contracts c
      where c.id = contract_id and public.user_can_manage_viz_dashboard(c.dashboard_id)
    )
  );

drop policy if exists viz_service_contract_project_terms_select on public.viz_service_contract_project_terms;
create policy viz_service_contract_project_terms_select on public.viz_service_contract_project_terms
  for select using (
    exists (
      select 1 from public.viz_service_contracts c
      where c.id = contract_id and public.user_can_access_viz_dashboard(c.dashboard_id)
    )
  );

drop policy if exists viz_service_contract_project_terms_write on public.viz_service_contract_project_terms;
create policy viz_service_contract_project_terms_write on public.viz_service_contract_project_terms
  for all using (
    exists (
      select 1 from public.viz_service_contracts c
      where c.id = contract_id and public.user_can_manage_viz_dashboard(c.dashboard_id)
    )
  )
  with check (
    exists (
      select 1 from public.viz_service_contracts c
      where c.id = contract_id and public.user_can_manage_viz_dashboard(c.dashboard_id)
    )
  );
