-- Faza 4 (ROT jako widok), docs/08 D2/D9/D12/D13/D14.
--
-- D12: historia przejsc miedzy kolumnami kanbana budowana teraz, bez mozliwosci backfillu pozniej.
-- Zapis przez trigger (nie przez app-code w moveKanbanTask) - gwarantuje kompletnosc niezaleznie od
-- tego, ktora z trzech istniejacych sciezek (process-kanban-board.tsx, aggregated-kanban-board.tsx,
-- app/api/kanban/[token]/route.ts) przenosi karte, bez ryzyka pominiecia czwartej w przyszlosci.
create table public.process_kanban_task_column_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.process_kanban_tasks(id) on delete cascade,
  column_id uuid not null references public.process_kanban_columns(id),
  entered_at timestamptz not null default now(),
  backfilled boolean not null default false
);

create index process_kanban_task_column_history_task_idx
  on public.process_kanban_task_column_history (task_id, entered_at);

alter table public.process_kanban_task_column_history enable row level security;

create policy process_kanban_task_column_history_select
  on public.process_kanban_task_column_history for select using (auth.uid() is not null);

create or replace function public.record_kanban_task_column_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.column_id is distinct from old.column_id) then
    insert into process_kanban_task_column_history (task_id, column_id, entered_at)
    values (new.id, new.column_id, now());
  end if;
  return new;
end;
$$;

create trigger process_kanban_tasks_column_history
  after insert or update on public.process_kanban_tasks
  for each row execute function public.record_kanban_task_column_history();

-- Backfill: karty juz istniejace dostaja jeden wiersz z entered_at = teraz i backfilled=true (D12) -
-- w UI dla takich kart pokazywac "co najmniej od [data]", nie liczbe dni liczona od zera.
do $$
declare
  v_expected integer;
  v_inserted integer;
begin
  select count(*) into v_expected from process_kanban_tasks;

  insert into process_kanban_task_column_history (task_id, column_id, entered_at, backfilled)
  select id, column_id, now(), true from process_kanban_tasks;

  get diagnostics v_inserted = row_count;
  if v_inserted <> v_expected then
    raise exception 'Backfill historii kanbana: oczekiwano % wierszy, wstawiono %', v_expected, v_inserted;
  end if;
end $$;

-- D14: mapowanie kolumna -> status ROT, konfigurowalne na zywej kolumnie (nie w szablonie, bo
-- ensureKanbanBoard() kopiuje kolumny raz i tablica potem zyje wlasnym zyciem). NULL = kolumna nie
-- liczy sie do ROT (np. "Backlog"/"Pomysly") - swiadomy brak mapowania, nie blad konfiguracji.
alter table public.process_kanban_columns
  add column rot_status text
  check (rot_status in ('CZEKA_NA_ZEWNETRZNE', 'W_TOKU', 'ZAMKNIETE'));

comment on column public.process_kanban_columns.rot_status is
  'Mapowanie kolumna -> status ROT (docs/08 D14). NULL = kolumna swiadomie wylaczona z ROT.';
