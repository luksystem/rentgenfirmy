-- Oferty i nowe funkcjonalności używają typu „Prace dodatkowe” (resolveIntakeAiServiceType)

alter table public.service_intake_requests
  drop constraint if exists service_intake_requests_service_type_hint_check;

alter table public.service_intake_requests
  add constraint service_intake_requests_service_type_hint_check
  check (
    service_type_hint in ('Gwarancyjny', 'Pogwarancyjny', 'Prace dodatkowe', 'Inne')
  );
