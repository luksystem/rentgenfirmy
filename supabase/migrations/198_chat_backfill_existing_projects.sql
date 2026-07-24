-- Backfill pokoi czatu dla projektów utworzonych PRZED migracją 194_chat_project_triggers.sql.
-- Trigger on_project_created_chat_rooms działa tylko na AFTER INSERT — nie retroaktywnie, więc
-- wszystkie istniejące w bazie projekty (utworzone zanim ten moduł powstał) nie mają żadnego
-- pokoju. Ten skrypt uzupełnia Główny/Klient + członkostwo dokładnie tak, jak robi to trigger,
-- dla każdego projektu, który jeszcze nie ma pokoju kind='main'. Bezpieczny do wielokrotnego
-- uruchomienia (idempotentny — pomija projekty, które już mają Główny).

do $$
declare
  v_project record;
  v_main_room_id uuid;
  v_client_room_id uuid;
  v_profile record;
begin
  for v_project in
    select p.*
    from public.projects p
    where not exists (
      select 1 from public.chat_rooms r where r.project_id = p.id and r.kind = 'main'
    )
  loop
    insert into public.chat_rooms (project_id, client_id, kind, name, slug, is_default)
    values (v_project.id, v_project.client_id, 'main', 'Główny', 'general', true)
    returning id into v_main_room_id;

    insert into public.chat_rooms (project_id, client_id, kind, name, slug, is_default)
    values (v_project.id, v_project.client_id, 'client', 'Klient', 'client', true)
    returning id into v_client_room_id;

    insert into public.chat_messages (room_id, is_system, system_event_kind, body, system_event_payload)
    values (
      v_main_room_id,
      true,
      'chat_activated',
      format('Czat został aktywowany dla projektu „%s”.', coalesce(v_project.name, 'bez nazwy')),
      jsonb_build_object('entity', 'project', 'id', v_project.id, 'href', '/przestrzenie/zespol/' || v_project.id)
    );

    for v_profile in
      select id from public.profiles where role in ('instalator', 'office') and is_active
    loop
      perform public.sync_chat_main_room_member(v_project.id, v_profile.id);
    end loop;

    if v_project.client_id is not null then
      perform public.sync_chat_client_room_membership(v_project.client_id);
    end if;
  end loop;
end $$;
