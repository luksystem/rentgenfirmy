-- Flaga "Do zamkniecia" przeniesiona z globalnych ustawien etapow projektu (app_settings)
-- na etap szablonu procesu. Wskazuje etapy finalizacji projektu (wdrozenie, odbior itd.).
alter table public.process_stages
  add column if not exists for_closing boolean not null default false;

comment on column public.process_stages.for_closing is
  'Etap zamykajacy projekt - odpowiednik starej flagi "Do zamkniecia" z globalnych ustawien etapow.';
