-- ═══════════════════════════════════════════════════════════════════════════
-- Moduł "Czas pracy" — aktywny timer (Etap 3)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.active_timers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  started_at timestamptz not null default now(),
  date date not null,
  category_id uuid not null references public.time_categories (id),
  entry_type_id uuid not null references public.time_entry_types (id),
  description text not null default '',
  billable boolean not null default false,
  project_id uuid references public.projects (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  work_item_id uuid references public.work_items (id) on delete set null,
  service_id uuid references public.services (id) on delete set null,
  remote_work boolean not null default false,
  delegation boolean not null default false,
  break_minutes int not null default 0 check (break_minutes >= 0),
  paused_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists active_timers_user_idx on public.active_timers (user_id);

alter table public.active_timers enable row level security;

drop policy if exists active_timers_select on public.active_timers;
create policy active_timers_select
  on public.active_timers for select using (auth.uid() is not null);
