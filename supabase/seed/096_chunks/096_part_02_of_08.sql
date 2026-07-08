-- SRI seed — czesc 2/8 (wygenerowana przez store/sri/_split_seed.py)
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
  values ('fe14546c-fe63-5918-81bc-35a2b41225bc', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='domestic_hot_water'), 'DHW-1a', 'DHW-01', 11, '{"en": "Control of DHW storage charging (with direct electric heating or integrated electric heat pump)", "pl": "Sterowanie ładowaniem zasobnika CWU (grzałka lub wbudowana pompa)"}'::jsonb, 'Control DHW production facilities', '{"en": "Optimize DHW charging from electric resistance or integrated HP."}'::jsonb, '{"en": "When electric DHW storage or HP-integrated DHW exists."}'::jsonb, '{"DHW cylinders","HP DHW modules","Smart timers"}', 'Only applicable in case of DHW storage with electric heating', 3, true, true, false, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('e518bef5-601d-55bb-a55c-830ebf7ac666', 'fe14546c-fe63-5918-81bc-35a2b41225bc', 0, '{"en": "Automatic control on / off"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('06633321-1058-51af-ace8-018630574be4', 'fe14546c-fe63-5918-81bc-35a2b41225bc', 1, '{"en": "Automatic control on / off and scheduled charging enable"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('07b1c261-296c-5dbc-ab21-318d551ef68c', 'fe14546c-fe63-5918-81bc-35a2b41225bc', 2, '{"en": "Automatic control on / off and scheduled charging enable and multi-sensor storage management"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('5c43e5bb-e4fe-5c0a-bc16-93d1e8c50445', 'fe14546c-fe63-5918-81bc-35a2b41225bc', 3, '{"en": "Automatic charging control based on local availability of renewables or information from electricity grid (DR, DSM)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e518bef5-601d-55bb-a55c-830ebf7ac666', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e518bef5-601d-55bb-a55c-830ebf7ac666', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e518bef5-601d-55bb-a55c-830ebf7ac666', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e518bef5-601d-55bb-a55c-830ebf7ac666', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e518bef5-601d-55bb-a55c-830ebf7ac666', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e518bef5-601d-55bb-a55c-830ebf7ac666', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e518bef5-601d-55bb-a55c-830ebf7ac666', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('06633321-1058-51af-ace8-018630574be4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('06633321-1058-51af-ace8-018630574be4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('06633321-1058-51af-ace8-018630574be4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('06633321-1058-51af-ace8-018630574be4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('06633321-1058-51af-ace8-018630574be4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('06633321-1058-51af-ace8-018630574be4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('06633321-1058-51af-ace8-018630574be4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('07b1c261-296c-5dbc-ab21-318d551ef68c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('07b1c261-296c-5dbc-ab21-318d551ef68c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('07b1c261-296c-5dbc-ab21-318d551ef68c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('07b1c261-296c-5dbc-ab21-318d551ef68c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('07b1c261-296c-5dbc-ab21-318d551ef68c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('07b1c261-296c-5dbc-ab21-318d551ef68c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('07b1c261-296c-5dbc-ab21-318d551ef68c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5c43e5bb-e4fe-5c0a-bc16-93d1e8c50445', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5c43e5bb-e4fe-5c0a-bc16-93d1e8c50445', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5c43e5bb-e4fe-5c0a-bc16-93d1e8c50445', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5c43e5bb-e4fe-5c0a-bc16-93d1e8c50445', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5c43e5bb-e4fe-5c0a-bc16-93d1e8c50445', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5c43e5bb-e4fe-5c0a-bc16-93d1e8c50445', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5c43e5bb-e4fe-5c0a-bc16-93d1e8c50445', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('80018850-3642-583b-b098-d6f9dd985dca', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='domestic_hot_water'), 'DHW-1b', 'DHW-02', 12, '{"en": "Control of DHW storage charging (using hot water generation)", "pl": "Sterowanie ładowaniem zasobnika CWU (wytwarzanie ciepłej wody)"}'::jsonb, 'Control DHW production facilities', '{"en": "Control DHW charging from boiler or central heat generator."}'::jsonb, '{"en": "When DHW is produced via boiler/central plant."}'::jsonb, '{"DHW charging controllers","Boiler DHW circuits"}', 'Only applicable in case of DHW storage with non-electrical heat  generation', 3, true, true, false, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('01161c56-c25b-5304-9e92-3ab6bfc53b12', '80018850-3642-583b-b098-d6f9dd985dca', 0, '{"en": "Automatic control on / off"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('768cecc5-1714-56db-b7ae-1bbc3e7df8c6', '80018850-3642-583b-b098-d6f9dd985dca', 1, '{"en": "Automatic control on / off and scheduled charging enable"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('302ef416-4bac-5c4e-9286-fce7100b06ff', '80018850-3642-583b-b098-d6f9dd985dca', 2, '{"en": "Automatic on/off control, scheduled charging enable and demand-based supply temperature control or multi-sensor storage management"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('4a7b102e-1580-5b79-8a8c-7c2a9495b8c2', '80018850-3642-583b-b098-d6f9dd985dca', 3, '{"en": "DHW production system capable of automatic charging control based on external signals (e.g. from district heating grid)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('01161c56-c25b-5304-9e92-3ab6bfc53b12', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('01161c56-c25b-5304-9e92-3ab6bfc53b12', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('01161c56-c25b-5304-9e92-3ab6bfc53b12', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('01161c56-c25b-5304-9e92-3ab6bfc53b12', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('01161c56-c25b-5304-9e92-3ab6bfc53b12', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('01161c56-c25b-5304-9e92-3ab6bfc53b12', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('01161c56-c25b-5304-9e92-3ab6bfc53b12', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('768cecc5-1714-56db-b7ae-1bbc3e7df8c6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('768cecc5-1714-56db-b7ae-1bbc3e7df8c6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('768cecc5-1714-56db-b7ae-1bbc3e7df8c6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('768cecc5-1714-56db-b7ae-1bbc3e7df8c6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('768cecc5-1714-56db-b7ae-1bbc3e7df8c6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('768cecc5-1714-56db-b7ae-1bbc3e7df8c6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('768cecc5-1714-56db-b7ae-1bbc3e7df8c6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('302ef416-4bac-5c4e-9286-fce7100b06ff', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('302ef416-4bac-5c4e-9286-fce7100b06ff', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('302ef416-4bac-5c4e-9286-fce7100b06ff', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('302ef416-4bac-5c4e-9286-fce7100b06ff', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('302ef416-4bac-5c4e-9286-fce7100b06ff', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('302ef416-4bac-5c4e-9286-fce7100b06ff', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('302ef416-4bac-5c4e-9286-fce7100b06ff', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4a7b102e-1580-5b79-8a8c-7c2a9495b8c2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4a7b102e-1580-5b79-8a8c-7c2a9495b8c2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4a7b102e-1580-5b79-8a8c-7c2a9495b8c2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4a7b102e-1580-5b79-8a8c-7c2a9495b8c2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4a7b102e-1580-5b79-8a8c-7c2a9495b8c2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4a7b102e-1580-5b79-8a8c-7c2a9495b8c2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4a7b102e-1580-5b79-8a8c-7c2a9495b8c2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('63e059bf-7483-57ba-b32e-067ebdd60299', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='domestic_hot_water'), 'DHW-1d', 'DHW-03', 13, '{"en": "Control of DHW storage charging (with solar collector and supplymentary heat generation)", "pl": "Sterowanie ładowaniem CWU (kolektor słoneczny + źródło uzupełniające)"}'::jsonb, 'Control DHW production facilities', '{"en": "Prioritize solar DHW with backup heat source control."}'::jsonb, '{"en": "When solar thermal DHW with backup exists."}'::jsonb, '{"Solar controllers","Backup boiler interfaces"}', 'Only applicable in case of DHW storage with solar collector', 3, false, true, false, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('ce3d3e3c-d5f5-5883-8adf-9273a9b1c918', '63e059bf-7483-57ba-b32e-067ebdd60299', 0, '{"en": "Manual selected control of solar energy or heat generation"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('87e99587-a934-5049-bfe1-a97eea974fac', '63e059bf-7483-57ba-b32e-067ebdd60299', 1, '{"en": "Automatic control of solar storage charge (Prio. 1) and supplementary storage charge"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('d5c9568e-dae3-50bd-82b8-6fb916d5d077', '63e059bf-7483-57ba-b32e-067ebdd60299', 2, '{"en": "Automatic control of solar storage charge (Prio. 1) and supplementary storage charge and demand-oriented supply or multi-sensor storage management"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('acad6974-0670-539d-b8a7-b902e11fe312', '63e059bf-7483-57ba-b32e-067ebdd60299', 3, '{"en": "Automatic control of solar storage charge (Prio. 1) and supplementary storage charge, demand-oriented supply and return temperature control and multi-sensor storage management"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ce3d3e3c-d5f5-5883-8adf-9273a9b1c918', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ce3d3e3c-d5f5-5883-8adf-9273a9b1c918', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ce3d3e3c-d5f5-5883-8adf-9273a9b1c918', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ce3d3e3c-d5f5-5883-8adf-9273a9b1c918', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ce3d3e3c-d5f5-5883-8adf-9273a9b1c918', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ce3d3e3c-d5f5-5883-8adf-9273a9b1c918', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ce3d3e3c-d5f5-5883-8adf-9273a9b1c918', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('87e99587-a934-5049-bfe1-a97eea974fac', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('87e99587-a934-5049-bfe1-a97eea974fac', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('87e99587-a934-5049-bfe1-a97eea974fac', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('87e99587-a934-5049-bfe1-a97eea974fac', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('87e99587-a934-5049-bfe1-a97eea974fac', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('87e99587-a934-5049-bfe1-a97eea974fac', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('87e99587-a934-5049-bfe1-a97eea974fac', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d5c9568e-dae3-50bd-82b8-6fb916d5d077', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d5c9568e-dae3-50bd-82b8-6fb916d5d077', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d5c9568e-dae3-50bd-82b8-6fb916d5d077', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d5c9568e-dae3-50bd-82b8-6fb916d5d077', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d5c9568e-dae3-50bd-82b8-6fb916d5d077', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d5c9568e-dae3-50bd-82b8-6fb916d5d077', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d5c9568e-dae3-50bd-82b8-6fb916d5d077', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('acad6974-0670-539d-b8a7-b902e11fe312', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('acad6974-0670-539d-b8a7-b902e11fe312', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('acad6974-0670-539d-b8a7-b902e11fe312', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('acad6974-0670-539d-b8a7-b902e11fe312', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('acad6974-0670-539d-b8a7-b902e11fe312', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('acad6974-0670-539d-b8a7-b902e11fe312', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('acad6974-0670-539d-b8a7-b902e11fe312', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('8b8abd63-85e8-5257-ad9d-3bda50edffde', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='domestic_hot_water'), 'DHW-2b', 'DHW-04', 14, '{"en": "Sequencing in case of different DHW generators", "pl": "Sekwencjonowanie wielu generatorów CWU"}'::jsonb, 'Control DHW production facilities', '{"en": "Select optimal DHW generator among multiple sources."}'::jsonb, '{"en": "When multiple DHW generation paths exist."}'::jsonb, '{"BMS sequencing","Multi-source DHW controllers"}', 'Only applicable in case of multiple heat generators, mostly restricted to large buildings', 4, false, true, false, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('69ca6baa-d9c1-5dc1-be0e-f27c156591f9', '8b8abd63-85e8-5257-ad9d-3bda50edffde', 0, '{"en": "Priorities only based on running time"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('5114d3ab-9777-52b9-8361-518c8e643d44', '8b8abd63-85e8-5257-ad9d-3bda50edffde', 1, '{"en": "Control according to fixed priority list: e.g. based on rated energy efficiency"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('dd4e4572-4848-57f5-b515-8bde8baba5fe', '8b8abd63-85e8-5257-ad9d-3bda50edffde', 2, '{"en": "Control according to dynamic priority list (based on current energy efficiency, carbon emissions and capacity of generators, e.g. solar, geothermal heat, cogeneration plant, fossil fuels)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('b44bcc5f-c4e9-5372-858f-d6746cd41d81', '8b8abd63-85e8-5257-ad9d-3bda50edffde', 3, '{"en": "Control according to dynamic priority list (based on current AND predicted load, energy efficiency, carbon emissions  and capacity of generators)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('181f5d82-b566-5ac0-bf47-0aab11b6186c', '8b8abd63-85e8-5257-ad9d-3bda50edffde', 4, '{"en": "Control according to dynamic priority list (based on current AND predicted load, energy efficiency, carbon emissions, capacity of generators AND external signals from grid)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('69ca6baa-d9c1-5dc1-be0e-f27c156591f9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('69ca6baa-d9c1-5dc1-be0e-f27c156591f9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('69ca6baa-d9c1-5dc1-be0e-f27c156591f9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('69ca6baa-d9c1-5dc1-be0e-f27c156591f9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('69ca6baa-d9c1-5dc1-be0e-f27c156591f9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('69ca6baa-d9c1-5dc1-be0e-f27c156591f9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('69ca6baa-d9c1-5dc1-be0e-f27c156591f9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5114d3ab-9777-52b9-8361-518c8e643d44', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5114d3ab-9777-52b9-8361-518c8e643d44', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5114d3ab-9777-52b9-8361-518c8e643d44', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5114d3ab-9777-52b9-8361-518c8e643d44', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5114d3ab-9777-52b9-8361-518c8e643d44', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5114d3ab-9777-52b9-8361-518c8e643d44', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5114d3ab-9777-52b9-8361-518c8e643d44', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('dd4e4572-4848-57f5-b515-8bde8baba5fe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('dd4e4572-4848-57f5-b515-8bde8baba5fe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('dd4e4572-4848-57f5-b515-8bde8baba5fe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('dd4e4572-4848-57f5-b515-8bde8baba5fe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('dd4e4572-4848-57f5-b515-8bde8baba5fe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('dd4e4572-4848-57f5-b515-8bde8baba5fe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('dd4e4572-4848-57f5-b515-8bde8baba5fe', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b44bcc5f-c4e9-5372-858f-d6746cd41d81', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b44bcc5f-c4e9-5372-858f-d6746cd41d81', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b44bcc5f-c4e9-5372-858f-d6746cd41d81', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b44bcc5f-c4e9-5372-858f-d6746cd41d81', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b44bcc5f-c4e9-5372-858f-d6746cd41d81', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b44bcc5f-c4e9-5372-858f-d6746cd41d81', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b44bcc5f-c4e9-5372-858f-d6746cd41d81', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('181f5d82-b566-5ac0-bf47-0aab11b6186c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('181f5d82-b566-5ac0-bf47-0aab11b6186c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('181f5d82-b566-5ac0-bf47-0aab11b6186c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('181f5d82-b566-5ac0-bf47-0aab11b6186c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('181f5d82-b566-5ac0-bf47-0aab11b6186c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('181f5d82-b566-5ac0-bf47-0aab11b6186c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('181f5d82-b566-5ac0-bf47-0aab11b6186c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('d19b1cdd-29e0-582d-899a-b45aa0b3b9db', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='domestic_hot_water'), 'DHW-3', 'DHW-05', 15, '{"en": "Report information regarding domestic hot water performance", "pl": "Raportowanie informacji o pracy instalacji CWU"}'::jsonb, 'Information to occupants and facility managers', '{"en": "Report DHW temperatures, consumption and faults to users."}'::jsonb, '{"en": "When DHW system is present."}'::jsonb, '{"BMS","Smart water heaters with app"}', '0', 4, true, true, true, 'smart_ready', null, '{"DG ENER Technical Study 2020"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('4e5cfdf1-3a18-516f-91f0-238ee03a1be5', 'd19b1cdd-29e0-582d-899a-b45aa0b3b9db', 0, '{"en": "None"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('9a569cfe-1cc6-5d65-83be-e5f852a95ca9', 'd19b1cdd-29e0-582d-899a-b45aa0b3b9db', 1, '{"en": "Indication of actual values (e.g. temperatures, submetering energy usage)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('ed516a79-c722-5170-a80b-357e3ca9d096', 'd19b1cdd-29e0-582d-899a-b45aa0b3b9db', 2, '{"en": "Actual values and historical data"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('4508c1fc-00a4-533c-8832-a35a0ccd49be', 'd19b1cdd-29e0-582d-899a-b45aa0b3b9db', 3, '{"en": "Performance evaluation including forecasting and/or benchmarking"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('82ead12b-7a73-582d-b91a-a43eff6074c4', 'd19b1cdd-29e0-582d-899a-b45aa0b3b9db', 4, '{"en": "Performance evaluation including forecasting and/or benchmarking; also including predictive management and fault detection"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4e5cfdf1-3a18-516f-91f0-238ee03a1be5', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4e5cfdf1-3a18-516f-91f0-238ee03a1be5', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4e5cfdf1-3a18-516f-91f0-238ee03a1be5', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4e5cfdf1-3a18-516f-91f0-238ee03a1be5', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4e5cfdf1-3a18-516f-91f0-238ee03a1be5', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4e5cfdf1-3a18-516f-91f0-238ee03a1be5', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4e5cfdf1-3a18-516f-91f0-238ee03a1be5', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9a569cfe-1cc6-5d65-83be-e5f852a95ca9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9a569cfe-1cc6-5d65-83be-e5f852a95ca9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9a569cfe-1cc6-5d65-83be-e5f852a95ca9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9a569cfe-1cc6-5d65-83be-e5f852a95ca9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9a569cfe-1cc6-5d65-83be-e5f852a95ca9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9a569cfe-1cc6-5d65-83be-e5f852a95ca9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9a569cfe-1cc6-5d65-83be-e5f852a95ca9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ed516a79-c722-5170-a80b-357e3ca9d096', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ed516a79-c722-5170-a80b-357e3ca9d096', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ed516a79-c722-5170-a80b-357e3ca9d096', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ed516a79-c722-5170-a80b-357e3ca9d096', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ed516a79-c722-5170-a80b-357e3ca9d096', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ed516a79-c722-5170-a80b-357e3ca9d096', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ed516a79-c722-5170-a80b-357e3ca9d096', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4508c1fc-00a4-533c-8832-a35a0ccd49be', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4508c1fc-00a4-533c-8832-a35a0ccd49be', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4508c1fc-00a4-533c-8832-a35a0ccd49be', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4508c1fc-00a4-533c-8832-a35a0ccd49be', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4508c1fc-00a4-533c-8832-a35a0ccd49be', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4508c1fc-00a4-533c-8832-a35a0ccd49be', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4508c1fc-00a4-533c-8832-a35a0ccd49be', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('82ead12b-7a73-582d-b91a-a43eff6074c4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('82ead12b-7a73-582d-b91a-a43eff6074c4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('82ead12b-7a73-582d-b91a-a43eff6074c4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('82ead12b-7a73-582d-b91a-a43eff6074c4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('82ead12b-7a73-582d-b91a-a43eff6074c4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('82ead12b-7a73-582d-b91a-a43eff6074c4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('82ead12b-7a73-582d-b91a-a43eff6074c4', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('74f40ff7-20f9-5e56-a2a5-34f584bf97f7', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='cooling'), 'C-1a', 'C-01', 16, '{"en": "Cooling emission control", "pl": "Sterowanie emisją chłodu"}'::jsonb, 'Cooling control - demand side', '{"en": "Regulate cooling delivery to spaces based on demand."}'::jsonb, '{"en": "When cooling emitters (FCU, chilled ceilings, etc.) exist."}'::jsonb, '{"Room cooling controllers","FCU valves","BMS"}', 'Only applicable in case mechanical cooling systems are present', 4, true, true, false, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('9df208d5-5700-58df-a9bd-c34d2efd130d', '74f40ff7-20f9-5e56-a2a5-34f584bf97f7', 0, '{"en": "No automatic control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('e61521c5-9b98-5cce-8c01-ff66c640442f', '74f40ff7-20f9-5e56-a2a5-34f584bf97f7', 1, '{"en": "Central automatic control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('68f33794-c736-5b49-adea-898fd9ec8dbf', '74f40ff7-20f9-5e56-a2a5-34f584bf97f7', 2, '{"en": "Individual room control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('124f1fcc-9f98-5ebd-8fa7-df19ce0e9a16', '74f40ff7-20f9-5e56-a2a5-34f584bf97f7', 3, '{"en": "Individual room control with communication between controllers and to BACS"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('76606263-ec13-5fec-a6a2-bdb9a6493252', '74f40ff7-20f9-5e56-a2a5-34f584bf97f7', 4, '{"en": "Individual room control with communication and occupancy detection"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9df208d5-5700-58df-a9bd-c34d2efd130d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9df208d5-5700-58df-a9bd-c34d2efd130d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9df208d5-5700-58df-a9bd-c34d2efd130d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9df208d5-5700-58df-a9bd-c34d2efd130d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9df208d5-5700-58df-a9bd-c34d2efd130d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9df208d5-5700-58df-a9bd-c34d2efd130d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9df208d5-5700-58df-a9bd-c34d2efd130d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e61521c5-9b98-5cce-8c01-ff66c640442f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e61521c5-9b98-5cce-8c01-ff66c640442f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e61521c5-9b98-5cce-8c01-ff66c640442f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e61521c5-9b98-5cce-8c01-ff66c640442f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e61521c5-9b98-5cce-8c01-ff66c640442f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e61521c5-9b98-5cce-8c01-ff66c640442f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e61521c5-9b98-5cce-8c01-ff66c640442f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('68f33794-c736-5b49-adea-898fd9ec8dbf', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('68f33794-c736-5b49-adea-898fd9ec8dbf', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('68f33794-c736-5b49-adea-898fd9ec8dbf', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('68f33794-c736-5b49-adea-898fd9ec8dbf', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('68f33794-c736-5b49-adea-898fd9ec8dbf', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('68f33794-c736-5b49-adea-898fd9ec8dbf', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('68f33794-c736-5b49-adea-898fd9ec8dbf', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('124f1fcc-9f98-5ebd-8fa7-df19ce0e9a16', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('124f1fcc-9f98-5ebd-8fa7-df19ce0e9a16', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('124f1fcc-9f98-5ebd-8fa7-df19ce0e9a16', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('124f1fcc-9f98-5ebd-8fa7-df19ce0e9a16', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('124f1fcc-9f98-5ebd-8fa7-df19ce0e9a16', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('124f1fcc-9f98-5ebd-8fa7-df19ce0e9a16', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('124f1fcc-9f98-5ebd-8fa7-df19ce0e9a16', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('76606263-ec13-5fec-a6a2-bdb9a6493252', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('76606263-ec13-5fec-a6a2-bdb9a6493252', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('76606263-ec13-5fec-a6a2-bdb9a6493252', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('76606263-ec13-5fec-a6a2-bdb9a6493252', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('76606263-ec13-5fec-a6a2-bdb9a6493252', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('76606263-ec13-5fec-a6a2-bdb9a6493252', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('76606263-ec13-5fec-a6a2-bdb9a6493252', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('ae54a9ab-d688-56bc-bdd0-6bed63327fe1', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='cooling'), 'C-1b', 'C-02', 17, '{"en": "Emission control for TABS (cooling mode)", "pl": "Sterowanie emisją TABS (tryb chłodzenia)"}'::jsonb, 'Cooling control - demand side', '{"en": "Control TABS for cooling operation."}'::jsonb, '{"en": "When TABS used for cooling."}'::jsonb, '{"TABS cooling controllers"}', 'Only applicable in case mechanical cooling systems  based on TABS are present', 3, false, true, false, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('acefa7b6-c944-5b13-a333-8b019c44857b', 'ae54a9ab-d688-56bc-bdd0-6bed63327fe1', 0, '{"en": "No automatic control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('cbd79bf8-9697-51b8-b1b2-0c48c67c09fd', 'ae54a9ab-d688-56bc-bdd0-6bed63327fe1', 1, '{"en": "Central automatic control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('73e90b9d-2232-59d1-bb69-96287a153c39', 'ae54a9ab-d688-56bc-bdd0-6bed63327fe1', 2, '{"en": "Advanced central automatic control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('3fdc0357-c3b1-5f8c-b871-4c06d65f2970', 'ae54a9ab-d688-56bc-bdd0-6bed63327fe1', 3, '{"en": "Advanced central automatic control with intermittent operation and/or room temperature feedback control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('acefa7b6-c944-5b13-a333-8b019c44857b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('acefa7b6-c944-5b13-a333-8b019c44857b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('acefa7b6-c944-5b13-a333-8b019c44857b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('acefa7b6-c944-5b13-a333-8b019c44857b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('acefa7b6-c944-5b13-a333-8b019c44857b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('acefa7b6-c944-5b13-a333-8b019c44857b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('acefa7b6-c944-5b13-a333-8b019c44857b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cbd79bf8-9697-51b8-b1b2-0c48c67c09fd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cbd79bf8-9697-51b8-b1b2-0c48c67c09fd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cbd79bf8-9697-51b8-b1b2-0c48c67c09fd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cbd79bf8-9697-51b8-b1b2-0c48c67c09fd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cbd79bf8-9697-51b8-b1b2-0c48c67c09fd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cbd79bf8-9697-51b8-b1b2-0c48c67c09fd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cbd79bf8-9697-51b8-b1b2-0c48c67c09fd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('73e90b9d-2232-59d1-bb69-96287a153c39', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('73e90b9d-2232-59d1-bb69-96287a153c39', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('73e90b9d-2232-59d1-bb69-96287a153c39', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('73e90b9d-2232-59d1-bb69-96287a153c39', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('73e90b9d-2232-59d1-bb69-96287a153c39', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('73e90b9d-2232-59d1-bb69-96287a153c39', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('73e90b9d-2232-59d1-bb69-96287a153c39', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3fdc0357-c3b1-5f8c-b871-4c06d65f2970', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3fdc0357-c3b1-5f8c-b871-4c06d65f2970', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3fdc0357-c3b1-5f8c-b871-4c06d65f2970', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3fdc0357-c3b1-5f8c-b871-4c06d65f2970', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3fdc0357-c3b1-5f8c-b871-4c06d65f2970', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3fdc0357-c3b1-5f8c-b871-4c06d65f2970', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3fdc0357-c3b1-5f8c-b871-4c06d65f2970', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('3e68969f-7656-5ba7-9cce-859ddc1adb4f', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='cooling'), 'C-1c', 'C-03', 18, '{"en": "Control of distribution network chilled water temperature (supply or return)", "pl": "Sterowanie agregatem chłodu"}'::jsonb, 'Cooling control - demand side', '{"en": "Modulate chillers/ cooling plant to match load."}'::jsonb, '{"en": "When mechanical cooling plant exists."}'::jsonb, '{"Chiller controllers","VRF systems","Cooling towers"}', 'Only applicable in case mechanical cooling systems  with hydronic distribution system are present', 2, false, true, false, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('2d2abca1-e5e3-5308-9e12-9ab4e26b2676', '3e68969f-7656-5ba7-9cce-859ddc1adb4f', 0, '{"en": "Constant temperature control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('583a1d2d-0356-50b6-a052-a13356dcc3ff', '3e68969f-7656-5ba7-9cce-859ddc1adb4f', 1, '{"en": "Outside temperature compensated control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('6f43f9db-f3be-56d6-8397-13d0a3a8c61d', '3e68969f-7656-5ba7-9cce-859ddc1adb4f', 2, '{"en": "Demand based control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2d2abca1-e5e3-5308-9e12-9ab4e26b2676', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2d2abca1-e5e3-5308-9e12-9ab4e26b2676', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2d2abca1-e5e3-5308-9e12-9ab4e26b2676', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2d2abca1-e5e3-5308-9e12-9ab4e26b2676', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2d2abca1-e5e3-5308-9e12-9ab4e26b2676', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2d2abca1-e5e3-5308-9e12-9ab4e26b2676', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2d2abca1-e5e3-5308-9e12-9ab4e26b2676', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('583a1d2d-0356-50b6-a052-a13356dcc3ff', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('583a1d2d-0356-50b6-a052-a13356dcc3ff', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('583a1d2d-0356-50b6-a052-a13356dcc3ff', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('583a1d2d-0356-50b6-a052-a13356dcc3ff', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('583a1d2d-0356-50b6-a052-a13356dcc3ff', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('583a1d2d-0356-50b6-a052-a13356dcc3ff', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('583a1d2d-0356-50b6-a052-a13356dcc3ff', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6f43f9db-f3be-56d6-8397-13d0a3a8c61d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6f43f9db-f3be-56d6-8397-13d0a3a8c61d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6f43f9db-f3be-56d6-8397-13d0a3a8c61d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6f43f9db-f3be-56d6-8397-13d0a3a8c61d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6f43f9db-f3be-56d6-8397-13d0a3a8c61d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6f43f9db-f3be-56d6-8397-13d0a3a8c61d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6f43f9db-f3be-56d6-8397-13d0a3a8c61d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('fc448332-a7f0-51b3-8e45-fe15fcde0bbb', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='cooling'), 'C-1d', 'C-04', 19, '{"en": "Control of distribution pumps in networks", "pl": "Sterowanie temperaturą wody chłodniczej w sieci"}'::jsonb, 'Cooling control - demand side', '{"en": "Optimize supply/return chilled water temperature."}'::jsonb, '{"en": "When chilled water distribution exists."}'::jsonb, '{"Primary/secondary pump skids","Reset controllers"}', 'Only applicable in case mechanical cooling systems  with hydronic distribution system are present', 4, false, true, false, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('51200e46-ef23-5a3b-a362-a4f5f338de5c', 'fc448332-a7f0-51b3-8e45-fe15fcde0bbb', 0, '{"en": "No automatic control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('d98ef2c2-c0af-586f-a5e6-12b0e406f563', 'fc448332-a7f0-51b3-8e45-fe15fcde0bbb', 1, '{"en": "On off control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('0a45db4e-fbcd-57a6-a2fa-e28da5ccbbd8', 'fc448332-a7f0-51b3-8e45-fe15fcde0bbb', 2, '{"en": "Multi-Stage control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('13e17c3c-cd79-54ec-b47e-18e708fbec8b', 'fc448332-a7f0-51b3-8e45-fe15fcde0bbb', 3, '{"en": "Variable speed pump control (pump unit (internal) estimations)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('cd0b7261-1ee1-58f6-8460-04dcdc37cf7b', 'fc448332-a7f0-51b3-8e45-fe15fcde0bbb', 4, '{"en": "Variable speed pump control (external demand signal)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('51200e46-ef23-5a3b-a362-a4f5f338de5c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('51200e46-ef23-5a3b-a362-a4f5f338de5c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('51200e46-ef23-5a3b-a362-a4f5f338de5c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('51200e46-ef23-5a3b-a362-a4f5f338de5c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('51200e46-ef23-5a3b-a362-a4f5f338de5c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('51200e46-ef23-5a3b-a362-a4f5f338de5c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('51200e46-ef23-5a3b-a362-a4f5f338de5c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d98ef2c2-c0af-586f-a5e6-12b0e406f563', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d98ef2c2-c0af-586f-a5e6-12b0e406f563', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d98ef2c2-c0af-586f-a5e6-12b0e406f563', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d98ef2c2-c0af-586f-a5e6-12b0e406f563', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d98ef2c2-c0af-586f-a5e6-12b0e406f563', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d98ef2c2-c0af-586f-a5e6-12b0e406f563', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d98ef2c2-c0af-586f-a5e6-12b0e406f563', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0a45db4e-fbcd-57a6-a2fa-e28da5ccbbd8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0a45db4e-fbcd-57a6-a2fa-e28da5ccbbd8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0a45db4e-fbcd-57a6-a2fa-e28da5ccbbd8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0a45db4e-fbcd-57a6-a2fa-e28da5ccbbd8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0a45db4e-fbcd-57a6-a2fa-e28da5ccbbd8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0a45db4e-fbcd-57a6-a2fa-e28da5ccbbd8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0a45db4e-fbcd-57a6-a2fa-e28da5ccbbd8', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('13e17c3c-cd79-54ec-b47e-18e708fbec8b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('13e17c3c-cd79-54ec-b47e-18e708fbec8b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('13e17c3c-cd79-54ec-b47e-18e708fbec8b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('13e17c3c-cd79-54ec-b47e-18e708fbec8b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('13e17c3c-cd79-54ec-b47e-18e708fbec8b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('13e17c3c-cd79-54ec-b47e-18e708fbec8b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('13e17c3c-cd79-54ec-b47e-18e708fbec8b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cd0b7261-1ee1-58f6-8460-04dcdc37cf7b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cd0b7261-1ee1-58f6-8460-04dcdc37cf7b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cd0b7261-1ee1-58f6-8460-04dcdc37cf7b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cd0b7261-1ee1-58f6-8460-04dcdc37cf7b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cd0b7261-1ee1-58f6-8460-04dcdc37cf7b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cd0b7261-1ee1-58f6-8460-04dcdc37cf7b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cd0b7261-1ee1-58f6-8460-04dcdc37cf7b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('8d953356-5a9b-5ad2-bb3e-5d41e2fab286', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='cooling'), 'C-1f', 'C-05', 20, '{"en": "Interlock: avoiding simultaneous heating and cooling in the same room", "pl": "Sterowanie pompami w sieci chłodu"}'::jsonb, 'Cooling control - demand side', '{"en": "Variable pumping aligned with cooling demand."}'::jsonb, '{"en": "When cooling circulation pumps exist."}'::jsonb, '{"VSD pumps","BMS"}', 'Only applicable in case mechanical cooling systems are present', 2, false, true, true, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('c2082bf9-c5c4-557d-8e83-c802c2082b2f', '8d953356-5a9b-5ad2-bb3e-5d41e2fab286', 0, '{"en": "No interlock"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('9b86e4a5-2649-5237-85b9-e88076c4584f', '8d953356-5a9b-5ad2-bb3e-5d41e2fab286', 1, '{"en": "Partial interlock (minimising risk of simultanieus heating and cooling e.g. by sliding setpoints)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('db7281bc-b69a-5295-87e6-c3d93a8d0aa2', '8d953356-5a9b-5ad2-bb3e-5d41e2fab286', 2, '{"en": "Total interlock (control system ensures no  simultaneous heating and cooling can take place)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c2082bf9-c5c4-557d-8e83-c802c2082b2f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c2082bf9-c5c4-557d-8e83-c802c2082b2f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c2082bf9-c5c4-557d-8e83-c802c2082b2f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c2082bf9-c5c4-557d-8e83-c802c2082b2f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c2082bf9-c5c4-557d-8e83-c802c2082b2f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c2082bf9-c5c4-557d-8e83-c802c2082b2f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c2082bf9-c5c4-557d-8e83-c802c2082b2f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9b86e4a5-2649-5237-85b9-e88076c4584f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9b86e4a5-2649-5237-85b9-e88076c4584f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9b86e4a5-2649-5237-85b9-e88076c4584f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9b86e4a5-2649-5237-85b9-e88076c4584f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9b86e4a5-2649-5237-85b9-e88076c4584f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9b86e4a5-2649-5237-85b9-e88076c4584f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('9b86e4a5-2649-5237-85b9-e88076c4584f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('db7281bc-b69a-5295-87e6-c3d93a8d0aa2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('db7281bc-b69a-5295-87e6-c3d93a8d0aa2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('db7281bc-b69a-5295-87e6-c3d93a8d0aa2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('db7281bc-b69a-5295-87e6-c3d93a8d0aa2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('db7281bc-b69a-5295-87e6-c3d93a8d0aa2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('db7281bc-b69a-5295-87e6-c3d93a8d0aa2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('db7281bc-b69a-5295-87e6-c3d93a8d0aa2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;


end $$;
