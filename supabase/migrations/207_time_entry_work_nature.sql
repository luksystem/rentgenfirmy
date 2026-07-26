-- ═══════════════════════════════════════════════════════════════════════════
-- Czas pracy — rodzaj pracy: nowa praca / poprawka / nieplanowane kończenie
-- ═══════════════════════════════════════════════════════════════════════════

do $$ begin
  create type public.time_entry_work_nature as enum (
    'new_work',
    'rework',
    'unplanned_closing'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.time_entries
  add column if not exists work_nature public.time_entry_work_nature;

create index if not exists time_entries_work_nature_idx
  on public.time_entries (work_nature)
  where work_nature is not null;
