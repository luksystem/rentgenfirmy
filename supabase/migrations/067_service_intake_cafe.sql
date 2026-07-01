-- CAFE priorytety, rodzaj zgłoszenia i sposób działania pogwarancyjnego

alter table public.service_intake_requests
  add column if not exists request_type text,
  add column if not exists post_warranty_action text;

-- Najpierw zdejmij stary constraint (low/standard/urgent), dopiero potem mapuj na CAFE
alter table public.service_intake_requests
  drop constraint if exists service_intake_requests_priority_check;

update public.service_intake_requests
set priority = case
  when priority = 'urgent' then 'c'
  when priority = 'standard' then 'a'
  when priority = 'low' then 'f'
  else priority
end
where priority in ('low', 'standard', 'urgent');

update public.service_intake_requests
set request_type = 'service'
where request_type is null;

alter table public.service_intake_requests
  alter column request_type set default 'service';

alter table public.service_intake_requests
  alter column request_type set not null;

alter table public.service_intake_requests
  alter column priority drop not null;

alter table public.service_intake_requests
  add constraint service_intake_requests_priority_check
  check (priority is null or priority in ('c', 'a', 'f', 'e'));

alter table public.service_intake_requests
  drop constraint if exists service_intake_requests_request_type_check;

alter table public.service_intake_requests
  add constraint service_intake_requests_request_type_check
  check (request_type in ('service', 'new_feature', 'offer_request'));

alter table public.service_intake_requests
  drop constraint if exists service_intake_requests_post_warranty_action_check;

alter table public.service_intake_requests
  add constraint service_intake_requests_post_warranty_action_check
  check (
    post_warranty_action is null
    or post_warranty_action in ('offer', 'on_site', 'remote')
  );
