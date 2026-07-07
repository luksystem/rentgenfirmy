-- Baza wiedzy: dodatkowe typy źródeł — wpisany bezpośrednio tekst i zdjęcie analizowane przez AI

alter table public.knowledge_sources drop constraint if exists knowledge_sources_type_check;

alter table public.knowledge_sources
  add constraint knowledge_sources_type_check
  check (type in ('pdf', 'text', 'whatsapp', 'link', 'youtube', 'note', 'image'));
