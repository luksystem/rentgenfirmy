-- ═══════════════════════════════════════════════════════════════════════════
-- Moduł "Czas pracy" — centralna ewidencja czasu (Etap 2)
-- ═══════════════════════════════════════════════════════════════════════════

do $$ begin
  create type public.time_entry_status as enum (
    'draft',
    'submitted',
    'approved',
    'rejected',
    'locked'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.time_entry_created_from as enum (
    'manual',
    'timer',
    'plan',
    'mission',
    'leave',
    'import'
  );
exception
  when duplicate_object then null;
end $$;

-- ── Kategorie czasu ───────────────────────────────────────────────────────────
create table if not exists public.time_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  color text not null default '#64748b',
  icon text not null default 'clock',
  is_active boolean not null default true,
  sort_order int not null default 100,
  default_billable boolean not null default false,
  requires_project boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.time_categories (code, name, description, color, icon, sort_order, default_billable, requires_project)
values
  ('project', 'Projekt', 'Czas realizacji projektów klientów.', '#3b82f6', 'folder-kanban', 10, false, true),
  ('service', 'Serwis', 'Obsługa zgłoszeń, awarii i przeglądów.', '#f59e0b', 'wrench', 20, true, true),
  ('development', 'Rozwój', 'Praca nad aplikacją, standardami i szkoleniami.', '#8b5cf6', 'sparkles', 30, false, false),
  ('company', 'Firma', 'Spotkania, administracja i sprawy wewnętrzne.', '#64748b', 'building-2', 40, false, false)
on conflict (code) do nothing;

-- ── Typy wpisów ───────────────────────────────────────────────────────────────
create table if not exists public.time_entry_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  counts_as_work boolean not null default true,
  counts_as_absence boolean not null default false,
  allows_billable boolean not null default true,
  requires_description boolean not null default false,
  requires_project boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.time_entry_types (
  code, name, counts_as_work, counts_as_absence, allows_billable, requires_description, requires_project, sort_order
)
values
  ('work', 'Praca', true, false, true, false, false, 10),
  ('overtime', 'Nadgodziny', true, false, true, false, false, 20),
  ('leave', 'Urlop', false, true, false, false, false, 30),
  ('sick', 'Chorobowe', false, true, false, false, false, 40),
  ('delegation', 'Delegacja', true, false, true, true, false, 50),
  ('training', 'Szkolenie', true, false, false, true, false, 60),
  ('standby', 'Dyżur', true, false, true, false, false, 70),
  ('day_wrap', 'Odbiór dnia', false, false, false, false, false, 80),
  ('other', 'Inne', true, false, false, false, false, 90)
on conflict (code) do nothing;

-- ── Wpisy czasu ─────────────────────────────────────────────────────────────
create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  start_time time,
  end_time time,
  duration_minutes int not null check (duration_minutes > 0),
  break_minutes int not null default 0 check (break_minutes >= 0),
  category_id uuid not null references public.time_categories (id),
  entry_type_id uuid not null references public.time_entry_types (id),
  description text not null default '',
  billable boolean not null default false,
  project_id uuid references public.projects (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  process_stage_id uuid,
  work_item_id uuid references public.work_items (id) on delete set null,
  service_id uuid references public.services (id) on delete set null,
  mission_id uuid,
  remote_work boolean not null default false,
  delegation boolean not null default false,
  overtime_flag boolean not null default false,
  cost_rate_snapshot numeric(12, 2),
  client_rate_snapshot numeric(12, 2),
  status public.time_entry_status not null default 'draft',
  created_from public.time_entry_created_from not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists time_entries_user_date_idx
  on public.time_entries (user_id, date desc);

create index if not exists time_entries_project_idx
  on public.time_entries (project_id)
  where project_id is not null;

create index if not exists time_entries_status_idx
  on public.time_entries (status, date desc);

-- ── Audyt wpisów ──────────────────────────────────────────────────────────────
create table if not exists public.time_entry_logs (
  id uuid primary key default gen_random_uuid(),
  time_entry_id uuid not null references public.time_entries (id) on delete cascade,
  action text not null,
  user_id uuid references public.profiles (id) on delete set null,
  old_value jsonb,
  new_value jsonb,
  comment text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists time_entry_logs_entry_idx
  on public.time_entry_logs (time_entry_id, created_at desc);

-- ── RLS: odczyt dla zalogowanych, zapis przez API (service role) ────────────
alter table public.time_categories enable row level security;
alter table public.time_entry_types enable row level security;
alter table public.time_entries enable row level security;
alter table public.time_entry_logs enable row level security;

drop policy if exists time_categories_select on public.time_categories;
create policy time_categories_select
  on public.time_categories for select using (auth.uid() is not null);

drop policy if exists time_entry_types_select on public.time_entry_types;
create policy time_entry_types_select
  on public.time_entry_types for select using (auth.uid() is not null);

drop policy if exists time_entries_select on public.time_entries;
create policy time_entries_select
  on public.time_entries for select using (auth.uid() is not null);

drop policy if exists time_entry_logs_select on public.time_entry_logs;
create policy time_entry_logs_select
  on public.time_entry_logs for select using (auth.uid() is not null);
