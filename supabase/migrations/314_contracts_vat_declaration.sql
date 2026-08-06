-- Deklaracja rozliczenia VAT wybierana przez klienta przy podpisie (typ platnika, budynek/lokal +
-- powierzchnia dla osoby prywatnej, % kwoty rozliczany jako "inne").
alter table public.contracts
  add column if not exists vat_declaration jsonb;
