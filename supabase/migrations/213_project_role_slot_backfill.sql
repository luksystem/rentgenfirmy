-- Faza 2 — Backfill project_role_slot z is_technical_lead / is_operational_lead / is_developer
-- (/docs/04 §2.4, docs/08 D4/D7/D15).
--
-- Mapowanie (D4):
--   is_technical_lead   -> koordynator_techniczny + projektant
--   is_operational_lead -> opiekun_projektu + koordynator_operacyjny
--   is_developer        -> wdrozeniowiec
--
-- Trzy ścieżki (D15 + korekta właściciela + ta migracja):
--   1. Dokładnie jedna osoba ma flagę = true na projekcie -> source='obsada'.
--   2. Więcej niż jedna osoba ma tę samą flagę = true na tym samym projekcie ->
--      KONFLIKT. Nie wybieramy arbitralnie — wiersz idzie do
--      project_role_slot_migration_conflict, żadnego project_role_slot nie wstawiamy
--      dla tej pary (projekt, rola) i POMIJAMY ją też w rundzie fallbacku (fallback
--      podstawiłby zupełnie inną osobę, co nie rozwiązuje pytania "który z tych dwóch",
--      tylko je maskuje). Slot zostaje pusty, konflikt zostaje widoczny do ręcznej decyzji.
--   3. Brak jakiegokolwiek `true` na projekcie dla danej roli (i brak konfliktu) ->
--      próba pokrycia łańcuchem fallbacku (role_fallback), source='fallback',
--      source_ref='d15_migration'.
--
-- WAŻNE, nieobsłużone tu: `wlasciciel` nie ma żadnego źródła w starych booleanach —
-- wymaga jednego ręcznego INSERT-u przez właściciela. `asystent_procesu` celowo pomijamy
-- w backfillu — CLAUDE.md: "domyślnie nieobsadzony".

create table if not exists public.project_role_slot_migration_conflict (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  source_field text not null check (source_field in ('is_technical_lead', 'is_operational_lead', 'is_developer')),
  target_role_codes text[] not null,
  conflicting_user_ids uuid[] not null,
  detected_at timestamptz not null default now(),
  resolved boolean not null default false,
  resolved_role_code text,
  resolved_user_id uuid references public.profiles (id),
  resolved_at timestamptz,
  resolved_note text
);

comment on table public.project_role_slot_migration_conflict is
  'Projekty, gdzie więcej niż jedna osoba miała tę samą flagę (is_technical_lead/is_operational_lead/'
  'is_developer) w chwili backfillu fazy 2 — migracja NIE wybiera arbitralnie. target_role_codes zostaje '
  'bez project_role_slot, dopóki resolved=false. Rozwiązanie: wstaw ręcznie właściwy project_role_slot '
  '(source=''obsada'') dla wybranej osoby, potem oznacz ten wiersz resolved=true z resolved_role_code/'
  'resolved_user_id/resolved_note.';

alter table public.project_role_slot_migration_conflict enable row level security;
drop policy if exists "project_role_slot_migration_conflict_all" on public.project_role_slot_migration_conflict;
create policy "project_role_slot_migration_conflict_all" on public.project_role_slot_migration_conflict
  for all using (true) with check (true);

do $$
declare
  v_project record;
  v_match_count int;
  v_chosen_profile uuid;
  v_conflicting_ids uuid[];
begin
  for v_project in select id from public.projects loop

    -- is_technical_lead -> koordynator_techniczny + projektant
    select count(*) into v_match_count
      from public.profile_project_access
      where project_id = v_project.id and is_technical_lead = true;

    if v_match_count = 1 then
      select profile_id into v_chosen_profile
        from public.profile_project_access
        where project_id = v_project.id and is_technical_lead = true
        limit 1;

      insert into public.project_role_slot (project_id, role_code, user_id, source, source_ref)
      values (v_project.id, 'koordynator_techniczny', v_chosen_profile, 'obsada', 'd4_migration_backfill')
      on conflict do nothing;
      insert into public.project_role_slot (project_id, role_code, user_id, source, source_ref)
      values (v_project.id, 'projektant', v_chosen_profile, 'obsada', 'd4_migration_backfill')
      on conflict do nothing;

    elsif v_match_count > 1 then
      select array_agg(profile_id) into v_conflicting_ids
        from public.profile_project_access
        where project_id = v_project.id and is_technical_lead = true;

      raise warning 'Projekt %: KONFLIKT is_technical_lead — % osób. Zapisano do project_role_slot_migration_conflict, slot pominięty.',
        v_project.id, v_match_count;

      insert into public.project_role_slot_migration_conflict
        (project_id, source_field, target_role_codes, conflicting_user_ids)
      values
        (v_project.id, 'is_technical_lead', array['koordynator_techniczny', 'projektant'], v_conflicting_ids);
    end if;

    -- is_operational_lead -> opiekun_projektu + koordynator_operacyjny
    select count(*) into v_match_count
      from public.profile_project_access
      where project_id = v_project.id and is_operational_lead = true;

    if v_match_count = 1 then
      select profile_id into v_chosen_profile
        from public.profile_project_access
        where project_id = v_project.id and is_operational_lead = true
        limit 1;

      insert into public.project_role_slot (project_id, role_code, user_id, source, source_ref)
      values (v_project.id, 'opiekun_projektu', v_chosen_profile, 'obsada', 'd4_migration_backfill')
      on conflict do nothing;
      insert into public.project_role_slot (project_id, role_code, user_id, source, source_ref)
      values (v_project.id, 'koordynator_operacyjny', v_chosen_profile, 'obsada', 'd4_migration_backfill')
      on conflict do nothing;

    elsif v_match_count > 1 then
      select array_agg(profile_id) into v_conflicting_ids
        from public.profile_project_access
        where project_id = v_project.id and is_operational_lead = true;

      raise warning 'Projekt %: KONFLIKT is_operational_lead — % osób. Zapisano do project_role_slot_migration_conflict, slot pominięty.',
        v_project.id, v_match_count;

      insert into public.project_role_slot_migration_conflict
        (project_id, source_field, target_role_codes, conflicting_user_ids)
      values
        (v_project.id, 'is_operational_lead', array['opiekun_projektu', 'koordynator_operacyjny'], v_conflicting_ids);
    end if;

    -- is_developer -> wdrozeniowiec
    select count(*) into v_match_count
      from public.profile_project_access
      where project_id = v_project.id and is_developer = true;

    if v_match_count = 1 then
      select profile_id into v_chosen_profile
        from public.profile_project_access
        where project_id = v_project.id and is_developer = true
        limit 1;

      insert into public.project_role_slot (project_id, role_code, user_id, source, source_ref)
      values (v_project.id, 'wdrozeniowiec', v_chosen_profile, 'obsada', 'd4_migration_backfill')
      on conflict do nothing;

    elsif v_match_count > 1 then
      select array_agg(profile_id) into v_conflicting_ids
        from public.profile_project_access
        where project_id = v_project.id and is_developer = true;

      raise warning 'Projekt %: KONFLIKT is_developer — % osób. Zapisano do project_role_slot_migration_conflict, slot pominięty.',
        v_project.id, v_match_count;

      insert into public.project_role_slot_migration_conflict
        (project_id, source_field, target_role_codes, conflicting_user_ids)
      values
        (v_project.id, 'is_developer', array['wdrozeniowiec'], v_conflicting_ids);
    end if;

  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Druga ścieżka: fallback dla wciąż-pustych slotów wśród pięciu ról migrowanych wyżej.
-- POMIJA role z nierozwiązanym konfliktem (project_role_slot_migration_conflict) —
-- fallback podstawiłby inną osobę, co nie rozstrzyga "który z dwóch", tylko to maskuje.
-- Trzy rundy (odpowiednik limitu głębokości 3) — role_fallback ma dziś płytkie łańcuchy,
-- generyczny rezolwer z limitem głębokości żyje w lib/process/role-fallback.ts.
-- ---------------------------------------------------------------------------

do $$
declare
  v_round int;
  v_project record;
  v_role text;
  v_fallback_role text;
  v_holder uuid;
  v_migrated_roles text[] := array[
    'koordynator_techniczny', 'projektant', 'opiekun_projektu', 'koordynator_operacyjny', 'wdrozeniowiec'
  ];
begin
  for v_round in 1 .. 3 loop
    for v_project in select id from public.projects loop
      foreach v_role in array v_migrated_roles loop

        -- pomiń, jeśli slot już obsadzony (obsada albo poprzednia runda fallbacku)
        if exists (
          select 1 from public.project_role_slot
          where project_id = v_project.id and role_code = v_role and to_date is null
        ) then
          continue;
        end if;

        -- pomiń, jeśli ta (projekt, rola) ma nierozwiązany konflikt — patrz komentarz wyżej
        if exists (
          select 1 from public.project_role_slot_migration_conflict
          where project_id = v_project.id
            and v_role = any (target_role_codes)
            and resolved = false
        ) then
          continue;
        end if;

        select fallback_role_code into v_fallback_role
          from public.role_fallback
          where role_code = v_role
          order by priority
          limit 1;

        if v_fallback_role is null then
          continue; -- brak fallbacku (np. wdrozeniowiec) — zostaje luką, zgodnie z /docs/04 §2.2
        end if;

        select user_id into v_holder
          from public.project_role_slot
          where project_id = v_project.id and role_code = v_fallback_role and to_date is null
          limit 1;

        if v_holder is not null then
          insert into public.project_role_slot (project_id, role_code, user_id, source, source_ref)
          values (v_project.id, v_role, v_holder, 'fallback', 'd15_migration')
          on conflict do nothing;
        end if;

      end loop;
    end loop;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Raport do przeglądu (D15 + korekta właściciela: WSZYSTKIE zmigrowane wiersze,
-- nie tylko podejrzane — "true" znaczy "ktoś to kiedyś ustawił", nie "aktualne").
-- ---------------------------------------------------------------------------

create or replace function public.report_project_role_slot_migration()
returns table (
  project_id uuid,
  project_name text,
  role_code text,
  user_id uuid,
  user_name text,
  source text,
  source_ref text
)
language sql
stable
set search_path = public
as $$
  select
    prs.project_id,
    p.name,
    prs.role_code,
    prs.user_id,
    coalesce(pr.first_name || ' ' || pr.last_name, pr.email),
    prs.source,
    prs.source_ref
  from public.project_role_slot prs
  join public.projects p on p.id = prs.project_id
  join public.profiles pr on pr.id = prs.user_id
  where prs.source_ref in ('d4_migration_backfill', 'd15_migration')
  order by p.name, prs.role_code;
$$;

comment on function public.report_project_role_slot_migration is
  'Wszystkie wiersze project_role_slot utworzone przez backfill fazy 2 (source_ref='
  'd4_migration_backfill lub d15_migration) — do przeglądu przez właściciela. "obsada" nie znaczy '
  '"aktualne", tylko "ktoś to kiedyś ustawił" — flaga mogła nie być aktualizowana od dawna.';

grant execute on function public.report_project_role_slot_migration() to authenticated;

-- ---------------------------------------------------------------------------
-- Raport konfliktów nierozwiązanych — do przeglądu razem z powyższym.
-- ---------------------------------------------------------------------------

create or replace function public.report_project_role_slot_conflicts()
returns table (
  conflict_id uuid,
  project_id uuid,
  project_name text,
  source_field text,
  target_role_codes text[],
  conflicting_users text[]
)
language sql
stable
set search_path = public
as $$
  select
    c.id,
    c.project_id,
    p.name,
    c.source_field,
    c.target_role_codes,
    (
      select array_agg(coalesce(pr.first_name || ' ' || pr.last_name, pr.email))
      from unnest(c.conflicting_user_ids) as uid
      join public.profiles pr on pr.id = uid
    )
  from public.project_role_slot_migration_conflict c
  join public.projects p on p.id = c.project_id
  where c.resolved = false
  order by p.name, c.source_field;
$$;

comment on function public.report_project_role_slot_conflicts is
  'Projekty z więcej niż jedną osobą pod tą samą flagą w chwili backfillu — slot dla '
  'target_role_codes jest dziś PUSTY (żaden project_role_slot nie istnieje) i pominięty przez '
  'rundę fallbacku, dopóki nie rozwiążesz konfliktu ręcznie i nie oznaczysz resolved=true.';

grant execute on function public.report_project_role_slot_conflicts() to authenticated;
