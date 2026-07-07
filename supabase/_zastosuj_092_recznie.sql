-- Ten plik NIE jest osobną migracją — to kopia migracji 092 do jednorazowego wklejenia
-- w Supabase SQL Editor (skoro CLI Supabase nie jest tu skonfigurowane).
-- Po wykonaniu można ten plik usunąć (092_process_protocol_overlay_items.sql pozostaje jako źródło prawdy).

-- ============================================================
-- 092_process_protocol_overlay_items.sql
-- ============================================================
alter table public.project_process_protocols
  add column if not exists overlay_items jsonb not null default '[]'::jsonb;

comment on column public.project_process_protocols.overlay_items is
  'Edytowalne elementy na stronach wzoru PDF: [{ id, page, xRatio, yRatio, kind: text|signature, text?, color?, fontSizeRatio?, which?, widthRatio? }]. Współrzędne jako ułamek szerokości/wysokości strony.';
