-- Dokumentacja projektowa: zdjęcia, skany, plany, PDF

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  category text not null default 'other' check (
    category in ('photo', 'scan', 'pdf', 'plan', 'protocol', 'other')
  ),
  title text not null,
  description text not null default '',
  storage_path text,
  file_name text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes > 0),
  source text not null default 'manual' check (source in ('manual', 'kanban')),
  created_by_name text not null default 'Zespół',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_documents_project_id_idx
  on public.project_documents (project_id, created_at desc);

create index if not exists project_documents_client_id_idx
  on public.project_documents (client_id, created_at desc);

create index if not exists project_documents_category_idx
  on public.project_documents (category, created_at desc);

alter table public.project_documents enable row level security;

drop policy if exists "project_documents_select_all" on public.project_documents;
drop policy if exists "project_documents_insert_all" on public.project_documents;
drop policy if exists "project_documents_update_all" on public.project_documents;
drop policy if exists "project_documents_delete_all" on public.project_documents;

create policy "project_documents_select_all" on public.project_documents for select using (true);
create policy "project_documents_insert_all" on public.project_documents for insert with check (true);
create policy "project_documents_update_all" on public.project_documents for update using (true);
create policy "project_documents_delete_all" on public.project_documents for delete using (true);

insert into storage.buckets (id, name, public, file_size_limit)
values ('project-documents', 'project-documents', false, 15728640)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "project_documents_storage_select" on storage.objects;
drop policy if exists "project_documents_storage_insert" on storage.objects;
drop policy if exists "project_documents_storage_delete" on storage.objects;

create policy "project_documents_storage_select"
  on storage.objects for select
  using (bucket_id = 'project-documents');

create policy "project_documents_storage_insert"
  on storage.objects for insert
  with check (bucket_id = 'project-documents');

create policy "project_documents_storage_delete"
  on storage.objects for delete
  using (bucket_id = 'project-documents');
