-- Stawka VAT przy koszcie ustalenia (netto + VAT → brutto)

alter table public.project_client_agreements
  add column if not exists proposed_cost_vat_rate smallint;

alter table public.project_client_agreements
  drop constraint if exists project_client_agreements_vat_rate_check;

alter table public.project_client_agreements
  add constraint project_client_agreements_vat_rate_check
  check (proposed_cost_vat_rate is null or proposed_cost_vat_rate in (0, 8, 23));
