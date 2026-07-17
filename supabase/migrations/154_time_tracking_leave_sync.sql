-- Powiązanie wpisów czasu z wnioskami urlopowymi (sync po akceptacji urlopu).

alter table public.time_entries
  add column if not exists leave_request_id uuid references public.leave_requests (id) on delete cascade;

create unique index if not exists time_entries_leave_request_date_uidx
  on public.time_entries (leave_request_id, date)
  where leave_request_id is not null;

create index if not exists time_entries_leave_request_idx
  on public.time_entries (leave_request_id)
  where leave_request_id is not null;
