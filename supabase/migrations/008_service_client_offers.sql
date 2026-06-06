-- Link publiczny do wyceny dla klienta (akceptacja / odrzucenie / negocjacja)

alter table public.services
  add column if not exists client_offer_token text,
  add column if not exists client_offer_expires_at timestamptz,
  add column if not exists client_offer_status text,
  add column if not exists client_offer_message text,
  add column if not exists client_offer_responded_at timestamptz;

create unique index if not exists services_client_offer_token_idx
  on public.services (client_offer_token)
  where client_offer_token is not null;
