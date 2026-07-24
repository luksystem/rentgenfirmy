-- Akcje symulacyjne prognozy płynności: nazwane, przełączalne "co jeśli" — np.
-- zwolnienie pracownika (redukcja kosztu), podpisanie umowy (wzrost przychodu),
-- ręczna zmiana kosztów/przychodów o X. Ten sam model cykliczności co
-- budget_cost_items (monthly/every_n_months/one_off), ale z effect_type
-- (koszt/przychód) i is_enabled (przełącznik włącz/wyłącz — odpowiednik
-- checkboxa A154 z arkusza Excel, tylko dla wielu nazwanych akcji naraz).

create table if not exists public.budget_scenario_actions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text not null default '',
  effect_type text not null check (effect_type in ('cost', 'revenue')),
  amount numeric(12, 2) not null default 0,
  cadence text not null check (cadence in ('monthly', 'every_n_months', 'one_off')),
  interval_months integer,
  month date,
  start_month date not null default date_trunc('month', now())::date,
  end_month date,
  is_enabled boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint budget_scenario_actions_every_n_months_ck
    check (cadence <> 'every_n_months' or (interval_months is not null and interval_months > 0)),
  constraint budget_scenario_actions_one_off_month_ck
    check (cadence <> 'one_off' or month is not null),
  constraint budget_scenario_actions_end_after_start_ck
    check (end_month is null or end_month >= start_month)
);

comment on table public.budget_scenario_actions is
  'Przełączalne akcje "co jeśli" w prognozie płynności — zmiana kosztów lub przychodów o kwotę (amount, może być ujemna), do włączania/wyłączania na żywo bez zapisywania osobnych scenariuszy.';
comment on column public.budget_scenario_actions.amount is
  'Kwota zmiany — dodatnia = wzrost (kosztu lub przychodu), ujemna = spadek. Np. zwolnienie pracownika = effect_type=cost, amount ujemne.';
comment on column public.budget_scenario_actions.is_enabled is
  'Przełącznik włącz/wyłącz akcję w bieżącej prognozie — odpowiednik checkboxa z arkusza Excel.';

create index if not exists budget_scenario_actions_enabled_idx
  on public.budget_scenario_actions (is_enabled, cadence);

alter table public.budget_scenario_actions enable row level security;

drop policy if exists "budget_scenario_actions_select" on public.budget_scenario_actions;
drop policy if exists "budget_scenario_actions_insert" on public.budget_scenario_actions;
drop policy if exists "budget_scenario_actions_update" on public.budget_scenario_actions;
drop policy if exists "budget_scenario_actions_delete" on public.budget_scenario_actions;

create policy "budget_scenario_actions_select" on public.budget_scenario_actions
  for select using (public.is_budget_manager());
create policy "budget_scenario_actions_insert" on public.budget_scenario_actions
  for insert with check (public.is_budget_manager());
create policy "budget_scenario_actions_update" on public.budget_scenario_actions
  for update using (public.is_budget_manager()) with check (public.is_budget_manager());
create policy "budget_scenario_actions_delete" on public.budget_scenario_actions
  for delete using (public.is_budget_manager());

notify pgrst, 'reload schema';
