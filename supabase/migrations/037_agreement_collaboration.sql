-- Współpraca przy ustaleniach: link publiczny, role akceptacji, komentarze, wersje

alter table public.project_client_agreements
  add column if not exists public_token text unique default encode(gen_random_bytes(18), 'hex'),
  add column if not exists public_enabled boolean not null default false,
  add column if not exists discussion_open boolean not null default false,
  add column if not exists active_version_id uuid;

update public.project_client_agreements
set public_token = encode(gen_random_bytes(18), 'hex')
where public_token is null;

create table if not exists public.project_agreement_approver_roles (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.project_client_agreements (id) on delete cascade,
  label text not null,
  position integer not null default 0,
  is_required boolean not null default true,
  is_client_role boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists project_agreement_approver_roles_agreement_idx
  on public.project_agreement_approver_roles (agreement_id, position);

create table if not exists public.project_agreement_versions (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.project_client_agreements (id) on delete cascade,
  version_number integer not null,
  title text not null,
  body text not null default '',
  category text not null,
  proposed_cost_net numeric(12, 2),
  proposed_cost_gross numeric(12, 2),
  proposed_cost_vat_rate numeric(5, 2),
  cost_note text,
  proposed_warranty_end_date date,
  published_by_name text not null,
  published_at timestamptz not null default now(),
  unique (agreement_id, version_number)
);

create index if not exists project_agreement_versions_agreement_idx
  on public.project_agreement_versions (agreement_id, version_number desc);

alter table public.project_client_agreements
  drop constraint if exists project_client_agreements_active_version_fkey;

alter table public.project_client_agreements
  add constraint project_client_agreements_active_version_fkey
  foreign key (active_version_id) references public.project_agreement_versions (id) on delete set null;

create table if not exists public.project_agreement_approvals (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.project_agreement_versions (id) on delete cascade,
  role_id uuid not null references public.project_agreement_approver_roles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  responded_by_name text,
  response_note text,
  responded_at timestamptz,
  unique (version_id, role_id)
);

create index if not exists project_agreement_approvals_version_idx
  on public.project_agreement_approvals (version_id);

create table if not exists public.project_agreement_comments (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.project_client_agreements (id) on delete cascade,
  author_name text not null,
  author_source text not null check (author_source in ('team', 'client', 'external')),
  author_role_label text,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists project_agreement_comments_agreement_idx
  on public.project_agreement_comments (agreement_id, created_at);

alter table public.project_agreement_approver_roles enable row level security;
alter table public.project_agreement_versions enable row level security;
alter table public.project_agreement_approvals enable row level security;
alter table public.project_agreement_comments enable row level security;

create policy "project_agreement_approver_roles_all"
  on public.project_agreement_approver_roles for all using (true) with check (true);
create policy "project_agreement_versions_all"
  on public.project_agreement_versions for all using (true) with check (true);
create policy "project_agreement_approvals_all"
  on public.project_agreement_approvals for all using (true) with check (true);
create policy "project_agreement_comments_all"
  on public.project_agreement_comments for all using (true) with check (true);

-- Domyślna rola „Klient” dla istniejących ustaleń
insert into public.project_agreement_approver_roles (agreement_id, label, position, is_required, is_client_role)
select a.id, 'Klient', 0, true, true
from public.project_client_agreements a
where not exists (
  select 1 from public.project_agreement_approver_roles r where r.agreement_id = a.id
);
