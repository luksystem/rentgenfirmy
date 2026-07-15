-- Ustawienia konta: awatar, notatka „O mnie”, własne edytowanie profilu, bucket awatarów.

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists about_me text not null default '';

comment on column public.profiles.avatar_url is 'Publiczny URL awatara (Supabase Storage bucket avatars)';
comment on column public.profiles.about_me is 'Krótka notatka „O mnie” w ustawieniach konta';

-- Użytkownik może aktualizować własny profil (pola wrażliwe chroni trigger).
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  -- Administratorzy (przez is_administrator) mogą zmieniać wszystko.
  if public.is_administrator() then
    return new;
  end if;
  -- Własna aktualizacja: nie wolno zmieniać roli / aktywności / uprawnień / stawek.
  if auth.uid() = old.id then
    new.role := old.role;
    new.is_active := old.is_active;
    new.all_projects_access := old.all_projects_access;
    new.cost_rate := old.cost_rate;
    new.daily_hours_limit := old.daily_hours_limit;
    new.weekly_hours_limit := old.weekly_hours_limit;
    new.is_available_for_planning := old.is_available_for_planning;
    new.supervisor_id := old.supervisor_id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_privilege_escalation on public.profiles;
create trigger profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row
  execute function public.prevent_profile_privilege_escalation();

insert into storage.buckets (id, name, public, file_size_limit)
values ('avatars', 'avatars', true, 2097152)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "avatars_storage_select" on storage.objects;
drop policy if exists "avatars_storage_insert" on storage.objects;
drop policy if exists "avatars_storage_update" on storage.objects;
drop policy if exists "avatars_storage_delete" on storage.objects;

create policy "avatars_storage_select"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_storage_update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );
