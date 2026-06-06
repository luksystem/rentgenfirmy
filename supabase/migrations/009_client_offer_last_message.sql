-- Zachowanie ostatniej wiadomości klienta po regeneracji linku

alter table public.services
  add column if not exists client_offer_last_client_message text;
