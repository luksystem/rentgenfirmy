-- Faza 6 (Cykl zycia projektu), docs/08 D19 par.1-2.
--
-- "Grandfather": automat liczy flow_status TYLKO dla projektow, ktore maja choc jedno PRAWDZIWE
-- przejscie etapu (project_stage_history.backfilled = false) - odrozniamy to od jednorazowego
-- backfillu z migracji 211 (kazdy z 122 projektow dostal wtedy jeden wiersz backfilled=true,
-- ktorego active_stage_id nigdy potem nie byl aktualizowany dla wiekszosci projektow - zweryfikowane:
-- 62 z 76 dzisiejszych "Zamknietych" projektow ma active_stage_id wciaz na Etapie 1). Rezygnacja
-- ineznaczy tego bramkowania - dziala zawsze, na kazdym projekcie.
--
-- Zweryfikowane sucha probka (SELECT bez zapisu) na produkcji: dzis tylko 2/122 projekty sa
-- "zweryfikowane", oba bez zmiany wyniku - start w 100% bezpieczny.
alter table public.projects
  add column manual_close_reason text,
  add column manual_close_at timestamptz,
  add column manual_close_by uuid references public.profiles(id);

comment on column public.projects.manual_close_reason is
  'Jedyna dozwolona reczna zmiana statusu (docs/08 D19 par.1: "rezygnacja klienta -> wygaszony, '
  'recznie, z powodem"). Gdy ustawione, flow_status = Wygaszony niezaleznie od reszty formuly.';

create or replace function public.recompute_project_flow_status(p_project_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with etap10 as (
    select pp.project_id,
      exists (
        select 1
        from process_stages ps
        where ps.id::text = pp.active_stage_id
          and (
            ps.for_closing
            or (
              not exists (select 1 from process_stages ps2 where ps2.template_id = ps.template_id and ps2.for_closing)
              and ps.position = (select max(ps3.position) from process_stages ps3 where ps3.template_id = ps.template_id)
            )
          )
      ) as reached
    from project_processes pp
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
        when not coalesce(e.reached, false) then 'W trakcie'
        when coalesce(c.active, false) then 'Zamknięty'
        else 'Wygaszony'
      end as new_status
    from projects p
    left join etap10 e on e.project_id = p.id
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
  'Faza 6, docs/08 D19 par.2 - status jako funkcja pokrycia + osiagniecia etapu zamykajacego. '
  'Liczy TYLKO projekty z co najmniej jednym prawdziwym przejsciem etapu (backfilled=false) LUB '
  'z ustawionym manual_close_reason - reszta (dzis wiekszosc, "grandfathered") zostaje '
  'nietkniete do czasu az ktos naprawde przesunie etap.';

-- Natychmiastowy automat: zmiana active_stage_id (koordynator realnie przesuwa etap) przelicza
-- status od razu, bez czekania na cron.
create or replace function public.recompute_flow_status_on_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.active_stage_id is distinct from old.active_stage_id then
    perform public.recompute_project_flow_status(new.project_id);
  end if;
  return new;
end;
$$;

create trigger project_processes_recompute_flow_status
  after update on public.project_processes
  for each row execute function public.recompute_flow_status_on_stage_change();

-- Natychmiastowy automat: nowy fakt pokrycia (przedluzenie/umowa serwisowa) przelicza status od razu.
create or replace function public.recompute_flow_status_on_coverage_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_project_flow_status(new.project_id);
  return new;
end;
$$;

create trigger project_coverage_periods_recompute_flow_status
  after insert on public.project_coverage_periods
  for each row execute function public.recompute_flow_status_on_coverage_insert();

-- Natychmiastowy automat: ustawienie/zdjecie manual_close_reason przelicza status od razu.
create or replace function public.recompute_flow_status_on_manual_close_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.manual_close_reason is distinct from old.manual_close_reason then
    perform public.recompute_project_flow_status(new.id);
  end if;
  return new;
end;
$$;

create trigger projects_recompute_flow_status_on_manual_close
  after update of manual_close_reason on public.projects
  for each row execute function public.recompute_flow_status_on_manual_close_change();

-- Cron dobowy: wylapuje przejscia zalezne wylacznie od daty (np. koniec pokrycia mija dzis) dla
-- projektow, ktore nie mialy dzis zadnego innego zdarzenia wyzwalajacego przeliczenie. Godzina
-- 03:00 UTC - 15 minut PRZED istniejacym cronem is_active (03:15), zeby ten drugi czytal juz
-- swiezy flow_status (isClosedFlowStatus jest jego wejsciem, docs/08 D19 - zweryfikowane przy
-- inwentaryzacji fazy 6).
create or replace function public.trigger_recompute_project_flow_status_cron()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_project_flow_status(null);
end;
$$;

select cron.schedule(
  'recompute-project-flow-status',
  '0 3 * * *',
  'select public.trigger_recompute_project_flow_status_cron();'
);
