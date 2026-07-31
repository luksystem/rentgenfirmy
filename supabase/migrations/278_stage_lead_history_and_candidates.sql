-- D46 — historia zmian lidera etapu + fakty do rankingu kandydatow.
--
-- "Zmiana w trakcie = wpis do historii z OBOWIAZKOWYM handover_note" (decyzja wlasciciela).
-- Wymuszone funkcja zapisu, nie tylko UI — pierwsze przypisanie do pustego slotu nie wymaga notatki
-- (nie ma czego przekazywac), ale ZASTAPIENIE istniejacego lidera juz tak.
create table project_stage_lead_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  stage_id text not null,
  previous_user_id uuid,
  new_user_id uuid,
  handover_note text,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now()
);

create index project_stage_lead_history_project_stage_idx
  on project_stage_lead_history (project_id, stage_id, changed_at desc);

comment on table project_stage_lead_history is
  'D46 — historia przypisan lidera etapu (project_stage_leads nie mialo zadnej historii). '
  'handover_note wymagany przez set_project_stage_lead() przy ZASTAPIENIU istniejacego lidera.';

alter table project_stage_leads add constraint project_stage_leads_project_stage_unique
  unique (project_id, stage_id);

create or replace function public.set_project_stage_lead(
  p_project_id uuid,
  p_stage_id text,
  p_user_id uuid,
  p_handover_note text,
  p_changed_by uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous uuid;
begin
  select user_id into v_previous
  from project_stage_leads
  where project_id = p_project_id and stage_id = p_stage_id;

  if v_previous is not null and v_previous is distinct from p_user_id
     and coalesce(btrim(p_handover_note), '') = '' then
    raise exception
      'Zmiana lidera etapu wymaga notatki przekazania — kto przejmuje i na czym stoi lista montazowa.'
      using errcode = 'check_violation';
  end if;

  insert into project_stage_leads (id, project_id, stage_id, user_id, since)
  values (gen_random_uuid(), p_project_id, p_stage_id, p_user_id, current_date)
  on conflict (project_id, stage_id)
  do update set user_id = excluded.user_id, since = excluded.since, updated_at = now();

  insert into project_stage_lead_history
    (project_id, stage_id, previous_user_id, new_user_id, handover_note, changed_by)
  values (p_project_id, p_stage_id, v_previous, p_user_id, nullif(btrim(p_handover_note), ''), p_changed_by);
end;
$$;

comment on function public.set_project_stage_lead is
  'D46 — jedyna droga zapisu lidera etapu. Wymusza handover_note przy zastapieniu istniejacego '
  'lidera (nie przy pierwszym przypisaniu) i zapisuje kazda zmiane do historii.';

grant execute on function public.set_project_stage_lead(uuid, text, uuid, text, uuid) to authenticated;
revoke execute on function public.set_project_stage_lead(uuid, text, uuid, text, uuid) from public, anon;

-- Fakty do rankingu kandydatow (D46) — piec sygnalow z ustalen wlasciciela, kazdy jako fakt,
-- BEZ wagi/punktacji. Ranking (kolejnosc lexicograficzna: przydzielony na etap -> znajomosc
-- projektu -> kompetencja -> dostepnosc -> ciaglosc) zyje jako czysta funkcja w TS
-- (lib/resource-plan/stage-lead-ranking.ts) z testem tablicy prawdy — ten sam podzial
-- mechanizm/fakty co report_communication_gate_inputs (D45) i report_stage_responsible (D42).
create or replace function public.report_stage_lead_candidate_facts(
  p_project_id uuid,
  p_stage_id text
)
returns table (
  user_id uuid,
  user_name text,
  assigned_to_stage boolean,
  known_project boolean,
  meets_competency boolean,
  is_available boolean,
  continuity_from_previous_stage boolean
)
language sql
stable
set search_path = public
as $$
  with candidates as (
    -- Kandydaci = osoby z dostepem do projektu (ta sama pula co ProjectUsersPanel).
    select distinct ppa.profile_id as user_id
    from profile_project_access ppa
    where ppa.project_id = p_project_id
  ),
  stage_assignments as (
    select distinct coalesce(rpip.user_id, rpi.assignee_id) as user_id
    from resource_plan_items rpi
    left join resource_plan_item_participants rpip on rpip.plan_item_id = rpi.id
    where rpi.project_id = p_project_id
      and rpi.process_stage_id::text = p_stage_id
      and coalesce(rpip.user_id, rpi.assignee_id) is not null
  ),
  project_assignments as (
    select distinct coalesce(rpip.user_id, rpi.assignee_id) as user_id
    from resource_plan_items rpi
    left join resource_plan_item_participants rpip on rpip.plan_item_id = rpi.id
    where rpi.project_id = p_project_id
      and coalesce(rpip.user_id, rpi.assignee_id) is not null
  ),
  stage_requirements as (
    select competency_item_id, min_level_item_id
    from process_stage_competency_requirements
    where stage_id::text = p_stage_id
  ),
  competency_ok as (
    -- Brak wymagan na etapie = kazdy spelnia trywialnie. Z wymaganiami: kandydat musi trzymac
    -- WSZYSTKIE wymagane kompetencje na poziomie >= wymaganego (po sort_order slownika poziomow).
    select c.user_id
    from candidates c
    where not exists (select 1 from stage_requirements)
       or not exists (
         select 1 from stage_requirements sr
         where not exists (
           select 1 from user_competencies uc
           join resource_dictionary_items lvl_have on lvl_have.id = uc.level_item_id
           join resource_dictionary_items lvl_need on lvl_need.id = sr.min_level_item_id
           where uc.user_id = c.user_id
             and uc.competency_item_id = sr.competency_item_id
             and lvl_have.sort_order >= lvl_need.sort_order
         )
       )
  ),
  unavailable as (
    select distinct lr.profile_id as user_id
    from leave_requests lr
    where lr.status = 'approved'
      and current_date between lr.start_date and lr.end_date
  ),
  previous_stage as (
    select sl.user_id
    from project_stage_leads sl
    join process_stages s_prev on s_prev.id::text = sl.stage_id
    join process_stages s_cur on s_cur.id::text = p_stage_id and s_cur.template_id = s_prev.template_id
    where sl.project_id = p_project_id
      and s_prev.position = s_cur.position - 1
  )
  select
    c.user_id,
    nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
    exists (select 1 from stage_assignments sa where sa.user_id = c.user_id),
    exists (select 1 from project_assignments pa where pa.user_id = c.user_id),
    exists (select 1 from competency_ok co where co.user_id = c.user_id),
    not exists (select 1 from unavailable u where u.user_id = c.user_id)
      and coalesce((select p.is_available_for_planning from profiles p where p.id = c.user_id), true),
    exists (select 1 from previous_stage ps where ps.user_id = c.user_id)
  from candidates c
  left join profiles p on p.id = c.user_id;
$$;

comment on function public.report_stage_lead_candidate_facts is
  'D46 — fakty (nie ranking) do wyboru lidera etapu. Kolejnosc priorytetow zapada w TS '
  '(stage-lead-ranking.ts), zeby miala test tablicy prawdy zgodnie z CLAUDE.md standardem (b).';

grant execute on function public.report_stage_lead_candidate_facts(uuid, text) to authenticated;
revoke execute on function public.report_stage_lead_candidate_facts(uuid, text) from public, anon;

-- Asercje na zywych danych, transakcyjna fikstuura sprzatana na koncu (analogicznie do 267/269).
do $$
declare
  v_projekt uuid;
  v_etap text;
  v_osoba uuid;
  v_wynik integer;
begin
  select p.id into v_projekt from projects p
   where exists (select 1 from project_processes pp where pp.project_id = p.id) limit 1;
  select pp.active_stage_id into v_etap from project_processes pp where pp.project_id = v_projekt;
  select ppa.profile_id into v_osoba from profile_project_access ppa
   where ppa.project_id = v_projekt limit 1;

  if v_projekt is null or v_etap is null or v_osoba is null then
    raise exception 'Brak danych do testu fikstuurowego (projekt=%, etap=%, osoba=%)', v_projekt, v_etap, v_osoba;
  end if;

  perform set_project_stage_lead(v_projekt, v_etap, v_osoba, null, v_osoba);
  select count(*) into v_wynik from project_stage_leads
   where project_id = v_projekt and stage_id = v_etap and user_id = v_osoba;
  if v_wynik <> 1 then
    raise exception 'Pierwsze przypisanie lidera nie zapisalo sie';
  end if;

  begin
    perform set_project_stage_lead(v_projekt, v_etap, gen_random_uuid(), null, v_osoba);
    raise exception 'Zastapienie bez handover_note NIE zostalo zablokowane';
  exception when check_violation then null;
  end;

  perform set_project_stage_lead(v_projekt, v_etap, v_osoba, 'Test przekazania.', v_osoba);
  select count(*) into v_wynik from project_stage_lead_history
   where project_id = v_projekt and stage_id = v_etap;
  if v_wynik < 1 then
    raise exception 'Historia zmian lidera etapu nie zapisala sie';
  end if;

  delete from project_stage_leads where project_id = v_projekt and stage_id = v_etap and user_id = v_osoba
    and since = current_date;
  delete from project_stage_lead_history where project_id = v_projekt and stage_id = v_etap;

  raise notice 'OK: pierwsze przypisanie bez notatki, zastapienie bez notatki zablokowane, z notatka zapisuje historie.';
end $$;
