-- Zlapane testem tablicy prawdy: wariant "preferuj okres aktywny dzis" trzymal wyswietlana date na
-- STAREJ wartosci, gdy przedluzenie zaczyna sie dokladnie tam, gdzie konczy sie poprzedni okres (typowy
-- przypadek) - dokladnie problem, ktory ta naprawa miala rozwiazac ("klient po zaplaceniu za
-- przedluzenie widzi wygasla gwarancje"). Uproszczone: zawsze najpozniejszy znany koniec ze
-- wszystkich okresow, bez rozrozniania "aktywny dzis".
create or replace function public.sync_project_warranty_ends_at_from_coverage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update projects
  set warranty_ends_at = (
    select max(ends_at) from project_coverage_periods where project_id = new.project_id
  )
  where id = new.project_id;
  return new;
end;
$$;
