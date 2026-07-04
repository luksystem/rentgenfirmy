-- Moduł Przeglądy serwisowe (cykliczne przeglądy systemów w obiektach komercyjnych)

create table if not exists public.inspection_protocol_templates (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete cascade,
  system_code text not null,
  name text not null,
  file_path text,
  file_url text,
  fields_schema jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inspection_protocol_templates_client_idx
  on public.inspection_protocol_templates (client_id, system_code);

create table if not exists public.inspection_client_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  system_code text not null,
  frequency text not null check (
    frequency in ('monthly', 'quarterly', 'semi_annual', 'annual')
  ),
  schedule_months int[] not null default '{}',
  protocol_template_id uuid references public.inspection_protocol_templates (id) on delete set null,
  work_scope text not null default '',
  responsible_profile_id uuid references public.profiles (id) on delete set null,
  responsible_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, system_code)
);

create index if not exists inspection_client_plans_client_idx
  on public.inspection_client_plans (client_id);

create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  plan_id uuid references public.inspection_client_plans (id) on delete set null,
  system_code text not null,
  system_label text not null,
  status text not null check (
    status in ('quoting', 'preliminary', 'planned', 'completed')
  ),
  title text not null,
  work_scope text not null default '',
  preliminary_date date,
  confirmed_date date,
  assignee_id uuid references public.profiles (id) on delete set null,
  assignee_name text,
  responsible_id uuid references public.profiles (id) on delete set null,
  responsible_name text,
  protocol_template_id uuid references public.inspection_protocol_templates (id) on delete set null,
  protocol_data jsonb not null default '{}'::jsonb,
  protocol_company_signed_at timestamptz,
  protocol_client_signed_at timestamptz,
  protocol_company_signer text,
  protocol_client_signer text,
  planning_reminder_sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inspections_status_idx on public.inspections (status, preliminary_date);
create index if not exists inspections_client_idx on public.inspections (client_id, status);
create index if not exists inspections_planning_idx on public.inspections (preliminary_date)
  where status = 'preliminary' and confirmed_date is null;

create table if not exists public.inspection_comments (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections (id) on delete cascade,
  author_profile_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists inspection_comments_inspection_idx
  on public.inspection_comments (inspection_id, created_at);

create table if not exists public.inspection_reactions (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections (id) on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '✅')),
  author_profile_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  created_at timestamptz not null default now(),
  unique (inspection_id, emoji, author_name)
);

create index if not exists inspection_reactions_inspection_idx
  on public.inspection_reactions (inspection_id, created_at);

alter table public.inspection_protocol_templates enable row level security;
alter table public.inspection_client_plans enable row level security;
alter table public.inspections enable row level security;
alter table public.inspection_comments enable row level security;
alter table public.inspection_reactions enable row level security;

create policy "inspection_protocol_templates_all" on public.inspection_protocol_templates
  for all using (true) with check (true);
create policy "inspection_client_plans_all" on public.inspection_client_plans
  for all using (true) with check (true);
create policy "inspections_all" on public.inspections
  for all using (true) with check (true);
create policy "inspection_comments_all" on public.inspection_comments
  for all using (true) with check (true);
create policy "inspection_reactions_all" on public.inspection_reactions
  for all using (true) with check (true);

insert into public.app_settings (id, data)
values (
  'inspection_global_settings',
  jsonb_build_object(
    'systems', jsonb_build_array(
      jsonb_build_object('code', 'ssp', 'label', 'SSP — System Sygnalizacji Pożaru', 'active', true),
      jsonb_build_object('code', 'sswin', 'label', 'SSWiN — System Sygnalizacji Włamania i Napadu', 'active', true),
      jsonb_build_object('code', 'cctv', 'label', 'CCTV — Monitoring wizyjny', 'active', true),
      jsonb_build_object('code', 'kd', 'label', 'KD — Kontrola dostępu', 'active', true),
      jsonb_build_object('code', 'bms', 'label', 'BMS — Automatyka budynkowa', 'active', true)
    )
  )
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('inspection-protocols', 'inspection-protocols', false)
on conflict (id) do nothing;
