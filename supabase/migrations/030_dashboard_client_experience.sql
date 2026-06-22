-- Dashboard klienta: autor publiczny, linki, pliki, instrukcje

alter table public.dashboard_spaces
  add column if not exists public_author_name text;

create table if not exists public.project_dashboard_content (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  section text not null check (section in ('links', 'files', 'instructions')),
  content_type text not null default 'link' check (
    content_type in ('link', 'image', 'video', 'youtube', 'file')
  ),
  title text not null default '',
  url text not null default '',
  description text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_dashboard_content_project_section_idx
  on public.project_dashboard_content (project_id, section, position);

alter table public.project_dashboard_content enable row level security;

drop policy if exists "project_dashboard_content_select_all" on public.project_dashboard_content;
drop policy if exists "project_dashboard_content_insert_all" on public.project_dashboard_content;
drop policy if exists "project_dashboard_content_update_all" on public.project_dashboard_content;
drop policy if exists "project_dashboard_content_delete_all" on public.project_dashboard_content;

create policy "project_dashboard_content_select_all" on public.project_dashboard_content for select using (true);
create policy "project_dashboard_content_insert_all" on public.project_dashboard_content for insert with check (true);
create policy "project_dashboard_content_update_all" on public.project_dashboard_content for update using (true);
create policy "project_dashboard_content_delete_all" on public.project_dashboard_content for delete using (true);
