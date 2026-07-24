-- Powiązanie konta (profiles, rola "klient") z konkretnym rekordem klienta (clients).
-- Potrzebne, żeby zalogowany klient mógł zobaczyć swoją ścieżkę szkoleniową w bazie wiedzy Smart Home.

alter table public.profiles
  add column if not exists client_id uuid references public.clients (id) on delete set null;

create index if not exists profiles_client_id_idx
  on public.profiles (client_id)
  where client_id is not null;

comment on column public.profiles.client_id is
  'Powiązanie konta klienta (rola klient) z rekordem w public.clients — ustawiane z poziomu zakładki "Ścieżka szkoleniowa" w module Klienci.';
