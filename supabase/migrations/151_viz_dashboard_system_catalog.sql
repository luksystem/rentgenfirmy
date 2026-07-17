-- Katalog systemów macierzy per dashboard (edytowalny w ustawieniach modułu)

alter table public.viz_integrated_systems
  add column if not exists dashboard_id uuid references public.viz_dashboards (id) on delete cascade;

alter table public.viz_integrated_systems
  drop constraint if exists viz_integrated_systems_code_key;

create unique index if not exists viz_integrated_systems_dashboard_code_uidx
  on public.viz_integrated_systems (dashboard_id, code)
  where dashboard_id is not null;

create unique index if not exists viz_integrated_systems_global_code_uidx
  on public.viz_integrated_systems (code)
  where dashboard_id is null;

create index if not exists viz_integrated_systems_dashboard_idx
  on public.viz_integrated_systems (dashboard_id, sort_order)
  where dashboard_id is not null;
