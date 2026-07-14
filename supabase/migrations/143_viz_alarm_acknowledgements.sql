-- ═══════════════════════════════════════════════════════════════════════════
-- Wizualizacje — potwierdzanie aktywnych alarmów (Etap 9)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.viz_alarm_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.viz_dashboards (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  rule_id uuid not null references public.viz_alarm_rules (id) on delete cascade,
  acknowledged_by uuid not null references public.profiles (id) on delete restrict,
  acknowledged_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now(),
  unique (dashboard_id, project_id, rule_id)
);

create index if not exists viz_alarm_ack_dashboard_idx
  on public.viz_alarm_acknowledgements (dashboard_id, acknowledged_at desc);

alter table public.viz_alarm_acknowledgements enable row level security;

drop policy if exists viz_alarm_ack_select on public.viz_alarm_acknowledgements;
create policy viz_alarm_ack_select on public.viz_alarm_acknowledgements
  for select using (public.user_can_access_viz_dashboard(dashboard_id));

drop policy if exists viz_alarm_ack_write on public.viz_alarm_acknowledgements;
create policy viz_alarm_ack_write on public.viz_alarm_acknowledgements
  for all using (public.user_can_access_viz_dashboard(dashboard_id))
  with check (public.user_can_access_viz_dashboard(dashboard_id));
