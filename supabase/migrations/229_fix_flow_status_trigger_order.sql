-- Naprawa migracji 228: Postgres uruchamia triggery AFTER na tym samym zdarzeniu w kolejnosci
-- alfabetycznej nazwy triggera. "project_processes_recompute_flow_status" sortuje sie PRZED
-- "project_stage_change_history" (p < s), wiec przeliczenie statusu dzialo sie ZANIM wiersz
-- project_stage_history z backfilled=false w ogole powstal - projekt wygladal jak wciaz
-- niezweryfikowany w momencie sprawdzania "vetted". Zweryfikowane na produkcji w transakcji z
-- rollbackiem: wywolanie recompute_project_flow_status() recznie PO update dzialalo poprawnie,
-- sam trigger nie.
--
-- Naprawa: zmiana nazwy triggera tak, zeby alfabetycznie byl PO "project_stage_change_history".
alter trigger project_processes_recompute_flow_status
  on public.project_processes
  rename to project_stage_history_then_recompute_flow_status;

comment on function public.recompute_flow_status_on_stage_change is
  'UWAGA KOLEJNOSC: nazwa triggera (project_stage_history_then_recompute_flow_status) musi '
  'alfabetycznie sortowac sie PO "project_stage_change_history" (trigger '
  'handle_project_stage_change) - Postgres wykonuje triggery AFTER na tym samym zdarzeniu w '
  'kolejnosci alfabetycznej nazwy, a ta funkcja zaklada, ze wiersz project_stage_history z '
  'backfilled=false juz istnieje, zanim policzy "vetted".';
