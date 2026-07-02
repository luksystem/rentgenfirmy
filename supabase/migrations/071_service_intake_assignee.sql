-- Osoba odpowiedzialna za obsługę zgłoszenia serwisowego

alter table public.service_intake_requests
  add column if not exists assignee_id uuid references public.profiles (id) on delete set null,
  add column if not exists assignee_name text;

create index if not exists service_intake_requests_assignee_idx
  on public.service_intake_requests (assignee_id);
