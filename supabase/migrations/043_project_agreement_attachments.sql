-- Załączniki (zdjęcia i pliki) do ustaleń projektowych

create table if not exists public.project_agreement_attachments (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.project_client_agreements (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  media_kind text not null check (media_kind in ('image', 'file')),
  size_bytes bigint not null check (size_bytes > 0),
  position integer not null default 0,
  uploaded_by_name text not null,
  uploaded_by_source text not null check (uploaded_by_source in ('team', 'client', 'external')),
  created_at timestamptz not null default now()
);

create index if not exists project_agreement_attachments_agreement_idx
  on public.project_agreement_attachments (agreement_id, position);

alter table public.project_agreement_attachments enable row level security;

create policy "project_agreement_attachments_all"
  on public.project_agreement_attachments for all using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit)
values ('agreement-attachments', 'agreement-attachments', false, 15728640)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "agreement_attachments_select" on storage.objects;
drop policy if exists "agreement_attachments_insert" on storage.objects;
drop policy if exists "agreement_attachments_delete" on storage.objects;

create policy "agreement_attachments_select"
  on storage.objects for select
  using (bucket_id = 'agreement-attachments');

create policy "agreement_attachments_insert"
  on storage.objects for insert
  with check (bucket_id = 'agreement-attachments');

create policy "agreement_attachments_delete"
  on storage.objects for delete
  using (bucket_id = 'agreement-attachments');
