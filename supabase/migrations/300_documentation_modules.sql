-- Generyczny system dla 5 modułów o identycznej strukturze statusu co Rozdzielnie (Rolety,
-- Przyciski, Alarm, HVAC, RACK) — bez dotykania działającego, przetestowanego switchboards/
-- switchboard_circuits (specyficznego dla RW-Zugi: zug/breaker/rcd to pojęcia tylko rozdzielnicy).
-- Kolumny między tymi 5 arkuszami różnią się realnie (KOLOR, PRODUCENT, TYP_PRZEWODU, ZASILACZ...)
-- na tyle, że sztywne typowane kolumny per pole byłyby 5 osobnymi schematami w przebraniu
-- jednego — `raw_fields` trzyma wszystko surowo, UI wyświetla klucz:wartość.
create table if not exists public.documentation_modules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  module_type text not null check (module_type in ('rolety', 'przyciski', 'alarm', 'hvac', 'rack')),
  name text not null,
  position integer not null default 0,
  last_imported_at timestamptz,
  completed_at timestamptz,
  completed_by_id uuid,
  completed_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, module_type, name)
);

create index if not exists documentation_modules_project_id_idx
  on public.documentation_modules (project_id);

create table if not exists public.documentation_module_items (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.documentation_modules (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  row_index integer not null default 0,
  merge_key text not null,
  section_name text,
  label text,
  location text,
  description text,
  raw_fields jsonb not null default '{}'::jsonb,
  status switchboard_circuit_status not null default 'nie_ruszone',
  note text,
  is_stale boolean not null default false,
  employee_report_target text check (employee_report_target in ('agreement', 'change_request')),
  employee_report_id uuid,
  updated_by_id uuid,
  updated_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists documentation_module_items_merge_key_idx
  on public.documentation_module_items (module_id, merge_key);

create index if not exists documentation_module_items_project_id_idx
  on public.documentation_module_items (project_id);

create index if not exists documentation_module_items_status_idx
  on public.documentation_module_items (module_id, status);

create table if not exists public.documentation_module_item_history (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.documentation_module_items (id) on delete cascade,
  previous_status switchboard_circuit_status,
  new_status switchboard_circuit_status not null,
  note text,
  changed_by_id uuid,
  changed_by_name text,
  changed_at timestamptz not null default now()
);

create index if not exists documentation_module_item_history_item_id_idx
  on public.documentation_module_item_history (item_id, changed_at desc);

alter table public.documentation_modules enable row level security;
alter table public.documentation_module_items enable row level security;
alter table public.documentation_module_item_history enable row level security;

drop policy if exists "documentation_modules_select_all" on public.documentation_modules;
drop policy if exists "documentation_modules_insert_all" on public.documentation_modules;
drop policy if exists "documentation_modules_update_all" on public.documentation_modules;
drop policy if exists "documentation_modules_delete_all" on public.documentation_modules;
create policy "documentation_modules_select_all" on public.documentation_modules for select using (true);
create policy "documentation_modules_insert_all" on public.documentation_modules for insert with check (true);
create policy "documentation_modules_update_all" on public.documentation_modules for update using (true);
create policy "documentation_modules_delete_all" on public.documentation_modules for delete using (true);

drop policy if exists "documentation_module_items_select_all" on public.documentation_module_items;
drop policy if exists "documentation_module_items_insert_all" on public.documentation_module_items;
drop policy if exists "documentation_module_items_update_all" on public.documentation_module_items;
drop policy if exists "documentation_module_items_delete_all" on public.documentation_module_items;
create policy "documentation_module_items_select_all" on public.documentation_module_items for select using (true);
create policy "documentation_module_items_insert_all" on public.documentation_module_items for insert with check (true);
create policy "documentation_module_items_update_all" on public.documentation_module_items for update using (true);
create policy "documentation_module_items_delete_all" on public.documentation_module_items for delete using (true);

drop policy if exists "documentation_module_item_history_select_all" on public.documentation_module_item_history;
drop policy if exists "documentation_module_item_history_insert_all" on public.documentation_module_item_history;
create policy "documentation_module_item_history_select_all" on public.documentation_module_item_history for select using (true);
create policy "documentation_module_item_history_insert_all" on public.documentation_module_item_history for insert with check (true);

alter table public.documentation_modules replica identity full;
alter table public.documentation_module_items replica identity full;
alter table public.documentation_module_item_history replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.documentation_modules;
    alter publication supabase_realtime add table public.documentation_module_items;
    alter publication supabase_realtime add table public.documentation_module_item_history;
  end if;
exception
  when duplicate_object then null;
end $$;

-- Ten sam wzorzec triggera co switchboard_circuit_log_status_change (migracje 293/294): loguje
-- tylko realne zmiany statusu/notatki, nie re-import samych opisów.
create or replace function public.documentation_module_item_log_status_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status or new.note is distinct from old.note then
    insert into public.documentation_module_item_history
      (item_id, previous_status, new_status, note, changed_by_id, changed_by_name)
    values (
      new.id,
      case when tg_op = 'INSERT' then null else old.status end,
      new.status,
      new.note,
      new.updated_by_id,
      new.updated_by_name
    );
  end if;
  return new;
end;
$$;

drop trigger if exists documentation_module_item_status_history on public.documentation_module_items;
create trigger documentation_module_item_status_history
  after insert or update on public.documentation_module_items
  for each row execute function public.documentation_module_item_log_status_change();

comment on table public.documentation_modules is
  'Instancja modułu dokumentacji technicznej per projekt (Rolety/Przyciski/Alarm/HVAC/RACK) — '
  'analogicznie do switchboards, ale generyczna dla arkuszy bez specyficznych dla rozdzielnicy pól.';
comment on column public.documentation_module_items.raw_fields is
  'Wszystkie kolumny z arkusza poza label/location/description/status/note, surowo — kolumny '
  'różnią się między typami modułów.';
