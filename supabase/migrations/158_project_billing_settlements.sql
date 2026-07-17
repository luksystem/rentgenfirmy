-- Budżet projektu + rozliczenia klienta (należności, faktury sprzedażowe, spłaty, harmonogram).

create table if not exists public.project_billing_settings (
  project_id uuid primary key references public.projects (id) on delete cascade,
  fixed_price_enabled boolean not null default false,
  hourly_enabled boolean not null default false,
  contract_amount_net numeric(12, 2),
  contract_vat_rate numeric(5, 2),
  contract_amount_gross numeric(12, 2),
  currency text not null default 'PLN',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.project_billing_settings is
  'Konfiguracja budżetu projektu: fixed price / godzinowo oraz kwota umowy głównej.';

create table if not exists public.project_contract_quotas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  label text not null,
  quantity numeric(12, 2) not null default 0,
  unit text not null default 'hours' check (unit in ('hours', 'visits', 'other')),
  position integer not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_contract_quotas_project_id_idx
  on public.project_contract_quotas (project_id, position);

comment on table public.project_contract_quotas is
  'Pola kontraktu (np. godziny programisty, przyjazdy nadzoru).';

-- Ręczne raportowanie godzin (MVP). Docelowo: czas pracy zadań.
create table if not exists public.project_hourly_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  work_date date not null,
  hours numeric(10, 2) not null default 0 check (hours >= 0),
  role_label text not null default '',
  amount_net numeric(12, 2),
  vat_rate numeric(5, 2),
  amount_gross numeric(12, 2),
  notes text not null default '',
  created_by_name text not null default 'Zespół',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_hourly_reports_project_id_idx
  on public.project_hourly_reports (project_id, work_date desc);

comment on table public.project_hourly_reports is
  'Raport godzin do rozliczenia T&M. Docelowo zasilany czasem pracy zadań.';

create table if not exists public.project_settlement_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in ('charge', 'sales_invoice', 'payment', 'schedule')),
  source text not null default 'manual'
    check (source in ('contract', 'offer', 'change_request', 'hourly', 'manual', 'none')),
  source_id uuid,
  title text not null,
  amount_net numeric(12, 2) not null default 0,
  vat_rate numeric(5, 2) not null default 23,
  amount_gross numeric(12, 2) not null default 0,
  currency text not null default 'PLN',
  entry_date date,
  due_date date,
  invoice_number text not null default '',
  external_ref text not null default '',
  notes text not null default '',
  is_auto boolean not null default false,
  created_by_name text not null default 'Zespół',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_settlement_entries_project_kind_idx
  on public.project_settlement_entries (project_id, kind, entry_date desc nulls last);

create index if not exists project_settlement_entries_source_idx
  on public.project_settlement_entries (project_id, source, source_id);

-- Jedna auto-pozycja charge na źródło (kontrakt / oferta / CR / godzinowy raport)
create unique index if not exists project_settlement_entries_auto_source_uidx
  on public.project_settlement_entries (
    project_id,
    source,
    coalesce(source_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where kind = 'charge'
    and is_auto = true
    and source in ('contract', 'offer', 'change_request', 'hourly');

comment on table public.project_settlement_entries is
  'Ledger rozliczeń: należności, faktury sprzedażowe, spłaty, harmonogram.';

alter table public.project_billing_settings enable row level security;
alter table public.project_contract_quotas enable row level security;
alter table public.project_hourly_reports enable row level security;
alter table public.project_settlement_entries enable row level security;

drop policy if exists "project_billing_settings_select_all" on public.project_billing_settings;
drop policy if exists "project_billing_settings_insert_all" on public.project_billing_settings;
drop policy if exists "project_billing_settings_update_all" on public.project_billing_settings;
drop policy if exists "project_billing_settings_delete_all" on public.project_billing_settings;

create policy "project_billing_settings_select_all" on public.project_billing_settings for select using (true);
create policy "project_billing_settings_insert_all" on public.project_billing_settings for insert with check (true);
create policy "project_billing_settings_update_all" on public.project_billing_settings for update using (true);
create policy "project_billing_settings_delete_all" on public.project_billing_settings for delete using (true);

drop policy if exists "project_contract_quotas_select_all" on public.project_contract_quotas;
drop policy if exists "project_contract_quotas_insert_all" on public.project_contract_quotas;
drop policy if exists "project_contract_quotas_update_all" on public.project_contract_quotas;
drop policy if exists "project_contract_quotas_delete_all" on public.project_contract_quotas;

create policy "project_contract_quotas_select_all" on public.project_contract_quotas for select using (true);
create policy "project_contract_quotas_insert_all" on public.project_contract_quotas for insert with check (true);
create policy "project_contract_quotas_update_all" on public.project_contract_quotas for update using (true);
create policy "project_contract_quotas_delete_all" on public.project_contract_quotas for delete using (true);

drop policy if exists "project_hourly_reports_select_all" on public.project_hourly_reports;
drop policy if exists "project_hourly_reports_insert_all" on public.project_hourly_reports;
drop policy if exists "project_hourly_reports_update_all" on public.project_hourly_reports;
drop policy if exists "project_hourly_reports_delete_all" on public.project_hourly_reports;

create policy "project_hourly_reports_select_all" on public.project_hourly_reports for select using (true);
create policy "project_hourly_reports_insert_all" on public.project_hourly_reports for insert with check (true);
create policy "project_hourly_reports_update_all" on public.project_hourly_reports for update using (true);
create policy "project_hourly_reports_delete_all" on public.project_hourly_reports for delete using (true);

drop policy if exists "project_settlement_entries_select_all" on public.project_settlement_entries;
drop policy if exists "project_settlement_entries_insert_all" on public.project_settlement_entries;
drop policy if exists "project_settlement_entries_update_all" on public.project_settlement_entries;
drop policy if exists "project_settlement_entries_delete_all" on public.project_settlement_entries;

create policy "project_settlement_entries_select_all" on public.project_settlement_entries for select using (true);
create policy "project_settlement_entries_insert_all" on public.project_settlement_entries for insert with check (true);
create policy "project_settlement_entries_update_all" on public.project_settlement_entries for update using (true);
create policy "project_settlement_entries_delete_all" on public.project_settlement_entries for delete using (true);

alter table public.project_settlement_entries replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.project_settlement_entries;
exception
  when duplicate_object then null;
end $$;
