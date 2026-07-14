-- ═══════════════════════════════════════════════════════════════════════════
-- Wizualizacje — komendy sterujące (kolejka) + faktury energii (Etap 6)
-- ═══════════════════════════════════════════════════════════════════════════

create type public.viz_control_command_status as enum (
  'pending',
  'processing',
  'success',
  'failed'
);

create type public.viz_control_command_type as enum ('setpoint', 'generic');

create table if not exists public.viz_control_commands (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.viz_dashboards (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  mapping_id uuid references public.viz_variable_mappings (id) on delete set null,
  role_code text references public.viz_variable_roles (code) on delete set null,
  command_type public.viz_control_command_type not null default 'setpoint',
  requested_value numeric not null,
  previous_value numeric,
  status public.viz_control_command_status not null default 'pending',
  error_message text,
  requested_by_user_id uuid references public.profiles (id) on delete set null,
  requested_by_name text not null default 'System',
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists viz_control_commands_dashboard_project_idx
  on public.viz_control_commands (dashboard_id, project_id, created_at desc);

create type public.viz_energy_analysis_status as enum (
  'none',
  'pending',
  'completed',
  'failed'
);

create table if not exists public.viz_energy_invoices (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.viz_dashboards (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  document_id uuid not null references public.project_documents (id) on delete cascade,
  billing_period_start date,
  billing_period_end date,
  total_kwh numeric,
  total_cost_pln numeric,
  supplier_name text,
  analysis_status public.viz_energy_analysis_status not null default 'none',
  analysis_json jsonb not null default '{}'::jsonb,
  analyzed_at timestamptz,
  uploaded_by_user_id uuid references public.profiles (id) on delete set null,
  uploaded_by_name text not null default 'System',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id)
);

create index if not exists viz_energy_invoices_dashboard_project_idx
  on public.viz_energy_invoices (dashboard_id, project_id, billing_period_end desc nulls last);

alter table public.viz_control_commands enable row level security;
alter table public.viz_energy_invoices enable row level security;

drop policy if exists viz_control_commands_select on public.viz_control_commands;
create policy viz_control_commands_select on public.viz_control_commands
  for select using (public.user_can_access_viz_dashboard(dashboard_id));

drop policy if exists viz_control_commands_insert on public.viz_control_commands;
create policy viz_control_commands_insert on public.viz_control_commands
  for insert with check (public.user_can_access_viz_dashboard(dashboard_id));

drop policy if exists viz_energy_invoices_select on public.viz_energy_invoices;
create policy viz_energy_invoices_select on public.viz_energy_invoices
  for select using (public.user_can_access_viz_dashboard(dashboard_id));

drop policy if exists viz_energy_invoices_write on public.viz_energy_invoices;
create policy viz_energy_invoices_write on public.viz_energy_invoices
  for all using (public.user_can_access_viz_dashboard(dashboard_id))
  with check (public.user_can_access_viz_dashboard(dashboard_id));
