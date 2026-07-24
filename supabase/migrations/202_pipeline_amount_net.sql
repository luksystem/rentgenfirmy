-- Wpisy pipeline są kwotami netto (właściciel planuje w netto, nie brutto) -
-- zmiana nazwy kolumny z amount_gross na amount_net dla jasności. Typ i
-- ograniczenia bez zmian.

alter table public.project_revenue_forecasts
  rename column amount_gross to amount_net;

comment on column public.project_revenue_forecasts.amount_net is
  'Kwota netto spodziewanego wpływu (nie brutto) — do prognozy płynności liczonej w netto.';

notify pgrst, 'reload schema';
