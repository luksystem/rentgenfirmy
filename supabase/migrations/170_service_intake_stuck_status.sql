-- Constraint statusu nie zawierał "stuck" (migracja 168 błędnie zakładała brak CHECK na status).

alter table public.service_intake_requests
  drop constraint if exists service_intake_requests_status_check;

alter table public.service_intake_requests
  add constraint service_intake_requests_status_check
  check (
    status = any (array['new', 'in_review', 'stuck', 'converted', 'closed', 'rejected'])
  );
