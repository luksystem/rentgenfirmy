-- Załączniki czatu lustrzanie zapisywane w module Dokumentów (source='chat') + link
-- zwrotny dokument→wiadomość czatu.
alter table public.project_documents drop constraint if exists project_documents_source_check;
alter table public.project_documents
  add constraint project_documents_source_check check (source in ('manual', 'kanban', 'chat'));

alter table public.project_documents
  add column if not exists chat_message_id uuid references public.chat_messages (id) on delete set null;

create index if not exists project_documents_chat_message_id_idx
  on public.project_documents (chat_message_id) where chat_message_id is not null;
