-- Uruchom w Supabase: SQL Editor → New query → Run

create extension if not exists "pgcrypto";

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  location text not null default '',
  email text not null default '',
  phone text not null default '',
  notes text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  flow_status text not null,
  is_active boolean not null default false,
  stage text not null,
  priority text not null,
  next_step_owner text not null,
  next_contact_date date not null,
  blocker_reason text,
  notes text,
  last_changed_by text not null,
  last_changed_at timestamptz not null default now(),
  last_contact_date date not null,
  close_blocker text,
  remaining_hours numeric,
  next_action text,
  close_deadline date,
  waiting_depends_on_us boolean not null default false,
  waiting_increases_cost_later boolean not null default false,
  waiting_blocks_settlement boolean not null default false,
  client_id uuid references public.clients (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.interruptions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  person text not null,
  type text not null default '',
  project_id uuid references public.projects (id) on delete set null,
  description text not null default '',
  was_necessary boolean not null default false,
  is_recurring boolean not null default false,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  kind text not null default 'interruption' check (kind in ('interruption', 'focus')),
  created_at timestamptz not null default now()
);

create index if not exists projects_flow_status_idx on public.projects (flow_status);
create index if not exists projects_type_idx on public.projects (type);
create index if not exists projects_priority_idx on public.projects (priority);
create index if not exists interruptions_date_idx on public.interruptions (date);
create index if not exists interruptions_project_id_idx on public.interruptions (project_id);
create index if not exists interruptions_kind_idx on public.interruptions (kind);

create table if not exists public.app_settings (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  status text not null,
  service_type text not null,
  title text not null,
  client_full_name text not null default '',
  client_location text not null default '',
  client_email text not null default '',
  client_phone text not null default '',
  rates jsonb not null,
  discounts jsonb not null,
  estimate_discounts jsonb,
  actual_discounts jsonb,
  zone_settings jsonb not null,
  detailed_settlement boolean not null default false,
  estimate jsonb not null,
  actual jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists services_status_idx on public.services (status);
create index if not exists services_created_at_idx on public.services (created_at desc);
create index if not exists services_project_id_idx on public.services (project_id);

alter table public.projects enable row level security;
alter table public.interruptions enable row level security;
alter table public.app_settings enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;

-- Tymczasowe polityki bez logowania (MVP wewnętrzne).
-- Po dodaniu auth zamień na polityki oparte o auth.uid().
drop policy if exists "projects_select_all" on public.projects;
drop policy if exists "projects_insert_all" on public.projects;
drop policy if exists "projects_update_all" on public.projects;
drop policy if exists "projects_delete_all" on public.projects;
drop policy if exists "interruptions_select_all" on public.interruptions;
drop policy if exists "interruptions_insert_all" on public.interruptions;
drop policy if exists "interruptions_update_all" on public.interruptions;
drop policy if exists "interruptions_delete_all" on public.interruptions;
drop policy if exists "app_settings_select_all" on public.app_settings;
drop policy if exists "app_settings_insert_all" on public.app_settings;
drop policy if exists "app_settings_update_all" on public.app_settings;
drop policy if exists "app_settings_delete_all" on public.app_settings;
drop policy if exists "services_select_all" on public.services;
drop policy if exists "services_insert_all" on public.services;
drop policy if exists "services_update_all" on public.services;
drop policy if exists "services_delete_all" on public.services;

create policy "projects_select_all" on public.projects for select using (true);
create policy "projects_insert_all" on public.projects for insert with check (true);
create policy "projects_update_all" on public.projects for update using (true);
create policy "projects_delete_all" on public.projects for delete using (true);

create policy "interruptions_select_all" on public.interruptions for select using (true);
create policy "interruptions_insert_all" on public.interruptions for insert with check (true);
create policy "interruptions_update_all" on public.interruptions for update using (true);
create policy "interruptions_delete_all" on public.interruptions for delete using (true);

create policy "app_settings_select_all" on public.app_settings for select using (true);
create policy "app_settings_insert_all" on public.app_settings for insert with check (true);
create policy "app_settings_update_all" on public.app_settings for update using (true);
create policy "app_settings_delete_all" on public.app_settings for delete using (true);

create policy "services_select_all" on public.services for select using (true);
create policy "services_insert_all" on public.services for insert with check (true);
create policy "services_update_all" on public.services for update using (true);
create policy "services_delete_all" on public.services for delete using (true);

drop policy if exists "clients_select_all" on public.clients;
drop policy if exists "clients_insert_all" on public.clients;
drop policy if exists "clients_update_all" on public.clients;
drop policy if exists "clients_delete_all" on public.clients;

create policy "clients_select_all" on public.clients for select using (true);
create policy "clients_insert_all" on public.clients for insert with check (true);
create policy "clients_update_all" on public.clients for update using (true);
create policy "clients_delete_all" on public.clients for delete using (true);
