-- Ten plik NIE jest osobną migracją — to zbiorczy skrypt do jednorazowego wklejenia
-- w Supabase SQL Editor, żeby zastosować migracje 087, 088, 089 i 090 razem.
-- Po wykonaniu można ten plik usunąć (migracje 087.sql .. 090.sql pozostają jako źródło prawdy).

-- ============================================================
-- 087_process_stage_gate_and_agreement_deadline.sql
-- ============================================================
alter table public.project_process_items
  add column if not exists blocks_next_stage boolean not null default false;

alter table public.project_processes
  add column if not exists active_stage_id text;

alter table public.project_client_agreements
  add column if not exists acceptance_deadline_stage_id text,
  add column if not exists blocks_next_stage boolean not null default false;

comment on column public.project_process_items.blocks_next_stage is
  'Jeśli true i element nie jest ukończony, blokuje kolejny etap procesu (i wszystkie po nim).';
comment on column public.project_processes.active_stage_id is
  'Etap procesu ręcznie oznaczony jako aktualnie aktywny (id etapu w template_snapshot).';
comment on column public.project_client_agreements.acceptance_deadline_stage_id is
  'Id etapu procesu (w template_snapshot projektu), przed którym ustalenie musi być zaakceptowane.';
comment on column public.project_client_agreements.blocks_next_stage is
  'Jeśli true i ustalenie nie jest w pełni zaakceptowane, blokuje wybrany etap (i wszystkie po nim).';

-- ============================================================
-- 088_project_change_requests.sql
-- ============================================================
create table if not exists public.project_change_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  body text not null default '',
  status text not null default 'draft' check (status in ('draft', 'pending_client', 'accepted', 'rejected', 'cancelled')),
  proposed_cost_net numeric(12, 2),
  proposed_cost_gross numeric(12, 2),
  proposed_cost_vat_rate numeric(5, 2),
  cost_note text,
  created_by_name text not null,
  created_by_side text not null default 'team' check (created_by_side in ('team', 'client')),
  submitted_at timestamptz,
  client_responded_at timestamptz,
  client_response_name text,
  client_response_note text,
  position integer not null default 0,
  acceptance_deadline_stage_id text,
  blocks_next_stage boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_change_requests_project_id_idx
  on public.project_change_requests (project_id);

create index if not exists project_change_requests_status_idx
  on public.project_change_requests (project_id, status);

alter table public.project_change_requests enable row level security;

drop policy if exists "project_change_requests_select_all" on public.project_change_requests;
drop policy if exists "project_change_requests_insert_all" on public.project_change_requests;
drop policy if exists "project_change_requests_update_all" on public.project_change_requests;
drop policy if exists "project_change_requests_delete_all" on public.project_change_requests;

create policy "project_change_requests_select_all" on public.project_change_requests for select using (true);
create policy "project_change_requests_insert_all" on public.project_change_requests for insert with check (true);
create policy "project_change_requests_update_all" on public.project_change_requests for update using (true);
create policy "project_change_requests_delete_all" on public.project_change_requests for delete using (true);

alter table public.project_change_requests replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.project_change_requests;
  end if;
exception
  when duplicate_object then null;
end $$;

comment on table public.project_change_requests is
  'Karta zmian Projektu: zmiany zakresu/kosztu wymagające akceptacji klienta. Akceptowane koszty sumują się do kosztu całkowitego projektu.';
comment on column public.project_change_requests.acceptance_deadline_stage_id is
  'Id etapu procesu (w template_snapshot projektu), przed którym zmiana musi być zaakceptowana.';
comment on column public.project_change_requests.blocks_next_stage is
  'Jeśli true i zmiana nie jest zaakceptowana, blokuje wybrany etap (i wszystkie po nim).';

-- ============================================================
-- 089_process_note_links.sql
-- ============================================================
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

-- ============================================================
-- 090_process_protocols.sql
-- ============================================================
create table if not exists public.process_protocol_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  source text not null default 'custom' check (source in ('custom', 'pdf')),
  fields jsonb not null default '[]'::jsonb,
  reference_pdf_path text,
  reference_pdf_name text,
  project_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists process_protocol_templates_project_type_idx
  on public.process_protocol_templates (project_type);

alter table public.process_protocol_templates enable row level security;

drop policy if exists "process_protocol_templates_all" on public.process_protocol_templates;
create policy "process_protocol_templates_all" on public.process_protocol_templates for all using (true) with check (true);

comment on table public.process_protocol_templates is
  'Wzory protokołów dla elementu procesu typu "protocol" — pola budowane samodzielnie (source=custom) lub referencyjny PDF do wydruku/podglądu (source=pdf).';
comment on column public.process_protocol_templates.fields is
  'Tablica pól formularza: [{ id, type: text|textarea|checkbox|select|date, label, required, options? }].';
comment on column public.process_protocol_templates.reference_pdf_path is
  'Ścieżka w buckecie process-protocols — wzór PDF wgrany przez firmę (podgląd/wydruk, bez automatycznego mapowania pól).';

create table if not exists public.project_process_protocols (
  id uuid primary key default gen_random_uuid(),
  project_process_item_id uuid not null unique references public.project_process_items (id) on delete cascade,
  protocol_template_id uuid references public.process_protocol_templates (id) on delete set null,
  field_values jsonb not null default '{}'::jsonb,
  notes text not null default '',
  company_signature jsonb,
  client_signature jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_process_protocols_item_idx
  on public.project_process_protocols (project_process_item_id);

alter table public.project_process_protocols enable row level security;

drop policy if exists "project_process_protocols_all" on public.project_process_protocols;
create policy "project_process_protocols_all" on public.project_process_protocols for all using (true) with check (true);

comment on table public.project_process_protocols is
  'Wypełniony protokół (wartości pól + podpisy) dla konkretnej instancji elementu procesu typu "protocol".';
comment on column public.project_process_protocols.company_signature is
  'Podpis elektroniczny przedstawiciela firmy: { imageDataUrl, signerName, signedAt }.';
comment on column public.project_process_protocols.client_signature is
  'Podpis elektroniczny klienta: { imageDataUrl, signerName, signedAt }.';

insert into storage.buckets (id, name, public, file_size_limit)
values ('process-protocols', 'process-protocols', false, 15728640)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "process_protocols_select" on storage.objects;
drop policy if exists "process_protocols_insert" on storage.objects;
drop policy if exists "process_protocols_delete" on storage.objects;

create policy "process_protocols_select"
  on storage.objects for select
  using (bucket_id = 'process-protocols');

create policy "process_protocols_insert"
  on storage.objects for insert
  with check (bucket_id = 'process-protocols');

create policy "process_protocols_delete"
  on storage.objects for delete
  using (bucket_id = 'process-protocols');
