-- Nowy typ elementu procesu "snapshot": pracownik wrzuca jedno zdjecie + notatke, klient dostaje
-- SMS z linkiem i mail ze zdjeciem, odpowiedzialny za etap dostaje push. Bucket publiczny (jak
-- service-intake-attachments) - link musi przetrwac w SMS/mailu bez odswiezania signed URL.

alter type public.process_item_kind add value if not exists 'snapshot';

insert into storage.buckets (id, name, public, file_size_limit)
values ('process-snapshot-photos', 'process-snapshot-photos', true, 20971520)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "process_snapshot_photos_storage_select" on storage.objects;
drop policy if exists "process_snapshot_photos_storage_insert" on storage.objects;
drop policy if exists "process_snapshot_photos_storage_delete" on storage.objects;

create policy "process_snapshot_photos_storage_select"
  on storage.objects for select
  using (bucket_id = 'process-snapshot-photos');

create policy "process_snapshot_photos_storage_insert"
  on storage.objects for insert
  with check (bucket_id = 'process-snapshot-photos');

create policy "process_snapshot_photos_storage_delete"
  on storage.objects for delete
  using (bucket_id = 'process-snapshot-photos');

create table if not exists public.project_process_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_process_item_id uuid not null unique references public.project_process_items (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes integer,
  employee_note text,
  uploaded_by uuid references public.profiles (id),
  uploaded_by_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_process_snapshots enable row level security;

drop policy if exists "project_process_snapshots_all" on public.project_process_snapshots;
create policy "project_process_snapshots_all"
  on public.project_process_snapshots for all using (true) with check (true);
