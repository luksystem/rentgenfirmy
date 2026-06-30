-- Integracje techniczne projektów (Loxone, BMS, …) + telemetria + audit

create table if not exists public.project_integrations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  integration_type text not null check (
    integration_type in ('loxone', 'modbus_gateway', 'bms_api', 'other')
  ),
  name text not null,
  connection_method text not null check (
    connection_method in ('vpn', 'local_gateway', 'remote_connect', 'cloud', 'api')
  ),
  api_url text,
  port integer,
  login_username text,
  is_active boolean not null default true,
  technical_notes text,
  config_json jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  created_by_user_id uuid references public.profiles (id) on delete set null,
  created_by_name text not null,
  updated_by_user_id uuid references public.profiles (id) on delete set null,
  updated_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_integrations_project_idx
  on public.project_integrations (project_id, created_at desc);

create index if not exists project_integrations_active_idx
  on public.project_integrations (is_active, last_sync_at)
  where is_active = true;

create table if not exists public.project_integration_secrets (
  integration_id uuid primary key references public.project_integrations (id) on delete cascade,
  password_ciphertext text not null,
  password_iv text not null,
  password_tag text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.project_telemetry (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  integration_id uuid not null references public.project_integrations (id) on delete cascade,
  temperature numeric,
  humidity numeric,
  setpoint numeric,
  alarm_status text,
  online_status boolean not null default false,
  source_name text,
  measured_at timestamptz not null default now(),
  raw_payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists project_telemetry_project_measured_idx
  on public.project_telemetry (project_id, measured_at desc);

create index if not exists project_telemetry_integration_measured_idx
  on public.project_telemetry (integration_id, measured_at desc);

create table if not exists public.project_integration_audit_log (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid references public.project_integrations (id) on delete set null,
  project_id uuid not null references public.projects (id) on delete cascade,
  action text not null check (
    action in (
      'created',
      'updated',
      'deleted',
      'test_connection',
      'sync_success',
      'sync_failure'
    )
  ),
  actor_user_id uuid references public.profiles (id) on delete set null,
  actor_name text not null,
  changes_json jsonb not null default '{}'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists project_integration_audit_project_idx
  on public.project_integration_audit_log (project_id, created_at desc);

alter table public.project_integrations enable row level security;
alter table public.project_integration_secrets enable row level security;
alter table public.project_telemetry enable row level security;
alter table public.project_integration_audit_log enable row level security;

-- Brak polityk RLS — dostęp wyłącznie przez service role (API serwerowe).
