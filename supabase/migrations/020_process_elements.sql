-- Osobne, wielokrotnego użytku elementy procesu (checklisty, protokoły, rozliczenia)

create table if not exists public.process_elements (
  id uuid primary key default gen_random_uuid(),
  kind public.process_item_kind not null default 'checklist',
  title text not null,
  description text not null default '',
  default_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.process_items
  add column if not exists element_id uuid references public.process_elements (id) on delete restrict;

create index if not exists process_items_element_idx on public.process_items (element_id);

-- Backfill: każdy istniejący wpis szablonu dostaje własny element katalogowy
do $$
declare
  item_row record;
  new_element_id uuid;
begin
  for item_row in
    select id, kind, title, default_payload
    from public.process_items
    where element_id is null
  loop
    insert into public.process_elements (kind, title, default_payload)
    values (
      item_row.kind,
      item_row.title,
      coalesce(item_row.default_payload, '{}'::jsonb)
    )
    returning id into new_element_id;

    update public.process_items
    set element_id = new_element_id
    where id = item_row.id;
  end loop;
end $$;

alter table public.process_elements enable row level security;

create policy "process_elements_all"
  on public.process_elements
  for all
  using (true)
  with check (true);
