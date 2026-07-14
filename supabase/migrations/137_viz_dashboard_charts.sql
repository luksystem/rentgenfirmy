-- ═══════════════════════════════════════════════════════════════════════════
-- Wizualizacje — konfigurowalne wykresy dashboardu (Etap 3)
-- ═══════════════════════════════════════════════════════════════════════════

create type public.viz_chart_type as enum ('line', 'area', 'bar', 'mixed');

create table if not exists public.viz_dashboard_charts (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.viz_dashboards (id) on delete cascade,
  name text not null,
  description text,
  chart_type public.viz_chart_type not null default 'line',
  config_json jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_widget boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists viz_dashboard_charts_dashboard_idx
  on public.viz_dashboard_charts (dashboard_id, sort_order);

alter table public.viz_dashboard_charts enable row level security;

drop policy if exists viz_dashboard_charts_select on public.viz_dashboard_charts;
create policy viz_dashboard_charts_select on public.viz_dashboard_charts
  for select using (public.user_can_access_viz_dashboard(dashboard_id));

drop policy if exists viz_dashboard_charts_write on public.viz_dashboard_charts;
create policy viz_dashboard_charts_write on public.viz_dashboard_charts
  for all using (public.user_can_manage_viz_dashboard(dashboard_id))
  with check (public.user_can_manage_viz_dashboard(dashboard_id));
