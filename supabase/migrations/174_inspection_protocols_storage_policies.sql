-- Migracja 084 utworzyla bucket 'inspection-protocols', ale nigdy nie dodala do niego
-- polityk RLS na storage.objects (w odroznieniu od pozostalych buckietow zalacznikow).
-- Obecnie caly dostep idzie przez klucz service-role (lib/supabase/inspection-server.ts),
-- wiec brak polityk nie blokuje dzialania aplikacji, ale bucket zostaje bez zadnej reguly
-- select/insert/delete na wypadek przyszlego dostepu z przegladarki (jak w checklist-attachments).

drop policy if exists "inspection_protocols_select" on storage.objects;
drop policy if exists "inspection_protocols_insert" on storage.objects;
drop policy if exists "inspection_protocols_delete" on storage.objects;

create policy "inspection_protocols_select"
  on storage.objects for select
  using (bucket_id = 'inspection-protocols');

create policy "inspection_protocols_insert"
  on storage.objects for insert
  with check (bucket_id = 'inspection-protocols');

create policy "inspection_protocols_delete"
  on storage.objects for delete
  using (bucket_id = 'inspection-protocols');
