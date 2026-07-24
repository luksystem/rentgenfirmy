-- ═══════════════════════════════════════════════════════════════════════════
-- PDCA (Problemy i usprawnienia) jako nowy typ tablicy w module Cele + nowy,
-- mały moduł Standardy i procedury. Zgłoszenie problemu ("Plan przed akceptacją")
-- to osobna, lekka tabela — pełny Cel (boardId/ownerId/periodType) powstaje
-- dopiero gdy manager zaakceptuje problem jako warty rozwiązania.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Nowy rodzaj tablicy celów: Usprawnienia (PDCA) ──────────────────────────
insert into public.goal_board_kinds (code, label, description, icon, visibility, sort_order) values
  ('improvement', 'Usprawnienia (PDCA)', 'Problemy zgłoszone przez zespół i ich rozwiązania — cykl Plan-Do-Check-Act.', 'refresh-ccw', 'all', 45)
on conflict (code) do nothing;

-- ── Metodologia PDCA — pola rozwiązania (negacja problemu, koszt, oszczędność) ──
insert into public.goal_methodologies (
  code, name, short_description, purpose, when_to_use, when_not_to_use,
  structure_md, example_md, best_practices_md, common_mistakes_md, field_schema, sort_order
) values (
  'pdca_improvement',
  'PDCA — Usprawnienie',
  'Rozwiązanie zdefiniowane jako zaprzeczenie zgłoszonego problemu, z kosztem, oszczędnością i osobami do zaangażowania.',
  'Ustrukturyzowane przejście od problemu zgłoszonego przez zespół do wdrożonego, przetestowanego usprawnienia.',
  'Każdy zaakceptowany przez managera problem zgłoszony przez zespół, wart formalnego rozwiązania.',
  'Cele strategiczne bez konkretnego punktu wyjścia w postaci problemu operacyjnego — użyj SMART/OKR.',
  '**Problem** — punkt wyjścia (opis w zgłoszeniu)\n**Rozwiązanie** — zaprzeczenie problemu\n**Co potrzeba** — zasoby/zakupy/decyzje\n**Koszt / Oszczędność** — szacunek\n**Zaangażowani** — kto musi wziąć udział',
  'Problem: „Nie mamy własnej drabiny, wypożyczamy raz w tygodniu — tracimy czas i pieniądze.” Rozwiązanie: „Mamy własną drabinę.” Efekt: standard „drabina zawsze w aucie serwisowym”.',
  'Rozwiązanie formułuj jako wprost odwróconą treść problemu, nie jako ogólnik. Rozpisz zadania z terminami i jedną osobą odpowiedzialną za całość.',
  'Rozwiązanie bez konkretnych zadań/terminów. Brak jednej osoby odpowiedzialnej. Brak testu po wdrożeniu (od razu zamknięcie bez sprawdzenia czy zadziałało).',
  '[
    {"key":"solutionStatement","label":"Rozwiązanie (zaprzeczenie problemu)","type":"textarea"},
    {"key":"whatIsNeeded","label":"Co jest potrzebne","type":"textarea"},
    {"key":"estimatedCostAmount","label":"Szacowany koszt (zł)","type":"number"},
    {"key":"estimatedCostNote","label":"Koszt — uwagi","type":"text"},
    {"key":"estimatedSavingsAmount","label":"Szacowana oszczędność (zł lub godz./mies.)","type":"number"},
    {"key":"estimatedSavingsNote","label":"Oszczędność — uwagi/jednostka","type":"text"},
    {"key":"involvedPeople","label":"Osoby do zaangażowania","type":"list"}
  ]'::jsonb,
  15
)
on conflict (code) do nothing;

-- ── Zgłoszenia problemów — etap Plan przed akceptacją ───────────────────────
create table if not exists public.goal_problems (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.goal_boards (id) on delete cascade,
  reported_by uuid references public.profiles (id) on delete set null,
  title text not null,
  description text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  rejection_reason text not null default '',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  resulting_goal_id uuid references public.goals (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goal_problems_board_idx on public.goal_problems (board_id, status);
create index if not exists goal_problems_reported_by_idx on public.goal_problems (reported_by);
create index if not exists goal_problems_status_idx on public.goal_problems (status) where status = 'pending';

comment on table public.goal_problems is
  'Zgłoszenia problemów (etap Plan cyklu PDCA, przed akceptacją managera). Po akceptacji resulting_goal_id wskazuje na Cel utworzony na tablicy typu "improvement".';

alter table public.goal_problems enable row level security;
drop policy if exists "goal_problems_all" on public.goal_problems;
create policy "goal_problems_all" on public.goal_problems for all using (true) with check (true);

-- ── Standardy i procedury ────────────────────────────────────────────────────
create table if not exists public.company_standards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null default '',
  context_html text not null default '',
  steps jsonb not null default '[]'::jsonb,
  tips_html text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  source_goal_id uuid references public.goals (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_standards_status_idx on public.company_standards (status);
create index if not exists company_standards_source_goal_idx
  on public.company_standards (source_goal_id) where source_goal_id is not null;

comment on column public.company_standards.steps is
  'Tablica kroków {title, bodyHtml} — ten sam kształt co steps w smart_home_kb_articles.';
comment on column public.company_standards.source_goal_id is
  'Cel PDCA, z którego rozliczenia utworzono ten standard (opcjonalne — standard może też powstać samodzielnie).';

alter table public.company_standards enable row level security;
drop policy if exists "company_standards_select" on public.company_standards;
create policy "company_standards_select" on public.company_standards for select using (auth.uid() is not null);
drop policy if exists "company_standards_write" on public.company_standards;
create policy "company_standards_write" on public.company_standards for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- ── XP: nowe kryteria zaangażowania w zgłaszanie i rozwiązywanie problemów ──
insert into public.xp_criteria (category_id, key, label, description, points)
select c.id, v.key, v.label, v.description, v.points
from (
  values
    ('pdca_problem_reported', 'engagement', 'Zgłoszony problem', 'Flat — za zgłoszenie problemu do rozwiązania w module Usprawnień.', 10),
    ('pdca_problem_accepted', 'engagement', 'Problem zaakceptowany do rozwiązania', 'Flat — dla zgłaszającego, gdy manager uzna problem za warty rozwiązania.', 25)
) as v(key, category_key, label, description, points)
join public.xp_categories c on c.key = v.category_key
on conflict (key) do nothing;

-- ── Trigger: XP za zgłoszenie problemu (zawsze dla zgłaszającego) ───────────
create or replace function public.award_xp_for_problem_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_criterion record;
begin
  if new.reported_by is null then
    return new;
  end if;

  select id, points, category_id into matched_criterion
  from public.xp_criteria
  where key = 'pdca_problem_reported' and is_active = true;

  if matched_criterion.id is null then
    return new;
  end if;

  insert into public.xp_ledger_entries (
    employee_id, criterion_id, category_id, points, reason, source_type, source_id
  ) values (
    new.reported_by, matched_criterion.id, matched_criterion.category_id,
    matched_criterion.points, 'Zgłoszenie problemu: ' || new.title, 'criterion', new.id
  );

  return new;
end;
$$;

drop trigger if exists goal_problems_award_report_xp on public.goal_problems;
create trigger goal_problems_award_report_xp
  after insert on public.goal_problems
  for each row execute function public.award_xp_for_problem_report();

-- ── Trigger: XP za akceptację problemu (dla zgłaszającego, nie managera) ────
create or replace function public.award_xp_for_problem_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_criterion record;
begin
  if new.status is distinct from old.status
     and new.status = 'accepted'
     and new.reported_by is not null then

    select id, points, category_id into matched_criterion
    from public.xp_criteria
    where key = 'pdca_problem_accepted' and is_active = true;

    if matched_criterion.id is null then
      return new;
    end if;

    if not exists (
      select 1 from public.xp_ledger_entries
      where source_type = 'criterion'
        and source_id = new.id
        and criterion_id = matched_criterion.id
    ) then
      insert into public.xp_ledger_entries (
        employee_id, criterion_id, category_id, points, reason, source_type, source_id
      ) values (
        new.reported_by, matched_criterion.id, matched_criterion.category_id,
        matched_criterion.points, 'Zaakceptowany problem: ' || new.title, 'criterion', new.id
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists goal_problems_award_acceptance_xp on public.goal_problems;
create trigger goal_problems_award_acceptance_xp
  after update on public.goal_problems
  for each row execute function public.award_xp_for_problem_acceptance();

notify pgrst, 'reload schema';
