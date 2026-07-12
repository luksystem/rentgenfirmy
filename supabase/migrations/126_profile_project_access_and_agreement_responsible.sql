-- Dostęp użytkowników do projektów + osoba odpowiedzialna na ustaleniach

alter table public.profiles
  add column if not exists all_projects_access boolean not null default true;

comment on column public.profiles.all_projects_access is
  'Gdy true (domyślnie admin/manager): dostęp do wszystkich projektów. Gdy false: tylko projekty z profile_project_access. Administrator zawsze ma pełny dostęp.';

create table if not exists public.profile_project_access (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, project_id)
);

create index if not exists profile_project_access_project_idx
  on public.profile_project_access (project_id);

alter table public.profile_project_access enable row level security;

drop policy if exists profile_project_access_select on public.profile_project_access;
create policy profile_project_access_select on public.profile_project_access
  for select using (auth.uid() is not null);

drop policy if exists profile_project_access_admin_write on public.profile_project_access;
create policy profile_project_access_admin_write on public.profile_project_access
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'administrator'
    )
  );

alter table public.project_client_agreements
  add column if not exists responsible_user_id uuid references public.profiles (id) on delete set null;

create index if not exists project_client_agreements_responsible_user_idx
  on public.project_client_agreements (responsible_user_id)
  where responsible_user_id is not null;

comment on column public.project_client_agreements.responsible_user_id is
  'Osoba odpowiedzialna po stronie zespołu — otrzymuje zadanie w Moja praca (sync work_items).';

-- Funkcja dostępu do projektu (używana w RLS)
create or replace function public.user_can_access_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when (select role from public.profiles where id = auth.uid()) = 'administrator' then true
    when coalesce((select all_projects_access from public.profiles where id = auth.uid()), true) then true
    else exists (
      select 1
      from public.profile_project_access ppa
      where ppa.profile_id = auth.uid()
        and ppa.project_id = target_project_id
    )
  end;
$$;

-- Ograniczenie widoczności projektów (zastępuje policies select z using(true) jeśli istnieją)
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select using (public.user_can_access_project(id));
