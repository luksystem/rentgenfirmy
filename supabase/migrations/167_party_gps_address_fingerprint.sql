-- Zapamiętaj fingerprint adresu po próbie geokodowania — mapa nie odpytuje w kółko tych samych.

alter table public.clients
  add column if not exists gps_address_fingerprint text;

alter table public.contacts
  add column if not exists gps_address_fingerprint text;

comment on column public.clients.gps_address_fingerprint is
  'Fingerprint adresu z ostatniej próby geokodowania; przy zgodności i braku GPS mapa nie ponawia.';
comment on column public.contacts.gps_address_fingerprint is
  'Fingerprint adresu z ostatniej próby geokodowania.';

-- Istniejący klienci bez GPS: oznacz jako już sprawdzonych (nie flooduj Nominatim przy każdym wejściu na mapę).
update public.clients
set gps_address_fingerprint =
  lower(trim(coalesce(location, ''))) || '|' ||
  lower(trim(coalesce(address_street, ''))) || '|' ||
  lower(trim(coalesce(address_city, ''))) || '|' ||
  lower(trim(coalesce(address_postal_code, '')))
where lat is null
  and lng is null
  and gps_address_fingerprint is null;

update public.contacts
set gps_address_fingerprint =
  lower(trim(coalesce(location, ''))) || '|' ||
  lower(trim(coalesce(address_street, ''))) || '|' ||
  lower(trim(coalesce(address_city, ''))) || '|' ||
  lower(trim(coalesce(address_postal_code, '')))
where lat is null
  and lng is null
  and gps_address_fingerprint is null;
