-- ═══════════════════════════════════════════════════════════════════════════
-- Wizualizacje — kontakty przypisane do projektów (Etap 5)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.project_contacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  role_code text not null default 'other',
  display_name text,
  email text,
  phone text,
  notes text,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    contact_id is not null
    or nullif(trim(coalesce(display_name, '')), '') is not null
  )
);

create index if not exists project_contacts_project_idx
  on public.project_contacts (project_id, sort_order);

create index if not exists project_contacts_contact_idx
  on public.project_contacts (contact_id)
  where contact_id is not null;

alter table public.project_contacts enable row level security;

drop policy if exists project_contacts_select on public.project_contacts;
create policy project_contacts_select on public.project_contacts
  for select using (public.user_can_access_project(project_id));

drop policy if exists project_contacts_write on public.project_contacts;
create policy project_contacts_write on public.project_contacts
  for all using (public.user_can_access_project(project_id))
  with check (public.user_can_access_project(project_id));
