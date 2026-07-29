-- Krok B B8.1/B8.2 (docs/08 D28) - dwa ostrzezenia: okno do terminu krotsze niz effort_days
-- (dowolne niezakonczone zobowiazanie z lead_days), odpowiedzialny niedostepny w oknie wykonania
-- (tylko zaplanowane - maja blok w resource_plan_items). Wzorzec jak report_stage_commitments.
create or replace function public.report_commitment_warnings()
returns table (
  warning_type text,
  project_id uuid,
  project_name text,
  item_id uuid,
  title text,
  termin_wynikajacy date,
  effort_days integer,
  resource_plan_item_id uuid,
  responsible_user_id uuid,
  responsible_name text,
  detail text
)
language sql
stable
set search_path = public
as $$
  with base as (
    select
      p.id as project_id,
      p.name as project_name,
      ps.id as stage_id,
      ppi.id as item_id,
      ppi.termin_wynikajacy,
      ppi.data_ukonczenia,
      pi.effort_days,
      rpi.id as resource_plan_item_id,
      rpi.start_at as plan_start_at,
      rpi.end_at as plan_end_at,
      coalesce(pe.title, pi.title) as title,
      coalesce(ppi.assignee_id, prs.user_id) as responsible_user_id,
      coalesce(ppi.assignee_name, trim(prof.first_name || ' ' || prof.last_name)) as responsible_name
    from projects p
    join project_processes pp on pp.project_id = p.id
    join process_stages ps on ps.id::text = pp.active_stage_id
    join process_milestones ms on ms.stage_id = ps.id
    join process_items pi on pi.milestone_id = ms.id and pi.lead_days is not null
    join project_process_items ppi on ppi.project_id = p.id and ppi.template_item_id = pi.id
    left join process_elements pe on pe.id = pi.element_id
    left join resource_plan_items rpi on rpi.process_item_id = ppi.id
    left join lateral (
      select prs.user_id
      from process_stage_role_responsibility psr
      join project_role_slot prs on prs.project_id = p.id and prs.role_code = psr.role_code
      where psr.stage_id = ps.id and psr.is_glowny = true
      limit 1
    ) prs on true
    left join profiles prof on prof.id = coalesce(ppi.assignee_id, prs.user_id)
    where ppi.data_ukonczenia is null
      and ppi.termin_wynikajacy is not null
      and pi.effort_days is not null
  ),
  window_too_short as (
    select
      'okno_krotsze'::text as warning_type,
      project_id, project_name, item_id, title, termin_wynikajacy, effort_days, resource_plan_item_id,
      responsible_user_id, responsible_name,
      format('Zostało %s dni do terminu, element wymaga %s dni pracy.',
        greatest(0, termin_wynikajacy - current_date), effort_days) as detail
    from base
    where (termin_wynikajacy - current_date) < effort_days
  ),
  unavailable as (
    select
      'niedostepny'::text as warning_type,
      b.project_id, b.project_name, b.item_id, b.title, b.termin_wynikajacy, b.effort_days,
      b.resource_plan_item_id, b.responsible_user_id, b.responsible_name,
      format('%s ma zgłoszoną nieobecność w oknie wykonania (%s – %s).',
        coalesce(b.responsible_name, 'Odpowiedzialny'),
        to_char(b.plan_start_at, 'YYYY-MM-DD'), to_char(b.plan_end_at, 'YYYY-MM-DD')) as detail
    from base b
    join user_absences ua on ua.user_id = b.responsible_user_id and ua.status != 'cancelled'
    where b.resource_plan_item_id is not null
      and b.plan_start_at < (ua.end_date::timestamptz + interval '1 day')
      and b.plan_end_at > ua.start_date::timestamptz
  )
  select * from window_too_short
  union all
  select * from unavailable;
$$;

comment on function public.report_commitment_warnings is
  'Krok B B8.1/B8.2 (docs/08 D28) - okno_krotsze (dowolne niezakonczone zobowiazanie, okno do '
  'terminu < effort_days) i niedostepny (zaplanowany blok, odpowiedzialny ma nieobecnosc w oknie). '
  'Zrodlo dla crona powiadomien (lib/notifications/commitment-warnings-server.ts).';

grant execute on function public.report_commitment_warnings() to authenticated;
revoke execute on function public.report_commitment_warnings() from public, anon;
