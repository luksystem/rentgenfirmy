-- Faza 3 (Kompetencje), docs/role/07-prompty.md PROMPT 4.
--
-- Inwentaryzacja wykazala, ze "stage_competency" z promptu juz istnieje i dziala end-to-end jako
-- process_stage_competency_requirements (szablon -> template_snapshot -> walidacja ostrzegawcza w
-- Planie Zasobow -> sugestie kandydatow -> edytor w panelu admina szablonu) - nic tu nie zmieniamy.
--
-- role_competency to realna luka. Decyzja wlasciciela: klucz na resource_dictionary_items
-- (dictionary_key='operational_role'), NIE na role.code (9 kodow D10 / project_role_slot) - wpina
-- sie w istniejacy, dzialajacy mechanizm Planu Zasobow zamiast otwierac nowa sciezke walidacji dla
-- slotow projektowych. Rozjazd miedzy tymi dwiema osiami "rola" jest juz opisany w docs/08 D4/D7/D15
-- jako migracja user_operational_roles -> user_competency, oznaczona tam jako "do zrobienia" -
-- pozostaje nierozwiazany swiadomie w tej fazie, nie jest to przeoczenie.
--
-- UWAGA: ta tabela zostala przemianowana na operational_role_competency migracja 222 (docs/08 D21) -
-- ponizsza nazwa role_competency istnieje tylko przejsciowo w tym pliku historycznym.
--
-- is_required (z modelu w docs/04 3.1) dodany tylko na role_competency, nie retrofitowany na
-- process_stage_competency_requirements - jego jedyny zaplanowany konsument (blokada autonomicznego
-- zastepstwa) nalezy do fazy zastepstw urlopowych, ktora jeszcze nie istnieje. Kolumna jest tania i
-- czesc zadeklarowanego modelu danych, wiec zostaje, ale bez UI do jej edycji w tej fazie (domyslnie
-- true) - retrofit stage_competency zostawiamy fazie zastepstw, zeby dodac symetrycznie z realna
-- logika blokujaca, nie samym polem.
create table public.role_competency (
  id uuid primary key default gen_random_uuid(),
  role_item_id uuid not null references public.resource_dictionary_items(id),
  competency_item_id uuid not null references public.resource_dictionary_items(id),
  min_level_item_id uuid references public.resource_dictionary_items(id),
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  unique (role_item_id, competency_item_id)
);

create index role_competency_role_idx on public.role_competency (role_item_id);
create index role_competency_competency_idx on public.role_competency (competency_item_id);

alter table public.role_competency enable row level security;

create policy role_competency_select on public.role_competency
  for select using (auth.uid() is not null);

create policy role_competency_write on public.role_competency
  for all using (has_full_app_access()) with check (has_full_app_access());

-- user_competency: potwierdzenie (docs/04 3.1). Ten sam krag pisze co dzis (has_full_app_access,
-- RLS bez zmian) - potwierdzenie to kolejna akcja administracyjna, nie nowy poziom uprawnien.
alter table public.user_competencies
  add column confirmed_by uuid references public.profiles(id),
  add column confirmed_at timestamptz;

-- Mapa luk (docs/04 3.3, PROMPT 4 pkt 4): "role i etapy, dla ktorych mniej niz dwie osoby
-- spelniaja wymagania na poziomie 3". "Poziom 3" = najwyzszy zdefiniowany poziom w slowniku
-- competency_level (max sort_order) - NIE zahardkodowany, bo poziomy sa danymi admina (kod zna
-- mechanizmy, szablon zna wartosci). Brak wiersza dla pary rola/etap x kompetencja bez zadnego
-- wymagania w role_competency/process_stage_competency_requirements to NIE luka - to po prostu
-- brak zdefiniowanego wymagania (ten sam standard uczciwosci co report_project_readiness, 219).
create or replace function public.report_competency_gap_map()
returns table (
  kind text,
  subject_label text,
  competency_label text,
  required_level_label text,
  qualified_people_count integer
)
language sql
stable
set search_path = public
as $$
  with top_level as (
    select id, name
    from resource_dictionary_items
    where dictionary_key = 'competency_level' and is_active
    order by sort_order desc
    limit 1
  ),
  role_gaps as (
    select
      'rola'::text as kind,
      ri.name as subject_label,
      ci.name as competency_label,
      tl.name as required_level_label,
      count(distinct uc.user_id)::integer as qualified_people_count
    from role_competency rc
    join resource_dictionary_items ri on ri.id = rc.role_item_id
    join resource_dictionary_items ci on ci.id = rc.competency_item_id
    cross join top_level tl
    left join user_competencies uc
      on uc.competency_item_id = rc.competency_item_id
     and uc.level_item_id = tl.id
    group by ri.name, ci.name, tl.name
    having count(distinct uc.user_id) < 2
  ),
  stage_gaps as (
    select
      'etap'::text as kind,
      ps.title as subject_label,
      ci.name as competency_label,
      tl.name as required_level_label,
      count(distinct uc.user_id)::integer as qualified_people_count
    from process_stage_competency_requirements scr
    join process_stages ps on ps.id = scr.stage_id
    join resource_dictionary_items ci on ci.id = scr.competency_item_id
    cross join top_level tl
    left join user_competencies uc
      on uc.competency_item_id = scr.competency_item_id
     and uc.level_item_id = tl.id
    group by ps.title, ci.name, tl.name
    having count(distinct uc.user_id) < 2
  )
  select * from role_gaps
  union all
  select * from stage_gaps
  order by kind, subject_label, competency_label;
$$;

comment on function public.report_competency_gap_map is
  'Mapa luk kompetencji (docs/role/04 3.3, Faza 3 PROMPT 4 pkt 4). Role i etapy z wymaganiem '
  'kompetencji, dla ktorych mniej niz dwie osoby maja te kompetencje na najwyzszym zdefiniowanym '
  'poziomie (resource_dictionary_items dictionary_key=competency_level, max sort_order). Brak wiersza '
  'dla pary rola/etap x kompetencja bez zadnego wymagania to NIE luka - to brak zdefiniowanego '
  'wymagania.';

grant execute on function public.report_competency_gap_map() to authenticated;
