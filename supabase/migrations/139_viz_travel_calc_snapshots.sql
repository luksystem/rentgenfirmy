-- ═══════════════════════════════════════════════════════════════════════════
-- Wizualizacje — kalkulator dojazdu serwisowego + snapshoty (Etap 4)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.viz_travel_calc_snapshots (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.viz_dashboards (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  label text,
  company_address text not null,
  client_address text not null,
  one_way_km numeric(10, 2) not null,
  trip_count integer not null default 1,
  zone integer not null default 0,
  car_km_cost numeric(12, 2) not null default 0,
  car_hours_cost numeric(12, 2) not null default 0,
  total_travel_cost numeric(12, 2) not null default 0,
  rates_json jsonb not null default '{}'::jsonb,
  zone_settings_json jsonb not null default '{}'::jsonb,
  input_json jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references public.profiles (id) on delete set null,
  created_by_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists viz_travel_calc_snapshots_dashboard_idx
  on public.viz_travel_calc_snapshots (dashboard_id, created_at desc);

create index if not exists viz_travel_calc_snapshots_project_idx
  on public.viz_travel_calc_snapshots (project_id, created_at desc);

alter table public.viz_travel_calc_snapshots enable row level security;

drop policy if exists viz_travel_calc_snapshots_select on public.viz_travel_calc_snapshots;
create policy viz_travel_calc_snapshots_select on public.viz_travel_calc_snapshots
  for select using (public.user_can_access_viz_dashboard(dashboard_id));

drop policy if exists viz_travel_calc_snapshots_write on public.viz_travel_calc_snapshots;
create policy viz_travel_calc_snapshots_write on public.viz_travel_calc_snapshots
  for all using (public.user_can_manage_viz_dashboard(dashboard_id))
  with check (public.user_can_manage_viz_dashboard(dashboard_id));
