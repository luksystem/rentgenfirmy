-- Powiązanie pól kontraktu godzinowego z kategoriami czasu pracy + admin CRUD kategorii

alter table public.project_contract_quotas
  add column if not exists time_category_id uuid references public.time_categories (id) on delete set null;

create index if not exists project_contract_quotas_time_category_idx
  on public.project_contract_quotas (time_category_id);

comment on column public.project_contract_quotas.time_category_id is
  'Kategoria czasu pracy (time_categories) — zużycie w rozliczeniu liczone z wpisów tej kategorii.';

drop policy if exists time_categories_admin_write on public.time_categories;
create policy time_categories_admin_write
  on public.time_categories for all
  using (public.is_administrator())
  with check (public.is_administrator());

drop policy if exists time_entry_types_admin_write on public.time_entry_types;
create policy time_entry_types_admin_write
  on public.time_entry_types for all
  using (public.is_administrator())
  with check (public.is_administrator());
