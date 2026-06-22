-- Gwarancja: data przekazania systemu + czas trwania (miesiące)

alter table public.projects
  add column if not exists system_handover_at date,
  add column if not exists warranty_duration_months integer;

alter table public.projects
  drop constraint if exists projects_warranty_duration_months_check;

alter table public.projects
  add constraint projects_warranty_duration_months_check
  check (warranty_duration_months is null or warranty_duration_months > 0);
