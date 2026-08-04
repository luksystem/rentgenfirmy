-- Naprawa audytu bramy (3/3): report_project_readiness() (migracja 219) byla dotad WYLACZNIE
-- funkcja SQL, uruchamialna recznie z SQL Editora — zero wywolan z aplikacji. Nowy modul nawigacji
-- "project-readiness" (/gotowosc) to pierwsze wywolanie z poziomu aplikacji.
--
-- Ten sam krok co przy kazdym wczesniejszym module: kod (lib/navigation/role-nav-defaults.ts) to
-- tylko bootstrap dla roli BEZ zapisanego override'u w app_settings — a override juz istnieje dla
-- wszystkich rol produkcyjnych, wiec bez tej migracji modul bylby niewidoczny mimo poprawnego kodu
-- (patrz 296_leave_substitution_nav_module_grant.sql, ten sam wzorzec).
--
-- Zasieg: to narzedzie audytowe (test gotowosci projektu, docs/09), nie codzienna praca zespolu —
-- dostaje je kazda rola, ktora dzis ma juz "audit" (administrator, manager), z TYMI SAMYMI akcjami
-- (audit ma najszerszy zestaw permission_actions dla porownywalnego modulu raportowego).
do $$
declare
  v_role text;
  v_actions jsonb;
  v_modules jsonb;
begin
  for v_role in select jsonb_object_keys(data->'roles') from app_settings where id = 'role_nav_permissions'
  loop
    select data->'roles'->v_role->'actions'->'audit'
    into v_actions
    from app_settings where id = 'role_nav_permissions';

    if v_actions is null then
      continue;
    end if;

    select data->'roles'->v_role->'modules' into v_modules
    from app_settings where id = 'role_nav_permissions';

    if v_modules is null or not (v_modules ? 'project-readiness') then
      update app_settings
      set data = jsonb_set(
        jsonb_set(
          data,
          array['roles', v_role, 'actions', 'project-readiness'],
          v_actions,
          true
        ),
        array['roles', v_role, 'modules'],
        coalesce(data->'roles'->v_role->'modules', '[]'::jsonb) || to_jsonb(array['project-readiness']),
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
    and (data->'roles'->role_key->'actions' ? 'audit')
    and not (data->'roles'->role_key->'modules' ? 'project-readiness');
  if v_missing <> 0 then
    raise exception 'Nie wszystkie role z "audit" dostaly "project-readiness" (brakuje %)', v_missing;
  end if;
end $$;
