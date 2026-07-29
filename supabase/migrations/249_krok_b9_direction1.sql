-- Krok B B9 kierunek 1 (docs/08 D28): "niedostepny" nie wymaga juz zaplanowanego bloku - dla
-- niezaplanowanych zobowiazan sprawdzane jest HIPOTETYCZNE okno [termin_wynikajacy - effort_days,
-- termin_wynikajacy]. Ten sam raport obsluguje teraz i codzienny cron (B8.2), i natychmiastowe
-- wywolanie przy zmianie kamienia (nizej) - jedna logika, dwa wyzwalacze.
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
      case
        when b.resource_plan_item_id is not null then
          format('%s ma zgłoszoną nieobecność w oknie wykonania (%s – %s).',
            coalesce(b.responsible_name, 'Odpowiedzialny'),
            to_char(b.plan_start_at, 'YYYY-MM-DD'), to_char(b.plan_end_at, 'YYYY-MM-DD'))
        else
          format('%s ma zgłoszoną nieobecność w oknie, w którym trzeba będzie to zrobić (%s – %s), na %s dni przed terminem.',
            coalesce(b.responsible_name, 'Odpowiedzialny'),
            to_char(b.termin_wynikajacy - b.effort_days, 'YYYY-MM-DD'), to_char(b.termin_wynikajacy, 'YYYY-MM-DD'),
            b.termin_wynikajacy - current_date)
      end as detail
    from base b
    join user_absences ua on ua.user_id = b.responsible_user_id and ua.status != 'cancelled'
    where
      (
        b.resource_plan_item_id is not null
        and b.plan_start_at < (ua.end_date::timestamptz + interval '1 day')
        and b.plan_end_at > ua.start_date::timestamptz
      )
      or
      (
        b.resource_plan_item_id is null
        and (b.termin_wynikajacy - b.effort_days) <= ua.end_date
        and b.termin_wynikajacy > ua.start_date
      )
  )
  select * from window_too_short
  union all
  select * from unavailable;
$$;

comment on function public.report_commitment_warnings is
  'Krok B B8.1/B8.2/B9-kierunek-1 (docs/08 D28) - okno_krotsze i niedostepny (zaplanowany blok LUB '
  'hipotetyczne okno [termin-effort_days, termin] dla niezaplanowanych - lapie konflikt zanim ktos '
  'w ogole zaplanuje). Wolane codziennie (cron) i natychmiast przy zmianie kamienia milowego.';

grant execute on function public.report_commitment_warnings() to authenticated;
revoke execute on function public.report_commitment_warnings() from public, anon;

-- Natychmiastowe wywolanie przy zmianie kamienia (nie czekamy na jutrzejszy cron) - ten sam
-- endpoint co B8, wiec dedup po source_id dziala identycznie (nowe konflikty -> nowe powiadomienia,
-- juz zglaszane -> pomijane).
create or replace function public.recompute_deadlines_on_milestone_date_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $$
declare
  app_url text;
  cron_secret text;
  sync_url text;
begin
  if new.milestone_dates is distinct from old.milestone_dates then
    perform public.recompute_derived_deadlines(new.project_id);

    select nullif(trim(s.app_url), ''), nullif(trim(s.cron_secret), '')
    into app_url, cron_secret
    from public.integration_cron_settings s
    where s.id = 'default';

    if app_url is not null and cron_secret is not null then
      sync_url := rtrim(app_url, '/') || '/api/cron/commitment-warnings';
      perform net.http_post(
        url := sync_url,
        headers := jsonb_build_object('Authorization', 'Bearer ' || cron_secret, 'Content-Type', 'application/json'),
        body := jsonb_build_object('source', 'milestone_date_change', 'project_id', new.project_id),
        timeout_milliseconds := 60000
      );
    end if;
  end if;
  return new;
end;
$$;

comment on function public.recompute_deadlines_on_milestone_date_change is
  'Krok A A3 + Krok B B9-kierunek-1 (docs/08 D27/D28) - przelicza terminy pochodne PLUS wola od razu '
  'sprawdzenie dostepnosci (report_commitment_warnings przez /api/cron/commitment-warnings), zamiast '
  'czekac na cron - lapie konflikt w momencie przesuniecia kamienia, nie dnia pozniej.';
