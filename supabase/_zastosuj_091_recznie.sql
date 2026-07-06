-- Ten plik NIE jest osobną migracją — to kopia migracji 091 do jednorazowego wklejenia
-- w Supabase SQL Editor (skoro CLI Supabase nie jest tu skonfigurowane).
-- Po wykonaniu można ten plik usunąć (091_process_protocol_annotations.sql pozostaje jako źródło prawdy).

-- ============================================================
-- 091_process_protocol_annotations.sql
-- ============================================================
alter table public.project_process_protocols
  add column if not exists annotations jsonb not null default '[]'::jsonb,
  add column if not exists generated_pdf_path text,
  add column if not exists accepted_at timestamptz,
  add column if not exists accepted_by text,
  add column if not exists linked_document_id uuid references public.project_documents (id) on delete set null;

comment on column public.project_process_protocols.annotations is
  'Odręczne adnotacje na stronach wzoru PDF: [{ page: number, imagePath: string }] — obrazy PNG (przezroczyste tło) w buckecie process-protocols/{itemId}/annotations/.';
comment on column public.project_process_protocols.generated_pdf_path is
  'Ścieżka w buckecie process-protocols do finalnego, wygenerowanego PDF (wzór + adnotacje + podpisy) po akceptacji.';
comment on column public.project_process_protocols.accepted_at is
  'Kiedy protokół został zaakceptowany (zablokowany do edycji) i wygenerowano finalny PDF.';
comment on column public.project_process_protocols.accepted_by is
  'Imię i nazwisko osoby akceptującej protokół (przedstawiciel firmy).';
comment on column public.project_process_protocols.linked_document_id is
  'Dokument projektu (project_documents), do którego dopięto finalny wygenerowany PDF.';
