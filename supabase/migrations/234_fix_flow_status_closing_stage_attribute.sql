-- Naprawa D19/D25: recompute_project_flow_status() mial fallback pozycyjny ("brak for_closing w
-- szablonie -> uznaj etap o najwyzszej pozycji za zamykajacy"). To zlamanie nowej reguly
-- (docs/CLAUDE.md, docs/role/CLAUDE.md: "kod nie odwoluje sie do konkretnego etapu... ani po
-- pozycji w kolejnosci"). Nowa formula, bez pozycji, bez wyjatkow rzucanych w triggerze:
--
--   projekt jest ZAMKNIETY, gdy WSZYSTKIE etapy oznaczone jako for_closing sa zakonczone
--   (zakonczony = jest aktywnym etapem TERAZ, albo projekt go juz opuscil - project_stage_history
--   z exited_at wypelnionym). Brak jakiegokolwiek for_closing w szablonie -> projekt sie NIE
--   zamyka automatycznie (pozostaje "W trakcie"), bez wyjatku - zle skonfigurowany szablon nie moze
--   blokowac zapisow na projektach, ktore nic nie zawinily. Wykrywanie takich szablonow to osobna
--   funkcja diagnostyczna, report_template_configuration_gaps(), nizej.

create or replace function public.recompute_project_flow_status(p_project_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with closing_progress as (
    select
      pp.project_id,
      count(ps.id) as total_closing_stages,
      count(ps.id) filter (
        where ps.id::text = pp.active_stage_id
           or exists (
             select 1 from project_stage_history psh
             where psh.project_id = pp.project_id
               and psh.stage_id = ps.id::text
               and psh.exited_at is not null
           )
      ) as completed_closing_stages
    from project_processes pp
    join process_stages ps on ps.template_id = pp.template_id and ps.for_closing
    group by pp.project_id
  ),
  closing_status as (
    select
      pp.project_id,
      coalesce(cp.total_closing_stages, 0) > 0
        and cp.total_closing_stages = cp.completed_closing_stages as reached
    from project_processes pp
    left join closing_progress cp on cp.project_id = pp.project_id
  ),
  coverage as (
    select project_id, bool_or(starts_at <= current_date and ends_at >= current_date) as active
    from project_coverage_periods
    group by project_id
  ),
  computed as (
    select
      p.id,
      case
        when p.manual_close_reason is not null then 'Wygaszony'
        when not coalesce(cs.reached, false) then 'W trakcie'
        when coalesce(c.active, false) then 'Zamknięty'
        else 'Wygaszony'
      end as new_status
    from projects p
    left join closing_status cs on cs.project_id = p.id
    left join coverage c on c.project_id = p.id
    where (p_project_id is null or p.id = p_project_id)
      and (
        p.manual_close_reason is not null
        or exists (
          select 1 from project_stage_history psh
          where psh.project_id = p.id and psh.backfilled = false
        )
      )
  )
  update projects p
  set flow_status = computed.new_status
  from computed
  where p.id = computed.id
    and p.flow_status is distinct from computed.new_status;
end;
$$;

comment on function public.recompute_project_flow_status is
  'Faza 6, docs/08 D19 par.2, poprawione w D25/D26 (usuniety fallback pozycyjny) - status jako '
  'funkcja pokrycia + ukonczenia WSZYSTKICH etapow for_closing (atrybut szablonu, nie pozycja). '
  'Etap "ukonczony" = jest aktywny teraz LUB project_stage_history pokazuje, ze zostal opuszczony. '
  'Zero etapow for_closing w szablonie -> projekt nigdy nie zamyka sie automatycznie (report_template_'
  'configuration_gaps() to wykrywa, nie blokuje zapisow). Liczy TYLKO projekty z co najmniej jednym '
  'prawdziwym przejsciem etapu (backfilled=false) LUB z manual_close_reason - reszta zostaje '
  'nietknieta (grandfather, D25).';

-- Diagnostyka konfiguracji szablonow, wzorzec jak report_orphaned_stage_references (migracja 211).
-- Rozszerzalna: dzis tylko brak for_closing, docelowo kazdy wymagany-a-brakujacy atrybut szablonu.
create or replace function public.report_template_configuration_gaps()
returns table (
  template_id uuid,
  template_name text,
  project_type text,
  gap text
)
language sql
stable
set search_path = public
as $$
  select t.id, t.name, t.project_type, 'brak etapu for_closing — projekty tego szablonu nigdy nie zamkna sie automatycznie'::text
  from process_templates t
  where not exists (
    select 1 from process_stages ps where ps.template_id = t.id and ps.for_closing
  );
$$;

comment on function public.report_template_configuration_gaps is
  'Szablony procesu z brakujacymi wymaganymi atrybutami (docs/CLAUDE.md: "atrybut, po ktorym da sie '
  'znalezc" musi istniec w danych, nie w kodzie) - diagnostyczne, nieblokujace. Dzis: brak for_closing.';

revoke execute on function public.report_template_configuration_gaps() from public, anon;
grant execute on function public.report_template_configuration_gaps() to authenticated;
