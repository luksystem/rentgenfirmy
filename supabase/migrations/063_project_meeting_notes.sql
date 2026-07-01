-- Notatki ze spotkań per projekt (widoczne dla klienta po publikacji)

create table if not exists public.project_meeting_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null default '',
  body text not null default '',
  meeting_at date,
  author_name text not null default 'Zespół',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_meeting_notes_project_id_idx
  on public.project_meeting_notes (project_id, status, position);

alter table public.project_meeting_notes enable row level security;

drop policy if exists "project_meeting_notes_select_all" on public.project_meeting_notes;
drop policy if exists "project_meeting_notes_insert_all" on public.project_meeting_notes;
drop policy if exists "project_meeting_notes_update_all" on public.project_meeting_notes;
drop policy if exists "project_meeting_notes_delete_all" on public.project_meeting_notes;

create policy "project_meeting_notes_select_all" on public.project_meeting_notes for select using (true);
create policy "project_meeting_notes_insert_all" on public.project_meeting_notes for insert with check (true);
create policy "project_meeting_notes_update_all" on public.project_meeting_notes for update using (true);
create policy "project_meeting_notes_delete_all" on public.project_meeting_notes for delete using (true);
