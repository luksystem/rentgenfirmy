-- Krok B: potrzebne effort_days (do materializacji dlugosci bloku) i resource_plan_item_id
-- (czy juz zaplanowane) w wyjsciu report_stage_commitments().
drop function public.report_stage_commitments(integer);

create or replace function public.report_stage_commitments(p_horizon_days integer default 21)
returns table (
  project_id uuid,
  project_name text,
  stage_id uuid,
  stage_title text,
  item_id uuid,
  template_item_id uuid,
  title text,
  termin_wynikajacy date,
  data_planowana date,
  data_ukonczenia timestamptz,
  effort_days integer,
  resource_plan_item_id uuid,
  responsible_user_id uuid,
  responsible_name text,
  responsible_source text,
  status text
)
language sql
stable
set search_path = public
as $$
  with active_stage as (
    select
      p.id as project_id,
      p.name as project_name,
      ps.id as stage_id,
      ps.title as stage_title
    from projects p
    join project_processes pp on pp.project_id = p.id
    join process_stages ps on ps.id::text = pp.active_stage_id
  ),
  candidate_items as (
    select
      a.project_id,
      a.project_name,
      a.stage_id,
      a.stage_title,
      ppi.id as item_id,
      pi.id as template_item_id,
      ppi.assignee_id,
      ppi.assignee_name,
      ppi.termin_wynikajacy,
      ppi.data_planowana,
      ppi.data_ukonczenia,
      pi.effort_days,
      rpi.id as resource_plan_item_id,
      coalesce(pe.title, pi.title) as title
    from active_stage a
    join process_milestones ms on ms.stage_id = a.stage_id
    join process_items pi on pi.milestone_id = ms.id and pi.lead_days is not null
    join project_process_items ppi on ppi.project_id = a.project_id and ppi.template_item_id = pi.id
    left join process_elements pe on pe.id = pi.element_id
    left join resource_plan_items rpi on rpi.process_item_id = ppi.id
  )
  select
    ci.project_id, ci.project_name, ci.stage_id, ci.stage_title, ci.item_id, ci.template_item_id, ci.title,
    ci.termin_wynikajacy, ci.data_planowana, ci.data_ukonczenia, ci.effort_days, ci.resource_plan_item_id,
    resp.responsible_user_id, resp.responsible_name, resp.responsible_source,
    case
      when ci.data_ukonczenia is not null then 'zrobione'
      when ci.data_planowana is null then 'brak_planu'
      when ci.data_planowana > ci.termin_wynikajacy then 'rozbieznosc'
      else 'ok'
    end as status
  from candidate_items ci
  left join lateral (
    select
      coalesce(ci.assignee_id, prs.user_id) as responsible_user_id,
      coalesce(ci.assignee_name, trim(prof.first_name || ' ' || prof.last_name)) as responsible_name,
      case when ci.assignee_id is not null then 'assignee' else 'macierz' end as responsible_source
    from process_stage_role_responsibility psr
    left join project_role_slot prs on prs.project_id = ci.project_id and prs.role_code = psr.role_code
    left join profiles prof on prof.id = prs.user_id
    where psr.stage_id = ci.stage_id and psr.is_glowny = true
    limit 1
  ) resp on true
  where ci.data_ukonczenia is not null
     or ci.termin_wynikajacy is null
     or ci.termin_wynikajacy <= (current_date + (p_horizon_days || ' days')::interval)::date
  order by ci.termin_wynikajacy nulls last, ci.project_name;
$$;

comment on function public.report_stage_commitments is
  'Krok A A7 / Krok B (docs/08 D27/D28) - kalendarz zobowiazan aktywnego etapu kazdego projektu, '
  'z effort_days (do materializacji "Zaplanuj") i resource_plan_item_id (czy juz zmaterializowane).';

grant execute on function public.report_stage_commitments(integer) to authenticated;
revoke execute on function public.report_stage_commitments(integer) from public, anon;
