-- Moduł Umowy (Sprzedaż): biblioteka bloków treści, szablony całych umów, instancje umów
-- z podpisem dwustronnym i linkiem publicznym. Wzorem `services` (Szybkie oferty) — jeden
-- wiersz z szerokimi kolumnami jsonb na dokument handlowy, bez znormalizowanych tabel
-- podrzędnych (patrz docs/CLAUDE.md: "kod zna mechanizmy, szablon zna wartości").

create table if not exists public.contract_content_blocks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contract_content_blocks_category_idx
  on public.contract_content_blocks (category);

alter table public.contract_content_blocks enable row level security;

drop policy if exists "contract_content_blocks_select_all" on public.contract_content_blocks;
drop policy if exists "contract_content_blocks_insert_all" on public.contract_content_blocks;
drop policy if exists "contract_content_blocks_update_all" on public.contract_content_blocks;
drop policy if exists "contract_content_blocks_delete_all" on public.contract_content_blocks;

create policy "contract_content_blocks_select_all" on public.contract_content_blocks for select using (true);
create policy "contract_content_blocks_insert_all" on public.contract_content_blocks for insert with check (true);
create policy "contract_content_blocks_update_all" on public.contract_content_blocks for update using (true);
create policy "contract_content_blocks_delete_all" on public.contract_content_blocks for delete using (true);

create table if not exists public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  is_active boolean not null default true,
  sections jsonb not null default '[]'::jsonb,
  payment_schedule jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contract_templates_is_active_idx on public.contract_templates (is_active);

alter table public.contract_templates enable row level security;

drop policy if exists "contract_templates_select_all" on public.contract_templates;
drop policy if exists "contract_templates_insert_all" on public.contract_templates;
drop policy if exists "contract_templates_update_all" on public.contract_templates;
drop policy if exists "contract_templates_delete_all" on public.contract_templates;

create policy "contract_templates_select_all" on public.contract_templates for select using (true);
create policy "contract_templates_insert_all" on public.contract_templates for insert with check (true);
create policy "contract_templates_update_all" on public.contract_templates for update using (true);
create policy "contract_templates_delete_all" on public.contract_templates for delete using (true);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'negotiating', 'signed_client', 'signed_both', 'rejected', 'expired')),
  template_id uuid references public.contract_templates (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  title text not null default '',
  client_full_name text not null default '',
  client_location text not null default '',
  client_email text not null default '',
  client_phone text not null default '',
  -- Migawka na umowie, świadomie NIE w `clients`/`contacts` (patrz plan modułu Umowa) — dane
  -- firmowe kontrahenta bywają potrzebne tylko na dokumencie umowy, nie w każdym module.
  client_nip text not null default '',
  client_company_name text not null default '',
  sections jsonb not null default '[]'::jsonb,
  payment_schedule jsonb not null default '[]'::jsonb,
  public_token text,
  token_expires_at timestamptz,
  company_signature jsonb,
  client_signature jsonb,
  history jsonb not null default '[]'::jsonb,
  signed_document_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contracts_client_id_idx on public.contracts (client_id);
create index if not exists contracts_contact_id_idx on public.contracts (contact_id);
create index if not exists contracts_template_id_idx on public.contracts (template_id);
create index if not exists contracts_status_idx on public.contracts (status);
create unique index if not exists contracts_public_token_idx
  on public.contracts (public_token)
  where public_token is not null;

alter table public.contracts enable row level security;

drop policy if exists "contracts_select_all" on public.contracts;
drop policy if exists "contracts_insert_all" on public.contracts;
drop policy if exists "contracts_update_all" on public.contracts;
drop policy if exists "contracts_delete_all" on public.contracts;

create policy "contracts_select_all" on public.contracts for select using (true);
create policy "contracts_insert_all" on public.contracts for insert with check (true);
create policy "contracts_update_all" on public.contracts for update using (true);
create policy "contracts_delete_all" on public.contracts for delete using (true);
