-- "Napraw dopasowanie elementu" pokazywal tylko ogolna etykiete rodzaju (Checklista/Rozliczenie),
-- bo po osieroceniu (sync projektu do zywego szablonu nadpisuje template_snapshot) nigdzie nie
-- zostawal slad oryginalnej nazwy/etapu/kamienia elementu. Kolumny ponizej zapisywane sa PRZED
-- nadpisaniem snapshotu w syncProjectProcessFromTemplate - dla elementow, ktore stana sie
-- osierocone tym konkretnym syncem. Nie da sie odzyskac nazw dla elementow juz osieroconych
-- wczesniej (dane bezpowrotnie nadpisane), ale kazdy kolejny sync bedzie je zachowywal.

alter table public.project_process_items
  add column if not exists last_known_title text,
  add column if not exists last_known_stage_title text,
  add column if not exists last_known_milestone_title text;
