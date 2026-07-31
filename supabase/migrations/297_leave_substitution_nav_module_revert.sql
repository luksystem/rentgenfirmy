-- Faza 13 Krok 1 - korekta: "Zastepstwa" NIE zostaje osobnym modulem nawigacji (decyzja
-- wlasciciela po fakcie), tylko zakladka wewnatrz istniejacego modulu "Dostepnosc"
-- (my-work-availability). Cofniecie grantu z migracji 296 (byl 289 przed przenumerowaniem po
-- kolizji z rownolegla sesja) - "my-work-substitutions" znika z NavModuleKey w kodzie, wiec
-- pozostawiony wpis w app_settings bylby martwymi danymi.
do $$
declare
  v_role text;
  v_modules jsonb;
begin
  for v_role in select jsonb_object_keys(data->'roles') from app_settings where id = 'role_nav_permissions'
  loop
    select data->'roles'->v_role->'modules' into v_modules
    from app_settings where id = 'role_nav_permissions';

    if v_modules is not null and v_modules ? 'my-work-substitutions' then
      update app_settings
      set data = jsonb_set(
        data #- array['roles', v_role, 'actions', 'my-work-substitutions'],
        array['roles', v_role, 'modules'],
        coalesce(
          (select jsonb_agg(m) from jsonb_array_elements(v_modules) m where m <> '"my-work-substitutions"'),
          '[]'::jsonb
        ),
        true
      )
      where id = 'role_nav_permissions';
    end if;
  end loop;
end $$;

do $$
declare
  v_remaining int;
begin
  select count(*) into v_remaining
  from app_settings, jsonb_object_keys(data->'roles') as role_key
  where id = 'role_nav_permissions'
    and (
      (data->'roles'->role_key->'modules') ? 'my-work-substitutions'
      or (data->'roles'->role_key->'actions') ? 'my-work-substitutions'
    );
  if v_remaining <> 0 then
    raise exception 'my-work-substitutions nie zostal w pelni usuniety z % ról', v_remaining;
  end if;
end $$;
