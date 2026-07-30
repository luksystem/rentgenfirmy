-- Widocznosc elementu procesu dla klienta (dashboard publiczny) - domyslnie NIC nie jest widoczne,
-- admin swiadomie odznacza checkbox "Widoczne dla klienta" per element w edytorze szablonu.
alter table public.process_items
  add column if not exists visible_to_client boolean not null default false;
