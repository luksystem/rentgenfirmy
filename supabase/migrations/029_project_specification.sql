-- Konfigurator specyfikacji projektu

create table if not exists public.specification_catalog_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Ogólne',
  description text not null default '',
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.project_specification_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  catalog_item_id uuid references public.specification_catalog_items (id) on delete set null,
  title text not null,
  category text not null default 'Ogólne',
  description text not null default '',
  notes text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_specification_items_project_id_idx
  on public.project_specification_items (project_id);

insert into public.specification_catalog_items (name, category, description, position)
values
  ('Oświetlenie', 'Systemy', 'Sterowanie oświetleniem, sceny, czujniki ruchu/obecności.', 10),
  ('Rolety / żaluzje', 'Systemy', 'Automatyka osłon okiennych i integracje.', 20),
  ('Muzyka multiroom', 'Systemy', 'Strefy audio, źródła, keypad/y dotykowe.', 30),
  ('Klimatyzacja', 'Integracje', 'Sterowanie i monitoring klimatyzacji.', 40),
  ('Ogrzewanie / HVAC', 'Integracje', 'Sterowanie grzejnikiem, pompą ciepła, rekuperacją.', 50),
  ('Monitoring / kamery', 'Systemy', 'Kamery, wideodomofon, strefy detekcji.', 60),
  ('Alarm / czujki', 'Systemy', 'Czujki, strefy, typy detekcji (PIR, magnetyczne, zalania).', 70),
  ('Brama / garaż', 'Systemy', 'Sterowanie bramą, garażem, furtką.', 80),
  ('Basen / wellness', 'Systemy', 'Automatyka basenu, sauny, jacuzzi.', 90),
  ('Funkcje specjalne', 'Ogólne', 'Niestandardowe elementy projektu.', 100);

alter table public.specification_catalog_items enable row level security;
alter table public.project_specification_items enable row level security;

drop policy if exists "specification_catalog_items_select_all" on public.specification_catalog_items;
drop policy if exists "specification_catalog_items_insert_all" on public.specification_catalog_items;
drop policy if exists "specification_catalog_items_update_all" on public.specification_catalog_items;
drop policy if exists "specification_catalog_items_delete_all" on public.specification_catalog_items;

create policy "specification_catalog_items_select_all" on public.specification_catalog_items for select using (true);
create policy "specification_catalog_items_insert_all" on public.specification_catalog_items for insert with check (true);
create policy "specification_catalog_items_update_all" on public.specification_catalog_items for update using (true);
create policy "specification_catalog_items_delete_all" on public.specification_catalog_items for delete using (true);

drop policy if exists "project_specification_items_select_all" on public.project_specification_items;
drop policy if exists "project_specification_items_insert_all" on public.project_specification_items;
drop policy if exists "project_specification_items_update_all" on public.project_specification_items;
drop policy if exists "project_specification_items_delete_all" on public.project_specification_items;

create policy "project_specification_items_select_all" on public.project_specification_items for select using (true);
create policy "project_specification_items_insert_all" on public.project_specification_items for insert with check (true);
create policy "project_specification_items_update_all" on public.project_specification_items for update using (true);
create policy "project_specification_items_delete_all" on public.project_specification_items for delete using (true);
