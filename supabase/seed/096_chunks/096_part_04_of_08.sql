-- SRI seed — czesc 4/8 (wygenerowana przez store/sri/_split_seed.py)
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
  values ('00d02789-4e4c-563f-bbef-42b7f9d9d0cb', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='ventilation'), 'V-6', 'V-06', 31, '{"en": "Reporting information regarding IAQ", "pl": "Monitorowanie jakości powietrza wewnętrznego"}'::jsonb, 'Feedback - Reporting information', '{"en": "Ventilate based on CO₂, VOC or particulate sensors."}'::jsonb, '{"en": "When DCV or IAQ-based control is feasible."}'::jsonb, '{"CO₂ sensors","IAQ multisensors","BMS"}', 'Always to be assessed', 3, true, true, true, 'smart_ready', null, '{"EN ISO 52120-1","DG ENER study"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('c4f2dd73-c7ec-5fb9-ad06-589afc95260d', '00d02789-4e4c-563f-bbef-42b7f9d9d0cb', 0, '{"en": "None"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('82114a43-e2da-57af-8b7d-fe12b61204ed', '00d02789-4e4c-563f-bbef-42b7f9d9d0cb', 1, '{"en": "Air quality sensors (e.g. CO2) and real time autonomous monitoring"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('6af92c3f-f0fc-5cee-996f-2312d554f9e1', '00d02789-4e4c-563f-bbef-42b7f9d9d0cb', 2, '{"en": "Real time monitoring & historical information of IAQ available to occupants"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('3d7a514a-7b0c-5cac-aca5-19c108ba2f78', '00d02789-4e4c-563f-bbef-42b7f9d9d0cb', 3, '{"en": "Real time monitoring & historical information of IAQ available to occupants + warning on maintenance needs or occupant actions (e.g. window opening)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c4f2dd73-c7ec-5fb9-ad06-589afc95260d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c4f2dd73-c7ec-5fb9-ad06-589afc95260d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c4f2dd73-c7ec-5fb9-ad06-589afc95260d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c4f2dd73-c7ec-5fb9-ad06-589afc95260d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c4f2dd73-c7ec-5fb9-ad06-589afc95260d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c4f2dd73-c7ec-5fb9-ad06-589afc95260d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c4f2dd73-c7ec-5fb9-ad06-589afc95260d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('82114a43-e2da-57af-8b7d-fe12b61204ed', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('82114a43-e2da-57af-8b7d-fe12b61204ed', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('82114a43-e2da-57af-8b7d-fe12b61204ed', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('82114a43-e2da-57af-8b7d-fe12b61204ed', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('82114a43-e2da-57af-8b7d-fe12b61204ed', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('82114a43-e2da-57af-8b7d-fe12b61204ed', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('82114a43-e2da-57af-8b7d-fe12b61204ed', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6af92c3f-f0fc-5cee-996f-2312d554f9e1', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6af92c3f-f0fc-5cee-996f-2312d554f9e1', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6af92c3f-f0fc-5cee-996f-2312d554f9e1', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6af92c3f-f0fc-5cee-996f-2312d554f9e1', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6af92c3f-f0fc-5cee-996f-2312d554f9e1', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6af92c3f-f0fc-5cee-996f-2312d554f9e1', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6af92c3f-f0fc-5cee-996f-2312d554f9e1', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3d7a514a-7b0c-5cac-aca5-19c108ba2f78', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3d7a514a-7b0c-5cac-aca5-19c108ba2f78', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3d7a514a-7b0c-5cac-aca5-19c108ba2f78', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3d7a514a-7b0c-5cac-aca5-19c108ba2f78', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3d7a514a-7b0c-5cac-aca5-19c108ba2f78', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3d7a514a-7b0c-5cac-aca5-19c108ba2f78', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3d7a514a-7b0c-5cac-aca5-19c108ba2f78', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('42a7537b-b238-5071-bdd6-57c2b5bc6c18', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='lighting'), 'L-1a', 'L-01', 32, '{"en": "Occupancy control for indoor lighting", "pl": "Sterowanie oświetleniem w zależności od obecności"}'::jsonb, 'Artificial lighting control', '{"en": "Switch lighting based on presence detection."}'::jsonb, '{"en": "When artificial lighting exists in occupied zones."}'::jsonb, '{"PIR sensors","Presence detectors","DALI controllers"}', 'Always to be assessed', 3, true, true, true, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('fa32948d-19bb-5763-8bfb-de5f94e3f685', '42a7537b-b238-5071-bdd6-57c2b5bc6c18', 0, '{"en": "Manual on/off switch"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('e8fda8e2-2c2d-507b-bf21-2b83f42fccdb', '42a7537b-b238-5071-bdd6-57c2b5bc6c18', 1, '{"en": "Manual on/off switch + additional sweeping extinction signal"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('6d62b557-1bfc-585e-8d42-6b4161493607', '42a7537b-b238-5071-bdd6-57c2b5bc6c18', 2, '{"en": "Automatic detection (auto on / dimmed or auto off)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('4fcbb03f-b681-5f4d-b70c-7e61ebde2db7', '42a7537b-b238-5071-bdd6-57c2b5bc6c18', 3, '{"en": "Automatic detection (manual on / dimmed or auto off)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('fa32948d-19bb-5763-8bfb-de5f94e3f685', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('fa32948d-19bb-5763-8bfb-de5f94e3f685', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('fa32948d-19bb-5763-8bfb-de5f94e3f685', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('fa32948d-19bb-5763-8bfb-de5f94e3f685', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('fa32948d-19bb-5763-8bfb-de5f94e3f685', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('fa32948d-19bb-5763-8bfb-de5f94e3f685', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('fa32948d-19bb-5763-8bfb-de5f94e3f685', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e8fda8e2-2c2d-507b-bf21-2b83f42fccdb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e8fda8e2-2c2d-507b-bf21-2b83f42fccdb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e8fda8e2-2c2d-507b-bf21-2b83f42fccdb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e8fda8e2-2c2d-507b-bf21-2b83f42fccdb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e8fda8e2-2c2d-507b-bf21-2b83f42fccdb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e8fda8e2-2c2d-507b-bf21-2b83f42fccdb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e8fda8e2-2c2d-507b-bf21-2b83f42fccdb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6d62b557-1bfc-585e-8d42-6b4161493607', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6d62b557-1bfc-585e-8d42-6b4161493607', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6d62b557-1bfc-585e-8d42-6b4161493607', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6d62b557-1bfc-585e-8d42-6b4161493607', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6d62b557-1bfc-585e-8d42-6b4161493607', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6d62b557-1bfc-585e-8d42-6b4161493607', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6d62b557-1bfc-585e-8d42-6b4161493607', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4fcbb03f-b681-5f4d-b70c-7e61ebde2db7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4fcbb03f-b681-5f4d-b70c-7e61ebde2db7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4fcbb03f-b681-5f4d-b70c-7e61ebde2db7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4fcbb03f-b681-5f4d-b70c-7e61ebde2db7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4fcbb03f-b681-5f4d-b70c-7e61ebde2db7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4fcbb03f-b681-5f4d-b70c-7e61ebde2db7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4fcbb03f-b681-5f4d-b70c-7e61ebde2db7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('9069a272-1fa1-5734-8615-8d4019a8e63b', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='lighting'), 'L-2', 'L-02', 33, '{"en": "Control artificial lighting power based on daylight levels", "pl": "Automatyczne sterowanie oświetleniem w zależności od światła dziennego"}'::jsonb, 'Control artificial lighting power based on daylight levels', '{"en": "Dim or switch lighting using daylight harvesting."}'::jsonb, '{"en": "When daylight reaches occupied areas."}'::jsonb, '{"Daylight sensors","DALI dimming","Constant light control"}', 'Always to be assessed', 4, false, true, true, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('04252f53-6635-5a40-9bff-e61c82690f4e', '9069a272-1fa1-5734-8615-8d4019a8e63b', 0, '{"en": "Manual (central)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('e2109fd2-48bb-5b36-9968-79041754846e', '9069a272-1fa1-5734-8615-8d4019a8e63b', 1, '{"en": "Manual (per room / zone)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('823a065b-32bc-5af6-afcd-8e6a121367c8', '9069a272-1fa1-5734-8615-8d4019a8e63b', 2, '{"en": "Automatic switching"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('4126adff-534c-505d-a575-431914e3efe0', '9069a272-1fa1-5734-8615-8d4019a8e63b', 3, '{"en": "Automatic dimming"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('4845bdde-03c2-5902-9662-837747fe969f', '9069a272-1fa1-5734-8615-8d4019a8e63b', 4, '{"en": "Automatic dimming including scene-based light control (during time intervals, dynamic and\nadapted lighting scenes are set, for example, in terms of\nilluminance level, different correlated colour temperature (CCT)\nand the possibility to change the light distribution within the space\naccording to e. g. design, human needs, visual tasks)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('04252f53-6635-5a40-9bff-e61c82690f4e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('04252f53-6635-5a40-9bff-e61c82690f4e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('04252f53-6635-5a40-9bff-e61c82690f4e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('04252f53-6635-5a40-9bff-e61c82690f4e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('04252f53-6635-5a40-9bff-e61c82690f4e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('04252f53-6635-5a40-9bff-e61c82690f4e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('04252f53-6635-5a40-9bff-e61c82690f4e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e2109fd2-48bb-5b36-9968-79041754846e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e2109fd2-48bb-5b36-9968-79041754846e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e2109fd2-48bb-5b36-9968-79041754846e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e2109fd2-48bb-5b36-9968-79041754846e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e2109fd2-48bb-5b36-9968-79041754846e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e2109fd2-48bb-5b36-9968-79041754846e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e2109fd2-48bb-5b36-9968-79041754846e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('823a065b-32bc-5af6-afcd-8e6a121367c8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('823a065b-32bc-5af6-afcd-8e6a121367c8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('823a065b-32bc-5af6-afcd-8e6a121367c8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('823a065b-32bc-5af6-afcd-8e6a121367c8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('823a065b-32bc-5af6-afcd-8e6a121367c8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('823a065b-32bc-5af6-afcd-8e6a121367c8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('823a065b-32bc-5af6-afcd-8e6a121367c8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4126adff-534c-505d-a575-431914e3efe0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4126adff-534c-505d-a575-431914e3efe0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4126adff-534c-505d-a575-431914e3efe0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4126adff-534c-505d-a575-431914e3efe0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4126adff-534c-505d-a575-431914e3efe0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4126adff-534c-505d-a575-431914e3efe0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4126adff-534c-505d-a575-431914e3efe0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4845bdde-03c2-5902-9662-837747fe969f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4845bdde-03c2-5902-9662-837747fe969f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4845bdde-03c2-5902-9662-837747fe969f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4845bdde-03c2-5902-9662-837747fe969f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4845bdde-03c2-5902-9662-837747fe969f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4845bdde-03c2-5902-9662-837747fe969f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4845bdde-03c2-5902-9662-837747fe969f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('982e0ec7-89bd-556e-9ddd-e245e5e9de58', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='dynamic_building_envelope'), 'DE-1', 'E-01', 34, '{"en": "Window solar shading control", "pl": "Sterowanie osłonami przeciwsłonecznymi"}'::jsonb, 'Window control', '{"en": "Automate blinds/shading for solar gain and glare control."}'::jsonb, '{"en": "When movable shading devices are present."}'::jsonb, '{"Motorized blinds","Facade actuators","BMS"}', 'Only applicable in case movable shades, screens or blinds are present', 4, true, true, false, 'smart_ready', null, '{"DG ENER Technical Study 2020"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('ef5368c3-0388-5a58-8abe-58522d79b761', '982e0ec7-89bd-556e-9ddd-e245e5e9de58', 0, '{"en": "No sun shading or only manual operation"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('2cf32b87-cd86-56e1-b52d-a78c5eecdc49', '982e0ec7-89bd-556e-9ddd-e245e5e9de58', 1, '{"en": "Motorized operation with manual control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('2c92f798-10f1-51da-ac12-fd3bc4b3d9b8', '982e0ec7-89bd-556e-9ddd-e245e5e9de58', 2, '{"en": "Motorized operation with automatic control based on sensor data"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('94085543-78db-5270-ba08-28addd7264a7', '982e0ec7-89bd-556e-9ddd-e245e5e9de58', 3, '{"en": "Combined light/blind/HVAC control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('8f6ebeb6-156b-51e9-9242-d3e2916ed124', '982e0ec7-89bd-556e-9ddd-e245e5e9de58', 4, '{"en": "Predictive blind control (e.g. based on weather forecast)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ef5368c3-0388-5a58-8abe-58522d79b761', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ef5368c3-0388-5a58-8abe-58522d79b761', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ef5368c3-0388-5a58-8abe-58522d79b761', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ef5368c3-0388-5a58-8abe-58522d79b761', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ef5368c3-0388-5a58-8abe-58522d79b761', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ef5368c3-0388-5a58-8abe-58522d79b761', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ef5368c3-0388-5a58-8abe-58522d79b761', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2cf32b87-cd86-56e1-b52d-a78c5eecdc49', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2cf32b87-cd86-56e1-b52d-a78c5eecdc49', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2cf32b87-cd86-56e1-b52d-a78c5eecdc49', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2cf32b87-cd86-56e1-b52d-a78c5eecdc49', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2cf32b87-cd86-56e1-b52d-a78c5eecdc49', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2cf32b87-cd86-56e1-b52d-a78c5eecdc49', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2cf32b87-cd86-56e1-b52d-a78c5eecdc49', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2c92f798-10f1-51da-ac12-fd3bc4b3d9b8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2c92f798-10f1-51da-ac12-fd3bc4b3d9b8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2c92f798-10f1-51da-ac12-fd3bc4b3d9b8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2c92f798-10f1-51da-ac12-fd3bc4b3d9b8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2c92f798-10f1-51da-ac12-fd3bc4b3d9b8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2c92f798-10f1-51da-ac12-fd3bc4b3d9b8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2c92f798-10f1-51da-ac12-fd3bc4b3d9b8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('94085543-78db-5270-ba08-28addd7264a7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('94085543-78db-5270-ba08-28addd7264a7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('94085543-78db-5270-ba08-28addd7264a7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('94085543-78db-5270-ba08-28addd7264a7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('94085543-78db-5270-ba08-28addd7264a7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('94085543-78db-5270-ba08-28addd7264a7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('94085543-78db-5270-ba08-28addd7264a7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8f6ebeb6-156b-51e9-9242-d3e2916ed124', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8f6ebeb6-156b-51e9-9242-d3e2916ed124', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8f6ebeb6-156b-51e9-9242-d3e2916ed124', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8f6ebeb6-156b-51e9-9242-d3e2916ed124', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8f6ebeb6-156b-51e9-9242-d3e2916ed124', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8f6ebeb6-156b-51e9-9242-d3e2916ed124', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8f6ebeb6-156b-51e9-9242-d3e2916ed124', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('52916eb0-65e0-5875-9d00-c71af451072f', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='dynamic_building_envelope'), 'DE-2', 'E-02', 35, '{"en": "Window open/closed control, combined with HVAC system", "pl": "Sterowanie otwieraniem okien z integracją HVAC"}'::jsonb, 'Window control', '{"en": "Coordinate natural ventilation windows with HVAC interlocks."}'::jsonb, '{"en": "When automated windows or vents exist."}'::jsonb, '{"Motorized windows","BMS interlocks"}', '0', 3, false, true, true, 'smart_ready', null, '{"DG ENER Technical Study 2020"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('e426b98f-0b9b-51b4-9cf4-bd086384fd04', '52916eb0-65e0-5875-9d00-c71af451072f', 0, '{"en": "Manual operation or only fixed windows"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('ba07155b-d2d3-5dac-bf0c-0d331ae68fd3', '52916eb0-65e0-5875-9d00-c71af451072f', 1, '{"en": "Open/closed detection to shut down heating or cooling systems"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('ca02de01-0b3d-5486-9f45-14318c2cb4a5', '52916eb0-65e0-5875-9d00-c71af451072f', 2, '{"en": "Level 1 + Automised mechanical window opening based on room sensor data"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('4385bc94-d70e-573d-a339-5de62f58b143', '52916eb0-65e0-5875-9d00-c71af451072f', 3, '{"en": "Level 2 + Centralized coordination of operable windows, e.g. to control free natural night cooling"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e426b98f-0b9b-51b4-9cf4-bd086384fd04', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e426b98f-0b9b-51b4-9cf4-bd086384fd04', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e426b98f-0b9b-51b4-9cf4-bd086384fd04', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e426b98f-0b9b-51b4-9cf4-bd086384fd04', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e426b98f-0b9b-51b4-9cf4-bd086384fd04', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e426b98f-0b9b-51b4-9cf4-bd086384fd04', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e426b98f-0b9b-51b4-9cf4-bd086384fd04', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ba07155b-d2d3-5dac-bf0c-0d331ae68fd3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ba07155b-d2d3-5dac-bf0c-0d331ae68fd3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ba07155b-d2d3-5dac-bf0c-0d331ae68fd3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ba07155b-d2d3-5dac-bf0c-0d331ae68fd3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ba07155b-d2d3-5dac-bf0c-0d331ae68fd3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ba07155b-d2d3-5dac-bf0c-0d331ae68fd3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ba07155b-d2d3-5dac-bf0c-0d331ae68fd3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ca02de01-0b3d-5486-9f45-14318c2cb4a5', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ca02de01-0b3d-5486-9f45-14318c2cb4a5', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ca02de01-0b3d-5486-9f45-14318c2cb4a5', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ca02de01-0b3d-5486-9f45-14318c2cb4a5', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ca02de01-0b3d-5486-9f45-14318c2cb4a5', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ca02de01-0b3d-5486-9f45-14318c2cb4a5', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ca02de01-0b3d-5486-9f45-14318c2cb4a5', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4385bc94-d70e-573d-a339-5de62f58b143', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4385bc94-d70e-573d-a339-5de62f58b143', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4385bc94-d70e-573d-a339-5de62f58b143', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4385bc94-d70e-573d-a339-5de62f58b143', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4385bc94-d70e-573d-a339-5de62f58b143', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4385bc94-d70e-573d-a339-5de62f58b143', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4385bc94-d70e-573d-a339-5de62f58b143', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('a85f608f-56d9-569f-9ae6-08763e0741aa', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='dynamic_building_envelope'), 'DE-4', 'E-03', 36, '{"en": "Reporting information regarding performance of dynamic building envelope systems", "pl": "Raportowanie pracy dynamicznej powłoki budynku"}'::jsonb, 'Feedback - Reporting information', '{"en": "Inform users about shading/window operation and impact."}'::jsonb, '{"en": "When dynamic envelope elements exist."}'::jsonb, '{"BMS dashboards","Facade monitoring"}', 'Only applicable in case movable shades, screens or blinds are present', 4, true, true, false, 'smart_ready', null, '{"DG ENER Technical Study 2020"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('baa8dada-7535-5c93-b440-76161bc575f4', 'a85f608f-56d9-569f-9ae6-08763e0741aa', 0, '{"en": "No reporting"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('27335d93-1f83-5141-8eb4-18b71841d59e', 'a85f608f-56d9-569f-9ae6-08763e0741aa', 1, '{"en": "Position of each product & fault detection"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('e345407d-cef8-5bad-acb0-fb1a5dedb9aa', 'a85f608f-56d9-569f-9ae6-08763e0741aa', 2, '{"en": "Position of each product, fault detection & predictive maintenance"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('7a84d555-5b8d-5314-80fb-f2f4d1267592', 'a85f608f-56d9-569f-9ae6-08763e0741aa', 3, '{"en": "Position of each product, fault detection, predictive maintenance, real-time sensor data (wind, lux, temperature…)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('17a07bf7-69df-5e21-a58e-7acd3f816f6e', 'a85f608f-56d9-569f-9ae6-08763e0741aa', 4, '{"en": "Position of each product, fault detection, predictive maintenance, real-time & historical sensor data (wind, lux, temperature…)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('baa8dada-7535-5c93-b440-76161bc575f4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('baa8dada-7535-5c93-b440-76161bc575f4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('baa8dada-7535-5c93-b440-76161bc575f4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('baa8dada-7535-5c93-b440-76161bc575f4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('baa8dada-7535-5c93-b440-76161bc575f4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('baa8dada-7535-5c93-b440-76161bc575f4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('baa8dada-7535-5c93-b440-76161bc575f4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('27335d93-1f83-5141-8eb4-18b71841d59e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('27335d93-1f83-5141-8eb4-18b71841d59e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('27335d93-1f83-5141-8eb4-18b71841d59e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('27335d93-1f83-5141-8eb4-18b71841d59e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('27335d93-1f83-5141-8eb4-18b71841d59e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('27335d93-1f83-5141-8eb4-18b71841d59e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('27335d93-1f83-5141-8eb4-18b71841d59e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e345407d-cef8-5bad-acb0-fb1a5dedb9aa', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e345407d-cef8-5bad-acb0-fb1a5dedb9aa', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e345407d-cef8-5bad-acb0-fb1a5dedb9aa', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e345407d-cef8-5bad-acb0-fb1a5dedb9aa', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e345407d-cef8-5bad-acb0-fb1a5dedb9aa', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e345407d-cef8-5bad-acb0-fb1a5dedb9aa', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e345407d-cef8-5bad-acb0-fb1a5dedb9aa', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7a84d555-5b8d-5314-80fb-f2f4d1267592', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7a84d555-5b8d-5314-80fb-f2f4d1267592', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7a84d555-5b8d-5314-80fb-f2f4d1267592', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7a84d555-5b8d-5314-80fb-f2f4d1267592', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7a84d555-5b8d-5314-80fb-f2f4d1267592', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7a84d555-5b8d-5314-80fb-f2f4d1267592', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7a84d555-5b8d-5314-80fb-f2f4d1267592', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('17a07bf7-69df-5e21-a58e-7acd3f816f6e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('17a07bf7-69df-5e21-a58e-7acd3f816f6e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('17a07bf7-69df-5e21-a58e-7acd3f816f6e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('17a07bf7-69df-5e21-a58e-7acd3f816f6e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('17a07bf7-69df-5e21-a58e-7acd3f816f6e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('17a07bf7-69df-5e21-a58e-7acd3f816f6e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('17a07bf7-69df-5e21-a58e-7acd3f816f6e', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('3a392f7f-7b41-5918-803b-a5b1484d5fe1', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='electricity'), 'E-2', 'EL-01', 37, '{"en": "Reporting information regarding local electricity generation", "pl": "Raportowanie lokalnej generacji energii"}'::jsonb, 'Feedback - Reporting information', '{"en": "Report PV/other on-site generation to occupants/operators."}'::jsonb, '{"en": "When local generation is installed."}'::jsonb, '{"Inverter monitoring","Energy dashboards"}', 'Only applicable in case of local energy generation', 4, true, true, false, 'smart_ready', null, '{"IEC Smart Grid roadmap","DG ENER study"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('56d0641d-4f01-5246-9670-55279b0ef280', '3a392f7f-7b41-5918-803b-a5b1484d5fe1', 0, '{"en": "None"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('515bc880-0aab-5749-923a-9e668d4b0fc7', '3a392f7f-7b41-5918-803b-a5b1484d5fe1', 1, '{"en": "Current generation data available"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('0595368d-4999-555b-a2ec-3fc3d8045661', '3a392f7f-7b41-5918-803b-a5b1484d5fe1', 2, '{"en": "Actual values and historical data"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('ea8d8109-91f7-59fb-903a-d02a02710b2b', '3a392f7f-7b41-5918-803b-a5b1484d5fe1', 3, '{"en": "Performance evaluation including forecasting and/or benchmarking"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('3d7d4ca5-8b51-53cf-bc84-fd1738d8f0fa', '3a392f7f-7b41-5918-803b-a5b1484d5fe1', 4, '{"en": "Performance evaluation including forecasting and/or benchmarking; also including predictive management and fault detection"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('56d0641d-4f01-5246-9670-55279b0ef280', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('56d0641d-4f01-5246-9670-55279b0ef280', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('56d0641d-4f01-5246-9670-55279b0ef280', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('56d0641d-4f01-5246-9670-55279b0ef280', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('56d0641d-4f01-5246-9670-55279b0ef280', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('56d0641d-4f01-5246-9670-55279b0ef280', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('56d0641d-4f01-5246-9670-55279b0ef280', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('515bc880-0aab-5749-923a-9e668d4b0fc7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('515bc880-0aab-5749-923a-9e668d4b0fc7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('515bc880-0aab-5749-923a-9e668d4b0fc7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('515bc880-0aab-5749-923a-9e668d4b0fc7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('515bc880-0aab-5749-923a-9e668d4b0fc7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('515bc880-0aab-5749-923a-9e668d4b0fc7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('515bc880-0aab-5749-923a-9e668d4b0fc7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0595368d-4999-555b-a2ec-3fc3d8045661', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0595368d-4999-555b-a2ec-3fc3d8045661', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0595368d-4999-555b-a2ec-3fc3d8045661', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0595368d-4999-555b-a2ec-3fc3d8045661', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0595368d-4999-555b-a2ec-3fc3d8045661', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0595368d-4999-555b-a2ec-3fc3d8045661', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0595368d-4999-555b-a2ec-3fc3d8045661', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ea8d8109-91f7-59fb-903a-d02a02710b2b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ea8d8109-91f7-59fb-903a-d02a02710b2b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ea8d8109-91f7-59fb-903a-d02a02710b2b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ea8d8109-91f7-59fb-903a-d02a02710b2b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ea8d8109-91f7-59fb-903a-d02a02710b2b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ea8d8109-91f7-59fb-903a-d02a02710b2b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ea8d8109-91f7-59fb-903a-d02a02710b2b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3d7d4ca5-8b51-53cf-bc84-fd1738d8f0fa', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3d7d4ca5-8b51-53cf-bc84-fd1738d8f0fa', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3d7d4ca5-8b51-53cf-bc84-fd1738d8f0fa', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3d7d4ca5-8b51-53cf-bc84-fd1738d8f0fa', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3d7d4ca5-8b51-53cf-bc84-fd1738d8f0fa', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3d7d4ca5-8b51-53cf-bc84-fd1738d8f0fa', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3d7d4ca5-8b51-53cf-bc84-fd1738d8f0fa', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('0146afe9-3a50-5346-91fd-3838482917eb', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='electricity'), 'E-3', 'EL-02', 38, '{"en": "Storage of (locally generated) electricity", "pl": "Magazynowanie lokalnie wytworzonej energii"}'::jsonb, 'DER - Storage', '{"en": "Store PV surplus in batteries or other storage."}'::jsonb, '{"en": "When electrical storage coupled to generation exists."}'::jsonb, '{"Battery EMS","Hybrid inverters"}', 'Only applicable in case of local energy generation', 4, true, true, false, 'smart_ready', null, '{"DG ENER Technical Study 2020"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('e428caa9-2241-5d7c-aff8-8aa2fe5bc3a5', '0146afe9-3a50-5346-91fd-3838482917eb', 0, '{"en": "None"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('419d0d1e-18ff-559a-b114-f463fec998b8', '0146afe9-3a50-5346-91fd-3838482917eb', 1, '{"en": "On site storage of electricity (e.g. electric battery)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('6c0ceb06-41ab-5f92-8626-bfa0d138f67a', '0146afe9-3a50-5346-91fd-3838482917eb', 2, '{"en": "On site storage of energy (e.g. electric battery or thermal storage) with controller based on grid signals"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('b3542912-a3a8-5529-8d71-6356a5d9b6d1', '0146afe9-3a50-5346-91fd-3838482917eb', 3, '{"en": "On site storage of energy (e.g. electric battery or thermal storage) with controller optimising the use of locally generated electricity"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('6883327f-4a57-5261-83dd-40e8dc6b86e7', '0146afe9-3a50-5346-91fd-3838482917eb', 4, '{"en": "On site storage of energy (e.g. electric battery or thermal storage) with controller optimising the use of locally generated electricity and possibility to feed back into the grid"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e428caa9-2241-5d7c-aff8-8aa2fe5bc3a5', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e428caa9-2241-5d7c-aff8-8aa2fe5bc3a5', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e428caa9-2241-5d7c-aff8-8aa2fe5bc3a5', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e428caa9-2241-5d7c-aff8-8aa2fe5bc3a5', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e428caa9-2241-5d7c-aff8-8aa2fe5bc3a5', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e428caa9-2241-5d7c-aff8-8aa2fe5bc3a5', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e428caa9-2241-5d7c-aff8-8aa2fe5bc3a5', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('419d0d1e-18ff-559a-b114-f463fec998b8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('419d0d1e-18ff-559a-b114-f463fec998b8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('419d0d1e-18ff-559a-b114-f463fec998b8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('419d0d1e-18ff-559a-b114-f463fec998b8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('419d0d1e-18ff-559a-b114-f463fec998b8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('419d0d1e-18ff-559a-b114-f463fec998b8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('419d0d1e-18ff-559a-b114-f463fec998b8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6c0ceb06-41ab-5f92-8626-bfa0d138f67a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6c0ceb06-41ab-5f92-8626-bfa0d138f67a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6c0ceb06-41ab-5f92-8626-bfa0d138f67a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6c0ceb06-41ab-5f92-8626-bfa0d138f67a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6c0ceb06-41ab-5f92-8626-bfa0d138f67a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6c0ceb06-41ab-5f92-8626-bfa0d138f67a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6c0ceb06-41ab-5f92-8626-bfa0d138f67a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b3542912-a3a8-5529-8d71-6356a5d9b6d1', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b3542912-a3a8-5529-8d71-6356a5d9b6d1', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b3542912-a3a8-5529-8d71-6356a5d9b6d1', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b3542912-a3a8-5529-8d71-6356a5d9b6d1', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b3542912-a3a8-5529-8d71-6356a5d9b6d1', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b3542912-a3a8-5529-8d71-6356a5d9b6d1', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b3542912-a3a8-5529-8d71-6356a5d9b6d1', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6883327f-4a57-5261-83dd-40e8dc6b86e7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6883327f-4a57-5261-83dd-40e8dc6b86e7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6883327f-4a57-5261-83dd-40e8dc6b86e7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6883327f-4a57-5261-83dd-40e8dc6b86e7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6883327f-4a57-5261-83dd-40e8dc6b86e7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6883327f-4a57-5261-83dd-40e8dc6b86e7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6883327f-4a57-5261-83dd-40e8dc6b86e7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('01660261-e555-5d4f-bd66-a8012fa50419', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='electricity'), 'E-4', 'EL-03', 39, '{"en": "Optimizing self-consumption of locally generated electricity", "pl": "Raportowanie zużycia energii elektrycznej"}'::jsonb, 'DER- Optimization', '{"en": "Provide granular electricity use feedback."}'::jsonb, '{"en": "When metering/sub-metering exists."}'::jsonb, '{"Smart meters","Sub-metering","Tenant portals"}', 'Only applicable in case of local energy generation', 3, false, true, false, 'smart_ready', null, '{"DG ENER Technical Study 2020"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('c05a6834-68c3-55cb-9fc3-3d104525ed5f', '01660261-e555-5d4f-bd66-a8012fa50419', 0, '{"en": "None"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('b95e78ff-acc6-51e0-8b16-62b6c8f82dc2', '01660261-e555-5d4f-bd66-a8012fa50419', 1, '{"en": "Scheduling electricity consumption (plug loads, white goods, etc.)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('2040f1d6-0ecb-506f-b743-35b9266c5f94', '01660261-e555-5d4f-bd66-a8012fa50419', 2, '{"en": "Automated management of local electricity consumption based on current renewable energy availability"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('27702aa3-ce3d-5e56-8846-4abed77a8cbb', '01660261-e555-5d4f-bd66-a8012fa50419', 3, '{"en": "Automated management of local electricity consumption based on current and predicted energy needs and renewable energy availability"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c05a6834-68c3-55cb-9fc3-3d104525ed5f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c05a6834-68c3-55cb-9fc3-3d104525ed5f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c05a6834-68c3-55cb-9fc3-3d104525ed5f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c05a6834-68c3-55cb-9fc3-3d104525ed5f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c05a6834-68c3-55cb-9fc3-3d104525ed5f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c05a6834-68c3-55cb-9fc3-3d104525ed5f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c05a6834-68c3-55cb-9fc3-3d104525ed5f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b95e78ff-acc6-51e0-8b16-62b6c8f82dc2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b95e78ff-acc6-51e0-8b16-62b6c8f82dc2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b95e78ff-acc6-51e0-8b16-62b6c8f82dc2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b95e78ff-acc6-51e0-8b16-62b6c8f82dc2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b95e78ff-acc6-51e0-8b16-62b6c8f82dc2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b95e78ff-acc6-51e0-8b16-62b6c8f82dc2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b95e78ff-acc6-51e0-8b16-62b6c8f82dc2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2040f1d6-0ecb-506f-b743-35b9266c5f94', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2040f1d6-0ecb-506f-b743-35b9266c5f94', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2040f1d6-0ecb-506f-b743-35b9266c5f94', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2040f1d6-0ecb-506f-b743-35b9266c5f94', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2040f1d6-0ecb-506f-b743-35b9266c5f94', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2040f1d6-0ecb-506f-b743-35b9266c5f94', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2040f1d6-0ecb-506f-b743-35b9266c5f94', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('27702aa3-ce3d-5e56-8846-4abed77a8cbb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('27702aa3-ce3d-5e56-8846-4abed77a8cbb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('27702aa3-ce3d-5e56-8846-4abed77a8cbb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('27702aa3-ce3d-5e56-8846-4abed77a8cbb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('27702aa3-ce3d-5e56-8846-4abed77a8cbb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('27702aa3-ce3d-5e56-8846-4abed77a8cbb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('27702aa3-ce3d-5e56-8846-4abed77a8cbb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('8b2882d2-dfdb-5314-a031-a1a44503e9bc', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='electricity'), 'E-5', 'EL-04', 40, '{"en": "Control of combined heat and power plant (CHP)", "pl": "Optymalizacja autokonsumpcji energii"}'::jsonb, 'DER - Generation Control', '{"en": "Maximize self-consumption of on-site generation."}'::jsonb, '{"en": "When PV and controllable loads coexist."}'::jsonb, '{"EMS","Load control","Battery logic"}', 'Only applicable in case of CHP', 2, false, true, false, 'smart_ready', null, '{"DG ENER Technical Study 2020"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('cd0da76e-d453-528b-891a-9f52c8cd98f0', '8b2882d2-dfdb-5314-a031-a1a44503e9bc', 0, '{"en": "CHP control based on scheduled runtime management and/or current heat energy demand"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('d7dbc50b-0bda-5eb9-afe6-7e638317fe25', '8b2882d2-dfdb-5314-a031-a1a44503e9bc', 1, '{"en": "CHP runtime control influenced by the fluctuating availability of RES; overproduction will be fed into the grid"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('4fca46bb-0d85-5565-acd2-8875abf3ee7f', '8b2882d2-dfdb-5314-a031-a1a44503e9bc', 2, '{"en": "CHP runtime control influenced by the fluctuating availability of RES and grid signals; dynamic charging and runtime control to optimise self-consumption of renewables"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cd0da76e-d453-528b-891a-9f52c8cd98f0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cd0da76e-d453-528b-891a-9f52c8cd98f0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cd0da76e-d453-528b-891a-9f52c8cd98f0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cd0da76e-d453-528b-891a-9f52c8cd98f0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cd0da76e-d453-528b-891a-9f52c8cd98f0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cd0da76e-d453-528b-891a-9f52c8cd98f0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cd0da76e-d453-528b-891a-9f52c8cd98f0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d7dbc50b-0bda-5eb9-afe6-7e638317fe25', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d7dbc50b-0bda-5eb9-afe6-7e638317fe25', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d7dbc50b-0bda-5eb9-afe6-7e638317fe25', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d7dbc50b-0bda-5eb9-afe6-7e638317fe25', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d7dbc50b-0bda-5eb9-afe6-7e638317fe25', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d7dbc50b-0bda-5eb9-afe6-7e638317fe25', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d7dbc50b-0bda-5eb9-afe6-7e638317fe25', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4fca46bb-0d85-5565-acd2-8875abf3ee7f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4fca46bb-0d85-5565-acd2-8875abf3ee7f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4fca46bb-0d85-5565-acd2-8875abf3ee7f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4fca46bb-0d85-5565-acd2-8875abf3ee7f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4fca46bb-0d85-5565-acd2-8875abf3ee7f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4fca46bb-0d85-5565-acd2-8875abf3ee7f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4fca46bb-0d85-5565-acd2-8875abf3ee7f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;


end $$;
