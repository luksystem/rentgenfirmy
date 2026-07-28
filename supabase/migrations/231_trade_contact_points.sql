-- Punkty styku: definicje w Katalogu branz, ktore generuja podpowiedzi Ustalen w projekcie
-- (kombinacja >=2 branz dla danego typu projektu -> gotowy tytul/opis/kategoria/blokada etapu).

create table public.trade_contact_points (
  id uuid primary key default gen_random_uuid(),
  project_type text not null,
  trade_names text[] not null,
  title text not null,
  description text not null default '',
  category text not null default 'integration'
    check (category in ('integration', 'specification', 'change', 'handover', 'warranty', 'other')),
  blocking_stage_id text,
  blocks_next_stage boolean not null default false,
  photo_storage_path text,
  photo_file_name text,
  photo_mime_type text,
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trade_contact_points_project_type_idx on public.trade_contact_points (project_type);

alter table public.trade_contact_points enable row level security;

create policy trade_contact_points_select on public.trade_contact_points
  for select using (auth.uid() is not null);

create policy trade_contact_points_write on public.trade_contact_points
  for all using (has_full_app_access()) with check (has_full_app_access());

comment on table public.trade_contact_points is
  'Definicje punktow styku (katalog branz -> zakladka Punkty styku): kombinacja branz dla danego '
  'typu projektu generuje podpowiedz Ustalenia w projekcie (lib/dashboard/contact-point-suggestions.ts).';

-- Ustalenie utworzone z podpowiedzi pamieta zrodlo, zeby ta sama podpowiedz nie wracala na liste
-- po dodaniu do projektu (nawet gdy tytul/tresc zostana potem zmienione przez zespol).
alter table public.project_client_agreements
  add column source_contact_point_id uuid references public.trade_contact_points(id) on delete set null;

-- Bucket na pojedyncze zdjecie referencyjne per punkt styku (prywatny, mirror agreement-attachments).
insert into storage.buckets (id, name, public, file_size_limit)
values ('contact-point-photos', 'contact-point-photos', false, 15728640)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "contact_point_photos_select" on storage.objects;
drop policy if exists "contact_point_photos_insert" on storage.objects;
drop policy if exists "contact_point_photos_delete" on storage.objects;

create policy "contact_point_photos_select"
  on storage.objects for select
  using (bucket_id = 'contact-point-photos');

create policy "contact_point_photos_insert"
  on storage.objects for insert
  with check (bucket_id = 'contact-point-photos');

create policy "contact_point_photos_delete"
  on storage.objects for delete
  using (bucket_id = 'contact-point-photos');
