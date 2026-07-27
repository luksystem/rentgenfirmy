-- docs/08 D19 §3, §7 — porządkowanie przed fazą 3.
-- 1. "Wygaszony" -> isClosed=true w konfiguracji flow_status (D19 §7, domyka otwarty punkt z D18).
-- 2. Wszystkie projekty ze statusem "Oczekuje" -> "W trakcie". Wartość zostaje w enumie/konfiguracji
--    (nie usuwamy "Oczekuje" z app_settings.field_options) — znika tylko z listy wyboru w UI
--    (components/project-form.tsx), żeby dało się jeszcze odczytać historyczne dane, gdyby się gdzieś
--    zachowały, i żeby dodanie kolejnego statusu było update'em konfiguracji, nie migracją schematu.

update public.app_settings
set data = jsonb_set(
  data,
  '{flowStatuses}',
  (
    select jsonb_agg(
      case when elem ->> 'name' = 'Wygaszony' then elem || jsonb_build_object('isClosed', true)
      else elem end
    )
    from jsonb_array_elements(data -> 'flowStatuses') elem
  )
)
where id = 'field_options';

do $$
declare
  v_expected int;
  v_updated int;
begin
  select count(*) into v_expected from public.projects where flow_status = 'Oczekuje';

  update public.projects
    set flow_status = 'W trakcie', last_changed_at = now()
    where flow_status = 'Oczekuje';

  get diagnostics v_updated = row_count;

  if v_updated <> v_expected then
    raise exception 'Przestawienie Oczekuje->W trakcie: oczekiwano %, zmieniono %.', v_expected, v_updated;
  end if;

  raise notice 'Przestawiono % projektów z Oczekuje na W trakcie.', v_updated;
end $$;
