-- Dopracowanie elementu procesu typu "protocol": wzory protokołów (budowane samodzielnie z pól
-- lub oparte o załączony PDF referencyjny) oraz wypełniony protokół per instancja elementu procesu
-- z dwoma podpisami elektronicznymi (przedstawiciel firmy + klient), rysowanymi na tablecie.

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
