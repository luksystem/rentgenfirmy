-- Wzorce checklist/protokołów w szablonie + daty kamieni milowych per projekt

alter table public.process_items
  add column if not exists default_payload jsonb not null default '{}'::jsonb;

alter table public.project_processes
  add column if not exists milestone_dates jsonb not null default '{}'::jsonb;
