-- Termin wykonania zgłoszenia serwisowego (domyślnie z priorytetu CAFE)

alter table public.service_intake_requests
  add column if not exists due_at timestamptz;

-- Backfill istniejących zgłoszeń według priorytetu CAFE
update public.service_intake_requests
set due_at = case
  when priority = 'c' then created_at + interval '1 day'
  when priority = 'a' then created_at + interval '7 days'
  when priority = 'f' then created_at + interval '30 days'
  when priority is null then created_at + interval '7 days'
  else null
end
where due_at is null;
