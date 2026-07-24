-- Backfill: services.client_full_name było zapisywane przez buggy partyToServiceClientName
-- (zwracała samo nazwisko zamiast imienia i nazwiska) — patrz lib/party/display-name.ts.
-- Ten fix dotyczy tylko nowych zapisów; tu poprawiamy już istniejące rekordy z danych źródłowych.

update public.services s
set client_full_name = trim(concat_ws(' ', nullif(trim(c.first_name), ''), nullif(trim(c.last_name), '')))
from public.clients c
where s.client_id = c.id
  and trim(concat_ws(' ', nullif(trim(c.first_name), ''), nullif(trim(c.last_name), ''))) <> ''
  and s.client_full_name <> trim(concat_ws(' ', nullif(trim(c.first_name), ''), nullif(trim(c.last_name), '')));

update public.services s
set client_full_name = trim(concat_ws(' ', nullif(trim(ct.first_name), ''), nullif(trim(ct.last_name), '')))
from public.contacts ct
where s.client_id is null
  and s.contact_id = ct.id
  and trim(concat_ws(' ', nullif(trim(ct.first_name), ''), nullif(trim(ct.last_name), ''))) <> ''
  and s.client_full_name <> trim(concat_ws(' ', nullif(trim(ct.first_name), ''), nullif(trim(ct.last_name), '')));
