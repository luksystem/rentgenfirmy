-- ═══════════════════════════════════════════════════════════════════════════
-- Wizualizacje / BMS Command Center — fundament (Etap 1)
-- Dashboardy, projekty, słowniki systemów i ról zmiennych, mapowania, dostęp
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Enums ──────────────────────────────────────────────────────────────────

create type public.viz_dashboard_status as enum ('draft', 'active', 'archived');

create type public.viz_system_integration_status as enum (
  'integrated',
  'partially_integrated',
  'planned',
  'possible',
  'none',
  'not_applicable'
);

create type public.viz_service_contract_status as enum (
  'none',
  'on_demand',
  'monthly_hours',
  'sla',
  'mixed'
);

create type public.viz_access_role as enum (
  'admin',
  'operator',
  'service',
  'client_admin',
  'client_readonly'
);

create type public.viz_data_quality as enum (
  'valid',
  'stale',
  'no_communication',
  'read_error',
  'unconfigured'
);

-- ── Szablony dashboardów ───────────────────────────────────────────────────

create table if not exists public.viz_dashboard_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  default_layout_json jsonb not null default '{}'::jsonb,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Dashboardy ───────────────────────────────────────────────────────────

create table if not exists public.viz_dashboards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  template_slug text references public.viz_dashboard_templates (slug) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  status public.viz_dashboard_status not null default 'draft',
  layout_json jsonb not null default '{}'::jsonb,
  settings_json jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references public.profiles (id) on delete set null,
  created_by_name text not null,
  updated_by_user_id uuid references public.profiles (id) on delete set null,
  updated_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists viz_dashboards_client_idx
  on public.viz_dashboards (client_id, status);

create index if not exists viz_dashboards_status_idx
  on public.viz_dashboards (status, updated_at desc);

-- ── Projekty przypisane do dashboardu ──────────────────────────────────────

create table if not exists public.viz_dashboard_projects (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.viz_dashboards (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  display_name text,
  bms_commissioned_at date,
  is_active_in_dashboard boolean not null default true,
  sort_order integer not null default 0,
  lat_override numeric,
  lng_override numeric,
  service_contract_status public.viz_service_contract_status not null default 'none',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dashboard_id, project_id)
);

create index if not exists viz_dashboard_projects_dashboard_idx
  on public.viz_dashboard_projects (dashboard_id, sort_order);

create index if not exists viz_dashboard_projects_project_idx
  on public.viz_dashboard_projects (project_id);

-- ── Słownik zintegrowanych systemów ────────────────────────────────────────

create table if not exists public.viz_integrated_systems (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Status integracji systemu per projekt w dashboardzie ───────────────────

create table if not exists public.viz_project_system_status (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.viz_dashboards (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  system_id uuid not null references public.viz_integrated_systems (id) on delete cascade,
  status public.viz_system_integration_status not null default 'not_applicable',
  integration_scope text,
  notes text,
  updated_at timestamptz not null default now(),
  unique (dashboard_id, project_id, system_id)
);

create index if not exists viz_project_system_status_lookup_idx
  on public.viz_project_system_status (dashboard_id, project_id);

-- ── Słownik ról semantycznych zmiennych ────────────────────────────────────

create table if not exists public.viz_variable_roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  default_unit text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Mapowanie zmiennych (warstwa semantyczna) ──────────────────────────────

create table if not exists public.viz_variable_mappings (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.viz_dashboards (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  integration_id uuid references public.project_integrations (id) on delete set null,
  source_key text,
  role_code text not null references public.viz_variable_roles (code) on delete restrict,
  display_name text,
  unit text,
  display_format text,
  decimal_places integer not null default 1,
  multiplier numeric not null default 1,
  offset_value numeric not null default 0,
  text_value_map jsonb not null default '{}'::jsonb,
  inverted boolean not null default false,
  writable boolean not null default false,
  min_value numeric,
  max_value numeric,
  data_quality public.viz_data_quality not null default 'unconfigured',
  collection_interval_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dashboard_id, project_id, role_code)
);

create index if not exists viz_variable_mappings_dashboard_project_idx
  on public.viz_variable_mappings (dashboard_id, project_id);

create index if not exists viz_variable_mappings_integration_idx
  on public.viz_variable_mappings (integration_id)
  where integration_id is not null;

-- ── Dostęp użytkowników do dashboardu ─────────────────────────────────────

create table if not exists public.viz_dashboard_access (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.viz_dashboards (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  access_role public.viz_access_role not null default 'client_readonly',
  permissions_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dashboard_id, profile_id)
);

create index if not exists viz_dashboard_access_profile_idx
  on public.viz_dashboard_access (profile_id);

-- ── Funkcja dostępu do dashboardu ─────────────────────────────────────────

create or replace function public.user_can_access_viz_dashboard(target_dashboard_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when (select role from public.profiles where id = auth.uid()) in ('administrator', 'manager') then true
    when exists (
      select 1 from public.viz_dashboard_access vda
      where vda.dashboard_id = target_dashboard_id
        and vda.profile_id = auth.uid()
    ) then true
    else false
  end;
$$;

create or replace function public.user_can_manage_viz_dashboard(target_dashboard_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when (select role from public.profiles where id = auth.uid()) in ('administrator', 'manager') then true
    when exists (
      select 1 from public.viz_dashboard_access vda
      where vda.dashboard_id = target_dashboard_id
        and vda.profile_id = auth.uid()
        and vda.access_role in ('admin', 'operator')
    ) then true
    else false
  end;
$$;

-- ── RLS ────────────────────────────────────────────────────────────────────

alter table public.viz_dashboard_templates enable row level security;
alter table public.viz_dashboards enable row level security;
alter table public.viz_dashboard_projects enable row level security;
alter table public.viz_integrated_systems enable row level security;
alter table public.viz_project_system_status enable row level security;
alter table public.viz_variable_roles enable row level security;
alter table public.viz_variable_mappings enable row level security;
alter table public.viz_dashboard_access enable row level security;

-- Szablony i słowniki — odczyt dla zalogowanych
drop policy if exists viz_dashboard_templates_select on public.viz_dashboard_templates;
create policy viz_dashboard_templates_select on public.viz_dashboard_templates
  for select using (auth.uid() is not null);

drop policy if exists viz_integrated_systems_select on public.viz_integrated_systems;
create policy viz_integrated_systems_select on public.viz_integrated_systems
  for select using (auth.uid() is not null);

drop policy if exists viz_variable_roles_select on public.viz_variable_roles;
create policy viz_variable_roles_select on public.viz_variable_roles
  for select using (auth.uid() is not null);

-- Dashboardy — dostęp per użytkownik
drop policy if exists viz_dashboards_select on public.viz_dashboards;
create policy viz_dashboards_select on public.viz_dashboards
  for select using (public.user_can_access_viz_dashboard(id));

drop policy if exists viz_dashboards_write on public.viz_dashboards;
create policy viz_dashboards_write on public.viz_dashboards
  for all using (public.user_can_manage_viz_dashboard(id))
  with check (public.user_can_manage_viz_dashboard(id));

-- Tabele zależne od dashboard_id
drop policy if exists viz_dashboard_projects_select on public.viz_dashboard_projects;
create policy viz_dashboard_projects_select on public.viz_dashboard_projects
  for select using (public.user_can_access_viz_dashboard(dashboard_id));

drop policy if exists viz_dashboard_projects_write on public.viz_dashboard_projects;
create policy viz_dashboard_projects_write on public.viz_dashboard_projects
  for all using (public.user_can_manage_viz_dashboard(dashboard_id))
  with check (public.user_can_manage_viz_dashboard(dashboard_id));

drop policy if exists viz_project_system_status_select on public.viz_project_system_status;
create policy viz_project_system_status_select on public.viz_project_system_status
  for select using (public.user_can_access_viz_dashboard(dashboard_id));

drop policy if exists viz_project_system_status_write on public.viz_project_system_status;
create policy viz_project_system_status_write on public.viz_project_system_status
  for all using (public.user_can_manage_viz_dashboard(dashboard_id))
  with check (public.user_can_manage_viz_dashboard(dashboard_id));

drop policy if exists viz_variable_mappings_select on public.viz_variable_mappings;
create policy viz_variable_mappings_select on public.viz_variable_mappings
  for select using (public.user_can_access_viz_dashboard(dashboard_id));

drop policy if exists viz_variable_mappings_write on public.viz_variable_mappings;
create policy viz_variable_mappings_write on public.viz_variable_mappings
  for all using (public.user_can_manage_viz_dashboard(dashboard_id))
  with check (public.user_can_manage_viz_dashboard(dashboard_id));

drop policy if exists viz_dashboard_access_select on public.viz_dashboard_access;
create policy viz_dashboard_access_select on public.viz_dashboard_access
  for select using (public.user_can_access_viz_dashboard(dashboard_id));

drop policy if exists viz_dashboard_access_write on public.viz_dashboard_access;
create policy viz_dashboard_access_write on public.viz_dashboard_access
  for all using (public.user_can_manage_viz_dashboard(dashboard_id))
  with check (public.user_can_manage_viz_dashboard(dashboard_id));

-- Słowniki — zapis tylko admin/manager
drop policy if exists viz_integrated_systems_write on public.viz_integrated_systems;
create policy viz_integrated_systems_write on public.viz_integrated_systems
  for all using (public.has_full_app_access())
  with check (public.has_full_app_access());

drop policy if exists viz_variable_roles_write on public.viz_variable_roles;
create policy viz_variable_roles_write on public.viz_variable_roles
  for all using (public.has_full_app_access())
  with check (public.has_full_app_access());

drop policy if exists viz_dashboard_templates_write on public.viz_dashboard_templates;
create policy viz_dashboard_templates_write on public.viz_dashboard_templates
  for all using (public.has_full_app_access())
  with check (public.has_full_app_access());

-- ── Seed: szablon Decathlon BMS ────────────────────────────────────────────

insert into public.viz_dashboard_templates (slug, name, description, is_system, default_layout_json)
values (
  'decathlon_bms',
  'Decathlon BMS Command Center',
  'Wieloobiektowy panel zarządczy BMS dla sieci sklepów — KPI, mapa, macierz sklepów, serwis, energia.',
  true,
  '{
    "version": 1,
    "sections": [
      {"id": "filters", "type": "filters", "visible": true},
      {"id": "kpi", "type": "kpi_row", "visible": true},
      {"id": "map", "type": "map", "visible": true, "height": 420},
      {"id": "matrix", "type": "store_matrix", "visible": true},
      {"id": "service", "type": "service_summary", "visible": true}
    ],
    "defaultFilters": {
      "period": "24h",
      "status": "all",
      "alarms": "all"
    }
  }'::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  default_layout_json = excluded.default_layout_json,
  updated_at = now();

-- ── Seed: katalog systemów ─────────────────────────────────────────────────

insert into public.viz_integrated_systems (code, name, sort_order) values
  ('bms', 'BMS', 10),
  ('hvac', 'HVAC', 20),
  ('rooftop', 'Rooftop', 30),
  ('air_conditioning', 'Klimatyzacja', 40),
  ('ventilation', 'Wentylacja', 50),
  ('heating', 'Ogrzewanie', 60),
  ('lighting', 'Oświetlenie', 70),
  ('energy_metering', 'Pomiar energii', 80),
  ('pv', 'PV', 90),
  ('energy_storage', 'Magazyn energii', 100),
  ('ev_chargers', 'Ładowarki EV', 110),
  ('reactive_power', 'Kompensator mocy biernej', 120),
  ('technical_alarms', 'Alarmy techniczne', 130),
  ('temperature_monitoring', 'Monitoring temperatury', 140),
  ('humidity_monitoring', 'Monitoring wilgotności', 150)
on conflict (code) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;

-- ── Seed: role semantyczne zmiennych ─────────────────────────────────────

insert into public.viz_variable_roles (code, name, default_unit, sort_order) values
  ('store_temperature', 'Temperatura sklepu', '°C', 10),
  ('store_setpoint', 'Setpoint temperatury', '°C', 20),
  ('outdoor_temperature', 'Temperatura zewnętrzna', '°C', 30),
  ('indoor_humidity', 'Wilgotność wewnętrzna', '%', 40),
  ('miniserver_online', 'Miniserver online', null, 50),
  ('system_error_count', 'Liczba błędów systemowych', null, 60),
  ('active_alarm_count', 'Liczba aktywnych alarmów', null, 70),
  ('hvac_status', 'Status HVAC', null, 80),
  ('lighting_status', 'Status oświetlenia', null, 90),
  ('energy_total', 'Energia całkowita', 'kWh', 100),
  ('energy_current_period', 'Energia bieżący okres', 'kWh', 110),
  ('active_power', 'Moc czynna', 'kW', 120),
  ('reactive_power', 'Moc bierna', 'kVAr', 130),
  ('power_factor', 'Współczynnik mocy', null, 140),
  ('pv_power', 'Moc PV', 'kW', 150),
  ('communication_status', 'Status komunikacji', null, 160)
on conflict (code) do update set
  name = excluded.name,
  default_unit = excluded.default_unit,
  sort_order = excluded.sort_order;
