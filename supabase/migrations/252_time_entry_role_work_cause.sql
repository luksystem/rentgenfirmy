-- Faza 8 (docs/role/05-spec-obciazenie.md §3.4): jedyny sposob, zeby zmierzyc, czy standard dziala,
-- to procent czasu na poprawki/dokonczenia wg przyczyn. Rozszerza ISTNIEJACY mechanizm work_nature
-- (migracja 207) zamiast dublowac go nowa kolumna work_type - konceptualnie to ten sam atrybut
-- (rodzaj pracy), specyfikacja dodaje tylko czwarta wartosc (zmiana_zakresu -> scope_change) i
-- przyczyne. Dwa niepolaczone systemy tego samego pojecia bylyby dokladnie tym, przed czym ostrzega
-- CLAUDE.md ("jedna informacja ma jedno miejsce") - a przy tej okazji akurat unikniete.
--
-- work_nature byl natywnym enum-em (time_entry_work_nature) - zamieniony na text+check, bo:
-- (a) reszta modulu uzywa wzorca text+check (np. role_code w process_stage_role_responsibility),
-- (b) dodanie wartosci do enuma wymaga ALTER TYPE ... ADD VALUE poza transakcja, co jest bardziej
--     kruche niz zwykly CHECK przy jednorazowej migracji.

alter table public.time_entries
  alter column work_nature type text using work_nature::text;

alter table public.time_entries
  drop constraint if exists time_entries_work_nature_check;
alter table public.time_entries
  add constraint time_entries_work_nature_check
    check (work_nature is null or work_nature in ('new_work', 'rework', 'unplanned_closing', 'scope_change'));

alter table public.time_entries
  alter column work_nature set default 'new_work';

drop type if exists public.time_entry_work_nature;

-- ── Przyczyna (wymagana, gdy work_nature <> 'new_work') ─────────────────────────
alter table public.time_entries
  add column if not exists work_cause text;

alter table public.time_entries
  drop constraint if exists time_entries_work_cause_check;
alter table public.time_entries
  add constraint time_entries_work_cause_check
    check (work_cause is null or work_cause in (
      'nasz_blad', 'blad_dokumentacji', 'blad_innej_branzy',
      'budowa_niegotowa', 'inna_branza_niegotowa', 'nie_zdazylismy',
      'zadanie_inwestora'
    ));

alter table public.time_entries
  drop constraint if exists time_entries_work_cause_required_check;
alter table public.time_entries
  add constraint time_entries_work_cause_required_check
    check (work_nature is null or work_nature = 'new_work' or work_cause is not null);

-- ── Rola procesowa, w jakiej wykonano wpis (/docs/08 D10 - lista PROCESS_ROLE_CODES) ────────────
alter table public.time_entries
  add column if not exists role_code text;

alter table public.time_entries
  drop constraint if exists time_entries_role_code_check;
alter table public.time_entries
  add constraint time_entries_role_code_check
    check (role_code is null or role_code in (
      'wlasciciel', 'opiekun_projektu', 'koordynator_operacyjny', 'koordynator_techniczny',
      'projektant', 'wdrozeniowiec', 'lider_montazu', 'instalator', 'asystent_procesu'
    ));

create index if not exists time_entries_role_code_idx
  on public.time_entries (role_code)
  where role_code is not null;

comment on column public.time_entries.work_nature is
  'Rodzaj pracy: new_work/rework/unplanned_closing/scope_change. Bylo enum (migracja 207), teraz text+check.';
comment on column public.time_entries.work_cause is
  'Przyczyna, wymagana gdy work_nature <> new_work. /docs/role/05-spec-obciazenie.md §3.4.';
comment on column public.time_entries.role_code is
  'Rola procesowa (slot na projekcie, nie pole na osobie) w jakiej wykonano wpis.';

-- ── Raport: udzial czasu na poprawki/dokonczenia wg przyczyn, per projekt i per miesiac ─────────
-- Swiadomie BEZ user_id w wyjsciu - to miara procesu, nie ludzi (patrz §3.4 i CLAUDE.md
-- "nie buduj rankingu osob"). Wylacza wpisy odrzucone (rejected) - nie reprezentuja realnej pracy.
create or replace function public.report_work_type_breakdown(
  p_project_id uuid default null,
  p_month date default null
)
returns table (
  project_id uuid,
  project_name text,
  month date,
  work_nature text,
  work_cause text,
  total_minutes bigint,
  entry_count bigint
)
language sql
stable
set search_path = public
as $$
  select
    te.project_id,
    p.name as project_name,
    date_trunc('month', te.date)::date as month,
    te.work_nature,
    te.work_cause,
    sum(te.duration_minutes)::bigint as total_minutes,
    count(*)::bigint as entry_count
  from time_entries te
  join time_entry_types tet on tet.id = te.entry_type_id
  left join projects p on p.id = te.project_id
  where tet.counts_as_work
    and te.status <> 'rejected'
    and te.work_nature is not null
    and (p_project_id is null or te.project_id = p_project_id)
    and (p_month is null or date_trunc('month', te.date)::date = date_trunc('month', p_month)::date)
  group by te.project_id, p.name, date_trunc('month', te.date), te.work_nature, te.work_cause
  order by month desc, project_name nulls last, te.work_nature, te.work_cause;
$$;

comment on function public.report_work_type_breakdown is
  'Faza 8 (/docs/role/05-spec-obciazenie.md §3.4) - udzial czasu na poprawki/dokonczenia wg przyczyn, '
  'per projekt i per miesiac. Swiadomie bez user_id - miara procesu, nie ludzi.';

grant execute on function public.report_work_type_breakdown(uuid, date) to authenticated;
revoke execute on function public.report_work_type_breakdown(uuid, date) from public, anon;
