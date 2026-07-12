-- ═══════════════════════════════════════════════════════════════════════════
-- Moduł "Moja praca" → Zadania: warstwa wewnętrznych zleceń (work_items)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Katalog typów źródeł (table-driven) ─────────────────────────────────────
create table if not exists public.work_item_source_types (
  code text primary key,
  label text not null,
  module_label text not null default '',
  icon text not null default 'list-todo',
  is_active boolean not null default true,
  sort_order int not null default 100
);

insert into public.work_item_source_types (code, label, module_label, icon, sort_order) values
  ('manual', 'Zadanie ręczne', 'Moja praca', 'pen-line', 10),
  ('kanban_task', 'Tablica wdrożeń', 'Proces projektu', 'layout-kanban', 20)
on conflict (code) do nothing;

-- ── Statusy workflow ────────────────────────────────────────────────────────
do $$ begin
  create type public.work_item_status as enum (
    'draft',
    'planned',
    'sent',
    'pending_ack',
    'accepted',
    'needs_clarification',
    'risk_reported',
    'in_progress',
    'blocked',
    'done',
    'pending_verification',
    'verified',
    'not_done',
    'deferred',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.work_item_priority as enum (
    'low',
    'normal',
    'high',
    'urgent'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.work_item_acceptance_action as enum (
    'accept',
    'needs_clarification',
    'report_shortage',
    'report_risk',
    'cannot_complete',
    'propose_reschedule'
  );
exception
  when duplicate_object then null;
end $$;

-- ── Koperta wewnętrznego zlecenia ───────────────────────────────────────────
create table if not exists public.work_items (
  id uuid primary key default gen_random_uuid(),
  source_type text not null references public.work_item_source_types (code),
  source_id uuid,
  project_id uuid references public.projects (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  process_stage_id uuid,
  assigned_user_id uuid not null references public.profiles (id) on delete cascade,
  created_by_id uuid references public.profiles (id) on delete set null,
  manager_id uuid references public.profiles (id) on delete set null,
  parent_work_item_id uuid references public.work_items (id) on delete set null,
  title text not null default '',
  description text not null default '',
  expected_result text not null default '',
  completion_criteria text not null default '',
  required_materials text not null default '',
  required_info text not null default '',
  dependencies jsonb not null default '[]'::jsonb,
  planned_start date,
  planned_end date,
  due_date date,
  estimated_minutes int,
  priority public.work_item_priority not null default 'normal',
  status public.work_item_status not null default 'draft',
  blocked_reason text not null default '',
  sent_at timestamptz,
  last_acceptance_at timestamptz,
  accepted_without_reservations boolean not null default false,
  completed_at timestamptz,
  verified_at timestamptz,
  verified_by_id uuid references public.profiles (id) on delete set null,
  ai_generated boolean not null default false,
  ai_suggestion_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists work_items_assigned_status_due_idx
  on public.work_items (assigned_user_id, status, due_date);
create index if not exists work_items_manager_status_idx
  on public.work_items (manager_id, status);
create index if not exists work_items_source_idx
  on public.work_items (source_type, source_id);
create index if not exists work_items_project_idx
  on public.work_items (project_id) where project_id is not null;

-- Jedna aktywna koperta na źródło + osobę (bez duplikatów)
create unique index if not exists work_items_active_source_assignee_uidx
  on public.work_items (source_type, source_id, assigned_user_id)
  where source_id is not null
    and status not in ('verified', 'cancelled', 'not_done');

-- ── Osoby wspierające ───────────────────────────────────────────────────────
create table if not exists public.work_item_supporting_users (
  work_item_id uuid not null references public.work_items (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (work_item_id, user_id)
);

create index if not exists work_item_supporting_users_user_idx
  on public.work_item_supporting_users (user_id);

-- ── Zdarzenia przyjęcia (audyt) ─────────────────────────────────────────────
create table if not exists public.work_item_acceptances (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.work_items (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  action public.work_item_acceptance_action not null,
  comment text not null default '',
  due_date_at_acceptance date,
  accepted_without_reservations boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists work_item_acceptances_item_idx
  on public.work_item_acceptances (work_item_id, created_at desc);

-- ── Historia aktywności ─────────────────────────────────────────────────────
create table if not exists public.work_item_logs (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.work_items (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists work_item_logs_item_idx
  on public.work_item_logs (work_item_id, created_at desc);

-- ── Komentarze ────────────────────────────────────────────────────────────────
create table if not exists public.work_item_comments (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.work_items (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists work_item_comments_item_idx
  on public.work_item_comments (work_item_id, created_at);

-- ── Załączniki ────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('work-item-attachments', 'work-item-attachments', false, 26214400)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

create table if not exists public.work_item_attachments (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.work_items (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint,
  uploaded_by_id uuid references public.profiles (id) on delete set null,
  uploaded_by_name text not null default '',
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists work_item_attachments_item_idx
  on public.work_item_attachments (work_item_id, position);

-- ── RLS: odczyt dla zalogowanych, zapis przez API (service role) ────────────
alter table public.work_item_source_types enable row level security;
alter table public.work_items enable row level security;
alter table public.work_item_supporting_users enable row level security;
alter table public.work_item_acceptances enable row level security;
alter table public.work_item_logs enable row level security;
alter table public.work_item_comments enable row level security;
alter table public.work_item_attachments enable row level security;

drop policy if exists work_item_source_types_select on public.work_item_source_types;
create policy work_item_source_types_select
  on public.work_item_source_types for select using (auth.uid() is not null);

drop policy if exists work_items_select on public.work_items;
create policy work_items_select on public.work_items for select using (auth.uid() is not null);

drop policy if exists work_item_supporting_users_select on public.work_item_supporting_users;
create policy work_item_supporting_users_select
  on public.work_item_supporting_users for select using (auth.uid() is not null);

drop policy if exists work_item_acceptances_select on public.work_item_acceptances;
create policy work_item_acceptances_select
  on public.work_item_acceptances for select using (auth.uid() is not null);

drop policy if exists work_item_logs_select on public.work_item_logs;
create policy work_item_logs_select on public.work_item_logs for select using (auth.uid() is not null);

drop policy if exists work_item_comments_select on public.work_item_comments;
create policy work_item_comments_select on public.work_item_comments for select using (auth.uid() is not null);

drop policy if exists work_item_attachments_select on public.work_item_attachments;
create policy work_item_attachments_select on public.work_item_attachments for select using (auth.uid() is not null);
