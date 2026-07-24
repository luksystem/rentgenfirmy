-- Moduł Czatu — auto-provisioning pokoi i synchronizacja członkostwa.
-- Projekty tworzone są po stronie klienta (brak POST /api/projects), więc tworzenie
-- domyślnych pokoi wisi na triggerze Postgresa, nie na route handlerze.

-- Członkostwo w pokoju "Główny" dla instalator/office — jawne wiersze w chat_room_members,
-- synchronizowane automatycznie z profile_project_access/all_projects_access (nie liczone
-- dynamicznie w RLS), żeby zachować literalną semantykę "pracownik: tylko przypisane pokoje"
-- i pozwolić managerowi/adminowi ręcznie skurować uczestników Głównego per projekt.
-- Znane uproszczenie Fazy 1: ręczne usunięcie kogoś z Głównego zostanie cofnięte, jeśli
-- później nastąpi kolejna zmiana profile_project_access/all_projects_access dla tej samej
-- pary profil/projekt (re-sync przywróci dostęp) — dopracowanie w Fazie 2.
create or replace function public.sync_chat_main_room_member(p_project_id uuid, p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_role public.user_role;
  v_is_active boolean;
  v_should_have_access boolean;
begin
  select role, is_active into v_role, v_is_active from public.profiles where id = p_profile_id;
  if v_role is null or v_role not in ('instalator', 'office') or not coalesce(v_is_active, false) then
    delete from public.chat_room_members m
    using public.chat_rooms r
    where r.id = m.room_id and r.project_id = p_project_id and r.kind = 'main' and m.profile_id = p_profile_id;
    return;
  end if;

  select id into v_room_id from public.chat_rooms where project_id = p_project_id and kind = 'main';
  if v_room_id is null then
    return;
  end if;

  select coalesce(
    (select all_projects_access from public.profiles where id = p_profile_id),
    true
  ) or exists (
    select 1 from public.profile_project_access ppa
    where ppa.profile_id = p_profile_id and ppa.project_id = p_project_id
  ) into v_should_have_access;

  if v_should_have_access then
    insert into public.chat_room_members (room_id, profile_id, role_in_room)
    values (v_room_id, p_profile_id, 'member')
    on conflict (room_id, profile_id) do nothing;
  else
    delete from public.chat_room_members
    where room_id = v_room_id and profile_id = p_profile_id;
  end if;
end;
$$;

create or replace function public.sync_chat_main_room_membership_for_profile(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project record;
begin
  for v_project in select id from public.projects loop
    perform public.sync_chat_main_room_member(v_project.id, p_profile_id);
  end loop;
end;
$$;

create or replace function public.handle_profile_project_access_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_chat_main_room_member(old.project_id, old.profile_id);
    return old;
  end if;
  perform public.sync_chat_main_room_member(new.project_id, new.profile_id);
  return new;
end;
$$;

drop trigger if exists chat_sync_on_profile_project_access on public.profile_project_access;
create trigger chat_sync_on_profile_project_access
  after insert or delete on public.profile_project_access
  for each row execute function public.handle_profile_project_access_change();

create or replace function public.handle_profile_all_projects_access_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.all_projects_access is distinct from old.all_projects_access
    or new.role is distinct from old.role
    or new.is_active is distinct from old.is_active
  then
    perform public.sync_chat_main_room_membership_for_profile(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists chat_sync_on_profile_access_flags on public.profiles;
create trigger chat_sync_on_profile_access_flags
  after update of all_projects_access, role, is_active on public.profiles
  for each row execute function public.handle_profile_all_projects_access_change();

-- Członkostwo w pokoju "Klient" — sterowane przez chat_client_members (kontakt klienta
-- z realnym kontem Supabase Auth roli 'klient'), nie przez ogólny dostęp do projektu.
create or replace function public.sync_chat_client_room_membership(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room record;
begin
  for v_room in select id from public.chat_rooms where client_id = p_client_id and kind = 'client' loop
    insert into public.chat_room_members (room_id, profile_id, role_in_room)
    select v_room.id, ccm.profile_id, 'member'
    from public.chat_client_members ccm
    where ccm.client_id = p_client_id
    on conflict (room_id, profile_id) do nothing;

    delete from public.chat_room_members m
    where m.room_id = v_room.id
      and exists (select 1 from public.profiles p where p.id = m.profile_id and p.role = 'klient')
      and not exists (
        select 1 from public.chat_client_members ccm
        where ccm.client_id = p_client_id and ccm.profile_id = m.profile_id
      );
  end loop;
end;
$$;

create or replace function public.handle_chat_client_member_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_chat_client_room_membership(old.client_id);
    return old;
  end if;
  perform public.sync_chat_client_room_membership(new.client_id);
  return new;
end;
$$;

drop trigger if exists chat_sync_on_client_member_change on public.chat_client_members;
create trigger chat_sync_on_client_member_change
  after insert or delete on public.chat_client_members
  for each row execute function public.handle_chat_client_member_change();

-- Utworzenie projektu → domyślne pokoje Główny/Klient + systemowa wiadomość powitalna +
-- wstępna synchronizacja członkostwa.
create or replace function public.handle_new_project_chat_rooms()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_main_room_id uuid;
  v_client_room_id uuid;
  v_profile record;
begin
  insert into public.chat_rooms (project_id, client_id, kind, name, slug, is_default)
  values (new.id, new.client_id, 'main', 'Główny', 'general', true)
  returning id into v_main_room_id;

  insert into public.chat_rooms (project_id, client_id, kind, name, slug, is_default)
  values (new.id, new.client_id, 'client', 'Klient', 'client', true)
  returning id into v_client_room_id;

  insert into public.chat_messages (room_id, is_system, system_event_kind, body, system_event_payload)
  values (
    v_main_room_id,
    true,
    'project_created',
    format('Projekt „%s” został utworzony.', coalesce(new.name, 'bez nazwy')),
    jsonb_build_object('entity', 'project', 'id', new.id, 'href', '/przestrzenie/zespol/' || new.id)
  );

  for v_profile in
    select id from public.profiles where role in ('instalator', 'office') and is_active
  loop
    perform public.sync_chat_main_room_member(new.id, v_profile.id);
  end loop;

  if new.client_id is not null then
    perform public.sync_chat_client_room_membership(new.client_id);
  end if;

  return new;
end;
$$;

drop trigger if exists on_project_created_chat_rooms on public.projects;
create trigger on_project_created_chat_rooms
  after insert on public.projects
  for each row execute function public.handle_new_project_chat_rooms();

-- Zmiana klienta przypisanego do projektu → przenieś client_id pokoi + zsynchronizuj
-- członkostwo starego i nowego klienta.
create or replace function public.handle_project_client_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.client_id is distinct from old.client_id then
    update public.chat_rooms
    set client_id = new.client_id, updated_at = now()
    where project_id = new.id;

    if old.client_id is not null then
      perform public.sync_chat_client_room_membership(old.client_id);
    end if;
    if new.client_id is not null then
      perform public.sync_chat_client_room_membership(new.client_id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_project_client_change_chat_rooms on public.projects;
create trigger on_project_client_change_chat_rooms
  after update of client_id on public.projects
  for each row execute function public.handle_project_client_change();

notify pgrst, 'reload schema';
