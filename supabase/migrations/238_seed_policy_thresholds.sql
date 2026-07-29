-- Wyciagniecie stalych zaszytych w kodzie do konfiguracji globalnej (docs/CLAUDE.md, punkt D26
-- "wyciagniecie stalych") - firmowa polityka, niezalezna od projektu/szablonu, wiec app_settings
-- (jak field_options), nie process_stages. Dwie juz uzywane w kodzie (rotStagnationDays,
-- warrantyExpiryNoticeDays) + piec jeszcze niezaimplementowanych (bezpiecznik ciszy, histereza
-- aktywnosci, prog zastepstwa) - seedowane teraz, zanim ktokolwiek napisze kod, ktory by je
-- zaszyl na nowo.
insert into public.app_settings (id, data)
values (
  'policy_thresholds',
  jsonb_build_object(
    'rotStagnationDays', 5,
    'warrantyExpiryNoticeDays', 30,
    'silenceTimeoutInProgressDays', 30,
    'silenceTimeoutHoldDays', 90,
    'silenceWarningDays', 25,
    'activityHysteresisLowDays', 30,
    'activityHysteresisHighDays', 45,
    'substituteRequiredWorkingDays', 2
  )
)
on conflict (id) do nothing;

comment on table public.app_settings is
  'Ustawienia globalne, klucz-wartosc (id + jsonb data). Wiersze m.in.: field_options, '
  'policy_thresholds (Faza 7/D26 - progi/liczby bedace polityka firmy, patrz lib/policy-thresholds/types.ts).';
