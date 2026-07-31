-- D19 sec.6 / faza 11a — wejscia do bramy faz komunikacji.
--
-- Funkcja zwraca WYLACZNIE fakty (flow_status, pokrycie dzis, wstrzymanie dzis, faza bazowa etapu
-- aktywnego) — zero rozgalezien decyzyjnych. Piecio-wierszowa tabela z D19 sec.6 to MECHANIZM
-- (niezalezny od tego, ile jest etapow i jak sie nazywaja), wiec zyje jako czysta funkcja w kodzie
-- (lib/communication/gate.ts, resolveCommunicationGate) z pelnym testem tablicy prawdy — zgodnie z
-- CLAUDE.md standardem (b), ktory dla tej konkretnej tabeli jest wskazany wprost z nazwy.
--
-- active_stage_id jest TEXT (miekkie odniesienie do zamrozonego snapshotu) — ten sam wzorzec co
-- report_stage_responsible/report_task_targets, stad rzutowanie i LEFT JOIN (etap moze nie
-- rozwiazac sie w biezacym szablonie).
create or replace function public.report_communication_gate_inputs()
returns table (
  project_id uuid,
  project_name text,
  flow_status text,
  coverage_active_today boolean,
  has_active_hold boolean,
  active_stage_id text,
  active_stage_title text,
  active_stage_base_phase text
)
language sql
stable
set search_path = public
as $$
  select
    p.id,
    p.name,
    p.flow_status,
    exists (
      select 1 from project_coverage_periods cp
      where cp.project_id = p.id
        and cp.starts_at <= current_date
        and cp.ends_at >= current_date
    ),
    exists (select 1 from project_active_holds h where h.project_id = p.id),
    pp.active_stage_id,
    s.title,
    s.base_communication_phase::text
  from projects p
  left join project_processes pp on pp.project_id = p.id
  left join process_stages s on s.id::text = pp.active_stage_id
  order by p.name;
$$;

comment on function public.report_communication_gate_inputs is
  'D19 sec.6 / faza 11a — fakty wejsciowe do bramy faz komunikacji, bez logiki decyzyjnej. '
  'Decyzja (ktory z 5 wierszy) zapada w lib/communication/gate.ts::resolveCommunicationGate.';

grant execute on function public.report_communication_gate_inputs() to authenticated;
revoke execute on function public.report_communication_gate_inputs() from public, anon;

do $$
declare
  v_wierszy integer;
  v_bez_etapu_w_trakcie integer;
begin
  select count(*) into v_wierszy from report_communication_gate_inputs();
  if v_wierszy <> 122 then
    raise exception 'Oczekiwano 122 projektow, jest %', v_wierszy;
  end if;

  -- Stan zastany z inwentaryzacji: zero projektow "w trakcie" bez rozwiazywalnego etapu aktywnego.
  select count(*) into v_bez_etapu_w_trakcie
  from report_communication_gate_inputs() g
  where g.flow_status = 'W trakcie' and g.active_stage_base_phase is null;
  if v_bez_etapu_w_trakcie <> 0 then
    raise exception 'Oczekiwano 0 projektow w trakcie bez etapu, jest %', v_bez_etapu_w_trakcie;
  end if;

  raise notice 'OK: % projektow, 0 w trakcie bez etapu aktywnego.', v_wierszy;
end $$;
