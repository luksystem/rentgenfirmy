-- ═══════════════════════════════════════════════════════════════════════════
-- Moduł "Moja praca" → Etap 2: plany pracy, przeszkody, podsumowania, sesje dnia
-- ═══════════════════════════════════════════════════════════════════════════

do $$ begin
  create type public.work_plan_period_type as enum ('day', 'week');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.work_plan_status as enum ('draft', 'sent', 'acknowledged', 'active', 'closed');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.work_obstacle_status as enum ('open', 'in_review', 'resolved', 'dismissed');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.work_obstacle_severity as enum ('low', 'medium', 'high', 'critical');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.work_summary_period_type as enum ('day', 'week');
exception
  when duplicate_object then null;
end $$;

-- ── Plany pracy (dzień / tydzień) ────────────────────────────────────────────
create table if not exists public.work_plans (
  id uuid primary key default gen_random_uuid(),
  period_type public.work_plan_period_type not null,
  date_from date not null,
  date_to date not null,
  assigned_user_id uuid not null references public.profiles (id) on delete cascade,
  manager_id uuid references public.profiles (id) on delete set null,
  status public.work_plan_status not null default 'draft',
  sent_at timestamptz,
  acknowledged_at timestamptz,
  manager_comment text not null default '',
  acknowledgement_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists work_plans_assigned_period_idx
  on public.work_plans (assigned_user_id, period_type, date_from desc);
create index if not exists work_plans_manager_status_idx
  on public.work_plans (manager_id, status) where manager_id is not null;

create unique index if not exists work_plans_day_user_uidx
  on public.work_plans (assigned_user_id, date_from)
  where period_type = 'day';

create unique index if not exists work_plans_week_user_range_uidx
  on public.work_plans (assigned_user_id, date_from, date_to)
  where period_type = 'week';

-- ── Pozycje planu ─────────────────────────────────────────────────────────────
create table if not exists public.work_plan_items (
  id uuid primary key default gen_random_uuid(),
  work_plan_id uuid not null references public.work_plans (id) on delete cascade,
  work_item_id uuid not null references public.work_items (id) on delete cascade,
  assigned_user_id uuid not null references public.profiles (id) on delete cascade,
  planned_date date not null,
  sort_order int not null default 0,
  manager_comment text not null default '',
  carried_over boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists work_plan_items_plan_idx
  on public.work_plan_items (work_plan_id, sort_order);
create index if not exists work_plan_items_item_idx
  on public.work_plan_items (work_item_id);

create unique index if not exists work_plan_items_plan_item_uidx
  on public.work_plan_items (work_plan_id, work_item_id);

-- ── Potwierdzenia planu tygodnia ──────────────────────────────────────────────
create table if not exists public.work_plan_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  work_plan_id uuid not null references public.work_plans (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  comment text not null default '',
  risk_notes text not null default '',
  accepted_without_reservations boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists work_plan_acknowledgements_plan_user_uidx
  on public.work_plan_acknowledgements (work_plan_id, user_id);

-- ── Przeszkody organizacyjne ─────────────────────────────────────────────────
create table if not exists public.work_obstacles (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid references public.work_items (id) on delete set null,
  work_plan_id uuid references public.work_plans (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  reported_by_id uuid not null references public.profiles (id) on delete cascade,
  assigned_to_id uuid references public.profiles (id) on delete set null,
  obstacle_type text not null default 'other',
  description text not null default '',
  status public.work_obstacle_status not null default 'open',
  severity public.work_obstacle_severity not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists work_obstacles_assigned_status_idx
  on public.work_obstacles (assigned_to_id, status) where assigned_to_id is not null;
create index if not exists work_obstacles_item_idx
  on public.work_obstacles (work_item_id) where work_item_id is not null;

-- ── Podsumowania dnia / tygodnia ───────────────────────────────────────────────
create table if not exists public.work_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  period_type public.work_summary_period_type not null,
  date_from date not null,
  date_to date not null,
  work_plan_id uuid references public.work_plans (id) on delete set null,
  employee_comment text not null default '',
  ai_draft text not null default '',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists work_summaries_user_day_uidx
  on public.work_summaries (user_id, date_from)
  where period_type = 'day';

-- ── Sesje dnia (rozpoczęcie / zakończenie pracy) ─────────────────────────────
create table if not exists public.work_day_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_date date not null,
  work_plan_id uuid references public.work_plans (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  start_confirmed boolean not null default false,
  end_submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists work_day_sessions_user_date_uidx
  on public.work_day_sessions (user_id, session_date);

-- ── RLS: odczyt dla zalogowanych, zapis przez API ───────────────────────────
alter table public.work_plans enable row level security;
alter table public.work_plan_items enable row level security;
alter table public.work_plan_acknowledgements enable row level security;
alter table public.work_obstacles enable row level security;
alter table public.work_summaries enable row level security;
alter table public.work_day_sessions enable row level security;

drop policy if exists work_plans_select on public.work_plans;
create policy work_plans_select on public.work_plans for select using (auth.uid() is not null);

drop policy if exists work_plan_items_select on public.work_plan_items;
create policy work_plan_items_select on public.work_plan_items for select using (auth.uid() is not null);

drop policy if exists work_plan_acknowledgements_select on public.work_plan_acknowledgements;
create policy work_plan_acknowledgements_select
  on public.work_plan_acknowledgements for select using (auth.uid() is not null);

drop policy if exists work_obstacles_select on public.work_obstacles;
create policy work_obstacles_select on public.work_obstacles for select using (auth.uid() is not null);

drop policy if exists work_summaries_select on public.work_summaries;
create policy work_summaries_select on public.work_summaries for select using (auth.uid() is not null);

drop policy if exists work_day_sessions_select on public.work_day_sessions;
create policy work_day_sessions_select on public.work_day_sessions for select using (auth.uid() is not null);
