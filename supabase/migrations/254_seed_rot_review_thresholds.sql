-- D33 — dopisanie 3 nowych progow ROT (data kontroli) do istniejacego wiersza policy_thresholds
-- (migracja 238). Merge jsonb, nie nadpisanie - zeby nie zgubic juz ustawionych wartosci.
update app_settings
set data = data || jsonb_build_object(
  'rotReviewBufferDays', 3,
  'rotReviewWaitingClientDays', 7,
  'rotReviewDefaultIntervalDays', 14
),
updated_at = now()
where id = 'policy_thresholds';
