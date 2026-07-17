-- Rola pracownik → instalator; dodanie enum office (użycie office dopiero w 157 — PG wymaga commit).

-- 1) Zmiana nazwy wartości enum (dane w profiles.role migrują automatycznie)
do $$
begin
  if exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'user_role'
      and e.enumlabel = 'pracownik'
  ) then
    alter type public.user_role rename value 'pracownik' to 'instalator';
  end if;
end $$;

-- 2) Nowa rola Office — bez użycia w tym samym pliku/transakcji
alter type public.user_role add value if not exists 'office';

-- 3) Domyślna rola nowych kont + trigger rejestracji
alter table public.profiles
  alter column role set default 'instalator'::public.user_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    role,
    is_active
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'instalator'),
    true
  )
  on conflict (id) do update
  set
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

-- 4) Polityka listy zespołu — instalator zamiast pracownik (office dołoży 157)
drop policy if exists profiles_select_team on public.profiles;
create policy profiles_select_team
  on public.profiles for select
  using (
    auth.uid() is not null
    and is_active = true
    and role in ('administrator', 'manager', 'instalator', 'podwykonawca')
  );

-- 5) Uprawnienia ról w app_settings: klucz pracownik → instalator
update public.app_settings
set
  data = jsonb_set(
    data,
    '{roles}',
    (
      coalesce(data->'roles', '{}'::jsonb)
      - 'pracownik'
      || case
        when data->'roles' ? 'pracownik' and not (data->'roles' ? 'instalator')
          then jsonb_build_object('instalator', data->'roles'->'pracownik')
        else '{}'::jsonb
      end
    )
  ),
  updated_at = now()
where id = 'role_nav_permissions'
  and data ? 'roles'
  and data->'roles' ? 'pracownik';

notify pgrst, 'reload schema';
