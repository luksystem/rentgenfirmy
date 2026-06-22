-- Czas trwania projektu i gwarancja + propozycje przedłużenia

alter table public.projects
  add column if not exists warranty_ends_at date;

alter type public.project_agreement_category add value if not exists 'warranty';

alter table public.project_client_agreements
  add column if not exists proposed_warranty_end_date date;
