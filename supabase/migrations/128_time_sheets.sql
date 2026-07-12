-- ═══════════════════════════════════════════════════════════════════════════
-- Moduł "Czas pracy" — arkusze czasu (Etap 4)
-- ═══════════════════════════════════════════════════════════════════════════

do $$ begin
  create type public.timesheet_period_type as enum ('week', 'month');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.time_sheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  period_type public.timesheet_period_type not null default 'week',
  date_from date not null,
  date_to date not null,
  status public.time_entry_status not null default 'draft',
  submitted_at timestamptz,
  approved_by_id uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  employee_comment text not null default '',
  manager_comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_sheets_period_range_chk check (date_to >= date_from),
  constraint time_sheets_user_period_unique unique (user_id, period_type, date_from)
);

create index if not exists time_sheets_user_status_idx
  on public.time_sheets (user_id, status, date_from desc);

create index if not exists time_sheets_status_period_idx
  on public.time_sheets (status, date_from desc);

alter table public.time_sheets enable row level security;

drop policy if exists time_sheets_select on public.time_sheets;
create policy time_sheets_select
  on public.time_sheets for select using (auth.uid() is not null);
