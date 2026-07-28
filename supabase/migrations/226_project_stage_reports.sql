-- Faza 5 (Generator raportu etapowego), docs/role/03-warstwa-komunikacyjna.md sekcja 3.
--
-- D (wlasciciel, ta tura) 1: raport jest dokumentem ZAMROZONYM, nie widokiem. Tresc (content)
-- zapisuje sie jako snapshot w chwili zatwierdzenia i od tej chwili jest niezmienna, choc dane
-- zrodlowe (checklisty/zmiany/ROT) poteym driga. Wymuszone triggerem, nie tylko app-code - ten sam
-- wzorzec bezpieczenstwa co process_stages.code (migracja 210/220).
--
-- Stany: wygenerowany -> zatwierdzony -> wyslany (D2). Reguly:
--  - wygenerowany: tresc/komentarz mozna nadpisywac (regeneracja) w kolko.
--  - zatwierdzony: wymaga niepustego coordinator_comment; od tej chwili content/coordinator_comment
--    sa zamrozone (trigger).
--  - wyslany: wymaga sent_at (D3) - pole obowiazkowe mimo recznej wysylki, bo klauzula "brak uwag
--    w ciagu 7 dni = potwierdzenie" nie ma od czego liczyc bez daty, a przyszly rejestr zdarzen
--    komunikacyjnych (faza 9) bedzie to pole migrowal 1:1 (sent_at/sent_by = event_at/actor).
--
-- Bez blokady zamkniecia etapu (to faza 11c, razem z wymaganymi komunikatami). Ten stol nie ma
-- zadnego FK do project_processes/project_stage_history blokujacego przejscie - raport mozna
-- wygenerowac, zatwierdzic i pominac.
--
-- stage_id/milestone_id jako text (miekkie odniesienie do id w template_snapshot, ten sam wzorzec
-- co project_stage_history.stage_id/project_stage_leads.stage_id) - id przetrwa klonowanie
-- szablonu, wiec odniesienie zostaje poprawne nawet po tym, jak szablon zywy sie zmieni.
create table public.project_stage_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  stage_id text not null,
  milestone_id text not null,
  status text not null default 'wygenerowany' check (status in ('wygenerowany', 'zatwierdzony', 'wyslany')),
  content jsonb not null,
  coordinator_comment text not null default '',
  generated_at timestamptz not null default now(),
  generated_by uuid references public.profiles(id),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  sent_at timestamptz,
  sent_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, milestone_id)
);

create index project_stage_reports_project_idx on public.project_stage_reports (project_id);

alter table public.project_stage_reports enable row level security;

create policy project_stage_reports_select on public.project_stage_reports
  for select using (auth.uid() is not null);

create policy project_stage_reports_write on public.project_stage_reports
  for all using (has_full_app_access()) with check (has_full_app_access());

-- Wymuszenie zamrozenia (D1) - jesli status juz nie jest 'wygenerowany', content i
-- coordinator_comment nie moga sie zmienic, niezaleznie od tego, co zrobi app-code.
create or replace function public.enforce_project_stage_report_freeze()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status <> 'wygenerowany' then
    if new.content is distinct from old.content then
      raise exception 'Raport etapowy % jest zamrozony (status=%) - tresci nie mozna juz zmienic.', old.id, old.status;
    end if;
    if new.coordinator_comment is distinct from old.coordinator_comment then
      raise exception 'Raport etapowy % jest zamrozony (status=%) - komentarza nie mozna juz zmienic.', old.id, old.status;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger project_stage_reports_freeze
  before update on public.project_stage_reports
  for each row execute function public.enforce_project_stage_report_freeze();

-- Wymuszenie D2/D3: zatwierdzenie wymaga komentarza, wyslanie wymaga daty.
create or replace function public.enforce_project_stage_report_transitions()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'zatwierdzony' and old.status = 'wygenerowany' then
    if trim(coalesce(new.coordinator_comment, '')) = '' then
      raise exception 'Zatwierdzenie raportu wymaga komentarza opiekuna.';
    end if;
    if new.approved_at is null or new.approved_by is null then
      raise exception 'Zatwierdzenie raportu wymaga approved_at i approved_by.';
    end if;
  end if;
  if new.status = 'wyslany' and old.status = 'zatwierdzony' then
    if new.sent_at is null or new.sent_by is null then
      raise exception 'Oznaczenie raportu jako wyslany wymaga sent_at i sent_by.';
    end if;
  end if;
  return new;
end;
$$;

create trigger project_stage_reports_transitions
  before update on public.project_stage_reports
  for each row execute function public.enforce_project_stage_report_transitions();

comment on table public.project_stage_reports is
  'Faza 5 - raporty zamkniecia etapu (docs/role/03 sekcja 3). Dokument ZAMROZONY po zatwierdzeniu, '
  'nie widok - tresc (content jsonb) i coordinator_comment sa niezmienne od status<>wygenerowany '
  '(wymuszone triggerem project_stage_reports_freeze). Bez blokady zamkniecia etapu - to faza 11c.';

comment on column public.project_stage_reports.sent_at is
  'Data faktycznej wysylki (recznej) - pole obowiazkowe przy przejsciu na status=wyslany. '
  'Docelowo migruje 1:1 do communication_event (faza 9) jako event_at.';

-- Pilotaz (nie wdrozenie na wszystkie): flaga na projekcie, zeby ograniczyc generowanie raportow
-- bez rozgalezienia kodu. Domyslnie false wszedzie - wlasciciel wlacza recznie dla 3 wybranych
-- projektow po uruchomieniu.
alter table public.projects
  add column stage_reports_pilot_enabled boolean not null default false;

comment on column public.projects.stage_reports_pilot_enabled is
  'Faza 5 pilotaz (docs/08) - gdy false, UI generowania raportow etapowych jest ukryte dla tego '
  'projektu. Wlaczyc recznie dla garstki pilotowych projektow przed szerszym wdrozeniem.';
