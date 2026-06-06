-- Historia interakcji klienta z ofertą oraz zamrożony dokument zaakceptowanej wyceny

alter table public.services
  add column if not exists client_offer_history jsonb not null default '[]'::jsonb,
  add column if not exists client_offer_accepted_document jsonb;
