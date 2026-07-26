-- Nowe KPI: poprawki i nieplanowane kończenia w czasie pracy (domena "team").
-- Liczy wpisy time_entries.work_nature in ('rework', 'unplanned_closing') w oknie tygodniowym.

insert into public.report_kpi_config (kpi_key, domain, label, comparison_period, sort_order)
values
  ('team.rework_entries', 'team', 'Poprawki i nieplanowane kończenia (tydzień)', 'week', 70)
on conflict (kpi_key) do nothing;
