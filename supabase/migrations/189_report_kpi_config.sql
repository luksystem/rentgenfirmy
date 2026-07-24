-- Katalog konfigurowalnych KPI dla dashboardu "Raport firmowy" (app/raport).
-- Admin włącza/wyłącza wskaźniki per obszar, ustawia progi warn/crit, okres odniesienia
-- (do czego porównujemy wartość bieżącą) i kolejność wyświetlania na kafelku.
-- Polaryzacja KPI (czy wzrost jest zły czy dobry) NIE jest tu przechowywana — to własność
-- znaczenia wskaźnika, zaszyta w kodzie (lib/report-kpi/types.ts), nie coś edytowalnego przez admina.

create table if not exists public.report_kpi_config (
  kpi_key text primary key,
  domain text not null check (domain in ('team', 'growth', 'sales', 'service', 'budget')),
  label text not null,
  enabled boolean not null default true,
  warning_threshold numeric,
  critical_threshold numeric,
  comparison_period text not null default 'none'
    check (comparison_period in ('none', 'day', 'week', 'month', 'quarter', 'year')),
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists report_kpi_config_domain_idx
  on public.report_kpi_config (domain, sort_order);

comment on column public.report_kpi_config.comparison_period is
  'none/day/week/month/quarter/year — steruje wyliczeniem "poprzedniego" okresu dla trendu tego KPI; "none" = wskaźnik stanu, bez delty/strzałki.';
comment on column public.report_kpi_config.warning_threshold is
  'null = próg nieustawiony, wartość bezwzględna nigdy nie wprowadzi KPI w stan warning (może mieć złą deltę).';
comment on column public.report_kpi_config.critical_threshold is
  'null = jak wyżej, dla stanu critical.';

alter table public.report_kpi_config enable row level security;

drop policy if exists report_kpi_config_select on public.report_kpi_config;
create policy report_kpi_config_select
  on public.report_kpi_config for select
  using (auth.uid() is not null);

-- Brak polityki insert/update/delete dla klienta — zapisy tylko przez klienta service-role
-- w app/api/raport-firmy/kpi-config/route.ts, chronione requireAdministratorProfile().

insert into public.report_kpi_config (kpi_key, domain, label, comparison_period, sort_order)
values
  -- Zespół i czas
  ('team.overdue_tasks', 'team', 'Zadania przeterminowane', 'day', 10),
  ('team.unassigned_tomorrow', 'team', 'Zadania bez przydziału (na jutro)', 'none', 20),
  ('team.tasks_waiting_3d', 'team', 'Zadania oczekujące >3 dni', 'week', 30),
  ('team.overtime_hours', 'team', 'Nadgodziny w tygodniu', 'week', 40),
  ('team.pending_leave_requests', 'team', 'Wnioski urlopowe czekające na akceptację', 'week', 50),
  ('team.resource_plan_gaps', 'team', 'Luki w planie zasobów (7 dni)', 'none', 60),

  -- Ocena i rozwój
  ('growth.xp_points_awarded', 'growth', 'Przyznane punkty XP w okresie', 'week', 10),
  ('growth.monthly_reviews_pending', 'growth', 'Oceny miesięczne do zatwierdzenia', 'none', 20),
  ('growth.goals_deadline_soon', 'growth', 'Cele kończące się w ciągu 7 dni', 'none', 30),

  -- Sprzedaż i cashflow
  ('sales.offers_awaiting_client', 'sales', 'Oferty oczekujące na klienta', 'week', 10),
  ('sales.settlements_awaiting_payment', 'sales', 'Rozliczenia oczekujące na płatność', 'week', 20),
  ('sales.requisitions_open', 'sales', 'Otwarte zapotrzebowania', 'none', 30),
  ('sales.requisitions_overdue', 'sales', 'Przeterminowane zapotrzebowania', 'day', 40),

  -- Serwis
  ('service.tickets_untouched_48h', 'service', 'Zgłoszenia nieruszone >48h', 'none', 10),
  ('service.tickets_overdue', 'service', 'Zgłoszenia przeterminowane', 'none', 20),
  ('service.inspections_upcoming_week', 'service', 'Przeglądy w najbliższym tygodniu', 'none', 30),

  -- Budżet firmy (tylko administrator)
  ('budget.revenue_mtd', 'budget', 'Przychód: miesiąc do dziś', 'month', 10),
  ('budget.receivables_overdue', 'budget', 'Należności przeterminowane (zł)', 'month', 20),
  ('budget.invoices_to_issue', 'budget', 'Faktury do wystawienia', 'week', 30)
on conflict (kpi_key) do nothing;
