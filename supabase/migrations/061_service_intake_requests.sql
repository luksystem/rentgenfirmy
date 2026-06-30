-- Publiczne zgłoszenia serwisowe (kreator /zgloszenie)

create table if not exists public.service_intake_requests (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique,
  status text not null default 'new' check (
    status in ('new', 'in_review', 'converted', 'closed', 'rejected')
  ),
  client_id uuid references public.clients (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  service_id uuid references public.services (id) on delete set null,
  contact_email text not null,
  contact_full_name text not null,
  contact_phone text,
  warranty_status text,
  service_type_hint text not null check (
    service_type_hint in ('Gwarancyjny', 'Pogwarancyjny')
  ),
  priority text not null check (priority in ('low', 'standard', 'urgent')),
  description text not null,
  accepted_paid_terms boolean not null default false,
  accepted_paid_terms_at timestamptz,
  tracking_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_intake_requests_status_idx
  on public.service_intake_requests (status, created_at desc);

create index if not exists service_intake_requests_client_idx
  on public.service_intake_requests (client_id, created_at desc);

alter table public.service_intake_requests enable row level security;

drop policy if exists "service_intake_select_authenticated" on public.service_intake_requests;
drop policy if exists "service_intake_update_authenticated" on public.service_intake_requests;

create policy "service_intake_select_authenticated"
  on public.service_intake_requests for select
  to authenticated
  using (true);

create policy "service_intake_update_authenticated"
  on public.service_intake_requests for update
  to authenticated
  using (true)
  with check (true);
