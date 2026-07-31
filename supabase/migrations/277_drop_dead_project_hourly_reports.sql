-- D32 domkniete decyzja wlasciciela: USUWAMY project_hourly_reports, nie scalamy z time_entries.
--
-- Pelny CRUD (repozytorium, store, subskrypcja realtime) istnial od dawna, ale ZERO komponentow
-- go renderowalo ani wywolywalo store'owych akcji (grep po komponentach: brak trafien). Wartosc
-- faktycznie liczona i pokazywana w rozliczeniach (`hourBudget`) czerpie WYLACZNIE z `time_entries`
-- przez `buildProjectHourBudget` — `hourlyReports` z tej tabeli bylo pobierane do payloadu
-- ProjectSettlementsBundle i nigdy dalej nieuzywane. Scalanie martwego kodu z zywym byloby praca
-- za nic (slowa wlasciciela) — tabela idzie w cale, kod (typy, repozytorium, store, hook realtime,
-- ProjectSettlementsBundle.hourlyReports) usuniety w tym samym commicie.
--
-- Jedyny wiersz produkcyjny (dla audytu, projekt "Plich Leszek", nie odtwarzany):
--   work_date=2026-07-18, hours=8.00, role_label='Projektowanie', amount_net=null,
--   created_by_name='Admin Kapusta'. Brak kwoty i pojedynczy izolowany wpis — wyglada na test
--   reczny sprzed budowy modelu godzinowego na time_entries, nie na realne rozliczenie.
do $$
declare
  v_wierszy integer;
begin
  select count(*) into v_wierszy from project_hourly_reports;
  if v_wierszy <> 1 then
    raise exception 'Oczekiwano 1 wiersza (stan zastany z inwentaryzacji), jest %', v_wierszy;
  end if;
end $$;

drop table public.project_hourly_reports;
