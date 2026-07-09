-- ═══════════════════════════════════════════════════════════════════════════
-- Tablica Celów (moduł "Przestrzenie") — Faza 0: fundament danych.
-- Cele firmy/zespołu/osoby, wiele tablic per typ, metodologie, KPI, przeglądy,
-- rozliczenia, cykliczność, powiązania (projekt/klient/proces/etap/kamień
-- milowy) oraz przygotowanie pod AI i przyszłe rozszerzenia (zadania, problemy).
-- Patrz: docs/cele/mvp/ARCHITEKTURA.md
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Katalog typów tablic (table-driven, nie enum — łatwe dodawanie typów) ────
create table if not exists public.goal_board_kinds (
  code text primary key,
  label text not null,
  description text not null default '',
  icon text not null default 'target',
  visibility text not null default 'all' check (visibility in ('all', 'admin_only')),
  sort_order int not null default 100,
  is_active boolean not null default true
);

insert into public.goal_board_kinds (code, label, description, icon, visibility, sort_order) values
  ('sales', 'Cele sprzedażowe', 'Cele dotyczące przychodów, liczby ofert i konwersji.', 'trending-up', 'all', 10),
  ('project', 'Cele projektowe', 'Cele dotyczące realizacji, terminów i jakości projektów.', 'folder-kanban', 'all', 20),
  ('service', 'Cele serwisowe', 'Cele dotyczące obsługi serwisowej i SLA.', 'wrench', 'all', 30),
  ('quality', 'Cele jakości', 'Cele dotyczące jakości wykonania i standardów.', 'badge-check', 'all', 40),
  ('development', 'Cele rozwojowe', 'Cele dotyczące rozwoju organizacji i kompetencji.', 'sprout', 'all', 50),
  ('financial', 'Cele finansowe', 'Cele dotyczące kosztów, marż i wyniku finansowego.', 'circle-dollar-sign', 'all', 60),
  ('executive', 'Cele zarządu', 'Cele strategiczne zarządu — widoczne tylko dla administratorów.', 'crown', 'admin_only', 70),
  ('marketing', 'Cele marketingowe', 'Cele dotyczące marki, leadów i komunikacji.', 'megaphone', 'all', 80),
  ('training', 'Cele szkoleniowe', 'Cele dotyczące szkoleń i rozwoju kompetencji zespołu.', 'graduation-cap', 'all', 90)
on conflict (code) do nothing;

-- ── Tablice celów — wiele instancji per typ ─────────────────────────────────
create table if not exists public.goal_boards (
  id uuid primary key default gen_random_uuid(),
  kind text not null references public.goal_board_kinds (code),
  name text not null,
  description text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goal_boards_kind_idx on public.goal_boards (kind);

-- ── Biblioteka metodologii ────────────────────────────────────────────────────
create table if not exists public.goal_methodologies (
  code text primary key,
  name text not null,
  short_description text not null default '',
  purpose text not null default '',
  when_to_use text not null default '',
  when_not_to_use text not null default '',
  structure_md text not null default '',
  example_md text not null default '',
  best_practices_md text not null default '',
  common_mistakes_md text not null default '',
  field_schema jsonb not null default '[]'::jsonb,
  schema_version int not null default 1,
  is_active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Cel ────────────────────────────────────────────────────────────────────────
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.goal_boards (id) on delete cascade,
  level text not null check (level in ('company', 'team', 'individual')),
  name text not null,
  description text not null default '',
  owner_id uuid references public.profiles (id) on delete set null,

  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'critical')),
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'at_risk', 'on_hold', 'settled', 'cancelled')),

  period_type text not null check (period_type in ('daily', 'weekly', 'monthly', 'quarterly', 'annual')),
  period_start date not null,
  period_end date not null,

  progress_percent numeric not null default 0 check (progress_percent between 0 and 100),

  methodology_id text references public.goal_methodologies (code),
  methodology_fields jsonb not null default '{}'::jsonb,

  is_recurring boolean not null default false,
  recurrence_parent_id uuid references public.goals (id) on delete set null,
  recurrence_root_id uuid references public.goals (id) on delete set null,

  parent_goal_id uuid references public.goals (id) on delete set null,

  project_id uuid references public.projects (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  process_stage_id uuid references public.process_stages (id) on delete set null,
  process_milestone_id uuid references public.process_milestones (id) on delete set null,

  settlement_status text check (settlement_status in ('achieved', 'partially_achieved', 'not_achieved')),
  settlement_what_worked text,
  settlement_what_failed text,
  settlement_conclusions text,
  settled_at timestamptz,
  settled_by uuid references public.profiles (id) on delete set null,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_board_idx on public.goals (board_id, status);
create index if not exists goals_owner_idx on public.goals (owner_id);
create index if not exists goals_project_idx on public.goals (project_id) where project_id is not null;
create index if not exists goals_period_idx on public.goals (period_type, period_end);
create index if not exists goals_recurrence_root_idx on public.goals (recurrence_root_id) where recurrence_root_id is not null;
create index if not exists goals_settlement_status_idx on public.goals (settlement_status) where settlement_status is not null;

-- ── Osoby zaangażowane ─────────────────────────────────────────────────────────
create table if not exists public.goal_participants (
  goal_id uuid not null references public.goals (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'contributor' check (role in ('contributor', 'reviewer')),
  primary key (goal_id, profile_id)
);

-- ── KPI ──────────────────────────────────────────────────────────────────────────
create table if not exists public.goal_kpis (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  name text not null,
  unit text not null default '',
  target_value numeric,
  current_value numeric not null default 0,
  source text not null default 'manual' check (source in ('manual', 'system')),
  position int not null default 0
);

create index if not exists goal_kpis_goal_idx on public.goal_kpis (goal_id, position);

-- ── Historia zmian (audit log per cel) ────────────────────────────────────────
create table if not exists public.goal_updates (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  previous_progress numeric,
  new_progress numeric,
  previous_status text,
  new_status text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists goal_updates_goal_idx on public.goal_updates (goal_id, created_at desc);

-- ── Komentarze ──────────────────────────────────────────────────────────────────
create table if not exists public.goal_comments (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists goal_comments_goal_idx on public.goal_comments (goal_id, created_at);

-- ── Przeglądy okresowe ────────────────────────────────────────────────────────
create table if not exists public.goal_reviews (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  scheduled_at date not null,
  requires_action boolean not null default true,
  completed_at timestamptz,
  closed_by uuid references public.profiles (id) on delete set null,
  outcome text check (outcome in ('on_track', 'at_risk', 'off_track')),
  progress_snapshot numeric,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists goal_reviews_upcoming_idx
  on public.goal_reviews (goal_id, scheduled_at) where completed_at is null;

-- ── Proponowane inicjatywy/zadania/zasoby/budżet (bez automatycznej konwersji) ─
create table if not exists public.goal_initiatives (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  kind text not null check (kind in ('initiative', 'task', 'resource', 'budget')),
  title text not null,
  description text not null default '',
  estimated_value numeric,
  estimated_unit text,
  status text not null default 'proposed' check (status in ('proposed', 'accepted', 'rejected', 'converted')),
  converted_task_id uuid,
  source text not null default 'manual' check (source in ('ai', 'manual')),
  created_at timestamptz not null default now()
);

create index if not exists goal_initiatives_goal_idx on public.goal_initiatives (goal_id);

-- ── Powiązania polimorficzne (zadania Kanban, przyszłe problemy, dokumenty) ────
create table if not exists public.goal_links (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  linked_type text not null check (linked_type in ('kanban_task', 'problem', 'document')),
  linked_id uuid not null,
  created_at timestamptz not null default now(),
  unique (goal_id, linked_type, linked_id)
);

create index if not exists goal_links_goal_idx on public.goal_links (goal_id);

-- ── Audyt sugestii AI (nawet nieprzyjętych) ────────────────────────────────────
create table if not exists public.goal_ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references public.goals (id) on delete cascade,
  trigger text not null default 'create' check (trigger in ('create', 'review', 'manual')),
  input_description text not null,
  suggested_methodology_code text references public.goal_methodologies (code),
  justification text,
  alternatives jsonb not null default '[]'::jsonb,
  structure jsonb not null default '{}'::jsonb,
  vague_warning text,
  accepted boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists goal_ai_suggestions_goal_idx on public.goal_ai_suggestions (goal_id) where goal_id is not null;

-- ── RLS ──────────────────────────────────────────────────────────────────────────
alter table public.goal_board_kinds enable row level security;
alter table public.goal_boards enable row level security;
alter table public.goal_methodologies enable row level security;
alter table public.goals enable row level security;
alter table public.goal_participants enable row level security;
alter table public.goal_kpis enable row level security;
alter table public.goal_updates enable row level security;
alter table public.goal_comments enable row level security;
alter table public.goal_reviews enable row level security;
alter table public.goal_initiatives enable row level security;
alter table public.goal_links enable row level security;
alter table public.goal_ai_suggestions enable row level security;

drop policy if exists "goal_board_kinds_select" on public.goal_board_kinds;
create policy "goal_board_kinds_select" on public.goal_board_kinds for select using (true);
drop policy if exists "goal_board_kinds_admin_write" on public.goal_board_kinds;
create policy "goal_board_kinds_admin_write" on public.goal_board_kinds for all
  using (public.is_administrator()) with check (public.is_administrator());

drop policy if exists "goal_methodologies_select" on public.goal_methodologies;
create policy "goal_methodologies_select" on public.goal_methodologies for select using (true);
drop policy if exists "goal_methodologies_admin_write" on public.goal_methodologies;
create policy "goal_methodologies_admin_write" on public.goal_methodologies for all
  using (public.is_administrator()) with check (public.is_administrator());

drop policy if exists "goal_boards_select" on public.goal_boards;
create policy "goal_boards_select" on public.goal_boards for select using (
  exists (
    select 1 from public.goal_board_kinds k
    where k.code = goal_boards.kind
      and (k.visibility = 'all' or public.is_administrator())
  )
);
drop policy if exists "goal_boards_insert" on public.goal_boards;
create policy "goal_boards_insert" on public.goal_boards for insert with check (true);
drop policy if exists "goal_boards_update" on public.goal_boards;
create policy "goal_boards_update" on public.goal_boards for update using (true) with check (true);
drop policy if exists "goal_boards_delete" on public.goal_boards;
create policy "goal_boards_delete" on public.goal_boards for delete using (true);

drop policy if exists "goals_select" on public.goals;
create policy "goals_select" on public.goals for select using (
  exists (
    select 1 from public.goal_boards b
    join public.goal_board_kinds k on k.code = b.kind
    where b.id = goals.board_id
      and (k.visibility = 'all' or public.is_administrator())
  )
);
drop policy if exists "goals_write" on public.goals;
create policy "goals_write" on public.goals for all using (true) with check (true);

do $$
declare t text;
begin
  foreach t in array array[
    'goal_participants', 'goal_kpis', 'goal_updates', 'goal_comments',
    'goal_reviews', 'goal_initiatives', 'goal_links', 'goal_ai_suggestions'
  ] loop
    execute format('drop policy if exists %I on public.%I;', t || '_all', t);
    execute format('create policy %I on public.%I for all using (true) with check (true);', t || '_all', t);
  end loop;
end $$;

-- ── Powiadomienia — rozszerzenie istniejącego katalogu kind (zachowujemy pełną
-- listę wprowadzoną w poprzednich migracjach, patrz 085_inspection_billing.sql) ──
alter table public.user_notifications drop constraint if exists user_notifications_kind_check;
alter table public.user_notifications add constraint user_notifications_kind_check
  check (kind in (
    'kanban_mention',
    'kanban_new_activity',
    'warranty_expiring',
    'agreement_client_created',
    'client_stage_rating',
    'service_intake_preliminary_offer',
    'inspection_billing_due',
    'goal_review_due',
    'goal_period_ending',
    'goal_at_risk',
    'goal_recurring_created'
  ));
