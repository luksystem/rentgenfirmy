-- Rozdzielnie v2: sekcje wewnątrz rozdzielnicy (złączki rezerwowe, magistrale, bloki
-- rozdzielcze dla linii sygnałowych...), rozdzielenie surowych kolumn I/J/O arkusza (dotąd
-- łączonych w jedno pole), domyślny status "nie ruszone" dla świeżo zaimportowanych pozycji,
-- pełna historia zmian statusu/notatki i archiwizacja zakończenia wpinania całej rozdzielnicy.

alter table public.switchboard_circuits
  add column if not exists section_name text,
  add column if not exists detail_1 text,
  add column if not exists detail_2 text,
  add column if not exists detail_3 text;

update public.switchboard_circuits set detail_1 = extra_detail where detail_1 is null;

alter table public.switchboard_circuits drop column if exists extra_detail;

alter table public.switchboard_circuits alter column status set default 'nie_ruszone';

comment on column public.switchboard_circuits.section_name is
  'Nazwa sekcji wewnątrz rozdzielnicy (np. "Złączki rezerwowe", "Złączki magistral") wykryta '
  'strukturalnie przy imporcie; null = główna lista zugów.';
comment on column public.switchboard_circuits.detail_1 is 'Surowa kolumna I arkusza — bez nagłówka, treść zależy od sekcji.';
comment on column public.switchboard_circuits.detail_2 is 'Surowa kolumna J arkusza — bez nagłówka, treść zależy od sekcji.';
comment on column public.switchboard_circuits.detail_3 is 'Surowa kolumna O arkusza — bez nagłówka, treść zależy od sekcji.';

alter table public.switchboards
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by_id uuid,
  add column if not exists completed_by_name text;

comment on column public.switchboards.completed_at is
  'Kiedy opiekun/instalator oznaczył wpinanie tej rozdzielnicy jako zakończone.';

create table if not exists public.switchboard_circuit_history (
  id uuid primary key default gen_random_uuid(),
  circuit_id uuid not null references public.switchboard_circuits (id) on delete cascade,
  previous_status switchboard_circuit_status,
  new_status switchboard_circuit_status not null,
  note text,
  changed_by_id uuid,
  changed_by_name text,
  changed_at timestamptz not null default now()
);

create index if not exists switchboard_circuit_history_circuit_id_idx
  on public.switchboard_circuit_history (circuit_id, changed_at desc);

alter table public.switchboard_circuit_history enable row level security;

drop policy if exists "switchboard_circuit_history_select_all" on public.switchboard_circuit_history;
drop policy if exists "switchboard_circuit_history_insert_all" on public.switchboard_circuit_history;

create policy "switchboard_circuit_history_select_all" on public.switchboard_circuit_history for select using (true);
create policy "switchboard_circuit_history_insert_all" on public.switchboard_circuit_history for insert with check (true);

alter table public.switchboard_circuit_history replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.switchboard_circuit_history;
  end if;
exception
  when duplicate_object then null;
end $$;

-- Loguje tylko realne zmiany statusu/notatki — re-import samych opisów (który nie dotyka tych
-- dwóch pól) nie zaśmieca historii. Import nowej pozycji loguje stan początkowy z
-- previous_status = null. changed_by_id/name są czytane z NEW, które UI ustawia przy każdym
-- zapisie statusu (przy imporcie zostają puste — to nie jest decyzja żadnej konkretnej osoby).
create or replace function public.switchboard_circuit_log_status_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status or new.note is distinct from old.note then
    insert into public.switchboard_circuit_history
      (circuit_id, previous_status, new_status, note, changed_by_id, changed_by_name)
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

drop trigger if exists switchboard_circuit_status_history on public.switchboard_circuits;
create trigger switchboard_circuit_status_history
  after insert or update on public.switchboard_circuits
  for each row execute function public.switchboard_circuit_log_status_change();
