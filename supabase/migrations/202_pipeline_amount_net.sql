-- Wpisy pipeline są kwotami netto (właściciel planuje w netto, nie brutto) -
-- zmiana nazwy kolumny z amount_gross na amount_net dla jasności. Typ i
-- ograniczenia bez zmian.
--
-- Zabezpieczone warunkiem istnienia kolumny — bezpieczne do ponownego
-- uruchomienia, gdyby ta migracja została już wcześniej zastosowana.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'project_revenue_forecasts'
      and column_name = 'amount_gross'
  ) then
    alter table public.project_revenue_forecasts
      rename column amount_gross to amount_net;
  end if;
end $$;

comment on column public.project_revenue_forecasts.amount_net is
  'Kwota netto spodziewanego wpływu (nie brutto) — do prognozy płynności liczonej w netto.';

notify pgrst, 'reload schema';
