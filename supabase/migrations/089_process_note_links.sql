-- Faza 4: nowy typ elementu procesu "notatka/dokument" — pozwala podpiąć do kroku procesu
-- istniejącą notatkę ze spotkania (project_meeting_notes) i/lub istniejący dokument
-- (project_documents), albo utworzyć nowy wpis i podpiąć go automatycznie.

alter type public.process_item_kind add value if not exists 'note';

create table if not exists public.project_process_item_links (
  id uuid primary key default gen_random_uuid(),
  project_process_item_id uuid not null references public.project_process_items (id) on delete cascade,
  document_id uuid references public.project_documents (id) on delete cascade,
  meeting_note_id uuid references public.project_meeting_notes (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint project_process_item_links_target_check check (
    (document_id is not null and meeting_note_id is null)
    or (document_id is null and meeting_note_id is not null)
  )
);

create index if not exists project_process_item_links_item_idx
  on public.project_process_item_links (project_process_item_id);

create unique index if not exists project_process_item_links_document_unique
  on public.project_process_item_links (project_process_item_id, document_id)
  where document_id is not null;

create unique index if not exists project_process_item_links_note_unique
  on public.project_process_item_links (project_process_item_id, meeting_note_id)
  where meeting_note_id is not null;

alter table public.project_process_item_links enable row level security;

drop policy if exists project_process_item_links_all on public.project_process_item_links;
create policy project_process_item_links_all on public.project_process_item_links for all using (true) with check (true);

comment on table public.project_process_item_links is
  'Podpięcia notatek (project_meeting_notes) i dokumentów (project_documents) do kroku procesu typu "note".';
