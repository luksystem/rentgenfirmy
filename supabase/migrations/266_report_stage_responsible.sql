-- D42 pkt 4b — odpowiedzialny za etap, WYLICZANY, nie przechowywany.
-- Dwa joiny, o ktore prosil wlasciciel: glowny wpis z macierzy dla etapu -> kto trzyma ten slot
-- na projekcie. Plus, OSOBNO i inaczej podpisany, lider etapu (project_stage_leads) — to inna rola:
-- odpowiedzialny prowadzi etap, lider montazu prowadzi brygade.
--
-- Jedna funkcja dla wszystkich czterech miejsc wyswietlania (widok procesu, elementy etapu bez
-- assignee, kalendarz zobowiazan, wlasciciel zgloszen), zeby nie powstaly cztery rozne definicje
-- tego samego.
--
-- project_stage_leads.stage_id jest TEXT (nie uuid) — stad rzutowanie. slot_source niesie 'fallback',
-- co UI pokazuje badgem "zastepczo", tym samym wzorcem co panel obsady projektu.
create or replace function public.report_stage_responsible(p_project_id uuid)
returns table (
  stage_id uuid,
  stage_code text,
  stage_title text,
  stage_position integer,
  role_code text,
  role_name text,
  responsible_user_id uuid,
  responsible_name text,
  slot_source text,
  requires_project_stage_lead boolean,
  stage_lead_user_id uuid,
  stage_lead_name text
)
language sql
stable
set search_path = public
as $$
  select
    s.id,
    s.code,
    s.title,
    s.position,
    r.role_code,
    ro.name,
    prs.user_id,
    nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
    prs.source::text,
    s.requires_project_stage_lead,
    sl.user_id,
    nullif(btrim(concat_ws(' ', slp.first_name, slp.last_name)), '')
  from project_processes pp
  join process_stages s on s.template_id = pp.template_id
  left join process_stage_role_responsibility r on r.stage_id = s.id and r.is_glowny
  left join role ro on ro.code = r.role_code
  left join project_role_slot prs
    on prs.project_id = pp.project_id
   and prs.role_code = r.role_code
   and prs.to_date is null
  left join profiles p on p.id = prs.user_id
  left join project_stage_leads sl on sl.project_id = pp.project_id and sl.stage_id = s.id::text
  left join profiles slp on slp.id = sl.user_id
  where pp.project_id = p_project_id
  order by s.position;
$$;

comment on function public.report_stage_responsible is
  'D42 — odpowiedzialny za etap wyliczany z macierzy (is_glowny) i obsady slotu. Lider etapu '
  'zwracany osobno, to inna rola. Jedno zrodlo dla wszystkich miejsc wyswietlania.';

grant execute on function public.report_stage_responsible(uuid) to authenticated;
revoke execute on function public.report_stage_responsible(uuid) from public, anon;
