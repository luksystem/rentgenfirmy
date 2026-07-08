-- SRI seed — czesc 3/8 (wygenerowana przez store/sri/_split_seed.py)
-- Uruchom PO migracji 096_sri_catalogue.sql, po kolei: 01, 02, ...
-- Idempotentny (ON CONFLICT DO NOTHING) — mozna uruchomic ponownie bezpiecznie.

do $$
declare
  v_mid uuid;
  v_cat uuid;
begin
  select id into v_mid from public.sri_methodology_versions where code = 'eu-2020-2155-v1';
  select id into v_cat from public.sri_catalogues where methodology_version_id = v_mid and code = 'eu-method-b-2020-v4.5';
  if v_mid is null or v_cat is null then
    raise exception 'Brak metodologii/katalogu — uruchom najpierw migracje 096.';
  end if;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('9ddbec87-4b80-57a5-96a4-c7995474a414', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='cooling'), 'C-1g', 'C-06', 21, '{"en": "Control of Thermal Energy Storage (TES) operation", "pl": "Sterowanie magazynem energii cieplnej (chłodzenie)"}'::jsonb, 'Cooling control - demand side', '{"en": "Ice/water TES charging for load shifting."}'::jsonb, '{"en": "When cooling thermal storage is installed."}'::jsonb, '{"Ice storage controllers","TES tanks"}', 'Only applicable in case mechanical cooling systems are present ánd include TES systems', 3, false, true, false, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('23b0e0cb-cfd9-5302-bd8b-4a174eb161d2', '9ddbec87-4b80-57a5-96a4-c7995474a414', 0, '{"en": "Continuous storage operation"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('3d7add58-8d47-5045-86a4-999147a61665', '9ddbec87-4b80-57a5-96a4-c7995474a414', 1, '{"en": "Time-scheduled storage operation"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('aa0fe068-d70c-5909-a882-9bff76a392a2', '9ddbec87-4b80-57a5-96a4-c7995474a414', 2, '{"en": "Load prediction based storage operation"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('0570ec0f-877b-5262-8aa7-21588d7e3ebe', '9ddbec87-4b80-57a5-96a4-c7995474a414', 3, '{"en": "Cold storage capable of flexible control through grid signals (e.g. DSM)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('23b0e0cb-cfd9-5302-bd8b-4a174eb161d2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('23b0e0cb-cfd9-5302-bd8b-4a174eb161d2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('23b0e0cb-cfd9-5302-bd8b-4a174eb161d2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('23b0e0cb-cfd9-5302-bd8b-4a174eb161d2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('23b0e0cb-cfd9-5302-bd8b-4a174eb161d2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('23b0e0cb-cfd9-5302-bd8b-4a174eb161d2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('23b0e0cb-cfd9-5302-bd8b-4a174eb161d2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3d7add58-8d47-5045-86a4-999147a61665', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3d7add58-8d47-5045-86a4-999147a61665', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3d7add58-8d47-5045-86a4-999147a61665', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3d7add58-8d47-5045-86a4-999147a61665', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3d7add58-8d47-5045-86a4-999147a61665', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3d7add58-8d47-5045-86a4-999147a61665', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3d7add58-8d47-5045-86a4-999147a61665', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('aa0fe068-d70c-5909-a882-9bff76a392a2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('aa0fe068-d70c-5909-a882-9bff76a392a2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('aa0fe068-d70c-5909-a882-9bff76a392a2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('aa0fe068-d70c-5909-a882-9bff76a392a2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('aa0fe068-d70c-5909-a882-9bff76a392a2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('aa0fe068-d70c-5909-a882-9bff76a392a2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('aa0fe068-d70c-5909-a882-9bff76a392a2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0570ec0f-877b-5262-8aa7-21588d7e3ebe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0570ec0f-877b-5262-8aa7-21588d7e3ebe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0570ec0f-877b-5262-8aa7-21588d7e3ebe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0570ec0f-877b-5262-8aa7-21588d7e3ebe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0570ec0f-877b-5262-8aa7-21588d7e3ebe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0570ec0f-877b-5262-8aa7-21588d7e3ebe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0570ec0f-877b-5262-8aa7-21588d7e3ebe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('6947f556-7cd3-5ffa-ac6d-52e158cc77a3', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='cooling'), 'C-2a', 'C-07', 22, '{"en": "Generator control for cooling", "pl": "Blokada jednoczesnego ogrzewania i chłodzenia w strefach"}'::jsonb, 'Control cooling production facilities', '{"en": "Avoid energy waste from concurrent heating/cooling."}'::jsonb, '{"en": "When both heating and cooling can serve same zones."}'::jsonb, '{"BMS interlocks","Four-pipe system logic"}', 'Only applicable in case mechanical cooling systems are present', 3, true, true, true, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('6dd2e6e4-a74a-57f7-8e58-cefbff468525', '6947f556-7cd3-5ffa-ac6d-52e158cc77a3', 0, '{"en": "On/Off-control of cooling production"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('6a431219-53c1-5dda-b9d0-a7281ca3d471', '6947f556-7cd3-5ffa-ac6d-52e158cc77a3', 1, '{"en": "Multi-stage control of  cooling production capacity depending on the load or demand (e.g. on/off of several compressors)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('00a5b401-7ba4-5c1c-a32a-1aca0511c0c6', '6947f556-7cd3-5ffa-ac6d-52e158cc77a3', 2, '{"en": "Variable control of  cooling production capacity depending on the load or demand (e.g. hot gas bypass, inverter frequency control)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('6496e73f-3a26-5d97-8e5e-ba44bfb634e6', '6947f556-7cd3-5ffa-ac6d-52e158cc77a3', 3, '{"en": "Variable control of  cooling production capacity depending on the load AND external signals from grid"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6dd2e6e4-a74a-57f7-8e58-cefbff468525', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6dd2e6e4-a74a-57f7-8e58-cefbff468525', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6dd2e6e4-a74a-57f7-8e58-cefbff468525', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6dd2e6e4-a74a-57f7-8e58-cefbff468525', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6dd2e6e4-a74a-57f7-8e58-cefbff468525', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6dd2e6e4-a74a-57f7-8e58-cefbff468525', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6dd2e6e4-a74a-57f7-8e58-cefbff468525', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6a431219-53c1-5dda-b9d0-a7281ca3d471', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6a431219-53c1-5dda-b9d0-a7281ca3d471', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6a431219-53c1-5dda-b9d0-a7281ca3d471', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6a431219-53c1-5dda-b9d0-a7281ca3d471', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6a431219-53c1-5dda-b9d0-a7281ca3d471', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6a431219-53c1-5dda-b9d0-a7281ca3d471', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6a431219-53c1-5dda-b9d0-a7281ca3d471', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('00a5b401-7ba4-5c1c-a32a-1aca0511c0c6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('00a5b401-7ba4-5c1c-a32a-1aca0511c0c6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('00a5b401-7ba4-5c1c-a32a-1aca0511c0c6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('00a5b401-7ba4-5c1c-a32a-1aca0511c0c6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('00a5b401-7ba4-5c1c-a32a-1aca0511c0c6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('00a5b401-7ba4-5c1c-a32a-1aca0511c0c6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('00a5b401-7ba4-5c1c-a32a-1aca0511c0c6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6496e73f-3a26-5d97-8e5e-ba44bfb634e6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6496e73f-3a26-5d97-8e5e-ba44bfb634e6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6496e73f-3a26-5d97-8e5e-ba44bfb634e6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6496e73f-3a26-5d97-8e5e-ba44bfb634e6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6496e73f-3a26-5d97-8e5e-ba44bfb634e6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6496e73f-3a26-5d97-8e5e-ba44bfb634e6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6496e73f-3a26-5d97-8e5e-ba44bfb634e6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('d0b5b62d-4e44-588b-b1e3-1fd5808eb952', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='cooling'), 'C-2b', 'C-08', 23, '{"en": "Sequencing of different cooling generators", "pl": "Sekwencjonowanie wielu źródeł chłodu"}'::jsonb, 'Control cooling production facilities', '{"en": "Switch between chillers, free cooling, etc."}'::jsonb, '{"en": "When multiple cooling sources exist."}'::jsonb, '{"Chiller sequencing controllers"}', 'Only applicable in case multiple mechanical cooling systems are present', 4, false, true, false, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('97f66ab1-05cb-5287-a7bf-bed917e54d16', 'd0b5b62d-4e44-588b-b1e3-1fd5808eb952', 0, '{"en": "Priorities only based on running times"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('5b1be0d6-735f-513e-b2db-aecaeed98671', 'd0b5b62d-4e44-588b-b1e3-1fd5808eb952', 1, '{"en": "Fixed sequencing based on loads only: e.g. depending on the generators characteristics such as absorption chiller vs. centrifugal chiller"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('e824fdeb-ff53-5345-ab20-360691d1f23d', 'd0b5b62d-4e44-588b-b1e3-1fd5808eb952', 2, '{"en": "Dynamic priorities based on generator efficiency and characteristics (e.g. availability of free cooling)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('e88af631-7bc2-5262-8248-4002fe2322fc', 'd0b5b62d-4e44-588b-b1e3-1fd5808eb952', 3, '{"en": "Load prediction based sequencing: the sequence is based on e.g. COP and available power of a device and the predicted required power"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('0d7068fc-a1a6-514d-b7bc-af5936085ee2', 'd0b5b62d-4e44-588b-b1e3-1fd5808eb952', 4, '{"en": "Sequencing based on dynamic priority list, including external signals from grid"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('97f66ab1-05cb-5287-a7bf-bed917e54d16', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('97f66ab1-05cb-5287-a7bf-bed917e54d16', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('97f66ab1-05cb-5287-a7bf-bed917e54d16', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('97f66ab1-05cb-5287-a7bf-bed917e54d16', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('97f66ab1-05cb-5287-a7bf-bed917e54d16', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('97f66ab1-05cb-5287-a7bf-bed917e54d16', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('97f66ab1-05cb-5287-a7bf-bed917e54d16', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5b1be0d6-735f-513e-b2db-aecaeed98671', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5b1be0d6-735f-513e-b2db-aecaeed98671', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5b1be0d6-735f-513e-b2db-aecaeed98671', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5b1be0d6-735f-513e-b2db-aecaeed98671', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5b1be0d6-735f-513e-b2db-aecaeed98671', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5b1be0d6-735f-513e-b2db-aecaeed98671', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5b1be0d6-735f-513e-b2db-aecaeed98671', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e824fdeb-ff53-5345-ab20-360691d1f23d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e824fdeb-ff53-5345-ab20-360691d1f23d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e824fdeb-ff53-5345-ab20-360691d1f23d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e824fdeb-ff53-5345-ab20-360691d1f23d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e824fdeb-ff53-5345-ab20-360691d1f23d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e824fdeb-ff53-5345-ab20-360691d1f23d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e824fdeb-ff53-5345-ab20-360691d1f23d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e88af631-7bc2-5262-8248-4002fe2322fc', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e88af631-7bc2-5262-8248-4002fe2322fc', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e88af631-7bc2-5262-8248-4002fe2322fc', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e88af631-7bc2-5262-8248-4002fe2322fc', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e88af631-7bc2-5262-8248-4002fe2322fc', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e88af631-7bc2-5262-8248-4002fe2322fc', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e88af631-7bc2-5262-8248-4002fe2322fc', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0d7068fc-a1a6-514d-b7bc-af5936085ee2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0d7068fc-a1a6-514d-b7bc-af5936085ee2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0d7068fc-a1a6-514d-b7bc-af5936085ee2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0d7068fc-a1a6-514d-b7bc-af5936085ee2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0d7068fc-a1a6-514d-b7bc-af5936085ee2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0d7068fc-a1a6-514d-b7bc-af5936085ee2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0d7068fc-a1a6-514d-b7bc-af5936085ee2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('1e62e261-9aea-5cb9-8c08-bce34de4e008', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='cooling'), 'C-3', 'C-09', 24, '{"en": "Report information regarding cooling system performance", "pl": "Elastyczność sterowania chłodzeniem"}'::jsonb, 'Information to occupants and facility managers', '{"en": "Time-shift or remote cooling for DSM/grid signals."}'::jsonb, '{"en": "When cooling participates in demand response."}'::jsonb, '{"BMS DSM","Smart AC interfaces"}', 'Only applicable in case mechanical cooling systems are present', 4, true, true, true, 'smart_ready', null, '{"DG ENER Technical Study 2020"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('a90644fd-cff0-53a9-9eef-c15cdf4adf76', '1e62e261-9aea-5cb9-8c08-bce34de4e008', 0, '{"en": "None"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('d97a0d65-0cc4-525d-bddc-e4636bc7b40a', '1e62e261-9aea-5cb9-8c08-bce34de4e008', 1, '{"en": "Central or remote reporting of current performance KPIs (e.g. temperatures, submetering energy usage)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('c6f66193-6bf8-5e74-a818-50757edab360', '1e62e261-9aea-5cb9-8c08-bce34de4e008', 2, '{"en": "Central or remote reporting of current performance KPIs and historical data"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('541d7817-23e9-5c9d-a075-a58039e4fd1d', '1e62e261-9aea-5cb9-8c08-bce34de4e008', 3, '{"en": "Central or remote reporting of performance evaluation including forecasting and/or benchmarking"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('2038441a-7714-57da-bd55-1e414e783a2a', '1e62e261-9aea-5cb9-8c08-bce34de4e008', 4, '{"en": "Central or remote reporting of performance evaluation including forecasting and/or benchmarking; also including predictive management and fault detection"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a90644fd-cff0-53a9-9eef-c15cdf4adf76', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a90644fd-cff0-53a9-9eef-c15cdf4adf76', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a90644fd-cff0-53a9-9eef-c15cdf4adf76', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a90644fd-cff0-53a9-9eef-c15cdf4adf76', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a90644fd-cff0-53a9-9eef-c15cdf4adf76', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a90644fd-cff0-53a9-9eef-c15cdf4adf76', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a90644fd-cff0-53a9-9eef-c15cdf4adf76', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d97a0d65-0cc4-525d-bddc-e4636bc7b40a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d97a0d65-0cc4-525d-bddc-e4636bc7b40a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d97a0d65-0cc4-525d-bddc-e4636bc7b40a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d97a0d65-0cc4-525d-bddc-e4636bc7b40a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d97a0d65-0cc4-525d-bddc-e4636bc7b40a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d97a0d65-0cc4-525d-bddc-e4636bc7b40a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d97a0d65-0cc4-525d-bddc-e4636bc7b40a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c6f66193-6bf8-5e74-a818-50757edab360', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c6f66193-6bf8-5e74-a818-50757edab360', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c6f66193-6bf8-5e74-a818-50757edab360', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c6f66193-6bf8-5e74-a818-50757edab360', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c6f66193-6bf8-5e74-a818-50757edab360', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c6f66193-6bf8-5e74-a818-50757edab360', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c6f66193-6bf8-5e74-a818-50757edab360', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('541d7817-23e9-5c9d-a075-a58039e4fd1d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('541d7817-23e9-5c9d-a075-a58039e4fd1d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('541d7817-23e9-5c9d-a075-a58039e4fd1d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('541d7817-23e9-5c9d-a075-a58039e4fd1d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('541d7817-23e9-5c9d-a075-a58039e4fd1d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('541d7817-23e9-5c9d-a075-a58039e4fd1d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('541d7817-23e9-5c9d-a075-a58039e4fd1d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2038441a-7714-57da-bd55-1e414e783a2a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2038441a-7714-57da-bd55-1e414e783a2a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2038441a-7714-57da-bd55-1e414e783a2a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2038441a-7714-57da-bd55-1e414e783a2a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2038441a-7714-57da-bd55-1e414e783a2a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2038441a-7714-57da-bd55-1e414e783a2a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2038441a-7714-57da-bd55-1e414e783a2a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('8da88e3e-b340-53b9-aea5-69a155d87a3e', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='cooling'), 'C-4', 'C-10', 25, '{"en": "Flexibility and grid interaction", "pl": "Raportowanie informacji o pracy chłodzenia"}'::jsonb, 'Flexibility and grid interaction', '{"en": "Inform users about cooling operation and efficiency."}'::jsonb, '{"en": "When cooling systems exist."}'::jsonb, '{"BMS dashboards","Monitoring portals"}', 'The inspectability of the nature of the control algorithm would need to be facilitated', 4, true, true, true, 'smart_ready', null, '{"DG ENER Technical Study 2020"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('f6132f7f-ad5d-5b3d-a4ba-fe403e75c045', '8da88e3e-b340-53b9-aea5-69a155d87a3e', 0, '{"en": "No automatic control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('6f57a3bb-d35f-5e0e-a59a-3285b38cffda', '8da88e3e-b340-53b9-aea5-69a155d87a3e', 1, '{"en": "Scheduled operation of cooling system"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('2f45682f-9903-526a-be13-eeff51b4430c', '8da88e3e-b340-53b9-aea5-69a155d87a3e', 2, '{"en": "Self-learning optimal control of cooling system"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('6a9e9523-4d98-5824-b407-5acd6b056c36', '8da88e3e-b340-53b9-aea5-69a155d87a3e', 3, '{"en": "Cooling system capable of flexible control through grid signals (e.g. DSM)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('9428dc73-eddb-5783-9b26-5034cca38e0c', '8da88e3e-b340-53b9-aea5-69a155d87a3e', 4, '{"en": "Optimized control of  cooling system based on local predictions and grid signals (e.g. through model predictive control)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f6132f7f-ad5d-5b3d-a4ba-fe403e75c045', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f6132f7f-ad5d-5b3d-a4ba-fe403e75c045', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f6132f7f-ad5d-5b3d-a4ba-fe403e75c045', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f6132f7f-ad5d-5b3d-a4ba-fe403e75c045', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f6132f7f-ad5d-5b3d-a4ba-fe403e75c045', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f6132f7f-ad5d-5b3d-a4ba-fe403e75c045', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f6132f7f-ad5d-5b3d-a4ba-fe403e75c045', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6f57a3bb-d35f-5e0e-a59a-3285b38cffda', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6f57a3bb-d35f-5e0e-a59a-3285b38cffda', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6f57a3bb-d35f-5e0e-a59a-3285b38cffda', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6f57a3bb-d35f-5e0e-a59a-3285b38cffda', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6f57a3bb-d35f-5e0e-a59a-3285b38cffda', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6f57a3bb-d35f-5e0e-a59a-3285b38cffda', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6f57a3bb-d35f-5e0e-a59a-3285b38cffda', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2f45682f-9903-526a-be13-eeff51b4430c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2f45682f-9903-526a-be13-eeff51b4430c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2f45682f-9903-526a-be13-eeff51b4430c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2f45682f-9903-526a-be13-eeff51b4430c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2f45682f-9903-526a-be13-eeff51b4430c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2f45682f-9903-526a-be13-eeff51b4430c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2f45682f-9903-526a-be13-eeff51b4430c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6a9e9523-4d98-5824-b407-5acd6b056c36', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6a9e9523-4d98-5824-b407-5acd6b056c36', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6a9e9523-4d98-5824-b407-5acd6b056c36', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6a9e9523-4d98-5824-b407-5acd6b056c36', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6a9e9523-4d98-5824-b407-5acd6b056c36', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6a9e9523-4d98-5824-b407-5acd6b056c36', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6a9e9523-4d98-5824-b407-5acd6b056c36', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9428dc73-eddb-5783-9b26-5034cca38e0c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9428dc73-eddb-5783-9b26-5034cca38e0c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9428dc73-eddb-5783-9b26-5034cca38e0c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9428dc73-eddb-5783-9b26-5034cca38e0c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9428dc73-eddb-5783-9b26-5034cca38e0c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9428dc73-eddb-5783-9b26-5034cca38e0c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9428dc73-eddb-5783-9b26-5034cca38e0c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('fd57b421-035a-5e12-94db-abcbbcbef610', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='ventilation'), 'V-1a', 'V-01', 26, '{"en": "Supply air flow control at the room level", "pl": "Sterowanie przepływem powietrza nawiewanego w pomieszczeniu"}'::jsonb, 'Air flow control', '{"en": "Adjust ventilation flow per room based on need."}'::jsonb, '{"en": "When room-level VAV or similar exists."}'::jsonb, '{"VAV boxes","Room dampers","DCV valves"}', 'Always to be assessed', 4, true, true, true, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('7648de36-f6a6-56bd-802d-304a47ece065', 'fd57b421-035a-5e12-94db-abcbbcbef610', 0, '{"en": "No ventilation system or manual control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('f7ffa5d7-ddb7-5e5b-824f-666233025cca', 'fd57b421-035a-5e12-94db-abcbbcbef610', 1, '{"en": "Clock control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('e77f911f-4764-5d4d-a799-c1e4702bc969', 'fd57b421-035a-5e12-94db-abcbbcbef610', 2, '{"en": "Occupancy detection control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('84871889-c5f5-5750-9694-4e9ea6356878', 'fd57b421-035a-5e12-94db-abcbbcbef610', 3, '{"en": "Central Demand Control based on air quality sensors (CO2, VOC, humidity, ...)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('86b29343-4f83-5dd4-909f-72ac976d02e9', 'fd57b421-035a-5e12-94db-abcbbcbef610', 4, '{"en": "Local Demand Control based on air quality sensors (CO2, VOC,...) with local flow from/to the zone regulated by dampers"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7648de36-f6a6-56bd-802d-304a47ece065', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7648de36-f6a6-56bd-802d-304a47ece065', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7648de36-f6a6-56bd-802d-304a47ece065', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7648de36-f6a6-56bd-802d-304a47ece065', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7648de36-f6a6-56bd-802d-304a47ece065', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7648de36-f6a6-56bd-802d-304a47ece065', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7648de36-f6a6-56bd-802d-304a47ece065', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f7ffa5d7-ddb7-5e5b-824f-666233025cca', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f7ffa5d7-ddb7-5e5b-824f-666233025cca', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f7ffa5d7-ddb7-5e5b-824f-666233025cca', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f7ffa5d7-ddb7-5e5b-824f-666233025cca', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f7ffa5d7-ddb7-5e5b-824f-666233025cca', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f7ffa5d7-ddb7-5e5b-824f-666233025cca', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f7ffa5d7-ddb7-5e5b-824f-666233025cca', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e77f911f-4764-5d4d-a799-c1e4702bc969', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e77f911f-4764-5d4d-a799-c1e4702bc969', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e77f911f-4764-5d4d-a799-c1e4702bc969', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e77f911f-4764-5d4d-a799-c1e4702bc969', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e77f911f-4764-5d4d-a799-c1e4702bc969', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e77f911f-4764-5d4d-a799-c1e4702bc969', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e77f911f-4764-5d4d-a799-c1e4702bc969', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('84871889-c5f5-5750-9694-4e9ea6356878', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('84871889-c5f5-5750-9694-4e9ea6356878', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('84871889-c5f5-5750-9694-4e9ea6356878', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('84871889-c5f5-5750-9694-4e9ea6356878', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('84871889-c5f5-5750-9694-4e9ea6356878', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('84871889-c5f5-5750-9694-4e9ea6356878', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('84871889-c5f5-5750-9694-4e9ea6356878', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('86b29343-4f83-5dd4-909f-72ac976d02e9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('86b29343-4f83-5dd4-909f-72ac976d02e9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('86b29343-4f83-5dd4-909f-72ac976d02e9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('86b29343-4f83-5dd4-909f-72ac976d02e9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('86b29343-4f83-5dd4-909f-72ac976d02e9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('86b29343-4f83-5dd4-909f-72ac976d02e9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('86b29343-4f83-5dd4-909f-72ac976d02e9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('bfa84167-b470-549b-a3df-05b9cc88ef3a', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='ventilation'), 'V-1c', 'V-02', 27, '{"en": "Air flow or pressure control at the air handler level", "pl": "Sterowanie przepływem/ciśnieniem na poziomie centrali wentylacyjnej"}'::jsonb, 'Air flow control', '{"en": "Optimize AHU fan and duct pressure."}'::jsonb, '{"en": "When central AHU serves building."}'::jsonb, '{"AHU controllers","VSD fans","Pressure sensors"}', 'Only in case of mechanical ventilation', 4, false, true, false, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('17f0fa0f-2f8f-533d-a67b-7329668cdcc2', 'bfa84167-b470-549b-a3df-05b9cc88ef3a', 0, '{"en": "No automatic control: Continuously supplies of air flow for a maximum load of all rooms"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('cc15b489-e476-586e-82ae-70a407036ead', 'bfa84167-b470-549b-a3df-05b9cc88ef3a', 1, '{"en": "On off time control: Continuously supplies of air flow for a maximum load of all rooms during nominal occupancy time"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('84318220-e09d-5505-a80b-fd98f5e547f0', 'bfa84167-b470-549b-a3df-05b9cc88ef3a', 2, '{"en": "Multi-stage control: To reduce the auxiliary energy demand of the fan"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('47debe9e-023d-573c-b86d-bc2bf1645ad2', 'bfa84167-b470-549b-a3df-05b9cc88ef3a', 3, '{"en": "Automatic flow or pressure control without pressure reset: Load dependent supplies of air flow for the demand of all connected rooms."}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('e06aeb69-7191-5ca4-8b12-6829e98a11c3', 'bfa84167-b470-549b-a3df-05b9cc88ef3a', 4, '{"en": "Automatic flow or pressure control with pressure reset: Load dependent supplies of air flow for the demand of all connected rooms (for variable air volume systems with VFD)."}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('17f0fa0f-2f8f-533d-a67b-7329668cdcc2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('17f0fa0f-2f8f-533d-a67b-7329668cdcc2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('17f0fa0f-2f8f-533d-a67b-7329668cdcc2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('17f0fa0f-2f8f-533d-a67b-7329668cdcc2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('17f0fa0f-2f8f-533d-a67b-7329668cdcc2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('17f0fa0f-2f8f-533d-a67b-7329668cdcc2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('17f0fa0f-2f8f-533d-a67b-7329668cdcc2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cc15b489-e476-586e-82ae-70a407036ead', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cc15b489-e476-586e-82ae-70a407036ead', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cc15b489-e476-586e-82ae-70a407036ead', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cc15b489-e476-586e-82ae-70a407036ead', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cc15b489-e476-586e-82ae-70a407036ead', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cc15b489-e476-586e-82ae-70a407036ead', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cc15b489-e476-586e-82ae-70a407036ead', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('84318220-e09d-5505-a80b-fd98f5e547f0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('84318220-e09d-5505-a80b-fd98f5e547f0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('84318220-e09d-5505-a80b-fd98f5e547f0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('84318220-e09d-5505-a80b-fd98f5e547f0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('84318220-e09d-5505-a80b-fd98f5e547f0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('84318220-e09d-5505-a80b-fd98f5e547f0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('84318220-e09d-5505-a80b-fd98f5e547f0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('47debe9e-023d-573c-b86d-bc2bf1645ad2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('47debe9e-023d-573c-b86d-bc2bf1645ad2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('47debe9e-023d-573c-b86d-bc2bf1645ad2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('47debe9e-023d-573c-b86d-bc2bf1645ad2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('47debe9e-023d-573c-b86d-bc2bf1645ad2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('47debe9e-023d-573c-b86d-bc2bf1645ad2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('47debe9e-023d-573c-b86d-bc2bf1645ad2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e06aeb69-7191-5ca4-8b12-6829e98a11c3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e06aeb69-7191-5ca4-8b12-6829e98a11c3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e06aeb69-7191-5ca4-8b12-6829e98a11c3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e06aeb69-7191-5ca4-8b12-6829e98a11c3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e06aeb69-7191-5ca4-8b12-6829e98a11c3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e06aeb69-7191-5ca4-8b12-6829e98a11c3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e06aeb69-7191-5ca4-8b12-6829e98a11c3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('da1eee93-634e-59b1-8ad7-319e8f3e1b69', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='ventilation'), 'V-2c', 'V-03', 28, '{"en": "Heat recovery control:\nprevention of overheating", "pl": "Sterowanie odzyskiem ciepła: zapobieganie przegrzewaniu"}'::jsonb, 'Air temperature control', '{"en": "Protect heat recovery from summer overheating bypass."}'::jsonb, '{"en": "When HRU is installed."}'::jsonb, '{"Rotary/plate HRU controllers","Bypass dampers"}', 'Only in case of mechanical ventilation with heat recovery', 2, false, true, false, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('2b0f1794-f3c0-5671-b22c-af773183e9af', 'da1eee93-634e-59b1-8ad7-319e8f3e1b69', 0, '{"en": "Without overheating control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('1d7f7919-a68a-5585-9369-2415a916f4a4', 'da1eee93-634e-59b1-8ad7-319e8f3e1b69', 1, '{"en": "Modulate or bypass heat recovery based on sensors in air exhaust"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('84be3e9a-a5ce-57ae-966f-982a0444fc5b', 'da1eee93-634e-59b1-8ad7-319e8f3e1b69', 2, '{"en": "Modulate or bypass heat recovery based on multiple room temperature sensors or predictive control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2b0f1794-f3c0-5671-b22c-af773183e9af', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2b0f1794-f3c0-5671-b22c-af773183e9af', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2b0f1794-f3c0-5671-b22c-af773183e9af', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2b0f1794-f3c0-5671-b22c-af773183e9af', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2b0f1794-f3c0-5671-b22c-af773183e9af', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2b0f1794-f3c0-5671-b22c-af773183e9af', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2b0f1794-f3c0-5671-b22c-af773183e9af', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('1d7f7919-a68a-5585-9369-2415a916f4a4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('1d7f7919-a68a-5585-9369-2415a916f4a4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('1d7f7919-a68a-5585-9369-2415a916f4a4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('1d7f7919-a68a-5585-9369-2415a916f4a4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('1d7f7919-a68a-5585-9369-2415a916f4a4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('1d7f7919-a68a-5585-9369-2415a916f4a4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('1d7f7919-a68a-5585-9369-2415a916f4a4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('84be3e9a-a5ce-57ae-966f-982a0444fc5b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('84be3e9a-a5ce-57ae-966f-982a0444fc5b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('84be3e9a-a5ce-57ae-966f-982a0444fc5b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('84be3e9a-a5ce-57ae-966f-982a0444fc5b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('84be3e9a-a5ce-57ae-966f-982a0444fc5b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('84be3e9a-a5ce-57ae-966f-982a0444fc5b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('84be3e9a-a5ce-57ae-966f-982a0444fc5b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('1bbe3e52-4f90-5291-ab95-b57215dbc40d', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='ventilation'), 'V-2d', 'V-04', 29, '{"en": "Supply air temperature control at the air handling unit level", "pl": "Sterowanie temperaturą powietrza nawiewanego w centrali"}'::jsonb, 'Air temperature control', '{"en": "Condition supply air temperature efficiently."}'::jsonb, '{"en": "When AHU includes heating/cooling coils."}'::jsonb, '{"AHU coil controllers","Mixing dampers"}', 'Only in case of mechanical ventilation which supplies heating', 3, false, true, false, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('d17d9090-f754-5ac9-a6cc-3b389795da40', '1bbe3e52-4f90-5291-ab95-b57215dbc40d', 0, '{"en": "No automatic control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('a5e642df-aeba-52d1-a4aa-7cbdc12456fc', '1bbe3e52-4f90-5291-ab95-b57215dbc40d', 1, '{"en": "Constant setpoint: A control loop enables to control the supply air_x000D_\ntemperature, the setpoint is constant and can only be modified by a manual_x000D_\naction"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('f4da8799-49b7-5c8e-b094-fcf1e48a00db', '1bbe3e52-4f90-5291-ab95-b57215dbc40d', 2, '{"en": "Variable set point with outdoor temperature compensation"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('083c3830-54a2-5f04-88c0-af392c618697', '1bbe3e52-4f90-5291-ab95-b57215dbc40d', 3, '{"en": "Variable set point with load dependant compensation. A control loop enables to control the supply air temperature. The setpoint is defined as a function of the loads in the room"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d17d9090-f754-5ac9-a6cc-3b389795da40', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d17d9090-f754-5ac9-a6cc-3b389795da40', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d17d9090-f754-5ac9-a6cc-3b389795da40', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d17d9090-f754-5ac9-a6cc-3b389795da40', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d17d9090-f754-5ac9-a6cc-3b389795da40', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d17d9090-f754-5ac9-a6cc-3b389795da40', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d17d9090-f754-5ac9-a6cc-3b389795da40', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a5e642df-aeba-52d1-a4aa-7cbdc12456fc', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a5e642df-aeba-52d1-a4aa-7cbdc12456fc', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a5e642df-aeba-52d1-a4aa-7cbdc12456fc', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a5e642df-aeba-52d1-a4aa-7cbdc12456fc', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a5e642df-aeba-52d1-a4aa-7cbdc12456fc', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a5e642df-aeba-52d1-a4aa-7cbdc12456fc', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a5e642df-aeba-52d1-a4aa-7cbdc12456fc', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f4da8799-49b7-5c8e-b094-fcf1e48a00db', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f4da8799-49b7-5c8e-b094-fcf1e48a00db', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f4da8799-49b7-5c8e-b094-fcf1e48a00db', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f4da8799-49b7-5c8e-b094-fcf1e48a00db', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f4da8799-49b7-5c8e-b094-fcf1e48a00db', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f4da8799-49b7-5c8e-b094-fcf1e48a00db', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f4da8799-49b7-5c8e-b094-fcf1e48a00db', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('083c3830-54a2-5f04-88c0-af392c618697', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('083c3830-54a2-5f04-88c0-af392c618697', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('083c3830-54a2-5f04-88c0-af392c618697', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('083c3830-54a2-5f04-88c0-af392c618697', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('083c3830-54a2-5f04-88c0-af392c618697', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('083c3830-54a2-5f04-88c0-af392c618697', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('083c3830-54a2-5f04-88c0-af392c618697', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('976ac096-29ac-552e-95dc-645fad2c0cae', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='ventilation'), 'V-3', 'V-05', 30, '{"en": "Free cooling with mechanical ventilation system", "pl": "Free cooling z wykorzystaniem mechanicznej wentylacji"}'::jsonb, 'Free cooling', '{"en": "Use outdoor air for cooling when conditions allow."}'::jsonb, '{"en": "When AHU supports economizer/free cooling."}'::jsonb, '{"Economizer controls","Mixed-air dampers"}', 'Only in case of mechanical or hybrid ventilation', 3, false, true, false, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('e136e14a-ed13-5658-9428-eec482fa58ba', '976ac096-29ac-552e-95dc-645fad2c0cae', 0, '{"en": "No automatic control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('e8465c82-c12d-5c47-999b-a8d3744d12de', '976ac096-29ac-552e-95dc-645fad2c0cae', 1, '{"en": "Night cooling"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('e709ad5e-0188-5df6-99ed-ed666f5e09e7', '976ac096-29ac-552e-95dc-645fad2c0cae', 2, '{"en": "Free cooling: air flows modulated during all periods of time to minimize the amount of mechanical_x000D_\ncooling"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('512aa856-252e-598d-96c7-b76c72d8ea8b', '976ac096-29ac-552e-95dc-645fad2c0cae', 3, '{"en": "H,x- directed control: The amount of outside air and recirculation air are modulated during all periods of time to minimize the amount of mechanical cooling. Calculation is performed on the basis of temperatures and humidity\n(enthalpy)."}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e136e14a-ed13-5658-9428-eec482fa58ba', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e136e14a-ed13-5658-9428-eec482fa58ba', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e136e14a-ed13-5658-9428-eec482fa58ba', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e136e14a-ed13-5658-9428-eec482fa58ba', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e136e14a-ed13-5658-9428-eec482fa58ba', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e136e14a-ed13-5658-9428-eec482fa58ba', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e136e14a-ed13-5658-9428-eec482fa58ba', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e8465c82-c12d-5c47-999b-a8d3744d12de', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e8465c82-c12d-5c47-999b-a8d3744d12de', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e8465c82-c12d-5c47-999b-a8d3744d12de', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e8465c82-c12d-5c47-999b-a8d3744d12de', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e8465c82-c12d-5c47-999b-a8d3744d12de', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e8465c82-c12d-5c47-999b-a8d3744d12de', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e8465c82-c12d-5c47-999b-a8d3744d12de', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e709ad5e-0188-5df6-99ed-ed666f5e09e7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e709ad5e-0188-5df6-99ed-ed666f5e09e7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e709ad5e-0188-5df6-99ed-ed666f5e09e7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e709ad5e-0188-5df6-99ed-ed666f5e09e7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e709ad5e-0188-5df6-99ed-ed666f5e09e7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e709ad5e-0188-5df6-99ed-ed666f5e09e7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e709ad5e-0188-5df6-99ed-ed666f5e09e7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('512aa856-252e-598d-96c7-b76c72d8ea8b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('512aa856-252e-598d-96c7-b76c72d8ea8b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('512aa856-252e-598d-96c7-b76c72d8ea8b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('512aa856-252e-598d-96c7-b76c72d8ea8b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('512aa856-252e-598d-96c7-b76c72d8ea8b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('512aa856-252e-598d-96c7-b76c72d8ea8b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('512aa856-252e-598d-96c7-b76c72d8ea8b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;


end $$;
