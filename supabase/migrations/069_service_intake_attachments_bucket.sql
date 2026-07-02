-- Storage dla załączników zgłoszeń serwisowych (publiczny upload przed wysłaniem)

insert into storage.buckets (id, name, public, file_size_limit)
values ('service-intake-attachments', 'service-intake-attachments', true, 52428800)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "service_intake_attachments_storage_select" on storage.objects;
drop policy if exists "service_intake_attachments_storage_insert" on storage.objects;
drop policy if exists "service_intake_attachments_storage_delete" on storage.objects;

create policy "service_intake_attachments_storage_select"
  on storage.objects for select
  using (bucket_id = 'service-intake-attachments');

create policy "service_intake_attachments_storage_insert"
  on storage.objects for insert
  with check (bucket_id = 'service-intake-attachments');

create policy "service_intake_attachments_storage_delete"
  on storage.objects for delete
  using (bucket_id = 'service-intake-attachments');
