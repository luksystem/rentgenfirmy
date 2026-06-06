alter table public.services
  add column if not exists show_estimate_comparison boolean not null default true;
