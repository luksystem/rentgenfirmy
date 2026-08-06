-- Warianty platnosci (np. "Standard 60/30/10" vs "Szybka platnosc 90/10" z rabatem) zamiast
-- pojedynczego plaskiego harmonogramu. payment_schedule -> payment_plans (jsonb ksztalt sie
-- zmienia: lista wariantow, kazdy z wlasnymi ratami), + ktory wariant wybral klient.

alter table public.contracts rename column payment_schedule to payment_plans;
alter table public.contracts add column if not exists selected_payment_plan_id text;

alter table public.contract_templates rename column payment_schedule to payment_plans;

-- Przekonwertuj istniejace plaskie harmonogramy na jeden domyslny wariant "Standard" (bez rabatu),
-- zeby dane sprzed tej migracji (np. juz utworzony szablon/umowy) nie zniknely.
update public.contracts
set payment_plans = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'label', 'Standard',
    'discountPercent', 0,
    'installments', (
      select coalesce(jsonb_agg(item || jsonb_build_object('splitOverMonths', 1)), '[]'::jsonb)
      from jsonb_array_elements(payment_plans) item
    )
  )
)
where jsonb_typeof(payment_plans) = 'array'
  and jsonb_array_length(payment_plans) > 0
  and not (payment_plans -> 0 ? 'installments');

update public.contract_templates
set payment_plans = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'label', 'Standard',
    'discountPercent', 0,
    'installments', (
      select coalesce(jsonb_agg(item || jsonb_build_object('splitOverMonths', 1)), '[]'::jsonb)
      from jsonb_array_elements(payment_plans) item
    )
  )
)
where jsonb_typeof(payment_plans) = 'array'
  and jsonb_array_length(payment_plans) > 0
  and not (payment_plans -> 0 ? 'installments');
