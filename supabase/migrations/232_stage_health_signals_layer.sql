-- Faza 7 (Warstwa sygnalow + zdrowie etapu), docs/08 D3.
--
-- "Zdrowie etapu" to NOWY, osobny koncept (zielony/zolty/czerwony NA POZIOMIE ETAPU,
-- docs/role/01 SS6/SS9) - nie ma nic wspolnego z istniejacym "zdrowiem projektu"
-- (lib/projects/project-health.ts, liczone z celow/kanbanu/notatek/zmian) - to zostaje nietkniete.
-- Zdrowie etapu jest PIERWSZYM konsumentem wspolnej warstwy sygnalow; modyfikatory fazy
-- komunikacji (drugi konsument) to faza 11b, nie teraz.
--
-- Cztery sygnaly z D3:
-- 1. Otwarte blokady: project_change_requests/project_client_agreements z blocks_next_stage=true,
--    status='pending_client' (dowolny cel etapu - nierozstrzygnieta blokada to ryzyko dla calego
--    projektu, niezaleznie od tego, ktory konkretny etap docelowo blokuje).
-- 2. Pozycje ROT po dacie kontroli - NOWE: rot_item_reviews (D19 SS3 juz to zapowiadalo: "pozycje
--    z wlascicielem i data kontroli", nigdy niezbudowane do teraz).
-- 3. Akceptacje oczekujace > N dni (ROT, category=OCZEKIWANIE_DECYZJA_INWESTORA, N z szablonu).
-- 4. Zadania przeterminowane (kanban, due_date miniony, closed_at is null) - policzone na poziomie
--    CALEGO PROJEKTU, nie scoped do pojedynczego etapu (dokladne scopowanie po etapie wymagaloby
--    parsowania template_snapshot JSONB w SQL - swiadome uproszczenie na start, projekt zwykle ma
--    aktywna prace w jednym etapie na raz, wiec przyblizenie jest sensowne).

-- Progi z szablonu (D3: "progi z szablonu") - kod zna mechanizm (sumowanie sygnalow, porownanie
-- do progu), szablon zna wartosci progow.
alter table public.process_stages
  add column health_yellow_threshold integer not null default 1,
  add column health_red_threshold integer not null default 3,
  add column stale_acceptance_days integer not null default 7;

comment on column public.process_stages.health_yellow_threshold is
  'Faza 7 (zdrowie etapu, D3) - suma otwartych sygnalow >= ta wartosc -> zolty.';
comment on column public.process_stages.health_red_threshold is
  'Faza 7 (zdrowie etapu, D3) - suma otwartych sygnalow >= ta wartosc -> czerwony.';
comment on column public.process_stages.stale_acceptance_days is
  'Faza 7 (zdrowie etapu, D3) - akceptacja/ustalenie oczekujace na klienta dluzej niz N dni liczy sie jako sygnal.';

-- Pozycje ROT "po dacie kontroli" - jedna, mala tabela adnotacji (source_type, source_id z
-- report_rot_items), NIE duplikacja pola do czterech zrodel ROT (kanban/zmiany/oferty/ustalenia) -
-- data kontroli to nowa informacja O pozycji ROT, nie duplikat czegos, co juz istnieje w zrodle.
create table public.rot_item_reviews (
  source_type text not null,
  source_id uuid not null,
  review_date date not null,
  set_by uuid references public.profiles(id),
  set_at timestamptz not null default now(),
  primary key (source_type, source_id)
);

alter table public.rot_item_reviews enable row level security;

create policy rot_item_reviews_select on public.rot_item_reviews
  for select using (auth.uid() is not null);

create policy rot_item_reviews_write on public.rot_item_reviews
  for all using (has_full_app_access()) with check (has_full_app_access());

comment on table public.rot_item_reviews is
  'Faza 7 (D3, zapowiedziane w D19 SS3) - "data kontroli" per pozycja ROT. Adnotacja, nie zrodlo -
  report_rot_items() dolacza ja przez LEFT JOIN po (source_type, source_id).';

-- report_rot_items(): dodanie review_date (LEFT JOIN, brak zmiany reszty logiki). DROP wymagany,
-- bo CREATE OR REPLACE nie pozwala zmienic ksztaltu RETURNS TABLE.
drop function public.report_rot_items();

create function public.report_rot_items()
returns table (
  source_type text,
  source_id uuid,
  project_id uuid,
  project_name text,
  title text,
  rot_status text,
  category text,
  detail text,
  opened_at timestamptz,
  days_open integer,
  review_date date
)
language sql
stable
set search_path = public
as $$
  with kanban_items as (
    select
      'kanban'::text as source_type,
      t.id as source_id,
      ppi.project_id,
      p.name as project_name,
      t.title,
      c.rot_status,
      null::text as category,
      c.title as detail,
      t.created_at as opened_at
    from process_kanban_tasks t
    join process_kanban_columns c on c.id = t.column_id
    join process_kanban_boards b on b.id = c.board_id
    join project_process_items ppi on ppi.id = b.project_process_item_id
    join projects p on p.id = ppi.project_id
    where t.closed_at is null
      and c.rot_status is not null
  ),
  change_request_items as (
    select
      'zmiana_projektowa'::text as source_type,
      cr.id as source_id,
      cr.project_id,
      p.name as project_name,
      cr.title,
      case cr.status
        when 'pending_client' then 'CZEKA_NA_ZEWNETRZNE'
        when 'accepted' then 'W_TOKU'
        when 'rejected' then 'ZAMKNIETE'
        when 'cancelled' then 'ZAMKNIETE'
      end as rot_status,
      case cr.status
        when 'pending_client' then 'OCZEKIWANIE_DECYZJA_INWESTORA'
        when 'rejected' then 'POZA_ZAKRESEM'
        else null
      end as category,
      'Zmiana projektowa'::text as detail,
      coalesce(cr.submitted_at, cr.created_at) as opened_at
    from project_change_requests cr
    join projects p on p.id = cr.project_id
    where cr.status in ('pending_client', 'accepted', 'rejected', 'cancelled')
  ),
  service_offer_items as (
    select
      'szybka_oferta'::text as source_type,
      s.id as source_id,
      s.project_id,
      p.name as project_name,
      s.title,
      case s.client_offer_status
        when 'pending' then 'CZEKA_NA_ZEWNETRZNE'
        when 'negotiation' then 'W_TOKU'
        when 'accepted' then 'W_TOKU'
        when 'rejected' then 'ZAMKNIETE'
      end as rot_status,
      case s.client_offer_status
        when 'pending' then 'OCZEKIWANIE_DECYZJA_INWESTORA'
        when 'rejected' then 'POZA_ZAKRESEM'
        else null
      end as category,
      'Oferta'::text as detail,
      coalesce(s.client_offer_responded_at, s.created_at) as opened_at
    from services s
    join projects p on p.id = s.project_id
    where s.service_type = 'Prace dodatkowe'
      and s.project_id is not null
      and s.client_offer_status is not null

    union all

    select
      'szybka_oferta'::text,
      s.id,
      s.project_id,
      p.name,
      s.title,
      case s.settlement_offer_status
        when 'pending' then 'CZEKA_NA_ZEWNETRZNE'
        when 'negotiation' then 'W_TOKU'
        when 'accepted' then 'W_TOKU'
        when 'rejected' then 'ZAMKNIETE'
      end,
      case s.settlement_offer_status
        when 'pending' then 'OCZEKIWANIE_DECYZJA_INWESTORA'
        when 'rejected' then 'POZA_ZAKRESEM'
        else null
      end,
      'Rozliczenie'::text,
      coalesce(s.settlement_offer_responded_at, s.created_at)
    from services s
    join projects p on p.id = s.project_id
    where s.service_type = 'Prace dodatkowe'
      and s.project_id is not null
      and s.settlement_offer_status is not null
  ),
  agreement_items as (
    select
      'ustalenie'::text as source_type,
      a.id as source_id,
      a.project_id,
      p.name as project_name,
      a.title,
      'CZEKA_NA_ZEWNETRZNE'::text as rot_status,
      'OCZEKIWANIE_DECYZJA_INWESTORA'::text as category,
      a.category::text as detail,
      coalesce(a.submitted_at, a.created_at) as opened_at
    from project_client_agreements a
    join projects p on p.id = a.project_id
    where a.status = 'pending_client'
  ),
  all_items as (
    select * from kanban_items
    union all select * from change_request_items
    union all select * from service_offer_items
    union all select * from agreement_items
  )
  select
    ai.source_type, ai.source_id, ai.project_id, ai.project_name, ai.title, ai.rot_status,
    ai.category, ai.detail, ai.opened_at,
    greatest(0, (now()::date - ai.opened_at::date))::integer as days_open,
    rr.review_date
  from all_items ai
  left join rot_item_reviews rr on rr.source_type = ai.source_type and rr.source_id = ai.source_id
  where ai.rot_status is not null
  order by
    case ai.rot_status when 'CZEKA_NA_ZEWNETRZNE' then 0 when 'W_TOKU' then 1 else 2 end,
    ai.opened_at asc;
$$;

comment on function public.report_rot_items is
  'ROT (Rejestr Otwartych Tematow, docs/08 D2/D9/D12/D13/D14) jako widok z czterech zrodel: kanban '
  '(karta bez closed_at, kolumna z rot_status), project_change_requests, szybkie oferty (services '
  'Prace dodatkowe, oferta i rozliczenie osobno), project_client_agreements (wylacznie '
  'pending_client). Zwraca wszystkie statusy w tym ZAMKNIETE - to rejestr, nie tylko lista otwartych. '
  'review_date (faza 7) - opcjonalna data kontroli z rot_item_reviews.';

grant execute on function public.report_rot_items() to authenticated;

-- Zdrowie etapu (docs/role/01 SS6/SS9, D3) - policzone dla AKTYWNEGO etapu kazdego projektu.
create function public.report_stage_health()
returns table (
  project_id uuid,
  project_name text,
  stage_id text,
  stage_title text,
  open_blockers_count integer,
  overdue_reviews_count integer,
  stale_acceptances_count integer,
  overdue_tasks_count integer,
  raw_score integer,
  band text
)
language sql
stable
set search_path = public
as $$
  with active_stage as (
    select
      p.id as project_id,
      p.name as project_name,
      pp.active_stage_id,
      ps.id as stage_id,
      ps.title as stage_title,
      ps.health_yellow_threshold,
      ps.health_red_threshold,
      ps.stale_acceptance_days
    from projects p
    join project_processes pp on pp.project_id = p.id
    join process_stages ps on ps.id::text = pp.active_stage_id
  ),
  blockers as (
    select project_id, count(*)::integer as cnt
    from (
      select project_id from project_change_requests
      where status = 'pending_client' and blocks_next_stage
      union all
      select project_id from project_client_agreements
      where status = 'pending_client' and blocks_next_stage
    ) b
    group by project_id
  ),
  rot as (
    select * from report_rot_items()
  ),
  overdue_reviews as (
    select project_id, count(*)::integer as cnt
    from rot
    where rot_status <> 'ZAMKNIETE' and review_date is not null and review_date < current_date
    group by project_id
  ),
  stale_acceptances as (
    select r.project_id, count(*)::integer as cnt
    from rot r
    join active_stage a on a.project_id = r.project_id
    where r.category = 'OCZEKIWANIE_DECYZJA_INWESTORA' and r.days_open > a.stale_acceptance_days
    group by r.project_id
  ),
  overdue_tasks as (
    select ppi.project_id, count(*)::integer as cnt
    from process_kanban_tasks t
    join process_kanban_columns c on c.id = t.column_id
    join process_kanban_boards b on b.id = c.board_id
    join project_process_items ppi on ppi.id = b.project_process_item_id
    where t.closed_at is null
      and t.due_date is not null
      and t.due_date < current_date
    group by ppi.project_id
  )
  select
    a.project_id,
    a.project_name,
    a.stage_id,
    a.stage_title,
    coalesce(bl.cnt, 0) as open_blockers_count,
    coalesce(orv.cnt, 0) as overdue_reviews_count,
    coalesce(sa.cnt, 0) as stale_acceptances_count,
    coalesce(ot.cnt, 0) as overdue_tasks_count,
    (coalesce(bl.cnt, 0) + coalesce(orv.cnt, 0) + coalesce(sa.cnt, 0) + coalesce(ot.cnt, 0)) as raw_score,
    case
      when (coalesce(bl.cnt, 0) + coalesce(orv.cnt, 0) + coalesce(sa.cnt, 0) + coalesce(ot.cnt, 0)) >= a.health_red_threshold then 'red'
      when (coalesce(bl.cnt, 0) + coalesce(orv.cnt, 0) + coalesce(sa.cnt, 0) + coalesce(ot.cnt, 0)) >= a.health_yellow_threshold then 'yellow'
      else 'green'
    end as band
  from active_stage a
  left join blockers bl on bl.project_id = a.project_id
  left join overdue_reviews orv on orv.project_id = a.project_id
  left join stale_acceptances sa on sa.project_id = a.project_id
  left join overdue_tasks ot on ot.project_id = a.project_id;
$$;

comment on function public.report_stage_health is
  'Zdrowie etapu (docs/role/01 SS6/SS9, faza 7 D3) - zielony/zolty/czerwony dla AKTYWNEGO etapu '
  'kazdego projektu, z czterech sygnalow: otwarte blokady (zmiany/ustalenia blocks_next_stage), '
  'ROT po dacie kontroli, akceptacje oczekujace >N dni (N z szablonu etapu), zadania '
  'przeterminowane (kanban, dzis liczone na poziomie calego projektu - swiadome uproszczenie, '
  'patrz komentarz w migracji 232). Osobny, nowy koncept od istniejacego "zdrowia projektu" '
  '(lib/projects/project-health.ts) - to drugie zostaje nietkniete.';

grant execute on function public.report_stage_health() to authenticated;
