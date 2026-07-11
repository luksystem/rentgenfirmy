-- Oferty: typ wyceny (stawki godzinowe vs fixed price) + tabele pozycji

alter table public.services
  add column if not exists pricing_model text not null default 'hourly'
    check (pricing_model in ('hourly', 'fixed_price')),
  add column if not exists fixed_price_tables jsonb not null default '[]'::jsonb;

comment on column public.services.pricing_model is 'hourly = stawki i rozliczenie; fixed_price = tabele pozycji bez rozliczenia godzinowego';
comment on column public.services.fixed_price_tables is 'Tabele pozycji fixed price (ServiceFixedPriceTable[])';
