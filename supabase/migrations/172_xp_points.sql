-- ═══════════════════════════════════════════════════════════════════════════
-- Punkty XP: gamifikacja pracy pracowników. Punkty naliczają się automatycznie
-- z istniejących zdarzeń (ocena miesięczna, czas pracy, zadania, cele) —
-- ciągłe saldo per pracownik, bez okresów rozliczeniowych. Admin ma osobne
-- narzędzie do przeliczania punktów na premię (supabase/migrations opisuje
-- tylko model danych — narzędzie samo w kodzie aplikacji).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Kategorie punktów ─────────────────────────────────────────────────────────
create table if not exists public.xp_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  color text not null default '#6366f1',
  icon text not null default 'star',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ── Kryteria (klucz powiązany z konkretnym miejscem w kodzie) ────────────────
create table if not exists public.xp_criteria (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.xp_categories (id) on delete cascade,
  key text not null unique,
  label text not null,
  description text not null default '',
  points smallint not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists xp_criteria_category_idx on public.xp_criteria (category_id);

-- ── Saldo pracownika = suma points z tej tabeli (bez osobnej kolumny balance) ─
create table if not exists public.xp_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  criterion_id uuid references public.xp_criteria (id) on delete set null,
  category_id uuid references public.xp_categories (id) on delete set null,
  points integer not null,
  reason text not null default '',
  source_type text not null check (source_type in ('criterion', 'redemption', 'adjustment')),
  source_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists xp_ledger_employee_idx on public.xp_ledger_entries (employee_id, created_at desc);
create index if not exists xp_ledger_source_idx on public.xp_ledger_entries (source_type, source_id);

-- ── Wymiana punktów na premię (inicjuje wyłącznie admin) ─────────────────────
create table if not exists public.xp_redemptions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  points_redeemed int not null check (points_redeemed > 0),
  point_weight_at_time numeric(10, 2) not null default 0,
  amount numeric(12, 2) not null default 0,
  note text not null default '',
  is_paid boolean not null default false,
  paid_at timestamptz,
  decided_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists xp_redemptions_employee_idx on public.xp_redemptions (employee_id, created_at desc);

-- ── Seed: kategorie ────────────────────────────────────────────────────────
insert into public.xp_categories (key, label, color, icon, sort_order) values
  ('engagement', 'Zaangażowanie', '#8b5cf6', 'heart-handshake', 10),
  ('reliability', 'Rzetelność', '#0ea5e9', 'clock-check', 20),
  ('execution', 'Wykonanie', '#22c55e', 'check-circle-2', 30),
  ('quality', 'Jakość', '#f59e0b', 'sparkles', 40),
  ('goals', 'Cele', '#ef4444', 'target', 50)
on conflict (key) do nothing;

-- ── Seed: kryteria ─────────────────────────────────────────────────────────
insert into public.xp_criteria (category_id, key, label, description, points)
select c.id, v.key, v.label, v.description, v.points
from (
  values
    ('self_assessment_submitted', 'engagement', 'Złożona samoocena', 'Flat — za samo złożenie samooceny w danym miesiącu.', 20),
    ('self_assessment_rating', 'engagement', 'Wysoka samoocena', 'Mnożnik na punkt oceny (1-10) — punkty = wartość × ocena.', 8),
    ('manager_assessment_rating', 'engagement', 'Wysoka ocena przełożonego', 'Mnożnik na punkt oceny (1-10) — punkty = wartość × ocena.', 8),
    ('timesheet_submitted', 'reliability', 'Wysłany timesheet', 'Flat — za wysłanie arkusza czasu do akceptacji.', 15),
    ('timesheet_approved', 'reliability', 'Zatwierdzony timesheet', 'Flat — za zatwierdzenie arkusza czasu.', 10),
    ('timesheet_approved_without_rework', 'quality', 'Timesheet bez poprawek', 'Flat — bonus gdy arkusz nigdy nie był odrzucony przed zatwierdzeniem.', 15),
    ('task_completed_on_time', 'execution', 'Zadanie na czas', 'Flat — za zadanie zweryfikowane przed terminem lub w terminie.', 15),
    ('task_accepted_without_reservations', 'quality', 'Zadanie przyjęte bez zastrzeżeń', 'Flat — za przyjęcie zadania bez zgłoszenia ryzyka/zastrzeżeń.', 10),
    ('goal_achieved', 'goals', 'Cel osiągnięty', 'Flat — za rozliczenie celu jako w pełni osiągnięty.', 100),
    ('goal_partially_achieved', 'goals', 'Cel częściowo osiągnięty', 'Flat — za rozliczenie celu jako częściowo osiągnięty.', 30)
) as v(key, category_key, label, description, points)
join public.xp_categories c on c.key = v.category_key
on conflict (key) do nothing;

-- ── Trigger: nagroda XP za rozliczenie celu (goals.settlement_status) ────────
-- Bez tego triggera XP za cele wymagałoby server-side wrappera nad settleGoal(),
-- którego dziś nie ma (settleGoal() pisze bezpośrednio z klienta) — trigger
-- gwarantuje naliczenie niezależnie od tego, z którego miejsca w UI przyszła
-- aktualizacja.
create or replace function public.award_xp_for_goal_settlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  criterion_key text;
  matched_criterion record;
begin
  if new.settlement_status is distinct from old.settlement_status
     and new.owner_id is not null then

    if new.settlement_status = 'achieved' then
      criterion_key := 'goal_achieved';
    elsif new.settlement_status = 'partially_achieved' then
      criterion_key := 'goal_partially_achieved';
    else
      return new;
    end if;

    select id, points, category_id into matched_criterion
    from public.xp_criteria
    where key = criterion_key and is_active = true;

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
        new.owner_id, matched_criterion.id, matched_criterion.category_id,
        matched_criterion.points, 'Cel: ' || coalesce(new.title, ''), 'criterion', new.id
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists goals_award_xp on public.goals;
create trigger goals_award_xp
  after update on public.goals
  for each row execute function public.award_xp_for_goal_settlement();

-- ── RLS ───────────────────────────────────────────────────────────────────
alter table public.xp_categories enable row level security;
alter table public.xp_criteria enable row level security;
alter table public.xp_ledger_entries enable row level security;
alter table public.xp_redemptions enable row level security;

drop policy if exists xp_categories_select on public.xp_categories;
create policy xp_categories_select
  on public.xp_categories for select
  using (auth.uid() is not null);

drop policy if exists xp_criteria_select on public.xp_criteria;
create policy xp_criteria_select
  on public.xp_criteria for select
  using (auth.uid() is not null);

-- Bez zapisów bezpośrednio z klienta — katalog kryteriów/kategorii edytuje
-- wyłącznie admin przez API (service role).

drop policy if exists xp_ledger_entries_select on public.xp_ledger_entries;
create policy xp_ledger_entries_select
  on public.xp_ledger_entries for select
  using (auth.uid() = employee_id or public.is_manager_or_admin());

drop policy if exists xp_redemptions_select on public.xp_redemptions;
create policy xp_redemptions_select
  on public.xp_redemptions for select
  using (public.is_administrator());
