-- Faza 13 Krok 1 (docs/role/04 §6.3) - fakty do rankingu kandydatow na zastepstwo urlopowe.
-- Ten sam podzial mechanizm/fakty co report_stage_lead_candidate_facts (D46), report_communication_
-- gate_inputs (D45), report_stage_responsible (D42): funkcja zwraca WYLACZNIE fakty, zero wag i
-- kolejnosci - ranking zyje jako czysta funkcja TS (lib/leave/substitution-ranking.ts) z testem
-- tablicy prawdy.
--
-- Pula kandydatow = wszyscy aktywni pracownicy wewnetrzni (profiles.client_id is null, is_active),
-- POMNIEJSZONA o osobe skladajaca wniosek (p_exclude_user_id) - nie D46'owe profile_project_access,
-- bo tu "znajomosc projektu" jest kryterium SORTUJACYM (#1 w 6.3), nie warunkiem wejscia: ktos bez
-- zadnej historii na projekcie ma prawo byc kandydatem, tylko nizej w rankingu.
create or replace function public.report_substitution_candidates(
  p_project_id uuid,
  p_role_code text,
  p_start_date date,
  p_end_date date,
  p_exclude_user_id uuid
)
returns table (
  user_id uuid,
  user_name text,
  familiarity_days integer,
  meets_required_competency boolean,
  best_required_level_sort_order integer,
  is_available boolean,
  is_wlasciciel boolean
)
language sql
stable
set search_path = public
as $$
  with candidates as (
    select p.id as user_id, nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), '') as user_name
    from profiles p
    where p.client_id is null
      and p.is_active
      and p.id != p_exclude_user_id
  ),
  familiarity as (
    select coalesce(rpip.user_id, rpi.assignee_id) as user_id,
      sum(greatest(1, (rpi.end_at::date - rpi.start_at::date) + 1))::integer as days
    from resource_plan_items rpi
    left join resource_plan_item_participants rpip on rpip.plan_item_id = rpi.id
    where rpi.project_id = p_project_id
      and coalesce(rpip.user_id, rpi.assignee_id) is not null
    group by coalesce(rpip.user_id, rpi.assignee_id)
  ),
  requirements as (
    select competency_item_id, min_level_item_id
    from project_role_competency
    where role_code = p_role_code and is_required
  ),
  competency_check as (
    -- Brak wierszy wymaganych = kazdy przechodzi trywialnie (docs/08 D48: pusty wymog = brak wymogu).
    select c.user_id,
      not exists (select 1 from requirements) or not exists (
        select 1 from requirements r
        where not exists (
          select 1 from user_competencies uc
          join resource_dictionary_items lvl_have on lvl_have.id = uc.level_item_id
          join resource_dictionary_items lvl_need on lvl_need.id = r.min_level_item_id
          where uc.user_id = c.user_id
            and uc.competency_item_id = r.competency_item_id
            and lvl_have.sort_order >= lvl_need.sort_order
        )
      ) as meets,
      (
        select max(lvl_have.sort_order)
        from user_competencies uc
        join resource_dictionary_items lvl_have on lvl_have.id = uc.level_item_id
        where uc.user_id = c.user_id
          and uc.competency_item_id in (select competency_item_id from requirements)
      ) as best_level
    from candidates c
  ),
  unavailable as (
    select distinct lr.profile_id as user_id
    from leave_requests lr
    where lr.status = 'approved'
      and lr.start_date <= p_end_date
      and lr.end_date >= p_start_date
  )
  select
    c.user_id,
    c.user_name,
    coalesce(f.days, 0),
    cc.meets,
    cc.best_level,
    not exists (select 1 from unavailable u where u.user_id = c.user_id)
      and coalesce((select p.is_available_for_planning from profiles p where p.id = c.user_id), true),
    exists (
      select 1 from project_role_slot prs
      where prs.project_id = p_project_id and prs.role_code = 'wlasciciel'
        and prs.to_date is null and prs.user_id = c.user_id
    )
  from candidates c
  left join familiarity f on f.user_id = c.user_id
  join competency_check cc on cc.user_id = c.user_id;
$$;

comment on function public.report_substitution_candidates is
  'Faza 13 Krok 1 (/docs/role/04 §6.3) - fakty (nie ranking) do wyboru zastepcy na urlop. Kolejnosc '
  'priorytetow zapada w TS (lib/leave/substitution-ranking.ts) zgodnie z CLAUDE.md standardem (b).';

grant execute on function public.report_substitution_candidates(uuid, text, date, date, uuid) to authenticated;
revoke execute on function public.report_substitution_candidates(uuid, text, date, date, uuid) from public, anon;
