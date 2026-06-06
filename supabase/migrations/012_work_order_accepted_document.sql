-- Kopia zamrożonego PDF zaakceptowanej oferty na zleceniu

alter table public.work_orders
  add column if not exists accepted_offer_document jsonb;
