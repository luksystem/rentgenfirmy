-- D27: naprawa resolveProjectWarrantyEndsAt() — wszystkie zywe ekrany (panel gwarancji, 3 ekrany
-- klienckie, lista projektow zespolu, formularz, kontekst AI serwisu) czytaja projects.warranty_ends_at
-- BEZPOSREDNIO, bez project_coverage_periods. Zamiast przepinac 10 miejsc konsumujacych na nowy
-- parametr (inwazyjne, latwo cos pominac), projects.warranty_ends_at staje sie CACHE'M mechanicznie
-- utrzymywanym z project_coverage_periods (zrodlo prawdy) - dokladnie ten sam wzorzec co flow_status
-- (D25) i data_ukonczenia (D27, Krok A 2.2). project_coverage_periods jest append-only (D19 SS2a:
-- "nowy rekord, nigdy edycja pierwotnej") - ten trigger tylko CZYTA z niej i odswieza cache,
-- nigdy nie pisze do project_coverage_periods.
create or replace function public.sync_project_warranty_ends_at_from_coverage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ends_at date;
begin
  select coalesce(
    (select max(ends_at) from project_coverage_periods
     where project_id = new.project_id and starts_at <= current_date and ends_at >= current_date),
    (select max(ends_at) from project_coverage_periods where project_id = new.project_id)
  ) into v_ends_at;

  update projects set warranty_ends_at = v_ends_at where id = new.project_id;
  return new;
end;
$$;

comment on function public.sync_project_warranty_ends_at_from_coverage is
  'Faza 7/D27 - utrzymuje projects.warranty_ends_at jako cache najbardziej aktualnego pokrycia z '
  'project_coverage_periods (preferuje okres obejmujacy dzis, w przeciwnym razie najpozniejszy '
  'znany koniec). Naprawia realny problem: przedluzenie gwarancji (D25) zapisuje sie jako nowy '
  'wiersz project_coverage_periods, ale zaden z ~10 zywych ekranow czytajacych warranty_ends_at '
  'nigdy go nie widzial.';

create trigger project_coverage_periods_sync_warranty_ends_at
  after insert on public.project_coverage_periods
  for each row execute function public.sync_project_warranty_ends_at_from_coverage();
