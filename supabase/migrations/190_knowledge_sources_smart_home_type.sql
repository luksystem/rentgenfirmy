-- Baza wiedzy AI: dodatkowe typy źródeł — mirror opublikowanych artykułów/FAQ Wiedzy Smart Home,
-- żeby istniejący mechanizm sugestii AI przy zgłoszeniach serwisowych mógł z nich korzystać.

alter table public.knowledge_sources drop constraint if exists knowledge_sources_type_check;

alter table public.knowledge_sources
  add constraint knowledge_sources_type_check
  check (type in ('pdf', 'text', 'whatsapp', 'link', 'youtube', 'note', 'image', 'csv', 'smart_home_article', 'smart_home_faq'));
