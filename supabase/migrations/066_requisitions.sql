-- Zapotrzebowania: ubrania, narzędzia, sprzęt z workflow akceptacji

create table if not exists public.requisitions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null default 'other' check (category in ('clothing', 'tools', 'equipment', 'other')),
  scope text not null default 'general' check (scope in ('personal', 'project', 'general')),
  status text not null default 'draft' check (
    status in ('draft', 'submitted', 'approved', 'rejected', 'ordered', 'fulfilled')
  ),
  project_id uuid references public.projects (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  requested_by_name text not null default 'Zespół',
  reviewed_by_name text,
  reviewed_at timestamptz,
  review_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists requisitions_status_idx on public.requisitions (status, created_at desc);
create index if not exists requisitions_project_id_idx on public.requisitions (project_id, created_at desc);
create index if not exists requisitions_scope_idx on public.requisitions (scope, created_at desc);

alter table public.requisitions enable row level security;

drop policy if exists "requisitions_select_all" on public.requisitions;
drop policy if exists "requisitions_insert_all" on public.requisitions;
drop policy if exists "requisitions_update_all" on public.requisitions;
drop policy if exists "requisitions_delete_all" on public.requisitions;

create policy "requisitions_select_all" on public.requisitions for select using (true);
create policy "requisitions_insert_all" on public.requisitions for insert with check (true);
create policy "requisitions_update_all" on public.requisitions for update using (true);
create policy "requisitions_delete_all" on public.requisitions for delete using (true);
