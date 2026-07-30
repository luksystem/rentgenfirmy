-- D44 poprawka — polityki storage dla bucketu zmian projektowych.
--
-- Migracja 270 zalozyla bucket, ale NIE zalozyla polityk na storage.objects. Storage ma wlaczone
-- RLS, wiec upload z przegladarki byl odrzucany — a kod klienta polykal blad po cichu, wiec
-- zgloszenie zapisywalo sie bez zdjecia i nikt sie o tym nie dowiadywal.
--
-- Wzorzec skopiowany 1:1 z migracji 043 (agreement-attachments). To ten sam rodzaj zalacznika,
-- tylko po drugiej stronie, wiec ma miec te same reguly.
drop policy if exists "change_request_attachments_select" on storage.objects;
drop policy if exists "change_request_attachments_insert" on storage.objects;
drop policy if exists "change_request_attachments_delete" on storage.objects;

create policy "change_request_attachments_select"
  on storage.objects for select
  using (bucket_id = 'change-request-attachments');

create policy "change_request_attachments_insert"
  on storage.objects for insert
  with check (bucket_id = 'change-request-attachments');

create policy "change_request_attachments_delete"
  on storage.objects for delete
  using (bucket_id = 'change-request-attachments');

do $$
declare
  v_polityk integer;
begin
  select count(*) into v_polityk from pg_policy
   where polrelid = 'storage.objects'::regclass
     and polname like 'change_request_attachments%';
  if v_polityk <> 3 then
    raise exception 'Oczekiwano 3 polityk storage, jest %', v_polityk;
  end if;
  raise notice 'OK: 3 polityki storage dla change-request-attachments.';
end $$;
