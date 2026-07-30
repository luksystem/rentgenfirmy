-- D44. Sciezka zglaszania przez pracownika.
--
-- Zgloszenie NIE jest osobnym bytem — formularz zapisuje szkic wprost w Ustaleniach albo
-- Zmianach projektowych, zaleznie od odpowiedzi "czy moze miec wplyw na rozliczenie".
-- Trzeci byt wymagalby konwersji przy klasyfikacji, wlasnego cyklu zycia i wlasnego miejsca
-- w ROT — trzech rzeczy, ktorych nie chcemy.
--
-- stage_id jest TEXT bez FK, nie uuid. To wzorzec MIEKKIEGO ODNIESIENIA obowiazujacy juz w pieciu
-- miejscach (project_processes.active_stage_id, acceptance_deadline_stage_id, project_stage_leads,
-- project_stage_history, resource_plan_items.process_stage_id). Powod: identyfikatory etapow zyja
-- w ZAMROZONYM SNAPSHOCIE projektu, a nie w process_stages — etap moze zniknac z szablonu, a
-- snapshot nadal go zna. FK nie mialby do czego sie przypiac i wywalalby insert przy zmianie
-- szablonu. Cena: brak integralnosci, dlatego oba pola ida do report_orphaned_stage_references.

-- 1. Nowe kolumny, symetrycznie na obu modulach ------------------------------
alter table project_client_agreements
  add column stage_id text,                                   -- ktorego etapu DOTYCZY (nie: do kiedy)
  add column is_urgent boolean not null default false,        -- pilne =/= blokuje etap
  add column created_by_id uuid,                              -- adresat powiadomien zwrotnych
  add column closure_reason text,                             -- powod zamkniecia BEZ dzialania
  add column completion_note text;                            -- co FAKTYCZNIE zrobiono

alter table project_change_requests
  add column stage_id text,
  add column is_urgent boolean not null default false,
  add column created_by_id uuid,
  add column closure_reason text,
  add column completion_note text;

comment on column project_client_agreements.stage_id is
  'D44 — ktorego etapu dotyczy. OSOBNE od acceptance_deadline_stage_id ("do kiedy klient odpowie"). '
  'Miekkie odniesienie: text, bez FK, walidowane przez report_orphaned_stage_references.';
comment on column project_client_agreements.is_urgent is
  'D44 — pilnosc od zglaszajacego. NIE blokuje etapu (to osobna decyzja managera: blocks_next_stage). '
  'UI przestaje ja pokazywac po wyjsciu ze stanu draft — bez logiki czyszczenia.';
comment on column project_client_agreements.closure_reason is
  'D44 — wymagany przy zamknieciu bez dzialania (cancelled/rejected). Wraca do zglaszajacego. '
  'Ciche zamkniecie uczy ludzi, ze zglaszanie nie ma sensu.';
comment on column project_client_agreements.completion_note is
  'D44 — co FAKTYCZNIE zrobiono, z zamkniecia karty kanbanowej. Rozni sie od tego, co uzgodniono '
  '(rekord) i co mialo byc zrobione (zadanie) — i ta roznica jest tresc dokumentacji powykonawczej.';

create index project_client_agreements_created_by_idx
  on project_client_agreements (created_by_id) where created_by_id is not null;
create index project_change_requests_created_by_idx
  on project_change_requests (created_by_id) where created_by_id is not null;

-- 2. Zalaczniki dla zmian projektowych --------------------------------------
-- Ustalenia mialy je od dawna, zmiany nie mialy NIC. Odwzorowane kolumna w kolumne.
create table project_change_request_attachments (
  id uuid primary key default gen_random_uuid(),
  change_request_id uuid not null references project_change_requests(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  media_kind text not null check (media_kind = any (array['image','file'])),
  size_bytes bigint not null check (size_bytes > 0),
  position integer not null default 0,
  uploaded_by_name text not null,
  uploaded_by_source text not null check (uploaded_by_source = any (array['team','client','external'])),
  created_at timestamptz not null default now()
);

create index project_change_request_attachments_request_idx
  on project_change_request_attachments (change_request_id, position);

alter table project_change_request_attachments enable row level security;
create policy project_change_request_attachments_all
  on project_change_request_attachments for all using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit)
values ('change-request-attachments', 'change-request-attachments', false, 15728640)
on conflict (id) do nothing;

-- 3. Raport osieroconych odniesien ------------------------------------------
-- Dokladamy dwa nowe miekkie odniesienia do funkcji, ktora powstala wlasnie po to.
create or replace function public.report_orphaned_stage_references()
returns table(source_table text, project_id uuid, stage_id text, detail text)
language sql
stable
set search_path to 'public'
as $function$
  select 'project_stage_leads'::text, l.project_id, l.stage_id, 'user_id=' || l.user_id::text
  from public.project_stage_leads l
  join public.project_processes pp on pp.project_id = l.project_id
  where not exists (
    select 1 from jsonb_array_elements(pp.template_snapshot -> 'stages') s
    where s ->> 'id' = l.stage_id
  )
  union all
  select 'project_stage_history (open)'::text, h.project_id, h.stage_id, 'entered_at=' || h.entered_at::text
  from public.project_stage_history h
  join public.project_processes pp on pp.project_id = h.project_id
  where h.exited_at is null
    and not exists (
      select 1 from jsonb_array_elements(pp.template_snapshot -> 'stages') s
      where s ->> 'id' = h.stage_id
    )
  union all
  select 'project_client_agreements'::text, a.project_id, a.stage_id, 'title=' || a.title
  from public.project_client_agreements a
  join public.project_processes pp on pp.project_id = a.project_id
  where a.stage_id is not null
    and not exists (
      select 1 from jsonb_array_elements(pp.template_snapshot -> 'stages') s
      where s ->> 'id' = a.stage_id
    )
  union all
  select 'project_change_requests'::text, c.project_id, c.stage_id, 'title=' || c.title
  from public.project_change_requests c
  join public.project_processes pp on pp.project_id = c.project_id
  where c.stage_id is not null
    and not exists (
      select 1 from jsonb_array_elements(pp.template_snapshot -> 'stages') s
      where s ->> 'id' = c.stage_id
    );
$function$;

-- 4. Zamkniecie bez dzialania WYMAGA powodu ---------------------------------
-- Wymuszane w bazie, nie tylko w formularzu. Walidacja w UI byla by do obejscia kazda inna
-- sciezka zapisu, a to jest regula, ktora ma nie miec wyjatkow.
create or replace function public.require_closure_reason()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status::text in ('cancelled', 'rejected')
     and old.status::text is distinct from new.status::text
     and coalesce(btrim(new.closure_reason), '') = '' then
    raise exception
      'Zamkniecie bez dzialania wymaga powodu — wraca do zglaszajacego (D44).'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger project_client_agreements_require_closure_reason
  before update of status on project_client_agreements
  for each row execute function require_closure_reason();

create trigger project_change_requests_require_closure_reason
  before update of status on project_change_requests
  for each row execute function require_closure_reason();

-- 5. Zapis realizacji wedruje razem z data wykonania ------------------------
-- Rozszerzenie triggera z D43: completed_at i completion_note w jednej transakcji, zeby nie dalo
-- sie miec daty wykonania bez opisu wykonania.
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
       set completed_at = new.closed_at,
           completion_note = case when new.closed_at is null then null else new.completion_note end
     where id = new.source_agreement_id;
  end if;

  if new.source_change_request_id is not null then
    update project_change_requests
       set completed_at = new.closed_at,
           completion_note = case when new.closed_at is null then null else new.completion_note end
     where id = new.source_change_request_id;
  end if;

  return new;
end $$;

-- Karta niesie opis realizacji do momentu przeniesienia go do rekordu zrodlowego.
alter table process_kanban_tasks add column completion_note text;

-- Asercje --------------------------------------------------------------------
do $$
declare
  v_ustalen integer;
  v_zmian integer;
  v_ze_stage integer;
  v_urgent integer;
  v_osierocone integer;
  v_blad text;
begin
  select count(*) into v_ustalen from project_client_agreements;
  select count(*) into v_zmian from project_change_requests;
  select (select count(*) from project_client_agreements where stage_id is not null)
       + (select count(*) from project_change_requests where stage_id is not null) into v_ze_stage;
  select (select count(*) from project_client_agreements where is_urgent)
       + (select count(*) from project_change_requests where is_urgent) into v_urgent;

  if v_ustalen <> 26 or v_zmian <> 24 then
    raise exception 'Zmienila sie liczba wierszy: ustalen %, zmian %', v_ustalen, v_zmian;
  end if;
  -- Nie zmyslamy danych wstecznie: istniejace wpisy maja zostac puste.
  if v_ze_stage <> 0 or v_urgent <> 0 then
    raise exception 'Istniejace wpisy nie moga dostac wartosci: stage=%, urgent=%', v_ze_stage, v_urgent;
  end if;

  -- Raport osieroconych nie moze sie wywalic na nowych galeziach.
  select count(*) into v_osierocone from report_orphaned_stage_references();
  raise notice 'Osieroconych odniesien lacznie: %', v_osierocone;

  -- Trigger MUSI blokowac zamkniecie bez powodu. Fikstuura w tej samej transakcji.
  begin
    update project_client_agreements set status = 'cancelled'
     where id = (select id from project_client_agreements where status = 'draft' limit 1);
    v_blad := 'brak';
  exception when check_violation then
    v_blad := 'zablokowane';
  end;
  if v_blad <> 'zablokowane' then
    raise exception 'Trigger NIE zablokowal zamkniecia bez powodu (wynik: %)', v_blad;
  end if;

  raise notice 'OK: kolumny dodane, istniejace dane nietkniete, trigger powodu dziala.';
end $$;
