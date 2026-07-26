-- Domyślne progi warn/crit dla katalogu KPI Raportu firmowego. Bez tego admin musiał
-- ręcznie ustawić progi w /raport/ustawienia-kpi zanim cokolwiek pokazało się na
-- pomarańczowo/czerwono — evaluateSeverity() traktuje brak progu jako "zawsze dobrze".
-- Wartości to rozsądny punkt startowy dla firmy tej skali — edytowalne przez admina.

update public.report_kpi_config set warning_threshold = 3, critical_threshold = 8
  where kpi_key = 'team.overdue_tasks' and warning_threshold is null;
update public.report_kpi_config set warning_threshold = 1, critical_threshold = 3
  where kpi_key = 'team.unassigned_tomorrow' and warning_threshold is null;
update public.report_kpi_config set warning_threshold = 3, critical_threshold = 8
  where kpi_key = 'team.tasks_waiting_3d' and warning_threshold is null;
update public.report_kpi_config set warning_threshold = 20, critical_threshold = 40
  where kpi_key = 'team.overtime_hours' and warning_threshold is null;
update public.report_kpi_config set warning_threshold = 2, critical_threshold = 5
  where kpi_key = 'team.pending_leave_requests' and warning_threshold is null;
update public.report_kpi_config set warning_threshold = 1, critical_threshold = 3
  where kpi_key = 'team.resource_plan_gaps' and warning_threshold is null;

update public.report_kpi_config set warning_threshold = 3, critical_threshold = 6
  where kpi_key = 'growth.monthly_reviews_pending' and warning_threshold is null;
update public.report_kpi_config set warning_threshold = 2, critical_threshold = 5
  where kpi_key = 'growth.goals_deadline_soon' and warning_threshold is null;

update public.report_kpi_config set warning_threshold = 3, critical_threshold = 8
  where kpi_key = 'sales.offers_awaiting_client' and warning_threshold is null;
update public.report_kpi_config set warning_threshold = 2, critical_threshold = 5
  where kpi_key = 'sales.settlements_awaiting_payment' and warning_threshold is null;
update public.report_kpi_config set warning_threshold = 5, critical_threshold = 10
  where kpi_key = 'sales.requisitions_open' and warning_threshold is null;
update public.report_kpi_config set warning_threshold = 1, critical_threshold = 3
  where kpi_key = 'sales.requisitions_overdue' and warning_threshold is null;

update public.report_kpi_config set warning_threshold = 2, critical_threshold = 5
  where kpi_key = 'service.tickets_untouched_48h' and warning_threshold is null;
update public.report_kpi_config set warning_threshold = 1, critical_threshold = 3
  where kpi_key = 'service.tickets_overdue' and warning_threshold is null;

update public.report_kpi_config set warning_threshold = 10000, critical_threshold = 30000
  where kpi_key = 'budget.receivables_overdue' and warning_threshold is null;
update public.report_kpi_config set warning_threshold = 3, critical_threshold = 6
  where kpi_key = 'budget.invoices_to_issue' and warning_threshold is null;
-- increase-is-good: progi jako podłoga (patrz evaluateSeverity) — wartość PONIŻEJ progu jest zła.
update public.report_kpi_config set warning_threshold = 20000, critical_threshold = 0
  where kpi_key = 'budget.cashflow_balance_3m' and warning_threshold is null;
update public.report_kpi_config set warning_threshold = 3, critical_threshold = 1
  where kpi_key = 'budget.months_to_negative_balance' and warning_threshold is null;

update public.report_kpi_config set warning_threshold = 3, critical_threshold = 8
  where kpi_key = 'deployment.kanban_tasks_overdue' and warning_threshold is null;
update public.report_kpi_config set warning_threshold = 2, critical_threshold = 5
  where kpi_key = 'deployment.kanban_tasks_new_from_client' and warning_threshold is null;
update public.report_kpi_config set warning_threshold = 2, critical_threshold = 5
  where kpi_key = 'deployment.milestones_overdue' and warning_threshold is null;
