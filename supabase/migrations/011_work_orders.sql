-- Zlecenia: powstają z zaakceptowanych ofert lub ręcznie

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('accepted_offer', 'manual')),
  service_id uuid references public.services (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  status text not null default 'Nowe',
  title text not null,
  service_type text not null default 'Pogwarancyjny',
  client_full_name text not null default '',
  client_location text not null default '',
  client_email text not null default '',
  client_phone text not null default '',
  notes text,
  accepted_at timestamptz,
  offer_gross_total numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists work_orders_service_id_idx
  on public.work_orders (service_id)
  where service_id is not null;

create index if not exists work_orders_status_idx on public.work_orders (status);
create index if not exists work_orders_client_id_idx on public.work_orders (client_id);
create index if not exists work_orders_project_id_idx on public.work_orders (project_id);
create index if not exists work_orders_created_at_idx on public.work_orders (created_at desc);

alter table public.work_orders enable row level security;

drop policy if exists "work_orders_select_all" on public.work_orders;
drop policy if exists "work_orders_insert_all" on public.work_orders;
drop policy if exists "work_orders_update_all" on public.work_orders;
drop policy if exists "work_orders_delete_all" on public.work_orders;

create policy "work_orders_select_all" on public.work_orders for select using (true);
create policy "work_orders_insert_all" on public.work_orders for insert with check (true);
create policy "work_orders_update_all" on public.work_orders for update using (true);
create policy "work_orders_delete_all" on public.work_orders for delete using (true);
