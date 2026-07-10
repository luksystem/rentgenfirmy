-- Opis etapu procesu — pole pomocnicze dla AI (Asystent wyznaczania celów, Tablica Celów),
-- pozwala doprecyzować, jakie cele/dla jakiej roli warto ustalać na danym etapie wdrożenia.
alter table public.process_stages
  add column if not exists description text not null default '';
