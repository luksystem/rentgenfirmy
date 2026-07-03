-- Logo firmy w dokumentach (publiczny odczyt dla ofert i raportów)

insert into storage.buckets (id, name, public, file_size_limit)
values ('company-assets', 'company-assets', true, 2097152)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists "company_assets_storage_select" on storage.objects;
drop policy if exists "company_assets_storage_insert" on storage.objects;
drop policy if exists "company_assets_storage_update" on storage.objects;
drop policy if exists "company_assets_storage_delete" on storage.objects;

create policy "company_assets_storage_select"
  on storage.objects for select
  using (bucket_id = 'company-assets');

create policy "company_assets_storage_insert"
  on storage.objects for insert
  with check (bucket_id = 'company-assets');

create policy "company_assets_storage_update"
  on storage.objects for update
  using (bucket_id = 'company-assets');

create policy "company_assets_storage_delete"
  on storage.objects for delete
  using (bucket_id = 'company-assets');
