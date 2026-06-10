-- Załączniki do zgłoszeń Kanban (zdjęcia + jeden film na kartę)

create table if not exists public.process_kanban_task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.process_kanban_tasks (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  media_kind text not null check (media_kind in ('image', 'video')),
  size_bytes int not null,
  position int not null default 0,
  uploaded_by_side text not null default 'client',
  uploaded_by_name text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists process_kanban_task_attachments_task_idx
  on public.process_kanban_task_attachments (task_id, position);

create index if not exists process_kanban_task_attachments_video_idx
  on public.process_kanban_task_attachments (task_id) where media_kind = 'video';

alter table public.process_kanban_task_attachments enable row level security;

create policy "process_kanban_task_attachments_all"
  on public.process_kanban_task_attachments for all using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit)
values ('kanban-attachments', 'kanban-attachments', false, 52428800)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "kanban_attachments_select" on storage.objects;
drop policy if exists "kanban_attachments_insert" on storage.objects;
drop policy if exists "kanban_attachments_delete" on storage.objects;

create policy "kanban_attachments_select"
  on storage.objects for select
  using (bucket_id = 'kanban-attachments');

create policy "kanban_attachments_insert"
  on storage.objects for insert
  with check (bucket_id = 'kanban-attachments');

create policy "kanban_attachments_delete"
  on storage.objects for delete
  using (bucket_id = 'kanban-attachments');
