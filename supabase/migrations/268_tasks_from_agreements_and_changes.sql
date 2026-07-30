-- D43. Zadania z ustalen i zmian projektowych.
--
-- Cztery decyzje wlasciciela, ktore ustawiaja ksztalt tej migracji:
--  1. manager wybiera tablice — priorytetowo z etapu biezacego, ale moze z innego;
--  2. wlasciciel zadania wynika z ETAPU WYBRANEJ TABLICY (nie z acceptance_deadline_stage_id,
--     ktory mowi "do kiedy", a nie "gdzie" — ta droga byla naciagana i zostala odrzucona);
--  3. link to KOLUMNA, nie tabela laczaca; wiele prac z jednego ustalenia rozwiazuja PODZADANIA;
--  4. wszystko powyzej dotyczy tak samo ustalen, jak i zmian projektowych.
--
-- UWAGA — dlaczego `completed_at`, a nie status. `project_agreement_status` to
-- (draft, pending_client, accepted, rejected, cancelled), czyli os AKCEPTACJI KLIENTA, nie
-- wykonania. `accepted` znaczy "klient sie zgodzil" i wlasnie na tym opiera sie zamykanie
-- pozycji w ROT (migracje 251/255). Ustawianie go przy zamknieciu karty zlepiloby dwie rozne
-- osie i cofneloby tamta poprawke. "Wykonane" dostaje wlasne pole.

-- 1. Link karty do zrodla ---------------------------------------------------
alter table process_kanban_tasks
  add column source_agreement_id uuid references project_client_agreements(id) on delete set null,
  add column source_change_request_id uuid references project_change_requests(id) on delete set null;

-- Dwie osobne kolumny zamiast pary (typ, id): sa grep-owalne i maja prawdziwe FK.
-- ON DELETE SET NULL, nie CASCADE — usuniecie ustalenia nie ma kasowac wykonanej pracy
-- (kasowanie przez CASCADE juz raz cicho niszczylo dane, D41).
alter table process_kanban_tasks
  add constraint process_kanban_tasks_single_source_check
  check (source_agreement_id is null or source_change_request_id is null);

create index process_kanban_tasks_source_agreement_idx
  on process_kanban_tasks (source_agreement_id) where source_agreement_id is not null;
create index process_kanban_tasks_source_change_request_idx
  on process_kanban_tasks (source_change_request_id) where source_change_request_id is not null;

-- 2. Podzadania na kartach kanbanowych --------------------------------------
-- task_checklist_items wisialo dotad wylacznie na work_item_id / resource_plan_item_id.
-- Trzecie zrodlo zamiast nowej tabeli: ten sam mechanizm, jeden zestaw regul.
alter table task_checklist_items
  add column kanban_task_id uuid references process_kanban_tasks(id) on delete cascade;

alter table task_checklist_items drop constraint task_checklist_items_check;
alter table task_checklist_items
  add constraint task_checklist_items_check
  check (
    (case when work_item_id is not null then 1 else 0 end) +
    (case when resource_plan_item_id is not null then 1 else 0 end) +
    (case when kanban_task_id is not null then 1 else 0 end) = 1
  );

create index task_checklist_items_kanban_task_idx
  on task_checklist_items (kanban_task_id) where kanban_task_id is not null;

-- 3. Os wykonania na zrodlach -----------------------------------------------
alter table project_client_agreements add column completed_at timestamptz;
alter table project_change_requests   add column completed_at timestamptz;

comment on column project_client_agreements.completed_at is
  'D43 — kiedy ustalenie zostalo WYKONANE. Osobna os od status (akceptacja klienta). '
  'Ustawiane przez zamkniecie karty kanbanowej zrodlowej.';
comment on column project_change_requests.completed_at is
  'D43 — kiedy zmiana zostala WYKONANA. Osobna os od status (akceptacja klienta).';

-- 4. Etap tablicy i wlasciciel zadania --------------------------------------
-- Jedyne miejsce znajace lancuch tablica -> element procesu -> kamien -> etap. UI go nie powtarza.
-- Tablica bez rozwiazywalnego etapu (2 z 13 na produkcji) zwraca wiersz z pustym etapem, a nie
-- brak wiersza — wolajacy ma zobaczyc "brak obsady", nie ciszę.
create or replace function public.report_board_task_owner(p_board_id uuid)
returns table (
  board_id uuid,
  project_id uuid,
  stage_id uuid,
  stage_title text,
  role_code text,
  role_name text,
  responsible_user_id uuid,
  responsible_name text,
  slot_source text
)
language sql
stable
set search_path = public
as $$
  with anchor as (
    select b.id as board_id, ppi.project_id, m.stage_id
    from process_kanban_boards b
    join project_process_items ppi on ppi.id = b.project_process_item_id
    left join process_items pi on pi.id = ppi.template_item_id
    left join process_milestones m on m.id = pi.milestone_id
    where b.id = p_board_id
  )
  select
    a.board_id,
    a.project_id,
    a.stage_id,
    r.stage_title,
    r.role_code,
    r.role_name,
    r.responsible_user_id,
    r.responsible_name,
    r.slot_source
  from anchor a
  left join lateral (
    select * from report_stage_responsible(a.project_id) x where x.stage_id = a.stage_id
  ) r on true;
$$;

comment on function public.report_board_task_owner is
  'D43 — wlasciciel zadania tworzonego na tablicy: etap tablicy -> report_stage_responsible. '
  'Tablica bez etapu zwraca wiersz z pustymi polami, nie brak wiersza.';

grant execute on function public.report_board_task_owner(uuid) to authenticated;
revoke execute on function public.report_board_task_owner(uuid) from public, anon;

-- 5. Synchronizacja zamkniecia karty ----------------------------------------
-- Kierunek WYLACZNIE karta -> zrodlo. Odwrotny (zamkniecie ustalenia zamyka karte) swiadomie
-- nie istnieje: praca moze trwac po tym, jak ustalenie przestaje byc otwarte.
-- Ponowne otwarcie karty czysci completed_at — inaczej "wykonane" zostaloby klamstwem.
create or replace function public.sync_source_completion_from_kanban_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.closed_at is not distinct from old.closed_at then
    return new;
  end if;

  if new.source_agreement_id is not null then
    update project_client_agreements
       set completed_at = new.closed_at
     where id = new.source_agreement_id;
  end if;

  if new.source_change_request_id is not null then
    update project_change_requests
       set completed_at = new.closed_at
     where id = new.source_change_request_id;
  end if;

  return new;
end $$;

create trigger process_kanban_tasks_sync_source_completion
  after update of closed_at on process_kanban_tasks
  for each row execute function sync_source_completion_from_kanban_task();

-- Asercje --------------------------------------------------------------------
do $$
declare
  v_tablic integer;
  v_bez_etapu integer;
  v_kolumn integer;
begin
  select count(*) into v_tablic from process_kanban_boards;
  select count(*) into v_bez_etapu
  from process_kanban_boards b
  cross join lateral report_board_task_owner(b.id) o
  where o.stage_id is null;

  -- Stan zastany z inwentaryzacji: 13 tablic, 2 bez rozwiazywalnego etapu.
  if v_tablic <> 13 then
    raise exception 'Oczekiwano 13 tablic (stan z inwentaryzacji), jest %', v_tablic;
  end if;
  if v_bez_etapu <> 2 then
    raise exception 'Oczekiwano 2 tablic bez etapu, jest %', v_bez_etapu;
  end if;

  -- Funkcja MUSI zwrocic wiersz dla kazdej tablicy, takze tej bez etapu.
  select count(*) into v_kolumn
  from process_kanban_boards b cross join lateral report_board_task_owner(b.id) o;
  if v_kolumn <> v_tablic then
    raise exception 'report_board_task_owner zgubila wiersze: % tablic, % wynikow', v_tablic, v_kolumn;
  end if;

  raise notice 'OK: % tablic, % bez etapu, funkcja zwraca wiersz dla kazdej.', v_tablic, v_bez_etapu;
end $$;
