-- Baza wiedzy: dodatkowy typ źródła — plik CSV analizowany jako lista rekordów

alter table public.knowledge_sources drop constraint if exists knowledge_sources_type_check;

alter table public.knowledge_sources
  add constraint knowledge_sources_type_check
  check (type in ('pdf', 'text', 'whatsapp', 'link', 'youtube', 'note', 'image', 'csv'));
