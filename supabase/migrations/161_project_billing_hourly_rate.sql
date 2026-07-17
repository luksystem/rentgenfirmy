-- Stawka godzinowa klienta do snapshotów kosztów wpisów czasu.

alter table public.project_billing_settings
  add column if not exists hourly_rate_net numeric(12, 2);

comment on column public.project_billing_settings.hourly_rate_net is
  'Domyślna stawka godzinowa netto (PLN/h) do snapshotu client_rate_snapshot w wpisach czasu.';
