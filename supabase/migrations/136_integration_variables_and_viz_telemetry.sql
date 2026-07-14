-- ═══════════════════════════════════════════════════════════════════════════
-- Zmienne integracji (dowolna liczba punktów Loxone) + telemetria per zmienna
-- Etap 2 Wizualizacji — ostatnie wartości, historia, jakość danych
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Rejestr zmiennych integracji ───────────────────────────────────────────

create table if not exists public.project_integration_variables (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.project_integrations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  source_key text not null,
  location_label text,
  value_kind text not null default 'numeric' check (value_kind in ('numeric', 'boolean', 'text')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, source_key)
);

create index if not exists project_integration_variables_integration_idx
  on public.project_integration_variables (integration_id, sort_order);

create index if not exists project_integration_variables_project_idx
  on public.project_integration_variables (project_id);

-- ── Telemetria per zmienna (rozszerzenie istniejącej tabeli) ────────────────

alter table public.project_telemetry
  add column if not exists integration_variable_id uuid
    references public.project_integration_variables (id) on delete set null;

alter table public.project_telemetry
  add column if not exists numeric_value numeric;

alter table public.project_telemetry
  add column if not exists text_value text;

create index if not exists project_telemetry_variable_measured_idx
  on public.project_telemetry (integration_variable_id, measured_at desc)
  where integration_variable_id is not null;

-- ── Mapowanie wiz → konkretna zmienna integracji ─────────────────────────

alter table public.viz_variable_mappings
  add column if not exists integration_variable_id uuid
    references public.project_integration_variables (id) on delete set null;

create index if not exists viz_variable_mappings_integration_variable_idx
  on public.viz_variable_mappings (integration_variable_id)
  where integration_variable_id is not null;

-- ── Ostatnie wartości (cache odczytu dla dashboardu) ─────────────────────

create table if not exists public.viz_variable_current_values (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.viz_dashboards (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  mapping_id uuid not null references public.viz_variable_mappings (id) on delete cascade,
  integration_variable_id uuid references public.project_integration_variables (id) on delete set null,
  role_code text not null,
  numeric_value numeric,
  text_value text,
  display_value text,
  unit text,
  data_quality public.viz_data_quality not null default 'unconfigured',
  measured_at timestamptz,
  last_successful_read_at timestamptz,
  raw_payload_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (mapping_id)
);

create index if not exists viz_variable_current_values_dashboard_project_idx
  on public.viz_variable_current_values (dashboard_id, project_id);

-- ── Historia pomiarów (dashboard / rola semantyczna) ─────────────────────

create table if not exists public.viz_variable_readings_history (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.viz_dashboards (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  mapping_id uuid not null references public.viz_variable_mappings (id) on delete cascade,
  integration_variable_id uuid references public.project_integration_variables (id) on delete set null,
  role_code text not null,
  numeric_value numeric,
  text_value text,
  data_quality public.viz_data_quality not null default 'valid',
  measured_at timestamptz not null default now(),
  raw_payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists viz_variable_readings_history_lookup_idx
  on public.viz_variable_readings_history (mapping_id, measured_at desc);

create index if not exists viz_variable_readings_history_dashboard_time_idx
  on public.viz_variable_readings_history (dashboard_id, measured_at desc);

-- ── Backfill: istniejące virtualInputName → pierwsza zmienna ──────────────

insert into public.project_integration_variables (
  integration_id,
  project_id,
  name,
  source_key,
  location_label,
  value_kind,
  sort_order,
  is_active
)
select
  pi.id,
  pi.project_id,
  coalesce(
    nullif(trim(pi.config_json->>'locationLabel'), ''),
    pi.name
  ),
  trim(pi.config_json->>'virtualInputName'),
  nullif(trim(pi.config_json->>'locationLabel'), ''),
  'numeric',
  0,
  true
from public.project_integrations pi
where pi.integration_type = 'loxone'
  and nullif(trim(pi.config_json->>'virtualInputName'), '') is not null
  and not exists (
    select 1
    from public.project_integration_variables piv
    where piv.integration_id = pi.id
      and piv.source_key = trim(pi.config_json->>'virtualInputName')
  );

-- ── RLS ────────────────────────────────────────────────────────────────────

alter table public.project_integration_variables enable row level security;
alter table public.viz_variable_current_values enable row level security;
alter table public.viz_variable_readings_history enable row level security;

drop policy if exists project_integration_variables_select on public.project_integration_variables;
create policy project_integration_variables_select on public.project_integration_variables
  for select using (public.user_can_access_project(project_id));

drop policy if exists project_integration_variables_write on public.project_integration_variables;
create policy project_integration_variables_write on public.project_integration_variables
  for all using (public.has_full_app_access())
  with check (public.has_full_app_access());

drop policy if exists viz_variable_current_values_select on public.viz_variable_current_values;
create policy viz_variable_current_values_select on public.viz_variable_current_values
  for select using (public.user_can_access_viz_dashboard(dashboard_id));

drop policy if exists viz_variable_current_values_write on public.viz_variable_current_values;
create policy viz_variable_current_values_write on public.viz_variable_current_values
  for all using (public.user_can_manage_viz_dashboard(dashboard_id))
  with check (public.user_can_manage_viz_dashboard(dashboard_id));

drop policy if exists viz_variable_readings_history_select on public.viz_variable_readings_history;
create policy viz_variable_readings_history_select on public.viz_variable_readings_history
  for select using (public.user_can_access_viz_dashboard(dashboard_id));

drop policy if exists viz_variable_readings_history_write on public.viz_variable_readings_history;
create policy viz_variable_readings_history_write on public.viz_variable_readings_history
  for all using (public.has_full_app_access())
  with check (public.has_full_app_access());
