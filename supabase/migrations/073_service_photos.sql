-- Zdjęcia do wyceny / rozliczenia serwisowego (metadane w JSON estimate/actual)

insert into storage.buckets (id, name, public, file_size_limit)
values ('service-photos', 'service-photos', false, 10485760)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "service_photos_storage_select" on storage.objects;
drop policy if exists "service_photos_storage_insert" on storage.objects;
drop policy if exists "service_photos_storage_delete" on storage.objects;

create policy "service_photos_storage_select"
  on storage.objects for select
  using (bucket_id = 'service-photos');

create policy "service_photos_storage_insert"
  on storage.objects for insert
  with check (bucket_id = 'service-photos');

create policy "service_photos_storage_delete"
  on storage.objects for delete
  using (bucket_id = 'service-photos');
