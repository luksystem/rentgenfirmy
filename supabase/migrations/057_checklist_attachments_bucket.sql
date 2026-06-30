insert into storage.buckets (id, name, public, file_size_limit)
values ('checklist-attachments', 'checklist-attachments', false, 15728640)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "checklist_attachments_select" on storage.objects;
drop policy if exists "checklist_attachments_insert" on storage.objects;
drop policy if exists "checklist_attachments_delete" on storage.objects;

create policy "checklist_attachments_select"
  on storage.objects for select
  using (bucket_id = 'checklist-attachments');

create policy "checklist_attachments_insert"
  on storage.objects for insert
  with check (bucket_id = 'checklist-attachments');

create policy "checklist_attachments_delete"
  on storage.objects for delete
  using (bucket_id = 'checklist-attachments');
