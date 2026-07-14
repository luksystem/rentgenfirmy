-- ═══════════════════════════════════════════════════════════════════════════
-- Wizualizacje — reguły alarmów / progów per dashboard (Etap 5)
-- ═══════════════════════════════════════════════════════════════════════════

create type public.viz_alarm_condition as enum ('gt', 'gte', 'lt', 'lte', 'eq', 'neq');
create type public.viz_alarm_severity as enum ('warning', 'alarm');

create table if not exists public.viz_alarm_rules (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.viz_dashboards (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  role_code text not null references public.viz_variable_roles (code) on delete restrict,
  condition public.viz_alarm_condition not null default 'gt',
  threshold_numeric numeric not null,
  severity public.viz_alarm_severity not null default 'alarm',
  name text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists viz_alarm_rules_dashboard_idx
  on public.viz_alarm_rules (dashboard_id, is_active, sort_order);

alter table public.viz_alarm_rules enable row level security;

drop policy if exists viz_alarm_rules_select on public.viz_alarm_rules;
create policy viz_alarm_rules_select on public.viz_alarm_rules
  for select using (public.user_can_access_viz_dashboard(dashboard_id));

drop policy if exists viz_alarm_rules_write on public.viz_alarm_rules;
create policy viz_alarm_rules_write on public.viz_alarm_rules
  for all using (public.user_can_manage_viz_dashboard(dashboard_id))
  with check (public.user_can_manage_viz_dashboard(dashboard_id));
