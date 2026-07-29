-- Krok B B9 kierunek 2 (docs/08 D28): przy zatwierdzeniu urlopu - co realnie wypada w oknie, dla
-- KONKRETNEJ osoby i KONKRETNEGO okna urlopu (nie caly user_absences jak w report_commitment_
-- warnings). Obejmuje zaplanowane bloki resource_plan_items ORAZ niezaplanowane zobowiazania
-- (dotad niewidoczne dla tego mechanizmu - to one zaskakuja, nie zaplanowane).
create or replace function public.report_leave_commitment_impact(
  p_profile_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  kind text,
  project_id uuid,
  project_name text,
  item_id uuid,
  title text,
  window_start text,
  window_end text
)
language sql
stable
set search_path = public
as $$
  with active_stage as (
    select p.id as project_id, p.name as project_name, ps.id as stage_id
    from projects p
    join project_processes pp on pp.project_id = p.id
    join process_stages ps on ps.id::text = pp.active_stage_id
  ),
  base as (
    select
      a.project_id, a.project_name, ppi.id as item_id,
      coalesce(pe.title, pi.title) as title,
      ppi.termin_wynikajacy, pi.effort_days,
      rpi.id as resource_plan_item_id, rpi.start_at as plan_start_at, rpi.end_at as plan_end_at,
      coalesce(ppi.assignee_id, prs.user_id) as responsible_user_id
    from active_stage a
    join process_milestones ms on ms.stage_id = a.stage_id
    join process_items pi on pi.milestone_id = ms.id and pi.lead_days is not null
    join project_process_items ppi on ppi.project_id = a.project_id and ppi.template_item_id = pi.id
    left join process_elements pe on pe.id = pi.element_id
    left join resource_plan_items rpi on rpi.process_item_id = ppi.id
    left join lateral (
      select prs.user_id
      from process_stage_role_responsibility psr
      join project_role_slot prs on prs.project_id = a.project_id and prs.role_code = psr.role_code
      where psr.stage_id = a.stage_id and psr.is_glowny = true
      limit 1
    ) prs on true
    where ppi.data_ukonczenia is null
      and ppi.termin_wynikajacy is not null
      and pi.effort_days is not null
      and coalesce(ppi.assignee_id, prs.user_id) = p_profile_id
  )
  select
    'zaplanowany'::text as kind, project_id, project_name, item_id, title,
    to_char(plan_start_at, 'YYYY-MM-DD') as window_start, to_char(plan_end_at, 'YYYY-MM-DD') as window_end
  from base
  where resource_plan_item_id is not null
    and plan_start_at < (p_end_date::timestamptz + interval '1 day')
    and plan_end_at > p_start_date::timestamptz

  union all

  select
    'niezaplanowany'::text as kind, project_id, project_name, item_id, title,
    to_char(termin_wynikajacy - effort_days, 'YYYY-MM-DD') as window_start,
    to_char(termin_wynikajacy, 'YYYY-MM-DD') as window_end
  from base
  where resource_plan_item_id is null
    and (termin_wynikajacy - effort_days) <= p_end_date
    and termin_wynikajacy > p_start_date;
$$;

comment on function public.report_leave_commitment_impact is
  'Krok B B9 kierunek 2 (docs/08 D28) - dla konkretnej osoby i konkretnego okna urlopu: ktore '
  'zobowiazania (zaplanowane bloki i niezaplanowane, oba dotad niewidoczne dla tego kierunku) '
  'wypadaja w tym oknie. Wolane przy zatwierdzeniu wniosku urlopowego (nie czeka na cron).';

grant execute on function public.report_leave_commitment_impact(uuid, date, date) to authenticated;
revoke execute on function public.report_leave_commitment_impact(uuid, date, date) from public, anon;
