-- Oferty utworzone z formularza zgłoszenia — badge do momentu pierwszej edycji

alter table public.services
  add column if not exists intake_reference text,
  add column if not exists reviewed_at timestamptz;

create index if not exists services_unreviewed_intake_idx
  on public.services (reviewed_at)
  where reviewed_at is null and intake_reference is not null;
