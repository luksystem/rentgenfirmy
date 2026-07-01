-- Rejestr faktur i kosztów projektowych

create table if not exists public.project_invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  kind text not null default 'cost' check (kind in ('invoice', 'cost')),
  title text not null,
  vendor_name text not null default '',
  invoice_number text not null default '',
  amount_net numeric(12, 2),
  amount_gross numeric(12, 2),
  vat_rate numeric(5, 2),
  currency text not null default 'PLN',
  issue_date date,
  notes text not null default '',
  storage_path text,
  file_name text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes > 0),
  created_by_name text not null default 'Zespół',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_invoices_project_id_idx
  on public.project_invoices (project_id, created_at desc);

create index if not exists project_invoices_client_id_idx
  on public.project_invoices (client_id, created_at desc);

create index if not exists project_invoices_kind_idx
  on public.project_invoices (kind, created_at desc);

alter table public.project_invoices enable row level security;

drop policy if exists "project_invoices_select_all" on public.project_invoices;
drop policy if exists "project_invoices_insert_all" on public.project_invoices;
drop policy if exists "project_invoices_update_all" on public.project_invoices;
drop policy if exists "project_invoices_delete_all" on public.project_invoices;

create policy "project_invoices_select_all" on public.project_invoices for select using (true);
create policy "project_invoices_insert_all" on public.project_invoices for insert with check (true);
create policy "project_invoices_update_all" on public.project_invoices for update using (true);
create policy "project_invoices_delete_all" on public.project_invoices for delete using (true);

insert into storage.buckets (id, name, public, file_size_limit)
values ('project-invoices', 'project-invoices', false, 15728640)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "project_invoices_storage_select" on storage.objects;
drop policy if exists "project_invoices_storage_insert" on storage.objects;
drop policy if exists "project_invoices_storage_delete" on storage.objects;

create policy "project_invoices_storage_select"
  on storage.objects for select
  using (bucket_id = 'project-invoices');

create policy "project_invoices_storage_insert"
  on storage.objects for insert
  with check (bucket_id = 'project-invoices');

create policy "project_invoices_storage_delete"
  on storage.objects for delete
  using (bucket_id = 'project-invoices');
