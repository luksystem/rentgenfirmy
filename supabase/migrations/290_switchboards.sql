-- Moduł "Rozdzielnie": import dokumentacji rozdzielni z arkusza "RW - Zugi" (stały firmowy
-- szablon) i oznaczanie statusu podłączenia każdego zuga bezpośrednio w aplikacji, zamiast
-- ręcznie w Excelu na budowie.

create type switchboard_circuit_status as enum (
  'przygotowane_do_podlaczenia',
  'podlaczone',
  'podlaczone_i_sprawdzone',
  'wymaga_uwagi',
  'problem'
);

create table if not exists public.switchboards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  last_imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists switchboards_project_id_idx
  on public.switchboards (project_id);

create table if not exists public.switchboard_circuits (
  id uuid primary key default gen_random_uuid(),
  switchboard_id uuid not null references public.switchboards (id) on delete cascade,
  -- Denormalizacja project_id — jak w innych modułach projektowych — żeby dało się filtrować
  -- pozycje bez joina przez switchboards przy zapytaniach z UI.
  project_id uuid not null references public.projects (id) on delete cascade,
  row_index integer not null default 0,
  -- Klucz mergujący przy re-imporcie pliku, liczony przez parser (zug_sub_no, a dla pozycji
  -- bez zuga np. głównych zabezpieczeń — breaker_no; ostatecznie row_index jako fallback) —
  -- ta sama wartość = ta sama fizyczna pozycja w rozdzielnicy, więc status/notatka instalatora
  -- nie giną przy aktualizacji dokumentacji.
  merge_key text not null,
  zug_no text,
  zug_sub_no text,
  circuit_no text,
  -- Pola opisowe — nadpisywane treścią z pliku przy każdym re-imporcie.
  breaker_type text,
  breaker_no text,
  rcd_no text,
  slot_no text,
  connector_type text,
  circuit_description text,
  location text,
  -- Kolumny bez nagłówka w arkuszu, o zmiennej treści zależnie od typu obwodu (np. "wypust 3f"
  -- dla PV, typ/kolor kabla dla oświetlenia) — trzymane surowo, bez udawania sztywnej semantyki.
  extra_detail text,
  -- Stan roboczy — ustawiany w aplikacji, zachowywany przy re-imporcie.
  status switchboard_circuit_status not null default 'przygotowane_do_podlaczenia',
  note text,
  is_stale boolean not null default false,
  employee_report_target text check (employee_report_target in ('agreement', 'change_request')),
  employee_report_id uuid,
  updated_by_id uuid,
  updated_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists switchboard_circuits_merge_key_idx
  on public.switchboard_circuits (switchboard_id, merge_key);

create index if not exists switchboard_circuits_project_id_idx
  on public.switchboard_circuits (project_id);

create index if not exists switchboard_circuits_status_idx
  on public.switchboard_circuits (switchboard_id, status);

alter table public.switchboards enable row level security;
alter table public.switchboard_circuits enable row level security;

drop policy if exists "switchboards_select_all" on public.switchboards;
drop policy if exists "switchboards_insert_all" on public.switchboards;
drop policy if exists "switchboards_update_all" on public.switchboards;
drop policy if exists "switchboards_delete_all" on public.switchboards;

create policy "switchboards_select_all" on public.switchboards for select using (true);
create policy "switchboards_insert_all" on public.switchboards for insert with check (true);
create policy "switchboards_update_all" on public.switchboards for update using (true);
create policy "switchboards_delete_all" on public.switchboards for delete using (true);

drop policy if exists "switchboard_circuits_select_all" on public.switchboard_circuits;
drop policy if exists "switchboard_circuits_insert_all" on public.switchboard_circuits;
drop policy if exists "switchboard_circuits_update_all" on public.switchboard_circuits;
drop policy if exists "switchboard_circuits_delete_all" on public.switchboard_circuits;

create policy "switchboard_circuits_select_all" on public.switchboard_circuits for select using (true);
create policy "switchboard_circuits_insert_all" on public.switchboard_circuits for insert with check (true);
create policy "switchboard_circuits_update_all" on public.switchboard_circuits for update using (true);
create policy "switchboard_circuits_delete_all" on public.switchboard_circuits for delete using (true);

alter table public.switchboards replica identity full;
alter table public.switchboard_circuits replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.switchboards;
    alter publication supabase_realtime add table public.switchboard_circuits;
  end if;
exception
  when duplicate_object then null;
end $$;

comment on table public.switchboards is
  'Rozdzielnica elektryczna zaimportowana z arkusza "RW - Zugi" dokumentacji projektu.';
comment on table public.switchboard_circuits is
  'Pozycja (zug/obwód) rozdzielnicy z oznaczonym statusem podłączenia. Re-import pliku scala po '
  '(switchboard_id, merge_key), zachowując status/notatkę instalatora.';
comment on column public.switchboard_circuits.is_stale is
  'true, gdy pozycja zniknęła z ostatnio zaimportowanego pliku — nie kasujemy, tylko oznaczamy.';
comment on column public.switchboard_circuits.employee_report_id is
  'Id wpisu w project_client_agreements/project_change_requests utworzonego przez D44 dla tej pozycji.';
