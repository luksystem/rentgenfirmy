-- Moduł Klienci + rozszerzenia serwisu i projektów

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  location text not null default '',
  email text not null default '',
  phone text not null default '',
  notes text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_full_name_idx on public.clients (full_name);
create index if not exists clients_external_id_idx on public.clients (external_id)
  where external_id is not null;

alter table public.projects
  add column if not exists client_id uuid references public.clients (id) on delete set null;

create index if not exists projects_client_id_idx on public.projects (client_id);

alter table public.services
  add column if not exists client_id uuid references public.clients (id) on delete set null,
  add column if not exists detailed_settlement boolean not null default false,
  add column if not exists estimate_discounts jsonb,
  add column if not exists actual_discounts jsonb;

create index if not exists services_client_id_idx on public.services (client_id);

update public.services
set
  estimate_discounts = coalesce(estimate_discounts, discounts),
  actual_discounts = coalesce(actual_discounts, discounts)
where estimate_discounts is null or actual_discounts is null;

alter table public.clients enable row level security;

drop policy if exists "clients_select_all" on public.clients;
drop policy if exists "clients_insert_all" on public.clients;
drop policy if exists "clients_update_all" on public.clients;
drop policy if exists "clients_delete_all" on public.clients;

create policy "clients_select_all" on public.clients for select using (true);
create policy "clients_insert_all" on public.clients for insert with check (true);
create policy "clients_update_all" on public.clients for update using (true);
create policy "clients_delete_all" on public.clients for delete using (true);
