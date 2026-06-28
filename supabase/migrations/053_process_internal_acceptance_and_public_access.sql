-- Odbiór wewnętrzny (flaga na elemencie katalogu i instancji projektu).
alter table public.process_elements
  add column if not exists is_internal_acceptance boolean not null default false;

alter table public.process_items
  add column if not exists is_internal_acceptance boolean not null default false;

alter table public.project_process_items
  add column if not exists is_internal_acceptance boolean not null default false;

alter table public.project_process_items
  add column if not exists internal_acceptance_state jsonb;

-- Publiczny dostęp do elementów procesu (checklisty, protokoły, odbiór wewnętrzny itd.).
create table if not exists public.project_process_item_public_access (
  project_process_item_id uuid primary key references public.project_process_items(id) on delete cascade,
  public_token text not null unique default gen_random_uuid()::text,
  public_enabled boolean not null default false,
  public_access_password_hash text,
  public_access_username text,
  public_author_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_process_item_public_access_token_idx
  on public.project_process_item_public_access (public_token);

-- Backfill pozycji szablonu z katalogu elementów.
update public.process_items pi
set is_internal_acceptance = coalesce(pe.is_internal_acceptance, false)
from public.process_elements pe
where pi.element_id = pe.id
  and pe.is_internal_acceptance = true;

-- Backfill instancji projektu.
update public.project_process_items ppi
set is_internal_acceptance = coalesce(pi.is_internal_acceptance, pe.is_internal_acceptance, false)
from public.process_items pi
left join public.process_elements pe on pe.id = pi.element_id
where ppi.template_item_id = pi.id;
