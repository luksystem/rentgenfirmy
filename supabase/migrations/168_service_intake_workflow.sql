-- Workflow zgłoszeń: zaangażowani, podejścia, feedback Rozlicz/Utknięte, status stuck

alter table public.service_intake_requests
  add column if not exists involved_profile_ids uuid[] not null default '{}',
  add column if not exists attempt_count integer not null default 1,
  add column if not exists resolution_outcome text,
  add column if not exists resolution_cause text,
  add column if not exists extra_costs boolean,
  add column if not exists extra_costs_note text,
  add column if not exists stuck_reason text,
  add column if not exists stuck_notes text,
  add column if not exists feedback_at timestamptz;

comment on column public.service_intake_requests.involved_profile_ids is
  'Dodatkowe osoby zaangażowane w zgłoszenie (poza assignee).';
comment on column public.service_intake_requests.attempt_count is
  'Liczba podejść — zwiększana przy oznaczeniu jako utknięte.';
comment on column public.service_intake_requests.resolution_outcome is
  'Feedback przy Rozlicz: full | partial | none.';

alter table public.service_intake_requests
  drop constraint if exists service_intake_requests_resolution_outcome_check;

alter table public.service_intake_requests
  add constraint service_intake_requests_resolution_outcome_check
  check (
    resolution_outcome is null
    or resolution_outcome in ('full', 'partial', 'none')
  );

-- Status stuck (kolumna text bez enum) — bez CHECK na status w starszych migracjach.
