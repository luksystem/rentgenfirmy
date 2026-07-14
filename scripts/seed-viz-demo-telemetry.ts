/**
 * Zasilenie przykładową telemetrią historyczną dla modułu Wizualizacje.
 *
 * Uruchom:
 *   npm run seed:viz-demo -- --dry-run
 *   npm run seed:viz-demo -- --yes --project "Respondek DOM" --bootstrap
 *   npm run seed:viz-demo -- --yes --projects "Respondek DOM,Respondek Kingi" --all-roles --copy-integration
 *
 * Wymaga w .env.local:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { getSupabaseAdmin } from "../lib/supabase/admin";
import { formatMappedValue } from "../lib/viz/store-status";

const DEFAULT_PROJECT_QUERY = "Respondek Dominik";
const RESPONDEK_BATCH = ["Respondek DOM", "Respondek Kingi"];
const HISTORY_HOURS = 7 * 24;
const SAMPLE_EVERY_HOURS = 1;

type ProjectRow = { id: string; name: string; client_id: string };
type RoleRow = { code: string; name: string; default_unit: string | null; sort_order: number };

type MappingRow = {
  id: string;
  dashboard_id: string;
  project_id: string;
  integration_id: string | null;
  integration_variable_id: string | null;
  role_code: string;
  unit: string | null;
  decimal_places: number;
  multiplier: number;
  offset_value: number;
  source_key: string | null;
};

type RoleProfile = {
  base: number;
  amplitude: number;
  noise: number;
  online?: boolean;
};

const ROLE_PROFILES: Record<string, RoleProfile> = {
  store_temperature: { base: 21.5, amplitude: 2.2, noise: 0.35 },
  store_setpoint: { base: 22, amplitude: 0.4, noise: 0.05 },
  outdoor_temperature: { base: 8, amplitude: 8, noise: 0.5 },
  indoor_humidity: { base: 45, amplitude: 10, noise: 1 },
  active_alarm_count: { base: 0, amplitude: 0, noise: 0 },
  system_error_count: { base: 0, amplitude: 0, noise: 0 },
  miniserver_online: { base: 1, amplitude: 0, noise: 0, online: true },
  communication_status: { base: 1, amplitude: 0, noise: 0, online: true },
  hvac_status: { base: 1, amplitude: 0, noise: 0 },
  lighting_status: { base: 1, amplitude: 0, noise: 0 },
  energy_total: { base: 11500, amplitude: 0, noise: 5 },
  energy_current_period: { base: 850, amplitude: 100, noise: 10 },
  active_power: { base: 45, amplitude: 15, noise: 2 },
  reactive_power: { base: 12, amplitude: 4, noise: 0.5 },
  power_factor: { base: 0.92, amplitude: 0.05, noise: 0.01 },
  pv_power: { base: 6, amplitude: 5, noise: 0.5 },
};

const BOOTSTRAP_ROLES = ["store_temperature", "store_setpoint", "miniserver_online"] as const;

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function getArgValue(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function resolveProfile(roleCode: string): RoleProfile {
  return (
    ROLE_PROFILES[roleCode] ?? {
      base: 10,
      amplitude: 1,
      noise: 0.2,
    }
  );
}

function generateNumericValue(
  roleCode: string,
  profile: RoleProfile,
  hourIndex: number,
  totalHours: number,
  decimals = 2,
) {
  if (roleCode === "energy_total") {
    const noise = (Math.random() - 0.5) * profile.noise;
    return round(profile.base + hourIndex * 2.8 + noise, decimals);
  }

  if (roleCode === "pv_power") {
    const hourOfDay = hourIndex % 24;
    if (hourOfDay < 7 || hourOfDay > 19) {
      return 0;
    }
    const dayFactor = Math.sin(((hourOfDay - 7) / 12) * Math.PI);
    const noise = (Math.random() - 0.5) * profile.noise;
    return round(Math.max(0, profile.base + profile.amplitude * dayFactor + noise), decimals);
  }

  const dayWave = Math.sin((hourIndex / totalHours) * Math.PI * 2);
  const nightCooling = hourIndex % 24 < 7 ? -0.8 : hourIndex % 24 > 20 ? -0.5 : 0.4;
  const raw = profile.base + profile.amplitude * dayWave + nightCooling;
  const noise = (Math.random() - 0.5) * profile.noise;
  return round(Math.max(0, raw + noise), decimals);
}

function resolveProjectQueries() {
  const projectsArg = getArgValue("--projects");
  if (projectsArg) {
    return projectsArg
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const projectArg = getArgValue("--project");
  if (projectArg) {
    return [projectArg];
  }

  if (hasFlag("--all-roles") || hasFlag("--respondek-batch")) {
    return RESPONDEK_BATCH;
  }

  return [DEFAULT_PROJECT_QUERY];
}

async function findProject(supabase: ReturnType<typeof getSupabaseAdmin>, query: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, client_id")
    .ilike("name", `%${query}%`)
    .order("name")
    .limit(10);

  if (error) {
    throw new Error(error.message);
  }

  if (data?.length) {
    return data as ProjectRow[];
  }

  const parts = query.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const [first, ...rest] = parts;
    const last = rest.join(" ");
    const { data: clients } = await supabase
      .from("clients")
      .select("id, first_name, last_name")
      .ilike("first_name", `%${first}%`)
      .ilike("last_name", `%${last}%`);

    if (clients?.length) {
      const clientIds = clients.map((c) => c.id);
      const { data: clientProjects } = await supabase
        .from("projects")
        .select("id, name, client_id")
        .in("client_id", clientIds)
        .order("name");
      return (clientProjects ?? []) as ProjectRow[];
    }
  }

  return [];
}

async function resolveProjectByName(supabase: ReturnType<typeof getSupabaseAdmin>, query: string) {
  const matches = await findProject(supabase, query);
  if (!matches.length) {
    return null;
  }
  const exact = matches.find((item) => item.name.toLowerCase() === query.toLowerCase());
  return exact ?? matches[0];
}

async function getDashboardIdForProject(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  projectId: string,
  fallbackDashboardId?: string | null,
) {
  const { data, error } = await supabase
    .from("viz_dashboard_projects")
    .select("dashboard_id")
    .eq("project_id", projectId)
    .eq("is_active_in_dashboard", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data?.dashboard_id as string | undefined) ?? fallbackDashboardId ?? null;
}

async function ensureProjectActiveAndOnDashboard(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  project: ProjectRow,
  dashboardId: string,
  sortOrder: number,
  dryRun: boolean,
) {
  const { data: existing } = await supabase
    .from("projects")
    .select("is_active")
    .eq("id", project.id)
    .maybeSingle();

  if (existing && existing.is_active === false) {
    if (dryRun) {
      console.log(`  [dry-run] aktywowałbym projekt: ${project.name}`);
    } else {
      const { error } = await supabase.from("projects").update({ is_active: true }).eq("id", project.id);
      if (error) {
        throw new Error(error.message);
      }
      console.log(`  Aktywowano projekt: ${project.name}`);
    }
  }

  const { data: onDashboard } = await supabase
    .from("viz_dashboard_projects")
    .select("id")
    .eq("dashboard_id", dashboardId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (onDashboard) {
    return;
  }

  if (dryRun) {
    console.log(`  [dry-run] dodałbym ${project.name} do dashboardu`);
    return;
  }

  const { error } = await supabase.from("viz_dashboard_projects").insert({
    dashboard_id: dashboardId,
    project_id: project.id,
    display_name: project.name,
    is_active_in_dashboard: true,
    sort_order: sortOrder,
    service_contract_status: "none",
    metadata_json: {},
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  console.log(`  Dodano ${project.name} do dashboardu`);
}

async function getActiveIntegrationId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  projectId: string,
) {
  const { data } = await supabase
    .from("project_integrations")
    .select("id")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  return (data?.id as string | undefined) ?? null;
}

async function copyIntegrationFromProject(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  sourceProjectId: string,
  targetProjectId: string,
  dryRun: boolean,
) {
  const existingId = await getActiveIntegrationId(supabase, targetProjectId);
  if (existingId) {
    console.log(`  Integracja już istnieje (${existingId})`);
    return existingId;
  }

  const { data: source, error: sourceError } = await supabase
    .from("project_integrations")
    .select("*")
    .eq("project_id", sourceProjectId)
    .eq("is_active", true)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (sourceError) {
    throw new Error(sourceError.message);
  }

  if (!source) {
    throw new Error(`Brak aktywnej integracji w projekcie źródłowym (${sourceProjectId}).`);
  }

  const { data: sourceSecret, error: secretReadError } = await supabase
    .from("project_integration_secrets")
    .select("password_ciphertext, password_iv, password_tag")
    .eq("integration_id", source.id)
    .maybeSingle();

  if (secretReadError) {
    throw new Error(secretReadError.message);
  }

  if (!sourceSecret) {
    throw new Error("Brak sekretów integracji źródłowej — nie można skopiować.");
  }

  if (dryRun) {
    console.log(`  [dry-run] skopiowałbym integrację "${source.name}" do projektu docelowego`);
    return "dry-run-integration-id";
  }

  const integrationId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error: insertError } = await supabase.from("project_integrations").insert({
    id: integrationId,
    project_id: targetProjectId,
    integration_type: source.integration_type,
    name: source.name,
    connection_method: source.connection_method,
    api_url: source.api_url,
    port: source.port,
    login_username: source.login_username,
    is_active: true,
    technical_notes: source.technical_notes,
    config_json: source.config_json,
    created_by_user_id: source.created_by_user_id,
    created_by_name: source.created_by_name ?? "Seed demo",
    updated_by_user_id: source.updated_by_user_id,
    updated_by_name: source.updated_by_name ?? "Seed demo",
    created_at: now,
    updated_at: now,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  const { error: secretInsertError } = await supabase.from("project_integration_secrets").insert({
    integration_id: integrationId,
    password_ciphertext: sourceSecret.password_ciphertext,
    password_iv: sourceSecret.password_iv,
    password_tag: sourceSecret.password_tag,
    updated_at: now,
  });

  if (secretInsertError) {
    await supabase.from("project_integrations").delete().eq("id", integrationId);
    throw new Error(secretInsertError.message);
  }

  console.log(`  Skopiowano integrację "${source.name}" (${integrationId})`);
  return integrationId;
}

async function listActiveVariableRoles(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { data, error } = await supabase
    .from("viz_variable_roles")
    .select("code, name, default_unit, sort_order")
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as RoleRow[];
}

async function ensureRoleMappings(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  dashboardId: string,
  projectId: string,
  integrationId: string,
  roles: RoleRow[],
  roleCodes: string[],
  dryRun: boolean,
) {
  const { data: existing } = await supabase
    .from("viz_variable_mappings")
    .select("role_code")
    .eq("dashboard_id", dashboardId)
    .eq("project_id", projectId);

  const existingRoles = new Set((existing ?? []).map((row) => row.role_code as string));
  const roleByCode = new Map(roles.map((role) => [role.code, role]));

  for (const roleCode of roleCodes) {
    if (existingRoles.has(roleCode)) {
      continue;
    }

    const role = roleByCode.get(roleCode);
    if (!role) {
      continue;
    }

    if (dryRun) {
      console.log(`  [dry-run] utworzyłbym mapowanie roli: ${roleCode}`);
      continue;
    }

    const { error } = await supabase.from("viz_variable_mappings").insert({
      dashboard_id: dashboardId,
      project_id: projectId,
      integration_id: integrationId,
      role_code: roleCode,
      display_name: role.name,
      unit: role.default_unit,
      decimal_places:
        roleCode === "miniserver_online" ||
        roleCode === "communication_status" ||
        roleCode === "hvac_status" ||
        roleCode === "lighting_status"
          ? 0
          : roleCode === "power_factor"
            ? 2
            : 1,
      writable: roleCode === "store_setpoint",
      data_quality: "valid",
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log(`  Dodano mapowanie roli: ${roleCode}`);
  }
}

async function ensureDemoVariable(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  mapping: MappingRow,
  dryRun: boolean,
  forceDemo = false,
) {
  const demoSourceKey = `demo/${mapping.role_code}`;

  if (!forceDemo && mapping.integration_variable_id) {
    const { data: linked } = await supabase
      .from("project_integration_variables")
      .select("id, source_key")
      .eq("id", mapping.integration_variable_id)
      .maybeSingle();

    if (linked?.source_key?.startsWith("demo/")) {
      return linked.id as string;
    }

    if (!forceDemo) {
      return mapping.integration_variable_id;
    }
  }

  if (!mapping.integration_id) {
    return null;
  }

  const { data: existing } = await supabase
    .from("project_integration_variables")
    .select("id")
    .eq("integration_id", mapping.integration_id)
    .eq("source_key", demoSourceKey)
    .maybeSingle();

  if (existing?.id) {
    if (!dryRun) {
      await supabase
        .from("viz_variable_mappings")
        .update({
          integration_variable_id: existing.id,
          source_key: demoSourceKey,
          data_quality: "valid",
        })
        .eq("id", mapping.id);
    }
    return existing.id as string;
  }

  if (dryRun) {
    console.log(`  [dry-run] utworzyłbym zmienną demo: ${demoSourceKey}`);
    return "dry-run-variable-id";
  }

  const { data, error } = await supabase
    .from("project_integration_variables")
    .insert({
      integration_id: mapping.integration_id,
      project_id: mapping.project_id,
      name: `Demo ${mapping.role_code}`,
      source_key: demoSourceKey,
      location_label: "Seed demo",
      value_kind: "numeric",
      sort_order: 99,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase
    .from("viz_variable_mappings")
    .update({
      integration_variable_id: data.id,
      source_key: demoSourceKey,
      data_quality: "valid",
    })
    .eq("id", mapping.id);

  return data.id as string;
}

async function seedProjectTelemetry(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  project: ProjectRow,
  dashboardId: string,
  forceDemo: boolean,
  dryRun: boolean,
) {
  const { data: mappings, error: mapError } = await supabase
    .from("viz_variable_mappings")
    .select("*")
    .eq("dashboard_id", dashboardId)
    .eq("project_id", project.id);

  if (mapError) {
    throw new Error(mapError.message);
  }

  const mappingRows = (mappings ?? []) as MappingRow[];
  if (!mappingRows.length) {
    console.error(`Brak mapowań dla ${project.name}.`);
    return { historyRows: 0, telemetryRows: 0 };
  }

  console.log(`Mapowania (${project.name}): ${mappingRows.length}`);

  let telemetryRows = 0;
  let historyRows = 0;

  for (const mapping of mappingRows) {
    const profile = resolveProfile(mapping.role_code);
    const variableId = await ensureDemoVariable(supabase, mapping, dryRun, forceDemo);

    const historyBatch: Array<Record<string, unknown>> = [];
    const now = Date.now();

    for (let hour = HISTORY_HOURS; hour >= 0; hour -= SAMPLE_EVERY_HOURS) {
      const measuredAt = new Date(now - hour * 60 * 60 * 1000).toISOString();
      const hourIndex = HISTORY_HOURS - hour;
      const numericValue = generateNumericValue(
        mapping.role_code,
        profile,
        hourIndex,
        HISTORY_HOURS,
        mapping.decimal_places ?? 2,
      );

      historyBatch.push({
        dashboard_id: dashboardId,
        project_id: project.id,
        mapping_id: mapping.id,
        integration_variable_id: variableId,
        role_code: mapping.role_code,
        numeric_value: numericValue,
        text_value: null,
        data_quality: "valid",
        measured_at: measuredAt,
        raw_payload_json: { seeded: true, demo: true },
      });

      if (hour === 0 && mapping.integration_id && variableId && variableId !== "dry-run-variable-id") {
        telemetryRows += 1;
        if (!dryRun) {
          await supabase.from("project_telemetry").insert({
            project_id: project.id,
            integration_id: mapping.integration_id,
            integration_variable_id: variableId,
            numeric_value: numericValue,
            text_value: null,
            temperature: mapping.role_code === "store_temperature" ? numericValue : null,
            setpoint: mapping.role_code === "store_setpoint" ? numericValue : null,
            online_status: profile.online ?? true,
            source_name: `demo/${mapping.role_code}`,
            measured_at: measuredAt,
            raw_payload_json: { seeded: true, demo: true },
          });
        }
      }
    }

    historyRows += historyBatch.length;

    if (dryRun) {
      console.log(`  [dry-run] ${mapping.role_code}: ${historyBatch.length} punktów historii`);
      continue;
    }

    if (historyBatch.length) {
      const { error: historyError } = await supabase
        .from("viz_variable_readings_history")
        .insert(historyBatch as never);
      if (historyError) {
        throw new Error(historyError.message);
      }
    }

    const latest = historyBatch[historyBatch.length - 1];
    if (latest) {
      await supabase.from("viz_variable_current_values").upsert(
        {
          dashboard_id: dashboardId,
          project_id: project.id,
          mapping_id: mapping.id,
          integration_variable_id: variableId,
          role_code: mapping.role_code,
          numeric_value: latest.numeric_value as number,
          text_value: null,
          display_value: formatMappedValue(latest.numeric_value as number, null, {
            unit: mapping.unit,
            decimalPlaces: mapping.decimal_places,
          }),
          unit: mapping.unit,
          data_quality: "valid",
          measured_at: latest.measured_at as string,
          last_successful_read_at: latest.measured_at as string,
          raw_payload_json: { seeded: true, demo: true },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "mapping_id" },
      );
    }
  }

  return { historyRows, telemetryRows };
}

async function seedOneProject(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  projectQuery: string,
  options: {
    dryRun: boolean;
    dashboardId: string | null;
    sourceProjectId: string | null;
    allRoles: boolean;
    bootstrap: boolean;
    copyIntegration: boolean;
    sortOrder: number;
    variableRoles: RoleRow[];
  },
) {
  const project = await resolveProjectByName(supabase, projectQuery);
  if (!project) {
    console.error(`Nie znaleziono projektu: "${projectQuery}"`);
    return null;
  }

  console.log(`\n── ${project.name} (${project.id}) ──`);

  let dashboardId = options.dashboardId;
  if (!dashboardId) {
    dashboardId = await getDashboardIdForProject(supabase, project.id);
  }

  if (!dashboardId) {
    console.error(`Projekt ${project.name} nie jest przypisany do dashboardu i brak fallbacku.`);
    return null;
  }

  console.log(`Dashboard: ${dashboardId}`);
  await ensureProjectActiveAndOnDashboard(
    supabase,
    project,
    dashboardId,
    options.sortOrder,
    options.dryRun,
  );

  let integrationId = await getActiveIntegrationId(supabase, project.id);
  if (!integrationId && options.copyIntegration && options.sourceProjectId) {
    console.log("Kopiowanie integracji z projektu źródłowego…");
    integrationId = await copyIntegrationFromProject(
      supabase,
      options.sourceProjectId,
      project.id,
      options.dryRun,
    );
  }

  if (!integrationId) {
    console.error(`Brak integracji dla ${project.name} — pomijam mapowania i telemetrię.`);
    return { project, dashboardId, historyRows: 0, telemetryRows: 0 };
  }

  const roleCodes = options.allRoles
    ? options.variableRoles.map((role) => role.code)
    : [...BOOTSTRAP_ROLES];

  if (options.bootstrap || options.allRoles) {
    const label = options.allRoles ? "Wszystkie role" : "Bootstrap (3 role)";
    console.log(`${label} — tworzenie brakujących mapowań…`);
    await ensureRoleMappings(
      supabase,
      dashboardId,
      project.id,
      integrationId,
      options.variableRoles,
      roleCodes,
      options.dryRun,
    );
  }

  const { historyRows, telemetryRows } = await seedProjectTelemetry(
    supabase,
    project,
    dashboardId,
    options.allRoles,
    options.dryRun,
  );

  return { project, dashboardId, historyRows, telemetryRows };
}

async function main() {
  const dryRun = hasFlag("--dry-run");
  const assumeYes = hasFlag("--yes");
  const projectQueries = resolveProjectQueries();
  const allRoles = hasFlag("--all-roles");
  const bootstrap = hasFlag("--bootstrap");
  const copyIntegration = hasFlag("--copy-integration") || allRoles;

  if (!dryRun && !assumeYes) {
    console.error(
      [
        "To polecenie wstawi przykładową telemetrię (project_telemetry + viz_variable_readings_history).",
        "",
        "Podgląd:",
        "  npm run seed:viz-demo -- --dry-run --projects \"Respondek DOM,Respondek Kingi\" --all-roles",
        "",
        "Wykonanie (Respondek DOM + Kingi, wszystkie role, kopia integracji):",
        '  npm run seed:viz-demo -- --yes --projects "Respondek DOM,Respondek Kingi" --all-roles --copy-integration',
      ].join("\n"),
    );
    process.exit(1);
  }

  const supabase = getSupabaseAdmin();
  const variableRoles = await listActiveVariableRoles(supabase);

  const resolvedProjects: ProjectRow[] = [];
  for (const query of projectQueries) {
    const project = await resolveProjectByName(supabase, query);
    if (project) {
      resolvedProjects.push(project);
    } else {
      console.error(`Pominięto — nie znaleziono: "${query}"`);
    }
  }

  if (!resolvedProjects.length) {
    console.error("Brak projektów do przetworzenia.");
    process.exit(1);
  }

  const sourceProject =
    resolvedProjects.find((item) => item.name.toLowerCase().includes("dom")) ?? resolvedProjects[0];

  let sharedDashboardId = await getDashboardIdForProject(supabase, sourceProject.id);
  if (!sharedDashboardId) {
    for (const project of resolvedProjects) {
      sharedDashboardId = await getDashboardIdForProject(supabase, project.id);
      if (sharedDashboardId) {
        break;
      }
    }
  }

  if (!sharedDashboardId) {
    console.error("Żaden z projektów nie jest przypisany do dashboardu Wizualizacje.");
    process.exit(1);
  }

  let totalHistory = 0;
  let totalTelemetry = 0;

  for (let index = 0; index < resolvedProjects.length; index += 1) {
    const project = resolvedProjects[index];
    const result = await seedOneProject(supabase, project.name, {
      dryRun,
      dashboardId: sharedDashboardId,
      sourceProjectId: sourceProject.id,
      allRoles,
      bootstrap,
      copyIntegration,
      sortOrder: index,
      variableRoles,
    });

    if (result) {
      totalHistory += result.historyRows;
      totalTelemetry += result.telemetryRows;
      if (!sharedDashboardId && result.dashboardId) {
        sharedDashboardId = result.dashboardId;
      }
    }
  }

  console.log(
    dryRun
      ? "\nPodgląd zakończony (bez zapisu)."
      : `\nGotowe. Wstawiono ~${totalHistory} punktów historii i ${totalTelemetry} odczytów project_telemetry.`,
  );
  console.log("Odśwież Command Center i wykresy w module Wizualizacje.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
