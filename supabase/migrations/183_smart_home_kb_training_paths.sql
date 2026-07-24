-- Ścieżki szkoleniowe Wiedzy Smart Home: gotowe szablony + niezależne kopie per klient

create table if not exists public.smart_home_kb_path_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.smart_home_kb_path_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.smart_home_kb_path_templates (id) on delete cascade,
  article_id uuid not null references public.smart_home_kb_articles (id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists smart_home_kb_path_template_items_template_id_idx
  on public.smart_home_kb_path_template_items (template_id, sort_order);

create table if not exists public.smart_home_kb_client_paths (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  description text not null default '',
  source_template_id uuid references public.smart_home_kb_path_templates (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists smart_home_kb_client_paths_client_id_idx
  on public.smart_home_kb_client_paths (client_id, status);

create table if not exists public.smart_home_kb_client_path_items (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.smart_home_kb_client_paths (id) on delete cascade,
  article_id uuid not null references public.smart_home_kb_articles (id) on delete cascade,
  sort_order int not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists smart_home_kb_client_path_items_path_id_idx
  on public.smart_home_kb_client_path_items (path_id, sort_order);

alter table public.smart_home_kb_path_templates enable row level security;
alter table public.smart_home_kb_path_template_items enable row level security;
alter table public.smart_home_kb_client_paths enable row level security;
alter table public.smart_home_kb_client_path_items enable row level security;

drop policy if exists "smart_home_kb_path_templates_select_all" on public.smart_home_kb_path_templates;
drop policy if exists "smart_home_kb_path_templates_insert_all" on public.smart_home_kb_path_templates;
drop policy if exists "smart_home_kb_path_templates_update_all" on public.smart_home_kb_path_templates;
drop policy if exists "smart_home_kb_path_templates_delete_all" on public.smart_home_kb_path_templates;
create policy "smart_home_kb_path_templates_select_all" on public.smart_home_kb_path_templates for select using (true);
create policy "smart_home_kb_path_templates_insert_all" on public.smart_home_kb_path_templates for insert with check (true);
create policy "smart_home_kb_path_templates_update_all" on public.smart_home_kb_path_templates for update using (true);
create policy "smart_home_kb_path_templates_delete_all" on public.smart_home_kb_path_templates for delete using (true);

drop policy if exists "smart_home_kb_path_template_items_select_all" on public.smart_home_kb_path_template_items;
drop policy if exists "smart_home_kb_path_template_items_insert_all" on public.smart_home_kb_path_template_items;
drop policy if exists "smart_home_kb_path_template_items_update_all" on public.smart_home_kb_path_template_items;
drop policy if exists "smart_home_kb_path_template_items_delete_all" on public.smart_home_kb_path_template_items;
create policy "smart_home_kb_path_template_items_select_all" on public.smart_home_kb_path_template_items for select using (true);
create policy "smart_home_kb_path_template_items_insert_all" on public.smart_home_kb_path_template_items for insert with check (true);
create policy "smart_home_kb_path_template_items_update_all" on public.smart_home_kb_path_template_items for update using (true);
create policy "smart_home_kb_path_template_items_delete_all" on public.smart_home_kb_path_template_items for delete using (true);

drop policy if exists "smart_home_kb_client_paths_select_all" on public.smart_home_kb_client_paths;
drop policy if exists "smart_home_kb_client_paths_insert_all" on public.smart_home_kb_client_paths;
drop policy if exists "smart_home_kb_client_paths_update_all" on public.smart_home_kb_client_paths;
drop policy if exists "smart_home_kb_client_paths_delete_all" on public.smart_home_kb_client_paths;
create policy "smart_home_kb_client_paths_select_all" on public.smart_home_kb_client_paths for select using (true);
create policy "smart_home_kb_client_paths_insert_all" on public.smart_home_kb_client_paths for insert with check (true);
create policy "smart_home_kb_client_paths_update_all" on public.smart_home_kb_client_paths for update using (true);
create policy "smart_home_kb_client_paths_delete_all" on public.smart_home_kb_client_paths for delete using (true);

drop policy if exists "smart_home_kb_client_path_items_select_all" on public.smart_home_kb_client_path_items;
drop policy if exists "smart_home_kb_client_path_items_insert_all" on public.smart_home_kb_client_path_items;
drop policy if exists "smart_home_kb_client_path_items_update_all" on public.smart_home_kb_client_path_items;
drop policy if exists "smart_home_kb_client_path_items_delete_all" on public.smart_home_kb_client_path_items;
create policy "smart_home_kb_client_path_items_select_all" on public.smart_home_kb_client_path_items for select using (true);
create policy "smart_home_kb_client_path_items_insert_all" on public.smart_home_kb_client_path_items for insert with check (true);
create policy "smart_home_kb_client_path_items_update_all" on public.smart_home_kb_client_path_items for update using (true);
create policy "smart_home_kb_client_path_items_delete_all" on public.smart_home_kb_client_path_items for delete using (true);
