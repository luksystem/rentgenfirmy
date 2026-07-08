-- SRI seed — czesc 5/8 (wygenerowana przez store/sri/_split_seed.py)
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
  values ('d1472db1-3c48-57fa-a450-9f1918e1b5f5', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='electricity'), 'E-8', 'EL-05', 41, '{"en": "Support of (micro)grid operation modes", "pl": "Sterowanie kogeneracją (CHP)"}'::jsonb, 'DSM- Storage', '{"en": "Operate CHP aligned with heat and electricity demand."}'::jsonb, '{"en": "When CHP is installed."}'::jsonb, '{"CHP controllers","BMS"}', 'Only applicable in case of local energy storage', 3, false, true, false, 'smart_ready', null, '{"DG ENER Technical Study 2020"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('da112b72-ab1c-5849-89ad-b88fb0640945', 'd1472db1-3c48-57fa-a450-9f1918e1b5f5', 0, '{"en": "None"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('4e270cc9-4b26-5521-ba69-7f4639e79298', 'd1472db1-3c48-57fa-a450-9f1918e1b5f5', 1, '{"en": "Automated management of (building-level) electricity consumption based on grid signals"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('054fce06-ab0e-535f-a726-55488e4254f7', 'd1472db1-3c48-57fa-a450-9f1918e1b5f5', 2, '{"en": "Automated management of (building-level) electricity consumption and electricity supply to neighbouring buildings (microgrid) or grid"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('f4e3f198-afb7-5604-b2a0-076e1e0fac81', 'd1472db1-3c48-57fa-a450-9f1918e1b5f5', 3, '{"en": "Automated management of (building-level) electricity consumption and supply, with potential to continue limited off-grid operation (island mode)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('da112b72-ab1c-5849-89ad-b88fb0640945', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('da112b72-ab1c-5849-89ad-b88fb0640945', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('da112b72-ab1c-5849-89ad-b88fb0640945', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('da112b72-ab1c-5849-89ad-b88fb0640945', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('da112b72-ab1c-5849-89ad-b88fb0640945', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('da112b72-ab1c-5849-89ad-b88fb0640945', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('da112b72-ab1c-5849-89ad-b88fb0640945', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4e270cc9-4b26-5521-ba69-7f4639e79298', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4e270cc9-4b26-5521-ba69-7f4639e79298', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4e270cc9-4b26-5521-ba69-7f4639e79298', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4e270cc9-4b26-5521-ba69-7f4639e79298', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4e270cc9-4b26-5521-ba69-7f4639e79298', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4e270cc9-4b26-5521-ba69-7f4639e79298', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4e270cc9-4b26-5521-ba69-7f4639e79298', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('054fce06-ab0e-535f-a726-55488e4254f7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('054fce06-ab0e-535f-a726-55488e4254f7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('054fce06-ab0e-535f-a726-55488e4254f7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('054fce06-ab0e-535f-a726-55488e4254f7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('054fce06-ab0e-535f-a726-55488e4254f7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('054fce06-ab0e-535f-a726-55488e4254f7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('054fce06-ab0e-535f-a726-55488e4254f7', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f4e3f198-afb7-5604-b2a0-076e1e0fac81', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f4e3f198-afb7-5604-b2a0-076e1e0fac81', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f4e3f198-afb7-5604-b2a0-076e1e0fac81', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f4e3f198-afb7-5604-b2a0-076e1e0fac81', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f4e3f198-afb7-5604-b2a0-076e1e0fac81', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f4e3f198-afb7-5604-b2a0-076e1e0fac81', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f4e3f198-afb7-5604-b2a0-076e1e0fac81', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('049e4754-16fa-56e8-a9ae-8f61cac9b117', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='electricity'), 'E-11', 'EL-06', 42, '{"en": "Reporting information regarding energy storage", "pl": "Raportowanie stanu magazynów energii"}'::jsonb, 'Feedback - Reporting information', '{"en": "Report SOC, cycles and storage performance."}'::jsonb, '{"en": "When electrical/thermal storage reporting is available."}'::jsonb, '{"Battery monitoring","BMS"}', 'Only applicable in case of local energy storage', 4, true, true, false, 'smart_ready', null, '{"DG ENER Technical Study 2020"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('a4a12ed2-31e3-5507-98d4-61f2d4810627', '049e4754-16fa-56e8-a9ae-8f61cac9b117', 0, '{"en": "None"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('56b3bbda-ef5a-55c7-bdca-b70c86205bcb', '049e4754-16fa-56e8-a9ae-8f61cac9b117', 1, '{"en": "Current state of charge (SOC) data available"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('9e4b5998-20aa-5ee4-8367-c24ac8a24e53', '049e4754-16fa-56e8-a9ae-8f61cac9b117', 2, '{"en": "Actual values and historical data"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('c1180c88-0c78-55d9-b93d-2b33eaa5c361', '049e4754-16fa-56e8-a9ae-8f61cac9b117', 3, '{"en": "Performance evaluation including forecasting and/or benchmarking"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('6ec6214e-b4e9-5b6f-bf94-e6d7b25d0a10', '049e4754-16fa-56e8-a9ae-8f61cac9b117', 4, '{"en": "Performance evaluation including forecasting and/or benchmarking; also including predictive management and fault detection"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a4a12ed2-31e3-5507-98d4-61f2d4810627', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a4a12ed2-31e3-5507-98d4-61f2d4810627', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a4a12ed2-31e3-5507-98d4-61f2d4810627', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a4a12ed2-31e3-5507-98d4-61f2d4810627', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a4a12ed2-31e3-5507-98d4-61f2d4810627', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a4a12ed2-31e3-5507-98d4-61f2d4810627', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a4a12ed2-31e3-5507-98d4-61f2d4810627', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('56b3bbda-ef5a-55c7-bdca-b70c86205bcb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('56b3bbda-ef5a-55c7-bdca-b70c86205bcb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('56b3bbda-ef5a-55c7-bdca-b70c86205bcb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('56b3bbda-ef5a-55c7-bdca-b70c86205bcb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('56b3bbda-ef5a-55c7-bdca-b70c86205bcb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('56b3bbda-ef5a-55c7-bdca-b70c86205bcb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('56b3bbda-ef5a-55c7-bdca-b70c86205bcb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9e4b5998-20aa-5ee4-8367-c24ac8a24e53', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9e4b5998-20aa-5ee4-8367-c24ac8a24e53', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9e4b5998-20aa-5ee4-8367-c24ac8a24e53', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9e4b5998-20aa-5ee4-8367-c24ac8a24e53', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9e4b5998-20aa-5ee4-8367-c24ac8a24e53', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9e4b5998-20aa-5ee4-8367-c24ac8a24e53', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9e4b5998-20aa-5ee4-8367-c24ac8a24e53', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c1180c88-0c78-55d9-b93d-2b33eaa5c361', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c1180c88-0c78-55d9-b93d-2b33eaa5c361', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c1180c88-0c78-55d9-b93d-2b33eaa5c361', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c1180c88-0c78-55d9-b93d-2b33eaa5c361', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c1180c88-0c78-55d9-b93d-2b33eaa5c361', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c1180c88-0c78-55d9-b93d-2b33eaa5c361', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c1180c88-0c78-55d9-b93d-2b33eaa5c361', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6ec6214e-b4e9-5b6f-bf94-e6d7b25d0a10', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6ec6214e-b4e9-5b6f-bf94-e6d7b25d0a10', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6ec6214e-b4e9-5b6f-bf94-e6d7b25d0a10', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6ec6214e-b4e9-5b6f-bf94-e6d7b25d0a10', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6ec6214e-b4e9-5b6f-bf94-e6d7b25d0a10', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6ec6214e-b4e9-5b6f-bf94-e6d7b25d0a10', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6ec6214e-b4e9-5b6f-bf94-e6d7b25d0a10', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('ad4abcf1-a267-5dfa-a671-024e3b6bf927', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='electricity'), 'E-12', 'EL-07', 43, '{"en": "Reporting information regarding electricity consumption", "pl": "Wsparcie trybu pracy mikro-sieci"}'::jsonb, 'Feedback - Reporting information', '{"en": "Islanded or coordinated microgrid operation."}'::jsonb, '{"en": "When microgrid architecture is implemented."}'::jsonb, '{"Microgrid controllers","Grid-forming inverters"}', 'Always to be assessed', 4, true, true, true, 'smart_ready', null, '{"DG ENER Technical Study 2020"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('abe0e085-325f-5599-bb4b-806ad24f6e34', 'ad4abcf1-a267-5dfa-a671-024e3b6bf927', 0, '{"en": "None"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('7659c740-464e-5770-9271-31c380451deb', 'ad4abcf1-a267-5dfa-a671-024e3b6bf927', 1, '{"en": "reporting on current electricity consumption on building level"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('dbc7ae59-31f1-5af9-8dff-6e3e522e3cba', 'ad4abcf1-a267-5dfa-a671-024e3b6bf927', 2, '{"en": "real-time feedback or benchmarking on building level"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('2d85305c-776e-5dfc-ba3d-4481e14fab6f', 'ad4abcf1-a267-5dfa-a671-024e3b6bf927', 3, '{"en": "real-time feedback or benchmarking on appliance level"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('625ef95e-b77f-563a-8a6d-e2199b949373', 'ad4abcf1-a267-5dfa-a671-024e3b6bf927', 4, '{"en": "real-time feedback or benchmarking on appliance level with automated personalized recommendations"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('abe0e085-325f-5599-bb4b-806ad24f6e34', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('abe0e085-325f-5599-bb4b-806ad24f6e34', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('abe0e085-325f-5599-bb4b-806ad24f6e34', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('abe0e085-325f-5599-bb4b-806ad24f6e34', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('abe0e085-325f-5599-bb4b-806ad24f6e34', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('abe0e085-325f-5599-bb4b-806ad24f6e34', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('abe0e085-325f-5599-bb4b-806ad24f6e34', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7659c740-464e-5770-9271-31c380451deb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7659c740-464e-5770-9271-31c380451deb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7659c740-464e-5770-9271-31c380451deb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7659c740-464e-5770-9271-31c380451deb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7659c740-464e-5770-9271-31c380451deb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7659c740-464e-5770-9271-31c380451deb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7659c740-464e-5770-9271-31c380451deb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('dbc7ae59-31f1-5af9-8dff-6e3e522e3cba', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('dbc7ae59-31f1-5af9-8dff-6e3e522e3cba', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('dbc7ae59-31f1-5af9-8dff-6e3e522e3cba', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('dbc7ae59-31f1-5af9-8dff-6e3e522e3cba', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('dbc7ae59-31f1-5af9-8dff-6e3e522e3cba', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('dbc7ae59-31f1-5af9-8dff-6e3e522e3cba', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('dbc7ae59-31f1-5af9-8dff-6e3e522e3cba', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2d85305c-776e-5dfc-ba3d-4481e14fab6f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2d85305c-776e-5dfc-ba3d-4481e14fab6f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2d85305c-776e-5dfc-ba3d-4481e14fab6f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2d85305c-776e-5dfc-ba3d-4481e14fab6f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2d85305c-776e-5dfc-ba3d-4481e14fab6f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2d85305c-776e-5dfc-ba3d-4481e14fab6f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2d85305c-776e-5dfc-ba3d-4481e14fab6f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('625ef95e-b77f-563a-8a6d-e2199b949373', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('625ef95e-b77f-563a-8a6d-e2199b949373', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('625ef95e-b77f-563a-8a6d-e2199b949373', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('625ef95e-b77f-563a-8a6d-e2199b949373', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('625ef95e-b77f-563a-8a6d-e2199b949373', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('625ef95e-b77f-563a-8a6d-e2199b949373', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('625ef95e-b77f-563a-8a6d-e2199b949373', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('bf94cf05-b92a-5b6a-9065-ef668e472ad4', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='electric_vehicle_charging'), 'EV-15', 'EV-01', 44, '{"en": "EV Charging Capacity", "pl": "Moce ładowania pojazdów elektrycznych"}'::jsonb, 'EV Charging', '{"en": "Provide and manage EV charging infrastructure capacity."}'::jsonb, '{"en": "When EV charging points are present or planned (triage)."}'::jsonb, '{"EVSE","Load management controllers"}', 'Only to be assessed if parking spots available on site', 4, true, true, false, 'smart_possible', null, '{"IEC EV roadmap","DG ENER study"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('27fcbdf0-cf21-57d9-abc2-4fc4e2807f90', 'bf94cf05-b92a-5b6a-9065-ef668e472ad4', 0, '{"en": "not present"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('8d9eb2e1-e8c2-5ad9-8503-16b429f66bc6', 'bf94cf05-b92a-5b6a-9065-ef668e472ad4', 1, '{"en": "ducting (or simple power plug) available"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('b9544b2c-7b44-5500-b00d-7f50bcc42f88', 'bf94cf05-b92a-5b6a-9065-ef668e472ad4', 2, '{"en": "0-9% of parking spaces has recharging points"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('3efd84fe-8bd3-583b-a094-378b8af79a8d', 'bf94cf05-b92a-5b6a-9065-ef668e472ad4', 3, '{"en": "10-50% or parking spaces has recharging point"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('8d49d7f9-2ba7-568a-b0b0-a20dba2967c3', 'bf94cf05-b92a-5b6a-9065-ef668e472ad4', 4, '{"en": ">50% of parking spaces has recharging point"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('27fcbdf0-cf21-57d9-abc2-4fc4e2807f90', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('27fcbdf0-cf21-57d9-abc2-4fc4e2807f90', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('27fcbdf0-cf21-57d9-abc2-4fc4e2807f90', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('27fcbdf0-cf21-57d9-abc2-4fc4e2807f90', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('27fcbdf0-cf21-57d9-abc2-4fc4e2807f90', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('27fcbdf0-cf21-57d9-abc2-4fc4e2807f90', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('27fcbdf0-cf21-57d9-abc2-4fc4e2807f90', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8d9eb2e1-e8c2-5ad9-8503-16b429f66bc6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8d9eb2e1-e8c2-5ad9-8503-16b429f66bc6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8d9eb2e1-e8c2-5ad9-8503-16b429f66bc6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8d9eb2e1-e8c2-5ad9-8503-16b429f66bc6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8d9eb2e1-e8c2-5ad9-8503-16b429f66bc6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8d9eb2e1-e8c2-5ad9-8503-16b429f66bc6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8d9eb2e1-e8c2-5ad9-8503-16b429f66bc6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b9544b2c-7b44-5500-b00d-7f50bcc42f88', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b9544b2c-7b44-5500-b00d-7f50bcc42f88', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b9544b2c-7b44-5500-b00d-7f50bcc42f88', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b9544b2c-7b44-5500-b00d-7f50bcc42f88', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b9544b2c-7b44-5500-b00d-7f50bcc42f88', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b9544b2c-7b44-5500-b00d-7f50bcc42f88', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b9544b2c-7b44-5500-b00d-7f50bcc42f88', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3efd84fe-8bd3-583b-a094-378b8af79a8d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3efd84fe-8bd3-583b-a094-378b8af79a8d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3efd84fe-8bd3-583b-a094-378b8af79a8d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3efd84fe-8bd3-583b-a094-378b8af79a8d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3efd84fe-8bd3-583b-a094-378b8af79a8d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3efd84fe-8bd3-583b-a094-378b8af79a8d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3efd84fe-8bd3-583b-a094-378b8af79a8d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8d49d7f9-2ba7-568a-b0b0-a20dba2967c3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8d49d7f9-2ba7-568a-b0b0-a20dba2967c3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8d49d7f9-2ba7-568a-b0b0-a20dba2967c3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8d49d7f9-2ba7-568a-b0b0-a20dba2967c3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8d49d7f9-2ba7-568a-b0b0-a20dba2967c3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8d49d7f9-2ba7-568a-b0b0-a20dba2967c3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8d49d7f9-2ba7-568a-b0b0-a20dba2967c3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('8831e7eb-3924-553c-93c6-ca3c39c16a6f', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='electric_vehicle_charging'), 'EV-16', 'EV-02', 45, '{"en": "EV Charging Grid balancing", "pl": "Harmonogramowe balansowanie obciążenia ładowania EV"}'::jsonb, 'EV Charging - Grid', '{"en": "Shift EV charging to off-peak or renewable surplus."}'::jsonb, '{"en": "When multiple EVSE or smart charging exists."}'::jsonb, '{"Smart EVSE","OCPP backends","BMS"}', 'Only to be assessed if EV charging available on site', 2, true, true, false, 'smart_possible', null, '{"DG ENER Technical Study 2020"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('6b697bad-42b0-5871-a23b-b51f146fbe82', '8831e7eb-3924-553c-93c6-ca3c39c16a6f', 0, '{"en": "Not present (uncontrolled charging)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('98538837-034f-58bb-92cd-005b8779a8a3', '8831e7eb-3924-553c-93c6-ca3c39c16a6f', 1, '{"en": "1-way controlled charging (e.g. including desired departure time and grid signals for optimization)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('601374b8-ec5a-5665-9fa3-dbae40d3d197', '8831e7eb-3924-553c-93c6-ca3c39c16a6f', 2, '{"en": "2-way controlled charging (e.g. including desired departure time and grid signals for optimization)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6b697bad-42b0-5871-a23b-b51f146fbe82', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6b697bad-42b0-5871-a23b-b51f146fbe82', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), -2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6b697bad-42b0-5871-a23b-b51f146fbe82', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6b697bad-42b0-5871-a23b-b51f146fbe82', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6b697bad-42b0-5871-a23b-b51f146fbe82', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6b697bad-42b0-5871-a23b-b51f146fbe82', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6b697bad-42b0-5871-a23b-b51f146fbe82', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('98538837-034f-58bb-92cd-005b8779a8a3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('98538837-034f-58bb-92cd-005b8779a8a3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('98538837-034f-58bb-92cd-005b8779a8a3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('98538837-034f-58bb-92cd-005b8779a8a3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('98538837-034f-58bb-92cd-005b8779a8a3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('98538837-034f-58bb-92cd-005b8779a8a3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('98538837-034f-58bb-92cd-005b8779a8a3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('601374b8-ec5a-5665-9fa3-dbae40d3d197', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('601374b8-ec5a-5665-9fa3-dbae40d3d197', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('601374b8-ec5a-5665-9fa3-dbae40d3d197', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('601374b8-ec5a-5665-9fa3-dbae40d3d197', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('601374b8-ec5a-5665-9fa3-dbae40d3d197', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('601374b8-ec5a-5665-9fa3-dbae40d3d197', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('601374b8-ec5a-5665-9fa3-dbae40d3d197', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('eccd0f58-211c-5754-bf51-051b918b36e5', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='electric_vehicle_charging'), 'EV-17', 'EV-03', 46, '{"en": "EV charging information and connectivity", "pl": "Informacja o ładowaniu pojazdów elektrycznych"}'::jsonb, 'EV Charging - connectivity', '{"en": "Inform users about charging status, cost and availability."}'::jsonb, '{"en": "When EV charging is available."}'::jsonb, '{"EV apps","Display panels","BMS"}', 'Only to be assessed if EV charging available on site', 2, true, true, false, 'smart_possible', null, '{"DG ENER Technical Study 2020"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('6cbb6488-98d5-56c9-b004-ca5e9c795870', 'eccd0f58-211c-5754-bf51-051b918b36e5', 0, '{"en": "No information available"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('22af3bf5-9773-5191-ae46-49fead970112', 'eccd0f58-211c-5754-bf51-051b918b36e5', 1, '{"en": "Reporting information on EV charging status to occupant"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('fb8b4cca-f819-58bc-a89f-e7c5455446aa', 'eccd0f58-211c-5754-bf51-051b918b36e5', 2, '{"en": "Reporting information on EV charging status to occupant AND automatic identification and authorizition of the driver to the charging station (ISO 15118 compliant)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6cbb6488-98d5-56c9-b004-ca5e9c795870', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6cbb6488-98d5-56c9-b004-ca5e9c795870', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6cbb6488-98d5-56c9-b004-ca5e9c795870', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6cbb6488-98d5-56c9-b004-ca5e9c795870', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6cbb6488-98d5-56c9-b004-ca5e9c795870', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6cbb6488-98d5-56c9-b004-ca5e9c795870', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6cbb6488-98d5-56c9-b004-ca5e9c795870', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('22af3bf5-9773-5191-ae46-49fead970112', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('22af3bf5-9773-5191-ae46-49fead970112', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('22af3bf5-9773-5191-ae46-49fead970112', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('22af3bf5-9773-5191-ae46-49fead970112', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('22af3bf5-9773-5191-ae46-49fead970112', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('22af3bf5-9773-5191-ae46-49fead970112', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('22af3bf5-9773-5191-ae46-49fead970112', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('fb8b4cca-f819-58bc-a89f-e7c5455446aa', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('fb8b4cca-f819-58bc-a89f-e7c5455446aa', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('fb8b4cca-f819-58bc-a89f-e7c5455446aa', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('fb8b4cca-f819-58bc-a89f-e7c5455446aa', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('fb8b4cca-f819-58bc-a89f-e7c5455446aa', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('fb8b4cca-f819-58bc-a89f-e7c5455446aa', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('fb8b4cca-f819-58bc-a89f-e7c5455446aa', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('2ac4325b-d274-54cc-969f-a4912e03a4a6', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='monitoring_and_control'), 'MC-3', 'M-01', 47, '{"en": "Run time management of HVAC systems", "pl": "Centralne raportowanie pracy TBS i zużycia energii"}'::jsonb, 'HVAC interaction control', '{"en": "Unified visibility of all technical building systems."}'::jsonb, '{"en": "When BMS or central monitoring exists."}'::jsonb, '{"BMS","SCADA","Energy management platforms"}', '0', 3, false, true, true, 'smart_ready', null, '{"DG ENER Technical Study 2020"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('85ed34ab-0168-5de4-91d7-a56c35d6cba4', '2ac4325b-d274-54cc-969f-a4912e03a4a6', 0, '{"en": "Manual setting"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('09a20db6-a20f-5946-9ceb-dcd69b2950be', '2ac4325b-d274-54cc-969f-a4912e03a4a6', 1, '{"en": "Runtime setting of heating and cooling plants following a predefined time schedule"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('49b69983-088a-5fc8-a2c0-668ccac2b0bb', '2ac4325b-d274-54cc-969f-a4912e03a4a6', 2, '{"en": "Heating and cooling plant on/off control based on building loads"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('f52f5e64-4006-5b5f-821e-9fab1a647d3d', '2ac4325b-d274-54cc-969f-a4912e03a4a6', 3, '{"en": "Heating and cooling plant on/off control based on predictive control or grid signals"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('85ed34ab-0168-5de4-91d7-a56c35d6cba4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('85ed34ab-0168-5de4-91d7-a56c35d6cba4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('85ed34ab-0168-5de4-91d7-a56c35d6cba4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('85ed34ab-0168-5de4-91d7-a56c35d6cba4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('85ed34ab-0168-5de4-91d7-a56c35d6cba4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('85ed34ab-0168-5de4-91d7-a56c35d6cba4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('85ed34ab-0168-5de4-91d7-a56c35d6cba4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('09a20db6-a20f-5946-9ceb-dcd69b2950be', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('09a20db6-a20f-5946-9ceb-dcd69b2950be', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('09a20db6-a20f-5946-9ceb-dcd69b2950be', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('09a20db6-a20f-5946-9ceb-dcd69b2950be', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('09a20db6-a20f-5946-9ceb-dcd69b2950be', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('09a20db6-a20f-5946-9ceb-dcd69b2950be', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('09a20db6-a20f-5946-9ceb-dcd69b2950be', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('49b69983-088a-5fc8-a2c0-668ccac2b0bb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('49b69983-088a-5fc8-a2c0-668ccac2b0bb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('49b69983-088a-5fc8-a2c0-668ccac2b0bb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('49b69983-088a-5fc8-a2c0-668ccac2b0bb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('49b69983-088a-5fc8-a2c0-668ccac2b0bb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('49b69983-088a-5fc8-a2c0-668ccac2b0bb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('49b69983-088a-5fc8-a2c0-668ccac2b0bb', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f52f5e64-4006-5b5f-821e-9fab1a647d3d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f52f5e64-4006-5b5f-821e-9fab1a647d3d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f52f5e64-4006-5b5f-821e-9fab1a647d3d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f52f5e64-4006-5b5f-821e-9fab1a647d3d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f52f5e64-4006-5b5f-821e-9fab1a647d3d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f52f5e64-4006-5b5f-821e-9fab1a647d3d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f52f5e64-4006-5b5f-821e-9fab1a647d3d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('1e512c7d-3dff-59aa-aebe-21f35aefdeff', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='monitoring_and_control'), 'MC-4', 'M-02', 48, '{"en": "Detecting faults of technical building systems and providing support to the diagnosis of these faults", "pl": "Integracja z inteligentną siecią (harmonizacja TBS)"}'::jsonb, 'Fault detection', '{"en": "Coordinate building systems for grid-friendly operation."}'::jsonb, '{"en": "When grid interface or aggregator connection exists."}'::jsonb, '{"Grid interfaces","OpenADR","BMS"}', '0', 3, false, true, true, 'smart_ready', null, '{"DG ENER Technical Study 2020"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('c9cb3b5a-c5c5-5668-a817-9415f10baa4c', '1e512c7d-3dff-59aa-aebe-21f35aefdeff', 0, '{"en": "No central indication of detected faults and alarms"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('486cbb91-e8c0-572f-9f0f-512978b304c9', '1e512c7d-3dff-59aa-aebe-21f35aefdeff', 1, '{"en": "With central indication of detected faults and alarms for at least 2 relevant TBS"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('09507c85-e4ac-56a4-aa9b-74363afe4ebe', '1e512c7d-3dff-59aa-aebe-21f35aefdeff', 2, '{"en": "With central indication of detected faults and alarms for all relevant TBS"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('f68f51b5-86e3-59f4-9926-ce138a9366cf', '1e512c7d-3dff-59aa-aebe-21f35aefdeff', 3, '{"en": "With central indication of detected faults and alarms for all relevant TBS, including diagnosing functions"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c9cb3b5a-c5c5-5668-a817-9415f10baa4c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c9cb3b5a-c5c5-5668-a817-9415f10baa4c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c9cb3b5a-c5c5-5668-a817-9415f10baa4c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c9cb3b5a-c5c5-5668-a817-9415f10baa4c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c9cb3b5a-c5c5-5668-a817-9415f10baa4c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c9cb3b5a-c5c5-5668-a817-9415f10baa4c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c9cb3b5a-c5c5-5668-a817-9415f10baa4c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('486cbb91-e8c0-572f-9f0f-512978b304c9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('486cbb91-e8c0-572f-9f0f-512978b304c9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('486cbb91-e8c0-572f-9f0f-512978b304c9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('486cbb91-e8c0-572f-9f0f-512978b304c9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('486cbb91-e8c0-572f-9f0f-512978b304c9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('486cbb91-e8c0-572f-9f0f-512978b304c9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('486cbb91-e8c0-572f-9f0f-512978b304c9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('09507c85-e4ac-56a4-aa9b-74363afe4ebe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('09507c85-e4ac-56a4-aa9b-74363afe4ebe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('09507c85-e4ac-56a4-aa9b-74363afe4ebe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('09507c85-e4ac-56a4-aa9b-74363afe4ebe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('09507c85-e4ac-56a4-aa9b-74363afe4ebe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('09507c85-e4ac-56a4-aa9b-74363afe4ebe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('09507c85-e4ac-56a4-aa9b-74363afe4ebe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f68f51b5-86e3-59f4-9926-ce138a9366cf', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f68f51b5-86e3-59f4-9926-ce138a9366cf', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f68f51b5-86e3-59f4-9926-ce138a9366cf', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f68f51b5-86e3-59f4-9926-ce138a9366cf', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f68f51b5-86e3-59f4-9926-ce138a9366cf', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f68f51b5-86e3-59f4-9926-ce138a9366cf', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f68f51b5-86e3-59f4-9926-ce138a9366cf', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('bcaa6565-2514-57d5-9613-e40666048d45', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='monitoring_and_control'), 'MC-9', 'M-03', 49, '{"en": "Occupancy detection: connected services", "pl": "Jedna platforma automatycznego sterowania i koordynacji TBS"}'::jsonb, 'TBS interaction control', '{"en": "Orchestrate HVAC, lighting, envelope from one platform."}'::jsonb, '{"en": "When integrated BMS/BACS platform exists."}'::jsonb, '{"BMS","IoT platforms","Digital twins"}', '0', 2, false, true, true, 'smart_ready', null, '{"DG ENER Technical Study 2020"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('cd008275-528e-5a0d-9879-fa11a364c88d', 'bcaa6565-2514-57d5-9613-e40666048d45', 0, '{"en": "None"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('03328f48-6c5d-578f-9a0c-18a40fb50e23', 'bcaa6565-2514-57d5-9613-e40666048d45', 1, '{"en": "Occupancy detection for individual functions, e.g. lighting"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('2233507a-9d54-589c-9e29-1016e3283639', 'bcaa6565-2514-57d5-9613-e40666048d45', 2, '{"en": "Centralised occupant detection which feeds in to several TBS such as lighting and heating"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cd008275-528e-5a0d-9879-fa11a364c88d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cd008275-528e-5a0d-9879-fa11a364c88d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cd008275-528e-5a0d-9879-fa11a364c88d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cd008275-528e-5a0d-9879-fa11a364c88d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cd008275-528e-5a0d-9879-fa11a364c88d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cd008275-528e-5a0d-9879-fa11a364c88d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cd008275-528e-5a0d-9879-fa11a364c88d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('03328f48-6c5d-578f-9a0c-18a40fb50e23', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('03328f48-6c5d-578f-9a0c-18a40fb50e23', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('03328f48-6c5d-578f-9a0c-18a40fb50e23', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('03328f48-6c5d-578f-9a0c-18a40fb50e23', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('03328f48-6c5d-578f-9a0c-18a40fb50e23', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('03328f48-6c5d-578f-9a0c-18a40fb50e23', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('03328f48-6c5d-578f-9a0c-18a40fb50e23', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2233507a-9d54-589c-9e29-1016e3283639', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2233507a-9d54-589c-9e29-1016e3283639', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2233507a-9d54-589c-9e29-1016e3283639', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2233507a-9d54-589c-9e29-1016e3283639', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2233507a-9d54-589c-9e29-1016e3283639', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2233507a-9d54-589c-9e29-1016e3283639', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2233507a-9d54-589c-9e29-1016e3283639', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('da26fc58-c544-5580-be22-aa5f24fb4e09', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='monitoring_and_control'), 'MC-13', 'M-04', 50, '{"en": "Central reporting of TBS performance and energy use", "pl": "Harmonogramowanie pracy systemów HVAC"}'::jsonb, 'Feedback - Reporting information', '{"en": "Program HVAC operation by occupancy calendar."}'::jsonb, '{"en": "When schedulable HVAC exists."}'::jsonb, '{"BMS schedules","Time clocks"}', '0', 3, true, true, true, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('198d65cf-baa9-5b50-b428-ac4c57c93e46', 'da26fc58-c544-5580-be22-aa5f24fb4e09', 0, '{"en": "None"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('715fa40a-0906-5012-ab7e-bf61b54ff0fe', 'da26fc58-c544-5580-be22-aa5f24fb4e09', 1, '{"en": "Central or remote reporting of realtime energy use per energy carrier"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('3f30f6ed-4706-54cd-83f3-591fbfbaf949', 'da26fc58-c544-5580-be22-aa5f24fb4e09', 2, '{"en": "Central or remote reporting of realtime energy use per energy carrier, combining TBS of at least 2 domains in one interface"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('02edc03a-b9e0-534d-aeb7-f8d931b65719', 'da26fc58-c544-5580-be22-aa5f24fb4e09', 3, '{"en": "Central or remote reporting of realtime energy use per energy carrier, combining TBS of all main domains in one interface"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('198d65cf-baa9-5b50-b428-ac4c57c93e46', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('198d65cf-baa9-5b50-b428-ac4c57c93e46', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('198d65cf-baa9-5b50-b428-ac4c57c93e46', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('198d65cf-baa9-5b50-b428-ac4c57c93e46', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('198d65cf-baa9-5b50-b428-ac4c57c93e46', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('198d65cf-baa9-5b50-b428-ac4c57c93e46', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('198d65cf-baa9-5b50-b428-ac4c57c93e46', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('715fa40a-0906-5012-ab7e-bf61b54ff0fe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('715fa40a-0906-5012-ab7e-bf61b54ff0fe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('715fa40a-0906-5012-ab7e-bf61b54ff0fe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('715fa40a-0906-5012-ab7e-bf61b54ff0fe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('715fa40a-0906-5012-ab7e-bf61b54ff0fe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('715fa40a-0906-5012-ab7e-bf61b54ff0fe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('715fa40a-0906-5012-ab7e-bf61b54ff0fe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3f30f6ed-4706-54cd-83f3-591fbfbaf949', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3f30f6ed-4706-54cd-83f3-591fbfbaf949', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3f30f6ed-4706-54cd-83f3-591fbfbaf949', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3f30f6ed-4706-54cd-83f3-591fbfbaf949', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3f30f6ed-4706-54cd-83f3-591fbfbaf949', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3f30f6ed-4706-54cd-83f3-591fbfbaf949', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3f30f6ed-4706-54cd-83f3-591fbfbaf949', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('02edc03a-b9e0-534d-aeb7-f8d931b65719', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('02edc03a-b9e0-534d-aeb7-f8d931b65719', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('02edc03a-b9e0-534d-aeb7-f8d931b65719', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('02edc03a-b9e0-534d-aeb7-f8d931b65719', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('02edc03a-b9e0-534d-aeb7-f8d931b65719', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('02edc03a-b9e0-534d-aeb7-f8d931b65719', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('02edc03a-b9e0-534d-aeb7-f8d931b65719', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('c4f34cdb-0063-5a1b-8e6d-b91852ddfcc9', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='monitoring_and_control'), 'MC-25', 'M-05', 51, '{"en": "Smart Grid Integration", "pl": "Wykrywanie usterek TBS i wsparcie diagnostyki"}'::jsonb, 'Smart Grid Integration', '{"en": "FDD and maintenance support across systems."}'::jsonb, '{"en": "When monitoring data enables fault detection."}'::jsonb, '{"FDD software","BMS alarms","Analytics"}', 'The inspectability of the nature of the control algorithm would need to be facilitated for level 2. Service 7.5 in EN15232-1-17. Average impacts derived from multiple simulations to produce BACS factors in EN15232.', 2, true, true, true, 'smart_ready', null, '{"DG ENER Technical Study 2020"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('da7edc54-1479-5104-8912-fd3190bffde9', 'c4f34cdb-0063-5a1b-8e6d-b91852ddfcc9', 0, '{"en": "None - No harmonization between grid and TBS; building is operated independently from the grid load"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('18ba3d4e-5f82-5d9c-a267-58aafbf734bd', 'c4f34cdb-0063-5a1b-8e6d-b91852ddfcc9', 1, '{"en": "Demand side management possible for (some) individual TBS, but not coordinated over various domains"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('1828ff97-f5c5-5bd7-9a00-ff278b4ec2ac', 'c4f34cdb-0063-5a1b-8e6d-b91852ddfcc9', 2, '{"en": "Coordinated demand side management of multiple TBS"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('da7edc54-1479-5104-8912-fd3190bffde9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('da7edc54-1479-5104-8912-fd3190bffde9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('da7edc54-1479-5104-8912-fd3190bffde9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('da7edc54-1479-5104-8912-fd3190bffde9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('da7edc54-1479-5104-8912-fd3190bffde9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('da7edc54-1479-5104-8912-fd3190bffde9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('da7edc54-1479-5104-8912-fd3190bffde9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('18ba3d4e-5f82-5d9c-a267-58aafbf734bd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('18ba3d4e-5f82-5d9c-a267-58aafbf734bd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('18ba3d4e-5f82-5d9c-a267-58aafbf734bd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('18ba3d4e-5f82-5d9c-a267-58aafbf734bd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('18ba3d4e-5f82-5d9c-a267-58aafbf734bd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('18ba3d4e-5f82-5d9c-a267-58aafbf734bd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('18ba3d4e-5f82-5d9c-a267-58aafbf734bd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('1828ff97-f5c5-5bd7-9a00-ff278b4ec2ac', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('1828ff97-f5c5-5bd7-9a00-ff278b4ec2ac', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('1828ff97-f5c5-5bd7-9a00-ff278b4ec2ac', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('1828ff97-f5c5-5bd7-9a00-ff278b4ec2ac', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('1828ff97-f5c5-5bd7-9a00-ff278b4ec2ac', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('1828ff97-f5c5-5bd7-9a00-ff278b4ec2ac', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('1828ff97-f5c5-5bd7-9a00-ff278b4ec2ac', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;


end $$;
