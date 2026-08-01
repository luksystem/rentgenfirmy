-- Wewnętrzne przechowywanie pliku dokumentacji technicznej projektu
-- (`ID_<Klient>_Spis.xlsx` — arkusze RW-Zugi, Rolety, Przyciski, Alarm, HVAC, RACK, ...).
-- Świadomie OSOBNA tabela i bucket od `project_documents` (zakładka Dokumentacja → "Dodaj
-- dokument") — ten mechanizm nie ma żadnej flagi widoczności i pokazuje wszystko klientowi
-- identycznie jak zespołowi. Ten plik nigdy nie może się tam znaleźć. Ochrona jest na poziomie
-- UI/trasy (przycisk wgrywania renderowany tylko w trybie zespołu), dokładnie ten sam wzorzec,
-- który już poprawnie chroni moduł Rozdzielnie.
create table if not exists public.project_technical_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  size_bytes bigint,
  uploaded_by_id uuid,
  uploaded_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

alter table public.project_technical_documents enable row level security;

drop policy if exists "project_technical_documents_select_all" on public.project_technical_documents;
drop policy if exists "project_technical_documents_insert_all" on public.project_technical_documents;
drop policy if exists "project_technical_documents_update_all" on public.project_technical_documents;
drop policy if exists "project_technical_documents_delete_all" on public.project_technical_documents;

create policy "project_technical_documents_select_all" on public.project_technical_documents for select using (true);
create policy "project_technical_documents_insert_all" on public.project_technical_documents for insert with check (true);
create policy "project_technical_documents_update_all" on public.project_technical_documents for update using (true);
create policy "project_technical_documents_delete_all" on public.project_technical_documents for delete using (true);

comment on table public.project_technical_documents is
  'Plik dokumentacji technicznej projektu (jeden aktywny na projekt) — źródło dla modułów '
  'Rozdzielnie/Rolety/Przyciski/Alarm/HVAC/RACK. Nigdy nie wystawiany klientowi — odrębne od '
  'project_documents, które nie ma flagi widoczności.';

insert into storage.buckets (id, name, public, file_size_limit)
values ('project-technical-documents', 'project-technical-documents', false, 20971520)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "project_technical_documents_storage_select" on storage.objects;
drop policy if exists "project_technical_documents_storage_insert" on storage.objects;
drop policy if exists "project_technical_documents_storage_update" on storage.objects;
drop policy if exists "project_technical_documents_storage_delete" on storage.objects;

create policy "project_technical_documents_storage_select"
  on storage.objects for select
  using (bucket_id = 'project-technical-documents');

create policy "project_technical_documents_storage_insert"
  on storage.objects for insert
  with check (bucket_id = 'project-technical-documents');

create policy "project_technical_documents_storage_update"
  on storage.objects for update
  using (bucket_id = 'project-technical-documents');

create policy "project_technical_documents_storage_delete"
  on storage.objects for delete
  using (bucket_id = 'project-technical-documents');
