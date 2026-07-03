-- Zakotwiczenie struktury procesu w projekcie — nie aktualizuje się automatycznie ze szablonem

alter table public.project_processes
  add column if not exists template_snapshot jsonb;
