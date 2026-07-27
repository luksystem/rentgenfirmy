-- Wstrzymanie (docs/08 D19 §4) — modyfikator, nie status. Musi istnieć w tej samej zmianie
-- co przestawienie "Oczekuje" -> "W trakcie" (217), żeby nie powstało okno, w którym
-- wstrzymanych projektów nie da się wyrazić.
--
-- Trzy pola wymagane: powód, kto ustalił po stronie klienta, przewidywana data powrotu.
-- "Wygasa sam po tej dacie" — brak kolumny "zakończone ręcznie": aktywność wstrzymania to
-- czysta funkcja daty (expected_return_date >= dziś), nie stanu.

create table if not exists public.project_holds (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  reason text not null check (length(trim(reason)) > 0),
  agreed_with text not null check (length(trim(agreed_with)) > 0),
  expected_return_date date not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

comment on table public.project_holds is
  'Wstrzymanie projektu (docs/08 D19 §4) — modyfikator, nie status flow_status. Aktywność liczona '
  'z daty: wstrzymanie jest aktywne, gdy expected_return_date >= current_date, niezależnie od '
  'flagi. "Wygasa samo" — brak mechanizmu ręcznego zamknięcia, celowo (wstrzymanie bez daty '
  'powrotu albo z nieskończonym przedłużaniem to projekt, który cicho umiera).';
comment on column public.project_holds.agreed_with is
  'Kto po stronie KLIENTA tak ustalił — imię/rola, nie ID (klient nie zawsze ma konto w systemie).';

create index if not exists project_holds_project_idx on public.project_holds (project_id, expected_return_date desc);

alter table public.project_holds enable row level security;
drop policy if exists "project_holds_all" on public.project_holds;
create policy "project_holds_all" on public.project_holds for all using (true) with check (true);

create or replace view public.project_active_holds as
select distinct on (h.project_id)
  h.project_id, h.id as hold_id, h.reason, h.agreed_with, h.expected_return_date, h.created_at
from public.project_holds h
where h.expected_return_date >= current_date
order by h.project_id, h.expected_return_date desc, h.created_at desc;

comment on view public.project_active_holds is
  'Jeden wiersz per projekt z dziś aktywnym wstrzymaniem (najpóźniejsza expected_return_date, jeśli '
  'było kilka wpisów). Puste = projekt nie jest wstrzymany. Konsument: przyszły silnik faz komunikacji '
  '(brama #4, docs/08 D19 §6) i alert "porzucony administracyjnie" (D19 §5.4) — wstrzymany projekt NIE '
  'jest tym alertem.';
