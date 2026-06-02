-- Moduł SERWIS: serwisy i ustawienia globalne (stawki w app_settings)

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete set null,
  status text not null,
  service_type text not null,
  title text not null,
  client_full_name text not null default '',
  client_location text not null default '',
  client_email text not null default '',
  client_phone text not null default '',
  rates jsonb not null,
  discounts jsonb not null,
  zone_settings jsonb not null,
  estimate jsonb not null,
  actual jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists services_status_idx on public.services (status);
create index if not exists services_created_at_idx on public.services (created_at desc);
create index if not exists services_project_id_idx on public.services (project_id);

alter table public.services enable row level security;

drop policy if exists "services_select_all" on public.services;
drop policy if exists "services_insert_all" on public.services;
drop policy if exists "services_update_all" on public.services;
drop policy if exists "services_delete_all" on public.services;

create policy "services_select_all" on public.services for select using (true);
create policy "services_insert_all" on public.services for insert with check (true);
create policy "services_update_all" on public.services for update using (true);
create policy "services_delete_all" on public.services for delete using (true);
