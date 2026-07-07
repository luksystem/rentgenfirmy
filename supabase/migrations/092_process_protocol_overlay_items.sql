-- Edytowalne elementy nakładane na strony wzoru PDF: pola tekstowe i umieszczone w konkretnym
-- miejscu podpisy (firma/klient) — w odróżnieniu od odręcznego pisma (kolumna `annotations`,
-- rastrowe PNG) to dane strukturalne, więc można je później kliknąć, poprawić, przesunąć lub usunąć.

alter table public.project_process_protocols
  add column if not exists overlay_items jsonb not null default '[]'::jsonb;

comment on column public.project_process_protocols.overlay_items is
  'Edytowalne elementy na stronach wzoru PDF: [{ id, page, xRatio, yRatio, kind: text|signature, text?, color?, fontSizeRatio?, which?, widthRatio? }]. Współrzędne jako ułamek szerokości/wysokości strony.';
