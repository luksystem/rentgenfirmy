-- Pozycja GPS klientów i kontaktów (mapa bez ponownego geokodowania przy każdym wejściu)

alter table public.clients
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists gps_manual boolean not null default false;

alter table public.contacts
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists gps_manual boolean not null default false;

comment on column public.clients.lat is 'Szerokość geograficzna (WGS84) — mapa klientów.';
comment on column public.clients.lng is 'Długość geograficzna (WGS84) — mapa klientów.';
comment on column public.clients.gps_manual is 'true = pozycja ustawiona ręcznie przez admina.';

comment on column public.contacts.lat is 'Szerokość geograficzna (WGS84).';
comment on column public.contacts.lng is 'Długość geograficzna (WGS84).';
comment on column public.contacts.gps_manual is 'true = pozycja ustawiona ręcznie przez admina.';

create index if not exists clients_gps_idx on public.clients (lat, lng)
  where lat is not null and lng is not null;

create index if not exists contacts_gps_idx on public.contacts (lat, lng)
  where lat is not null and lng is not null;
