-- Punkty odbioru wewnętrznego przypisane do pozycji katalogu specyfikacji.

alter table public.specification_catalog_items
  add column if not exists internal_acceptance_items jsonb not null default '[]'::jsonb;
