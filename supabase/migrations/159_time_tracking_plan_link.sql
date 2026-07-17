-- Powiązanie wpisów czasu z elementami planu zasobów (propozycje z planu).

alter table public.time_entries
  add column if not exists resource_plan_item_id uuid references public.resource_plan_items (id) on delete set null;

create unique index if not exists time_entries_plan_item_user_date_uidx
  on public.time_entries (user_id, resource_plan_item_id, date)
  where resource_plan_item_id is not null;

create index if not exists time_entries_resource_plan_item_idx
  on public.time_entries (resource_plan_item_id)
  where resource_plan_item_id is not null;
