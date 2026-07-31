-- Faza 13 Krok 1 - nowy modul nawigacji "my-work-substitutions" (/moja-praca/zastepstwa) trzeba
-- dograc do zapisanej konfiguracji uprawnien w app_settings (role_nav_permissions) - kod w
-- lib/navigation/role-nav-defaults.ts to tylko domyslny bootstrap dla ról BEZ zapisanego override'u,
-- a ten override juz istnieje dla wszystkich rol produkcyjnych. Bez tej migracji modul byłby
-- niewidoczny (przekierowanie na "/") mimo poprawnego kodu - dokladnie ten sam krok, jaki wymagany
-- byl przy wprowadzeniu kazdego wczesniejszego modulu "my-work-*".
--
-- Dla kazdej roli, ktora ma dzis "my-work-availability" (ten sam krag odbiorcow - zastepstwo to
-- naturalne rozszerzenie dostepnosci), dopisujemy "my-work-substitutions" z TYMI SAMYMI akcjami.
do $$
declare
  v_role text;
  v_actions jsonb;
  v_modules jsonb;
begin
  for v_role in select jsonb_object_keys(data->'roles') from app_settings where id = 'role_nav_permissions'
  loop
    select data->'roles'->v_role->'actions'->'my-work-availability'
    into v_actions
    from app_settings where id = 'role_nav_permissions';

    if v_actions is null then
      continue;
    end if;

    select data->'roles'->v_role->'modules' into v_modules
    from app_settings where id = 'role_nav_permissions';

    if v_modules is null or not (v_modules ? 'my-work-substitutions') then
      update app_settings
      set data = jsonb_set(
        jsonb_set(
          data,
          array['roles', v_role, 'actions', 'my-work-substitutions'],
          v_actions,
          true
        ),
        array['roles', v_role, 'modules'],
        coalesce(data->'roles'->v_role->'modules', '[]'::jsonb) || to_jsonb(array['my-work-substitutions']),
        true
      )
      where id = 'role_nav_permissions';
    end if;
  end loop;
end $$;

do $$
declare
  v_missing int;
begin
  select count(*) into v_missing
  from app_settings, jsonb_object_keys(data->'roles') as role_key
  where id = 'role_nav_permissions'
    and (data->'roles'->role_key->'actions' ? 'my-work-availability')
    and not (data->'roles'->role_key->'modules' ? 'my-work-substitutions');
  if v_missing <> 0 then
    raise exception 'Nie wszystkie role z my-work-availability dostaly my-work-substitutions (brakuje %)', v_missing;
  end if;
end $$;
