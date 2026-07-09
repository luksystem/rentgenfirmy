-- ═══════════════════════════════════════════════════════════════════════════
-- Plan Zasobów — Etap 4: elementy planu (MVP: Gantt/RTM, kalendarz, lista, dashboard).
-- process_stage_id NIE ma twardego FK — etapy na projekcie żyją w zamrożonym
-- template_snapshot (JSONB) i po edycji żywego szablonu mogą zniknąć z
-- process_stages, tak jak project_process_items.template_item_id (migracja 017).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.resource_plan_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  process_stage_id uuid,
  task_id uuid references public.process_kanban_tasks (id) on delete set null,
  service_intake_request_id uuid references public.service_intake_requests (id) on delete set null,
  work_type_item_id uuid references public.resource_dictionary_items (id) on delete set null,
  title text not null default '',
  start_at timestamptz not null,
  end_at timestamptz not null,
  planned_hours numeric,
  actual_hours numeric,
  assignee_id uuid references public.profiles (id) on delete set null,
  team_item_id uuid references public.resource_dictionary_items (id) on delete set null,
  status_item_id uuid references public.resource_dictionary_items (id) on delete set null,
  risk_item_id uuid references public.resource_dictionary_items (id) on delete set null,
  risk_note text not null default '',
  labor_budget numeric,
  material_budget numeric,
  travel_budget numeric,
  notes text not null default '',
  accepted_risk boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at >= start_at)
);

create index if not exists resource_plan_items_project_idx on public.resource_plan_items (project_id);
create index if not exists resource_plan_items_assignee_idx on public.resource_plan_items (assignee_id, start_at, end_at);
create index if not exists resource_plan_items_team_idx on public.resource_plan_items (team_item_id, start_at, end_at);
create index if not exists resource_plan_items_stage_idx on public.resource_plan_items (process_stage_id);
create index if not exists resource_plan_items_range_idx on public.resource_plan_items (start_at, end_at);

-- ── Osoby zaangażowane (poza osobą odpowiedzialną) ───────────────────────────
create table if not exists public.resource_plan_item_participants (
  id uuid primary key default gen_random_uuid(),
  plan_item_id uuid not null references public.resource_plan_items (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_item_id uuid references public.resource_dictionary_items (id) on delete set null,
  is_lead boolean not null default false,
  created_at timestamptz not null default now(),
  unique (plan_item_id, user_id)
);

create index if not exists resource_plan_item_participants_item_idx
  on public.resource_plan_item_participants (plan_item_id);
create index if not exists resource_plan_item_participants_user_idx
  on public.resource_plan_item_participants (user_id);

-- ── RLS: odczyt dla zalogowanych, zapis dla administrator/manager (koordynatorzy) ─
alter table public.resource_plan_items enable row level security;
alter table public.resource_plan_item_participants enable row level security;

drop policy if exists resource_plan_items_select on public.resource_plan_items;
create policy resource_plan_items_select
  on public.resource_plan_items for select
  using (auth.uid() is not null);

drop policy if exists resource_plan_items_write on public.resource_plan_items;
create policy resource_plan_items_write
  on public.resource_plan_items for all
  using (public.has_full_app_access())
  with check (public.has_full_app_access());

drop policy if exists resource_plan_item_participants_select on public.resource_plan_item_participants;
create policy resource_plan_item_participants_select
  on public.resource_plan_item_participants for select
  using (auth.uid() is not null);

drop policy if exists resource_plan_item_participants_write on public.resource_plan_item_participants;
create policy resource_plan_item_participants_write
  on public.resource_plan_item_participants for all
  using (public.has_full_app_access())
  with check (public.has_full_app_access());
