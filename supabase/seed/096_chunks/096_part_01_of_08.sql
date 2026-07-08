-- SRI seed — czesc 1/8 (wygenerowana przez store/sri/_split_seed.py)
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
  values ('a3c94d6f-f068-5987-b972-f4b06e735d38', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='heating'), 'H-1a', 'H-01', 1, '{"en": "Heat emission control", "pl": "Sterowanie emisją ciepła"}'::jsonb, 'Heat control - demand side', '{"en": "Regulate heat delivery to occupied spaces according to demand."}'::jsonb, '{"en": "When space heating emitters (radiators, floor heating, fan coils) are present."}'::jsonb, '{"Room thermostats","TRVs","Floor heating manifolds","BMS room controllers"}', 'Triage: not relevant in case of TABS.', 4, true, true, false, 'smart_ready', null, '{"EN ISO 52120-1 — emission control"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('98aadc1a-c888-5dcb-9193-49fe8b22e62c', 'a3c94d6f-f068-5987-b972-f4b06e735d38', 0, '{"en": "No automatic control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('5245937b-9982-56ef-87a3-67186dbd615a', 'a3c94d6f-f068-5987-b972-f4b06e735d38', 1, '{"en": "Central automatic control (e.g. central thermostat)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('e431c482-e612-5199-b67e-6bc98ab403fd', 'a3c94d6f-f068-5987-b972-f4b06e735d38', 2, '{"en": "Individual room control (e.g. thermostatic valves, or electronic controller)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('cbb1b7e9-a01f-5914-9612-795abb9afa90', 'a3c94d6f-f068-5987-b972-f4b06e735d38', 3, '{"en": "Individual room control with communication between controllers and to BACS"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('b479cd59-d476-5fce-a135-cabc756641ae', 'a3c94d6f-f068-5987-b972-f4b06e735d38', 4, '{"en": "Individual room control with communication and occupancy detection"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('98aadc1a-c888-5dcb-9193-49fe8b22e62c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('98aadc1a-c888-5dcb-9193-49fe8b22e62c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('98aadc1a-c888-5dcb-9193-49fe8b22e62c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('98aadc1a-c888-5dcb-9193-49fe8b22e62c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('98aadc1a-c888-5dcb-9193-49fe8b22e62c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('98aadc1a-c888-5dcb-9193-49fe8b22e62c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('98aadc1a-c888-5dcb-9193-49fe8b22e62c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5245937b-9982-56ef-87a3-67186dbd615a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5245937b-9982-56ef-87a3-67186dbd615a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5245937b-9982-56ef-87a3-67186dbd615a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5245937b-9982-56ef-87a3-67186dbd615a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5245937b-9982-56ef-87a3-67186dbd615a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5245937b-9982-56ef-87a3-67186dbd615a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('5245937b-9982-56ef-87a3-67186dbd615a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e431c482-e612-5199-b67e-6bc98ab403fd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e431c482-e612-5199-b67e-6bc98ab403fd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e431c482-e612-5199-b67e-6bc98ab403fd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e431c482-e612-5199-b67e-6bc98ab403fd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e431c482-e612-5199-b67e-6bc98ab403fd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e431c482-e612-5199-b67e-6bc98ab403fd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('e431c482-e612-5199-b67e-6bc98ab403fd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cbb1b7e9-a01f-5914-9612-795abb9afa90', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cbb1b7e9-a01f-5914-9612-795abb9afa90', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cbb1b7e9-a01f-5914-9612-795abb9afa90', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cbb1b7e9-a01f-5914-9612-795abb9afa90', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cbb1b7e9-a01f-5914-9612-795abb9afa90', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cbb1b7e9-a01f-5914-9612-795abb9afa90', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cbb1b7e9-a01f-5914-9612-795abb9afa90', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b479cd59-d476-5fce-a135-cabc756641ae', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b479cd59-d476-5fce-a135-cabc756641ae', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b479cd59-d476-5fce-a135-cabc756641ae', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b479cd59-d476-5fce-a135-cabc756641ae', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b479cd59-d476-5fce-a135-cabc756641ae', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b479cd59-d476-5fce-a135-cabc756641ae', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b479cd59-d476-5fce-a135-cabc756641ae', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('420f40c4-afe8-5bd6-b857-5686932469df', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='heating'), 'H-1b', 'H-02', 2, '{"en": "Emission control for TABS (heating mode)", "pl": "Sterowanie emisją dla TABS"}'::jsonb, 'Heat control - demand side', '{"en": "Control thermally activated building structures for heating."}'::jsonb, '{"en": "When TABS (concrete core activation) is installed."}'::jsonb, '{"TABS controllers","Supply temperature limiters"}', 'Triage: only relevant in case of TABS. Mostly restricted to non-residential buildings', 3, false, true, false, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('8009917d-9e6e-5dca-b177-69522414310d', '420f40c4-afe8-5bd6-b857-5686932469df', 0, '{"en": "No automatic control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('7aee58f1-feb4-5754-8169-f94fd1a827f3', '420f40c4-afe8-5bd6-b857-5686932469df', 1, '{"en": "Central automatic control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('25f02732-81a7-55ce-a3d0-a28c2b7a10ce', '420f40c4-afe8-5bd6-b857-5686932469df', 2, '{"en": "Advanced central automatic control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('6ed97ca6-10af-5b9f-8efa-7f5b1941983c', '420f40c4-afe8-5bd6-b857-5686932469df', 3, '{"en": "Advanced central automatic control with intermittent operation and/or room temperature feedback control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8009917d-9e6e-5dca-b177-69522414310d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8009917d-9e6e-5dca-b177-69522414310d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8009917d-9e6e-5dca-b177-69522414310d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8009917d-9e6e-5dca-b177-69522414310d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8009917d-9e6e-5dca-b177-69522414310d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8009917d-9e6e-5dca-b177-69522414310d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8009917d-9e6e-5dca-b177-69522414310d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7aee58f1-feb4-5754-8169-f94fd1a827f3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7aee58f1-feb4-5754-8169-f94fd1a827f3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7aee58f1-feb4-5754-8169-f94fd1a827f3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7aee58f1-feb4-5754-8169-f94fd1a827f3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7aee58f1-feb4-5754-8169-f94fd1a827f3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7aee58f1-feb4-5754-8169-f94fd1a827f3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('7aee58f1-feb4-5754-8169-f94fd1a827f3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('25f02732-81a7-55ce-a3d0-a28c2b7a10ce', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('25f02732-81a7-55ce-a3d0-a28c2b7a10ce', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('25f02732-81a7-55ce-a3d0-a28c2b7a10ce', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('25f02732-81a7-55ce-a3d0-a28c2b7a10ce', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('25f02732-81a7-55ce-a3d0-a28c2b7a10ce', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('25f02732-81a7-55ce-a3d0-a28c2b7a10ce', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('25f02732-81a7-55ce-a3d0-a28c2b7a10ce', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6ed97ca6-10af-5b9f-8efa-7f5b1941983c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6ed97ca6-10af-5b9f-8efa-7f5b1941983c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6ed97ca6-10af-5b9f-8efa-7f5b1941983c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6ed97ca6-10af-5b9f-8efa-7f5b1941983c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6ed97ca6-10af-5b9f-8efa-7f5b1941983c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6ed97ca6-10af-5b9f-8efa-7f5b1941983c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6ed97ca6-10af-5b9f-8efa-7f5b1941983c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('4d857953-195a-5870-a71d-d7b090ec314a', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='heating'), 'H-1c', 'H-03', 3, '{"en": "Control of distribution fluid temperature (supply or return air flow or water flow) - Similar function can be applied to the control of direct electric heating networks", "pl": "Sterowanie temperaturą medium w sieci grzewczej"}'::jsonb, 'Heat control - demand side', '{"en": "Match distribution temperature to building load (weather compensation)."}'::jsonb, '{"en": "When hydronic or air heating distribution exists."}'::jsonb, '{"Mixing valves","Boiler controllers","Outdoor sensors"}', 'Not applicable in case of individual heaters (e.g. stoves)', 2, true, true, false, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('b4210380-ac36-552e-86a0-0dfb6ff1c21a', '4d857953-195a-5870-a71d-d7b090ec314a', 0, '{"en": "No automatic control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('719d4784-a99b-5290-b03e-32fa229ffb62', '4d857953-195a-5870-a71d-d7b090ec314a', 1, '{"en": "Outside temperature compensated control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('6a1280a7-0698-54f1-a85a-e4c610161156', '4d857953-195a-5870-a71d-d7b090ec314a', 2, '{"en": "Demand based control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b4210380-ac36-552e-86a0-0dfb6ff1c21a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b4210380-ac36-552e-86a0-0dfb6ff1c21a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b4210380-ac36-552e-86a0-0dfb6ff1c21a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b4210380-ac36-552e-86a0-0dfb6ff1c21a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b4210380-ac36-552e-86a0-0dfb6ff1c21a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b4210380-ac36-552e-86a0-0dfb6ff1c21a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b4210380-ac36-552e-86a0-0dfb6ff1c21a', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('719d4784-a99b-5290-b03e-32fa229ffb62', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('719d4784-a99b-5290-b03e-32fa229ffb62', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('719d4784-a99b-5290-b03e-32fa229ffb62', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('719d4784-a99b-5290-b03e-32fa229ffb62', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('719d4784-a99b-5290-b03e-32fa229ffb62', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('719d4784-a99b-5290-b03e-32fa229ffb62', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('719d4784-a99b-5290-b03e-32fa229ffb62', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6a1280a7-0698-54f1-a85a-e4c610161156', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6a1280a7-0698-54f1-a85a-e4c610161156', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6a1280a7-0698-54f1-a85a-e4c610161156', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6a1280a7-0698-54f1-a85a-e4c610161156', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6a1280a7-0698-54f1-a85a-e4c610161156', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6a1280a7-0698-54f1-a85a-e4c610161156', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('6a1280a7-0698-54f1-a85a-e4c610161156', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('af2c3627-5511-5cbe-a199-a1373ac69cdc', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='heating'), 'H-1d', 'H-04', 4, '{"en": "Control of distribution pumps in networks", "pl": "Sterowanie pompami obiegowymi w instalacji grzewczej"}'::jsonb, 'Heat control - demand side', '{"en": "Optimize pump energy via speed or on/off control aligned with demand."}'::jsonb, '{"en": "When circulation pumps serve heating distribution."}'::jsonb, '{"Variable speed drives","Pump controllers","BMS"}', 'Only applicable for hydronic heating systems', 4, false, true, false, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('132fda59-7821-5b6b-a0c5-2cc8757e50cd', 'af2c3627-5511-5cbe-a199-a1373ac69cdc', 0, '{"en": "No automatic control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('eeca3822-2490-5798-9206-8ac2afb8373f', 'af2c3627-5511-5cbe-a199-a1373ac69cdc', 1, '{"en": "On off control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('43a10230-1360-59c6-b14a-b6292ff82295', 'af2c3627-5511-5cbe-a199-a1373ac69cdc', 2, '{"en": "Multi-Stage control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('a2da9a65-d32b-5619-ae7d-e2582d332c1b', 'af2c3627-5511-5cbe-a199-a1373ac69cdc', 3, '{"en": "Variable speed pump control (pump unit (internal) estimations)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('ffe71c91-6b22-5453-9c8f-d3d8c6fa59af', 'af2c3627-5511-5cbe-a199-a1373ac69cdc', 4, '{"en": "Variable speed pump control (external demand signal)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('132fda59-7821-5b6b-a0c5-2cc8757e50cd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('132fda59-7821-5b6b-a0c5-2cc8757e50cd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('132fda59-7821-5b6b-a0c5-2cc8757e50cd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('132fda59-7821-5b6b-a0c5-2cc8757e50cd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('132fda59-7821-5b6b-a0c5-2cc8757e50cd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('132fda59-7821-5b6b-a0c5-2cc8757e50cd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('132fda59-7821-5b6b-a0c5-2cc8757e50cd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('eeca3822-2490-5798-9206-8ac2afb8373f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('eeca3822-2490-5798-9206-8ac2afb8373f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('eeca3822-2490-5798-9206-8ac2afb8373f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('eeca3822-2490-5798-9206-8ac2afb8373f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('eeca3822-2490-5798-9206-8ac2afb8373f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('eeca3822-2490-5798-9206-8ac2afb8373f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('eeca3822-2490-5798-9206-8ac2afb8373f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('43a10230-1360-59c6-b14a-b6292ff82295', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('43a10230-1360-59c6-b14a-b6292ff82295', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('43a10230-1360-59c6-b14a-b6292ff82295', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('43a10230-1360-59c6-b14a-b6292ff82295', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('43a10230-1360-59c6-b14a-b6292ff82295', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('43a10230-1360-59c6-b14a-b6292ff82295', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('43a10230-1360-59c6-b14a-b6292ff82295', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a2da9a65-d32b-5619-ae7d-e2582d332c1b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a2da9a65-d32b-5619-ae7d-e2582d332c1b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a2da9a65-d32b-5619-ae7d-e2582d332c1b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a2da9a65-d32b-5619-ae7d-e2582d332c1b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a2da9a65-d32b-5619-ae7d-e2582d332c1b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a2da9a65-d32b-5619-ae7d-e2582d332c1b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a2da9a65-d32b-5619-ae7d-e2582d332c1b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ffe71c91-6b22-5453-9c8f-d3d8c6fa59af', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ffe71c91-6b22-5453-9c8f-d3d8c6fa59af', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ffe71c91-6b22-5453-9c8f-d3d8c6fa59af', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ffe71c91-6b22-5453-9c8f-d3d8c6fa59af', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ffe71c91-6b22-5453-9c8f-d3d8c6fa59af', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ffe71c91-6b22-5453-9c8f-d3d8c6fa59af', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('ffe71c91-6b22-5453-9c8f-d3d8c6fa59af', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('e2075775-2e8c-5aa2-b6da-39e55afba44d', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='heating'), 'H-1f', 'H-05', 5, '{"en": "Thermal Energy Storage (TES) for building heating (excluding TABS)", "pl": "Sterowanie źródłem ciepła"}'::jsonb, 'Heat control - demand side', '{"en": "Modulate heat production to match building demand."}'::jsonb, '{"en": "When boilers, heat pumps or district heat substations are present."}'::jsonb, '{"Boiler cascade controllers","Heat pump inverters","Substation controllers"}', 'Only applicable in case thermal energy storage is present.', 3, false, true, false, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('d07b8dd3-a4e2-5030-8757-9bf108856e9b', 'e2075775-2e8c-5aa2-b6da-39e55afba44d', 0, '{"en": "Continuous storage operation"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('85d94da3-f260-5992-88f4-8f95974b0c18', 'e2075775-2e8c-5aa2-b6da-39e55afba44d', 1, '{"en": "Time-scheduled storage operation"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('0df53935-ec4a-5eae-b924-67343df98b03', 'e2075775-2e8c-5aa2-b6da-39e55afba44d', 2, '{"en": "Load prediction based storage operation"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('cdf28582-b660-554f-813b-e86ae6dfa526', 'e2075775-2e8c-5aa2-b6da-39e55afba44d', 3, '{"en": "Heat storage capable of flexible control through grid signals (e.g. DSM)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d07b8dd3-a4e2-5030-8757-9bf108856e9b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d07b8dd3-a4e2-5030-8757-9bf108856e9b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d07b8dd3-a4e2-5030-8757-9bf108856e9b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d07b8dd3-a4e2-5030-8757-9bf108856e9b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d07b8dd3-a4e2-5030-8757-9bf108856e9b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d07b8dd3-a4e2-5030-8757-9bf108856e9b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('d07b8dd3-a4e2-5030-8757-9bf108856e9b', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('85d94da3-f260-5992-88f4-8f95974b0c18', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('85d94da3-f260-5992-88f4-8f95974b0c18', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('85d94da3-f260-5992-88f4-8f95974b0c18', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('85d94da3-f260-5992-88f4-8f95974b0c18', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('85d94da3-f260-5992-88f4-8f95974b0c18', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('85d94da3-f260-5992-88f4-8f95974b0c18', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('85d94da3-f260-5992-88f4-8f95974b0c18', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0df53935-ec4a-5eae-b924-67343df98b03', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0df53935-ec4a-5eae-b924-67343df98b03', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0df53935-ec4a-5eae-b924-67343df98b03', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0df53935-ec4a-5eae-b924-67343df98b03', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0df53935-ec4a-5eae-b924-67343df98b03', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0df53935-ec4a-5eae-b924-67343df98b03', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('0df53935-ec4a-5eae-b924-67343df98b03', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cdf28582-b660-554f-813b-e86ae6dfa526', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cdf28582-b660-554f-813b-e86ae6dfa526', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cdf28582-b660-554f-813b-e86ae6dfa526', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cdf28582-b660-554f-813b-e86ae6dfa526', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cdf28582-b660-554f-813b-e86ae6dfa526', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cdf28582-b660-554f-813b-e86ae6dfa526', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('cdf28582-b660-554f-813b-e86ae6dfa526', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('bf05aebc-8d63-5f7e-8b21-8d06892ee297', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='heating'), 'H-2a', 'H-06', 6, '{"en": "Heat generator control (all except heat pumps)", "pl": "Sterowanie wytwarzaniem ciepła (pompy ciepła)"}'::jsonb, 'Control heat production facilities', '{"en": "Advanced control of heat pump operation including bivalent and hybrid modes."}'::jsonb, '{"en": "When heat pumps provide space heating."}'::jsonb, '{"HP outdoor unit controllers","BMS integration","Smart tariffs interface"}', 'Only applicable in case of combustion heater or district heating', 2, true, true, false, 'smart_ready', null, '{"EN ISO 52120-1","DG ENER study — extended FL for HP"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('01928150-538e-57fc-a47e-359faf5546e9', 'bf05aebc-8d63-5f7e-8b21-8d06892ee297', 0, '{"en": "Constant temperature control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('b54c25f3-f0fe-5bcb-becc-a0d09daed838', 'bf05aebc-8d63-5f7e-8b21-8d06892ee297', 1, '{"en": "Variable temperature control depending on outdoor temperature"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('37e5fce3-d0ce-505e-8020-759e2434d544', 'bf05aebc-8d63-5f7e-8b21-8d06892ee297', 2, '{"en": "Variable temperature control depending on the load (e.g. depending on supply water temperature set point)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('01928150-538e-57fc-a47e-359faf5546e9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('01928150-538e-57fc-a47e-359faf5546e9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('01928150-538e-57fc-a47e-359faf5546e9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('01928150-538e-57fc-a47e-359faf5546e9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('01928150-538e-57fc-a47e-359faf5546e9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('01928150-538e-57fc-a47e-359faf5546e9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('01928150-538e-57fc-a47e-359faf5546e9', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b54c25f3-f0fe-5bcb-becc-a0d09daed838', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b54c25f3-f0fe-5bcb-becc-a0d09daed838', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b54c25f3-f0fe-5bcb-becc-a0d09daed838', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b54c25f3-f0fe-5bcb-becc-a0d09daed838', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b54c25f3-f0fe-5bcb-becc-a0d09daed838', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b54c25f3-f0fe-5bcb-becc-a0d09daed838', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('b54c25f3-f0fe-5bcb-becc-a0d09daed838', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('37e5fce3-d0ce-505e-8020-759e2434d544', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('37e5fce3-d0ce-505e-8020-759e2434d544', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('37e5fce3-d0ce-505e-8020-759e2434d544', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('37e5fce3-d0ce-505e-8020-759e2434d544', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('37e5fce3-d0ce-505e-8020-759e2434d544', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('37e5fce3-d0ce-505e-8020-759e2434d544', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('37e5fce3-d0ce-505e-8020-759e2434d544', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('55f83fdd-c3ad-5ff3-b793-eb949d2e6894', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='heating'), 'H-2b', 'H-07', 7, '{"en": "Heat generator control (for heat pumps)", "pl": "Sterowanie magazynem energii cieplnej (ogrzewanie)"}'::jsonb, 'Control heat production facilities', '{"en": "Charge/discharge thermal storage aligned with demand and tariffs."}'::jsonb, '{"en": "When buffer tanks or seasonal storage (excluding TABS) exist."}'::jsonb, '{"Buffer tank controllers","TES charging logic"}', 'Only applicable in case of heat pumps', 3, true, true, false, 'smart_ready', null, '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('48b2e779-f6c6-5643-b3ca-c74321d75c40', '55f83fdd-c3ad-5ff3-b793-eb949d2e6894', 0, '{"en": "On/Off-control of heat generator"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('74b07392-6e38-5fdd-a8be-d6f2abad6ef3', '55f83fdd-c3ad-5ff3-b793-eb949d2e6894', 1, '{"en": "Multi-stage control of heat generator capacity depending on the load or demand (e.g. on/off of several compressors)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('63192d23-2a79-597e-b34a-8fde5eef7eb2', '55f83fdd-c3ad-5ff3-b793-eb949d2e6894', 2, '{"en": "Variable control of heat generator capacity depending on the load or demand (e.g. hot gas bypass, inverter frequency control)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('10d08a02-4795-5f64-b123-a2098b1f0cc0', '55f83fdd-c3ad-5ff3-b793-eb949d2e6894', 3, '{"en": "Variable control of heat generator capacity depending on the load AND external signals from grid"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('48b2e779-f6c6-5643-b3ca-c74321d75c40', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('48b2e779-f6c6-5643-b3ca-c74321d75c40', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('48b2e779-f6c6-5643-b3ca-c74321d75c40', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('48b2e779-f6c6-5643-b3ca-c74321d75c40', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('48b2e779-f6c6-5643-b3ca-c74321d75c40', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('48b2e779-f6c6-5643-b3ca-c74321d75c40', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('48b2e779-f6c6-5643-b3ca-c74321d75c40', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('74b07392-6e38-5fdd-a8be-d6f2abad6ef3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('74b07392-6e38-5fdd-a8be-d6f2abad6ef3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('74b07392-6e38-5fdd-a8be-d6f2abad6ef3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('74b07392-6e38-5fdd-a8be-d6f2abad6ef3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('74b07392-6e38-5fdd-a8be-d6f2abad6ef3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('74b07392-6e38-5fdd-a8be-d6f2abad6ef3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('74b07392-6e38-5fdd-a8be-d6f2abad6ef3', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('63192d23-2a79-597e-b34a-8fde5eef7eb2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('63192d23-2a79-597e-b34a-8fde5eef7eb2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('63192d23-2a79-597e-b34a-8fde5eef7eb2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('63192d23-2a79-597e-b34a-8fde5eef7eb2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('63192d23-2a79-597e-b34a-8fde5eef7eb2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('63192d23-2a79-597e-b34a-8fde5eef7eb2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('63192d23-2a79-597e-b34a-8fde5eef7eb2', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('10d08a02-4795-5f64-b123-a2098b1f0cc0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('10d08a02-4795-5f64-b123-a2098b1f0cc0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('10d08a02-4795-5f64-b123-a2098b1f0cc0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('10d08a02-4795-5f64-b123-a2098b1f0cc0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('10d08a02-4795-5f64-b123-a2098b1f0cc0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('10d08a02-4795-5f64-b123-a2098b1f0cc0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('10d08a02-4795-5f64-b123-a2098b1f0cc0', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('298f402a-cf0f-52a4-9b35-bdcb0087463b', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='heating'), 'H-2d', 'H-08', 8, '{"en": "Sequencing in case of different heat generators", "pl": "Sekwencjonowanie wielu źródeł ciepła"}'::jsonb, 'Control heat production facilities', '{"en": "Optimally switch between multiple heat sources."}'::jsonb, '{"en": "When more than one heat generator is installed (mutually exclusive operation)."}'::jsonb, '{"Cascade controllers","BMS sequencing logic"}', 'Only applicable in case of multiple heat generators, mostly restricted to large buildings', 4, false, true, false, 'smart_ready', 'heat_generator_type', '{"EN ISO 52120-1"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('537493ed-b6aa-5328-8539-5723e5b6b103', '298f402a-cf0f-52a4-9b35-bdcb0087463b', 0, '{"en": "Priorities only based on running time"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('70cf80b3-e877-5e1f-959c-f6d86756dedc', '298f402a-cf0f-52a4-9b35-bdcb0087463b', 1, '{"en": "Control according to fixed priority list: e.g. based on rated energy efficiency"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('2a7bac85-bced-5067-ba5f-dc07a85f0ee6', '298f402a-cf0f-52a4-9b35-bdcb0087463b', 2, '{"en": "Control according to dynamic priority list (based on current energy efficiency, carbon emissions and capacity of generators, e.g. solar, geothermal heat, cogeneration plant, fossil fuels)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('91ffc69e-a6e4-5f1a-a1d3-9e4e1d11f675', '298f402a-cf0f-52a4-9b35-bdcb0087463b', 3, '{"en": "Control according to dynamic priority list (based on current AND predicted load, energy efficiency, carbon emissions  and capacity of generators)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('c8b05038-4076-5a09-8f2b-6159978d9788', '298f402a-cf0f-52a4-9b35-bdcb0087463b', 4, '{"en": "Control according to dynamic priority list (based on current AND predicted load, energy efficiency, carbon emissions, capacity of generators AND external signals from grid)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('537493ed-b6aa-5328-8539-5723e5b6b103', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('537493ed-b6aa-5328-8539-5723e5b6b103', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('537493ed-b6aa-5328-8539-5723e5b6b103', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('537493ed-b6aa-5328-8539-5723e5b6b103', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('537493ed-b6aa-5328-8539-5723e5b6b103', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('537493ed-b6aa-5328-8539-5723e5b6b103', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('537493ed-b6aa-5328-8539-5723e5b6b103', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('70cf80b3-e877-5e1f-959c-f6d86756dedc', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('70cf80b3-e877-5e1f-959c-f6d86756dedc', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('70cf80b3-e877-5e1f-959c-f6d86756dedc', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('70cf80b3-e877-5e1f-959c-f6d86756dedc', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('70cf80b3-e877-5e1f-959c-f6d86756dedc', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('70cf80b3-e877-5e1f-959c-f6d86756dedc', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('70cf80b3-e877-5e1f-959c-f6d86756dedc', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2a7bac85-bced-5067-ba5f-dc07a85f0ee6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2a7bac85-bced-5067-ba5f-dc07a85f0ee6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2a7bac85-bced-5067-ba5f-dc07a85f0ee6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2a7bac85-bced-5067-ba5f-dc07a85f0ee6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2a7bac85-bced-5067-ba5f-dc07a85f0ee6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2a7bac85-bced-5067-ba5f-dc07a85f0ee6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('2a7bac85-bced-5067-ba5f-dc07a85f0ee6', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('91ffc69e-a6e4-5f1a-a1d3-9e4e1d11f675', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('91ffc69e-a6e4-5f1a-a1d3-9e4e1d11f675', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('91ffc69e-a6e4-5f1a-a1d3-9e4e1d11f675', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('91ffc69e-a6e4-5f1a-a1d3-9e4e1d11f675', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('91ffc69e-a6e4-5f1a-a1d3-9e4e1d11f675', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('91ffc69e-a6e4-5f1a-a1d3-9e4e1d11f675', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('91ffc69e-a6e4-5f1a-a1d3-9e4e1d11f675', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c8b05038-4076-5a09-8f2b-6159978d9788', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c8b05038-4076-5a09-8f2b-6159978d9788', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c8b05038-4076-5a09-8f2b-6159978d9788', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c8b05038-4076-5a09-8f2b-6159978d9788', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c8b05038-4076-5a09-8f2b-6159978d9788', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c8b05038-4076-5a09-8f2b-6159978d9788', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('c8b05038-4076-5a09-8f2b-6159978d9788', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('4eec7447-e2ab-5fc3-aa8b-861a4910d04e', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='heating'), 'H-3', 'H-09', 9, '{"en": "Report information regarding heating system performance", "pl": "Elastyczność sterowania źródłem ciepła"}'::jsonb, 'Information to occupants and facility managers', '{"en": "Time-shift or remote control of heating for grid or tariff response."}'::jsonb, '{"en": "When heating can participate in demand response."}'::jsonb, '{"Smart thermostats","BMS DSM modules","Grid signal interfaces"}', '0', 4, true, true, true, 'smart_ready', null, '{"DG ENER Technical Study 2020"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('8495ffa5-159f-5b7b-825d-90038855e09c', '4eec7447-e2ab-5fc3-aa8b-861a4910d04e', 0, '{"en": "None"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('f5a2af5a-798c-5d76-b2fe-bd1aa2fae9ad', '4eec7447-e2ab-5fc3-aa8b-861a4910d04e', 1, '{"en": "Central or remote reporting of current performance KPIs (e.g. temperatures, submetering energy usage)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('4a57b8ec-caa5-5885-8a9d-0214692d089f', '4eec7447-e2ab-5fc3-aa8b-861a4910d04e', 2, '{"en": "Central or remote reporting of current performance KPIs and historical data"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('abacfcb7-f5d3-54bc-a837-d88ed4cec891', '4eec7447-e2ab-5fc3-aa8b-861a4910d04e', 3, '{"en": "Central or remote reporting of performance evaluation including forecasting and/or benchmarking"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('09ae981b-128e-5ebf-9d5d-e6e6feff9542', '4eec7447-e2ab-5fc3-aa8b-861a4910d04e', 4, '{"en": "Central or remote reporting of performance evaluation including forecasting and/or benchmarking; also including predictive management and fault detection"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8495ffa5-159f-5b7b-825d-90038855e09c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8495ffa5-159f-5b7b-825d-90038855e09c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8495ffa5-159f-5b7b-825d-90038855e09c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8495ffa5-159f-5b7b-825d-90038855e09c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8495ffa5-159f-5b7b-825d-90038855e09c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8495ffa5-159f-5b7b-825d-90038855e09c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('8495ffa5-159f-5b7b-825d-90038855e09c', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f5a2af5a-798c-5d76-b2fe-bd1aa2fae9ad', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f5a2af5a-798c-5d76-b2fe-bd1aa2fae9ad', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f5a2af5a-798c-5d76-b2fe-bd1aa2fae9ad', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f5a2af5a-798c-5d76-b2fe-bd1aa2fae9ad', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f5a2af5a-798c-5d76-b2fe-bd1aa2fae9ad', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f5a2af5a-798c-5d76-b2fe-bd1aa2fae9ad', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f5a2af5a-798c-5d76-b2fe-bd1aa2fae9ad', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4a57b8ec-caa5-5885-8a9d-0214692d089f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4a57b8ec-caa5-5885-8a9d-0214692d089f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4a57b8ec-caa5-5885-8a9d-0214692d089f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4a57b8ec-caa5-5885-8a9d-0214692d089f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4a57b8ec-caa5-5885-8a9d-0214692d089f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4a57b8ec-caa5-5885-8a9d-0214692d089f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('4a57b8ec-caa5-5885-8a9d-0214692d089f', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('abacfcb7-f5d3-54bc-a837-d88ed4cec891', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('abacfcb7-f5d3-54bc-a837-d88ed4cec891', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('abacfcb7-f5d3-54bc-a837-d88ed4cec891', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('abacfcb7-f5d3-54bc-a837-d88ed4cec891', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('abacfcb7-f5d3-54bc-a837-d88ed4cec891', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('abacfcb7-f5d3-54bc-a837-d88ed4cec891', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('abacfcb7-f5d3-54bc-a837-d88ed4cec891', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('09ae981b-128e-5ebf-9d5d-e6e6feff9542', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('09ae981b-128e-5ebf-9d5d-e6e6feff9542', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('09ae981b-128e-5ebf-9d5d-e6e6feff9542', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('09ae981b-128e-5ebf-9d5d-e6e6feff9542', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('09ae981b-128e-5ebf-9d5d-e6e6feff9542', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('09ae981b-128e-5ebf-9d5d-e6e6feff9542', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('09ae981b-128e-5ebf-9d5d-e6e6feff9542', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;

  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)
  values ('c434b26b-13da-535e-9414-075a4aadb1d7', v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code='heating'), 'H-4', 'H-10', 10, '{"en": "Flexibility and grid interaction", "pl": "Raportowanie informacji o pracy ogrzewania"}'::jsonb, 'Flexibility and grid interaction', '{"en": "Inform occupants/operators about heating operation and status."}'::jsonb, '{"en": "When heating systems exist and reporting is feasible."}'::jsonb, '{"BMS dashboards","Tenant apps","Energy portals"}', 'The inspectability of the nature of the control algorithm would need to be facilitated', 4, false, true, true, 'smart_ready', null, '{"DG ENER Technical Study 2020"}', 'VERIFIED_ANNEX_D')
  on conflict (catalogue_id, official_code) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('a4bc1798-b3e5-5f43-9227-b4772026efcd', 'c434b26b-13da-535e-9414-075a4aadb1d7', 0, '{"en": "No automatic control"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('f117f06f-af66-5382-8371-39fca37350de', 'c434b26b-13da-535e-9414-075a4aadb1d7', 1, '{"en": "Scheduled operation of heating system"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('a697ea0a-dd90-5f88-8f5a-0922dd230acd', 'c434b26b-13da-535e-9414-075a4aadb1d7', 2, '{"en": "Self-learning optimal control of heating system"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('3ae8bd3c-2efe-5628-9851-f2914abc8949', 'c434b26b-13da-535e-9414-075a4aadb1d7', 3, '{"en": "Heating system capable of flexible control through grid signals (e.g. DSM)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)
  values ('71f9efa3-12b7-57c9-96ae-e32b8711250d', 'c434b26b-13da-535e-9414-075a4aadb1d7', 4, '{"en": "Optimized control of  heating system based on local predictions and grid signals (e.g. through model predictive control)"}'::jsonb) on conflict (service_id, level_number) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a4bc1798-b3e5-5f43-9227-b4772026efcd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a4bc1798-b3e5-5f43-9227-b4772026efcd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a4bc1798-b3e5-5f43-9227-b4772026efcd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a4bc1798-b3e5-5f43-9227-b4772026efcd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a4bc1798-b3e5-5f43-9227-b4772026efcd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a4bc1798-b3e5-5f43-9227-b4772026efcd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a4bc1798-b3e5-5f43-9227-b4772026efcd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f117f06f-af66-5382-8371-39fca37350de', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f117f06f-af66-5382-8371-39fca37350de', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f117f06f-af66-5382-8371-39fca37350de', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f117f06f-af66-5382-8371-39fca37350de', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f117f06f-af66-5382-8371-39fca37350de', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f117f06f-af66-5382-8371-39fca37350de', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('f117f06f-af66-5382-8371-39fca37350de', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a697ea0a-dd90-5f88-8f5a-0922dd230acd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a697ea0a-dd90-5f88-8f5a-0922dd230acd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a697ea0a-dd90-5f88-8f5a-0922dd230acd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a697ea0a-dd90-5f88-8f5a-0922dd230acd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a697ea0a-dd90-5f88-8f5a-0922dd230acd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a697ea0a-dd90-5f88-8f5a-0922dd230acd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('a697ea0a-dd90-5f88-8f5a-0922dd230acd', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3ae8bd3c-2efe-5628-9851-f2914abc8949', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3ae8bd3c-2efe-5628-9851-f2914abc8949', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3ae8bd3c-2efe-5628-9851-f2914abc8949', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3ae8bd3c-2efe-5628-9851-f2914abc8949', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3ae8bd3c-2efe-5628-9851-f2914abc8949', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3ae8bd3c-2efe-5628-9851-f2914abc8949', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('3ae8bd3c-2efe-5628-9851-f2914abc8949', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('71f9efa3-12b7-57c9-96ae-e32b8711250d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_efficiency'), 2) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('71f9efa3-12b7-57c9-96ae-e32b8711250d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='energy_flexibility_and_storage'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('71f9efa3-12b7-57c9-96ae-e32b8711250d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='comfort'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('71f9efa3-12b7-57c9-96ae-e32b8711250d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='convenience'), 3) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('71f9efa3-12b7-57c9-96ae-e32b8711250d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='health_wellbeing_accessibility'), 1) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('71f9efa3-12b7-57c9-96ae-e32b8711250d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='maintenance_and_fault_prediction'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;
  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)
  values ('71f9efa3-12b7-57c9-96ae-e32b8711250d', (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code='information_to_occupants'), 0) on conflict (functionality_level_id, impact_criterion_id) do nothing;


end $$;
