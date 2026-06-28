-- Konfiguracja odbioru wewnętrznego per element szablonu procesu

create table if not exists public.process_internal_acceptance_configs (
  id uuid primary key default gen_random_uuid(),
  process_item_id uuid not null unique references public.process_items (id) on delete cascade,
  template_id uuid not null references public.process_templates (id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists process_internal_acceptance_configs_template_idx
  on public.process_internal_acceptance_configs (template_id);

alter table public.process_internal_acceptance_configs enable row level security;

drop policy if exists process_internal_acceptance_configs_all on public.process_internal_acceptance_configs;
create policy process_internal_acceptance_configs_all
  on public.process_internal_acceptance_configs for all using (true) with check (true);
