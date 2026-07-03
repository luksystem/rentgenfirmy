-- AI estimate snapshot on service intake (public wizard)
alter table public.service_intake_requests
  add column if not exists ai_estimate jsonb,
  add column if not exists work_preference text check (
    work_preference is null or work_preference in ('on_site', 'remote', 'either')
  ),
  add column if not exists preliminary_accepted_at timestamptz;

comment on column public.service_intake_requests.ai_estimate is
  'Orientacyjna wycena AI: propozycja, kontekst dojazdu, koszty';
comment on column public.service_intake_requests.work_preference is
  'Preferencja klienta: praca u klienta, zdalnie lub obie opcje';
comment on column public.service_intake_requests.preliminary_accepted_at is
  'Klient zaakceptował orientacyjną wycenę — utworzono wstępne rozliczenie';
