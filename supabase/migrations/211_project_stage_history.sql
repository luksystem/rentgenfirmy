-- Faza 1 — Historia etapów projektu (/docs/05 §3.1, docs/08 D1/D6/D7 nie dotyczą
-- bezpośrednio, ale RPC poniżej ustala wzorzec atrybucji zmian dla przyszłych faz —
-- patrz komentarz przy funkcji).

create table if not exists public.project_stage_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  stage_id text not null,
  entered_at timestamptz not null,
  exited_at timestamptz,
  changed_by uuid references public.profiles (id),
  milestone_reached boolean not null default false,
  backfilled boolean not null default false,
  source text not null default 'app' check (source in ('app', 'direct_db')),
  created_at timestamptz not null default now()
);

comment on table public.project_stage_history is
  'Historia wejść/wyjść z etapu procesu per projekt. Fundament dla obliczeń w /docs/05 (indeks obciążenia, '
  'czas trwania etapu, kalibracja wag). Wiersze z backfilled=true WYKLUCZYĆ ze statystyk czasu trwania etapu, '
  'dopóki nie zamkną się naturalnie (potwierdzone przy uruchamianiu fazy 1) — nie mierzą realnego czasu w etapie, '
  'tylko oznaczają stan zastany w chwili wdrożenia.';
comment on column public.project_stage_history.source is
  '''app'' = zapis przez set_project_active_stage() (RPC), niezależnie od tego, czy jest znany konkretny '
  'użytkownik (changed_by może być NULL przy automatyzacjach systemowych, np. przejęciu przy czerwonym w fazie 4). '
  '''direct_db'' = zapis z pominięciem RPC (ręczny UPDATE w SQL Editorze, skrypt) — widoczny, nie cichy.';

create index if not exists project_stage_history_project_idx
  on public.project_stage_history (project_id, entered_at desc);
create unique index if not exists project_stage_history_open_idx
  on public.project_stage_history (project_id) where exited_at is null;

alter table public.project_stage_history enable row level security;

drop policy if exists "project_stage_history_all" on public.project_stage_history;
create policy "project_stage_history_all" on public.project_stage_history
  for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- RPC + trigger: atrybucja zmiany etapu (docs/08, decyzja "trzymaj się pierwotnego
-- pomysłu" — set_config zamiast wyłącznie auth.uid(), żeby przyszłe zapisy systemowe
-- (np. przejęcie przy czerwonym w fazie 4, bez człowieka za sterami) nadal liczyły się
-- jako source='app', a nie 'direct_db'.
-- ---------------------------------------------------------------------------

create or replace function public.handle_project_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
  change_source text;
begin
  if new.active_stage_id is distinct from old.active_stage_id then
    update public.project_stage_history
      set exited_at = now()
      where project_id = new.project_id and exited_at is null;

    begin
      actor := nullif(current_setting('app.stage_change_user_id', true), '')::uuid;
    exception when others then
      actor := null;
    end;

    change_source := coalesce(nullif(current_setting('app.stage_change_source', true), ''), 'direct_db');

    if new.active_stage_id is not null then
      insert into public.project_stage_history (project_id, stage_id, entered_at, changed_by, source)
      values (new.project_id, new.active_stage_id, now(), actor, change_source);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists project_stage_change_history on public.project_processes;
create trigger project_stage_change_history
  after update of active_stage_id on public.project_processes
  for each row execute function public.handle_project_stage_change();

create or replace function public.set_project_active_stage(
  p_project_id uuid,
  p_stage_id text,
  p_user_id uuid default null
)
returns public.project_processes
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.project_processes;
begin
  perform set_config('app.stage_change_user_id', coalesce(p_user_id::text, ''), true);
  perform set_config('app.stage_change_source', 'app', true);

  update public.project_processes
    set active_stage_id = p_stage_id, updated_at = now()
    where project_id = p_project_id
    returning * into result;

  return result;
end;
$$;

comment on function public.set_project_active_stage is
  'Jedyna droga zmiany project_processes.active_stage_id, która oznacza wpis w project_stage_history '
  'jako source=''app''. Wywołuj zawsze przez to RPC (patrz lib/supabase/process-repository.ts, '
  'updateProjectProcessActiveStage) — bezpośredni UPDATE w SQL Editorze zostanie odnotowany jako ''direct_db''.';

grant execute on function public.set_project_active_stage(uuid, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Widok: ile projektów w którym etapie, od kiedy.
-- ---------------------------------------------------------------------------

create or replace view public.project_current_stage_view as
select
  h.project_id,
  h.stage_id,
  h.entered_at,
  now() - h.entered_at as time_in_stage,
  h.backfilled
from public.project_stage_history h
where h.exited_at is null;

comment on view public.project_current_stage_view is
  'Etap aktualnie aktywny per projekt i od kiedy. Tytuł etapu (stage_id -> title) rozwiązuje aplikacja '
  'z template_snapshot, tak samo jak wszędzie indziej (lib/process/anchored-template.ts) — nie duplikować '
  'tej logiki w SQL.';

-- ---------------------------------------------------------------------------
-- Raport osieroconych odniesień — wołany po każdej synchronizacji szablonu
-- (docs/08, dopisek do zakresu fazy 1: "miękkie odniesienia mają cenę, którą
-- trzeba nazwać teraz"). Nie blokuje synchronizacji, tylko raportuje.
-- ---------------------------------------------------------------------------

create or replace function public.report_orphaned_stage_references()
returns table (
  source_table text,
  project_id uuid,
  stage_id text,
  detail text
)
language sql
stable
set search_path = public
as $$
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
    );
$$;

comment on function public.report_orphaned_stage_references is
  'Wiersze project_stage_leads / project_stage_history (otwarte) wskazujące na stage_id, który zniknął '
  'z template_snapshot projektu (np. po usunięciu etapu z szablonu i synchronizacji). Uruchamiać po każdej '
  'synchronizacji szablonu (lib/supabase/process-bulk-sync-server.ts) — nieblokujące, tylko diagnostyczne.';

grant execute on function public.report_orphaned_stage_references() to authenticated;

-- ---------------------------------------------------------------------------
-- Backfill: jeden otwarty wiersz historii per projekt z ustawionym active_stage_id.
-- Projekty bez active_stage_id (nikt nigdy nie ustawił aktywnego etapu ręcznie)
-- są pomijane — dostaną pierwszy wiersz naturalnie po wdrożeniu.
-- ---------------------------------------------------------------------------

insert into public.project_stage_history (project_id, stage_id, entered_at, changed_by, milestone_reached, backfilled, source)
select
  pp.project_id,
  pp.active_stage_id,
  now(),
  null,
  false,
  true,
  'app'
from public.project_processes pp
where pp.active_stage_id is not null
  and not exists (
    select 1 from public.project_stage_history h
    where h.project_id = pp.project_id and h.exited_at is null
  );
