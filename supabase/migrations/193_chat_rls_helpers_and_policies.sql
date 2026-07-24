-- Moduł Czatu — funkcje pomocnicze RLS + polityki.
-- W odróżnieniu od reszty repo (permisywne RLS + autoryzacja server-side), tabele czatu
-- mają RLS faktycznie egzekwujące dostęp — bo role zewnętrzne (klient/gość/podwykonawca)
-- subskrybują Supabase Realtime bezpośrednio z przeglądarki własnym JWT, więc RLS jest
-- jedyną linią obrony na tej ścieżce. Reużywa istniejącej public.user_can_access_project()
-- (126_profile_project_access_and_agreement_responsible.sql) jako budulca.

create or replace function public.is_chat_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_rooms r
    join public.profiles pr on pr.id = auth.uid() and pr.is_active
    where r.id = p_room_id
      and (
        pr.role = 'administrator'
        or (pr.role = 'manager' and public.user_can_access_project(r.project_id))
        or exists (
          select 1 from public.chat_room_members m
          where m.room_id = r.id and m.profile_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.is_chat_message_visible(p_message_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select public.is_chat_room_member(cm.room_id)
    from public.chat_messages cm
    where cm.id = p_message_id
  ), false);
$$;

-- Administrator, manager z dostępem do projektu, lub właściciel (owner) pokoju custom.
create or replace function public.can_manage_chat_room(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_rooms r
    join public.profiles pr on pr.id = auth.uid() and pr.is_active
    where r.id = p_room_id
      and (
        pr.role = 'administrator'
        or (pr.role = 'manager' and public.user_can_access_project(r.project_id))
        or exists (
          select 1 from public.chat_room_members m
          where m.room_id = r.id and m.profile_id = auth.uid() and m.role_in_room = 'owner'
        )
      )
  );
$$;

create or replace function public.can_manage_chat_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles pr
    where pr.id = auth.uid() and pr.is_active
      and (
        pr.role = 'administrator'
        or (pr.role = 'manager' and public.user_can_access_project(p_project_id))
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- chat_rooms
-- ---------------------------------------------------------------------------
drop policy if exists chat_rooms_select on public.chat_rooms;
create policy chat_rooms_select on public.chat_rooms
  for select using (public.is_chat_room_member(id));

drop policy if exists chat_rooms_insert on public.chat_rooms;
create policy chat_rooms_insert on public.chat_rooms
  for insert with check (kind = 'custom' and public.can_manage_chat_project(project_id));

drop policy if exists chat_rooms_update on public.chat_rooms;
create policy chat_rooms_update on public.chat_rooms
  for update using (public.can_manage_chat_room(id))
  with check (public.can_manage_chat_room(id));

drop policy if exists chat_rooms_delete on public.chat_rooms;
create policy chat_rooms_delete on public.chat_rooms
  for delete using (not is_default and public.can_manage_chat_room(id));

-- ---------------------------------------------------------------------------
-- chat_room_members
-- ---------------------------------------------------------------------------
drop policy if exists chat_room_members_select on public.chat_room_members;
create policy chat_room_members_select on public.chat_room_members
  for select using (public.is_chat_room_member(room_id));

-- Wiersze dla pokoju "client" wstawiane wyłącznie server-side (service role, sync z
-- chat_client_members) — kontakt klienta nie może sam dodać kogoś do swojego pokoju.
drop policy if exists chat_room_members_insert on public.chat_room_members;
create policy chat_room_members_insert on public.chat_room_members
  for insert with check (
    public.can_manage_chat_room(room_id)
    and exists (select 1 from public.chat_rooms r where r.id = room_id and r.kind <> 'client')
  );

drop policy if exists chat_room_members_update_self on public.chat_room_members;
create policy chat_room_members_update_self on public.chat_room_members
  for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists chat_room_members_update_manage on public.chat_room_members;
create policy chat_room_members_update_manage on public.chat_room_members
  for update using (public.can_manage_chat_room(room_id))
  with check (public.can_manage_chat_room(room_id));

drop policy if exists chat_room_members_delete on public.chat_room_members;
create policy chat_room_members_delete on public.chat_room_members
  for delete using (public.can_manage_chat_room(room_id));

-- ---------------------------------------------------------------------------
-- chat_messages
-- ---------------------------------------------------------------------------
drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select on public.chat_messages
  for select using (public.is_chat_room_member(room_id));

drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert on public.chat_messages
  for insert with check (
    not is_system
    and author_id = auth.uid()
    and public.is_chat_room_member(room_id)
  );

-- Edycja/usuwanie (soft-delete = update is_deleted) — tylko własny autor lub administrator.
drop policy if exists chat_messages_update on public.chat_messages;
create policy chat_messages_update on public.chat_messages
  for update using (author_id = auth.uid() or public.is_administrator())
  with check (author_id = auth.uid() or public.is_administrator());

-- ---------------------------------------------------------------------------
-- chat_message_edits (log audytowy, niezmienny)
-- ---------------------------------------------------------------------------
drop policy if exists chat_message_edits_select on public.chat_message_edits;
create policy chat_message_edits_select on public.chat_message_edits
  for select using (public.is_chat_message_visible(message_id));

drop policy if exists chat_message_edits_insert on public.chat_message_edits;
create policy chat_message_edits_insert on public.chat_message_edits
  for insert with check (edited_by = auth.uid() and public.is_chat_message_visible(message_id));

-- ---------------------------------------------------------------------------
-- chat_attachments
-- ---------------------------------------------------------------------------
drop policy if exists chat_attachments_select on public.chat_attachments;
create policy chat_attachments_select on public.chat_attachments
  for select using (public.is_chat_message_visible(message_id));

drop policy if exists chat_attachments_insert on public.chat_attachments;
create policy chat_attachments_insert on public.chat_attachments
  for insert with check (
    exists (
      select 1 from public.chat_messages m
      where m.id = message_id and m.author_id = auth.uid()
    )
  );

drop policy if exists chat_attachments_delete on public.chat_attachments;
create policy chat_attachments_delete on public.chat_attachments
  for delete using (public.is_administrator());

-- ---------------------------------------------------------------------------
-- chat_reactions
-- ---------------------------------------------------------------------------
drop policy if exists chat_reactions_select on public.chat_reactions;
create policy chat_reactions_select on public.chat_reactions
  for select using (public.is_chat_message_visible(message_id));

drop policy if exists chat_reactions_insert on public.chat_reactions;
create policy chat_reactions_insert on public.chat_reactions
  for insert with check (profile_id = auth.uid() and public.is_chat_message_visible(message_id));

drop policy if exists chat_reactions_delete on public.chat_reactions;
create policy chat_reactions_delete on public.chat_reactions
  for delete using (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- chat_reads
-- ---------------------------------------------------------------------------
drop policy if exists chat_reads_select on public.chat_reads;
create policy chat_reads_select on public.chat_reads
  for select using (public.is_chat_message_visible(message_id));

drop policy if exists chat_reads_insert on public.chat_reads;
create policy chat_reads_insert on public.chat_reads
  for insert with check (profile_id = auth.uid() and public.is_chat_message_visible(message_id));

drop policy if exists chat_reads_update on public.chat_reads;
create policy chat_reads_update on public.chat_reads
  for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- chat_mentions — insert tylko service-role (brak polityki client-side insert/update/delete),
-- żeby nie dało się podszyć pod wzmiankę.
-- ---------------------------------------------------------------------------
drop policy if exists chat_mentions_select on public.chat_mentions;
create policy chat_mentions_select on public.chat_mentions
  for select using (public.is_chat_message_visible(message_id));

-- ---------------------------------------------------------------------------
-- chat_pins
-- ---------------------------------------------------------------------------
drop policy if exists chat_pins_select on public.chat_pins;
create policy chat_pins_select on public.chat_pins
  for select using (public.is_chat_room_member(room_id));

drop policy if exists chat_pins_insert on public.chat_pins;
create policy chat_pins_insert on public.chat_pins
  for insert with check (public.can_manage_chat_room(room_id));

drop policy if exists chat_pins_delete on public.chat_pins;
create policy chat_pins_delete on public.chat_pins
  for delete using (public.can_manage_chat_room(room_id));

-- ---------------------------------------------------------------------------
-- chat_client_members — zarządzane wyłącznie przez administratora/service-role.
-- ---------------------------------------------------------------------------
drop policy if exists chat_client_members_admin on public.chat_client_members;
create policy chat_client_members_admin on public.chat_client_members
  for all using (public.is_administrator())
  with check (public.is_administrator());

notify pgrst, 'reload schema';
