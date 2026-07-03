-- Moduł Kontakty (lead) z możliwością przekształcenia w klienta

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  location text not null default '',
  address_street text not null default '',
  address_city text not null default '',
  address_postal_code text not null default '',
  email text not null default '',
  phone text not null default '',
  notes text,
  external_id text,
  converted_client_id uuid references public.clients (id) on delete set null,
  converted_at timestamptz,
  conversion_source text check (conversion_source in ('manual', 'offer_accepted')),
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contacts_full_name_idx on public.contacts (full_name);
create index if not exists contacts_converted_client_idx on public.contacts (converted_client_id);
create unique index if not exists contacts_external_id_idx
  on public.contacts (external_id)
  where external_id is not null and external_id <> '';

alter table public.contacts enable row level security;

drop policy if exists "contacts_select_all" on public.contacts;
drop policy if exists "contacts_insert_all" on public.contacts;
drop policy if exists "contacts_update_all" on public.contacts;
drop policy if exists "contacts_delete_all" on public.contacts;

create policy "contacts_select_all" on public.contacts for select using (true);
create policy "contacts_insert_all" on public.contacts for insert with check (true);
create policy "contacts_update_all" on public.contacts for update using (true);
create policy "contacts_delete_all" on public.contacts for delete using (true);

alter table public.services
  add column if not exists contact_id uuid references public.contacts (id) on delete set null;

create index if not exists services_contact_id_idx on public.services (contact_id);
