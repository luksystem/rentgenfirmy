-- Bucket załączników ustaleń (gdy migracja 043 nie utworzyła go w Storage)

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
