-- D19 sec.6 / faza 12 (Tryb serwisowy), punkt "przeglady po 3 i 12 miesiacach".
--
-- Decyzja wlasciciela: NIE generujemy przegladow automatycznie. Modul inspections zaklada reczne
-- tworzenie (systemy SSP/SSWiN/CCTV/KD/BMS, planInspectionsForClient) — to inny ksztalt danych niz
-- "jeden kurtuazyjny przeglad na caly projekt", wiec wymuszanie tego przez katalog systemow bylby
-- zlym dopasowaniem (D19 mowil "reuzyj modul inspections" trafnie co do KSZTALTU tabeli — ma
-- project_id, protokol z podpisem — ale nie co do MECHANIZMU generowania).
--
-- Zamiast tego: funkcja liczy TYLKO fakty (kamien mineny, czy inspection juz istnieje dla tego
-- projektu w rozsadnym oknie wokol kamienia) — zero nowej tabeli, zero automatycznego insertu do
-- inspections. Powiadomienie prowadzi czlowieka do REGULARNEGO tworzenia przegladu w module
-- inspections, dokladnie jak dzis (D19: "mozna utworzyc przeglad recznie zgodnie z tym jak
-- w inspection" — decyzja wlasciciela).
--
-- Poczatek liczony od project_coverage_periods.kind='gwarancja_pierwotna'.starts_at (decyzja
-- wlasciciela) — NIE od system_handover_at wprost, chociaz dzis (11/122 projektow) te dwie daty sa
-- identyczne (starts_at jest zasiane z system_handover_at przy backfillu D25/migracja 227-230).
create or replace function public.report_warranty_review_due()
returns table (
  project_id uuid,
  project_name text,
  client_id uuid,
  milestone text,
  due_date date,
  is_overdue boolean,
  inspection_exists boolean
)
language sql
stable
set search_path = public
as $$
  with warranty_start as (
    select cp.project_id, cp.starts_at
    from project_coverage_periods cp
    where cp.kind = 'gwarancja_pierwotna'
  ),
  milestones as (
    select project_id, '3mc'::text as milestone, (starts_at + interval '3 months')::date as due_date
    from warranty_start
    union all
    select project_id, '12mc'::text, (starts_at + interval '12 months')::date
    from warranty_start
  )
  select
    m.project_id,
    p.name,
    p.client_id,
    m.milestone,
    m.due_date,
    current_date >= m.due_date,
    exists (
      select 1 from inspections i
      where i.project_id = m.project_id
        and i.created_at::date between (m.due_date - 30) and (m.due_date + 60)
    )
  from milestones m
  join projects p on p.id = m.project_id
  where current_date >= m.due_date
  order by m.due_date;
$$;

comment on function public.report_warranty_review_due is
  'D19 sec.6 / faza 12 — kamienie 3mc/12mc od poczatku gwarancji BEZ automatycznego tworzenia '
  'wiersza w inspections (decyzja wlasciciela: modul zaklada tworzenie reczne). '
  'inspection_exists=false = nalezy powiadomic, zeby czlowiek utworzyl przeglad recznie.';

grant execute on function public.report_warranty_review_due() to authenticated;
revoke execute on function public.report_warranty_review_due() from public, anon;

do $$
declare
  v_due integer;
  v_bez_przegladu integer;
begin
  select count(*) into v_due from report_warranty_review_due();
  select count(*) into v_bez_przegladu from report_warranty_review_due() where not inspection_exists;

  -- Stan zastany z inwentaryzacji: 3 projekty (Hernacki Krzepice, Majewski Mateusz, Sopolinski)
  -- maja oba kamienie (3mc+12mc) przekroczone = 6 wierszy. Zero wierszy w inspections w calej
  -- bazie, wiec wszystkie 6 musza wyjsc jako "brak przegladu".
  if v_due <> 6 then
    raise exception 'Oczekiwano 6 kamieni mininych (stan zastany), jest %', v_due;
  end if;
  if v_bez_przegladu <> 6 then
    raise exception 'Oczekiwano 6 kamieni bez przegladu (inspections jest puste), jest %', v_bez_przegladu;
  end if;

  raise notice 'OK: % kamieni mininych, % bez utworzonego przegladu.', v_due, v_bez_przegladu;
end $$;
