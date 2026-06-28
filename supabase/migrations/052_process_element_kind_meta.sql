-- Metadane typów elementów procesu (nazwy, opisy, możliwości).
create table if not exists public.process_element_kind_meta (
  kind text primary key,
  label text not null,
  description text not null default '',
  icon text not null default 'circle',
  supports_public_link boolean not null default true,
  supports_internal_acceptance boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.process_element_kind_meta (kind, label, description, icon, supports_public_link, supports_internal_acceptance, sort_order)
values
  (
    'checklist',
    'Checklista',
    'Lista punktów do odhaczenia — np. kontrola montażu, przygotowanie pomieszczenia, weryfikacja okablowania.',
    'check-circle',
    true,
    true,
    10
  ),
  (
    'protocol',
    'Protokół odbioru',
    'Formalny protokół z podpisem — potwierdzenie przekazania systemu lub etapu prac.',
    'file-check',
    true,
    false,
    20
  ),
  (
    'settlement',
    'Rozliczenie',
    'Powiązanie z ofertą / rozliczeniem serwisowym — akceptacja kosztów i zakresu.',
    'receipt',
    true,
    false,
    30
  ),
  (
    'kanban',
    'Tablica Kanban',
    'Tablica wdrożeniowa z zadaniami — współpraca zespołu, podwykonawców i klienta.',
    'layout-grid',
    true,
    false,
    40
  )
on conflict (kind) do update set
  label = excluded.label,
  description = excluded.description,
  icon = excluded.icon,
  supports_public_link = excluded.supports_public_link,
  supports_internal_acceptance = excluded.supports_internal_acceptance,
  sort_order = excluded.sort_order,
  updated_at = now();
