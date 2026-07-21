-- Atomyczny numer zgłoszenia (max+1 z advisory lock) — unika kolizji przy lukach i równoległych insertach.

create or replace function public.next_service_intake_reference_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  y int := extract(year from timezone('utc', now()))::int;
  prefix text := 'ZS-' || y::text || '-';
  max_n int;
begin
  perform pg_advisory_xact_lock(hashtext('service_intake_ref_' || y::text));

  select coalesce(max(seq), 0)
  into max_n
  from (
    select (substring(sir.reference_number from length(prefix) + 1))::int as seq
    from public.service_intake_requests sir
    where sir.reference_number like prefix || '%'
      and substring(sir.reference_number from length(prefix) + 1) ~ '^[0-9]+$'
  ) parsed;

  return prefix || lpad((max_n + 1)::text, 4, '0');
end;
$$;

revoke all on function public.next_service_intake_reference_number() from public;
grant execute on function public.next_service_intake_reference_number() to service_role;
grant execute on function public.next_service_intake_reference_number() to authenticated;
