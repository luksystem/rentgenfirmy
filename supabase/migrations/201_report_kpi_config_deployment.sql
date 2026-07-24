-- Rozszerzenie katalogu KPI Raportu firmowego: nowa domena "deployment" (Wdrożenia —
-- zadania kanban i kamienie milowe procesów), plus dwa nowe KPI cashflow w domenie
-- "budget", korzystające z silnika prognozy płynności (lib/budget-forecast/engine.ts).

alter table public.report_kpi_config drop constraint if exists report_kpi_config_domain_check;
alter table public.report_kpi_config add constraint report_kpi_config_domain_check
  check (domain in ('team', 'growth', 'sales', 'service', 'deployment', 'budget'));

insert into public.report_kpi_config (kpi_key, domain, label, comparison_period, sort_order)
values
  ('deployment.kanban_tasks_overdue', 'deployment', 'Zadania kanban przeterminowane', 'day', 10),
  ('deployment.kanban_tasks_new_from_client', 'deployment', 'Nowe zadania od klienta (nieprzejrzane)', 'none', 20),
  ('deployment.milestones_overdue', 'deployment', 'Kamienie milowe po terminie', 'none', 30),

  ('budget.cashflow_balance_3m', 'budget', 'Prognozowane saldo za 3 miesiące', 'none', 40),
  ('budget.months_to_negative_balance', 'budget', 'Miesięcy do ujemnego salda', 'none', 50)
on conflict (kpi_key) do nothing;
