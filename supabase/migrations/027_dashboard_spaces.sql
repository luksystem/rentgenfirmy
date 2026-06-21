-- Przestrzenie dashboardów (per projekt, role, pracownik) + adres klienta

create type public.dashboard_space_kind as enum (
  'client',
  'team',
  'owner',
  'manager',
  'office',
  'installer',
  'employee'
);

create table if not exists public.dashboard_spaces (
  id uuid primary key default gen_random_uuid(),
  kind public.dashboard_space_kind not null,
  project_id uuid references public.projects (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  title text not null default '',
  public_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  public_enabled boolean not null default false,
  public_access_password_hash text,
  public_access_username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dashboard_spaces_scope_check check (
    (
      kind in ('client', 'team')
      and project_id is not null
    )
    or (
      kind = 'employee'
      and profile_id is not null
    )
    or (
      kind in ('owner', 'manager', 'office', 'installer')
      and project_id is null
      and profile_id is null
      and client_id is null
    )
  )
);

create unique index if not exists dashboard_spaces_project_kind_uidx
  on public.dashboard_spaces (project_id, kind)
  where project_id is not null and kind in ('client', 'team');

create unique index if not exists dashboard_spaces_employee_uidx
  on public.dashboard_spaces (profile_id)
  where kind = 'employee';

create unique index if not exists dashboard_spaces_global_kind_uidx
  on public.dashboard_spaces (kind)
  where kind in ('owner', 'manager', 'office', 'installer');

create index if not exists dashboard_spaces_client_id_idx
  on public.dashboard_spaces (client_id)
  where client_id is not null;

create index if not exists dashboard_spaces_public_token_idx
  on public.dashboard_spaces (public_token);

alter table public.clients
  add column if not exists address_street text not null default '',
  add column if not exists address_city text not null default '',
  add column if not exists address_postal_code text not null default '';

alter table public.dashboard_spaces enable row level security;

drop policy if exists "dashboard_spaces_select_all" on public.dashboard_spaces;
drop policy if exists "dashboard_spaces_insert_all" on public.dashboard_spaces;
drop policy if exists "dashboard_spaces_update_all" on public.dashboard_spaces;
drop policy if exists "dashboard_spaces_delete_all" on public.dashboard_spaces;

create policy "dashboard_spaces_select_all" on public.dashboard_spaces for select using (true);
create policy "dashboard_spaces_insert_all" on public.dashboard_spaces for insert with check (true);
create policy "dashboard_spaces_update_all" on public.dashboard_spaces for update using (true);
create policy "dashboard_spaces_delete_all" on public.dashboard_spaces for delete using (true);
