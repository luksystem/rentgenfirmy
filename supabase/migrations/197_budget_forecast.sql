-- Prognoza finansowa / płynność: pipeline przychodów powiązany z projektami
-- oraz koszty stałe/cykliczne/jednorazowe firmy. Ustawienia (saldo otwarcia,
-- wagi pewności, % kosztu zmiennego, horyzont) trzymane w app_settings pod
-- kluczem 'budget_forecast_settings' (wzorzec: company-profile-repository.ts),
-- nie w osobnej tabeli.

-- Helper RLS: administrator / manager / office zarządzają budżetem firmy.
-- Analogiczny do public.is_administrator() (014_profiles_auth.sql), ale szerszy
-- zakres ról — dane kosztowe/płacowe są zbyt wrażliwe na permisywne RLS
-- (wzorzec project_billing_settlements), a is_administrator() wykluczyłby office/manager.
create or replace function public.is_budget_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('administrator', 'manager', 'office')
      and is_active = true
  );
$$;

comment on function public.is_budget_manager() is
  'Uprawnienie do modułu Prognoza finansowa / Budżet — administrator, manager, office. Używane w RLS budget_cost_items i project_revenue_forecasts.';

-- ── Koszty stałe / cykliczne / jednorazowe ─────────────────────────────────────

create table if not exists public.budget_cost_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'inne'
    check (category in ('biuro', 'auto', 'wynagrodzenia', 'zus', 'media', 'podatki', 'inne')),
  amount numeric(12, 2) not null default 0,
  cadence text not null check (cadence in ('monthly', 'every_n_months', 'one_off')),
  interval_months integer,
  month date,
  start_month date not null default date_trunc('month', now())::date,
  end_month date,
  is_active boolean not null default true,
  notes text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint budget_cost_items_every_n_months_ck
    check (cadence <> 'every_n_months' or (interval_months is not null and interval_months > 0)),
  constraint budget_cost_items_one_off_month_ck
    check (cadence <> 'one_off' or month is not null),
  constraint budget_cost_items_end_after_start_ck
    check (end_month is null or end_month >= start_month)
);

comment on table public.budget_cost_items is
  'Koszty firmy (stałe cykliczne + jednorazowe) do prognozy płynności. Jeden spójny mechanizm: cadence=monthly/every_n_months/one_off.';
comment on column public.budget_cost_items.month is
  'Tylko dla cadence=one_off: miesiąc, w którym koszt wystąpi jednorazowo (pierwszy dzień miesiąca).';
comment on column public.budget_cost_items.start_month is
  'Dla monthly/every_n_months: pierwszy miesiąc, od którego koszt się liczy. Dla one_off: bez znaczenia (używane month).';
comment on column public.budget_cost_items.interval_months is
  'Tylko dla cadence=every_n_months: co ile miesięcy koszt się powtarza (np. 3 = kwartalnie), licząc od start_month.';

create index if not exists budget_cost_items_active_idx
  on public.budget_cost_items (is_active, cadence);

alter table public.budget_cost_items enable row level security;

drop policy if exists "budget_cost_items_select" on public.budget_cost_items;
drop policy if exists "budget_cost_items_insert" on public.budget_cost_items;
drop policy if exists "budget_cost_items_update" on public.budget_cost_items;
drop policy if exists "budget_cost_items_delete" on public.budget_cost_items;

create policy "budget_cost_items_select" on public.budget_cost_items
  for select using (public.is_budget_manager());
create policy "budget_cost_items_insert" on public.budget_cost_items
  for insert with check (public.is_budget_manager());
create policy "budget_cost_items_update" on public.budget_cost_items
  for update using (public.is_budget_manager()) with check (public.is_budget_manager());
create policy "budget_cost_items_delete" on public.budget_cost_items
  for delete using (public.is_budget_manager());

-- ── Pipeline przychodów — powiązany z projektami ───────────────────────────────

create table if not exists public.project_revenue_forecasts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  expected_month date not null,
  amount_gross numeric(12, 2) not null default 0 check (amount_gross >= 0),
  confidence text not null check (confidence in ('ok', 'high', 'medium', 'low', 'frozen')),
  notes text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.project_revenue_forecasts is
  'Spodziewane wpływy pipeline powiązane z projektami — kwota + miesiąc + poziom pewności (OK/HI/MI/LO/Zamrożone). Wejście do silnika prognozy płynności.';
comment on column public.project_revenue_forecasts.expected_month is
  'Pierwszy dzień miesiąca, w którym spodziewany jest wpływ (konwencja: date_trunc(month)).';

create index if not exists project_revenue_forecasts_project_idx
  on public.project_revenue_forecasts (project_id, expected_month);
create index if not exists project_revenue_forecasts_month_idx
  on public.project_revenue_forecasts (expected_month);

alter table public.project_revenue_forecasts enable row level security;

drop policy if exists "project_revenue_forecasts_select" on public.project_revenue_forecasts;
drop policy if exists "project_revenue_forecasts_insert" on public.project_revenue_forecasts;
drop policy if exists "project_revenue_forecasts_update" on public.project_revenue_forecasts;
drop policy if exists "project_revenue_forecasts_delete" on public.project_revenue_forecasts;

create policy "project_revenue_forecasts_select" on public.project_revenue_forecasts
  for select using (public.is_budget_manager());
create policy "project_revenue_forecasts_insert" on public.project_revenue_forecasts
  for insert with check (public.is_budget_manager());
create policy "project_revenue_forecasts_update" on public.project_revenue_forecasts
  for update using (public.is_budget_manager()) with check (public.is_budget_manager());
create policy "project_revenue_forecasts_delete" on public.project_revenue_forecasts
  for delete using (public.is_budget_manager());

notify pgrst, 'reload schema';
