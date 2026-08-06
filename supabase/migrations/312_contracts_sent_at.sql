-- Znacznik faktycznej wysyłki maila z linkiem do podpisania (analogicznie do
-- services.client_offer_sent_at) — blokuje ponowną wysyłkę tego samego linku do czasu regeneracji.
alter table public.contracts
  add column if not exists token_sent_at timestamptz;
