-- Jedyna pozycja z fazy 2 wymagająca ręcznej decyzji (docs/08 D15): wlasciciel nie ma żadnego
-- źródła w starych booleanach profile_project_access — jedna, znana osoba w całej firmie,
-- nie coś do wywnioskowania z danych. Profile ID podane przez właściciela wprost.

do $$
declare
  v_owner_id uuid := '3345c163-70a5-4476-a674-a12c1f2f9fc9';
  v_total_projects int;
  v_existing_slots int;
  v_inserted int;
begin
  select count(*) into v_total_projects from public.projects;

  select count(*) into v_existing_slots
    from public.project_role_slot
    where role_code = 'wlasciciel' and to_date is null;

  insert into public.project_role_slot (project_id, role_code, user_id, source, source_ref)
  select p.id, 'wlasciciel', v_owner_id, 'obsada', 'owner_manual_seed'
  from public.projects p
  where not exists (
    select 1 from public.project_role_slot prs
    where prs.project_id = p.id and prs.role_code = 'wlasciciel' and prs.to_date is null
  );

  get diagnostics v_inserted = row_count;

  raise notice 'Projekty: %, sloty wlasciciel istniejące wcześniej: %, nowo wstawione: %', v_total_projects, v_existing_slots, v_inserted;

  if v_existing_slots + v_inserted <> v_total_projects then
    raise exception 'Slot wlasciciel: oczekiwano pokrycia % projektów, jest %.', v_total_projects, v_existing_slots + v_inserted;
  end if;
end $$;
