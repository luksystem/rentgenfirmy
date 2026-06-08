-- Planowane daty kamieni milowych w procesach

alter table public.process_milestones
  add column if not exists planned_date date;
