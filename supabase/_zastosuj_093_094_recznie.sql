-- Ten plik NIE jest osobną migracją — to kopia migracji 093 i 094 do jednorazowego wklejenia
-- w Supabase SQL Editor (skoro CLI Supabase nie jest tu skonfigurowane).
-- Po wykonaniu można ten plik usunąć (093_knowledge_base.sql i 094_knowledge_base_more_types.sql
-- pozostają jako źródło prawdy).

-- ============================================================
-- 093_knowledge_base.sql
-- ============================================================
create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('pdf', 'text', 'whatsapp', 'link', 'youtube')),
  title text not null,
  description text not null default '',
  url text,
  storage_path text,
  file_name text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes > 0),
  status text not null default 'pending' check (
    status in ('pending', 'processing', 'ready', 'error')
  ),
  error_message text,
  char_count int not null default 0,
  created_by_name text not null default 'Zespół',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists knowledge_sources_status_idx
  on public.knowledge_sources (status, created_at desc);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.knowledge_sources (id) on delete cascade,
  chunk_index int not null default 0,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists knowledge_chunks_source_id_idx
  on public.knowledge_chunks (source_id, chunk_index);

alter table public.knowledge_sources enable row level security;
alter table public.knowledge_chunks enable row level security;

drop policy if exists "knowledge_sources_select_all" on public.knowledge_sources;
drop policy if exists "knowledge_sources_insert_all" on public.knowledge_sources;
drop policy if exists "knowledge_sources_update_all" on public.knowledge_sources;
drop policy if exists "knowledge_sources_delete_all" on public.knowledge_sources;

create policy "knowledge_sources_select_all" on public.knowledge_sources for select using (true);
create policy "knowledge_sources_insert_all" on public.knowledge_sources for insert with check (true);
create policy "knowledge_sources_update_all" on public.knowledge_sources for update using (true);
create policy "knowledge_sources_delete_all" on public.knowledge_sources for delete using (true);

drop policy if exists "knowledge_chunks_select_all" on public.knowledge_chunks;
drop policy if exists "knowledge_chunks_insert_all" on public.knowledge_chunks;
drop policy if exists "knowledge_chunks_update_all" on public.knowledge_chunks;
drop policy if exists "knowledge_chunks_delete_all" on public.knowledge_chunks;

create policy "knowledge_chunks_select_all" on public.knowledge_chunks for select using (true);
create policy "knowledge_chunks_insert_all" on public.knowledge_chunks for insert with check (true);
create policy "knowledge_chunks_update_all" on public.knowledge_chunks for update using (true);
create policy "knowledge_chunks_delete_all" on public.knowledge_chunks for delete using (true);

insert into storage.buckets (id, name, public, file_size_limit)
values ('knowledge-base', 'knowledge-base', false, 26214400)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "knowledge_base_storage_select" on storage.objects;
drop policy if exists "knowledge_base_storage_insert" on storage.objects;
drop policy if exists "knowledge_base_storage_delete" on storage.objects;

create policy "knowledge_base_storage_select"
  on storage.objects for select
  using (bucket_id = 'knowledge-base');

create policy "knowledge_base_storage_insert"
  on storage.objects for insert
  with check (bucket_id = 'knowledge-base');

create policy "knowledge_base_storage_delete"
  on storage.objects for delete
  using (bucket_id = 'knowledge-base');

-- ============================================================
-- 094_knowledge_base_more_types.sql
-- ============================================================
alter table public.knowledge_sources drop constraint if exists knowledge_sources_type_check;

alter table public.knowledge_sources
  add constraint knowledge_sources_type_check
  check (type in ('pdf', 'text', 'whatsapp', 'link', 'youtube', 'note', 'image'));
