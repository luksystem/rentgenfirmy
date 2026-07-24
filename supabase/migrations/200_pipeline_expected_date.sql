-- Pipeline wpływów: przejście z granulacji miesięcznej na dzienną/tygodniową,
-- żeby dało się rozmieszczać spodziewane wpływy w widoku tygodniowym
-- (timesheet). Kolumna nie zmienia typu (nadal `date`) — zmienia się tylko
-- nazwa i znaczenie: był to zawsze pierwszy dzień miesiąca, teraz dowolna
-- konkretna data. Agregacja do prognozy miesięcznej (monthKey()) działa bez
-- zmian, bo obcina dowolną datę do miesiąca.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'project_revenue_forecasts'
      and column_name = 'expected_month'
  ) then
    alter table public.project_revenue_forecasts
      rename column expected_month to expected_date;
  end if;
end $$;

comment on column public.project_revenue_forecasts.expected_date is
  'Konkretna spodziewana data wpływu (nie tylko miesiąc) — pozwala rozmieszczać pozycje w widoku tygodniowym pipeline.';

notify pgrst, 'reload schema';
