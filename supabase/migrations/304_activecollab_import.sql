-- Import historii z ActiveCollab (dawny system zarządzania projektami)
-- Powiązanie projektu w Rentgenie z archiwum AC + zaimportowane zadania/komentarze.

create table if not exists public.project_ac_link (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  ac_project_id integer not null,
  ac_zip text not null,
  ac_project_name text not null default '',
  match_score numeric,
  imported_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists project_ac_link_ac_project_id_idx
  on public.project_ac_link (ac_project_id);

create table if not exists public.project_ac_history_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in ('task', 'subtask', 'comment')),
  ac_id integer not null,
  ac_task_id integer,
  title text not null default '',
  body text not null default '',
  author_name text not null default '',
  is_completed boolean not null default false,
  attachment_names text[] not null default '{}',
  ac_created_on timestamptz,
  ac_completed_on timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists project_ac_history_items_project_id_idx
  on public.project_ac_history_items (project_id, ac_created_on);

create index if not exists project_ac_history_items_ac_task_id_idx
  on public.project_ac_history_items (ac_task_id)
  where ac_task_id is not null;

create unique index if not exists project_ac_history_items_dedupe_idx
  on public.project_ac_history_items (project_id, kind, ac_id);

alter table public.project_ac_link enable row level security;
alter table public.project_ac_history_items enable row level security;

drop policy if exists project_ac_link_all on public.project_ac_link;
create policy project_ac_link_all on public.project_ac_link for all using (true) with check (true);

drop policy if exists project_ac_history_items_all on public.project_ac_history_items;
create policy project_ac_history_items_all on public.project_ac_history_items for all using (true) with check (true);
