-- Drugi link oferty: rozliczenie po wykonaniu prac (hourly)

alter table public.services
  add column if not exists settlement_offer_token text,
  add column if not exists settlement_offer_expires_at timestamptz,
  add column if not exists settlement_offer_status text,
  add column if not exists settlement_offer_message text,
  add column if not exists settlement_offer_responded_at timestamptz,
  add column if not exists settlement_offer_last_client_message text,
  add column if not exists settlement_offer_history jsonb not null default '[]'::jsonb,
  add column if not exists settlement_offer_accepted_document jsonb;

create unique index if not exists services_settlement_offer_token_idx
  on public.services (settlement_offer_token)
  where settlement_offer_token is not null;
