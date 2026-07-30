-- Faza 9A (docs/08 D18/D19 §5, docs/role/03) — rejestr zdarzen komunikacyjnych, czesc automatyczna
-- + jeden reczny przycisk. Trzy rzeczy, ktore dotad nie istnialy:
--
-- 1. `communication_events` — RECZNE fakty kontaktu. Swiadomie NIE materializuje zdarzen
--    pochodnych (akceptacje klienta, wyslane raporty, SMS-y) — te maja juz swoje miejsce w bazie,
--    a duplikowanie ich tutaj lamie "jedna informacja ma jedno miejsce" z CLAUDE.md. Rejestr jako
--    przekroj powstaje przy odczycie (report_communication_events), nie jako kopia danych.
--
-- 2. `projects.last_internal_activity_at` / `last_client_activity_at` — dotad `lastActivityAt` byl
--    liczony w pamieci przez recomputeActiveProjectsServer() z 6 tabel i WYRZUCANY (D18); zostawala
--    tylko flaga is_active. Bezpiecznik ciszy potrzebuje surowej daty, a jeden MAX() obu osi maskuje
--    najgrozniejszy przypadek z czterech (klient pisze, my milczymy) pod tym samym "aktywny", co stan
--    zdrowy. Rozdzielenie osi jest wiec warunkiem, nie ozdoba.
--
-- 3. `sms_messages.project_id` — SMS to realny kanal wychodzacy, ale dotad bez przypiecia do
--    projektu. UWAGA: backfillu NIE MA i byc nie moze — sprawdzone na produkcji, klucz
--    metadata->>'projectId' wystepuje w 2 z 20 wierszy i w ZADNYM nie ma wartosci (zawsze null).
--    Kolumna dziala od nowych wysylek w przod; zapytania o osi aktywnosci juz ja czytaja, wiec
--    zaczna dzialac same, bez kolejnej migracji.

-- ── 1. Reczne fakty kontaktu ────────────────────────────────────────────────────────────────────
create table if not exists public.communication_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  -- 'wychodzace' = my do klienta, 'przychodzace' = klient do nas. Reczny przycisk zapisuje WYLACZNIE
  -- 'wychodzace' (decyzja wlasciciela): gdy nie odpowiadamy, nikt nie kliknie, wiec os kliencka
  -- ustawiana recznie bylaby systematycznie zawyzona. Os kliencka idzie tylko ze zrodel automatycznych.
  direction text not null check (direction in ('wychodzace', 'przychodzace')),
  channel text not null default 'reczny'
    check (channel in ('reczny', 'sms', 'email', 'telefon', 'whatsapp', 'narada', 'system')),
  event_at timestamptz not null,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_name text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists communication_events_project_idx
  on public.communication_events (project_id, event_at desc);

comment on table public.communication_events is
  'Faza 9A — RECZNE fakty kontaktu (docs/08 D18/D19). Nie materializuje zdarzen pochodnych: te maja '
  'wlasne tabele, przekroj powstaje przy odczycie. Mierzymy fakt kontaktu, nie tresc (CLAUDE.md — '
  'brak dostepu do WhatsAppa jest zalozeniem, nie brakiem).';

-- Data wsteczna dozwolona (ludzie nie klikaja w momencie rozmowy), data przyszla NIE — wpis "w
-- przod" cicho uspilby bezpiecznik ciszy na przyszlosc. CHECK nie moze uzyc now() (nieimmutable),
-- wiec trigger.
create or replace function public.validate_communication_event_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.event_at > now() + interval '1 minute' then
    raise exception 'Zdarzenie komunikacyjne nie moze miec daty przyszlej (event_at=%, teraz=%)',
      new.event_at, now();
  end if;
  return new;
end $$;

drop trigger if exists communication_events_validate_event_at on public.communication_events;
create trigger communication_events_validate_event_at
  before insert or update on public.communication_events
  for each row execute function public.validate_communication_event_at();

alter table public.communication_events enable row level security;

drop policy if exists communication_events_select on public.communication_events;
create policy communication_events_select
  on public.communication_events for select using (auth.uid() is not null);

-- Wzorzec z rot_item_reviews — kontakt z inwestorem prowadzi opiekun/wlasciciel, nie instalator.
drop policy if exists communication_events_write on public.communication_events;
create policy communication_events_write
  on public.communication_events for all
  using (public.has_full_app_access())
  with check (public.has_full_app_access());

-- ── 2. Rozdzielone osie aktywnosci na projekcie ─────────────────────────────────────────────────
alter table public.projects
  add column if not exists last_internal_activity_at timestamptz,
  add column if not exists last_client_activity_at timestamptz;

comment on column public.projects.last_internal_activity_at is
  'Faza 9A — ostatni slad NASZEJ aktywnosci (my do klienta / praca w projekcie). Uzupelniane cronem '
  'recompute-active-projects, wczesniej liczone w pamieci i wyrzucane (D18).';
comment on column public.projects.last_client_activity_at is
  'Faza 9A — ostatni slad aktywnosci KLIENTA (jego odpowiedzi, jego karty kanban). Osobno od osi '
  'naszej, bo MAX() obu maskuje przypadek "klient pisze, my milczymy".';

-- ── 3. SMS jako kanal z przypieciem do projektu (od nowych wysylek) ─────────────────────────────
alter table public.sms_messages
  add column if not exists project_id uuid references public.projects (id) on delete set null;

create index if not exists sms_messages_project_idx
  on public.sms_messages (project_id, created_at desc)
  where project_id is not null;

comment on column public.sms_messages.project_id is
  'Faza 9A — przypiecie SMS do projektu. Bez backfillu: metadata->>projectId bylo null we wszystkich '
  '20 istniejacych wierszach (sprawdzone). Dziala od nowych wysylek w przod.';

-- ── Rejestr jako przekroj (widok przy odczycie, nie kopia danych) ────────────────────────────────
-- Laczy reczne wpisy ze zdarzeniami pochodnymi z tabel zrodlowych. `direction` wyliczany, nie
-- przechowywany dla zrodel pochodnych — akceptacja klienta jest z definicji 'przychodzace'.
create or replace function public.report_communication_events(p_project_id uuid)
returns table (
  source text,
  direction text,
  channel text,
  event_at timestamptz,
  actor_name text,
  title text
)
language sql
stable
set search_path = public
as $$
  select 'reczny'::text, ce.direction, ce.channel, ce.event_at, ce.actor_name,
         coalesce(nullif(ce.note, ''), 'Kontakt z klientem')::text
  from communication_events ce
  where ce.project_id = p_project_id

  union all

  select 'ustalenie'::text, 'przychodzace'::text, 'system'::text, a.client_responded_at,
         coalesce(a.client_response_name, 'Klient'), a.title
  from project_client_agreements a
  where a.project_id = p_project_id and a.client_responded_at is not null

  union all

  select 'zmiana_projektowa'::text, 'przychodzace'::text, 'system'::text, cr.client_responded_at,
         coalesce(cr.client_response_name, 'Klient'), cr.title
  from project_change_requests cr
  where cr.project_id = p_project_id and cr.client_responded_at is not null

  union all

  select 'oferta'::text, 'przychodzace'::text, 'system'::text, s.client_offer_responded_at,
         'Klient'::text, s.title
  from services s
  where s.project_id = p_project_id and s.client_offer_responded_at is not null

  union all

  select 'rozliczenie'::text, 'przychodzace'::text, 'system'::text, s.settlement_offer_responded_at,
         'Klient'::text, s.title
  from services s
  where s.project_id = p_project_id and s.settlement_offer_responded_at is not null

  union all

  -- sent_by jest uuid (nie text) — nazwa rozwiazywana joinem, nie coalesce'em na id.
  select 'raport_etapowy'::text, 'wychodzace'::text, 'system'::text, sr.sent_at,
         coalesce(nullif(btrim(concat_ws(' ', pr.first_name, pr.last_name)), ''), 'Zespół')::text,
         'Raport etapowy'::text
  from project_stage_reports sr
  left join profiles pr on pr.id = sr.sent_by
  where sr.project_id = p_project_id and sr.sent_at is not null

  union all

  select 'sms'::text, 'wychodzace'::text, 'sms'::text, coalesce(sm.sent_at, sm.created_at),
         'Zespół'::text, coalesce(nullif(sm.metadata->>'type', ''), 'SMS')::text
  from sms_messages sm
  where sm.project_id = p_project_id

  union all

  select 'narada'::text, 'wychodzace'::text, 'narada'::text, mn.published_at,
         'Zespół'::text, coalesce(nullif(mn.title, ''), 'Notatka ze spotkania')::text
  from project_meeting_notes mn
  where mn.project_id = p_project_id and mn.published_at is not null

  order by event_at desc nulls last;
$$;

comment on function public.report_communication_events is
  'Faza 9A — rejestr zdarzen komunikacyjnych jako PRZEKROJ (CLAUDE.md: gdzie potrzebny przekroj, '
  'budujemy widok, nie nowa tabele). Reczne wpisy + zdarzenia pochodne z tabel zrodlowych.';

grant execute on function public.report_communication_events(uuid) to authenticated;
revoke execute on function public.report_communication_events(uuid) from public, anon;
