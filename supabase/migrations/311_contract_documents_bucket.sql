-- Prywatny bucket na finalny PDF podpisanej umowy (generowany po podpisie obu stron).

insert into storage.buckets (id, name, public, file_size_limit)
values ('contract-documents', 'contract-documents', false, 20971520)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "contract_documents_storage_select" on storage.objects;
drop policy if exists "contract_documents_storage_insert" on storage.objects;
drop policy if exists "contract_documents_storage_update" on storage.objects;
drop policy if exists "contract_documents_storage_delete" on storage.objects;

create policy "contract_documents_storage_select"
  on storage.objects for select
  using (bucket_id = 'contract-documents');

create policy "contract_documents_storage_insert"
  on storage.objects for insert
  with check (bucket_id = 'contract-documents');

create policy "contract_documents_storage_update"
  on storage.objects for update
  using (bucket_id = 'contract-documents');

create policy "contract_documents_storage_delete"
  on storage.objects for delete
  using (bucket_id = 'contract-documents');
